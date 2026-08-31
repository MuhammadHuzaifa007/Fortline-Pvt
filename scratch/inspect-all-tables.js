import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env" });

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function inspectAllTables() {
  const tables = [
    "itechskill_handoff_cases",
    "itechskill_followup_jobs",
    "itechskill_enrollment_applications",
    "itechskill_evaluation_runs",
    "itechskill_catalog_change_requests",
    "itechskill_operations_alerts",
  ];

  for (const table of tables) {
    const { data, error } = await db.from(table).select("*").limit(1);
    if (error) {
      console.error(`Error querying ${table}:`, error.message);
    } else {
      console.log(`\n=== TABLE: ${table} ===`);
      if (data && data.length > 0) {
        console.log("COLUMNS:", Object.keys(data[0]));
      } else {
        console.log("No rows, fetching column names via metadata...");
      }
    }
  }
}

inspectAllTables().catch(console.error);
