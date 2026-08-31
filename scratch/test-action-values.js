import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env" });

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function findValidAction() {
  const candidates = [
    "create", "update", "delete",
    "CREATE", "UPDATE", "DELETE",
    "add", "modify", "remove",
    "fee_update", "price_change", "course_update",
    "update_fee", "update_price", "program_update",
    "proposed", "approved", "rejected",
    "patch", "change"
  ];

  for (const act of candidates) {
    const { data, error } = await db.from("itechskill_catalog_change_requests").insert({
      request_id: `req_${Date.now()}_${act}`,
      source_key: "itechskill_short_course_microsoft_excel",
      action: act,
      requested_by: "test_user",
      status: "pending",
    }).select();

    if (!error && data) {
      console.log("MATCH FOUND! Valid action string is:", act);
      console.log("COLUMNS IN itechskill_catalog_change_requests:");
      console.log(Object.keys(data[0]));
      console.log("Sample row:", data[0]);
      await db.from("itechskill_catalog_change_requests").delete().eq("request_id", data[0].request_id);
      return;
    }
  }
  console.log("No candidates matched constraint.");
}

findValidAction().catch(console.error);
