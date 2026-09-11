import { NextResponse } from "next/server";
import { getCurrentAccount, toErrorResponse } from "@/lib/auth/account";
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";

export async function DELETE(request: Request) {
  try {
    const ctx = await getCurrentAccount();

    const limit = checkRateLimit(
      `delete_convs:${ctx.userId}`,
      RATE_LIMITS.adminAction
    );
    if (!limit.success) return rateLimitResponse(limit);

    const body = await request.json().catch(() => null);
    const ids = body?.ids;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "'ids' must be a non-empty array of strings" },
        { status: 400 }
      );
    }

    // First delete messages
    const { error: msgErr } = await ctx.supabase
      .from("messages")
      .delete()
      .in("conversation_id", ids)
      .eq("account_id", ctx.accountId);

    if (msgErr) {
      console.error("[DELETE /api/conversations] message delete error:", msgErr);
      return NextResponse.json({ error: "Failed to delete messages" }, { status: 500 });
    }

    // Then delete conversations
    const { error: convErr } = await ctx.supabase
      .from("conversations")
      .delete()
      .in("id", ids)
      .eq("account_id", ctx.accountId);

    if (convErr) {
      console.error("[DELETE /api/conversations] conversation delete error:", convErr);
      return NextResponse.json({ error: "Failed to delete conversations" }, { status: 500 });
    }

    return NextResponse.json({ success: true, count: ids.length });
  } catch (err) {
    return toErrorResponse(err);
  }
}
