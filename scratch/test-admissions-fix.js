import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env" });

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testApprove() {
  const { data: apps } = await db.from("itechskill_enrollment_applications").select("*").limit(1);
  if (!apps || apps.length === 0) return;

  const app = apps[0];
  console.log("Testing update on application_id:", app.application_id);

  const { data, error } = await db
    .from("itechskill_enrollment_applications")
    .update({
      payment_status: app.payment_status,
      account_status: app.account_status,
      updated_at: new Date().toISOString()
    })
    .eq("application_id", app.application_id)
    .select()
    .single();

  if (error) {
    console.error("Update error:", error);
  } else {
    console.log("Update SUCCESS! Returned record application_id:", data.application_id);
  }
}

testApprove().catch(console.error);
