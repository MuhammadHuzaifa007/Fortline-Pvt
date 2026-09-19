import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  DEFAULT_GATEWAY_URL,
  DEFAULT_GATEWAY_API_KEY,
} from '@/lib/gateway/config';

interface SyncResult {
  ok: boolean;
  syncedChats?: number;
  syncedMessages?: number;
  memberName?: string;
  skippedUnresolvedLidChats?: number;
  unresolvedLidChats?: number;
  totalChats?: number;
  batchStart?: number;
  batchEnd?: number;
  remainingChats?: number;
  hasMore?: boolean;
  error?: string;
}

const SYNC_BATCH_SIZE = 100;
const DETAILED_MESSAGE_CHAT_LIMIT = 20;
const MESSAGE_LIMIT_PER_CHAT = 15;

interface ExtractedMessage {
  text: string;
  mediaType: string;
  mediaUrl?: string;
  mediaMimeType?: string;
}

/**
 * Extract useful content from an Evolution WhatsApp message.
 */
function extractMessageText(msgObj: any): ExtractedMessage {
  if (!msgObj) {
    return {
      text: '[Unsupported message]',
      mediaType: 'text',
    };
  }

  const m = msgObj.message || msgObj;

  if (m.conversation) {
    return {
      text: m.conversation,
      mediaType: 'text',
    };
  }

  if (m.extendedTextMessage?.text) {
    return {
      text: m.extendedTextMessage.text,
      mediaType: 'text',
    };
  }

  if (m.imageMessage) {
    return {
      text: m.imageMessage.caption || '[Image]',
      mediaType: 'image',
      mediaUrl: m.imageMessage.url,
      mediaMimeType: m.imageMessage.mimetype,
    };
  }

  if (m.audioMessage) {
    return {
      text: '[Voice Note]',
      mediaType: 'audio',
      mediaUrl: m.audioMessage.url,
      mediaMimeType: m.audioMessage.mimetype,
    };
  }

  if (m.videoMessage) {
    return {
      text: m.videoMessage.caption || '[Video]',
      mediaType: 'video',
      mediaUrl: m.videoMessage.url,
      mediaMimeType: m.videoMessage.mimetype,
    };
  }

  if (m.documentMessage) {
    return {
      text: m.documentMessage.fileName
        ? `[Document: ${m.documentMessage.fileName}]`
        : '[Document]',
      mediaType: 'document',
      mediaUrl: m.documentMessage.url,
      mediaMimeType: m.documentMessage.mimetype,
    };
  }

  if (m.stickerMessage) {
    return {
      text: '[Sticker]',
      mediaType: 'sticker',
      mediaUrl: m.stickerMessage.url,
      mediaMimeType: m.stickerMessage.mimetype,
    };
  }

  if (m.buttonsResponseMessage?.selectedDisplayText) {
    return {
      text: m.buttonsResponseMessage.selectedDisplayText,
      mediaType: 'text',
    };
  }

  if (m.listResponseMessage?.title) {
    return {
      text: m.listResponseMessage.title,
      mediaType: 'text',
    };
  }

  return {
    text: '[Unsupported message]',
    mediaType: 'text',
  };
}

/**
 * Convert Evolution timestamp into an ISO timestamp.
 */
function evolutionTimestampToIso(timestamp: any): string {
  if (!timestamp) {
    return new Date().toISOString();
  }

  const parsed =
    typeof timestamp === 'string'
      ? Number.parseInt(timestamp, 10)
      : Number(timestamp);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return new Date().toISOString();
  }

  const milliseconds = parsed < 1e11 ? parsed * 1000 : parsed;

  const date = new Date(milliseconds);

  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString();
  }

  return date.toISOString();
}

/**
 * Normalize a WhatsApp phone number.
 *
 * CRM/webhook canonical format:
 * 923001234567
 *
 * NOT:
 * +923001234567
 */
