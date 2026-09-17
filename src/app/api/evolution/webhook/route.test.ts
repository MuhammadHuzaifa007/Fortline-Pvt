import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  supabaseAdmin: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: mocks.supabaseAdmin,
}));

import { GET, POST } from './route';

interface MockDbState {
  channels: any[];
  contacts: any[];
  conversations: any[];
  messages: any[];
  salesMembers: any[];
  insertedMessages: any[];
  insertedContacts: any[];
  updatedContacts: any[];
  insertedConversations: any[];
  updatedConversations: any[];
  updatedChannels: any[];
  updatedSalesMembers: any[];
}

function createMockSupabase(state: MockDbState) {
  return {
    from: (table: string) => {
      const filters: { col: string; val: any }[] = [];
      let updatePayload: any = null;
      let insertPayload: any = null;

      const chain: any = {
        select: vi.fn(() => chain),
        eq: vi.fn((col: string, val: any) => {
          filters.push({ col, val });
          if (updatePayload) {
            if (table === 'contacts') {
              state.updatedContacts.push({ filter: { col, val }, payload: updatePayload });
            } else if (table === 'conversations') {
              state.updatedConversations.push({ filter: { col, val }, payload: updatePayload });
            } else if (table === 'fortline_channels') {
              state.updatedChannels.push({ filter: { col, val }, payload: updatePayload });
            } else if (table === 'fortline_sales_members') {
              state.updatedSalesMembers.push({ filter: { col, val }, payload: updatePayload });
            }
          }
          return chain;
        }),
        update: vi.fn((payload: any) => {
          updatePayload = payload;
          return chain;
        }),
        insert: vi.fn((payload: any) => {
          insertPayload = payload;
          if (table === 'messages') {
            state.insertedMessages.push(payload);
            state.messages.push(payload);
          }
          return chain;
        }),
        single: vi.fn(async () => {
          if (table === 'contacts') {
            const item = { id: `contact-${Date.now()}-${Math.random()}`, ...insertPayload };
            state.insertedContacts.push(item);
            state.contacts.push(item);
            return { data: item, error: null };
          }
          if (table === 'conversations') {
            const item = { id: `conv-${Date.now()}-${Math.random()}`, ...insertPayload };
            state.insertedConversations.push(item);
            state.conversations.push(item);
            return { data: item, error: null };
          }
          return { data: null, error: null };
        }),
        maybeSingle: vi.fn(async () => {
          let collection: any[] = [];
          if (table === 'fortline_channels') collection = state.channels;
          else if (table === 'messages') collection = state.messages;
          else if (table === 'contacts') collection = state.contacts;
          else if (table === 'conversations') collection = state.conversations;

          const match = collection.find((item) =>
            filters.every((f) => item[f.col] === f.val)
          );
          return { data: match ? { ...match } : null, error: null };
        }),
        then: (resolve: (val: any) => any) => resolve({ data: null, error: null }),
      };

      return chain;
    },
  };
}

