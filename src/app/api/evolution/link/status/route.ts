import { NextResponse } from 'next/server';
import { requireRole, toErrorResponse } from '@/lib/auth/account';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getEvolutionConnectionState } from '@/lib/evolution/evolution-api';

/**
 * GET /api/evolution/link/status?sales_member_id=<uuid>
 *
 * Checks live connection state from Evolution API for a sales member's WhatsApp channel.
 * Synchronizes fortline_channels record upon connection/disconnection.
 */
export async function GET(request: Request) {
  try {
    const { accountId } = await requireRole('agent');

    const { searchParams } = new URL(request.url);
    const salesMemberId = searchParams.get('sales_member_id')?.trim();

    if (!salesMemberId) {
      return NextResponse.json(
        { error: 'sales_member_id is required' },
        { status: 400 },
      );
    }

    const admin = supabaseAdmin();

    // 1. Fetch sales member
    const { data: salesMember, error: smErr } = await admin
      .from('fortline_sales_members')
      .select('id, name, account_id')
      .eq('id', salesMemberId)
      .eq('account_id', accountId)
      .maybeSingle();

    if (smErr) {
      console.error('[EVOLUTION LINK STATUS] Error fetching sales member:', smErr);
      return NextResponse.json(
        { error: 'Failed to fetch sales member' },
        { status: 500 },
      );
    }

    if (!salesMember) {
      return NextResponse.json(
        { error: 'Sales member not found' },
        { status: 404 },
      );
    }

    // 2. Fetch linked channel
    const { data: channel, error: chErr } = await admin
      .from('fortline_channels')
      .select('id, sales_member_id, gateway_instance_id, connection_status, pairing_state')
      .eq('sales_member_id', salesMemberId)
      .eq('account_id', accountId)
      .maybeSingle();

    if (chErr) {
      console.error('[EVOLUTION LINK STATUS] Error fetching channel:', chErr);
      return NextResponse.json(
        { error: 'Failed to fetch channel' },
        { status: 500 },
      );
    }

    if (!channel) {
      return NextResponse.json(
        { error: 'WhatsApp channel not found for this sales member' },
        { status: 404 },
      );
    }

    const instanceName = channel.gateway_instance_id?.trim();
    if (!instanceName) {
      return NextResponse.json(
        { ok: true, state: 'disconnected' },
        { status: 200 },
      );
    }

    // 3. Query Evolution live connection state
    const connStateRes = await getEvolutionConnectionState(instanceName);

    const rawState = (connStateRes.state || '').toLowerCase().trim();
    let normalizedState: 'connected' | 'connecting' | 'disconnected' = 'disconnected';

    if (rawState === 'open' || rawState === 'connected') {
      normalizedState = 'connected';
    } else if (rawState === 'connecting') {
      normalizedState = 'connecting';
    } else {
      normalizedState = 'disconnected';
    }

    const nowIso = new Date().toISOString();

    // 4. Update database on terminal states
    if (normalizedState === 'connected') {
      await admin
        .from('fortline_channels')
        .update({
          connection_status: 'connected',
          pairing_state: 'connected',
          webhook_status: 'active',
          last_successful_event_at: nowIso,
          updated_at: nowIso,
        })
        .eq('id', channel.id);
    } else if (normalizedState === 'disconnected') {
      await admin
        .from('fortline_channels')
        .update({
          connection_status: 'disconnected',
          pairing_state: 'disconnected',
          updated_at: nowIso,
        })
        .eq('id', channel.id);
    }
    // Note: Temporary 'connecting' state is intentionally preserved without overwriting to disconnected.

    // 5. Return safe payload (never expose API keys)
    return NextResponse.json(
      {
        ok: true,
        state: normalizedState,
        instance: instanceName,
      },
      { status: 200 },
    );
  } catch (err) {
    return toErrorResponse(err);
  }
}
