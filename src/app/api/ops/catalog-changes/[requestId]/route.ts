import { NextResponse } from "next/server";
import { requireRole, toErrorResponse } from "@/lib/auth/account";
import { approveCatalogChange, rejectCatalogChange } from "@/lib/operations/actions";

interface RouteParams {
  params: Promise<{ requestId: string }>;
}

export async function POST(request: Request, props: RouteParams) {
  try {
    const ctx = await requireRole("admin");
    const { requestId } = await props.params;

    const body = await request.json().catch(() => ({}));
    const { action, note, reason, reqId } = body;

    const actor = { userId: ctx.userId, role: ctx.role };

    switch (action) {
      case "approve": {
        const updated = await approveCatalogChange(
          requestId,
          note || "Approved via CRM",
          actor,
          reqId
        );
        return NextResponse.json(updated);
      }

      case "reject": {
        if (!reason || typeof reason !== "string" || !reason.trim()) {
          return NextResponse.json(
            { error: "A rejection reason is required" },
            { status: 400 }
          );
        }
        const updated = await rejectCatalogChange(
          requestId,
          reason.trim(),
          actor,
          reqId
        );
        return NextResponse.json(updated);
      }

      default:
        return NextResponse.json(
          { error: `Invalid action: ${action}. Expected approve | reject` },
          { status: 400 }
        );
    }
  } catch (err) {
    return toErrorResponse(err);
  }
}
