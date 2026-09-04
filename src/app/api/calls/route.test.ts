import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  getCurrentAccount: vi.fn(),
  supabaseAdmin: vi.fn(),
}));

vi.mock('@/lib/auth/account', () => ({
  requireRole: mocks.requireRole,
  getCurrentAccount: mocks.getCurrentAccount,
  toErrorResponse: vi.fn((err) => {
    const status = err?.status || 500;
    return Response.json({ error: err?.message || 'error' }, { status });
  }),
}));

vi.mock('@/lib/automations/admin-client', () => ({
  supabaseAdmin: mocks.supabaseAdmin,
}));

import { GET, POST } from './route';

const VALID_CONTACT_ID = '11111111-1111-4111-8111-111111111111';
const VALID_CONV_ID = '22222222-2222-4222-8222-222222222222';

const mockContext = {
  supabase: {
    from: vi.fn(),
  },
  accountId: 'account-1111-1111-1111-111111111111',
  userId: 'agent-1111-1111-1111-111111111111',
  role: 'agent' as const,
  account: { id: 'account-1111-1111-1111-111111111111', name: 'Test Org' },
};

function makePostRequest(body: unknown) {
  return new Request('http://localhost/api/calls', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeGetRequest(url: string) {
  return new Request(url, {
    method: 'GET',
  });
}

beforeEach(() => {
  mocks.requireRole.mockReset();
  mocks.getCurrentAccount.mockReset();
  mocks.supabaseAdmin.mockReset();
  mocks.requireRole.mockResolvedValue(mockContext);
  mocks.getCurrentAccount.mockResolvedValue(mockContext);
});

describe('POST /api/calls', () => {
  it('enforces role requirement and rejects unauthorized callers', async () => {
    mocks.requireRole.mockRejectedValue({ message: 'Forbidden', status: 403 });
    const res = await POST(makePostRequest({ contact_id: VALID_CONTACT_ID }));
    expect(res.status).toBe(403);
    expect(mocks.requireRole).toHaveBeenCalledWith('agent');
  });

  it('rejects missing or invalid contact_id with 400', async () => {
    const res = await POST(makePostRequest({ contact_id: 'not-a-uuid' }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('valid contact_id');
  });

  it('rejects contact not found in account with 400', async () => {
    mockContext.supabase.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    });

    const res = await POST(makePostRequest({ contact_id: VALID_CONTACT_ID }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('Contact not found');
  });

  it('rejects invalid enum values with 400', async () => {
    mockContext.supabase.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: VALID_CONTACT_ID }, error: null }),
    });

    const res1 = await POST(makePostRequest({
      contact_id: VALID_CONTACT_ID,
      direction: 'invalid-dir',
    }));
    expect(res1.status).toBe(400);

    const res2 = await POST(makePostRequest({
      contact_id: VALID_CONTACT_ID,
      call_method: 'carrier-pigeon',
    }));
    expect(res2.status).toBe(400);

    const res3 = await POST(makePostRequest({
      contact_id: VALID_CONTACT_ID,
      outcome: 'hangup',
    }));
    expect(res3.status).toBe(400);
  });

  it('rejects negative or excessive duration_seconds with 400', async () => {
    mockContext.supabase.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: VALID_CONTACT_ID }, error: null }),
    });

    const res = await POST(makePostRequest({
      contact_id: VALID_CONTACT_ID,
      duration_seconds: -10,
    }));
    expect(res.status).toBe(400);
  });

  it('creates call successfully and forces duration 0 for missed call', async () => {
    mockContext.supabase.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: VALID_CONTACT_ID }, error: null }),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
    });

    const insertMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'call-1',
            contact_id: VALID_CONTACT_ID,
            direction: 'missed',
            duration_seconds: 0,
            outcome: 'no_answer',
          },
          error: null,
        }),
      }),
    });

    mocks.supabaseAdmin.mockReturnValue({
      from: vi.fn().mockReturnValue({
        insert: insertMock,
      }),
    });

    const res = await POST(makePostRequest({
      contact_id: VALID_CONTACT_ID,
      direction: 'missed',
      duration_seconds: 120, // should be forced to 0
      outcome: 'no_answer',
    }));

    expect(res.status).toBe(201);
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        direction: 'missed',
        duration_seconds: 0,
      }),
    );
  });

  it('handles other call_method and saves custom_platform', async () => {
    mockContext.supabase.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: VALID_CONTACT_ID }, error: null }),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
    });

    const insertMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'call-1',
            contact_id: VALID_CONTACT_ID,
            call_method: 'other',
            custom_platform: 'Instagram',
          },
          error: null,
        }),
      }),
    });

    mocks.supabaseAdmin.mockReturnValue({
      from: vi.fn().mockImplementation((t) => {
        if (t === 'calls') {
          return { insert: insertMock };
        }
        return {};
      }),
    });

    const res = await POST(makePostRequest({
      contact_id: VALID_CONTACT_ID,
      call_method: 'other',
      custom_platform: 'Instagram',
    }));

    expect(res.status).toBe(201);
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        call_method: 'other',
        custom_platform: 'Instagram',
      }),
    );
  });

  it('handles spam outcome and flags contact as spam', async () => {
    mockContext.supabase.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: VALID_CONTACT_ID }, error: null }),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
    });

    const insertMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'call-1',
            contact_id: VALID_CONTACT_ID,
            outcome: 'spam',
          },
          error: null,
        }),
      }),
    });

    const updateMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    mocks.supabaseAdmin.mockReturnValue({
      from: vi.fn().mockImplementation((t) => {
        if (t === 'calls') {
          return { insert: insertMock };
        }
        if (t === 'contacts') {
          return { update: updateMock };
        }
        return {};
      }),
    });

    const res = await POST(makePostRequest({
      contact_id: VALID_CONTACT_ID,
      outcome: 'spam',
    }));

    expect(res.status).toBe(201);
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: 'spam',
      }),
    );
    expect(updateMock).toHaveBeenCalledWith({ is_spam: true });
  });
});

