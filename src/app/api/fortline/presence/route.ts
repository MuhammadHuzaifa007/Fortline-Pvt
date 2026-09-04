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
