import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  createEvolutionInstance: vi.fn(),
  getEvolutionConnection: vi.fn(),
  setEvolutionWebhook: vi.fn(),
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
  createEvolutionInstance: mocks.createEvolutionInstance,
  getEvolutionConnection: mocks.getEvolutionConnection,
  setEvolutionWebhook: mocks.setEvolutionWebhook,
}));

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: mocks.supabaseAdmin,
}));

import { POST } from './route';

describe('POST /api/evolution/link/start', () => {
  let dbSalesMembers: any[] = [];
  let dbChannels: any[] = [];
  let updatedChannels: any[] = [];

  beforeEach(() => {
    vi.clearAllMocks();

    process.env.EVOLUTION_API_KEY = 'super_secret_evolution_key_123';
    process.env.EVOLUTION_API_URL = 'https://evo.fortlinesales.cloud';

    mocks.requireRole.mockResolvedValue({
      accountId: 'acct-1',
      userId: 'ceo-user-1',
    });

    dbSalesMembers = [
      {
        id: 'sm-bilal',
        account_id: 'acct-1',
        name: 'Bilal Khan',
        phone_number: '923001234567',
      },
      {
        id: 'sm-hamza',
        account_id: 'acct-1',
        name: 'Hamza Tariq',
        phone_number: '923007654321',
      },
      {
        id: 'sm-cloud',
        account_id: 'acct-1',
        name: 'Cloud Rep',
        phone_number: '923009999999',
      },
    ];

    dbChannels = [
      {
        id: 'chan-bilal',
        account_id: 'acct-1',
        sales_member_id: 'sm-bilal',
        channel_type: 'qr_gateway',
        gateway_instance_id: 'fortline_bilal',
        connection_status: 'disconnected',
        pairing_state: 'disconnected',
      },
      {
        id: 'chan-hamza',
        account_id: 'acct-1',
        sales_member_id: 'sm-hamza',
        channel_type: 'qr_gateway',
        gateway_instance_id: null, // Test new instance generation
        connection_status: 'disconnected',
        pairing_state: 'disconnected',
      },
      {
        id: 'chan-cloud',
        account_id: 'acct-1',
        sales_member_id: 'sm-cloud',
        channel_type: 'cloud_api',
        gateway_instance_id: null,
        connection_status: 'connected',
        pairing_state: 'connected',
      },
    ];

    updatedChannels = [];

    mocks.createEvolutionInstance.mockResolvedValue({
      success: true,
      data: { instance: { instanceName: 'fortline_bilal' } },
    });

    mocks.setEvolutionWebhook.mockResolvedValue({
      success: true,
      data: { webhook: { enabled: true } },
    });

    mocks.getEvolutionConnection.mockResolvedValue({
      success: true,
      data: {
        pairingCode: '1234-5678',
        code: '2@qrstring...',
        base64: 'data:image/png;base64,mockqr',
      },
    });

    mocks.supabaseAdmin.mockReturnValue({
      from: (table: string) => {
        const filters: { col: string; val: any }[] = [];
        let updateData: any = null;

        const chain: any = {
          select: vi.fn(() => chain),
          eq: vi.fn((col: string, val: any) => {
            filters.push({ col, val });
            return chain;
          }),
          update: vi.fn((payload: any) => {
            updateData = payload;
            return chain;
          }),
          maybeSingle: vi.fn(async () => {
            let collection: any[] = [];
            if (table === 'fortline_sales_members') collection = dbSalesMembers;
            if (table === 'fortline_channels') collection = dbChannels;

            const match = collection.find((item) =>
              filters.every((f) => item[f.col] === f.val)
            );
            return { data: match ? { ...match } : null, error: null };
          }),
          then: (resolve: (val: any) => any) => {
            if (table === 'fortline_channels' && updateData) {
              updatedChannels.push({ filters, payload: updateData });
            }
            return resolve({ data: null, error: null });
          },
        };
        return chain;
      },
    });
  });

  it('rejects unauthorized request with 403', async () => {
    const error: any = new Error('Forbidden');
    error.status = 403;
    mocks.requireRole.mockRejectedValueOnce(error);

    const req = new NextRequest('http://localhost:3000/api/evolution/link/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sales_member_id: 'sm-bilal', mode: 'qr' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it('rejects missing sales_member_id with 400', async () => {
    const req = new NextRequest('http://localhost:3000/api/evolution/link/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'qr' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/sales_member_id is required/);
  });

  it('rejects non qr_gateway channel with 400', async () => {
    const req = new NextRequest('http://localhost:3000/api/evolution/link/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sales_member_id: 'sm-cloud', mode: 'qr' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/not configured for QR gateway/i);
  });

  it('creates new Evolution instance when channel has no gateway_instance_id', async () => {
    const req = new NextRequest('http://localhost:3000/api/evolution/link/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sales_member_id: 'sm-hamza', mode: 'qr' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    // Expected stable instance name based on channel ID
    expect(mocks.createEvolutionInstance).toHaveBeenCalledWith('fortline_rep_chan_hamza');
    expect(updatedChannels.length).toBeGreaterThan(0);
    expect(updatedChannels[0].payload.gateway_instance_id).toBe('fortline_rep_chan_hamza');
  });

  it('safely reuses existing instance without failing if it already exists', async () => {
    mocks.createEvolutionInstance.mockResolvedValueOnce({
      success: true,
      alreadyExists: true,
      data: { message: 'Instance already exists' },
    });

    const req = new NextRequest('http://localhost:3000/api/evolution/link/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sales_member_id: 'sm-bilal', mode: 'qr' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mocks.createEvolutionInstance).toHaveBeenCalledWith('fortline_bilal');
  });

  it('handles QR mode and returns QR connect payload', async () => {
    const req = new NextRequest('http://localhost:3000/api/evolution/link/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sales_member_id: 'sm-bilal', mode: 'qr' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.ok).toBe(true);
    expect(json.mode).toBe('qr');
    expect(json.instance).toBe('fortline_bilal');
    expect(json.qr).toBeDefined();
    expect(json.qr.base64).toBe('data:image/png;base64,mockqr');
    expect(json.pairingCode).toBeNull();

    expect(mocks.getEvolutionConnection).toHaveBeenCalledWith('fortline_bilal', undefined);
  });

  it('handles pairing mode with normalized phone number and returns pairingCode', async () => {
    const req = new NextRequest('http://localhost:3000/api/evolution/link/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sales_member_id: 'sm-bilal',
        mode: 'pairing',
        phone: '+92 300 123-4567',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.ok).toBe(true);
    expect(json.mode).toBe('pairing');
    expect(json.pairingCode).toBe('1234-5678');
    expect(json.qr).toBeNull();

    expect(mocks.getEvolutionConnection).toHaveBeenCalledWith('fortline_bilal', '923001234567');
  });

  it('automatically configures webhook on the instance', async () => {
    const req = new NextRequest('http://localhost:3000/api/evolution/link/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sales_member_id: 'sm-bilal', mode: 'qr' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    expect(mocks.setEvolutionWebhook).toHaveBeenCalledWith('fortline_bilal');
  });

  it('saves gateway_instance_id, connecting status, and active webhook_status to fortline_channels', async () => {
    const req = new NextRequest('http://localhost:3000/api/evolution/link/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sales_member_id: 'sm-bilal', mode: 'qr' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    expect(updatedChannels.length).toBe(1);
    const update = updatedChannels[0].payload;
    expect(update.gateway_instance_id).toBe('fortline_bilal');
    expect(update.connection_status).toBe('connecting');
    expect(update.pairing_state).toBe('qrcode');
    expect(update.webhook_status).toBe('active');
    expect(update.updated_at).toBeDefined();
  });

  it('never returns EVOLUTION_API_KEY in response', async () => {
    const req = new NextRequest('http://localhost:3000/api/evolution/link/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sales_member_id: 'sm-bilal', mode: 'qr' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const rawText = await res.text();
    expect(rawText).not.toContain('super_secret_evolution_key_123');
  });
});
