import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env" });

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testHandoffUpdate() {
  const { data: cases } = await db.from("itechskill_handoff_cases").select("*").limit(1);
  if (!cases || cases.length === 0) return;

  const c = cases[0];
  console.log("Testing update on case_id:", c.case_id);

  const { data, error } = await db
    .from("itechskill_handoff_cases")
    .update({
      status: "in_progress",
      updated_at: new Date().toISOString(),
    })
    .eq("case_id", c.case_id)
    .select()
    .single();

  if (error) {
    console.error("Update error:", error);
  } else {
    console.log("SUCCESS! Updated case_id:", data.case_id, "New status:", data.status);
  }
}

testHandoffUpdate().catch(console.error);
