import { NextResponse } from "next/server";
import { requireRole, toErrorResponse } from "@/lib/auth/account";
import { loadFollowupJobs } from "@/lib/operations/queries";

export async function GET(request: Request) {
  try {
    await requireRole("agent");

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "25", 10);

    const result = await loadFollowupJobs(
      {
        status: status ? status.split(",") : undefined,
      },
      { page, pageSize }
    );

    return NextResponse.json(result);
  } catch (err) {
    return toErrorResponse(err);
  }
}
