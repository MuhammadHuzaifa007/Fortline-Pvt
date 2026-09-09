import { supabaseAdmin } from '@/lib/supabase/admin';
import { DEFAULT_GATEWAY_URL, DEFAULT_GATEWAY_API_KEY } from '@/lib/gateway/config';

interface SyncResult {
  ok: boolean;
  syncedChats?: number;
  syncedMessages?: number;
  memberName?: string;
  error?: string;
}

function extractMessageText(msgObj: any): { text: string; mediaType: string; mediaUrl?: string } {
  if (!msgObj) return { text: '', mediaType: 'text' };
  const m = msgObj.message || msgObj;
  if (m.conversation) return { text: m.conversation, mediaType: 'text' };
  if (m.extendedTextMessage?.text) return { text: m.extendedTextMessage.text, mediaType: 'text' };
  if (m.imageMessage) return { text: m.imageMessage.caption || '[Image]', mediaType: 'image', mediaUrl: m.imageMessage.url };
  if (m.audioMessage) return { text: '[Voice Note]', mediaType: 'audio', mediaUrl: m.audioMessage.url };
  if (m.videoMessage) return { text: m.videoMessage.caption || '[Video]', mediaType: 'video', mediaUrl: m.videoMessage.url };
  if (m.documentMessage) return { text: m.documentMessage.fileName ? `[Document: ${m.documentMessage.fileName}]` : '[Document]', mediaType: 'document', mediaUrl: m.documentMessage.url };
  if (m.buttonsResponseMessage?.selectedDisplayText) return { text: m.buttonsResponseMessage.selectedDisplayText, mediaType: 'text' };
  if (m.listResponseMessage?.title) return { text: m.listResponseMessage.title, mediaType: 'text' };
  return { text: '', mediaType: 'text' };
}

/**
 * Sync WhatsApp chats and recent messages from Evolution API for a specific sales member
 * into Fortline CRM database (contacts, conversations, messages).
 */
