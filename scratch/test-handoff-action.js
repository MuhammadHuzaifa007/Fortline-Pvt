import { startHandoff, resolveHandoff } from "./src/lib/operations/actions.js";
import { loadHandoffCases } from "./src/lib/operations/queries.js";

async function testHandoffActions() {
  console.log("Fetching handoff cases...");
  const res = await loadHandoffCases();
  console.log(`Loaded ${res.data.length} handoff cases.`);

  if (res.data.length > 0) {
    const testCase = res.data[0];
    console.log("Testing case:", testCase.case_id || testCase.id);

    console.log("Calling startHandoff...");
    const updated = await startHandoff(testCase.case_id || testCase.id, {
      userId: "test-admin-user",
      role: "admin",
    });

    console.log("SUCCESS! Started handoff case status:", updated.status);
  }
}

testHandoffActions().catch(console.error);
