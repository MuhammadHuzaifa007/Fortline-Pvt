import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkOrMakeTable() {
  console.log("Checking if table exists or can be created...");
  const { data, error } = await db.from("itechskill_audit_log").select("*").limit(1);

  if (error) {
    console.log("Supabase error message:", error.message);
  } else {
    console.log("Table itechskill_audit_log ALREADY EXISTS! Row count:", data.length);
  }
}

checkOrMakeTable().catch(console.error);
