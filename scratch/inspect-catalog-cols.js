import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env" });

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function inspectCatalogCols() {
  const { data, error } = await db.from("itechskill_catalog_change_requests").select("*").limit(1);
  if (error) {
    console.error("Error catalog cols:", error);
  } else {
    console.log("COLUMNS IN itechskill_catalog_change_requests:");
    if (data && data.length > 0) {
      console.log(Object.keys(data[0]));
    } else {
      console.log("No rows found. Querying columns directly...");
    }
  }
}

inspectCatalogCols().catch(console.error);
