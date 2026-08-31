import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env" });

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function inspectColumns() {
  const { data: cases } = await db.from("itechskill_handoff_cases").select("*").limit(1);
  if (cases && cases.length > 0) {
    console.log("ACTUAL COLUMNS IN itechskill_handoff_cases:");
    console.log(Object.keys(cases[0]));
    console.log("Sample case_id:", cases[0].case_id);
    console.log("Sample status:", cases[0].status);
    console.log("Sample assigned_to:", cases[0].assigned_to);
  }
}

inspectColumns().catch(console.error);
