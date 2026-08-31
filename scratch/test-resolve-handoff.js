import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env" });

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testResolveHandoff() {
  const caseId = "case_bec4b2699c3b721401fe";
  const now = new Date().toISOString();

  console.log(`Testing resolve update on case_id: ${caseId}`);

  const updates = {
    status: "resolved",
    resolution_note: "Manual verification completed by sales staff.",
    resolved_at: now,
    updated_at: now,
  };

  const { data: after, error: updateErr } = await db
    .from("itechskill_handoff_cases")
    .update(updates)
    .eq("case_id", caseId)
    .select()
    .single();

  if (updateErr) {
    console.error("RESOLVE HANDOFF FAILED:", updateErr);
  } else {
    console.log("RESOLVE HANDOFF SUCCEEDED! New status:", after.status, "Resolution Note:", after.resolution_note);
  }
}

testResolveHandoff().catch(console.error);
