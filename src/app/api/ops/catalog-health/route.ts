import { NextResponse } from "next/server";
import { requireRole, toErrorResponse } from "@/lib/auth/account";
import { loadCatalogHealth } from "@/lib/operations/queries";

export async function GET() {
  try {
    await requireRole("admin");

    const health = await loadCatalogHealth();
    return NextResponse.json(health);
  } catch (err) {
    return toErrorResponse(err);
  }
}
