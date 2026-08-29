import { NextResponse } from "next/server";
import { requireRole, toErrorResponse } from "@/lib/auth/account";
import { loadCatalogChangeRequests } from "@/lib/operations/queries";
import { submitCatalogChange } from "@/lib/operations/actions";

export async function GET(request: Request) {
  try {
    await requireRole("admin");

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "25", 10);

    const result = await loadCatalogChangeRequests({ page, pageSize });
    return NextResponse.json(result);
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireRole("admin");

    const body = await request.json().catch(() => ({}));
    const { change_type, title, description, payload, requestId } = body;

    if (!change_type || !title) {
      return NextResponse.json(
        { error: "change_type and title are required" },
        { status: 400 }
      );
    }

    const actor = { userId: ctx.userId, role: ctx.role };
    const created = await submitCatalogChange(
      {
        change_type,
        title,
        description: description || "",
        payload: payload || {},
      },
      actor,
      requestId
    );

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
