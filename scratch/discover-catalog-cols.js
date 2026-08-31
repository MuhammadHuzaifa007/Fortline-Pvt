import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env" });

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function discoverCatalogCols() {
  const { data, error } = await db.from("itechskill_catalog_change_requests").insert({
    request_id: `req_${Date.now()}`,
    source_key: "itechskill_short_course_microsoft_excel",
    action: "update",
    requested_by: "test_user",
    status: "pending",
  }).select();

  if (error) {
    console.error("Discover error:", error.message);
  } else {
    console.log("SUCCESS! COLUMNS IN itechskill_catalog_change_requests:");
    console.log(Object.keys(data[0]));
    console.log("Sample row:", data[0]);
    await db.from("itechskill_catalog_change_requests").delete().eq("request_id", data[0].request_id);
  }
}

discoverCatalogCols().catch(console.error);
