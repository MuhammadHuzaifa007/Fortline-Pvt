// ============================================================
// Operations audit log — write-only append log for every CRM
// mutation that touches an iTechSkill operational record.
//
// Uses supabaseAdmin() because the itechskill_audit_log table
// lives outside the CRM's RLS-scoped schema. The actor identity
// comes from the authenticated AccountContext, not from the
// Supabase session — so every entry is traceable to a CRM user
// + role without relying on auth.uid().
// ============================================================

import { supabaseAdmin } from "@/lib/flows/admin-client";
import { randomUUID } from "crypto";

export interface AuditEntry {
  actorUserId: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
  reason?: string | null;
  requestId?: string | null;
}

/**
 * Generate a unique request ID for idempotency and traceability.
 * Used by mutation handlers to tag both the side-effect and the
 * audit log entry with the same ID.
 */
export function generateRequestId(): string {
  return `crm_${randomUUID().replace(/-/g, "").slice(0, 16)}_${Date.now()}`;
}

/**
 * Append an entry to the itechskill_audit_log table.
 *
 * This is fire-and-forget by design — a failed audit write must
 * not block the primary operation. Errors are logged to stderr
 * for ops visibility but never surfaced to the caller.
 */
export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  const db = supabaseAdmin();
  const { error } = await db.from("itechskill_audit_log").insert({
    actor_user_id: entry.actorUserId,
    actor_role: entry.actorRole,
    action: entry.action,
    entity_type: entry.entityType,
    entity_id: entry.entityId,
    before_state: entry.beforeState ?? null,
    after_state: entry.afterState ?? null,
    reason: entry.reason ?? null,
    request_id: entry.requestId ?? generateRequestId(),
  });

  if (error) {
    console.error("[writeAuditLog] transactional audit record insert error:", error.message);
  }
}
