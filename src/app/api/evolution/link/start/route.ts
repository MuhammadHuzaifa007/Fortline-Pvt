import { NextResponse } from 'next/server';
import { requireRole, toErrorResponse } from '@/lib/auth/account';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  createEvolutionInstance,
  deleteEvolutionInstance,
  getEvolutionConnection,
  getEvolutionConnectionState,
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

function extractPairingCode(
  createData: Record<string, unknown>,
  connectData: Record<string, unknown>,
): string | null {
  const createQr =
    createData.qrcode && typeof createData.qrcode === 'object'
      ? (createData.qrcode as Record<string, unknown>)
      : null;

  const connectQr =
    connectData.qrcode && typeof connectData.qrcode === 'object'
      ? (connectData.qrcode as Record<string, unknown>)
      : null;

  const candidates = [
    connectData.pairingCode,
    connectQr?.pairingCode,
    createData.pairingCode,
    createQr?.pairingCode,
  ];

  for (const candidate of candidates) {
    const normalized = normalizePairingCode(candidate);
    if (normalized) return normalized;
  }

  return null;
}

/**
 * POST /api/evolution/link/start
 *
 * Starts a WhatsApp link session for a sales member's QR gateway channel.
 * Pairing mode deliberately recreates any non-open Evolution instance and
 * creates the fresh instance WITH the phone number from the beginning.
 *
 * This is required by Evolution API v2.3.7 because once an instance is already
 * in `connecting`, /instance/connect returns the existing QR object and ignores
 * a newly supplied number.
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

    // 2. Fetch linked WhatsApp channel.
    // New sales members may not have a fortline_channels row yet, so
    // provision a QR-gateway channel automatically instead of failing.
    const { data: existingChannel, error: chErr } = await admin
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

    let channel = existingChannel;

    if (!channel) {
      const { data: createdChannel, error: createChannelErr } = await admin
        .from('fortline_channels')
        .insert({
          account_id: accountId,
          sales_member_id: salesMemberId,
          channel_type: 'qr_gateway',
          display_phone_number: salesMember.phone_number || null,
          connection_status: 'disconnected',
        })
        .select(
          'id, sales_member_id, gateway_instance_id, channel_type, connection_status, pairing_state',
        )
        .single();

      if (createChannelErr || !createdChannel) {
        console.error(
          '[EVOLUTION LINK START] Failed to auto-create WhatsApp channel:',
          createChannelErr,
        );

        // A concurrent request may have created it after our first lookup.
        const { data: racedChannel } = await admin
          .from('fortline_channels')
          .select(
            'id, sales_member_id, gateway_instance_id, channel_type, connection_status, pairing_state',
          )
          .eq('sales_member_id', salesMemberId)
          .eq('account_id', accountId)
          .maybeSingle();

        if (!racedChannel) {
          return NextResponse.json(
            {
              error:
                createChannelErr?.message ||
                'Failed to create WhatsApp channel for this sales member',
            },
            { status: 500 },
          );
        }

        channel = racedChannel;
      } else {
        channel = createdChannel;

        // Keep the optional convenience pointer on the sales member in sync.
        // This update is non-fatal because the channel relation above is the
        // source of truth used by the WhatsApp link flow.
        const { error: memberChannelUpdateErr } = await admin
          .from('fortline_sales_members')
          .update({
            channel_id: createdChannel.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', salesMemberId)
          .eq('account_id', accountId);

        if (memberChannelUpdateErr) {
          console.warn(
            '[EVOLUTION LINK START] Non-fatal: could not update sales member channel_id:',
            memberChannelUpdateErr,
          );
        }
      }
    }

    if (channel.channel_type !== 'qr_gateway') {
      return NextResponse.json(
        { error: 'Channel is not configured for QR gateway' },
        { status: 400 },
      );
    }

    // 3. Stable instance name
    const instanceName =
      channel.gateway_instance_id &&
        channel.gateway_instance_id.trim()
        ? channel.gateway_instance_id.trim()
        : `fortline_rep_${channel.id.replace(/[^a-zA-Z0-9]/g, '_')}`;

    // 4. Normalize phone BEFORE creating the Evolution instance.
    let phoneParam: string | undefined;

    if (mode === 'pairing') {
      const rawPhone =
        typeof body.phone === 'string' && body.phone.trim()
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

      if (!normalizedPhone || normalizedPhone.length < 8) {
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

    // 5. Pairing mode needs a fresh non-connected instance.
    //
    // Evolution v2.3.7 returns the current QR unchanged when the state is
    // already `connecting`; it does NOT apply a new number at that point.
    if (mode === 'pairing') {
      const currentState =
        await getEvolutionConnectionState(instanceName);

      if (
        currentState.success &&
        currentState.state === 'open'
      ) {
        return NextResponse.json(
          {
            error:
              'This WhatsApp line is already connected. Disconnect it before generating a new pairing code.',
          },
          { status: 409 },
        );
      }

      if (currentState.success) {
        const deleteResult =
          await deleteEvolutionInstance(instanceName);

        if (
          !deleteResult.success &&
          deleteResult.statusCode !== 404
        ) {
          console.error(
            '[EVOLUTION LINK START] Failed to reset existing Evolution instance:',
            deleteResult.error,
          );

          return NextResponse.json(
            {
              error:
                deleteResult.error ||
                'Failed to reset the existing Evolution pairing session',
            },
            { status: 502 },
          );
        }
      }
    }

    // 6. Create instance.
    // IMPORTANT: pairing mode passes `number` in the CREATE request so Baileys
    // has phoneNumber set before the first QR event is generated.
    let createRes =
      await createEvolutionInstance(
        instanceName,
        mode === 'pairing' ? phoneParam : undefined,
      );

    // If an old instance still existed but connectionState could not read it,
    // reset it once and retry pairing creation.
    if (
      mode === 'pairing' &&
      createRes.alreadyExists
    ) {
      const deleteResult =
        await deleteEvolutionInstance(instanceName);

      if (!deleteResult.success) {
        return NextResponse.json(
          {
            error:
              deleteResult.error ||
              'Failed to reset the old Evolution instance',
          },
          { status: 502 },
        );
      }

      createRes =
        await createEvolutionInstance(
          instanceName,
          phoneParam,
        );
    }

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

    // 7. Register CRM webhook
    const webhookRes =
      await setEvolutionWebhook(instanceName);

    if (!webhookRes.success) {
      console.warn(
        '[EVOLUTION LINK START] Non-fatal webhook registration error:',
        instanceName,
        webhookRes.error,
      );
    }

    // 8. Read current connection data.
    // For a newly-created pairing instance, this should now include pairingCode.
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

    const createData =
      (createRes.data || {}) as Record<string, unknown>;

    const connectData =
      (connectRes.data || {}) as Record<string, unknown>;

    const pairingCode =
      mode === 'pairing'
        ? extractPairingCode(createData, connectData)
        : null;

    if (
      mode === 'pairing' &&
      !pairingCode
    ) {
      console.error(
        '[EVOLUTION LINK START] Evolution did not generate a pairing code',
        {
          instanceName,
          phoneProvided: Boolean(phoneParam),
          createKeys: Object.keys(createData),
          connectKeys: Object.keys(connectData),
        },
      );

      return NextResponse.json(
        {
          error:
            'Evolution did not generate a phone pairing code. Please generate a fresh code again.',
        },
        { status: 502 },
      );
    }

    // 9. Update fortline_channels with connecting state
    let updatePayload: Record<string, unknown> = {
      gateway_instance_id: instanceName,
      connection_status: 'connecting',
      pairing_state:
        mode === 'qr' ? 'qrcode' : 'pairing',
      webhook_status: 'active',
      updated_at: new Date().toISOString(),
    };

    const { error: updateErr } = await admin
      .from('fortline_channels')
      .update(updatePayload)
      .eq('id', channel.id);

    if (
      updateErr &&
      updateErr.code === '23514'
    ) {
      updatePayload = {
        gateway_instance_id: instanceName,
        connection_status: 'disconnected',
        pairing_state:
          mode === 'qr' ? 'qrcode' : 'connecting',
        webhook_status: 'active',
        updated_at: new Date().toISOString(),
      };

      const fallback = await admin
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

    // 10. Return safe connection data only
    return NextResponse.json(
      {
        ok: true,
        instance: instanceName,
        mode,
        qr: mode === 'qr' ? connectData : null,
        pairingCode,
      },
      { status: 200 },
    );
  } catch (err) {
    return toErrorResponse(err);
  }
}
