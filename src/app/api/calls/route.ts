import { NextResponse } from "next/server";
import { getCurrentAccount, requireRole, toErrorResponse } from "@/lib/auth/account";
import { supabaseAdmin } from "@/lib/automations/admin-client";
import type { CallDirection, CallMethod, CallOutcome } from "@/types";

const VALID_DIRECTIONS: readonly CallDirection[] = ["outgoing", "incoming", "missed"];
const VALID_METHODS: readonly CallMethod[] = ["phone", "whatsapp", "other"];
const VALID_OUTCOMES: readonly CallOutcome[] = [
  "answered",
  "no_answer",
  "busy",
  "callback_scheduled",
  "not_reachable",
  "wrong_number",
  "spam",
];

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_DURATION_SECONDS = 43200; // 12 hours
const MAX_NOTES_LEN = 1000;

export async function GET(request: Request) {
  try {
    const ctx = await getCurrentAccount();
    const { searchParams } = new URL(request.url);
    const contactId = searchParams.get("contact_id");
    const rawLimit = searchParams.get("limit");

    if (!contactId || !UUID_REGEX.test(contactId)) {
      return NextResponse.json(
        { error: "A valid contact_id is required" },
        { status: 400 },
      );
    }

    const limit = Math.min(Math.max(1, parseInt(rawLimit || "50", 10) || 50), 100);

    // Verify contact belongs to caller's account
    const { data: contact, error: contactErr } = await ctx.supabase
      .from("contacts")
      .select("id")
      .eq("id", contactId)
      .eq("account_id", ctx.accountId)
      .maybeSingle();

    if (contactErr || !contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    // Fetch calls for this contact and account
    const { data: calls, error: callsErr } = await ctx.supabase
      .from("calls")
      .select("*")
      .eq("account_id", ctx.accountId)
      .eq("contact_id", contactId)
      .order("call_started_at", { ascending: false })
      .limit(limit);

    if (callsErr) {
      console.error("[GET /api/calls] fetch error:", callsErr);
      return NextResponse.json({ error: callsErr.message }, { status: 500 });
    }

    // Fetch all calls (or summary counts) for this contact to produce the summary block
    const { data: allCalls, error: allCallsErr } = await ctx.supabase
      .from("calls")
      .select("id, outcome, direction, duration_seconds, call_started_at")
      .eq("account_id", ctx.accountId)
      .eq("contact_id", contactId)
      .order("call_started_at", { ascending: false });

    if (allCallsErr) {
      console.error("[GET /api/calls] allCalls error:", allCallsErr);
    }

    const rows = allCalls ?? (calls || []);
    const totalCalls = rows.length;
    const answeredCount = rows.filter((c) => c.outcome === "answered").length;
    const missedOrUnansweredCount = rows.filter(
      (c) => c.outcome !== "answered" || c.direction === "missed",
    ).length;
    const totalTalkSeconds = rows.reduce(
      (acc, c) => acc + (c.duration_seconds || 0),
      0,
    );
    const lastCallAt = rows.length > 0 ? rows[0].call_started_at : null;

    // Fetch agent profiles for the returned calls list
    const agentIds = Array.from(
      new Set((calls || []).map((c) => c.agent_id).filter(Boolean)),
    );
    let agentMap = new Map<string, string>();

    if (agentIds.length > 0) {
      const { data: profiles } = await ctx.supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", agentIds);

      if (profiles) {
        agentMap = new Map(profiles.map((p) => [p.user_id, p.full_name]));
      }
    }

    const hydratedCalls = (calls || []).map((call) => ({
      ...call,
      agent: call.agent_id
        ? {
            id: call.agent_id,
            full_name: agentMap.get(call.agent_id) || "Agent",
          }
        : null,
    }));

    return NextResponse.json({
      calls: hydratedCalls,
      summary: {
        total_calls: totalCalls,
        answered: answeredCount,
        missed_or_unanswered: missedOrUnansweredCount,
        total_talk_seconds: totalTalkSeconds,
        last_call_at: lastCallAt,
      },
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(request: Request) {
  let ctx;
  try {
    ctx = await requireRole("agent");
  } catch (err) {
    return toErrorResponse(err);
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    contact_id,
    conversation_id,
    direction = "outgoing",
    call_method = "phone",
    custom_platform,
    duration_seconds = 0,
    outcome = "answered",
    notes,
    follow_up_at,
    call_started_at,
  } = body;

  // Validate contact_id
  if (!contact_id || typeof contact_id !== "string" || !UUID_REGEX.test(contact_id)) {
    return NextResponse.json(
      { error: "A valid contact_id is required" },
      { status: 400 },
    );
  }

  // Verify contact belongs to caller's account
  const { data: contact, error: contactErr } = await ctx.supabase
    .from("contacts")
    .select("id")
    .eq("id", contact_id)
    .eq("account_id", ctx.accountId)
    .maybeSingle();

  if (contactErr || !contact) {
    return NextResponse.json(
      { error: "Contact not found in caller's account" },
      { status: 400 },
    );
  }

  // Validate direction
  if (!VALID_DIRECTIONS.includes(direction)) {
    return NextResponse.json(
      { error: `Invalid direction. Must be one of: ${VALID_DIRECTIONS.join(", ")}` },
      { status: 400 },
    );
  }

  // Validate call_method
  if (!VALID_METHODS.includes(call_method)) {
    return NextResponse.json(
      { error: `Invalid call_method. Must be one of: ${VALID_METHODS.join(", ")}` },
      { status: 400 },
    );
  }

  // Validate outcome
  if (!VALID_OUTCOMES.includes(outcome)) {
    return NextResponse.json(
      { error: `Invalid outcome. Must be one of: ${VALID_OUTCOMES.join(", ")}` },
      { status: 400 },
    );
  }

  // Validate custom_platform
  let sanitizedCustomPlatform: string | null = null;
  if (call_method === "other") {
    if (typeof custom_platform === "string" && custom_platform.trim()) {
      sanitizedCustomPlatform = custom_platform.trim().slice(0, 100);
    }
  }

  // Validate duration_seconds
  let duration = typeof duration_seconds === "number" ? Math.floor(duration_seconds) : -1;
  if (direction === "missed") {
    duration = 0;
  } else if (isNaN(duration) || duration < 0 || duration > MAX_DURATION_SECONDS) {
    return NextResponse.json(
      { error: `duration_seconds must be an integer between 0 and ${MAX_DURATION_SECONDS}` },
      { status: 400 },
    );
  }

  // Validate notes
  let sanitizedNotes = "";
  if (typeof notes === "string") {
    sanitizedNotes = notes.trim();
    if (sanitizedNotes.length > MAX_NOTES_LEN) {
      return NextResponse.json(
        { error: `notes cannot exceed ${MAX_NOTES_LEN} characters` },
        { status: 400 },
      );
    }
  }

  // Validate follow_up_at
  let sanitizedFollowUp: string | null = null;
  if (follow_up_at) {
    if (typeof follow_up_at !== "string" || isNaN(Date.parse(follow_up_at))) {
      return NextResponse.json(
        { error: "follow_up_at must be a valid ISO date string or null" },
        { status: 400 },
      );
    }
    sanitizedFollowUp = new Date(follow_up_at).toISOString();
  }

  // Validate call_started_at
  let sanitizedStartedAt = new Date().toISOString();
  if (call_started_at) {
    if (typeof call_started_at !== "string" || isNaN(Date.parse(call_started_at))) {
      return NextResponse.json(
        { error: "call_started_at must be a valid ISO date string" },
        { status: 400 },
      );
    }
    sanitizedStartedAt = new Date(call_started_at).toISOString();
  }

  // Resolve conversation_id if omitted or null
  let resolvedConversationId: string | null = null;
  if (typeof conversation_id === "string" && UUID_REGEX.test(conversation_id)) {
    resolvedConversationId = conversation_id;
  } else {
    const { data: conv } = await ctx.supabase
      .from("conversations")
      .select("id")
      .eq("contact_id", contact_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (conv) {
      resolvedConversationId = conv.id;
    }
  }

  // Insert into calls table (Postgres trigger call_to_timeline will automatically insert into messages)
  const { data: call, error: insertErr } = await supabaseAdmin()
    .from("calls")
    .insert({
      account_id: ctx.accountId,
      contact_id,
      conversation_id: resolvedConversationId,
      agent_id: ctx.userId,
      direction,
      call_method,
      custom_platform: sanitizedCustomPlatform,
      duration_seconds: duration,
      outcome,
      notes: sanitizedNotes,
      follow_up_at: sanitizedFollowUp,
      call_started_at: sanitizedStartedAt,
    })
    .select()
    .single();

  if (insertErr) {
    console.error("[POST /api/calls] insert error:", insertErr);
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  // If outcome is spam, mark the contact as spam
  if (outcome === "spam") {
    const { error: blockErr } = await supabaseAdmin()
      .from("contacts")
      .update({ is_spam: true })
      .eq("id", contact_id);
    if (blockErr) {
      console.error("[POST /api/calls] failed to flag contact as spam:", blockErr);
    }
  }

  return NextResponse.json({ call }, { status: 201 });
}
