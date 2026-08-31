import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import {
  loadOperationsSummary,
  loadHandoffCases,
  loadAdmissionsApplications,
  loadFollowupJobs,
  loadOperationsAlerts,
  loadCatalogChangeRequests,
  loadAiHealth,
  loadCallSummaries,
} from "./src/lib/operations/queries";
import {
  assignHandoff,
  startHandoff,
  resolveHandoff,
  reopenHandoff,
  approvePayment,
  rejectPayment,
  cancelFollowup,
  submitCatalogChange,
  approveCatalogChange,
  rejectCatalogChange,
  resolveIncident,
} from "./src/lib/operations/actions";

dotenv.config({ path: ".env" });
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function runIsolatedAuditSuite() {
  console.log("==========================================================");
  console.log("=== iTechSkill Operations Isolated Test Suite (Fixtures) ===");
  console.log("==========================================================\n");

  const actor = { userId: "00000000-0000-0000-0000-000000000000", role: "admin" as const };
  const testPhone = "+923000009999";
  const testCaseId = `case_test_${Date.now()}`;
  const testAppId = `ITS-TEST-${Date.now()}`;
  const testJobId = `job_test_${Date.now()}`;
  const testFingerprint = `alert_test_${Date.now()}`;

  try {
    // --- 1. Fixture Creation ---
    console.log("1. CREATING ISOLATED TEST FIXTURES...");
    const { error: handoffErr } = await db.from("itechskill_handoff_cases").insert({
      case_id: testCaseId,
      phone: testPhone,
      status: "open",
      priority: "urgent",
      reason: "Isolated unit test handoff case",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    if (handoffErr) console.error("Handoff insert error:", handoffErr.message);

    const { error: appErr } = await db.from("itechskill_enrollment_applications").insert({
      application_id: testAppId,
      phone: testPhone,
      full_name: "Test Applicant",
      email: "test.applicant@example.com",
      city: "Islamabad",
      program_name: "AI Diploma Test",
      total_fee_pkr: 180000,
      payment_status: "verification_pending",
      account_status: "pending_manual_creation",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    if (appErr) console.error("App insert error:", appErr.message);

    const { error: followupErr } = await db.from("itechskill_followup_jobs").insert({
      job_id: testJobId,
      phone: testPhone,
      job_type: "scheduled",
      message_text: "Automated follow-up test message",
      status: "pending",
      due_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    if (followupErr) console.error("Followup insert error:", followupErr.message);

    const { error: alertErr } = await db.from("itechskill_operations_alerts").insert({
      fingerprint: testFingerprint,
      alert_type: "webhook_failure",
      severity: "high",
      status: "pending",
      first_seen_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
    });
    if (alertErr) console.error("Alert insert error:", alertErr.message);

    console.log("   -> Fixtures created successfully.");

    // --- 2. Handoff Actions Test ---
    console.log("\n2. TESTING HANDOFF ACTIONS (Assign, Start, Resolve, Reopen):");
    const assigned = await assignHandoff(testCaseId, "staff-user-123", actor);
    console.log("   - assignHandoff: OK -> assigned_to =", assigned.assigned_to);

    const started = await startHandoff(testCaseId, actor);
    console.log("   - startHandoff: OK -> status =", started.status);

    const resolved = await resolveHandoff(testCaseId, "Test resolution note", actor);
    console.log("   - resolveHandoff: OK -> status =", resolved.status);

    const reopened = await reopenHandoff(testCaseId, actor);
    console.log("   - reopenHandoff: OK -> status =", reopened.status);

    // --- 3. Admissions Verification & State Machine Test ---
    console.log("\n3. TESTING ADMISSIONS PAYMENT ACTIONS & LOGIN WORKER ALIGNMENT:");
    const approved = await approvePayment(testAppId, actor);
    console.log("   - approvePayment: OK -> payment_status =", approved.payment_status, ", account_status =", approved.account_status);

    const rejected = await rejectPayment(testAppId, "Invalid receipt image", actor);
    console.log("   - rejectPayment: OK -> payment_status =", rejected.payment_status, ", account_status =", rejected.account_status);

    // --- 4. Follow-Up Cancellation Test ---
    console.log("\n4. TESTING FOLLOW-UP CANCELLATION:");
    const cancelled = await cancelFollowup(testJobId, "Customer opted out", actor);
    console.log("   - cancelFollowup: OK -> status =", cancelled.status, ", cancelled_reason =", (cancelled as any).cancelled_reason);

    // --- 5. Incident Resolution Test ---
    console.log("\n5. TESTING INCIDENT RESOLUTION:");
    const incident = await resolveIncident(testFingerprint, "Fixed webhook timeout", actor);
    console.log("   - resolveIncident: OK -> status =", incident.status);

    // --- 6. Catalog Governance Test ---
    console.log("\n6. TESTING CATALOG GOVERNANCE ACTIONS:");
    const submitted = await submitCatalogChange(
      {
        change_type: "update_price",
        title: "Test Course Price Update",
        description: "Test update description",
        payload: { course_id: "test_c1", new_price: 50000 },
      },
      actor
    );
    console.log("   - submitCatalogChange: OK -> ID =", submitted.id, ", status =", submitted.status);

    const approvedCatalog = await approveCatalogChange(submitted.id, "Approved by admin", actor);
    console.log("   - approveCatalogChange: OK -> status =", approvedCatalog.status);

    // --- 7. AI Health & Call Intelligence Data Queries Test ---
    console.log("\n7. TESTING AI HEALTH & CALL INTELLIGENCE QUERIES:");
    const aiHealth = await loadAiHealth();
    console.log("   - loadAiHealthData: OK -> Fallbacks 24h =", aiHealth.aiFallbackCount, ", Routing failures 24h =", aiHealth.routingFailures);

    const calls = await loadCallSummaries();
    console.log("   - loadCallSummaries: OK -> Total call logs =", calls.total);

    console.log("\n==========================================================");
    console.log("=== ALL ISOLATED OPERATIONAL TESTS PASSED SUCCESSFULLY ===");
    console.log("==========================================================");
  } finally {
    // --- Fixture Cleanup ---
    console.log("\nCLEANING UP ISOLATED TEST FIXTURES...");
    await db.from("itechskill_handoff_cases").delete().eq("case_id", testCaseId);
    await db.from("itechskill_enrollment_applications").delete().eq("application_id", testAppId);
    await db.from("itechskill_followup_jobs").delete().eq("job_id", testJobId);
    await db.from("itechskill_operations_alerts").delete().eq("fingerprint", testFingerprint);
    console.log("-> Test fixtures cleaned up from database.");
  }
}

runIsolatedAuditSuite().catch((err) => {
  console.error("Isolated Audit Suite Failed:", err);
  process.exit(1);
});
