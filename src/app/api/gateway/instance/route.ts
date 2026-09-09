import { NextResponse } from 'next/server';
import { requireCeo, toErrorResponse } from '@/lib/auth/fortline-auth';
import { getGatewayConfig } from '@/lib/gateway/config';

// Resilient fetch helper: tries primary gateway URL, with auto-fallback to localhost:8080 if remote fails
async function gatewayFetch(
  primaryUrl: string,
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const cleanPrimary = (primaryUrl || 'http://127.0.0.1:8080').replace(/\/$/, '');
  const urlsToTry = [cleanPrimary];

  if (!cleanPrimary.includes('127.0.0.1') && !cleanPrimary.includes('localhost')) {
    urlsToTry.push('http://127.0.0.1:8080');
    urlsToTry.push('http://localhost:8080');
  }

  let lastError: any = null;
  for (const baseUrl of urlsToTry) {
    try {
      const res = await fetch(`${baseUrl}${path}`, {
        ...options,
        signal: AbortSignal.timeout(6000),
      });
      return res;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error(`Failed to reach gateway at ${urlsToTry.join(', ')}`);
}

function normalizePhoneNumber(raw: string): string {
  if (!raw) return '';
  let clean = raw.replace(/[^0-9]/g, '');
  if (clean.startsWith('00')) clean = clean.slice(2);
  // Convert 03XXXXXXXXX (11 digits) to 923XXXXXXXXX
  if (clean.startsWith('0') && clean.length === 11) {
    clean = '92' + clean.slice(1);
  }
  return clean;
}

export async function GET(request: Request) {
  try {
    const ctx = await requireCeo();
    const { searchParams } = new URL(request.url);
    const salesMemberId = searchParams.get('salesMemberId');
    const channelId = searchParams.get('channelId');

    if (!salesMemberId && !channelId) {
      return NextResponse.json({ error: 'salesMemberId or channelId is required' }, { status: 400 });
    }

    let query = ctx.supabase
      .from('fortline_channels')
      .select('*, sales_member:fortline_sales_members(*)');

    if (channelId) query = query.eq('id', channelId);
    if (salesMemberId) query = query.eq('sales_member_id', salesMemberId);

    let { data: channel } = await query.maybeSingle();

    if (!channel && salesMemberId) {
      const { data: sm } = await ctx.supabase
        .from('fortline_sales_members')
        .select('*')
        .eq('id', salesMemberId)
        .maybeSingle();

      if (sm) {
        const phoneClean = normalizePhoneNumber(sm.phone_number || '');
        const instanceName = `fortline_rep_${sm.id.replace(/-/g, '_').slice(0, 16)}`;
        const phoneId = sm.channel_id || `channel_${phoneClean || sm.id.slice(0, 8)}`;

        const { data: newCh } = await ctx.supabase
          .from('fortline_channels')
          .insert({
            account_id: ctx.accountId,
            sales_member_id: sm.id,
            phone_number_id: phoneId,
            display_phone_number: sm.phone_number || phoneClean,
            channel_name: `${sm.name} (${sm.phone_number || phoneClean})`,
            channel_type: 'qr_gateway',
            gateway_instance_id: instanceName,
            connection_status: 'disconnected',
            pairing_state: 'disconnected',
            webhook_status: 'pending',
          })
          .select('*, sales_member:fortline_sales_members(*)')
          .single();

        channel = newCh;
      }
    }

    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    const instanceName = channel.gateway_instance_id || `fortline_rep_${channel.id.slice(0, 8)}`;
    const gatewayConfig = await getGatewayConfig(ctx.supabase, ctx.accountId);

    // Attempt to query Evolution API for fresh state
    let liveState = channel.pairing_state || 'disconnected';
    let qrcodeBase64 = channel.qr_code_raw || null;
    let pairingCode: string | null = null;
    let isGatewayReachable = false;

    try {
      const stateRes = await gatewayFetch(
        gatewayConfig.gateway_url,
        `/instance/connectionState/${instanceName}`,
        {
          headers: { apikey: gatewayConfig.api_key },
          cache: 'no-store',
        }
      );

      if (stateRes.ok || stateRes.status === 404) {
        isGatewayReachable = true;
        if (stateRes.ok) {
          const stateData = await stateRes.json();
          const rawState = stateData?.instance?.state;
          if (rawState === 'open') {
            liveState = 'connected';
            qrcodeBase64 = null;
            pairingCode = null;
          } else if (rawState === 'connecting') {
            liveState = 'connecting';
          } else {
            liveState = 'disconnected';
          }
        }
      }
    } catch {
      // Gateway container not running or network error
    }

    // If disconnected or in setup mode, check if we can fetch fresh connect state (QR or pairing code)
    if (isGatewayReachable && liveState !== 'connected') {
      try {
        const cleanPhone = normalizePhoneNumber(
          channel.display_phone_number || channel.sales_member?.phone_number || ''
        );
        const connectUrl = cleanPhone
          ? `/instance/connect/${instanceName}?number=${cleanPhone}`
          : `/instance/connect/${instanceName}`;

        const connectRes = await gatewayFetch(gatewayConfig.gateway_url, connectUrl, {
          headers: { apikey: gatewayConfig.api_key },
          cache: 'no-store',
        });

        if (connectRes.ok) {
          const connectData = await connectRes.json();
          const b64 = connectData?.qrcode?.base64 || connectData?.base64;
          const code =
            connectData?.pairingCode ||
            connectData?.code ||
            connectData?.count?.pairingCode ||
            connectData?.qrcode?.pairingCode ||
            null;

          if (b64) {
            qrcodeBase64 = b64;
            liveState = 'qrcode';
          }
          if (code && typeof code === 'string' && code.length >= 6) {
            pairingCode = code;
            liveState = 'pairing_code';
          }
        }
      } catch {
        // Fallback to DB
      }
    }

    return NextResponse.json({
      channelId: channel.id,
      salesMemberId: channel.sales_member_id,
      salesMemberName: channel.sales_member?.name || 'Sales Representative',
      phoneNumber: channel.display_phone_number || channel.sales_member?.phone_number,
      instanceName,
      pairingState: liveState,
      qrcode: qrcodeBase64,
      pairingCode,
      isGatewayReachable,
      gatewayUrl: gatewayConfig.gateway_url,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireCeo();
    const body = await request.json();
    const { salesMemberId, channelId, method = 'qrcode', phoneNumber } = body;

    if (!salesMemberId && !channelId) {
      return NextResponse.json({ error: 'salesMemberId or channelId is required' }, { status: 400 });
    }

    let query = ctx.supabase
      .from('fortline_channels')
      .select('*, sales_member:fortline_sales_members(*)');

    if (channelId) query = query.eq('id', channelId);
    if (salesMemberId) query = query.eq('sales_member_id', salesMemberId);

    let { data: channel } = await query.maybeSingle();

    if (!channel && salesMemberId) {
      const { data: sm } = await ctx.supabase
        .from('fortline_sales_members')
        .select('*')
        .eq('id', salesMemberId)
        .maybeSingle();

      if (sm) {
        const phoneClean = normalizePhoneNumber(sm.phone_number || '');
        const instanceName = `fortline_rep_${sm.id.replace(/-/g, '_').slice(0, 16)}`;
        const phoneId = sm.channel_id || `channel_${phoneClean || sm.id.slice(0, 8)}`;

        const { data: newCh } = await ctx.supabase
          .from('fortline_channels')
          .insert({
            account_id: ctx.accountId,
            sales_member_id: sm.id,
            phone_number_id: phoneId,
            display_phone_number: sm.phone_number || phoneClean,
            channel_name: `${sm.name} (${sm.phone_number || phoneClean})`,
            channel_type: 'qr_gateway',
            gateway_instance_id: instanceName,
            connection_status: 'disconnected',
            pairing_state: 'disconnected',
            webhook_status: 'pending',
          })
          .select('*, sales_member:fortline_sales_members(*)')
          .single();

        channel = newCh;
      }
    }

    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    const instanceName = channel.gateway_instance_id || `fortline_rep_${channel.id.slice(0, 8)}`;
    const gatewayConfig = await getGatewayConfig(ctx.supabase, ctx.accountId);
    const host = request.headers.get('host') || 'localhost:3000';
    const proto = host.includes('localhost') ? 'http' : 'https';
    const webhookUrl = `${proto}://${host}/api/gateway/webhook`;

    // ------------------------------------------------------------
    // Flow A: Pairing with Phone Number (8-Digit Code / OTP)
    // ------------------------------------------------------------
    if (method === 'pairing_code') {
      const targetPhone = (
        phoneNumber ||
        channel.display_phone_number ||
        channel.sales_member?.phone_number ||
        ''
      ).trim();
      const cleanPhone = normalizePhoneNumber(targetPhone);

      if (!cleanPhone || cleanPhone.length < 8) {
        return NextResponse.json(
          {
            error:
              'Please provide a valid phone number (e.g. +92 300 1234567 or 03001234567) to generate a pairing code.',
          },
          { status: 400 }
        );
      }

      // 1. Create or ensure instance in Evolution API with qrcode: false & number: cleanPhone
      try {
        await gatewayFetch(gatewayConfig.gateway_url, '/instance/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: gatewayConfig.api_key,
          },
          body: JSON.stringify({
            instanceName,
            token: gatewayConfig.api_key,
            qrcode: false,
            number: cleanPhone,
            integration: 'WHATSAPP-BAILEYS',
            webhook: webhookUrl,
            webhook_by_events: true,
            events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE', 'QRCODE_UPDATED'],
          }),
        });
      } catch {
        // Instance might already exist
      }

      // 2. Poll for pairing code from /instance/connect/:instanceName?number=...
      let pairingCode: string | null = null;
      for (let attempt = 0; attempt < 5; attempt++) {
        if (attempt > 0) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
        try {
          const connectRes = await gatewayFetch(
            gatewayConfig.gateway_url,
            `/instance/connect/${instanceName}?number=${cleanPhone}`,
            {
              headers: { apikey: gatewayConfig.api_key },
              cache: 'no-store',
            }
          );
          if (connectRes.ok) {
            const connectData = await connectRes.json();
            pairingCode =
              connectData?.pairingCode ||
              connectData?.code ||
              connectData?.count?.pairingCode ||
              connectData?.qrcode?.pairingCode ||
              null;
            if (pairingCode && typeof pairingCode === 'string' && pairingCode.length >= 6) {
              break;
            }
          }
        } catch (err: any) {
          console.warn('[gateway-instance] Connect with phone error:', err.message);
        }
      }

      // Save phone number & pairing state in DB
      await ctx.supabase
        .from('fortline_channels')
        .update({
          channel_type: 'qr_gateway',
          gateway_instance_id: instanceName,
          display_phone_number: targetPhone,
          pairing_state: pairingCode ? 'pairing_code' : 'connecting',
          qr_code_raw: null,
          last_qr_generated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', channel.id);

      return NextResponse.json({
        ok: true,
        method: 'pairing_code',
        instanceName,
        pairingCode,
        phoneNumber: cleanPhone,
        pairingState: pairingCode ? 'pairing_code' : 'connecting',
        webhookUrl,
        gatewayUrl: gatewayConfig.gateway_url,
      });
    }

    // ------------------------------------------------------------
    // Flow B: Scan QR Code (Default)
    // ------------------------------------------------------------
    let qrcodeBase64: string | null = null;
    let pairingState = 'qrcode';

    try {
      const createRes = await gatewayFetch(gatewayConfig.gateway_url, '/instance/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: gatewayConfig.api_key,
        },
        body: JSON.stringify({
          instanceName,
          token: gatewayConfig.api_key,
          qrcode: true,
          integration: 'WHATSAPP-BAILEYS',
          webhook: webhookUrl,
          webhook_by_events: true,
          events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE', 'QRCODE_UPDATED'],
        }),
      });

      const createData = await createRes.json();
      const b64 = createData?.qrcode?.base64 || createData?.base64;
      if (b64) {
        qrcodeBase64 = b64;
      }
    } catch {
      // Instance might already exist, try connect
    }

    if (!qrcodeBase64) {
      for (let attempt = 0; attempt < 4; attempt++) {
        if (attempt > 0) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
        try {
          const connectRes = await gatewayFetch(
            gatewayConfig.gateway_url,
            `/instance/connect/${instanceName}`,
            {
              headers: { apikey: gatewayConfig.api_key },
              cache: 'no-store',
            }
          );
          if (connectRes.ok) {
            const connectData = await connectRes.json();
            const b64 = connectData?.qrcode?.base64 || connectData?.base64;
            if (b64) {
              qrcodeBase64 = b64;
              break;
            }
          }
        } catch (err: any) {
          console.warn('[gateway-instance] Gateway container unreachable:', err.message);
          break;
        }
      }
    }

    // Save in DB
    await ctx.supabase
      .from('fortline_channels')
      .update({
        channel_type: 'qr_gateway',
        gateway_instance_id: instanceName,
        pairing_state: qrcodeBase64 ? 'qrcode' : 'connecting',
        qr_code_raw: qrcodeBase64,
        last_qr_generated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', channel.id);

    return NextResponse.json({
      ok: true,
      method: 'qrcode',
      instanceName,
      qrcode: qrcodeBase64,
      pairingState,
      webhookUrl,
      gatewayUrl: gatewayConfig.gateway_url,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function DELETE(request: Request) {
  try {
    const ctx = await requireCeo();
    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get('channelId');
    const salesMemberId = searchParams.get('salesMemberId');

    let query = ctx.supabase
      .from('fortline_channels')
      .select('*');

    if (channelId) query = query.eq('id', channelId);
    if (salesMemberId) query = query.eq('sales_member_id', salesMemberId);

    const { data: channel } = await query.maybeSingle();
    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    const instanceName = channel.gateway_instance_id;
    const gatewayConfig = await getGatewayConfig(ctx.supabase, ctx.accountId);

    if (instanceName) {
      try {
        await gatewayFetch(gatewayConfig.gateway_url, `/instance/logout/${instanceName}`, {
          method: 'DELETE',
          headers: { apikey: gatewayConfig.api_key },
        });
      } catch {
        // Ignore container network error
      }
    }

    await ctx.supabase
      .from('fortline_channels')
      .update({
        pairing_state: 'disconnected',
        connection_status: 'disconnected',
        qr_code_raw: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', channel.id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}

