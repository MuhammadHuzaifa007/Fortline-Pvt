import { NextResponse } from "next/server";
import { requireRole, toErrorResponse } from "@/lib/auth/account";
import { loadOperationsSummary } from "@/lib/operations/queries";

export async function GET() {
  try {
    // Agents, admins, and owners can view the operations summary
    await requireRole("agent");

    const summary = await loadOperationsSummary();
    return NextResponse.json(summary);
  } catch (err) {
    return toErrorResponse(err);
  }
}
