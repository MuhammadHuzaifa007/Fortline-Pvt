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

function extractDataRecord(
  payload: Record<string, unknown> | null
): Record<string, unknown> | null {
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

function extractMessageContent(
  msg: Record<string, unknown> | undefined
): {
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

  if (typeof msg.conversation === 'string' && msg.conversation.trim()) {
    return {
      content: msg.conversation,
      mediaType: 'text',
      mediaUrl: null,
      mediaMimeType: null,
    };
  }

  const extended = msg.extendedTextMessage as Record<string, unknown> | undefined;
  if (typeof extended?.text === 'string' && extended.text.trim()) {
    return {
      content: extended.text,
      mediaType: 'text',
      mediaUrl: null,
      mediaMimeType: null,
    };
  }

  const image = msg.imageMessage as Record<string, unknown> | undefined;
  if (image) {
    return {
      content:
        typeof image.caption === 'string' && image.caption.trim()
          ? image.caption
          : '[Image]',
      mediaType: 'image',
      mediaUrl: typeof image.url === 'string' ? image.url : null,
      mediaMimeType:
        typeof image.mimetype === 'string' ? image.mimetype : 'image/jpeg',
    };
  }

  const video = msg.videoMessage as Record<string, unknown> | undefined;
  if (video) {
    return {
      content:
        typeof video.caption === 'string' && video.caption.trim()
          ? video.caption
          : '[Video]',
      mediaType: 'video',
      mediaUrl: typeof video.url === 'string' ? video.url : null,
      mediaMimeType:
        typeof video.mimetype === 'string' ? video.mimetype : 'video/mp4',
    };
  }

  const audio = msg.audioMessage as Record<string, unknown> | undefined;
  if (audio) {
    return {
      content: '[Voice Note]',
      mediaType: 'audio',
      mediaUrl: typeof audio.url === 'string' ? audio.url : null,
      mediaMimeType:
        typeof audio.mimetype === 'string' ? audio.mimetype : 'audio/ogg',
    };
  }

  const doc = msg.documentMessage as Record<string, unknown> | undefined;
  if (doc) {
    const fileName = typeof doc.fileName === 'string' ? doc.fileName : '';

    return {
      content: fileName ? `[Document: ${fileName}]` : '[Document]',
      mediaType: 'document',
      mediaUrl: typeof doc.url === 'string' ? doc.url : null,
      mediaMimeType:
        typeof doc.mimetype === 'string'
          ? doc.mimetype
          : 'application/pdf',
    };
  }

  const sticker = msg.stickerMessage as Record<string, unknown> | undefined;
  if (sticker) {
    return {
      content: '[Sticker]',
      mediaType: 'sticker',
      mediaUrl: typeof sticker.url === 'string' ? sticker.url : null,
      mediaMimeType:
        typeof sticker.mimetype === 'string'
          ? sticker.mimetype
          : 'image/webp',
    };
  }

  const buttons = msg.buttonsResponseMessage as
    | Record<string, unknown>
    | undefined;
  if (
    typeof buttons?.selectedDisplayText === 'string' &&
    buttons.selectedDisplayText.trim()
  ) {
    return {
      content: buttons.selectedDisplayText,
      mediaType: 'text',
      mediaUrl: null,
      mediaMimeType: null,
    };
  }

  const listResponse = msg.listResponseMessage as
    | Record<string, unknown>
    | undefined;
  if (typeof listResponse?.title === 'string' && listResponse.title.trim()) {
    return {
      content: listResponse.title,
      mediaType: 'text',
      mediaUrl: null,
      mediaMimeType: null,
    };
  }

  return {
    content: '[Unsupported message]',
    mediaType: 'text',
    mediaUrl: null,
    mediaMimeType: null,
  };
}

function extractTimestamp(
  dataItem: Record<string, unknown> | null
): string {
  if (!dataItem) return new Date().toISOString();

  const rawTs = dataItem.messageTimestamp;

  if (typeof rawTs === 'number' && rawTs > 0) {
    const ms = rawTs < 1e11 ? rawTs * 1000 : rawTs;
    return new Date(ms).toISOString();
  }

  if (typeof rawTs === 'string') {
    const parsed = parseInt(rawTs, 10);

    if (!Number.isNaN(parsed) && parsed > 0) {
      const ms = parsed < 1e11 ? parsed * 1000 : parsed;
      return new Date(ms).toISOString();
    }
  }

  return new Date().toISOString();
}

function normalizePhone(value: string): string {
  return value.replace(/\D/g, '');
}

type WhatsAppIdentity = {
  remoteJid: string;
  remoteJidAlt: string | null;
  whatsappJid: string;
  phone: string | null;
  isGroup: boolean;
  unresolvedLid: boolean;
};

function resolveWhatsAppIdentity(
  remoteJid: string,
  key: Record<string, unknown> | undefined
): WhatsAppIdentity | null {
  const jid = remoteJid.trim();

  if (
    !jid ||
    jid === 'status@broadcast' ||
    jid.endsWith('@broadcast') ||
    jid.endsWith('@newsletter')
  ) {
    return null;
  }

  if (jid.endsWith('@g.us')) {
    return {
      remoteJid: jid,
      remoteJidAlt: null,
      whatsappJid: jid,
      phone: null,
      isGroup: true,
      unresolvedLid: false,
    };
  }

  const remoteJidAlt =
    typeof key?.remoteJidAlt === 'string' &&
      key.remoteJidAlt.endsWith('@s.whatsapp.net')
      ? key.remoteJidAlt.trim()
      : null;

  if (jid.endsWith('@s.whatsapp.net')) {
    const phone = normalizePhone(jid.replace(/@.*$/, ''));

    if (!phone || phone === '0' || phone.length < 7) {
      return null;
    }

    return {
      remoteJid: jid,
      remoteJidAlt,
      whatsappJid: `${phone}@s.whatsapp.net`,
      phone,
      isGroup: false,
      unresolvedLid: false,
    };
  }

  if (jid.endsWith('@lid')) {
    if (remoteJidAlt) {
      const phone = normalizePhone(remoteJidAlt.replace(/@.*$/, ''));

      if (!phone || phone === '0' || phone.length < 7) {
        return null;
      }

      return {
        remoteJid: jid,
        remoteJidAlt,
        whatsappJid: `${phone}@s.whatsapp.net`,
        phone,
        isGroup: false,
        unresolvedLid: false,
      };
    }

    return {
      remoteJid: jid,
      remoteJidAlt: null,
      whatsappJid: jid,
      phone: null,
      isGroup: false,
      unresolvedLid: true,
    };
  }

  return null;
}

function isReservedSelfName(value: string): boolean {
  const normalized = value
    .trim()
    .toLocaleLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  return ['voce', 'you', 'me', 'myself'].includes(normalized);
}

function cleanPushName(
  rawName: unknown,
  fromMe: boolean,
  identity: WhatsAppIdentity
): string {
  if (fromMe || identity.isGroup || typeof rawName !== 'string') {
    return '';
  }

  const value = rawName.trim();

  if (!value || isReservedSelfName(value)) {
    return '';
  }

  const valueDigits = normalizePhone(value);
  const jidDigits = normalizePhone(identity.remoteJid.split('@')[0]);

  if (
    valueDigits &&
    (valueDigits === identity.phone ||
      valueDigits === jidDigits ||
      (valueDigits.length >= 8 && valueDigits === value))
  ) {
    return '';
  }

  return value;
}

function isPlaceholderContactName(
  rawName: unknown,
  identity: WhatsAppIdentity
): boolean {
  if (typeof rawName !== 'string' || !rawName.trim()) {
    return true;
  }

  const value = rawName.trim();

  if (
    isReservedSelfName(value) ||
    value === 'WhatsApp Contact' ||
    value === 'WhatsApp Group' ||
    value === identity.whatsappJid ||
    value === identity.remoteJid
  ) {
    return true;
  }

  if (
    identity.phone &&
    (value === identity.phone || value === `+${identity.phone}`)
  ) {
    return true;
  }

  const valueDigits = normalizePhone(value);
  const jidDigits = normalizePhone(identity.remoteJid.split('@')[0]);

  if (
    valueDigits &&
    valueDigits.length >= 8 &&
    (valueDigits === jidDigits || valueDigits === identity.phone)
  ) {
    return true;
  }

  return false;
}

export async function POST(request: NextRequest) {
  let payload: Record<string, unknown> | null = null;

  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch (err) {
    console.warn('[Evolution Webhook] Failed to parse JSON payload:', err);
    return NextResponse.json(
      { ok: true, ignored: true },
      { status: 200 }
    );
  }

  const rawEvent =
    typeof payload?.event === 'string'
      ? payload.event
      : '';

  const normalizedEvent = rawEvent
    .toLowerCase()
    .replace(/_/g, '.');

  if (
    normalizedEvent !== 'messages.upsert' &&
    normalizedEvent !== 'send.message'
  ) {
    return NextResponse.json(
      {
        ok: true,
        ignored: true,
        reason: 'unhandled_event',
      },
      { status: 200 }
    );
  }

  const instance =
    typeof payload?.instance === 'string'
      ? payload.instance.trim()
      : '';

  if (!instance) {
    console.warn('[EVOLUTION WEBHOOK] Missing instance in payload');

    return NextResponse.json(
      {
        ok: true,
        ignored: true,
        reason: 'missing_instance',
      },
      { status: 200 }
    );
  }

  const admin = supabaseAdmin();

  const { data: channel, error: channelError } = await admin
    .from('fortline_channels')
    .select(
      'id, account_id, sales_member_id, phone_number_id'
    )
    .eq('gateway_instance_id', instance)
    .maybeSingle();

  if (channelError) {
    console.error(
      '[EVOLUTION WEBHOOK] Database error fetching channel for instance:',
      instance,
      channelError
    );

    return NextResponse.json(
      {
        ok: true,
        ignored: true,
        reason: 'channel_query_error',
      },
      { status: 200 }
    );
  }

  if (!channel) {
    console.warn(
      '[EVOLUTION WEBHOOK] Unknown instance:',
      instance
    );

    return NextResponse.json(
      {
        ok: true,
        ignored: true,
        reason: 'unknown_instance',
      },
      { status: 200 }
    );
  }

  const dataRecord = extractDataRecord(payload);
  const key = dataRecord?.key as
    | Record<string, unknown>
    | undefined;

  const remoteJid =
    typeof key?.remoteJid === 'string'
      ? key.remoteJid.trim()
      : '';

  const identity = resolveWhatsAppIdentity(
    remoteJid,
    key
  );

  if (!identity) {
    console.log(
      '[EVOLUTION WEBHOOK] Ignored unsupported/invalid JID:',
      remoteJid || '(empty)'
    );

    return NextResponse.json(
      {
        ok: true,
        ignored: true,
        reason: 'ignored_jid',
      },
      { status: 200 }
    );
  }

  const messageId =
    typeof key?.id === 'string'
      ? key.id.trim()
      : '';

  if (!messageId) {
    console.warn(
      '[EVOLUTION WEBHOOK] Missing message id in key'
    );

    return NextResponse.json(
      {
        ok: true,
        ignored: true,
        reason: 'missing_message_id',
      },
      { status: 200 }
    );
  }

  let duplicateQuery = admin
    .from('messages')
    .select('id')
    .eq('message_id', messageId);

  if (channel.id) {
    duplicateQuery = duplicateQuery.eq(
      'whatsapp_channel_id',
      channel.id
    );
  }

  const {
    data: existingMessage,
    error: existingMessageError,
  } = await duplicateQuery.maybeSingle();

  if (existingMessageError) {
    console.error(
      '[EVOLUTION WEBHOOK] Error checking duplicate message:',
      existingMessageError
    );
  }

  if (existingMessage) {
    console.log(
      '[EVOLUTION WEBHOOK] Message already exists on channel:',
      messageId,
      channel.id
    );

    return NextResponse.json(
      {
        ok: true,
        skipped: 'already_saved',
      },
      { status: 200 }
    );
  }

  const explicitFromMe =
    typeof key?.fromMe === 'boolean'
      ? key.fromMe
      : undefined;

  const fromMe =
    normalizedEvent === 'send.message'
      ? true
      : explicitFromMe === true;

  const rawPushName =
    typeof dataRecord?.pushName === 'string'
      ? dataRecord.pushName.trim()
      : '';

  const pushName = cleanPushName(
    rawPushName,
    fromMe,
    identity
  );

  const rawMsg = dataRecord?.message as
    | Record<string, unknown>
    | undefined;

  const {
    content,
    mediaType,
    mediaUrl,
    mediaMimeType,
  } = extractMessageContent(rawMsg);

  const msgTimestamp =
    extractTimestamp(dataRecord);

  const messagePreview =
    content.slice(0, 100);

  // ---------------------------------------------------------
  // Resolve / create contact
  // ---------------------------------------------------------

  let contact: any = null;

  if (identity.phone) {
    const { data } = await admin
      .from('contacts')
      .select(
        'id, name, phone, whatsapp_jid, metadata, assigned_sales_member_id'
      )
      .eq('account_id', channel.account_id)
      .in('phone', [
        identity.phone,
        `+${identity.phone}`,
      ])
      .limit(1);

    contact = data?.[0] || null;
  }

  if (!contact) {
    const { data } = await admin
      .from('contacts')
      .select(
        'id, name, phone, whatsapp_jid, metadata, assigned_sales_member_id'
      )
      .eq('account_id', channel.account_id)
      .eq('whatsapp_jid', identity.whatsappJid)
      .limit(1);

    contact = data?.[0] || null;
  }

  // If an old unresolved LID contact later becomes resolvable, allow its
  // original LID to find the same record before creating another contact.
  if (
    !contact &&
    identity.remoteJid !== identity.whatsappJid
  ) {
    const { data } = await admin
      .from('contacts')
      .select(
        'id, name, phone, whatsapp_jid, metadata, assigned_sales_member_id'
      )
      .eq('account_id', channel.account_id)
      .eq('whatsapp_jid', identity.remoteJid)
      .limit(1);

    contact = data?.[0] || null;
  }

  let contactId: string | null =
    contact?.id || null;

  const contactMetadata = {
    ...(contact?.metadata &&
      typeof contact.metadata === 'object'
      ? contact.metadata
      : {}),
    evolutionInstance: instance,
    remoteJid: identity.remoteJid,
    remoteJidAlt: identity.remoteJidAlt,
    canonicalWhatsAppJid:
      identity.whatsappJid,
    unresolvedLid:
      identity.unresolvedLid,
    chatType:
      identity.isGroup
        ? 'group'
        : 'direct',
    pushName:
      pushName ||
      rawPushName ||
      null,
  };

  if (contact) {
    const contactUpdates: Record<
      string,
      unknown
    > = {
      whatsapp_jid:
        identity.whatsappJid,
      metadata:
        contactMetadata,
      updated_at:
        new Date().toISOString(),
    };

    if (
      identity.phone &&
      contact.phone !== identity.phone
    ) {
      contactUpdates.phone =
        identity.phone;
    }

    if (
      !contact.assigned_sales_member_id &&
      channel.sales_member_id
    ) {
      contactUpdates.assigned_sales_member_id =
        channel.sales_member_id;
    }

    if (
      !identity.isGroup &&
      pushName &&
      isPlaceholderContactName(
        contact.name,
        identity
      )
    ) {
      contactUpdates.name =
        pushName;
    }

    await admin
      .from('contacts')
      .update(contactUpdates)
      .eq('id', contact.id);
  } else {
    const newContactName =
      identity.isGroup
        ? 'WhatsApp Group'
        : pushName ||
        identity.phone ||
        'WhatsApp Contact';

    const {
      data: newContact,
      error: createContactError,
    } = await admin
      .from('contacts')
      .insert({
        account_id:
          channel.account_id,
        phone:
          identity.phone,
        whatsapp_jid:
          identity.whatsappJid,
        name:
          newContactName,
        assigned_sales_member_id:
          channel.sales_member_id ||
          null,
        channel_id:
          instance,
        contact_type:
          'lead',
        metadata:
          contactMetadata,
      })
      .select('id')
      .single();

    if (
      createContactError ||
      !newContact
    ) {
      let raceContact: any = null;

      if (identity.phone) {
        const { data } = await admin
          .from('contacts')
          .select('id')
          .eq(
            'account_id',
            channel.account_id
          )
          .in('phone', [
            identity.phone,
            `+${identity.phone}`,
          ])
          .limit(1);

        raceContact =
          data?.[0] || null;
      }

      if (!raceContact) {
        const { data } = await admin
          .from('contacts')
          .select('id')
          .eq(
            'account_id',
            channel.account_id
          )
          .eq(
            'whatsapp_jid',
            identity.whatsappJid
          )
          .limit(1);

        raceContact =
          data?.[0] || null;
      }

      if (raceContact) {
        contactId =
          raceContact.id;
      } else {
        console.error(
          '[EVOLUTION WEBHOOK] Failed to create contact:',
          createContactError
        );

        return NextResponse.json(
          {
            ok: true,
            ignored: true,
            reason:
              'contact_creation_failed',
          },
          { status: 200 }
        );
      }
    } else {
      contactId =
        newContact.id;
    }
  }

  if (!contactId) {
    return NextResponse.json(
      {
        ok: true,
        ignored: true,
        reason: 'missing_contact',
      },
      { status: 200 }
    );
  }

  // ---------------------------------------------------------
  // Resolve / create isolated conversation for this sales line
  // ---------------------------------------------------------

  let conversationId:
    | string
    | null = null;

  let isNewConversation =
    false;

  let conversationQuery = admin
    .from('conversations')
    .select(
      'id, unread_count, assigned_sales_member_id, first_response_at, first_response_time_seconds, created_at'
    )
    .eq(
      'account_id',
      channel.account_id
    )
    .eq(
      'contact_id',
      contactId
    );

  if (channel.sales_member_id) {
    conversationQuery =
      conversationQuery.eq(
        'assigned_sales_member_id',
        channel.sales_member_id
      );
  }

  if (channel.id) {
    conversationQuery =
      conversationQuery.eq(
        'whatsapp_channel_id',
        channel.id
      );
  }

  const {
    data: existingConversation,
    error: conversationFindError,
  } =
    await conversationQuery.maybeSingle();

  if (conversationFindError) {
    console.error(
      '[EVOLUTION WEBHOOK] Error finding conversation:',
      conversationFindError
    );
  }

  if (existingConversation) {
    conversationId =
      existingConversation.id;
  } else {
    isNewConversation = true;

    const nowIso =
      new Date().toISOString();

    const {
      data: newConversation,
      error: createConversationError,
    } = await admin
      .from('conversations')
      .insert({
        account_id:
          channel.account_id,
        contact_id:
          contactId,
        sales_rep_id:
          channel.sales_member_id ||
          null,
        assigned_sales_member_id:
          channel.sales_member_id ||
          null,
        whatsapp_channel_id:
          channel.id || null,
        channel_phone_number_id:
          channel.phone_number_id ||
          null,
        status:
          'open',
        unread_count:
          fromMe ? 0 : 1,
        is_unanswered:
          !fromMe,
        last_message_at:
          msgTimestamp,
        last_message_preview:
          messagePreview,
        created_at:
          nowIso,
        updated_at:
          nowIso,
      })
      .select(
        'id, unread_count, created_at, first_response_at'
      )
      .single();

    if (
      createConversationError ||
      !newConversation
    ) {
      let raceConversationQuery =
        admin
          .from('conversations')
          .select(
            'id, unread_count, assigned_sales_member_id, first_response_at, first_response_time_seconds, created_at'
          )
          .eq(
            'account_id',
            channel.account_id
          )
          .eq(
            'contact_id',
            contactId
          );

      if (channel.sales_member_id) {
        raceConversationQuery =
          raceConversationQuery.eq(
            'assigned_sales_member_id',
            channel.sales_member_id
          );
      }

      if (channel.id) {
        raceConversationQuery =
          raceConversationQuery.eq(
            'whatsapp_channel_id',
            channel.id
          );
      }

      const {
        data: raceConversation,
      } =
        await raceConversationQuery.maybeSingle();

      if (raceConversation) {
        conversationId =
          raceConversation.id;
      } else {
        console.error(
          '[EVOLUTION WEBHOOK] Failed to create conversation:',
          createConversationError
        );

        return NextResponse.json(
          {
            ok: true,
            ignored: true,
            reason:
              'conversation_creation_failed',
          },
          { status: 200 }
        );
      }
    } else {
      conversationId =
        newConversation.id;
    }
  }

  if (!conversationId) {
    return NextResponse.json(
      {
        ok: true,
        ignored: true,
        reason:
          'missing_conversation',
      },
      { status: 200 }
    );
  }

  const senderType =
    fromMe
      ? 'user'
      : 'contact';

  const messageStatus =
    fromMe
      ? 'sent'
      : 'delivered';

  const participant =
    typeof key?.participant === 'string'
      ? key.participant
      : null;

  const participantAlt =
    typeof key?.participantAlt === 'string'
      ? key.participantAlt
      : null;

  const {
    error: messageInsertError,
  } = await admin
    .from('messages')
    .insert({
      conversation_id:
        conversationId,
      sales_rep_id:
        channel.sales_member_id ||
        null,
      whatsapp_channel_id:
        channel.id || null,
      message_id:
        messageId,
      sender_type:
        senderType,
      content,
      media_type:
        mediaType,
      media_url:
        mediaUrl,
      media_mime_type:
        mediaMimeType,
      status:
        messageStatus,
      metadata: {
        evolutionInstance:
          instance,
        remoteJid:
          identity.remoteJid,
        remoteJidAlt:
          identity.remoteJidAlt,
        canonicalWhatsAppJid:
          identity.whatsappJid,
        unresolvedLid:
          identity.unresolvedLid,
        chatType:
          identity.isGroup
            ? 'group'
            : 'direct',
        fromMe,
        pushName:
          pushName ||
          rawPushName ||
          null,
        participant,
        participantAlt,
        key,
        messageType:
          mediaType,
        rawMessage:
          rawMsg || null,
      },
      channel_phone_number_id:
        channel.phone_number_id ||
        null,
      sales_member_id:
        channel.sales_member_id ||
        null,
      created_at:
        msgTimestamp,
    });

  if (messageInsertError) {
    console.error(
      '[EVOLUTION WEBHOOK] Failed to insert message:',
      messageInsertError
    );

    return NextResponse.json(
      {
        ok: true,
        ignored: true,
        reason:
          'message_insert_failed',
        error:
          messageInsertError.message,
      },
      { status: 200 }
    );
  }

  if (!isNewConversation) {
    const currentUnread =
      existingConversation?.unread_count ??
      0;

    const conversationUpdates: Record<
      string,
      unknown
    > = {
      last_message_at:
        msgTimestamp,
      last_message_preview:
        messagePreview,
      updated_at:
        new Date().toISOString(),
    };

    if (fromMe) {
      conversationUpdates.is_unanswered =
        false;

      if (
        !existingConversation?.first_response_at &&
        existingConversation?.created_at
      ) {
        const conversationCreatedMs =
          new Date(
            existingConversation.created_at
          ).getTime();

        const messageTimeMs =
          new Date(
            msgTimestamp
          ).getTime();

        const diffSeconds =
          Math.max(
            0,
            Math.round(
              (
                messageTimeMs -
                conversationCreatedMs
              ) / 1000
            )
          );

        conversationUpdates.first_response_at =
          msgTimestamp;

        conversationUpdates.first_response_time_seconds =
          diffSeconds;
      }
    } else {
      conversationUpdates.unread_count =
        currentUnread + 1;

      conversationUpdates.is_unanswered =
        true;
    }

    await admin
      .from('conversations')
      .update(
        conversationUpdates
      )
      .eq(
        'id',
        conversationId
      );
  }

  await admin
    .from('fortline_channels')
    .update({
      last_successful_event_at:
        new Date().toISOString(),
      connection_status:
        'connected',
      updated_at:
        new Date().toISOString(),
    })
    .eq(
      'id',
      channel.id
    );

  if (channel.sales_member_id) {
    const nowIso =
      new Date().toISOString();

    const memberUpdates: Record<
      string,
      unknown
    > = {
      last_activity_at:
        nowIso,
      updated_at:
        nowIso,
    };

    if (fromMe) {
      memberUpdates.last_outbound_at =
        nowIso;
    } else {
      memberUpdates.last_inbound_at =
        nowIso;
    }

    await admin
      .from('fortline_sales_members')
      .update(
        memberUpdates
      )
      .eq(
        'id',
        channel.sales_member_id
      );
  }

  console.log(
    '[EVOLUTION WEBHOOK]',
    {
      event:
        normalizedEvent,
      instance,
      remoteJid:
        identity.remoteJid,
      remoteJidAlt:
        identity.remoteJidAlt,
      whatsappJid:
        identity.whatsappJid,
      phone:
        identity.phone,
      isGroup:
        identity.isGroup,
      unresolvedLid:
        identity.unresolvedLid,
      fromMe,
      messageId,
      salesMemberId:
        channel.sales_member_id,
      contactId,
      conversationId,
      messageSaved:
        true,
    }
  );

  return NextResponse.json(
    { ok: true },
    { status: 200 }
  );
}