import { describe, expect, it, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  sendEvolutionText: vi.fn(),
  supabaseAdmin: vi.fn(),
}));

vi.mock('@/lib/auth/account', () => ({
  requireRole: mocks.requireRole,
  toErrorResponse: (err: any) => {
    return new Response(JSON.stringify({ error: err.message || 'Error' }), {
      status: err.status || 500,
      headers: { 'Content-Type': 'application/json' },
    });
  },
}));

vi.mock('@/lib/evolution/evolution-api', () => ({
  sendEvolutionText: mocks.sendEvolutionText,
}));

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: mocks.supabaseAdmin,
}));

import { POST } from './route';

describe('POST /api/evolution/send', () => {
  let dbConversations: any[] = [];
  let dbChannels: any[] = [];
  let dbContacts: any[] = [];
  let insertedMessages: any[] = [];

  beforeEach(() => {
    vi.clearAllMocks();

    mocks.requireRole.mockResolvedValue({
      accountId: 'acct-1',
      userId: 'ceo-user-1',
    });

    dbConversations = [
      {
        id: 'conv-bilal-1',
        account_id: 'acct-1',
        contact_id: 'contact-1',
        whatsapp_channel_id: 'chan-bilal',
      },
      {
        id: 'conv-ali-2',
        account_id: 'acct-1',
        contact_id: 'contact-2',
        whatsapp_channel_id: 'chan-ali',
      },
      {
        id: 'conv-no-channel',
        account_id: 'acct-1',
        contact_id: 'contact-1',
        whatsapp_channel_id: null,
      },
    ];

    dbChannels = [
      {
        id: 'chan-bilal',
        account_id: 'acct-1',
        gateway_instance_id: 'fortline_bilal',
        channel_type: 'qr_gateway',
        connection_status: 'connected',
        sales_member_id: 'sm-bilal',
      },
      {
        id: 'chan-ali',
        account_id: 'acct-1',
        gateway_instance_id: 'fortline_ali',
        channel_type: 'qr_gateway',
        connection_status: 'connected',
        sales_member_id: 'sm-ali',
      },
      {
        id: 'chan-meta-cloud',
        account_id: 'acct-1',
        gateway_instance_id: null,
        channel_type: 'cloud_api',
        connection_status: 'connected',
        sales_member_id: 'sm-other',
      },
      {
        id: 'chan-disconnected',
        account_id: 'acct-1',
        gateway_instance_id: 'fortline_disconnected',
        channel_type: 'qr_gateway',
        connection_status: 'disconnected',
        sales_member_id: 'sm-disc',
      },
      {
        id: 'chan-missing-instance',
        account_id: 'acct-1',
        gateway_instance_id: null,
        channel_type: 'qr_gateway',
        connection_status: 'connected',
        sales_member_id: 'sm-none',
      },
    ];

    dbContacts = [
      {
        id: 'contact-1',
        name: 'Client One',
        phone: '+92 300 1234567',
      },
      {
        id: 'contact-2',
        name: 'Client Two',
        phone: '447123456789',
      },
    ];

    insertedMessages = [];

    mocks.supabaseAdmin.mockReturnValue({
      from: (table: string) => {
        const filters: Record<string, any> = {};

        const chain: any = {
          select: vi.fn(() => chain),
          eq: vi.fn((col: string, val: any) => {
            filters[col] = val;
            return chain;
          }),
          insert: vi.fn((payload: any) => {
            if (table === 'messages') {
              insertedMessages.push(payload);
            }
            return Promise.resolve({ data: payload, error: null });
          }),
          maybeSingle: vi.fn(async () => {
            if (table === 'conversations') {
              const match = dbConversations.find(
                (c) =>
                  (!filters.id || c.id === filters.id) &&
                  (!filters.account_id || c.account_id === filters.account_id),
              );
              return { data: match || null, error: null };
            }
            if (table === 'fortline_channels') {
              const match = dbChannels.find(
                (ch) => !filters.id || ch.id === filters.id,
              );
              return { data: match || null, error: null };
            }
            if (table === 'contacts') {
              const match = dbContacts.find(
                (ct) => !filters.id || ct.id === filters.id,
              );
              return { data: match || null, error: null };
            }
            return { data: null, error: null };
          }),
        };
        return chain;
      },
    });

    mocks.sendEvolutionText.mockResolvedValue({
      success: true,
      data: { key: { id: 'evo-msg-1' } },
    });
  });

  function createRequest(body: any) {
    return new Request('http://localhost/api/evolution/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    });
  }

  it('routes Bilal conversation to fortline_bilal Evolution instance and does NOT insert message row', async () => {
    const res = await POST(
      createRequest({
        conversation_id: 'conv-bilal-1',
        text: 'Hello from CEO via Bilal line',
      }),
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.instance).toBe('fortline_bilal');

    // Verify sendEvolutionText was called with correct parameters
    expect(mocks.sendEvolutionText).toHaveBeenCalledTimes(1);
    expect(mocks.sendEvolutionText).toHaveBeenCalledWith(
      'fortline_bilal',
      '923001234567', // Normalized phone without spaces/+
      'Hello from CEO via Bilal line',
    );

    // Crucial: CEO send route does NOT insert a message row directly;
    // Evolution webhook handles outbound persistence when echoed back with fromMe: true
    expect(insertedMessages).toHaveLength(0);
  });

  it('routes a different sales member conversation to their respective instance', async () => {
    const res = await POST(
      createRequest({
        conversation_id: 'conv-ali-2',
        text: 'Hello from Ali line',
      }),
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.instance).toBe('fortline_ali');

    expect(mocks.sendEvolutionText).toHaveBeenCalledWith(
      'fortline_ali',
      '447123456789',
      'Hello from Ali line',
    );
  });

  it('never exposes API keys or internal secrets in the response', async () => {
    const res = await POST(
      createRequest({
        conversation_id: 'conv-bilal-1',
        text: 'Test message',
      }),
    );
    const json = await res.json();

    const responseString = JSON.stringify(json);
    expect(responseString).not.toContain('apikey');
    expect(responseString).not.toContain('EVOLUTION_API_KEY');
    expect(responseString).not.toContain('apiKey');
  });

  it('returns 502 with error message when Evolution send fails', async () => {
    mocks.sendEvolutionText.mockResolvedValueOnce({
      success: false,
      error: 'Evolution API returned 500. The message was not sent.',
    });

    const res = await POST(
      createRequest({
        conversation_id: 'conv-bilal-1',
        text: 'Failing send',
      }),
    );
    const json = await res.json();

    expect(res.status).toBe(502);
    expect(json.error).toBe(
      'Evolution API returned 500. The message was not sent.',
    );
  });

  it('rejects empty message text with 400', async () => {
    const res = await POST(
      createRequest({
        conversation_id: 'conv-bilal-1',
        text: '   ',
      }),
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/empty/i);
    expect(mocks.sendEvolutionText).not.toHaveBeenCalled();
  });

  it('rejects missing conversation_id with 400', async () => {
    const res = await POST(
      createRequest({
        text: 'Valid text',
      }),
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/conversation_id is required/i);
  });

  it('returns 404 when conversation does not exist', async () => {
    const res = await POST(
      createRequest({
        conversation_id: 'conv-nonexistent',
        text: 'Valid text',
      }),
    );
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error).toMatch(/conversation not found/i);
  });

  it('returns 400 when conversation is not linked to a WhatsApp channel', async () => {
    const res = await POST(
      createRequest({
        conversation_id: 'conv-no-channel',
        text: 'Valid text',
      }),
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/not linked to a WhatsApp channel/i);
  });

  it('returns 400 when channel is not a qr_gateway channel', async () => {
    dbConversations.push({
      id: 'conv-meta',
      account_id: 'acct-1',
      contact_id: 'contact-1',
      whatsapp_channel_id: 'chan-meta-cloud',
    });

    const res = await POST(
      createRequest({
        conversation_id: 'conv-meta',
        text: 'Valid text',
      }),
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/not a QR gateway/i);
  });

  it('returns 400 when channel is disconnected', async () => {
    dbConversations.push({
      id: 'conv-disc',
      account_id: 'acct-1',
      contact_id: 'contact-1',
      whatsapp_channel_id: 'chan-disconnected',
    });

    const res = await POST(
      createRequest({
        conversation_id: 'conv-disc',
        text: 'Valid text',
      }),
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/disconnected/i);
  });

  it('returns 400 when channel has no gateway_instance_id', async () => {
    dbConversations.push({
      id: 'conv-no-inst',
      account_id: 'acct-1',
      contact_id: 'contact-1',
      whatsapp_channel_id: 'chan-missing-instance',
    });

    const res = await POST(
      createRequest({
        conversation_id: 'conv-no-inst',
        text: 'Valid text',
      }),
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/no Evolution instance configured/i);
  });
});
