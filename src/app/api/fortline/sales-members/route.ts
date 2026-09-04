import { NextResponse } from 'next/server';
import { requireCeo, toErrorResponse } from '@/lib/auth/fortline-auth';
import { loadSalesMembers } from '@/lib/fortline/queries';
import { logFortlineAuditEvent } from '@/lib/fortline/mutations';
import type { PresenceStatus } from '@/types/fortline';

export async function GET(request: Request) {
  try {
    const ctx = await requireCeo();
    const { searchParams } = new URL(request.url);

    const division = searchParams.get('division') || undefined;
    const presence = (searchParams.get('presence') as PresenceStatus) || undefined;
    const search = searchParams.get('search') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 50;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : 0;

    const result = await loadSalesMembers(ctx.supabase, ctx.accountId, {
      division,
      presence,
      search,
      limit,
      offset,
    });

    return NextResponse.json(result);
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireCeo();
    const body = await request.json();

    if (!body.name || !body.division || !body.phone_number) {
      return NextResponse.json(
        { error: 'name, division, and phone_number are required' },
        { status: 400 }
      );
    }

    const { data, error } = await ctx.supabase
      .from('fortline_sales_members')
      .insert({
        account_id: ctx.accountId,
        name: body.name.trim(),
        division: body.division.trim(),
        designation: (body.designation || 'Sales Representative').trim(),
        phone_number: body.phone_number.trim(),
        channel_id: body.channel_id || null,
        presence_status: 'unknown',
        presence_source: 'none',
        is_active: body.is_active ?? true,
        notes: body.notes || null,
        kpi_profile: body.kpi_profile || {
          first_response_target_min: 15,
          followup_target_hours: 24,
        },
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await logFortlineAuditEvent(ctx.supabase, {
      accountId: ctx.accountId,
      actor: { userId: ctx.userId },
      action: 'create_sales_member',
      entityType: 'fortline_sales_member',
      entityId: data.id,
      details: body,
    });

    return NextResponse.json({ ok: true, member: data }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
