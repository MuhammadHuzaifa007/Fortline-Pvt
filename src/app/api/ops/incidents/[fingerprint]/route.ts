import { NextResponse } from "next/server";
import { requireRole, toErrorResponse } from "@/lib/auth/account";
import { resolveIncident } from "@/lib/operations/actions";

interface RouteParams {
  params: Promise<{ fingerprint: string }>;
}

export async function POST(request: Request, props: RouteParams) {
  try {
    const ctx = await requireRole("admin");
    const { fingerprint } = await props.params;

    const body = await request.json().catch(() => ({}));
    const { resolutionNote, requestId } = body;

    const actor = { userId: ctx.userId, role: ctx.role };
    const updated = await resolveIncident(
      fingerprint,
      resolutionNote || "Resolved via CRM Operations Panel",
      actor,
      requestId
    );

    return NextResponse.json(updated);
  } catch (err) {
    return toErrorResponse(err);
  }
}
