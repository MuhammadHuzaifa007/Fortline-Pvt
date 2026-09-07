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
 * Delete Sales Member record
 */
export async function deleteSalesMember(
  db: SupabaseClient,
  id: string,
  actor: AuditActor,
  accountId?: string | null
): Promise<{ ok: boolean; error?: string }> {
  try {
    // Also remove any linked channels
    let chQuery = db.from('fortline_channels').delete().eq('sales_member_id', id);
    if (accountId) chQuery = chQuery.eq('account_id', accountId);
    await chQuery;

    let query = db.from('fortline_sales_members').delete().eq('id', id);
    if (accountId) query = query.eq('account_id', accountId);

    const { error } = await query;
    if (error) {
      return { ok: false, error: error.message };
    }

    await logFortlineAuditEvent(db, {
      accountId,
      actor,
      action: 'delete_sales_member',
      entityType: 'fortline_sales_member',
      entityId: id,
      details: {},
    });

    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Failed to delete sales member' };
  }
}

/**
 * Bulk replace all sales members with real staff list
 */
export async function bulkReplaceSalesMembers(
  db: SupabaseClient,
  accountId: string,
  members: Array<{
    name: string;
    phone_number: string;
    division?: string;
    designation?: string;
    is_active?: boolean;
  }>,
  actor: AuditActor,
  clearExisting = true
): Promise<{ ok: boolean; count?: number; error?: string }> {
  try {
    if (clearExisting) {
      // First clean channels and sales members for this account
      await db.from('fortline_channels').delete().eq('account_id', accountId);
      const { error: delErr } = await db.from('fortline_sales_members').delete().eq('account_id', accountId);
      if (delErr) {
        return { ok: false, error: delErr.message };
      }
    }

    let count = 0;
    for (let i = 0; i < members.length; i++) {
      const item = members[i];
      const phoneClean = (item.phone_number || '').trim();
      const nameClean = (item.name || '').trim();
      if (!nameClean || !phoneClean) continue;

      const divClean = (item.division || 'General Sales').trim();
      const desigClean = (item.designation || 'Sales Representative').trim();
      const phoneId = `channel_${phoneClean.replace(/[^0-9]/g, '') || (i + 1)}`;

      const { data: memberData, error: insErr } = await db
        .from('fortline_sales_members')
        .insert({
          account_id: accountId,
          name: nameClean,
          division: divClean,
          designation: desigClean,
          phone_number: phoneClean,
          channel_id: phoneId,
          is_active: item.is_active ?? true,
          presence_status: 'unknown',
          presence_source: 'none',
          kpi_profile: {
            first_response_target_min: 15,
            followup_target_hours: 24,
          },
        })
        .select('id')
        .single();

      if (insErr || !memberData) {
        console.error('[bulkReplaceSalesMembers] insert error:', insErr);
        continue;
      }

      await db.from('fortline_channels').insert({
        account_id: accountId,
        sales_member_id: memberData.id,
        phone_number_id: phoneId,
        display_phone_number: phoneClean,
        channel_name: `${nameClean} (${phoneClean})`,
        connection_status: 'disconnected',
        webhook_status: 'pending',
      });

      count++;
    }

    await logFortlineAuditEvent(db, {
      accountId,
      actor,
      action: 'bulk_replace_sales_members',
      entityType: 'fortline_sales_member',
      entityId: accountId,
      details: { count, clearExisting },
    });

    return { ok: true, count };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Bulk replacement failed' };
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
