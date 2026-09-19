import { NextResponse } from 'next/server';
import { getCurrentAccount } from '@/lib/auth/account';
import { requireCeo, toErrorResponse } from '@/lib/auth/fortline-auth';
import { loadSalesMembers } from '@/lib/fortline/queries';
import { logFortlineAuditEvent } from '@/lib/fortline/mutations';
import type { PresenceStatus } from '@/types/fortline';

export async function GET(request: Request) {
  try {
    const ctx = await getCurrentAccount();
    const { searchParams } = new URL(request.url);

    const division = searchParams.get('division') || undefined;
    const presence =
      (searchParams.get('presence') as PresenceStatus) || undefined;
    const search = searchParams.get('search') || undefined;
    const limit = searchParams.get('limit')
      ? parseInt(searchParams.get('limit')!, 10)
      : 50;
    const offset = searchParams.get('offset')
      ? parseInt(searchParams.get('offset')!, 10)
      : 0;

    const result = await loadSalesMembers(
      ctx.supabase,
      ctx.accountId,
      {
        division,
        presence,
        search,
        limit,
        offset,
      },
    );

    const resultObject =
      result && typeof result === 'object'
        ? (result as Record<string, unknown>)
        : {};

    const members = Array.isArray(resultObject.members)
      ? (resultObject.members as Array<Record<string, unknown>>)
      : Array.isArray(resultObject.salesMembers)
        ? (resultObject.salesMembers as Array<Record<string, unknown>>)
        : [];

    if (members.length > 0) {
      const memberIds = members
        .map((member) =>
          typeof member.id === 'string' ? member.id : '',
        )
        .filter(Boolean);

      if (memberIds.length > 0) {
        const { data: channels, error: channelsError } =
          await ctx.supabase
            .from('fortline_channels')
            .select(
              'id, sales_member_id, gateway_instance_id, connection_status, channel_type',
            )
            .eq('account_id', ctx.accountId)
            .in('sales_member_id', memberIds);

        if (channelsError) {
          console.error(
            '[SALES MEMBERS] Failed to load WhatsApp gateway IDs:',
            channelsError,
          );
        } else {
          const channelByMemberId = new Map<
            string,
            {
              id: string;
              gateway_instance_id: string | null;
              connection_status: string | null;
              channel_type: string | null;
            }
          >();

          for (const channel of channels || []) {
            if (
              typeof channel.sales_member_id === 'string' &&
              channel.sales_member_id
            ) {
              channelByMemberId.set(channel.sales_member_id, {
                id: channel.id,
                gateway_instance_id:
                  channel.gateway_instance_id || null,
                connection_status:
                  channel.connection_status || null,
                channel_type: channel.channel_type || null,
              });
            }
          }

          const enrichedMembers = members.map((member) => {
            const memberId =
              typeof member.id === 'string' ? member.id : '';

            const channel = memberId
              ? channelByMemberId.get(memberId)
              : undefined;

            return {
              ...member,
              gateway_instance_id:
                channel?.gateway_instance_id || null,
              whatsapp_channel_id:
                channel?.id || null,
              channel_type:
                channel?.channel_type || null,
              channel_connection_status:
                channel?.connection_status ||
                member.channel_connection_status ||
                null,
            };
          });

          if (Array.isArray(resultObject.members)) {
            resultObject.members = enrichedMembers;
          }

          if (Array.isArray(resultObject.salesMembers)) {
            resultObject.salesMembers = enrichedMembers;
          }
        }
      }
    }

    return NextResponse.json(resultObject);
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
