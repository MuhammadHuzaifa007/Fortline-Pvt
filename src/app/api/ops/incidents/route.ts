import { NextResponse } from "next/server";
import { requireRole, toErrorResponse } from "@/lib/auth/account";
import { loadOperationsAlerts } from "@/lib/operations/queries";

export async function GET(request: Request) {
  try {
    await requireRole("admin");

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || undefined;
    const severity = searchParams.get("severity") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "25", 10);

    const result = await loadOperationsAlerts(
      {
        status: status ? status.split(",") : undefined,
        severity,
      },
      { page, pageSize }
    );

    return NextResponse.json(result);
  } catch (err) {
    return toErrorResponse(err);
  }
}
