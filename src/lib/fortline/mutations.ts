import type { SupabaseClient } from '@supabase/supabase-js';
import type { FortlineKpiConfig, FortlineSalesMember } from '@/types/fortline';
import { deleteEvolutionInstance } from '@/lib/evolution/evolution-api';

export interface AuditActor {
  userId?: string;
  email?: string | null;
  role?: string;
  ipAddress?: string | null;
}

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
      actor_email: event.actor.email || 'ceo@fortline.net',
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
    if (error) return { ok: false, error: error.message };

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

export async function deleteSalesMember(
  db: SupabaseClient,
  id: string,
  actor: AuditActor,
  accountId?: string | null
): Promise<{ ok: boolean; error?: string }> {
  try {
    let memberQuery = db
      .from('fortline_sales_members')
      .select('id, name, phone_number')
      .eq('id', id);

    if (accountId) memberQuery = memberQuery.eq('account_id', accountId);

    const { data: member, error: memberError } = await memberQuery.maybeSingle();

    if (memberError) return { ok: false, error: memberError.message };
    if (!member) return { ok: false, error: 'Sales member not found' };

    let channelQuery = db
      .from('fortline_channels')
      .select('id, gateway_instance_id, phone_number_id')
      .eq('sales_member_id', id);

    if (accountId) channelQuery = channelQuery.eq('account_id', accountId);

    const { data: channels, error: channelFetchError } = await channelQuery;
    if (channelFetchError) return { ok: false, error: channelFetchError.message };

    const channelRows = channels || [];
    const channelIds = channelRows
      .map((channel) => channel.id)
      .filter((value): value is string => typeof value === 'string' && !!value);

    const deletedEvolutionInstances: string[] = [];

    for (const channel of channelRows) {
      const instanceName =
        typeof channel.gateway_instance_id === 'string'
          ? channel.gateway_instance_id.trim()
          : '';

      if (!instanceName) continue;

      const evoDelete = await deleteEvolutionInstance(instanceName);

      if (!evoDelete.success && evoDelete.statusCode !== 404) {
        return {
          ok: false,
          error:
            evoDelete.error ||
            `Failed to delete Evolution instance ${instanceName}`,
        };
      }

      deletedEvolutionInstances.push(instanceName);
    }

    let contactDetach = db
      .from('contacts')
      .update({
        assigned_sales_member_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq('assigned_sales_member_id', id);

    if (accountId) contactDetach = contactDetach.eq('account_id', accountId);

    const { error: contactDetachError } = await contactDetach;
    if (contactDetachError) return { ok: false, error: contactDetachError.message };

    let conversationMemberDetach = db
      .from('conversations')
      .update({
        assigned_sales_member_id: null,
        sales_rep_id: null,
        whatsapp_channel_id: null,
      })
      .eq('assigned_sales_member_id', id);

    if (accountId) {
      conversationMemberDetach =
        conversationMemberDetach.eq('account_id', accountId);
    }

    const { error: conversationMemberDetachError } =
      await conversationMemberDetach;

    if (conversationMemberDetachError) {
      return { ok: false, error: conversationMemberDetachError.message };
    }

    if (channelIds.length > 0) {
      let conversationChannelDetach = db
        .from('conversations')
        .update({
          whatsapp_channel_id: null,
          assigned_sales_member_id: null,
          sales_rep_id: null,
        })
        .in('whatsapp_channel_id', channelIds);

      if (accountId) {
        conversationChannelDetach =
          conversationChannelDetach.eq('account_id', accountId);
      }

      const { error: conversationChannelDetachError } =
        await conversationChannelDetach;

      if (conversationChannelDetachError) {
        return { ok: false, error: conversationChannelDetachError.message };
      }
    }

    const { error: messageMemberDetachError } = await db
      .from('messages')
      .update({
        sales_member_id: null,
        sales_rep_id: null,
        whatsapp_channel_id: null,
      })
      .eq('sales_member_id', id);

    if (messageMemberDetachError) {
      return { ok: false, error: messageMemberDetachError.message };
    }

    if (channelIds.length > 0) {
      const { error: messageChannelDetachError } = await db
        .from('messages')
        .update({
          whatsapp_channel_id: null,
          sales_member_id: null,
          sales_rep_id: null,
        })
        .in('whatsapp_channel_id', channelIds);

      if (messageChannelDetachError) {
        return { ok: false, error: messageChannelDetachError.message };
      }
    }

    let chDelete = db
      .from('fortline_channels')
      .delete()
      .eq('sales_member_id', id);

    if (accountId) chDelete = chDelete.eq('account_id', accountId);

    const { error: channelDeleteError } = await chDelete;
    if (channelDeleteError) return { ok: false, error: channelDeleteError.message };

    let memberDelete = db
      .from('fortline_sales_members')
      .delete()
      .eq('id', id);

    if (accountId) memberDelete = memberDelete.eq('account_id', accountId);

    const { error: memberDeleteError } = await memberDelete;
    if (memberDeleteError) return { ok: false, error: memberDeleteError.message };

    await logFortlineAuditEvent(db, {
      accountId,
      actor,
      action: 'delete_sales_member',
      entityType: 'fortline_sales_member',
      entityId: id,
      details: {
        name: member.name,
        phone_number: member.phone_number,
        deleted_channel_ids: channelIds,
        deleted_evolution_instances: deletedEvolutionInstances,
        history_preserved_as_unassigned: true,
      },
    });

    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Failed to delete sales member' };
  }
}

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
      const { data: existingMembers, error: existingError } = await db
        .from('fortline_sales_members')
        .select('id')
        .eq('account_id', accountId);

      if (existingError) return { ok: false, error: existingError.message };

      for (const existing of existingMembers || []) {
        const deleteResult = await deleteSalesMember(
          db,
          existing.id,
          actor,
          accountId
        );

        if (!deleteResult.ok) {
          return {
            ok: false,
            error:
              deleteResult.error ||
              `Failed to safely remove existing sales member ${existing.id}`,
          };
        }
      }
    }

    let count = 0;

    for (const item of members) {
      const phoneClean = (item.phone_number || '').trim();
      const nameClean = (item.name || '').trim();
      if (!nameClean || !phoneClean) continue;

      const divClean = (item.division || 'General Sales').trim();
      const desigClean =
        (item.designation || 'Sales Representative').trim();

      const { error: insErr } = await db
        .from('fortline_sales_members')
        .insert({
          account_id: accountId,
          name: nameClean,
          division: divClean,
          designation: desigClean,
          phone_number: phoneClean,
          channel_id: null,
          is_active: item.is_active ?? true,
          presence_status: 'unknown',
          presence_source: 'none',
          kpi_profile: {
            first_response_target_min: 15,
            followup_target_hours: 24,
          },
        });

      if (insErr) {
        console.error('[bulkReplaceSalesMembers] insert error:', insErr);
        continue;
      }

      count++;
    }

    await logFortlineAuditEvent(db, {
      accountId,
      actor,
      action: 'bulk_replace_sales_members',
      entityType: 'fortline_sales_member',
      entityId: accountId,
      details: {
        count,
        clearExisting,
        channels_auto_provision_on_link: true,
      },
    });

    return { ok: true, count };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Bulk replacement failed' };
  }
}

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

    if (error) return { ok: false, error: error.message };

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
