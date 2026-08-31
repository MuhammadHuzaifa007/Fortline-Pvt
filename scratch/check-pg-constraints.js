import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env" });

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkPgConstraints() {
  const moreCandidates = [
    "upsert", "insert", "edit", "new", "disable", "archive", "publish",
    "course", "fee", "program", "discount", "schedule", "batch",
    "UPDATE_FEE", "UPDATE_PRICE", "CREATE_COURSE", "DELETE_COURSE",
    "change_fee", "change_price", "change_title", "change_status",
    "fee", "price", "title", "status", "catalog_update"
  ];

  for (const act of moreCandidates) {
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
  console.log("No candidates matched.");
}

checkPgConstraints().catch(console.error);
