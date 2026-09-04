import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log("Supabase URL:", supabaseUrl);
console.log("Has Service Key:", !!serviceKey);

if (!supabaseUrl || !serviceKey) {
  console.error("Missing SUPABASE env vars");
  process.exit(1);
}

const db = createClient(supabaseUrl, serviceKey);

async function debug() {
  console.log("=== Debugging Enrollment Applications ===");
  const { data: apps, error: fetchErr } = await db
    .from("itechskill_enrollment_applications")
    .select("*")
    .limit(5);

  if (fetchErr) {
    console.error("Fetch Error:", fetchErr);
    return;
  }

  console.log(`Found ${apps.length} applications:`);
  for (const app of apps) {
    console.log(`- ID: ${app.id}, Phone: ${app.phone}, Name: ${app.student_name}, PaymentStatus: ${app.payment_status}, AppStatus: ${app.application_status}, ReceiptURL: ${app.receipt_url}`);
  }

  if (apps.length > 0) {
    const targetPhone = apps[0].phone || "923313081659";
    console.log(`\n=== Finding latest image message for phone: ${targetPhone} ===`);
    
    // Find contact by phone
    const { data: contacts, error: cErr } = await db
      .from("contacts")
      .select("id, phone")
      .ilike("phone", `%${targetPhone.replace(/^\+/, "")}%`);

    console.log("Contacts found:", contacts, cErr);

    if (contacts && contacts.length > 0) {
      const contactIds = contacts.map(c => c.id);
      const { data: convs, error: convErr } = await db
        .from("conversations")
        .select("id, contact_id")
        .in("contact_id", contactIds);

      console.log("Conversations found:", convs, convErr);

      if (convs && convs.length > 0) {
        const convIds = convs.map(c => c.id);
        const { data: imgMsgs, error: imgErr } = await db
          .from("messages")
          .select("id, content_type, media_url, created_at")
          .in("conversation_id", convIds)
          .eq("content_type", "image")
          .order("created_at", { ascending: false })
          .limit(5);

        console.log("Image messages found:", imgMsgs, imgErr);
      }
    }
  }

  if (apps.length > 0) {
    const testApp = apps[0];
    console.log(`\n=== Testing approvePayment columns on App ${testApp.id} ===`);
    const updates = {
      payment_status: "verified",
      application_status: "payment_verified",
      verified_by: "00000000-0000-0000-0000-000000000000",
      verified_at: new Date().toISOString(),
      rejection_reason: null,
      rejected_by: null,
      rejected_at: null,
      updated_at: new Date().toISOString(),
    };
    console.log("Attempting update with payload:", updates);
    const { data: testResult, error: testUpdateErr } = await db
      .from("itechskill_enrollment_applications")
      .update(updates)
      .eq("id", testApp.id)
      .select()
      .single();

    if (testUpdateErr) {
      console.error("DRY UPDATE FAILED WITH ERROR:", testUpdateErr);
    } else {
      console.log("DRY UPDATE SUCCEEDED:", testResult.id);
    }
  }
}

debug().catch(console.error);
