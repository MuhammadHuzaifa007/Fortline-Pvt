import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env" });

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function inspectHandoffs() {
  console.log("=== Inspecting itechskill_handoff_cases ===");

  const { data: cases, error: fetchErr } = await db
    .from("itechskill_handoff_cases")
    .select("*")
    .limit(5);

  if (fetchErr) {
    console.error("Fetch Error:", fetchErr);
    return;
  }

  console.log(`Found ${cases.length} handoff cases:`);
  if (cases.length > 0) {
    console.log("Columns:", Object.keys(cases[0]));
    console.log("Sample record:", JSON.stringify(cases[0], null, 2));

    const testCase = cases[0];
    console.log(`\n=== Testing startHandoff update on case ID: ${testCase.id} ===`);

    const updates = {
      status: "in_progress",
      assigned_to: testCase.assigned_to || "00000000-0000-0000-0000-000000000000",
      updated_at: new Date().toISOString(),
    };

    const { data: testResult, error: testUpdateErr } = await db
      .from("itechskill_handoff_cases")
      .update(updates)
      .eq("id", testCase.id)
      .select()
      .single();

    if (testUpdateErr) {
      console.error("DRY START HANDOFF UPDATE FAILED WITH ERROR:", testUpdateErr);
    } else {
      console.log("DRY START HANDOFF UPDATE SUCCEEDED:", testResult.id);
    }
  }
}

inspectHandoffs().catch(console.error);
