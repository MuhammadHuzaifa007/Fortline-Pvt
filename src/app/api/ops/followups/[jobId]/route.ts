import { NextResponse } from "next/server";
import { requireRole, toErrorResponse } from "@/lib/auth/account";
import { cancelFollowup } from "@/lib/operations/actions";

interface RouteParams {
  params: Promise<{ jobId: string }>;
}

export async function POST(request: Request, props: RouteParams) {
  try {
    const ctx = await requireRole("admin");
    const { jobId } = await props.params;

    const body = await request.json().catch(() => ({}));
    const { reason, requestId } = body;

    if (!reason || typeof reason !== "string" || !reason.trim()) {
      return NextResponse.json(
        { error: "A cancellation reason is required to cancel a follow-up job" },
        { status: 400 }
      );
    }

    const actor = { userId: ctx.userId, role: ctx.role };
    const updated = await cancelFollowup(jobId, reason.trim(), actor, requestId);

    return NextResponse.json(updated);
  } catch (err) {
    return toErrorResponse(err);
  }
}
