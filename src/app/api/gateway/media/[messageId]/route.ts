import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getGatewayConfig, gatewayFetch } from '@/lib/gateway/config';

function getThumbnailBuffer(msg: any): { buffer: Buffer; mime: string } | null {
  const rawMsg = msg.metadata?.rawMessage || msg.metadata?.message;
  const thumb = rawMsg?.imageMessage?.jpegThumbnail || rawMsg?.videoMessage?.jpegThumbnail;
  if (!thumb) return null;
  try {
    if (typeof thumb === 'string') {
      const b64 = thumb.startsWith('data:') ? thumb.split(',')[1] : thumb;
      return { buffer: Buffer.from(b64, 'base64'), mime: 'image/jpeg' };
    }
    let values: number[] | null = null;
    if (Array.isArray(thumb)) {
      values = thumb;
    } else if (thumb && typeof thumb === 'object') {
      if (Array.isArray((thumb as any).data)) {
        values = (thumb as any).data;
      } else {
        values = Object.values(thumb) as number[];
      }
    }
    if (values && values.length > 0) {
      return { buffer: Buffer.from(values), mime: 'image/jpeg' };
    }
  } catch {
    return null;
  }
  return null;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ messageId: string }> | { messageId: string } }
) {
  let loadedMsg: any = null;
  try {
    const resolvedParams = await Promise.resolve(context.params);
    const { messageId } = resolvedParams;

    if (!messageId) {
      return NextResponse.json({ error: 'Message ID is required' }, { status: 400 });
    }

    const admin = supabaseAdmin();

    // 1. Locate message in DB by UUID or WhatsApp message_id
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(messageId);
    let msgQuery = admin.from('messages').select('*, conversation:conversations(*)');

    if (isUuid) {
      msgQuery = msgQuery.or(`id.eq.${messageId},message_id.eq.${messageId}`);
    } else {
      msgQuery = msgQuery.eq('message_id', messageId);
    }

    const { data: msg, error: msgErr } = await msgQuery.maybeSingle();

    if (msgErr || !msg) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }
    loadedMsg = msg;

    // 2. If already a base64 data URL, parse and serve directly
    if (msg.media_url && msg.media_url.startsWith('data:')) {
      const match = msg.media_url.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        const mime = match[1];
        const buffer = Buffer.from(match[2], 'base64');
        return serveMediaBuffer(buffer, mime, request);
      }
    }

    // 3. Resolve gateway instance
    const accountId = msg.conversation?.account_id || null;
    const gatewayConfig = await getGatewayConfig(admin, accountId);

    let instanceName: string | null = null;

    if (msg.channel_phone_number_id) {
      const { data: ch } = await admin
        .from('fortline_channels')
        .select('gateway_instance_id')
        .eq('phone_number_id', msg.channel_phone_number_id)
        .maybeSingle();
      if (ch?.gateway_instance_id) instanceName = ch.gateway_instance_id;
    }

    if (!instanceName && msg.sales_member_id) {
      const { data: ch } = await admin
        .from('fortline_channels')
        .select('gateway_instance_id')
        .eq('sales_member_id', msg.sales_member_id)
        .maybeSingle();
      if (ch?.gateway_instance_id) instanceName = ch.gateway_instance_id;
    }

    if (!instanceName) {
      const { data: chList } = await admin
        .from('fortline_channels')
        .select('gateway_instance_id, connection_status')
        .not('gateway_instance_id', 'is', null)
        .order('connection_status', { ascending: false })
        .limit(1);

      if (chList && chList.length > 0) {
        instanceName = chList[0].gateway_instance_id;
      }
    }

    if (!instanceName) {
      const fallback = getThumbnailBuffer(msg);
      if (fallback) {
        return serveMediaBuffer(fallback.buffer, fallback.mime, request);
      }
      return NextResponse.json({ error: 'No active WhatsApp gateway instance found' }, { status: 404 });
    }

    // 4. Fetch full message record from Evolution API
    const waMessageId = msg.message_id || messageId;
    let messageRecord: any = null;

    try {
      const findRes = await gatewayFetch(
        gatewayConfig.gateway_url,
        `/chat/findMessages/${instanceName}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: gatewayConfig.api_key,
          },
          body: JSON.stringify({
            where: {
              key: {
                id: waMessageId,
              },
            },
          }),
        }
      );

      if (findRes.ok) {
        const findData = await findRes.json();
        const records = findData?.messages?.records || (Array.isArray(findData) ? findData : []);
        if (records.length > 0) {
          messageRecord = records[0];
        }
      }
    } catch (e: any) {
      console.warn('[gateway-media] Error finding message in Evolution API:', e.message);
    }

    // 5. Decrypt media via Evolution API
    const rawMsg = msg.metadata?.rawMessage || msg.metadata?.message;
    const mediaPayload = messageRecord
      ? { message: messageRecord, convertToMp4: false }
      : {
          message: {
            key: msg.metadata?.key || { id: waMessageId, fromMe: msg.metadata?.fromMe, remoteJid: msg.metadata?.remoteJid },
            message: rawMsg,
          },
          convertToMp4: false,
        };

    let evoRes: Response | null = null;
    try {
      evoRes = await gatewayFetch(
        gatewayConfig.gateway_url,
        `/chat/getBase64FromMediaMessage/${instanceName}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: gatewayConfig.api_key,
          },
          body: JSON.stringify(mediaPayload),
        }
      );
    } catch (e: any) {
      console.warn('[gateway-media] Network error contacting Evolution API:', e.message);
    }

    if (!evoRes || !evoRes.ok) {
      const errText = evoRes ? await evoRes.text().catch(() => '') : 'Unreachable';
      console.warn('[gateway-media] Evolution API media error:', evoRes?.status, errText);

      // Fall back to embedded WhatsApp JPEG thumbnail from message metadata
      const fallback = getThumbnailBuffer(msg);
      if (fallback) {
        return serveMediaBuffer(fallback.buffer, fallback.mime, request);
      }

      return NextResponse.json(
        { error: `Evolution API media decryption failed: ${errText.slice(0, 100)}` },
        { status: evoRes?.status || 502 }
      );
    }

    const evoData = await evoRes.json();
    const base64Str = evoData?.base64;

    if (!base64Str) {
      const fallback = getThumbnailBuffer(msg);
      if (fallback) {
        return serveMediaBuffer(fallback.buffer, fallback.mime, request);
      }
      return NextResponse.json({ error: 'No base64 media returned by gateway' }, { status: 404 });
    }

    const buffer = Buffer.from(base64Str, 'base64');
    let mime = evoData.mimetype;
    if (!mime) {
      if (msg.media_type === 'audio') mime = 'audio/ogg; codecs=opus';
      else if (msg.media_type === 'image') mime = 'image/jpeg';
      else if (msg.media_type === 'video') mime = 'video/mp4';
      else if (msg.media_type === 'document') mime = 'application/pdf';
      else mime = 'application/octet-stream';
    }

    return serveMediaBuffer(buffer, mime, request);
  } catch (err: any) {
    console.error('[gateway-media] Exception:', err);
    if (loadedMsg) {
      const fallback = getThumbnailBuffer(loadedMsg);
      if (fallback) {
        return serveMediaBuffer(fallback.buffer, fallback.mime, request);
      }
    }
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

function serveMediaBuffer(buffer: Buffer, mime: string, request: Request): Response {
  // Support Range requests so <video> and <audio> elements can seek.
  const rangeHeader = request.headers.get('range');
  if (rangeHeader) {
    const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
    if (match) {
      const start = parseInt(match[1], 10);
      const end = match[2] ? parseInt(match[2], 10) : buffer.length - 1;
      const clampedEnd = Math.min(end, buffer.length - 1);
      const chunk = buffer.subarray(start, clampedEnd + 1);

      return new Response(new Uint8Array(chunk), {
        status: 206,
        headers: {
          'Content-Type': mime,
          'Content-Length': chunk.length.toString(),
          'Content-Range': `bytes ${start}-${clampedEnd}/${buffer.length}`,
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
          'Content-Disposition': 'inline',
        },
      });
    }
  }

  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': mime,
      'Content-Length': buffer.length.toString(),
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      'Accept-Ranges': 'bytes',
      'Content-Disposition': 'inline',
    },
  });
}
