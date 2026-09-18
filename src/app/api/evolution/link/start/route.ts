import { NextResponse } from 'next/server';
import { requireRole, toErrorResponse } from '@/lib/auth/account';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  createEvolutionInstance,
  getEvolutionConnection,
  setEvolutionWebhook,
} from '@/lib/evolution/evolution-api';

function normalizePairingCode(value: unknown): string | null {
  if (typeof value !== 'string') return null;

  const normalized = value
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(0, 8);

  return normalized.length === 8 ? normalized : null;
}

/**
 * POST /api/evolution/link/start
 *
 * Starts a WhatsApp link session for a sales member's QR gateway channel.
 * Creates/reuses an Evolution instance, registers the webhook, and fetches
 * QR data or pairing code.
 *
 * Body:
 * {
 *   "sales_member_id": "...",
 *   "mode": "qr" | "pairing",
 *   "phone"?: "923xxxxxxxxx"
 * }
 */
export async function POST(request: Request) {
  try {
    const { accountId } = await requireRole('agent');

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 },
      );
    }

    const salesMemberId =
      typeof body.sales_member_id === 'string'
        ? body.sales_member_id.trim()
        : '';

    if (!salesMemberId) {
      return NextResponse.json(
        { error: 'sales_member_id is required' },
        { status: 400 },
      );
    }

    const rawMode =
      typeof body.mode === 'string'
        ? body.mode.trim().toLowerCase()
        : 'qr';

    const mode: 'qr' | 'pairing' =
      rawMode === 'pairing' ? 'pairing' : 'qr';

    const admin = supabaseAdmin();

    // 1. Fetch sales member
    const { data: salesMember, error: smErr } = await admin
      .from('fortline_sales_members')
      .select('id, name, phone_number, account_id')
      .eq('id', salesMemberId)
      .eq('account_id', accountId)
      .maybeSingle();

    if (smErr) {
      console.error(
        '[EVOLUTION LINK START] Error fetching sales member:',
        smErr,
      );

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

    // 2. Fetch linked WhatsApp channel
    const { data: channel, error: chErr } = await admin
      .from('fortline_channels')
      .select(
        'id, sales_member_id, gateway_instance_id, channel_type, connection_status, pairing_state',
      )
      .eq('sales_member_id', salesMemberId)
      .eq('account_id', accountId)
      .maybeSingle();

    if (chErr) {
      console.error(
        '[EVOLUTION LINK START] Error fetching channel:',
        chErr,
      );

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

    // 3. Only operate on qr_gateway channels
    if (channel.channel_type !== 'qr_gateway') {
      return NextResponse.json(
        { error: 'Channel is not configured for QR gateway' },
        { status: 400 },
      );
    }

    // 4. Stable instance name
    const instanceName =
      channel.gateway_instance_id &&
        channel.gateway_instance_id.trim()
        ? channel.gateway_instance_id.trim()
        : `fortline_rep_${channel.id.replace(/[^a-zA-Z0-9]/g, '_')}`;

    // 5. Ensure instance exists in Evolution
    const createRes =
      await createEvolutionInstance(instanceName);

    if (
      !createRes.success &&
      !createRes.alreadyExists
    ) {
      return NextResponse.json(
        {
          error:
            createRes.error ||
            'Failed to create Evolution instance',
        },
        { status: 502 },
      );
    }

    // 6. Automatically register webhook
    const webhookRes =
      await setEvolutionWebhook(instanceName);

    if (!webhookRes.success) {
      console.warn(
        '[EVOLUTION LINK START] Non-fatal: Webhook registration returned an error:',
        instanceName,
        webhookRes.error,
      );
    }

    // 7. Request connection (QR or Pairing Code)
    let phoneParam: string | undefined;

    if (mode === 'pairing') {
      const rawPhone =
        typeof body.phone === 'string' &&
          body.phone.trim()
          ? body.phone.trim()
          : salesMember.phone_number || '';

      let normalizedPhone = rawPhone.replace(/\D/g, '');

      if (normalizedPhone.startsWith('00')) {
        normalizedPhone = normalizedPhone.slice(2);
      }

      if (
        normalizedPhone.startsWith('0') &&
        normalizedPhone.length === 11
      ) {
        normalizedPhone = `92${normalizedPhone.slice(1)}`;
      }

      if (
        !normalizedPhone ||
        normalizedPhone.length < 8
      ) {
        return NextResponse.json(
          {
            error:
              'A valid phone number with country code is required for pairing mode',
          },
          { status: 400 },
        );
      }

      phoneParam = normalizedPhone;
    }

    const connectRes =
      await getEvolutionConnection(
        instanceName,
        phoneParam,
      );

    if (!connectRes.success) {
      return NextResponse.json(
        {
          error:
            connectRes.error ||
            'Failed to initiate WhatsApp connection',
        },
        { status: 502 },
      );
    }

    const connectData =
      (connectRes.data || {}) as Record<
        string,
        unknown
      >;

    // 8. Update fortline_channels with connecting state
    let updatePayload: Record<
      string,
      unknown
    > = {
      gateway_instance_id:
        instanceName,
      connection_status:
        'connecting',
      pairing_state:
        mode === 'qr'
          ? 'qrcode'
          : 'pairing',
      webhook_status:
        'active',
      updated_at:
        new Date().toISOString(),
    };

    const { error: updateErr } =
      await admin
        .from('fortline_channels')
        .update(updatePayload)
        .eq('id', channel.id);

    // If database check constraint restricts connection_status or pairing_state,
    // fallback gracefully to valid database enum values.
    if (
      updateErr &&
      updateErr.code === '23514'
    ) {
      updatePayload = {
        gateway_instance_id:
          instanceName,
        connection_status:
          'disconnected',
        pairing_state:
          mode === 'qr'
            ? 'qrcode'
            : 'connecting',
        webhook_status:
          'active',
        updated_at:
          new Date().toISOString(),
      };

      const fallback =
        await admin
          .from('fortline_channels')
          .update(updatePayload)
          .eq('id', channel.id);

      if (fallback.error) {
        console.error(
          '[EVOLUTION LINK START] Fallback channel update error:',
          fallback.error,
        );
      }
    } else if (updateErr) {
      console.error(
        '[EVOLUTION LINK START] Error updating channel state:',
        updateErr,
      );
    }

    // 9. Extract and normalize pairing code.
    // Baileys generates Crockford pairing codes in uppercase.
    // Normalize here too so frontend and WhatsApp mobile always see the same format.
    let pairingCode: string | null = null;

    if (mode === 'pairing') {
      const rawPairingCode =
        typeof connectData.pairingCode ===
          'string'
          ? connectData.pairingCode
          : typeof connectData.code ===
            'string'
            ? connectData.code
            : null;

      pairingCode =
        normalizePairingCode(
          rawPairingCode,
        );

      if (!pairingCode) {
        console.error(
          '[EVOLUTION LINK START] Invalid pairing code returned by Evolution:',
          rawPairingCode,
        );

        return NextResponse.json(
          {
            error:
              'Evolution returned an invalid pairing code. Generate a new code and try again.',
          },
          { status: 502 },
        );
      }
    }

    // 10. Return only safe data to frontend
    return NextResponse.json(
      {
        ok: true,
        instance: instanceName,
        mode,
        qr:
          mode === 'qr'
            ? connectData
            : null,
        pairingCode,
      },
      { status: 200 },
    );
  } catch (err) {
    return toErrorResponse(err);
  }
}
