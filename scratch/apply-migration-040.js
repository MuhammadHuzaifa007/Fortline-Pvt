import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config({ path: ".env" });

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function applyAuditMigration() {
  console.log("=== Applying Migration 040: itechskill_audit_log ===");
  const sql = fs.readFileSync("supabase/migrations/040_operations_audit_log_and_indexes.sql", "utf8");

  // Execute create table via raw RPC or check table existence by attempting insert
  const { data, error } = await db.from("itechskill_audit_log").select("*").limit(1);

  if (error && error.message.includes("does not exist")) {
    console.log("Table does not exist in schema cache. Let's create it via Supabase client or RPC.");
    // Attempt creating table if rpc exec exists or log instruction
  } else {
    console.log("Querying itechskill_audit_log status:", error ? error.message : "TABLE EXISTS!");
  }
}

applyAuditMigration().catch(console.error);
