import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  getEvolutionConnectionState: vi.fn(),
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
  getEvolutionConnectionState: mocks.getEvolutionConnectionState,
}));

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: mocks.supabaseAdmin,
}));

import { GET } from './route';

describe('GET /api/evolution/link/status', () => {
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
      },
      {
        id: 'sm-no-instance',
        account_id: 'acct-1',
        name: 'No Instance Rep',
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
        id: 'chan-no-instance',
        account_id: 'acct-1',
        sales_member_id: 'sm-no-instance',
        channel_type: 'qr_gateway',
        gateway_instance_id: null,
        connection_status: 'disconnected',
        pairing_state: 'disconnected',
      },
    ];

    updatedChannels = [];

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

    const req = new NextRequest('http://localhost:3000/api/evolution/link/status?sales_member_id=sm-bilal');
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it('rejects missing sales_member_id with 400', async () => {
    const req = new NextRequest('http://localhost:3000/api/evolution/link/status');
    const res = await GET(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/sales_member_id is required/);
  });

  it('returns 404 when sales member does not exist', async () => {
    const req = new NextRequest('http://localhost:3000/api/evolution/link/status?sales_member_id=sm-unknown');
    const res = await GET(req);
    expect(res.status).toBe(404);
  });

  it('returns disconnected when channel has missing gateway_instance_id', async () => {
    const req = new NextRequest('http://localhost:3000/api/evolution/link/status?sales_member_id=sm-no-instance');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.state).toBe('disconnected');
    expect(mocks.getEvolutionConnectionState).not.toHaveBeenCalled();
  });

  it('returns connecting status without overwriting DB to disconnected', async () => {
    mocks.getEvolutionConnectionState.mockResolvedValueOnce({
      success: true,
      state: 'connecting',
    });

    const req = new NextRequest('http://localhost:3000/api/evolution/link/status?sales_member_id=sm-bilal');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.ok).toBe(true);
    expect(json.state).toBe('connecting');
    expect(json.instance).toBe('fortline_bilal');

    // Should NOT update DB to disconnected
    expect(updatedChannels.length).toBe(0);
  });

  it('handles connected state and updates DB', async () => {
    mocks.getEvolutionConnectionState.mockResolvedValueOnce({
      success: true,
      state: 'open',
    });

    const req = new NextRequest('http://localhost:3000/api/evolution/link/status?sales_member_id=sm-bilal');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.ok).toBe(true);
    expect(json.state).toBe('connected');

    expect(updatedChannels.length).toBe(1);
    const update = updatedChannels[0].payload;
    expect(update.connection_status).toBe('connected');
    expect(update.pairing_state).toBe('connected');
    expect(update.webhook_status).toBe('active');
    expect(update.last_successful_event_at).toBeDefined();
  });

  it('handles disconnected state and updates DB', async () => {
    mocks.getEvolutionConnectionState.mockResolvedValueOnce({
      success: true,
      state: 'close',
    });

    const req = new NextRequest('http://localhost:3000/api/evolution/link/status?sales_member_id=sm-bilal');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.ok).toBe(true);
    expect(json.state).toBe('disconnected');

    expect(updatedChannels.length).toBe(1);
    const update = updatedChannels[0].payload;
    expect(update.connection_status).toBe('disconnected');
    expect(update.pairing_state).toBe('disconnected');
  });

  it('never returns EVOLUTION_API_KEY in response', async () => {
    mocks.getEvolutionConnectionState.mockResolvedValueOnce({
      success: true,
      state: 'open',
      data: { key: 'super_secret_evolution_key_123' },
    });

    const req = new NextRequest('http://localhost:3000/api/evolution/link/status?sales_member_id=sm-bilal');
    const res = await GET(req);
    const raw = await res.text();
    expect(raw).not.toContain('super_secret_evolution_key_123');
  });
});
