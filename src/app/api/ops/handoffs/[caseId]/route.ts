import { NextResponse } from "next/server";
import { requireRole, toErrorResponse } from "@/lib/auth/account";
import { loadHandoffById } from "@/lib/operations/queries";
import {
  assignHandoff,
  startHandoff,
  resolveHandoff,
  reopenHandoff,
} from "@/lib/operations/actions";

interface RouteParams {
  params: Promise<{ caseId: string }>;
}

export async function GET(request: Request, props: RouteParams) {
  try {
    await requireRole("agent");
    const { caseId } = await props.params;

    const handoff = await loadHandoffById(caseId);
    if (!handoff) {
      return NextResponse.json({ error: "Handoff case not found" }, { status: 404 });
    }

    return NextResponse.json(handoff);
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(request: Request, props: RouteParams) {
  try {
    const ctx = await requireRole("agent");
    const { caseId } = await props.params;

    const body = await request.json().catch(() => ({}));
    const { action, staffUserId, resolutionNote, requestId } = body;

    const actor = { userId: ctx.userId, role: ctx.role };

    switch (action) {
      case "assign": {
        if (!staffUserId) {
          return NextResponse.json(
            { error: "staffUserId is required to assign a case" },
            { status: 400 }
          );
        }
        const updated = await assignHandoff(caseId, staffUserId, actor, requestId);
        return NextResponse.json(updated);
      }

      case "start": {
        const updated = await startHandoff(caseId, actor, requestId);
        return NextResponse.json(updated);
      }

      case "resolve": {
        if (!resolutionNote || typeof resolutionNote !== "string" || !resolutionNote.trim()) {
          return NextResponse.json(
            { error: "A resolution note is required to resolve a case" },
            { status: 400 }
          );
        }
        const updated = await resolveHandoff(caseId, resolutionNote.trim(), actor, requestId);
        return NextResponse.json(updated);
      }

      case "reopen": {
        const updated = await reopenHandoff(caseId, actor, requestId);
        return NextResponse.json(updated);
      }

      default:
        return NextResponse.json(
          { error: `Invalid action: ${action}. Expected assign | start | resolve | reopen` },
          { status: 400 }
        );
    }
  } catch (err) {
    return toErrorResponse(err);
  }
}
