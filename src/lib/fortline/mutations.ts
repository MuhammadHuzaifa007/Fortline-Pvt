import type { SupabaseClient } from '@supabase/supabase-js';
import type { FortlineKpiConfig, FortlineSalesMember } from '@/types/fortline';

export interface AuditActor {
  userId?: string;
  email?: string | null;
  role?: string;
  ipAddress?: string | null;
}

/**
 * Log CEO operations and mutations to fortline_audit_log
 */
export async function logFortlineAuditEvent(
  db: SupabaseClient,
  event: {
    accountId?: string | null;
    actor: AuditActor;
    action: string;
    entityType: string;
    entityId: string;
    details?: Record<string, unknown>;
  }
) {
  try {
    await db.from('fortline_audit_log').insert({
      account_id: event.accountId || null,
      actor_email: event.actor.email || 'ceo@fortline.com',
      actor_role: event.actor.role || 'ceo',
      action: event.action,
      entity_type: event.entityType,
      entity_id: event.entityId,
      details: event.details || {},
      ip_address: event.actor.ipAddress || null,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[logFortlineAuditEvent] non-fatal audit insert failed:', err);
  }
}

/**
 * Update Sales Member record
 */
export async function updateSalesMember(
  db: SupabaseClient,
  id: string,
  updates: Partial<FortlineSalesMember>,
  actor: AuditActor,
  accountId?: string | null
): Promise<{ ok: boolean; data?: FortlineSalesMember; error?: string }> {
  try {
    let query = db
      .from('fortline_sales_members')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (accountId) query = query.eq('account_id', accountId);

    const { data, error } = await query.select().single();
    if (error) {
      return { ok: false, error: error.message };
    }

    await logFortlineAuditEvent(db, {
      accountId,
      actor,
      action: 'update_sales_member',
      entityType: 'fortline_sales_member',
      entityId: id,
      details: updates as Record<string, unknown>,
    });

    return { ok: true, data };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Failed to update sales member' };
  }
}

/**
 * Update Fortline KPI & SLA configuration
 */
export async function updateKpiConfig(
  db: SupabaseClient,
  updates: Partial<FortlineKpiConfig>,
  actor: AuditActor,
  accountId?: string | null
): Promise<{ ok: boolean; data?: FortlineKpiConfig; error?: string }> {
  try {
    const { data, error } = await db
      .from('fortline_kpi_config')
      .upsert({
        id: 1,
        ...updates,
        account_id: accountId || null,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return { ok: false, error: error.message };
    }

    await logFortlineAuditEvent(db, {
      accountId,
      actor,
      action: 'update_kpi_config',
      entityType: 'fortline_kpi_config',
      entityId: '1',
      details: updates as Record<string, unknown>,
    });

    return { ok: true, data };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Failed to update KPI config' };
  }
}

/**
 * Update WhatsApp Channel mapping
 */
export async function updateChannel(
  db: SupabaseClient,
  id: string,
  updates: {
    sales_member_id?: string | null;
    display_phone_number?: string;
    connection_status?: 'connected' | 'disconnected';
    webhook_status?: 'active' | 'degraded' | 'failing' | 'pending';
  },
  actor: AuditActor,
  accountId?: string | null
): Promise<{ ok: boolean; error?: string }> {
  try {
    let query = db
      .from('fortline_channels')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (accountId) query = query.eq('account_id', accountId);

    const { error } = await query;
    if (error) return { ok: false, error: error.message };

    await logFortlineAuditEvent(db, {
      accountId,
      actor,
      action: 'update_channel',
      entityType: 'fortline_channel',
      entityId: id,
      details: updates,
    });

    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Failed to update channel' };
  }
}
