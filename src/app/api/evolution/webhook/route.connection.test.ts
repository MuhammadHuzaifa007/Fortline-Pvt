import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  supabaseAdmin: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: mocks.supabaseAdmin,
}));

import { GET, POST, classifyConnectionEvent } from './route';

interface MockDbState {
  channels: any[];
  auditLogs: any[];
  notifications: any[];
  accountMembers: any[];
  updatedChannels: any[];
  updatedNotifications: any[];
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
            if (table === 'fortline_channels') {
              state.updatedChannels.push({ filter: { col, val }, payload: updatePayload });
            } else if (table === 'notifications') {
              state.updatedNotifications.push({ filter: { col, val }, payload: updatePayload });
            }
          }
          return chain;
        }),
        is: vi.fn(() => chain),
        limit: vi.fn(() => chain),
        update: vi.fn((payload: any) => {
          updatePayload = payload;
          return chain;
        }),
        insert: vi.fn((payload: any) => {
          insertPayload = payload;
          if (table === 'fortline_audit_log') {
            state.auditLogs.push(payload);
          } else if (table === 'notifications') {
            state.notifications.push(payload);
          }
          return chain;
        }),
        maybeSingle: vi.fn(async () => {
          let collection: any[] = [];
          if (table === 'fortline_channels') collection = state.channels;
          else if (table === 'account_members') collection = state.accountMembers;

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

describe('Connection Event Classification & Webhook Route', () => {
  describe('classifyConnectionEvent unit rules', () => {
    it('accurately classifies status 401 as confirmed_logout', () => {
      const result = classifyConnectionEvent('connection.update', {
        state: 'close',
        statusReason: 401,
      });

      expect(result.classification).toBe('confirmed_logout');
      expect(result.isManualLogout).toBe(true);
      expect(result.statusCode).toBe(401);
      expect(result.severity).toBe('critical');
      expect(result.label).toContain('Confirmed Session Invalidation');
      expect(result.description).toContain('Logged Out');
    });

    it('accurately classifies status 408 as temporary_timeout and never as manual logout', () => {
      const result = classifyConnectionEvent('connection.update', {
        state: 'close',
        statusReason: 408,
      });

      expect(result.classification).toBe('temporary_timeout');
      expect(result.isManualLogout).toBe(false);
      expect(result.statusCode).toBe(408);
      expect(result.severity).toBe('warning');
      expect(result.label).toContain('Temporary Connection Interruption');
      expect(result.description).toContain('NOT a manual logout');
    });

    it('accurately classifies string "connection_lost" as temporary_timeout', () => {
      const result = classifyConnectionEvent('connection.update', {
        state: 'close',
        reason: 'Connection Lost',
      });

      expect(result.classification).toBe('temporary_timeout');
      expect(result.isManualLogout).toBe(false);
      expect(result.severity).toBe('warning');
    });

    it('accurately classifies state "open" as connected', () => {
      const result = classifyConnectionEvent('connection.update', {
        state: 'open',
        statusReason: 200,
      });

      expect(result.classification).toBe('connected');
      expect(result.isManualLogout).toBe(false);
      expect(result.label).toBe('Connected');
    });
  });

  describe('POST webhook execution on connection events', () => {
    let dbState: MockDbState;

    const TEST_CHANNEL = {
      id: 'chan-001',
      account_id: 'acc-001',
      sales_member_id: 'rep-001',
      phone_number_id: 'phone-001',
      display_phone_number: '+923001234567',
      gateway_instance_id: 'fortline_rep_001',
      pairing_state: 'connected',
      connection_status: 'connected',
      gateway_metadata: {},
      sales_member: { id: 'rep-001', name: 'Zeeshan Ali' },
    };

    beforeEach(() => {
      vi.restoreAllMocks();
      dbState = {
        channels: [{ ...TEST_CHANNEL }],
        auditLogs: [],
        notifications: [],
        accountMembers: [{ user_id: 'ceo-user-id', account_id: 'acc-001', role: 'owner' }],
        updatedChannels: [],
        updatedNotifications: [],
      };
      mocks.supabaseAdmin.mockImplementation(() => createMockSupabase(dbState));
    });

    it('handles status 401: wipes pairing_state, logs session invalidation audit, and alerts CEO', async () => {
      const payload = {
        event: 'connection.update',
        instance: 'fortline_rep_001',
        data: {
          state: 'close',
          statusReason: 401,
        },
      };

      const req = new NextRequest('http://localhost:3000/api/evolution/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      // Verify channel updated
      expect(dbState.updatedChannels.length).toBeGreaterThan(0);
      const channelUpdate = dbState.updatedChannels[0].payload;
      expect(channelUpdate.connection_status).toBe('disconnected');
      expect(channelUpdate.pairing_state).toBe('disconnected');
      expect(channelUpdate.gateway_metadata.disconnect_classification).toBe('confirmed_logout');
      expect(channelUpdate.gateway_metadata.is_manual_logout).toBe(true);

      // Verify audit log created
      expect(dbState.auditLogs.length).toBe(1);
      expect(dbState.auditLogs[0].action).toBe('channel_session_invalidated');
      expect(dbState.auditLogs[0].details.status_code).toBe(401);
      expect(dbState.auditLogs[0].details.is_manual_logout).toBe(true);

      // Verify critical notification created
      expect(dbState.notifications.length).toBe(1);
      expect(dbState.notifications[0].severity).toBe('critical');
      expect(dbState.notifications[0].type).toBe('channel_disconnected');
      expect(dbState.notifications[0].title).toContain('Zeeshan Ali');
    });

    it('handles status 408: does NOT wipe pairing_state, logs network timeout without manual logout label', async () => {
      const payload = {
        event: 'connection.update',
        instance: 'fortline_rep_001',
        data: {
          state: 'close',
          statusReason: 408,
        },
      };

      const req = new NextRequest('http://localhost:3000/api/evolution/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      // Verify channel updated
      expect(dbState.updatedChannels.length).toBeGreaterThan(0);
      const channelUpdate = dbState.updatedChannels[0].payload;
      expect(channelUpdate.connection_status).toBe('disconnected');
      // Crucial requirement: pairing_state is preserved, NOT wiped to disconnected!
      expect(channelUpdate.pairing_state).toBeUndefined();
      expect(channelUpdate.gateway_metadata.disconnect_classification).toBe('temporary_timeout');
      expect(channelUpdate.gateway_metadata.is_manual_logout).toBe(false);

      // Verify audit log created
      expect(dbState.auditLogs.length).toBe(1);
      expect(dbState.auditLogs[0].action).toBe('channel_connection_interrupted');
      expect(dbState.auditLogs[0].details.status_code).toBe(408);
      expect(dbState.auditLogs[0].details.is_manual_logout).toBe(false);

      // Verify warning notification created
      expect(dbState.notifications.length).toBe(1);
      expect(dbState.notifications[0].severity).toBe('warning');
      expect(dbState.notifications[0].type).toBe('channel_warning');
      expect(dbState.notifications[0].body).toContain('NOT a manual logout');
    });

    it('handles open state: sets connected and resolves notifications', async () => {
      const payload = {
        event: 'connection.update',
        instance: 'fortline_rep_001',
        data: {
          state: 'open',
          statusReason: 200,
        },
      };

      const req = new NextRequest('http://localhost:3000/api/evolution/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      expect(dbState.updatedChannels.length).toBeGreaterThan(0);
      const channelUpdate = dbState.updatedChannels[0].payload;
      expect(channelUpdate.connection_status).toBe('connected');
      expect(channelUpdate.pairing_state).toBe('connected');

      // Verify notification resolved
      expect(dbState.updatedNotifications.length).toBeGreaterThan(0);
      expect(dbState.updatedNotifications[0].payload.read).toBe(true);
      expect(dbState.updatedNotifications[0].payload.resolved_at).toBeDefined();
    });
  });
});