describe('GET /api/calls', () => {
  it('rejects missing contact_id with 400', async () => {
    const res = await GET(makeGetRequest('http://localhost/api/calls'));
    expect(res.status).toBe(400);
  });

  it('returns calls and calculated summary for contact', async () => {
    const mockCalls = [
      {
        id: 'call-1',
        agent_id: 'agent-1',
        direction: 'outgoing',
        call_method: 'phone',
        duration_seconds: 120,
        outcome: 'answered',
        call_started_at: '2026-08-19T10:00:00Z',
      },
      {
        id: 'call-2',
        agent_id: 'agent-1',
        direction: 'missed',
        call_method: 'phone',
        duration_seconds: 0,
        outcome: 'no_answer',
        call_started_at: '2026-08-18T10:00:00Z',
      },
    ];

    mockContext.supabase.from = vi.fn().mockImplementation((table: string) => {
      if (table === 'contacts') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: { id: VALID_CONTACT_ID }, error: null }),
        };
      }
      if (table === 'calls') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: mockCalls, error: null }),
        };
      }
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({
            data: [{ user_id: 'agent-1', full_name: 'Jane Doe' }],
            error: null,
          }),
        };
      }
      return {};
    });

    const res = await GET(
      makeGetRequest(`http://localhost/api/calls?contact_id=${VALID_CONTACT_ID}`),
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.calls).toHaveLength(2);
    expect(data.calls[0].agent).toEqual({ id: 'agent-1', full_name: 'Jane Doe' });
    expect(data.summary).toEqual({
      total_calls: 2,
      answered: 1,
      missed_or_unanswered: 1,
      total_talk_seconds: 120,
      last_call_at: '2026-08-19T10:00:00Z',
    });
  });
});
