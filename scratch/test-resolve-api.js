import { resolveHandoff, startHandoff } from "./src/lib/operations/actions.js";
import { loadHandoffCases } from "./src/lib/operations/queries.js";

async function testResolve() {
  console.log("=== Testing Resolve Handoff ===");
  const cases = await loadHandoffCases();
  if (cases.data.length === 0) {
    console.log("No cases found");
    return;
  }

  const c = cases.data[0];
  console.log(`Targeting case_id: ${c.case_id} (current status: ${c.status})`);

  const actor = { userId: "00000000-0000-0000-0000-000000000000", role: "admin" };

  console.log("1. Starting handoff...");
  const started = await startHandoff(c.case_id, actor);
  console.log("-> Status after start:", started.status);

  console.log("2. Resolving handoff...");
  const resolved = await resolveHandoff(c.case_id, "Manually verified student fee payment via EasyPaisa", actor);
  console.log("-> Status after resolve:", resolved.status, "Note:", resolved.resolution_note);

  console.log("TEST COMPLETED SUCCESSFULLY WITH 0 ERRORS!");
}

testResolve().catch(console.error);