function normalizePhone(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Resolve a stable WhatsApp identity from an Evolution chat.
 *
 * Evolution/Baileys may expose a direct chat as either:
 *   923xxxxxxxxx@s.whatsapp.net
 * or:
 *   xxxxxxxxx@lid
 *
 * If a LID chat provides remoteJidAlt, use that phone JID as the canonical
 * identity so the LID version and phone-JID version of the same person merge
 * into one CRM contact/conversation.
 *
 * If no phone mapping is available, keep the @lid value itself as the
 * canonical WhatsApp identity. That lets the CRM preserve the historical chat
 * instead of dropping it.
 */
function resolveChatIdentity(chat: any): {
  remoteJid: string;
  altJid: string | null;
  canonicalJid: string;
  phone: string | null;
  unresolvedLid: boolean;
  chatType: 'direct' | 'group';
} | null {
  const remoteJid = typeof chat?.remoteJid === 'string'
    ? chat.remoteJid.trim()
    : '';

  if (!remoteJid) {
    return null;
  }

  if (
    remoteJid === 'status@broadcast' ||
    remoteJid.endsWith('@broadcast') ||
    remoteJid.endsWith('@newsletter')
  ) {
    return null;
  }

  if (remoteJid.endsWith('@g.us')) {
    return {
      remoteJid,
      altJid: null,
      canonicalJid: remoteJid,
      phone: null,
      unresolvedLid: false,
      chatType: 'group',
    };
  }

  const altCandidates = [
    chat?.remoteJidAlt,
    chat?.lastMessage?.key?.remoteJidAlt,
  ];

  const altJid = altCandidates.find(
    (candidate) =>
      typeof candidate === 'string' &&
      candidate.endsWith('@s.whatsapp.net')
  ) || null;

  if (remoteJid.endsWith('@s.whatsapp.net')) {
    const phone = normalizePhone(remoteJid.replace(/@.*$/, ''));

    if (!phone || phone === '0' || phone.length < 7) {
      return null;
    }

    return {
      remoteJid,
      altJid,
      canonicalJid: `${phone}@s.whatsapp.net`,
      phone,
      unresolvedLid: false,
      chatType: 'direct',
    };
  }

  if (remoteJid.endsWith('@lid')) {
    if (altJid) {
      const phone = normalizePhone(altJid.replace(/@.*$/, ''));

      if (!phone || phone === '0' || phone.length < 7) {
        return null;
      }

      return {
        remoteJid,
        altJid,
        canonicalJid: `${phone}@s.whatsapp.net`,
        phone,
        unresolvedLid: false,
        chatType: 'direct',
      };
    }

    return {
      remoteJid,
      altJid: null,
      canonicalJid: remoteJid,
      phone: null,
      unresolvedLid: true,
      chatType: 'direct',
    };
  }

  return null;
}

/**
 * Safely detect whether a message was sent by the monitored sales line.
 */
function isMessageFromMe(message: any): boolean {
  return message?.key?.fromMe === true;
}


function isReservedSelfName(value: string): boolean {
  const normalized = value
    .trim()
    .toLocaleLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  return ['voce', 'you', 'me', 'myself'].includes(normalized);
}

function cleanDiscoveredName(
  value: unknown,
  phone: string | null,
  remoteJid: string,
  fromMe: boolean
): string {
  if (fromMe || typeof value !== 'string') {
    return '';
  }

  const name = value.trim();

  if (!name || isReservedSelfName(name)) {
    return '';
  }

  const digits = normalizePhone(name);
  const jidDigits = normalizePhone(remoteJid.split('@')[0]);

  if (
    digits &&
    digits.length >= 8 &&
    (digits === phone || digits === jidDigits)
  ) {
    return '';
  }

  return name;
}

function isPlaceholderStoredName(
  value: unknown,
  phone: string | null,
  whatsappJid: string,
  remoteJid: string
): boolean {
  if (typeof value !== 'string' || !value.trim()) {
    return true;
  }

  const name = value.trim();

  if (
    isReservedSelfName(name) ||
    name === 'WhatsApp Contact' ||
    name === 'WhatsApp Group' ||
    name === whatsappJid ||
    name === remoteJid
  ) {
    return true;
  }

  if (phone && (name === phone || name === `+${phone}`)) {
    return true;
  }

  const digits = normalizePhone(name);
  const jidDigits = normalizePhone(remoteJid.split('@')[0]);

  return Boolean(
    digits &&
    digits.length >= 8 &&
    (digits === phone || digits === jidDigits)
  );
}

/**
 * Sync WhatsApp chats and recent messages from Evolution API
 * for one Fortline sales member into:
 *
 * contacts
 * conversations
 * messages
 *
 * Important:
 * Each sales member/channel receives an isolated conversation,
 * even when the same customer talks to multiple Fortline reps.
 */
export async function syncGatewayChatsForSalesMember(
  salesMemberId: string,
  gatewayUrl = DEFAULT_GATEWAY_URL,
  apiKey = DEFAULT_GATEWAY_API_KEY
): Promise<SyncResult> {
  const admin = supabaseAdmin();

  const cleanGatewayUrl = gatewayUrl.replace(/\/+$/, '');

  if (!cleanGatewayUrl || !apiKey) {
    return {
      ok: false,
      error: 'Evolution API configuration is missing',
    };
  }

  // ---------------------------------------------------------
  // 1. Resolve sales member
  // ---------------------------------------------------------

  const { data: member, error: memberError } = await admin
    .from('fortline_sales_members')
    .select('*')
    .eq('id', salesMemberId)
    .single();

  if (memberError || !member) {
    return {
      ok: false,
      error: 'Sales member not found',
    };
  }

  // ---------------------------------------------------------
  // 2. Resolve this sales member's WhatsApp channel
  // ---------------------------------------------------------

  const { data: channel, error: channelError } = await admin
    .from('fortline_channels')
    .select('*')
    .eq('sales_member_id', salesMemberId)
    .maybeSingle();

  if (
    channelError ||
    !channel ||
    !channel.gateway_instance_id
  ) {
    return {
      ok: false,
      error: 'No WhatsApp gateway channel linked to this sales member',
    };
  }

  if (channel.channel_type !== 'qr_gateway') {
    return {
      ok: false,
      error: 'This sales member is not linked through Evolution WhatsApp',
    };
  }

  const accountId =
    channel.account_id ||
    member.account_id;

  if (!accountId) {
    return {
      ok: false,
      error: 'Sales member account could not be resolved',
    };
  }

  const instanceName = channel.gateway_instance_id;

  // ---------------------------------------------------------
  // 3. Fetch chats from Evolution
  // ---------------------------------------------------------

  let chats: any[] = [];

  try {
    const response = await fetch(
      `${cleanGatewayUrl}/chat/findChats/${encodeURIComponent(instanceName)}`,
      {
        method: 'POST',
        headers: {
          apikey: apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      const responseText = await response.text();

      console.error(
        '[gateway-sync] Evolution findChats failed',
        {
          status: response.status,
          instanceName,
          response: responseText.slice(0, 300),
        }
      );

      return {
        ok: false,
        error: `Evolution API returned ${response.status}: ${responseText.slice(
          0,
          100
        )}`,
      };
    }

    const data = await response.json();

    chats = Array.isArray(data)
      ? data
      : Array.isArray(data?.chats)
        ? data.chats
        : [];
  } catch (error: any) {
    console.error(
      '[gateway-sync] Failed connecting to Evolution:',
      error
    );

    return {
      ok: false,
      error: `Failed to connect to gateway: ${error?.message || 'Unknown error'
        }`,
    };
  }

  // ---------------------------------------------------------
  // 3B. Fetch Evolution contacts for reliable WhatsApp display names
  // ---------------------------------------------------------

  let evolutionContacts: any[] = [];

  try {
    const contactsResponse = await fetch(
      `${cleanGatewayUrl}/chat/findContacts/${encodeURIComponent(instanceName)}`,
      {
        method: 'POST',
        headers: {
          apikey: apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          where: {},
          take: 500,
        }),
        cache: 'no-store',
      }
    );

    if (contactsResponse.ok) {
      const contactsData = await contactsResponse.json();

      evolutionContacts = Array.isArray(contactsData)
        ? contactsData
        : Array.isArray(contactsData?.contacts)
          ? contactsData.contacts
          : [];
    } else {
      const responseText = await contactsResponse.text();

      console.warn(
        '[gateway-sync] Evolution findContacts failed:',
        contactsResponse.status,
        responseText.slice(0, 200)
      );
    }
  } catch (contactsError: any) {
    console.warn(
      '[gateway-sync] Failed fetching Evolution contacts:',
      contactsError?.message || contactsError
    );
  }

  const whatsappNameByJid = new Map<string, string>();

  for (const evolutionContact of evolutionContacts) {
    const contactJid =
      typeof evolutionContact?.remoteJid === 'string'
        ? evolutionContact.remoteJid.trim()
        : '';

    const contactNameCandidates = [
      evolutionContact?.pushName,
      evolutionContact?.name,
      evolutionContact?.verifiedName,
      evolutionContact?.notify,
    ];

    const contactPushName =
      contactNameCandidates
        .find(
          (value) =>
            typeof value === 'string' &&
            value.trim() &&
            !isReservedSelfName(value)
        );

    if (!contactJid || typeof contactPushName !== 'string') {
      continue;
    }

    whatsappNameByJid.set(contactJid, contactPushName.trim());
  }

  // ---------------------------------------------------------
  // 4. Keep supported WhatsApp chats.
  //
  // Supports direct phone JIDs, modern @lid chats, and @g.us groups.
  // Status/broadcast/newsletter records are ignored.
  // ---------------------------------------------------------

  let skippedUnresolvedLidChats = 0;
  let unresolvedLidChats = 0;

  const supportedChats = chats
    .map((chat) => {
      const identity = resolveChatIdentity(chat);

      if (!identity) {
        return null;
      }

      if (identity.unresolvedLid) {
        unresolvedLidChats++;
      }

      return {
        ...chat,
        resolvedRemoteJid: identity.remoteJid,
        resolvedAltJid: identity.altJid,
        canonicalWhatsAppJid: identity.canonicalJid,
        resolvedPhone: identity.phone,
        unresolvedLid: identity.unresolvedLid,
        resolvedChatType: identity.chatType,
      };
    })
    .filter(Boolean) as any[];

  // ---------------------------------------------------------
  // 5. Resumable historical sync.
  //
  // Evolution may contain 1,000+ chats. Processing everything in one server
  // request is too expensive and can hit Vercel timeouts. Persist progress in
  // fortline_channels.gateway_metadata and process the next 100 chats.
  // ---------------------------------------------------------

  const allSortedChats = supportedChats
    .sort((a, b) => {
      const timeA = new Date(
        a.updatedAt || 0
      ).getTime();

      const timeB = new Date(
        b.updatedAt || 0
      ).getTime();

      return timeB - timeA;
    });

  const totalChats = allSortedChats.length;

  const gatewayMetadata =
    channel.gateway_metadata &&
      typeof channel.gateway_metadata === 'object' &&
      !Array.isArray(channel.gateway_metadata)
      ? channel.gateway_metadata
      : {};

  const rawSavedCursor =
    Number((gatewayMetadata as any).historySyncCursor);

  const savedCursor =
    Number.isFinite(rawSavedCursor) && rawSavedCursor >= 0
      ? Math.floor(rawSavedCursor)
      : 0;

  const historyAlreadyComplete =
    (gatewayMetadata as any).historySyncComplete === true &&
    savedCursor >= totalChats;

  const batchStart = historyAlreadyComplete
    ? 0
    : Math.min(savedCursor, totalChats);

  const sortedChats = allSortedChats.slice(
    batchStart,
    batchStart + SYNC_BATCH_SIZE
  );

  const batchEnd = historyAlreadyComplete
    ? Math.min(SYNC_BATCH_SIZE, totalChats)
    : Math.min(batchStart + sortedChats.length, totalChats);

  const hasMore = historyAlreadyComplete
    ? false
    : batchEnd < totalChats;

  const remainingChats = historyAlreadyComplete
    ? 0
    : Math.max(totalChats - batchEnd, 0);

  let syncedChatsCount = 0;
  let syncedMessagesCount = 0;

  // ---------------------------------------------------------
  // 6. Process each supported chat
  // ---------------------------------------------------------

  for (const [chatIndex, chat] of sortedChats.entries()) {
    try {
      const phone: string | null = chat.resolvedPhone || null;
      const whatsappJid: string = chat.canonicalWhatsAppJid;

      if (!whatsappJid) {
        continue;
      }

      if (phone && (phone === '0' || phone.length < 7)) {
        continue;
      }

      const isGroup = chat.resolvedChatType === 'group';
      const lastMessageFromMeForName =
        isMessageFromMe(chat.lastMessage || {});

      const directoryNameRaw = isGroup
        ? ''
        : (
          whatsappNameByJid.get(whatsappJid) ||
          whatsappNameByJid.get(chat.remoteJid) ||
          (chat.resolvedAltJid
            ? whatsappNameByJid.get(chat.resolvedAltJid)
            : '') ||
          ''
        );

      const directoryName = isGroup
        ? ''
        : cleanDiscoveredName(
          directoryNameRaw,
          phone,
          chat.remoteJid,
          false
        );

      const chatNameCandidates = isGroup
        ? [
          chat.pushName,
          chat.name,
          chat.subject,
        ]
        : [
          chat.pushName,
          chat.name,
          chat.verifiedName,
          chat.notify,
        ];

      const primaryName = isGroup
        ? (
          chatNameCandidates.find(
            (value) =>
              typeof value === 'string' &&
              value.trim()
          ) as string | undefined
        )?.trim() || ''
        : (
          chatNameCandidates
            .map((value) =>
              cleanDiscoveredName(
                value,
                phone,
                chat.remoteJid,
                false
              )
            )
            .find(Boolean) || ''
        );

      const secondaryName = isGroup
        ? ''
        : cleanDiscoveredName(
          chat.lastMessage?.pushName,
          phone,
          chat.remoteJid,
          lastMessageFromMeForName
        );

      const jidLocalPart =
        typeof chat.remoteJid === 'string'
          ? chat.remoteJid.split('@')[0]
          : '';

      const discoveredName =
        directoryName ||
        primaryName ||
        secondaryName ||
        (isGroup
          ? 'WhatsApp Group'
          : phone || jidLocalPart || 'Unknown WhatsApp');

      // -----------------------------------------------------
      // A. Resolve / create contact
      // -----------------------------------------------------

      let contactId: string | null = null;

      // Prefer phone matching when a real number is known so a @lid chat
      // with remoteJidAlt and the equivalent phone-JID chat merge into one
      // contact. For unresolved @lid chats, match by whatsapp_jid instead.
      let existingContacts: any[] | null = null;

      if (phone) {
        const { data } = await admin
          .from('contacts')
          .select(
            'id, name, phone, whatsapp_jid, assigned_sales_member_id'
          )
          .eq('account_id', accountId)
          .in('phone', [
            phone,
            `+${phone}`,
          ])
          .limit(1);

        existingContacts = data;
      }

      if (!existingContacts?.length) {
        const { data } = await admin
          .from('contacts')
          .select(
            'id, name, phone, whatsapp_jid, assigned_sales_member_id'
          )
          .eq('account_id', accountId)
          .eq('whatsapp_jid', whatsappJid)
          .limit(1);

        existingContacts = data;
      }

      const existingContact =
        existingContacts?.[0] || null;

      if (existingContact) {
        contactId = existingContact.id;

        const contactUpdates: Record<
          string,
          any
        > = {};

        // Normalize old +923... format when a real phone is known.
        if (
          phone &&
          existingContact.phone !== phone
        ) {
          contactUpdates.phone = phone;
        }

        // Store a stable WhatsApp identity. For resolved LID chats this is the
        // canonical phone JID; for unresolved LID chats it remains the @lid.
        if (existingContact.whatsapp_jid !== whatsappJid) {
          contactUpdates.whatsapp_jid = whatsappJid;
        }

        // Assign only when currently unassigned.
        //
        // Same contact may talk to multiple sales reps;
        // conversation/channel isolation handles that separately.
        if (
          !existingContact.assigned_sales_member_id
        ) {
          contactUpdates.assigned_sales_member_id =
            salesMemberId;
        }

        // Keep CRM contact name aligned with the WhatsApp name Evolution exposes.
        // Reserved self labels such as "Você" are already filtered above.
        if (
          discoveredName &&
          discoveredName !== 'WhatsApp Group' &&
          existingContact.name !== discoveredName
        ) {
          contactUpdates.name = discoveredName;
        }

        if (
          Object.keys(contactUpdates).length >
          0
        ) {
          contactUpdates.updated_at =
            new Date().toISOString();

          await admin
            .from('contacts')
            .update(contactUpdates)
            .eq('id', contactId);
        }
      } else {
        const {
          data: newContact,
          error: contactInsertError,
        } = await admin
          .from('contacts')
          .insert({
            account_id: accountId,
            phone,
            whatsapp_jid: whatsappJid,
            name: discoveredName,
            assigned_sales_member_id:
              salesMemberId,

            // Keep consistent with Evolution webhook.
            channel_id: instanceName,

            contact_type: 'lead',

            metadata: {
              evolutionInstance:
                instanceName,
              remoteJid: chat.remoteJid,
              remoteJidAlt: chat.resolvedAltJid || null,
              canonicalWhatsAppJid: whatsappJid,
              resolvedPhoneJid:
                phone ? `${phone}@s.whatsapp.net` : null,
              unresolvedLid: Boolean(chat.unresolvedLid),
              chatType: isGroup ? 'group' : 'direct',
              pushName:
                chat.pushName ||
                chat.lastMessage?.pushName ||
                null,
              syncedFromEvolution: true,
            },
          })
          .select('id')
          .single();

        if (
          contactInsertError ||
          !newContact
        ) {
          console.warn(
            `[gateway-sync] Failed to insert contact ${phone || whatsappJid}:`,
            contactInsertError?.message
          );

          continue;
        }

        contactId = newContact.id;
      }

      if (!contactId) {
        continue;
      }

      // -----------------------------------------------------
      // B. Last message / conversation preview
      // -----------------------------------------------------

      const lastMessage =
        chat.lastMessage || {};

      const lastMessageFromMe =
        isMessageFromMe(lastMessage);

      const extractedLastMessage =
        extractMessageText(lastMessage);

      const lastMessageText =
        extractedLastMessage.text ||
        'WhatsApp message';

      const lastMessageTime =
        evolutionTimestampToIso(
          lastMessage.messageTimestamp
        );

      const unreadCount =
        Number.isFinite(
          Number(chat.unreadCount)
        )
          ? Number(chat.unreadCount)
          : 0;

      // -----------------------------------------------------
      // C. Resolve conversation
      //
      // CRITICAL:
      // same customer + different rep/channel
      // MUST remain separate.
      // -----------------------------------------------------

      let conversationId:
        | string
        | null = null;

      const {
        data: existingConversation,
        error: existingConversationError,
      } = await admin
        .from('conversations')
        .select(
          'id, assigned_sales_member_id'
        )
        .eq('account_id', accountId)
        .eq('contact_id', contactId)
        .eq(
          'assigned_sales_member_id',
          salesMemberId
        )
        .eq(
          'whatsapp_channel_id',
          channel.id
        )
        .maybeSingle();

      if (existingConversationError) {
        console.warn(
          `[gateway-sync] Conversation lookup failed for ${phone || whatsappJid}:`,
          existingConversationError.message
        );

        continue;
      }

      if (existingConversation) {
        conversationId =
          existingConversation.id;

        await admin
          .from('conversations')
          .update({
            sales_rep_id:
              salesMemberId,

            assigned_sales_member_id:
              salesMemberId,

            whatsapp_channel_id:
              channel.id,

            channel_phone_number_id:
              channel.phone_number_id ||
              null,

            last_message_at:
              lastMessageTime,

            last_message_preview:
              lastMessageText.slice(
                0,
                100
              ),

            unread_count:
              unreadCount,

            status: 'open',

            is_unanswered:
              !lastMessageFromMe,

            updated_at:
              new Date().toISOString(),
          })
          .eq(
            'id',
            conversationId
          );
      } else {
        const {
          data: newConversation,
          error:
          conversationInsertError,
        } = await admin
          .from('conversations')
          .insert({
            account_id:
              accountId,

            contact_id:
              contactId,

            sales_rep_id:
              salesMemberId,

            assigned_sales_member_id:
              salesMemberId,

            whatsapp_channel_id:
              channel.id,

            channel_phone_number_id:
              channel.phone_number_id ||
              null,

            status: 'open',

            unread_count:
              unreadCount,

            last_message_at:
              lastMessageTime,

            last_message_preview:
              lastMessageText.slice(
                0,
                100
              ),

            is_unanswered:
              !lastMessageFromMe,
          })
          .select('id')
          .single();

        if (
          conversationInsertError ||
          !newConversation
        ) {
          console.warn(
            `[gateway-sync] Failed to insert conversation for ${phone || whatsappJid}:`,
            conversationInsertError?.message
          );

          continue;
        }

        conversationId =
          newConversation.id;
      }

      if (!conversationId) {
        continue;
      }

      syncedChatsCount++;

      // -----------------------------------------------------
      // D. Message history
      //
      // Only the newest 20 chats in each batch fetch 15 messages from
      // Evolution. Older chats use their already-available lastMessage.
      // This keeps the historical import fast while preserving previews.
      // -----------------------------------------------------

      try {
        let messageList: any[] = [];

        if (chatIndex < DETAILED_MESSAGE_CHAT_LIMIT) {
          const messageResponse =
            await fetch(
              `${cleanGatewayUrl}/chat/findMessages/${encodeURIComponent(
                instanceName
              )}`,
              {
                method: 'POST',
                headers: {
                  apikey: apiKey,
                  'Content-Type': 'application/json',
                },

                body: JSON.stringify({
                  where: {
                    key: {
                      remoteJid:
                        chat.remoteJid,
                    },
                  },

                  take: MESSAGE_LIMIT_PER_CHAT,
                }),

                cache: 'no-store',
              }
            );

          if (!messageResponse.ok) {
            const responseText =
              await messageResponse.text();

            console.warn(
              `[gateway-sync] findMessages failed for ${chat.remoteJid}: ${messageResponse.status} ${responseText.slice(
                0,
                200
              )}`
            );
          } else {
            const rawMessages =
              await messageResponse.json();

            if (Array.isArray(rawMessages)) {
              messageList = rawMessages;
            } else if (
              Array.isArray(
                rawMessages?.messages?.records
              )
            ) {
              messageList =
                rawMessages.messages.records;
            } else if (
              Array.isArray(
                rawMessages?.messages
              )
            ) {
              messageList =
                rawMessages.messages;
            } else if (
              Array.isArray(
                rawMessages?.records
              )
            ) {
              messageList =
                rawMessages.records;
            }
          }
        } else if (chat.lastMessage?.key?.id) {
          messageList = [chat.lastMessage];
        }

        if (!isGroup) {
          const historicalWhatsAppName = messageList
            .filter((message) => !isMessageFromMe(message))
            .map((message) =>
              cleanDiscoveredName(
                message?.pushName,
                phone,
                chat.remoteJid,
                false
              )
            )
            .find(Boolean);

          if (
            historicalWhatsAppName &&
            historicalWhatsAppName !== discoveredName
          ) {
            await admin
              .from('contacts')
              .update({
                name: historicalWhatsAppName,
                updated_at: new Date().toISOString(),
              })
              .eq('id', contactId);
          }
        }

        const validMessages = messageList.filter(
          (message) =>
            typeof message?.key?.id === 'string' &&
            message.key.id.trim()
        );

        if (validMessages.length > 0) {
          const messageIds = validMessages.map(
            (message) => message.key.id
          );

          const {
            data: existingMessages,
            error: existingMessagesError,
          } = await admin
            .from('messages')
            .select('message_id')
            .eq(
              'whatsapp_channel_id',
              channel.id
            )
            .in(
              'message_id',
              messageIds
            );

          if (existingMessagesError) {
            console.warn(
              `[gateway-sync] Batch message dedupe failed for ${chat.remoteJid}:`,
              existingMessagesError.message
            );
          } else {
            const existingMessageIds =
              new Set(
                (existingMessages || [])
                  .map((row: any) => row.message_id)
                  .filter(Boolean)
              );

            const rowsToInsert: any[] = [];

            for (const message of validMessages) {
              const messageId =
                message.key.id;

              if (
                existingMessageIds.has(messageId)
              ) {
                continue;
              }

              const extracted =
                extractMessageText(message);

              if (
                !extracted.text &&
                !extracted.mediaUrl
              ) {
                continue;
              }

              const messageFromMe =
                isMessageFromMe(message);

              const messageTime =
                evolutionTimestampToIso(
                  message.messageTimestamp
                );

              rowsToInsert.push({
                conversation_id:
                  conversationId,

                sales_rep_id:
                  salesMemberId,

                whatsapp_channel_id:
                  channel.id,

                message_id:
                  messageId,

                sender_type:
                  messageFromMe
                    ? 'user'
                    : 'contact',

                content:
                  extracted.text,

                media_type:
                  extracted.mediaType,

                media_url:
                  extracted.mediaUrl ||
                  null,

                media_mime_type:
                  extracted.mediaMimeType ||
                  null,

                status:
                  messageFromMe
                    ? 'sent'
                    : 'delivered',

                channel_phone_number_id:
                  channel.phone_number_id ||
                  null,

                sales_member_id:
                  salesMemberId,

                metadata: {
                  evolutionInstance:
                    instanceName,

                  remoteJid:
                    chat.remoteJid,

                  remoteJidAlt:
                    chat.resolvedAltJid || null,

                  canonicalWhatsAppJid:
                    whatsappJid,

                  resolvedPhoneJid:
                    phone ? `${phone}@s.whatsapp.net` : null,

                  unresolvedLid:
                    Boolean(chat.unresolvedLid),

                  chatType:
                    isGroup ? 'group' : 'direct',

                  participant:
                    message?.key?.participant || null,

                  participantAlt:
                    message?.key?.participantAlt || null,

                  pushName:
                    message?.pushName || null,

                  syncedFromEvolution:
                    true,
                },

                created_at:
                  messageTime,
              });
            }

            if (rowsToInsert.length > 0) {
              const {
                error: bulkInsertError,
              } = await admin
                .from('messages')
                .insert(rowsToInsert);

              if (!bulkInsertError) {
                syncedMessagesCount +=
                  rowsToInsert.length;
              } else {
                console.warn(
                  `[gateway-sync] Bulk message insert failed for ${chat.remoteJid}; retrying individually:`,
                  bulkInsertError.message
                );

                for (const row of rowsToInsert) {
                  const {
                    error: singleInsertError,
                  } = await admin
                    .from('messages')
                    .insert(row);

                  if (!singleInsertError) {
                    syncedMessagesCount++;
                    continue;
                  }

                  if (
                    singleInsertError.code !== '23505'
                  ) {
                    console.warn(
                      `[gateway-sync] Failed inserting message ${row.message_id}:`,
                      singleInsertError.message
                    );
                  }
                }
              }
            }
          }
        }
      } catch (messageError: any) {
        console.warn(
          `[gateway-sync] Failed to fetch/process messages for ${chat.remoteJid}:`,
          messageError?.message ||
          messageError
        );
      }
    } catch (chatError: any) {
      console.warn(
        '[gateway-sync] Failed processing chat:',
        chat?.remoteJid,
        chatError?.message ||
        chatError
      );
    }
  }

  // ---------------------------------------------------------
  // 7. Update sales member activity
  // ---------------------------------------------------------

  await admin
    .from('fortline_sales_members')
    .update({
      presence_status: 'online',
      presence_source:
        'channel_activity',

      last_activity_at:
        new Date().toISOString(),

      updated_at:
        new Date().toISOString(),
    })
    .eq('id', salesMemberId);

  // Keep channel activity fresh and persist the resumable history cursor.
  const syncFinishedAt =
    new Date().toISOString();

  await admin
    .from('fortline_channels')
    .update({
      connection_status:
        'connected',

      last_successful_event_at:
        syncFinishedAt,

      gateway_metadata: {
        ...(gatewayMetadata as Record<string, unknown>),
        historySyncCursor:
          hasMore
            ? batchEnd
            : totalChats,
        historySyncComplete:
          !hasMore,
        historySyncTotal:
          totalChats,
        historySyncLastBatchStart:
          batchStart,
        historySyncLastBatchEnd:
          batchEnd,
        historySyncUpdatedAt:
          syncFinishedAt,
      },

      updated_at:
        syncFinishedAt,
    })
    .eq('id', channel.id);

  return {
    ok: true,
    syncedChats:
      syncedChatsCount,
    syncedMessages:
      syncedMessagesCount,
    memberName:
      member.name,
    skippedUnresolvedLidChats,
    unresolvedLidChats,
    totalChats,
    batchStart,
    batchEnd,
    remainingChats,
    hasMore,
  };
}
