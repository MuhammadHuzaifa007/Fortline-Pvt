import { NextResponse } from 'next/server';
import { requireCeo, toErrorResponse } from '@/lib/auth/fortline-auth';
import { loadSalesMembers } from '@/lib/fortline/queries';

export async function GET() {
  try {
    const ctx = await requireCeo();
    const result = await loadSalesMembers(ctx.supabase, ctx.accountId, { limit: 100 });
    const presenceList = result.members.map((m) => ({
      id: m.id,
      name: m.name,
      division: m.division,
      designation: m.designation,
      channel_id: m.channel_id,
      phone_number: m.phone_number,
      presence_status: m.presence_status,
      presence_source: m.presence_source,
      last_activity_at: m.last_activity_at,
      last_heartbeat_at: m.last_heartbeat_at,
      last_inbound_at: m.last_inbound_at,
      last_outbound_at: m.last_outbound_at,
    }));
    return NextResponse.json(presenceList);
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireCeo();
    const body = await request.json().catch(() => ({}));
    const status = body.status === 'away' ? 'away' : 'online';
    const now = new Date().toISOString();

    // 1. Find profile of the caller
    const { data: profile } = await ctx.supabase
      .from('profiles')
      .select('full_name, email')
      .eq('user_id', ctx.userId)
      .maybeSingle();

    const fullName = profile?.full_name || '';

    // 2. Find matching sales member (prioritizing Huzaifa for CEO/owner)
    let targetMemberId = body.salesMemberId || null;

    if (!targetMemberId) {
      let query = ctx.supabase
        .from('fortline_sales_members')
        .select('id, name')
        .eq('account_id', ctx.accountId);

      if (fullName.toLowerCase().includes('huzaifa')) {
        query = query.ilike('name', '%Huzaifa%');
      } else if (fullName) {
        const parts = fullName.split(/\s+/).filter(Boolean);
        const specificPart =
          parts.find((p) => !['muhammad', 'mohammad', 'mr', 'dr'].includes(p.toLowerCase())) ||
          parts[0];
        query = query.ilike('name', `%${specificPart}%`);
      } else {
        query = query.ilike('name', '%Huzaifa%');
      }

      const { data: matchedReps } = await query.limit(1);
      targetMemberId = matchedReps && matchedReps[0] ? matchedReps[0].id : null;
    }

    if (targetMemberId) {
      await ctx.supabase
        .from('fortline_sales_members')
        .update({
          presence_status: status,
          presence_source: 'heartbeat',
          last_heartbeat_at: now,
          ...(status === 'online' ? { last_activity_at: now } : {}),
          updated_at: now,
        })
        .eq('id', targetMemberId);
    }

    return NextResponse.json({ ok: true, status, matchedMemberId: targetMemberId });
  } catch (err) {
    return toErrorResponse(err);
  }
}
