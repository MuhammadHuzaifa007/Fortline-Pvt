import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const db = createClient(supabaseUrl, serviceKey);

async function inspectTable() {
  const { data, error } = await db
    .from("itechskill_enrollment_applications")
    .select("*")
    .limit(1);

  if (error) {
    console.error("Inspect error:", error);
    return;
  }

  if (data && data.length > 0) {
    console.log("Actual columns in itechskill_enrollment_applications:");
    console.log(Object.keys(data[0]));
    console.log("Sample record:", JSON.stringify(data[0], null, 2));
  } else {
    console.log("No records found in itechskill_enrollment_applications.");
  }
}

inspectTable().catch(console.error);
