import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  supabaseAdmin: vi.fn(),
}));

vi.mock('@/lib/auth/account', () => ({
  requireRole: mocks.requireRole,
  toErrorResponse: vi.fn((err) => {
    const status = err?.status || 500;
    return Response.json({ error: err?.message || 'error' }, { status });
  }),
}));

vi.mock('@/lib/automations/admin-client', () => ({
  supabaseAdmin: mocks.supabaseAdmin,
}));

import { GET } from './route';

const mockContext = {
  accountId: 'account-1111-1111-1111-111111111111',
  userId: 'admin-1111-1111-1111-111111111111',
  role: 'admin' as const,
  account: { id: 'account-1111-1111-1111-111111111111', name: 'Test Org' },
};

beforeEach(() => {
  mocks.requireRole.mockReset();
  mocks.supabaseAdmin.mockReset();
  mocks.requireRole.mockResolvedValue(mockContext);
});

describe('GET /api/account/call-stats', () => {
  it('enforces admin role requirement (403 for non-admin)', async () => {
    mocks.requireRole.mockRejectedValue({ message: 'Forbidden', status: 403 });
    const res = await GET();
    expect(res.status).toBe(403);
    expect(mocks.requireRole).toHaveBeenCalledWith('admin');
  });

  it('returns stats from agent_call_stats view when available', async () => {
    const mockStats = [
      {
        user_id: 'agent-1',
        agent_name: 'Sajid Khan',
        account_role: 'agent',
        presence: 'online',
        total_calls: 14,
        answered_calls: 11,
        unanswered_calls: 3,
        total_talk_seconds: 1440,
        avg_call_seconds: 130,
        last_call_at: '2026-08-19T09:00:00Z',
        calls_last_24h: 2,
      },
    ];

    mocks.supabaseAdmin.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockStats, error: null }),
      }),
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.stats).toHaveLength(1);
    expect(data.stats[0]).toEqual({
      user_id: 'agent-1',
      agent_name: 'Sajid Khan',
      account_role: 'agent',
      presence: 'online',
      total_calls: 14,
      answered_calls: 11,
      unanswered_calls: 3,
      total_talk_seconds: 1440,
      avg_call_seconds: 130,
      last_call_at: '2026-08-19T09:00:00Z',
      calls_last_24h: 2,
    });
  });
});
