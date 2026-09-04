import { NextResponse } from "next/server";
import { requireRole, toErrorResponse } from "@/lib/auth/account";
import { supabaseAdmin } from "@/lib/automations/admin-client";
import { derivePresence, type StoredPresence } from "@/lib/presence";
import type { AgentCallStats } from "@/types";

export async function GET() {
  try {
    const ctx = await requireRole("admin");

    // Try reading from public.agent_call_stats view
    const { data: viewData, error: viewError } = await supabaseAdmin()
      .from("agent_call_stats")
      .select("*")
      .eq("account_id", ctx.accountId)
      .order("total_calls", { ascending: false });

    if (!viewError && Array.isArray(viewData)) {
      const stats: AgentCallStats[] = viewData.map((row) => ({
        user_id: row.user_id,
        agent_name: row.agent_name || "Agent",
        account_role: row.account_role || "agent",
        presence: (row.presence as AgentCallStats["presence"]) || "offline",
        total_calls: Number(row.total_calls) || 0,
        answered_calls: Number(row.answered_calls) || 0,
        unanswered_calls: Number(row.unanswered_calls) || 0,
        total_talk_seconds: Number(row.total_talk_seconds) || 0,
        avg_call_seconds: Number(row.avg_call_seconds) || 0,
        last_call_at: row.last_call_at || null,
        calls_last_24h: Number(row.calls_last_24h) || 0,
      }));

      return NextResponse.json({ stats });
    }

    // Fallback: in case view is not yet created in local test / mock client,
    // query profiles, presence, and calls directly.
    const [profilesRes, presenceRes, callsRes] = await Promise.all([
      supabaseAdmin()
        .from("profiles")
        .select("user_id, full_name, account_role")
        .eq("account_id", ctx.accountId),
      supabaseAdmin()
        .from("member_presence")
        .select("user_id, status, last_seen_at")
        .eq("account_id", ctx.accountId),
      supabaseAdmin()
        .from("calls")
        .select("id, agent_id, outcome, direction, duration_seconds, call_started_at")
        .eq("account_id", ctx.accountId),
    ]);

    const profiles = profilesRes.data ?? [];
    const presenceList = presenceRes.data ?? [];
    const calls = callsRes.data ?? [];

    const now = Date.now();
    const presenceMap = new Map(
      presenceList.map((p) => [
        p.user_id,
        derivePresence(p.status as StoredPresence, p.last_seen_at, now),
      ]),
    );

    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    const stats: AgentCallStats[] = profiles.map((p) => {
      const agentCalls = calls.filter((c) => c.agent_id === p.user_id);
      const totalCalls = agentCalls.length;
      const answeredCalls = agentCalls.filter((c) => c.outcome === "answered").length;
      const unansweredCalls = agentCalls.filter(
        (c) => c.outcome !== "answered" || c.direction === "missed",
      ).length;
      const totalTalkSeconds = agentCalls.reduce(
        (acc, c) => acc + (c.duration_seconds || 0),
        0,
      );
      const avgCallSeconds =
        totalCalls > 0 ? Math.round(totalTalkSeconds / totalCalls) : 0;
      const sortedCalls = [...agentCalls].sort(
        (a, b) =>
          new Date(b.call_started_at).getTime() -
          new Date(a.call_started_at).getTime(),
      );
      const lastCallAt = sortedCalls.length > 0 ? sortedCalls[0].call_started_at : null;
      const callsLast24h = agentCalls.filter(
        (c) => new Date(c.call_started_at).getTime() >= oneDayAgo,
      ).length;

      return {
        user_id: p.user_id,
        agent_name: p.full_name || "Agent",
        account_role: p.account_role || "agent",
        presence: presenceMap.get(p.user_id) || "offline",
        total_calls: totalCalls,
        answered_calls: answeredCalls,
        unanswered_calls: unansweredCalls,
        total_talk_seconds: totalTalkSeconds,
        avg_call_seconds: avgCallSeconds,
        last_call_at: lastCallAt,
        calls_last_24h: callsLast24h,
      };
    });

    stats.sort((a, b) => b.total_calls - a.total_calls);

    return NextResponse.json({ stats });
  } catch (err) {
    return toErrorResponse(err);
  }
}
