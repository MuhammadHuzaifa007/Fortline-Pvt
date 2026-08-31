import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env" });

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function inspectStudent360() {
  const { data, error } = await db.from("itechskill_student_360").select("*").limit(1);
  if (error) {
    console.error("Error inspecting student_360:", error.message);
  } else {
    console.log("COLUMNS IN itechskill_student_360:");
    if (data && data.length > 0) {
      console.log(Object.keys(data[0]));
    } else {
      console.log("No rows in student_360");
    }
  }
}

inspectStudent360().catch(console.error);
