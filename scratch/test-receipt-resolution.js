import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env" });

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testReceiptResolution() {
  const { data: apps } = await db
    .from("itechskill_enrollment_applications")
    .select("*");

  console.log(`Processing ${apps.length} applications...`);

  for (const app of apps) {
    let receiptUrl = null;
    if (app.payment_screenshot_media_id) {
      receiptUrl = `/api/whatsapp/media/${app.payment_screenshot_media_id}`;
    }

    // Fallback: Check contact image messages if no screenshot media_id on app record
    if (!receiptUrl && app.phone) {
      const cleanPhone = app.phone.replace(/^\+/, "").trim();
      const { data: contacts } = await db
        .from("contacts")
        .select("id")
        .ilike("phone", `%${cleanPhone}%`);

      if (contacts && contacts.length > 0) {
        const contactIds = contacts.map((c) => c.id);
        const { data: convs } = await db
          .from("conversations")
          .select("id")
          .in("contact_id", contactIds);

        if (convs && convs.length > 0) {
          const convIds = convs.map((c) => c.id);
          const { data: imgMsgs } = await db
            .from("messages")
            .select("media_url")
            .in("conversation_id", convIds)
            .eq("content_type", "image")
            .order("created_at", { ascending: false })
            .limit(1);

          if (imgMsgs && imgMsgs.length > 0 && imgMsgs[0].media_url) {
            receiptUrl = imgMsgs[0].media_url;
          }
        }
      }
    }

    console.log({
      application_id: app.application_id,
      phone: app.phone,
      full_name: app.full_name,
      payment_screenshot_media_id: app.payment_screenshot_media_id,
      resolved_receipt_url: receiptUrl,
    });
  }
}

testReceiptResolution().catch(console.error);
