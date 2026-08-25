import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getGlobalAiAgentSettings: vi.fn(),
  createClient: vi.fn(),
}));

vi.mock('@/lib/ai/global-switch', () => ({
  getGlobalAiAgentSettings: mocks.getGlobalAiAgentSettings,
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: mocks.createClient,
}));

import { GET } from './route';

beforeEach(() => {
  mocks.getGlobalAiAgentSettings.mockReset();
  mocks.createClient.mockReset();

  mocks.getGlobalAiAgentSettings.mockResolvedValue({
    ok: true,
    enabled: true,
    updated_at: '2026-08-21T10:00:00.000Z',
    updated_by_email: 'admin@example.com',
  });

  mocks.createClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      }),
    },
  });

  process.env.N8N_CRM_WEBHOOK_SECRET = 'test-crm-secret-123';
});

describe('GET /api/crm/ai-agent/status', () => {
  it('authenticates with x-itechskill-crm-secret header and returns status', async () => {
    const req = new Request('http://localhost/api/crm/ai-agent/status', {
      headers: {
        'x-itechskill-crm-secret': 'test-crm-secret-123',
      },
    });

    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({
      ok: true,
      enabled: true,
      updated_at: '2026-08-21T10:00:00.000Z',
    });
  });

  it('rejects unauthorized request with wrong secret', async () => {
    const req = new Request('http://localhost/api/crm/ai-agent/status', {
      headers: {
        'x-itechskill-crm-secret': 'wrong-secret',
      },
    });

    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('allows authenticated browser session without secret header', async () => {
    mocks.createClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-111' } },
          error: null,
        }),
      },
    });

    const req = new Request('http://localhost/api/crm/ai-agent/status');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
  });
});
