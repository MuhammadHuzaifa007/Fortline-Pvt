import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env" });

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testCatalogInsert() {
  const { data, error } = await db.from("itechskill_catalog_change_requests").insert({
    title: "Test Request",
    description: "Test description",
    status: "pending",
  }).select();

  if (error) {
    console.error("Insert error details:", error);
  } else {
    console.log("SUCCESS! Inserted row:", data);
    console.log("COLUMNS:", Object.keys(data[0]));
    // Clean up
    await db.from("itechskill_catalog_change_requests").delete().eq("id", data[0].id);
  }
}

testCatalogInsert().catch(console.error);
