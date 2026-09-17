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
  error?: string;
}

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
 * Resolve an actual phone-number JID from an Evolution chat.
 *
 * Modern WhatsApp / Baileys can return:
 *   123456789@lid
 *
 * while providing the real number under:
 *   remoteJidAlt = 923xxxxxxxxx@s.whatsapp.net
 *
 * Never use a group participant number as the direct-chat number.
 */
function resolvePhoneJid(chat: any): string | null {
  const primaryJid = chat?.remoteJid;

  if (
    typeof primaryJid === 'string' &&
    primaryJid.endsWith('@s.whatsapp.net')
  ) {
    return primaryJid;
  }

  if (
    typeof primaryJid === 'string' &&
    primaryJid.endsWith('@lid')
  ) {
    const candidates = [
      chat?.remoteJidAlt,
      chat?.lastMessage?.key?.remoteJidAlt,
    ];

    for (const candidate of candidates) {
      if (
        typeof candidate === 'string' &&
        candidate.endsWith('@s.whatsapp.net')
      ) {
        return candidate;
      }
    }
  }

  return null;
}

/**
 * Safely detect whether a message was sent by the monitored sales line.
 */
function isMessageFromMe(message: any): boolean {
  return message?.key?.fromMe === true;
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
  // 4. Keep direct 1-on-1 chats only
  //
  // Supports:
  // 923xxxxxxxxx@s.whatsapp.net
  //
  // AND modern:
  // xxxxxxxxx@lid
  // where remoteJidAlt contains the real number.
  //
  // Groups/status/newsletters are ignored.
  // ---------------------------------------------------------

  let skippedUnresolvedLidChats = 0;

  const directChats = chats
    .map((chat) => {
      const remoteJid = chat?.remoteJid;

      if (
        !remoteJid ||
        typeof remoteJid !== 'string'
      ) {
        return null;
      }

      // Explicitly ignore non-direct chat types.
      if (
        remoteJid === 'status@broadcast' ||
        remoteJid.endsWith('@g.us') ||
        remoteJid.endsWith('@broadcast') ||
        remoteJid.endsWith('@newsletter')
      ) {
        return null;
      }

      const resolvedPhoneJid = resolvePhoneJid(chat);

      if (!resolvedPhoneJid) {
        if (remoteJid.endsWith('@lid')) {
          skippedUnresolvedLidChats++;
        }

        return null;
      }

      return {
        ...chat,
        resolvedPhoneJid,
      };
    })
    .filter(Boolean) as any[];

  // ---------------------------------------------------------
  // 5. Sort newest chats and sync max 40 at a time
  // ---------------------------------------------------------

  const sortedChats = directChats
    .sort((a, b) => {
      const timeA = new Date(
        a.updatedAt || 0
      ).getTime();

      const timeB = new Date(
        b.updatedAt || 0
      ).getTime();

      return timeB - timeA;
    })
    .slice(0, 40);

  let syncedChatsCount = 0;
  let syncedMessagesCount = 0;

  // ---------------------------------------------------------
  // 6. Process each direct chat
  // ---------------------------------------------------------

  for (const chat of sortedChats) {
    try {
      const rawNumber =
        chat.resolvedPhoneJid.replace(
          /@.*$/,
          ''
        );

      const phone = normalizePhone(rawNumber);

      if (!phone) {
        continue;
      }

      const discoveredName =
        chat.pushName ||
        chat.lastMessage?.pushName ||
        phone;

      // -----------------------------------------------------
      // A. Resolve / create contact
      // -----------------------------------------------------

      let contactId: string | null = null;

      // Support both historical +923... records and canonical
      // 923... records so Sync does not create duplicates.
      const { data: existingContacts } =
        await admin
          .from('contacts')
          .select(
            'id, name, phone, assigned_sales_member_id'
          )
          .eq('account_id', accountId)
          .in('phone', [
            phone,
            `+${phone}`,
          ])
          .limit(1);

      const existingContact =
        existingContacts?.[0] || null;

      if (existingContact) {
        contactId = existingContact.id;

        const contactUpdates: Record<
          string,
          any
        > = {};

        // Normalize old +923... format.
        if (
          existingContact.phone !== phone
        ) {
          contactUpdates.phone = phone;
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

        // Upgrade a placeholder phone-number name
        // when Evolution knows the person's pushName.
        if (
          discoveredName &&
          discoveredName !== phone &&
          (
            !existingContact.name ||
            existingContact.name === phone ||
            existingContact.name === `+${phone}`
          )
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
              resolvedPhoneJid:
                chat.resolvedPhoneJid,
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
            `[gateway-sync] Failed to insert contact ${phone}:`,
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
          `[gateway-sync] Conversation lookup failed for ${phone}:`,
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
            `[gateway-sync] Failed to insert conversation for ${phone}:`,
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
      // D. Fetch up to 15 recent messages
      // -----------------------------------------------------

      try {
        const messageResponse =
          await fetch(
            `${cleanGatewayUrl}/chat/findMessages/${encodeURIComponent(
              instanceName
            )}`,
            {
              method: 'POST',
              headers: {
                apikey: apiKey,
                'Content-Type':
                  'application/json',
              },

              body: JSON.stringify({
                where: {
                  key: {
                    // IMPORTANT:
                    // Query using Evolution's actual chat JID,
                    // which may be @lid.
                    remoteJid:
                      chat.remoteJid,
                  },
                },

                take: 15,
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

          continue;
        }

        const rawMessages =
          await messageResponse.json();

        let messageList: any[] = [];

        if (
          Array.isArray(rawMessages)
        ) {
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

        for (const message of messageList) {
          const messageId =
            message?.key?.id;

          if (!messageId) {
            continue;
          }

          // -------------------------------------------------
          // Channel-scoped deduplication
          //
          // Same message id on another monitored line
          // must not suppress that other line.
          // -------------------------------------------------

          const {
            data: existingMessage,
            error:
            existingMessageError,
          } = await admin
            .from('messages')
            .select('id')
            .eq(
              'message_id',
              messageId
            )
            .eq(
              'whatsapp_channel_id',
              channel.id
            )
            .maybeSingle();

          if (
            existingMessageError
          ) {
            console.warn(
              `[gateway-sync] Message dedupe lookup failed for ${messageId}:`,
              existingMessageError.message
            );

            continue;
          }

          if (existingMessage) {
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

          const {
            error: messageInsertError,
          } = await admin
            .from('messages')
            .insert({
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

                resolvedPhoneJid:
                  chat.resolvedPhoneJid,

                syncedFromEvolution:
                  true,
              },

              created_at:
                messageTime,
            });

          if (messageInsertError) {
            console.warn(
              `[gateway-sync] Failed inserting message ${messageId}:`,
              messageInsertError.message
            );

            continue;
          }

          syncedMessagesCount++;
        }
      } catch (messageError: any) {
        console.warn(
          `[gateway-sync] Failed to fetch messages for ${chat.remoteJid}:`,
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

  // Keep channel activity fresh too.
  await admin
    .from('fortline_channels')
    .update({
      connection_status:
        'connected',

      last_successful_event_at:
        new Date().toISOString(),

      updated_at:
        new Date().toISOString(),
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
  };
}