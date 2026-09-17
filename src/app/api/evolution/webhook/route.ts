import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      service: 'Fortline Evolution Webhook',
    },
    { status: 200 }
  );
}

function extractDataRecord(payload: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!payload || typeof payload !== 'object') return null;
  const rawData = payload.data;
  if (Array.isArray(rawData)) {
    return (rawData[0] as Record<string, unknown>) || null;
  }
  if (rawData && typeof rawData === 'object') {
    const dataObj = rawData as Record<string, unknown>;
    if (Array.isArray(dataObj.messages) && dataObj.messages.length > 0) {
      return (dataObj.messages[0] as Record<string, unknown>) || null;
    }
    return dataObj;
  }
  return null;
}

function extractMessageContent(msg: Record<string, unknown> | undefined): {
  content: string;
  mediaType: string;
  mediaUrl: string | null;
  mediaMimeType: string | null;
} {
  if (!msg || typeof msg !== 'object') {
    return {
      content: '[Unsupported message]',
      mediaType: 'text',
      mediaUrl: null,
      mediaMimeType: null,
    };
  }

  // 1. Direct text conversation
  if (typeof msg.conversation === 'string' && msg.conversation.trim()) {
    return {
      content: msg.conversation,
      mediaType: 'text',
      mediaUrl: null,
      mediaMimeType: null,
    };
  }

  // 2. Extended text message
  const extended = msg.extendedTextMessage as Record<string, unknown> | undefined;
  if (typeof extended?.text === 'string' && extended.text.trim()) {
    return {
      content: extended.text,
      mediaType: 'text',
      mediaUrl: null,
      mediaMimeType: null,
    };
  }

  // 3. Image message
  const image = msg.imageMessage as Record<string, unknown> | undefined;
  if (image) {
    return {
      content: typeof image.caption === 'string' && image.caption.trim() ? image.caption : '[Image]',
      mediaType: 'image',
      mediaUrl: typeof image.url === 'string' ? image.url : null,
      mediaMimeType: typeof image.mimetype === 'string' ? image.mimetype : 'image/jpeg',
    };
  }

  // 4. Video message
  const video = msg.videoMessage as Record<string, unknown> | undefined;
  if (video) {
    return {
      content: typeof video.caption === 'string' && video.caption.trim() ? video.caption : '[Video]',
      mediaType: 'video',
      mediaUrl: typeof video.url === 'string' ? video.url : null,
      mediaMimeType: typeof video.mimetype === 'string' ? video.mimetype : 'video/mp4',
    };
  }

  // 5. Audio message / voice note
  const audio = msg.audioMessage as Record<string, unknown> | undefined;
  if (audio) {
    return {
      content: '[Audio]',
      mediaType: 'audio',
      mediaUrl: typeof audio.url === 'string' ? audio.url : null,
      mediaMimeType: typeof audio.mimetype === 'string' ? audio.mimetype : 'audio/ogg',
    };
  }

  // 6. Document message
  const doc = msg.documentMessage as Record<string, unknown> | undefined;
  if (doc) {
    const fileName = typeof doc.fileName === 'string' ? doc.fileName : '';
    return {
      content: fileName ? `[Document: ${fileName}]` : '[Document]',
      mediaType: 'document',
      mediaUrl: typeof doc.url === 'string' ? doc.url : null,
      mediaMimeType: typeof doc.mimetype === 'string' ? doc.mimetype : 'application/pdf',
    };
  }

  // 7. Sticker message
  const sticker = msg.stickerMessage as Record<string, unknown> | undefined;
  if (sticker) {
    return {
      content: '[Sticker]',
      mediaType: 'image',
      mediaUrl: typeof sticker.url === 'string' ? sticker.url : null,
      mediaMimeType: typeof sticker.mimetype === 'string' ? sticker.mimetype : 'image/webp',
    };
  }

  // Fallback
  return {
    content: '[Unsupported message]',
    mediaType: 'text',
    mediaUrl: null,
    mediaMimeType: null,
  };
}

