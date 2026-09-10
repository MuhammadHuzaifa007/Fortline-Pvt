import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getGatewayConfig, gatewayFetch } from '@/lib/gateway/config';

function extractMessageDetails(msgObj: any): { text: string; mediaType: 'text' | 'image' | 'audio' | 'video' | 'document'; hasMedia: boolean } {
  if (!msgObj) return { text: '', mediaType: 'text', hasMedia: false };
  const m = msgObj.message || msgObj;
  if (m.conversation) return { text: m.conversation, mediaType: 'text', hasMedia: false };
  if (m.extendedTextMessage?.text) return { text: m.extendedTextMessage.text, mediaType: 'text', hasMedia: false };
  if (m.imageMessage) return { text: m.imageMessage.caption || '[Image]', mediaType: 'image', hasMedia: true };
  if (m.audioMessage) return { text: '[Voice Note]', mediaType: 'audio', hasMedia: true };
  if (m.videoMessage) return { text: m.videoMessage.caption || '[Video]', mediaType: 'video', hasMedia: true };
  if (m.documentMessage) return { text: m.documentMessage.fileName ? `[Document: ${m.documentMessage.fileName}]` : '[Document]', mediaType: 'document', hasMedia: true };
  if (m.buttonsResponseMessage?.selectedDisplayText) return { text: m.buttonsResponseMessage.selectedDisplayText, mediaType: 'text', hasMedia: false };
  if (m.listResponseMessage?.title) return { text: m.listResponseMessage.title, mediaType: 'text', hasMedia: false };
  return { text: '', mediaType: 'text', hasMedia: false };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { conversationId } = body;

    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId is required' }, { status: 400 });
    }

    const admin = supabaseAdmin();

    // 1. Resolve conversation and contact
    const { data: conv, error: convErr } = await admin
      .from('conversations')
      .select('*, contact:contacts(*)')
      .eq('id', conversationId)
      .single();

    if (convErr || !conv) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const accountId = conv.account_id;
    const gatewayConfig = await getGatewayConfig(admin, accountId);

    // 2. Resolve instance
    let instanceName: string | null = null;
    if (conv.channel_phone_number_id) {
      const { data: ch } = await admin
        .from('fortline_channels')
        .select('gateway_instance_id')
        .eq('phone_number_id', conv.channel_phone_number_id)
        .maybeSingle();
      if (ch?.gateway_instance_id) instanceName = ch.gateway_instance_id;
    }

    if (!instanceName && conv.assigned_sales_member_id) {
      const { data: ch } = await admin
        .from('fortline_channels')
        .select('gateway_instance_id')
        .eq('sales_member_id', conv.assigned_sales_member_id)
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
      return NextResponse.json({ error: 'No active WhatsApp gateway instance found' }, { status: 404 });
    }

    // 3. Resolve target remoteJid for WhatsApp
    const phone = conv.contact?.phone || '';
    let remoteJid = '';

    if (phone.includes('@g.us') || phone.includes('@s.whatsapp.net')) {
      remoteJid = phone;
    } else if (phone.startsWith('+120363') || phone.startsWith('120363')) {
      remoteJid = `${phone.replace(/^\+/, '')}@g.us`;
    } else {
      remoteJid = `${phone.replace(/^\+/, '')}@s.whatsapp.net`;
    }

    // 4. Fetch historical messages from Evolution API
    let evoRecords: any[] = [];
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
                remoteJid,
              },
            },
            take: 100,
          }),
        }
      );

      if (findRes.ok) {
        const findData = await findRes.json();
        evoRecords = findData?.messages?.records || (Array.isArray(findData) ? findData : []);
      } else {
        const errTxt = await findRes.text();
        console.warn('[sync-chat] Failed to fetch messages:', findRes.status, errTxt.slice(0, 100));
      }
    } catch (err: any) {
      console.warn('[sync-chat] Exception fetching messages:', err.message);
    }

    // 5. Insert missing messages into Supabase
    let syncedCount = 0;
    for (const rec of evoRecords) {
      const msgId = rec.key?.id;
      if (!msgId) continue;

      // Check if already in Supabase
      const { data: existing } = await admin
        .from('messages')
        .select('id')
        .eq('message_id', msgId)
        .maybeSingle();

      if (existing) continue;

      const extract = extractMessageDetails(rec);
      if (!extract.text && !extract.hasMedia) continue;

      const isFromMe = Boolean(rec.key?.fromMe);

      let msgTime = new Date().toISOString();
      if (rec.messageTimestamp) {
        const ts = typeof rec.messageTimestamp === 'string' ? parseInt(rec.messageTimestamp, 10) : rec.messageTimestamp;
        if (ts) {
          const ms = ts < 1e11 ? ts * 1000 : ts;
          msgTime = new Date(ms).toISOString();
        }
      }

      const mediaUrl = extract.hasMedia ? `/api/gateway/media/${msgId}` : null;

      const isGroup = remoteJid.includes('@g.us');
      const participantPhone = isGroup && rec.key?.participantAlt
        ? `+${rec.key.participantAlt.replace(/@.*$/, '')}`
        : isGroup && rec.key?.participant
        ? `+${rec.key.participant.replace(/@.*$/, '')}`
        : undefined;

      const { error: insErr } = await admin.from('messages').insert({
        conversation_id: conversationId,
        sender_type: isFromMe ? 'user' : 'contact',
        content: extract.text,
        media_type: extract.mediaType,
        media_url: mediaUrl,
        message_id: msgId,
        status: 'delivered',
        created_at: msgTime,
        channel_phone_number_id: conv.channel_phone_number_id || null,
        sales_member_id: conv.assigned_sales_member_id || null,
        metadata: isGroup ? {
          participant_phone: participantPhone,
          participant_name: rec.pushName || undefined,
        } : undefined,
      });

      if (!insErr) {
        syncedCount++;
      }
    }

    // 6. Ensure conversation has proper chat_type
    const isGroupChat = remoteJid.includes('@g.us');
    await admin
      .from('conversations')
      .update({
        chat_type: isGroupChat ? 'group' : 'direct',
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationId);

    return NextResponse.json({
      ok: true,
      syncedCount,
      totalFound: evoRecords.length,
    });
  } catch (err: any) {
    console.error('[sync-chat] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
