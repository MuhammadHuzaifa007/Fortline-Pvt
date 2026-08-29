import { NextResponse } from "next/server";
import { requireRole, toErrorResponse } from "@/lib/auth/account";
import { loadHandoffCases } from "@/lib/operations/queries";

export async function GET(request: Request) {
  try {
    await requireRole("agent");

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || undefined;
    const priority = searchParams.get("priority") || undefined;
    const overdue = searchParams.get("overdue") === "true";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "25", 10);

    const result = await loadHandoffCases(
      {
        status: status ? status.split(",") : undefined,
        priority,
        overdue,
      },
      { page, pageSize }
    );

    return NextResponse.json(result);
  } catch (err) {
    return toErrorResponse(err);
  }
}
