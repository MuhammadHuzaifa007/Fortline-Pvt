import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getCurrentAccount: vi.fn(),
  getGlobalAiAgentSettings: vi.fn(),
  updateGlobalAiAgentSettings: vi.fn(),
  checkRateLimit: vi.fn(),
  createClient: vi.fn(),
}));

vi.mock('@/lib/auth/account', () => ({
  getCurrentAccount: mocks.getCurrentAccount,
  toErrorResponse: vi.fn((err) => {
    const status = err?.status || 500;
    return Response.json({ error: err?.message || 'error' }, { status });
  }),
}));

vi.mock('@/lib/ai/global-switch', () => ({
  getGlobalAiAgentSettings: mocks.getGlobalAiAgentSettings,
  updateGlobalAiAgentSettings: mocks.updateGlobalAiAgentSettings,
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: mocks.checkRateLimit,
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: mocks.createClient,
}));

import { GET, PATCH } from './route';

const mockContext = {
  supabase: { name: 'mock-supabase' },
  accountId: 'acc-1111-1111-1111-111111111111',
  userId: 'user-1111-1111-1111-111111111111',
  role: 'agent' as const,
  account: { id: 'acc-1111-1111-1111-111111111111', name: 'Test Org' },
};

beforeEach(() => {
  mocks.getCurrentAccount.mockReset();
  mocks.getGlobalAiAgentSettings.mockReset();
  mocks.updateGlobalAiAgentSettings.mockReset();
  mocks.checkRateLimit.mockReset();
  mocks.createClient.mockReset();

  mocks.getCurrentAccount.mockResolvedValue(mockContext);
  mocks.checkRateLimit.mockReturnValue({ success: true, remaining: 2, reset: 0, limit: 3 });
  mocks.createClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-1111', email: 'sales@example.com' } },
        error: null,
      }),
    },
  });
});

describe('GET /api/crm/ai-agent', () => {
  it('rejects unauthenticated requests with 401', async () => {
    mocks.getCurrentAccount.mockRejectedValue({ message: 'Unauthorized', status: 401 });

    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns current AI Agent status for authenticated users', async () => {
    mocks.getGlobalAiAgentSettings.mockResolvedValue({
      ok: true,
      enabled: true,
      updated_at: '2026-08-21T10:00:00.000Z',
      updated_by_email: 'admin@example.com',
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({
      ok: true,
      enabled: true,
      updated_at: '2026-08-21T10:00:00.000Z',
      updated_by_email: 'admin@example.com',
    });
  });
});

describe('PATCH /api/crm/ai-agent', () => {
  it('rejects unauthenticated requests with 401', async () => {
    mocks.getCurrentAccount.mockRejectedValue({ message: 'Unauthorized', status: 401 });

    const req = new Request('http://localhost/api/crm/ai-agent', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: false }),
    });

    const res = await PATCH(req);
    expect(res.status).toBe(401);
  });

  it('rejects invalid or non-boolean body with 400', async () => {
    const req1 = new Request('http://localhost/api/crm/ai-agent', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: 'not-a-bool' }),
    });
    const res1 = await PATCH(req1);
    expect(res1.status).toBe(400);

    const req2 = new Request('http://localhost/api/crm/ai-agent', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const res2 = await PATCH(req2);
    expect(res2.status).toBe(400);
  });

  it('updates AI Agent status and returns new state', async () => {
    mocks.updateGlobalAiAgentSettings.mockResolvedValue({
      ok: true,
      enabled: false,
      updated_at: '2026-08-21T10:05:00.000Z',
      updated_by_email: 'sales@example.com',
    });

    const req = new Request('http://localhost/api/crm/ai-agent', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: false }),
    });

    const res = await PATCH(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({
      ok: true,
      enabled: false,
      updated_at: '2026-08-21T10:05:00.000Z',
      updated_by_email: 'sales@example.com',
    });
    expect(mocks.updateGlobalAiAgentSettings).toHaveBeenCalledWith(false, {
      id: mockContext.userId,
      email: 'sales@example.com',
    });
  });
});
