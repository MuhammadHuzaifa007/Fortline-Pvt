import { SupabaseClient } from '@supabase/supabase-js'
import { supabaseAdmin } from './admin-client'

export interface GlobalAiAgentSettings {
  ok: boolean
  enabled: boolean
  updated_at: string
  updated_by_email: string | null
  updated_by_user_id?: string | null
}

/**
 * Read the company-wide global AI Agent toggle.
 * Defaults to `enabled: true` (fail-open) if the table is uninitialized or unreadable.
 */
export async function getGlobalAiAgentSettings(
  client?: SupabaseClient
): Promise<GlobalAiAgentSettings> {
  const db = client ?? supabaseAdmin()

  try {
    const { data, error } = await db
      .from('crm_ai_agent_settings')
      .select('enabled, updated_at, updated_by_email, updated_by_user_id')
      .eq('id', 1)
      .maybeSingle()

    if (error || !data) {
      if (error) {
        console.error('[global-switch] error reading settings:', error)
      }
      return {
        ok: true,
        enabled: true,
        updated_at: new Date().toISOString(),
        updated_by_email: null,
        updated_by_user_id: null,
      }
    }

    return {
      ok: true,
      enabled: Boolean(data.enabled),
      updated_at: data.updated_at || new Date().toISOString(),
      updated_by_email: data.updated_by_email || null,
      updated_by_user_id: data.updated_by_user_id || null,
    }
  } catch (err) {
    console.error('[global-switch] unexpected error reading settings:', err)
    return {
      ok: true,
      enabled: true,
      updated_at: new Date().toISOString(),
      updated_by_email: null,
      updated_by_user_id: null,
    }
  }
}

/**
 * Update the global AI Agent toggle.
 * Writes to:
 * 1. `crm_ai_agent_settings` (CRM source of truth)
 * 2. `crm_ai_agent_audit_logs` (audit history)
 */
export async function updateGlobalAiAgentSettings(
  enabled: boolean,
  user: { id: string; email?: string | null },
  client?: SupabaseClient
): Promise<GlobalAiAgentSettings> {
  const db = client ?? supabaseAdmin()
  const nowIso = new Date().toISOString()

  // 1. Get current state for audit log
  let oldEnabled: boolean | null = null
  try {
    const current = await getGlobalAiAgentSettings(db)
    oldEnabled = current.enabled
  } catch {
    // Non-fatal
  }

  // 2. Upsert CRM settings
  const { data: updatedSettings, error: settingsError } = await db
    .from('crm_ai_agent_settings')
    .upsert(
      {
        id: 1,
        enabled,
        updated_at: nowIso,
        updated_by_user_id: user.id,
        updated_by_email: user.email || null,
      },
      { onConflict: 'id' }
    )
    .select('enabled, updated_at, updated_by_email, updated_by_user_id')
    .single()

  if (settingsError) {
    console.error('[global-switch] failed to update crm_ai_agent_settings:', settingsError)
    throw new Error('Failed to update AI Agent settings')
  }


  // 4. Record audit log
  try {
    await db.from('crm_ai_agent_audit_logs').insert({
      old_enabled: oldEnabled,
      new_enabled: enabled,
      changed_by_user_id: user.id,
      changed_by_email: user.email || null,
      created_at: nowIso,
    })
  } catch (auditError) {
    console.error('[global-switch] non-fatal: failed to insert audit log:', auditError)
  }

  return {
    ok: true,
    enabled: Boolean(updatedSettings.enabled),
    updated_at: updatedSettings.updated_at,
    updated_by_email: updatedSettings.updated_by_email,
    updated_by_user_id: updatedSettings.updated_by_user_id,
  }
}