export async function syncGatewayChatsForSalesMember(
  salesMemberId: string,
  gatewayUrl = DEFAULT_GATEWAY_URL,
  apiKey = DEFAULT_GATEWAY_API_KEY
): Promise<SyncResult> {
  const admin = supabaseAdmin();

  // 1. Resolve sales member & channel
  const { data: member, error: memErr } = await admin
    .from('fortline_sales_members')
    .select('*')
    .eq('id', salesMemberId)
    .single();

  if (memErr || !member) {
    return { ok: false, error: 'Sales member not found' };
  }

  const { data: channel, error: chErr } = await admin
    .from('fortline_channels')
    .select('*')
    .eq('sales_member_id', salesMemberId)
    .maybeSingle();

  if (chErr || !channel || !channel.gateway_instance_id) {
    return { ok: false, error: 'No WhatsApp gateway channel linked to this sales member' };
  }

  const accountId = channel.account_id || member.account_id;
  const instanceName = channel.gateway_instance_id;

  // 2. Fetch chats from Evolution API
  let chats: any[] = [];
  try {
    const res = await fetch(`${gatewayUrl}/chat/findChats/${instanceName}`, {
      method: 'POST',
      headers: {
        apikey: apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    if (!res.ok) {
      const errText = await res.text();
      return { ok: false, error: `Evolution API returned ${res.status}: ${errText.slice(0, 100)}` };
    }

    const data = await res.json();
    chats = Array.isArray(data) ? data : [];
  } catch (err: any) {
    return { ok: false, error: `Failed to connect to gateway: ${err.message}` };
  }

  // 3. Filter for 1-on-1 direct customer chats (skip status broadcasts & groups)
  const directChats = chats.filter(
    (c) => c.remoteJid && c.remoteJid.endsWith('@s.whatsapp.net') && !c.remoteJid.includes('status@broadcast')
  );

  let syncedChatsCount = 0;
  let syncedMessagesCount = 0;

  // Process top active direct chats (up to 40 most recent)
  const sortedChats = directChats
    .sort((a, b) => {
      const tA = new Date(a.updatedAt || 0).getTime();
      const tB = new Date(b.updatedAt || 0).getTime();
      return tB - tA;
    })
    .slice(0, 40);

  for (const chat of sortedChats) {
    const rawNumber = chat.remoteJid.replace(/@.*$/, '');
    const phone = rawNumber.startsWith('+') ? rawNumber : `+${rawNumber}`;
    const name = chat.pushName || chat.lastMessage?.pushName || phone;

    // A. Resolve contact
    let contactId: string | null = null;
    const { data: existingContact } = await admin
      .from('contacts')
      .select('id, name, assigned_sales_member_id')
      .eq('account_id', accountId)
      .eq('phone', phone)
      .maybeSingle();

    if (existingContact) {
      contactId = existingContact.id;
      // Assign to this sales member if unassigned
      if (!existingContact.assigned_sales_member_id) {
        await admin
          .from('contacts')
          .update({ assigned_sales_member_id: salesMemberId })
          .eq('id', contactId);
      }
    } else {
      const { data: newContact, error: cErr } = await admin
        .from('contacts')
        .insert({
          account_id: accountId,
          phone,
          name,
          assigned_sales_member_id: salesMemberId,
          channel_id: channel.phone_number_id || null,
        })
        .select('id')
        .single();

      if (cErr || !newContact) {
        console.warn(`[gateway-sync] Failed to insert contact ${phone}:`, cErr?.message);
        continue;
      }
      contactId = newContact.id;
    }

    // B. Extract last message details
    const lastMsg = chat.lastMessage || {};
    const isFromMe = Boolean(lastMsg.key?.fromMe);
    const lastMsgExtract = extractMessageText(lastMsg);
    const lastMsgText = lastMsgExtract.text || 'WhatsApp message';
    let lastMsgTime = new Date().toISOString();
    if (lastMsg.messageTimestamp) {
      const ts = typeof lastMsg.messageTimestamp === 'string' ? parseInt(lastMsg.messageTimestamp, 10) : lastMsg.messageTimestamp;
      if (ts) {
        const ms = ts < 1e11 ? ts * 1000 : ts;
        lastMsgTime = new Date(ms).toISOString();
      }
    }

    // C. Resolve conversation
    let conversationId: string | null = null;
    const { data: existingConv } = await admin
      .from('conversations')
      .select('id, assigned_sales_member_id')
      .eq('account_id', accountId)
      .eq('contact_id', contactId)
      .maybeSingle();

    if (existingConv) {
      conversationId = existingConv.id;
      await admin
        .from('conversations')
        .update({
          assigned_sales_member_id: salesMemberId,
          channel_phone_number_id: channel.phone_number_id || null,
          last_message_at: lastMsgTime,
          last_message_preview: lastMsgText.slice(0, 100),
          unread_count: chat.unreadCount || 0,
          status: 'open',
          is_unanswered: !isFromMe,
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId);
    } else {
      const { data: newConv, error: convErr } = await admin
        .from('conversations')
        .insert({
          account_id: accountId,
          contact_id: contactId,
          assigned_sales_member_id: salesMemberId,
          channel_phone_number_id: channel.phone_number_id || null,
          status: 'open',
          unread_count: chat.unreadCount || 0,
          last_message_at: lastMsgTime,
          last_message_preview: lastMsgText.slice(0, 100),
          is_unanswered: !isFromMe,
        })
        .select('id')
        .single();

      if (convErr || !newConv) {
        console.warn(`[gateway-sync] Failed to insert conversation for ${phone}:`, convErr?.message);
        continue;
      }
      conversationId = newConv.id;
    }

    syncedChatsCount++;

    // D. Fetch recent messages for this chat (up to 15 messages)
    try {
      const msgRes = await fetch(`${gatewayUrl}/chat/findMessages/${instanceName}`, {
        method: 'POST',
        headers: {
          apikey: apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          where: { key: { remoteJid: chat.remoteJid } },
          take: 15,
        }),
      });

      if (msgRes.ok) {
        const rawMsgs = await msgRes.json();
        const msgList = Array.isArray(rawMsgs) ? rawMsgs : rawMsgs?.messages?.records || [];

        for (const m of msgList) {
          const msgId = m.key?.id;
          if (!msgId) continue;

          // Check if already in DB
          const { data: existingM } = await admin
            .from('messages')
            .select('id')
            .eq('message_id', msgId)
            .maybeSingle();

          if (existingM) continue;

          const mExtract = extractMessageText(m);
          if (!mExtract.text && !mExtract.mediaUrl) continue;

          const mFromMe = Boolean(m.key?.fromMe);
          let mTime = new Date().toISOString();
          if (m.messageTimestamp) {
            const ts = typeof m.messageTimestamp === 'string' ? parseInt(m.messageTimestamp, 10) : m.messageTimestamp;
            if (ts) {
              const ms = ts < 1e11 ? ts * 1000 : ts;
              mTime = new Date(ms).toISOString();
            }
          }

          await admin.from('messages').insert({
            conversation_id: conversationId,
            sender_type: mFromMe ? 'user' : 'contact',
            content: mExtract.text,
            media_type: mExtract.mediaType,
            media_url: mExtract.mediaUrl || null,
            message_id: msgId,
            status: 'delivered',
            created_at: mTime,
            channel_phone_number_id: channel.phone_number_id || null,
            sales_member_id: salesMemberId,
          });

          syncedMessagesCount++;
        }
      }
    } catch (msgErr: any) {
      console.warn(`[gateway-sync] Failed to fetch messages for ${chat.remoteJid}:`, msgErr.message);
    }
  }

  // 4. Update sales member stats
  await admin
    .from('fortline_sales_members')
    .update({
      presence_status: 'online',
      presence_source: 'channel_activity',
      last_activity_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', salesMemberId);

  return {
    ok: true,
    syncedChats: syncedChatsCount,
    syncedMessages: syncedMessagesCount,
    memberName: member.name,
  };
}