describe('/api/evolution/webhook', () => {
  let dbState: MockDbState;

  const BILAL_CHANNEL = {
    id: '65188dee-74f9-4b43-a042-5e3b4be2062b',
    account_id: '2bbc38e3-24ad-433b-95c1-c5af114815a3',
    sales_member_id: '261e9c80-4975-470a-ac83-1ad19c8a3291',
    phone_number_id: 'phone_id_fortline_008',
    gateway_instance_id: 'fortline_bilal',
    connection_status: 'connected',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    dbState = {
      channels: [{ ...BILAL_CHANNEL }],
      contacts: [],
      conversations: [],
      messages: [],
      salesMembers: [
        {
          id: '261e9c80-4975-470a-ac83-1ad19c8a3291',
          name: 'Bilal',
        },
      ],
      insertedMessages: [],
      insertedContacts: [],
      updatedContacts: [],
      insertedConversations: [],
      updatedConversations: [],
      updatedChannels: [],
      updatedSalesMembers: [],
    };
    mocks.supabaseAdmin.mockReturnValue(createMockSupabase(dbState));
  });

  describe('GET', () => {
    it('returns 200 with service info', async () => {
      const res = await GET();
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual({
        ok: true,
        service: 'Fortline Evolution Webhook',
      });
    });
  });

  describe('POST', () => {
    it('returns 200 with { ok: true, ignored: true } when JSON is malformed', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const req = new NextRequest('http://localhost:3000/api/evolution/webhook', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: 'invalid-json{{{',
      }) as any;

      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual({ ok: true, ignored: true });
      expect(warnSpy).toHaveBeenCalled();
    });

    it('ignores unhandled events like connection.update', async () => {
      const req = new NextRequest('http://localhost:3000/api/evolution/webhook', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          event: 'connection.update',
          instance: 'fortline_bilal',
          data: { state: 'open' },
        }),
      }) as any;

      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual({ ok: true, ignored: true, reason: 'unhandled_event' });
      expect(dbState.insertedMessages.length).toBe(0);
    });

    it('safely logs and returns 200 for unknown Evolution instance', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const req = new NextRequest('http://localhost:3000/api/evolution/webhook', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          event: 'messages.upsert',
          instance: 'unknown_instance_xyz',
          data: {
            key: {
              remoteJid: '923001234567@s.whatsapp.net',
              fromMe: false,
              id: 'MSG_1',
            },
          },
        }),
      }) as any;

      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual({ ok: true, ignored: true, reason: 'unknown_instance' });
      expect(warnSpy).toHaveBeenCalledWith('[EVOLUTION WEBHOOK] Unknown instance:', 'unknown_instance_xyz');
      expect(dbState.insertedMessages.length).toBe(0);
    });

    it('ignores status@broadcast and group JIDs', async () => {
      const broadcastReq = new NextRequest('http://localhost:3000/api/evolution/webhook', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          event: 'messages.upsert',
          instance: 'fortline_bilal',
          data: {
            key: {
              remoteJid: 'status@broadcast',
              fromMe: false,
              id: 'STATUS_MSG',
            },
          },
        }),
      }) as any;

      const resBroadcast = await POST(broadcastReq);
      expect(resBroadcast.status).toBe(200);
      expect(await resBroadcast.json()).toEqual({ ok: true, ignored: true, reason: 'ignored_jid' });

      const groupReq = new NextRequest('http://localhost:3000/api/evolution/webhook', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          event: 'messages.upsert',
          instance: 'fortline_bilal',
          data: {
            key: {
              remoteJid: '120363012345678901@g.us',
              fromMe: false,
              id: 'GROUP_MSG',
            },
          },
        }),
      }) as any;

      const resGroup = await POST(groupReq);
      expect(resGroup.status).toBe(200);
      expect(await resGroup.json()).toEqual({ ok: true, ignored: true, reason: 'ignored_jid' });
      expect(dbState.insertedMessages.length).toBe(0);
    });

    it('deduplicates existing message by message_id', async () => {
      dbState.messages.push({
        id: 'msg-existing-1',
        message_id: 'DUPLICATE_ID_123',
      });

      const req = new NextRequest('http://localhost:3000/api/evolution/webhook', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          event: 'messages.upsert',
          instance: 'fortline_bilal',
          data: {
            key: {
              remoteJid: '923001234567@s.whatsapp.net',
              fromMe: false,
              id: 'DUPLICATE_ID_123',
            },
            message: { conversation: 'Testing duplicate' },
          },
        }),
      }) as any;

      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual({ ok: true, skipped: 'already_saved' });
      expect(dbState.insertedMessages.length).toBe(0);
    });

    it('processes incoming client message with new contact and new conversation', async () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const req = new NextRequest('http://localhost:3000/api/evolution/webhook', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          event: 'messages.upsert',
          instance: 'fortline_bilal',
          data: {
            key: {
              remoteJid: '923001234567@s.whatsapp.net',
              fromMe: false,
              id: 'MSG_IN_100',
            },
            pushName: 'Tariq Mehmood',
            message: {
              conversation: 'Need quotation for Cisco switches',
            },
            messageTimestamp: 1726000000,
          },
        }),
      }) as any;

      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual({ ok: true });

      // 1. Contact created
      expect(dbState.insertedContacts.length).toBe(1);
      const contact = dbState.insertedContacts[0];
      expect(contact.account_id).toBe(BILAL_CHANNEL.account_id);
      expect(contact.phone).toBe('923001234567');
      expect(contact.name).toBe('Tariq Mehmood');
      expect(contact.assigned_sales_member_id).toBe(BILAL_CHANNEL.sales_member_id);
      expect(contact.channel_id).toBe('fortline_bilal');
      expect(contact.contact_type).toBe('lead');

      // 2. Conversation created
      expect(dbState.insertedConversations.length).toBe(1);
      const conv = dbState.insertedConversations[0];
      expect(conv.account_id).toBe(BILAL_CHANNEL.account_id);
      expect(conv.contact_id).toBe(contact.id);
      expect(conv.sales_rep_id).toBe(BILAL_CHANNEL.sales_member_id);
      expect(conv.assigned_sales_member_id).toBe(BILAL_CHANNEL.sales_member_id);
      expect(conv.whatsapp_channel_id).toBe(BILAL_CHANNEL.id);
      expect(conv.channel_phone_number_id).toBe(BILAL_CHANNEL.phone_number_id);
      expect(conv.status).toBe('open');
      expect(conv.unread_count).toBe(1);
      expect(conv.is_unanswered).toBe(true);
      expect(conv.last_message_preview).toBe('Need quotation for Cisco switches');

      // 3. Message inserted
      expect(dbState.insertedMessages.length).toBe(1);
      const msg = dbState.insertedMessages[0];
      expect(msg.message_id).toBe('MSG_IN_100');
      expect(msg.sender_type).toBe('customer'); // Canonical inbound
      expect(msg.status).toBe('delivered');
      expect(msg.content).toBe('Need quotation for Cisco switches');
      expect(msg.media_type).toBe('text');
      expect(msg.sales_member_id).toBe(BILAL_CHANNEL.sales_member_id);
      expect(msg.sales_rep_id).toBe(BILAL_CHANNEL.sales_member_id);
      expect(msg.whatsapp_channel_id).toBe(BILAL_CHANNEL.id);
      expect(msg.channel_phone_number_id).toBe(BILAL_CHANNEL.phone_number_id);

      // 4. Channel updated
      expect(dbState.updatedChannels.length).toBe(1);
      expect(dbState.updatedChannels[0].payload.connection_status).toBe('connected');

      // 5. Sales Member updated
      expect(dbState.updatedSalesMembers.length).toBe(1);
      expect(dbState.updatedSalesMembers[0].payload.last_inbound_at).toBeDefined();
      expect(dbState.updatedSalesMembers[0].payload.last_activity_at).toBeDefined();

      // 6. Telemetry logged
      expect(logSpy).toHaveBeenCalledWith(
        '[EVOLUTION WEBHOOK]',
        expect.objectContaining({
          event: 'messages.upsert',
          instance: 'fortline_bilal',
          remoteJid: '923001234567@s.whatsapp.net',
          fromMe: false,
          messageId: 'MSG_IN_100',
          salesMemberId: BILAL_CHANNEL.sales_member_id,
          messageSaved: true,
        })
      );
    });

    it('processes outgoing sales rep reply with existing contact and conversation, setting SLA and answering', async () => {
      // Seed existing contact
      const contactId = 'c-001';
      dbState.contacts.push({
        id: contactId,
        account_id: BILAL_CHANNEL.account_id,
        phone: '923001234567',
        name: 'Tariq Mehmood',
      });

      // Seed existing open conversation created 120 seconds ago
      const convId = 'conv-001';
      const createdTime = new Date(Date.now() - 120000).toISOString();
      dbState.conversations.push({
        id: convId,
        account_id: BILAL_CHANNEL.account_id,
        contact_id: contactId,
        assigned_sales_member_id: BILAL_CHANNEL.sales_member_id,
        unread_count: 2,
        is_unanswered: true,
        created_at: createdTime,
        first_response_at: null,
      });

      const req = new NextRequest('http://localhost:3000/api/evolution/webhook', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          event: 'MESSAGES_UPSERT',
          instance: 'fortline_bilal',
          data: {
            key: {
              remoteJid: '923001234567@s.whatsapp.net',
              fromMe: true,
              id: 'MSG_OUT_200',
            },
            message: {
              extendedTextMessage: {
                text: 'Hello Tariq, here is the Cisco switch quotation.',
              },
            },
          },
        }),
      }) as any;

      const res = await POST(req);
      expect(res.status).toBe(200);
      expect((await res.json()).ok).toBe(true);

      // 1. Reused contact, not inserted
      expect(dbState.insertedContacts.length).toBe(0);

      // 2. Reused conversation, updated with SLA
      expect(dbState.insertedConversations.length).toBe(0);
      expect(dbState.updatedConversations.length).toBe(1);
      const convUpd = dbState.updatedConversations[0].payload;
      expect(convUpd.is_unanswered).toBe(false);
      expect(convUpd.first_response_at).toBeDefined();
      expect(convUpd.first_response_time_seconds).toBeGreaterThanOrEqual(100);

      // 3. Message inserted with sender_type = 'agent', status = 'sent'
      expect(dbState.insertedMessages.length).toBe(1);
      const msg = dbState.insertedMessages[0];
      expect(msg.message_id).toBe('MSG_OUT_200');
      expect(msg.sender_type).toBe('agent'); // Canonical outbound
      expect(msg.status).toBe('sent');
      expect(msg.content).toBe('Hello Tariq, here is the Cisco switch quotation.');

      // 4. Sales member updated with last_outbound_at
      expect(dbState.updatedSalesMembers.length).toBe(1);
      expect(dbState.updatedSalesMembers[0].payload.last_outbound_at).toBeDefined();
    });

    it('reuses existing contact and updates contact name if previous name was phone number', async () => {
      const contactId = 'c-002';
      dbState.contacts.push({
        id: contactId,
        account_id: BILAL_CHANNEL.account_id,
        phone: '923007654321',
        name: '923007654321', // Unnamed, defaults to phone
      });

      const req = new NextRequest('http://localhost:3000/api/evolution/webhook', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          event: 'messages.upsert',
          instance: 'fortline_bilal',
          data: {
            key: {
              remoteJid: '923007654321@s.whatsapp.net',
              fromMe: false,
              id: 'MSG_IN_NAME_TEST',
            },
            pushName: 'Farhan Ali',
            message: { conversation: 'Hi there' },
          },
        }),
      }) as any;

      const res = await POST(req);
      expect(res.status).toBe(200);

      expect(dbState.insertedContacts.length).toBe(0);
      expect(dbState.updatedContacts.length).toBe(1);
      expect(dbState.updatedContacts[0].payload.name).toBe('Farhan Ali');
    });

    it('extracts media messages correctly (image, video, audio, document)', async () => {
      const imagePayload = {
        event: 'messages.upsert',
        instance: 'fortline_bilal',
        data: {
          key: {
            remoteJid: '923009999999@s.whatsapp.net',
            fromMe: false,
            id: 'IMG_1',
          },
          message: {
            imageMessage: {
              url: 'https://media.evolution.local/img1.jpg',
              mimetype: 'image/jpeg',
              caption: 'Product Photo',
            },
          },
        },
      };

      const req = new NextRequest('http://localhost:3000/api/evolution/webhook', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(imagePayload),
      }) as any;

      const res = await POST(req);
      expect(res.status).toBe(200);
      expect(dbState.insertedMessages.length).toBe(1);
      const msg = dbState.insertedMessages[0];
      expect(msg.media_type).toBe('image');
      expect(msg.media_url).toBe('https://media.evolution.local/img1.jpg');
      expect(msg.media_mime_type).toBe('image/jpeg');
      expect(msg.content).toBe('Product Photo');
    });
  });
});