function extractTimestamp(dataItem: Record<string, unknown> | null): string {
  if (!dataItem) return new Date().toISOString();
  const rawTs = dataItem.messageTimestamp;
  if (typeof rawTs === 'number' && rawTs > 0) {
    const ms = rawTs < 1e11 ? rawTs * 1000 : rawTs;
    return new Date(ms).toISOString();
  }
  if (typeof rawTs === 'string') {
    const parsed = parseInt(rawTs, 10);
    if (!isNaN(parsed) && parsed > 0) {
      const ms = parsed < 1e11 ? parsed * 1000 : parsed;
      return new Date(ms).toISOString();
    }
  }
  return new Date().toISOString();
}

export async function POST(request: NextRequest) {
  let payload: Record<string, unknown> | null = null;

  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch (err) {
    console.warn('[Evolution Webhook] Failed to parse JSON payload:', err);
    return NextResponse.json({ ok: true, ignored: true }, { status: 200 });
  }

  const rawEvent = typeof payload?.event === 'string' ? payload.event : '';
  const normalizedEvent = rawEvent.toLowerCase().replace(/_/g, '.');

  // 1. Process only message events (messages.upsert / MESSAGES_UPSERT)
  if (normalizedEvent !== 'messages.upsert') {
    return NextResponse.json(
      { ok: true, ignored: true, reason: 'unhandled_event' },
      { status: 200 }
    );
  }

  const instance = typeof payload?.instance === 'string' ? payload.instance.trim() : '';
  if (!instance) {
    console.warn('[EVOLUTION WEBHOOK] Missing instance in payload');
    return NextResponse.json(
      { ok: true, ignored: true, reason: 'missing_instance' },
      { status: 200 }
    );
  }

  const admin = supabaseAdmin();

  // 2. Find fortline_channels using gateway_instance_id = payload.instance
  const { data: channel, error: chErr } = await admin
    .from('fortline_channels')
    .select('id, account_id, sales_member_id, phone_number_id')
    .eq('gateway_instance_id', instance)
    .maybeSingle();

  if (chErr) {
    console.error('[EVOLUTION WEBHOOK] Database error fetching channel for instance:', instance, chErr);
    return NextResponse.json(
      { ok: true, ignored: true, reason: 'channel_query_error' },
      { status: 200 }
    );
  }

  if (!channel) {
    console.warn('[EVOLUTION WEBHOOK] Unknown instance:', instance);
    return NextResponse.json(
      { ok: true, ignored: true, reason: 'unknown_instance' },
      { status: 200 }
    );
  }

  const dataRecord = extractDataRecord(payload);
  const key = dataRecord?.key as Record<string, unknown> | undefined;
  const remoteJid = typeof key?.remoteJid === 'string' ? key.remoteJid.trim() : '';

  // 3. Normalize remoteJid and filter unsupported/broadcast JIDs
  if (
    !remoteJid ||
    remoteJid.includes('status@broadcast') ||
    remoteJid.includes('@broadcast') ||
    remoteJid.includes('@g.us') ||
    remoteJid.includes('@newsletter')
  ) {
    console.log('[EVOLUTION WEBHOOK] Ignored JID:', remoteJid || '(empty)');
    return NextResponse.json(
      { ok: true, ignored: true, reason: 'ignored_jid' },
      { status: 200 }
    );
  }

  const normalizedPhone = remoteJid.split('@')[0].replace(/\D/g, '');
  if (!normalizedPhone) {
    console.warn('[EVOLUTION WEBHOOK] Unable to extract normalized phone from remoteJid:', remoteJid);
    return NextResponse.json(
      { ok: true, ignored: true, reason: 'invalid_phone' },
      { status: 200 }
    );
  }

  const messageId = typeof key?.id === 'string' ? key.id.trim() : '';
  if (!messageId) {
    console.warn('[EVOLUTION WEBHOOK] Missing message id in key');
    return NextResponse.json(
      { ok: true, ignored: true, reason: 'missing_message_id' },
      { status: 200 }
    );
  }

  // 8. Deduplicate using messages.message_id
  const { data: existingMsg, error: existingMsgErr } = await admin
    .from('messages')
    .select('id')
    .eq('message_id', messageId)
    .maybeSingle();

  if (existingMsgErr) {
    console.error('[EVOLUTION WEBHOOK] Error checking duplicate message:', existingMsgErr);
  }

  if (existingMsg) {
    console.log('[EVOLUTION WEBHOOK] Message already exists:', messageId);
    return NextResponse.json(
      { ok: true, skipped: 'already_saved' },
      { status: 200 }
    );
  }

  const fromMe = Boolean(key?.fromMe);
  const pushName = typeof dataRecord?.pushName === 'string' ? dataRecord.pushName.trim() : '';
  const rawMsg = dataRecord?.message as Record<string, unknown> | undefined;
  const { content, mediaType, mediaUrl, mediaMimeType } = extractMessageContent(rawMsg);
  const msgTimestamp = extractTimestamp(dataRecord);
  const messagePreview = content.slice(0, 100);

  // 4. Find contact by account_id and phone
  let contactId: string | null = null;
  const { data: existingContact, error: contactFindErr } = await admin
    .from('contacts')
    .select('id, name')
    .eq('account_id', channel.account_id)
    .eq('phone', normalizedPhone)
    .maybeSingle();

  if (contactFindErr) {
    console.error('[EVOLUTION WEBHOOK] Error finding contact:', contactFindErr);
  }

  if (existingContact) {
    contactId = existingContact.id;
    // If contact has no name or default phone name and pushName is provided, update it
    if (pushName && (!existingContact.name || existingContact.name === normalizedPhone)) {
      await admin
        .from('contacts')
        .update({ name: pushName })
        .eq('id', contactId);
    }
  } else {
    const newContactPayload = {
      account_id: channel.account_id,
      phone: normalizedPhone,
      name: pushName || normalizedPhone,
      assigned_sales_member_id: channel.sales_member_id || null,
      channel_id: payload.instance,
      contact_type: 'lead',
      metadata: {
        remoteJid,
        evolutionInstance: payload.instance,
        pushName: pushName || null,
      },
    };

    const { data: newContact, error: createContactErr } = await admin
      .from('contacts')
      .insert(newContactPayload)
      .select('id')
      .single();

    if (createContactErr || !newContact) {
      // In case of racing insert, attempt one fallback lookup
      const { data: raceContact } = await admin
        .from('contacts')
        .select('id')
        .eq('account_id', channel.account_id)
        .eq('phone', normalizedPhone)
        .maybeSingle();

      if (raceContact) {
        contactId = raceContact.id;
      } else {
        console.error('[EVOLUTION WEBHOOK] Failed to create contact:', createContactErr);
        return NextResponse.json(
          { ok: true, ignored: true, reason: 'contact_creation_failed' },
          { status: 200 }
        );
      }
    } else {
      contactId = newContact.id;
    }
  }

  // 5. Find conversation by account_id and contact_id
  let conversationId: string | null = null;
  let isNewConversation = false;

  const { data: existingConv, error: convFindErr } = await admin
    .from('conversations')
    .select('id, unread_count, assigned_sales_member_id, first_response_at, first_response_time_seconds, created_at')
    .eq('account_id', channel.account_id)
    .eq('contact_id', contactId)
    .maybeSingle();

  if (convFindErr) {
    console.error('[EVOLUTION WEBHOOK] Error finding conversation:', convFindErr);
  }

  if (existingConv) {
    conversationId = existingConv.id;
  } else {
    isNewConversation = true;
    const nowIso = new Date().toISOString();
    const newConvPayload = {
      account_id: channel.account_id,
      contact_id: contactId,
      sales_rep_id: channel.sales_member_id || null,
      assigned_sales_member_id: channel.sales_member_id || null,
      whatsapp_channel_id: channel.id || null,
      channel_phone_number_id: channel.phone_number_id || null,
      status: 'open',
      unread_count: fromMe ? 0 : 1,
      is_unanswered: !fromMe,
      last_message_at: msgTimestamp,
      last_message_preview: messagePreview,
      created_at: nowIso,
      updated_at: nowIso,
    };

    const { data: newConv, error: createConvErr } = await admin
      .from('conversations')
      .insert(newConvPayload)
      .select('id, unread_count, created_at, first_response_at')
      .single();

    if (createConvErr || !newConv) {
      // In case of concurrent conversation insert, fallback lookup
      const { data: raceConv } = await admin
        .from('conversations')
        .select('id, unread_count, assigned_sales_member_id, first_response_at, first_response_time_seconds, created_at')
        .eq('account_id', channel.account_id)
        .eq('contact_id', contactId)
        .maybeSingle();

      if (raceConv) {
        conversationId = raceConv.id;
      } else {
        console.error('[EVOLUTION WEBHOOK] Failed to create conversation:', createConvErr);
        return NextResponse.json(
          { ok: true, ignored: true, reason: 'conversation_creation_failed' },
          { status: 200 }
        );
      }
    } else {
      conversationId = newConv.id;
    }
  }

  // 7. Canonical sender_type and status
  // Inbound: 'customer', 'delivered'
  // Outbound: 'agent', 'sent'
  const senderType = fromMe ? 'agent' : 'customer';
  const messageStatus = fromMe ? 'sent' : 'delivered';

  // 9. Insert into existing messages table
  const { error: msgInsertErr } = await admin.from('messages').insert({
    conversation_id: conversationId,
    sales_rep_id: channel.sales_member_id || null,
    whatsapp_channel_id: channel.id || null,
    message_id: messageId,
    sender_type: senderType,
    content: content,
    media_type: mediaType,
    media_url: mediaUrl,
    media_mime_type: mediaMimeType,
    status: messageStatus,
    metadata: {
      evolutionInstance: instance,
      remoteJid,
      fromMe,
      pushName: pushName || null,
      key,
      messageType: mediaType,
      rawMessage: rawMsg || null,
    },
    channel_phone_number_id: channel.phone_number_id || null,
    sales_member_id: channel.sales_member_id || null,
    created_at: msgTimestamp,
  });

  if (msgInsertErr) {
    console.error('[EVOLUTION WEBHOOK] Failed to insert message:', msgInsertErr);
    return NextResponse.json(
      { ok: true, ignored: true, reason: 'message_insert_failed', error: msgInsertErr.message },
      { status: 200 }
    );
  }

  // 10. Update conversation after each message
  if (!isNewConversation) {
    const currentUnread = existingConv?.unread_count ?? 0;
    const convUpdates: Record<string, unknown> = {
      last_message_at: msgTimestamp,
      last_message_preview: messagePreview,
      updated_at: new Date().toISOString(),
    };

    if (fromMe) {
      convUpdates.is_unanswered = false;
      // Preserve existing first-response/SLA logic: only calculate if not already set
      if (!existingConv?.first_response_at && existingConv?.created_at) {
        const convCreatedMs = new Date(existingConv.created_at).getTime();
        const msgTimeMs = new Date(msgTimestamp).getTime();
        const diffSecs = Math.max(0, Math.round((msgTimeMs - convCreatedMs) / 1000));
        convUpdates.first_response_at = msgTimestamp;
        convUpdates.first_response_time_seconds = diffSecs;
      }
    } else {
      convUpdates.unread_count = currentUnread + 1;
      convUpdates.is_unanswered = true;
    }

    await admin
      .from('conversations')
      .update(convUpdates)
      .eq('id', conversationId);
  }

  // 11. Update fortline_channels
  await admin
    .from('fortline_channels')
    .update({
      last_successful_event_at: new Date().toISOString(),
      connection_status: 'connected',
      updated_at: new Date().toISOString(),
    })
    .eq('id', channel.id);

  // 12. Update fortline_sales_members
  if (channel.sales_member_id) {
    const nowIso = new Date().toISOString();
    const memberUpdates: Record<string, unknown> = {
      last_activity_at: nowIso,
      updated_at: nowIso,
    };
    if (fromMe) {
      memberUpdates.last_outbound_at = nowIso;
    } else {
      memberUpdates.last_inbound_at = nowIso;
    }
    await admin
      .from('fortline_sales_members')
      .update(memberUpdates)
      .eq('id', channel.sales_member_id);
  }

  // 14. Keep useful logs
  console.log('[EVOLUTION WEBHOOK]', {
    event: normalizedEvent,
    instance,
    remoteJid,
    fromMe,
    messageId,
    salesMemberId: channel.sales_member_id,
    contactId,
    conversationId,
    messageSaved: true,
  });

  return NextResponse.json({ ok: true }, { status: 200 });
}
