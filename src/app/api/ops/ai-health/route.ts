import { NextResponse } from "next/server";
import { requireRole, toErrorResponse } from "@/lib/auth/account";
import { loadAiHealth } from "@/lib/operations/queries";

export async function GET() {
  try {
    // AI health is an admin/owner level operational view
    await requireRole("admin");

    const health = await loadAiHealth();
    return NextResponse.json(health);
  } catch (err) {
    return toErrorResponse(err);
  }
}
