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

const SENSITIVE_KEYS = new Set([
  "password",
  "login_temporary_password",
  "temporary_password",
  "secret",
  "api_key",
  "apikey",
  "token",
  "authorization",
  "credit_card",
  "pin",
]);

function redactSensitiveData(
  obj: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (!obj || typeof obj !== "object") return null;
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      cleaned[key] = "[REDACTED]";
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      cleaned[key] = redactSensitiveData(value as Record<string, unknown>);
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

/**
 * Append an entry to the itechskill_audit_log table.
 *
 * Fully awaited and transactionally enforced. Sensitive data (passwords,
 * secrets, tokens) are automatically redacted prior to database insertion.
 */
export async function writeAuditLog(
  entry: AuditEntry,
  options: { required?: boolean } = { required: false },
): Promise<void> {
  const db = supabaseAdmin();
  const reqId = entry.requestId ?? generateRequestId();
  const sanitizedBefore = redactSensitiveData(entry.beforeState);
  const sanitizedAfter = redactSensitiveData(entry.afterState);

  const { error } = await db.from("itechskill_audit_log").insert({
    actor_user_id: entry.actorUserId || "system:unknown",
    actor_role: entry.actorRole || "system",
    action: entry.action,
    entity_type: entry.entityType,
    entity_id: entry.entityId,
    before_state: sanitizedBefore,
    after_state: sanitizedAfter,
    reason: entry.reason ?? null,
    request_id: reqId,
  });

  if (error) {
    console.error("[writeAuditLog] transactional audit record insert error:", error.message);
    if (options.required) {
      throw new Error(`Audit log insertion failed: ${error.message}`);
    }
  }
}
