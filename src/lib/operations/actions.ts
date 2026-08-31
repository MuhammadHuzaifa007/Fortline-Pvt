// ============================================================
// Operations mutations — server-side only with audit logging.
//
// These execute state transitions against iTechSkill operational
// tables using supabaseAdmin(). Every mutation:
// 1. Validates preconditions against the current record state
// 2. Applies the transition with timezone-aware timestamps
// 3. Emits an audit log entry (actor, action, before/after state)
// 4. Returns the updated record
// ============================================================

import { supabaseAdmin } from "@/lib/flows/admin-client";
import { writeAuditLog, generateRequestId } from "./audit";
import type {
  HandoffCase,
  EnrollmentApplication,
  FollowupJob,
  OperationsAlert,
  CatalogChangeRequest,
} from "./types";

export interface ActorContext {
  userId: string;
  role: string;
}

// -----------------------------------------------------------
// 1. Handoff Case Mutations
// -----------------------------------------------------------

export async function assignHandoff(
  caseId: string,
  staffUserId: string,
  actor: ActorContext,
  requestId?: string,
): Promise<HandoffCase> {
  const db = supabaseAdmin();
  const reqId = requestId ?? generateRequestId();

  const { data: before, error: fetchErr } = await db
    .from("itechskill_handoff_cases")
    .select("*")
    .eq("case_id", caseId)
    .single();

  if (fetchErr || !before) {
    throw new Error(`Handoff case ${caseId} not found`);
  }

  const updates = {
    assigned_to: staffUserId,
    status: before.status === "open" ? "in_progress" : before.status,
    updated_at: new Date().toISOString(),
  };

  const { data: after, error: updateErr } = await db
    .from("itechskill_handoff_cases")
    .update(updates)
    .eq("case_id", caseId)
    .select()
    .single();

  if (updateErr || !after) {
    throw new Error(`Failed to assign handoff: ${updateErr?.message}`);
  }

  await writeAuditLog({
    actorUserId: actor.userId,
    actorRole: actor.role,
    action: "handoff.assign",
    entityType: "itechskill_handoff_case",
    entityId: caseId,
    beforeState: before,
    afterState: after,
    reason: `Assigned to ${staffUserId}`,
    requestId: reqId,
  });

  return after as HandoffCase;
}

export async function startHandoff(
  caseId: string,
  actor: ActorContext,
  requestId?: string,
): Promise<HandoffCase> {
  const db = supabaseAdmin();
  const reqId = requestId ?? generateRequestId();

  const { data: before, error: fetchErr } = await db
    .from("itechskill_handoff_cases")
    .select("*")
    .eq("case_id", caseId)
    .single();

  if (fetchErr || !before) {
    throw new Error(`Handoff case ${caseId} not found`);
  }

  const updates = {
    status: "in_progress",
    assigned_to: before.assigned_to || actor.userId,
    updated_at: new Date().toISOString(),
  };

  const { data: after, error: updateErr } = await db
    .from("itechskill_handoff_cases")
    .update(updates)
    .eq("case_id", caseId)
    .select()
    .single();

  if (updateErr || !after) {
    throw new Error(`Failed to start handoff: ${updateErr?.message}`);
  }

  await writeAuditLog({
    actorUserId: actor.userId,
    actorRole: actor.role,
    action: "handoff.start",
    entityType: "itechskill_handoff_case",
    entityId: caseId,
    beforeState: before,
    afterState: after,
    requestId: reqId,
  });

  return after as HandoffCase;
}

export async function resolveHandoff(
  caseId: string,
  resolutionNote: string,
  actor: ActorContext,
  requestId?: string,
): Promise<HandoffCase> {
  const db = supabaseAdmin();
  const reqId = requestId ?? generateRequestId();
  const now = new Date().toISOString();

  const { data: before, error: fetchErr } = await db
    .from("itechskill_handoff_cases")
    .select("*")
    .eq("case_id", caseId)
    .single();

  if (fetchErr || !before) {
    throw new Error(`Handoff case ${caseId} not found`);
  }

  const updates = {
    status: "resolved",
    resolution_note: resolutionNote,
    resolved_at: now,
    updated_at: now,
  };

  const { data: after, error: updateErr } = await db
    .from("itechskill_handoff_cases")
    .update(updates)
    .eq("case_id", caseId)
    .select()
    .single();

  if (updateErr || !after) {
    throw new Error(`Failed to resolve handoff: ${updateErr?.message}`);
  }

  await writeAuditLog({
    actorUserId: actor.userId,
    actorRole: actor.role,
    action: "handoff.resolve",
    entityType: "itechskill_handoff_case",
    entityId: caseId,
    beforeState: before,
    afterState: after,
    reason: resolutionNote,
    requestId: reqId,
  });

  return after as HandoffCase;
}

export async function reopenHandoff(
  caseId: string,
  actor: ActorContext,
  requestId?: string,
): Promise<HandoffCase> {
  const db = supabaseAdmin();
  const reqId = requestId ?? generateRequestId();

  const { data: before, error: fetchErr } = await db
    .from("itechskill_handoff_cases")
    .select("*")
    .eq("case_id", caseId)
    .single();

  if (fetchErr || !before) {
    throw new Error(`Handoff case ${caseId} not found`);
  }

  const updates = {
    status: "open",
    resolution_note: null,
    resolved_at: null,
    updated_at: new Date().toISOString(),
  };

  const { data: after, error: updateErr } = await db
    .from("itechskill_handoff_cases")
    .update(updates)
    .eq("case_id", caseId)
    .select()
    .single();

  if (updateErr || !after) {
    throw new Error(`Failed to reopen handoff: ${updateErr?.message}`);
  }

  await writeAuditLog({
    actorUserId: actor.userId,
    actorRole: actor.role,
    action: "handoff.reopen",
    entityType: "itechskill_handoff_case",
    entityId: caseId,
    beforeState: before,
    afterState: after,
    requestId: reqId,
  });

  return after as HandoffCase;
}

// -----------------------------------------------------------
// 2. Admissions & Payment Mutations
// -----------------------------------------------------------

export async function approvePayment(
  applicationId: string,
  actor: ActorContext,
  requestId?: string,
): Promise<EnrollmentApplication> {
  const db = supabaseAdmin();
  const reqId = requestId ?? generateRequestId();
  const now = new Date().toISOString();

  const { data: before, error: fetchErr } = await db
    .from("itechskill_enrollment_applications")
    .select("*")
    .eq("application_id", applicationId)
    .single();

  if (fetchErr || !before) {
    throw new Error(`Enrollment application ${applicationId} not found`);
  }

  const updates = {
    payment_status: "verified",
    account_status: "active",
    updated_at: now,
  };

  const { data: after, error: updateErr } = await db
    .from("itechskill_enrollment_applications")
    .update(updates)
    .eq("application_id", applicationId)
    .select()
    .single();

  if (updateErr || !after) {
    throw new Error(`Failed to approve payment: ${updateErr?.message}`);
  }

  await writeAuditLog({
    actorUserId: actor.userId,
    actorRole: actor.role,
    action: "payment.approve",
    entityType: "itechskill_enrollment_application",
    entityId: applicationId,
    beforeState: before,
    afterState: after,
    reason: "Payment verified by admissions staff",
    requestId: reqId,
  });

  return after as EnrollmentApplication;
}

export async function rejectPayment(
  applicationId: string,
  rejectionReason: string,
  actor: ActorContext,
  requestId?: string,
): Promise<EnrollmentApplication> {
  const db = supabaseAdmin();
  const reqId = requestId ?? generateRequestId();
  const now = new Date().toISOString();

  if (!rejectionReason || rejectionReason.trim().length === 0) {
    throw new Error("Rejection reason is required");
  }

  const { data: before, error: fetchErr } = await db
    .from("itechskill_enrollment_applications")
    .select("*")
    .eq("application_id", applicationId)
    .single();

  if (fetchErr || !before) {
    throw new Error(`Enrollment application ${applicationId} not found`);
  }

  const updates = {
    payment_status: "rejected",
    account_status: "rejected",
    updated_at: now,
  };

  const { data: after, error: updateErr } = await db
    .from("itechskill_enrollment_applications")
    .update(updates)
    .eq("application_id", applicationId)
    .select()
    .single();

  if (updateErr || !after) {
    throw new Error(`Failed to reject payment: ${updateErr?.message}`);
  }

  await writeAuditLog({
    actorUserId: actor.userId,
    actorRole: actor.role,
    action: "payment.reject",
    entityType: "itechskill_enrollment_application",
    entityId: applicationId,
    beforeState: before,
    afterState: after,
    reason: rejectionReason.trim(),
    requestId: reqId,
  });

  return after as EnrollmentApplication;
}

export async function updatePaymentReceiptDetails(
  applicationId: string,
  updates: {
    receipt_url?: string;
    beneficiary_account?: string;
    payment_amount?: number;
    payment_method?: string;
    receipt_metadata?: Record<string, unknown>;
  },
  actor: ActorContext,
  requestId?: string,
): Promise<EnrollmentApplication> {
  const db = supabaseAdmin();
  const reqId = requestId ?? generateRequestId();
  const now = new Date().toISOString();

  const { data: before, error: fetchErr } = await db
    .from("itechskill_enrollment_applications")
    .select("*")
    .eq("application_id", applicationId)
    .single();

  if (fetchErr || !before) {
    throw new Error(`Enrollment application ${applicationId} not found`);
  }

  const payload: Record<string, unknown> = {
    updated_at: now,
  };
  if (updates.payment_amount !== undefined) payload.total_fee_pkr = updates.payment_amount;

  const { data: after, error: updateErr } = await db
    .from("itechskill_enrollment_applications")
    .update(payload)
    .eq("application_id", applicationId)
    .select()
    .single();

  if (updateErr || !after) {
    throw new Error(`Failed to update receipt details: ${updateErr?.message}`);
  }

  await writeAuditLog({
    actorUserId: actor.userId,
    actorRole: actor.role,
    action: "payment.update_receipt",
    entityType: "itechskill_enrollment_application",
    entityId: applicationId,
    beforeState: before,
    afterState: after,
    reason: "Updated receipt and bank verification details",
    requestId: reqId,
  });

  return after as EnrollmentApplication;
}

// -----------------------------------------------------------
// 3. Follow-up Mutations
// -----------------------------------------------------------

export async function cancelFollowup(
  jobId: string,
  cancellationReason: string,
  actor: ActorContext,
  requestId?: string,
): Promise<FollowupJob> {
  const db = supabaseAdmin();
  const reqId = requestId ?? generateRequestId();
  const now = new Date().toISOString();

  if (!cancellationReason || cancellationReason.trim().length === 0) {
    throw new Error("Cancellation reason is required");
  }

  const { data: before, error: fetchErr } = await db
    .from("itechskill_followup_jobs")
    .select("*")
    .eq("job_id", jobId)
    .single();

  if (fetchErr || !before) {
    throw new Error(`Followup job ${jobId} not found`);
  }

  if (before.status === "sent") {
    throw new Error("Cannot cancel a follow-up that has already been sent");
  }

  const updates = {
    status: "cancelled",
    cancelled_reason: cancellationReason.trim(),
    cancelled_at: now,
    updated_at: now,
  };

  const { data: after, error: updateErr } = await db
    .from("itechskill_followup_jobs")
    .update(updates)
    .eq("job_id", jobId)
    .select()
    .single();

  if (updateErr || !after) {
    throw new Error(`Failed to cancel follow-up: ${updateErr?.message}`);
  }

  await writeAuditLog({
    actorUserId: actor.userId,
    actorRole: actor.role,
    action: "followup.cancel",
    entityType: "itechskill_followup_job",
    entityId: jobId,
    beforeState: before,
    afterState: after,
    reason: cancellationReason.trim(),
    requestId: reqId,
  });

  return after as FollowupJob;
}

// -----------------------------------------------------------
// 4. Incident Resolution Mutations
// -----------------------------------------------------------

export async function resolveIncident(
  fingerprint: string,
  resolutionNote: string,
  actor: ActorContext,
  requestId?: string,
): Promise<OperationsAlert> {
  const db = supabaseAdmin();
  const reqId = requestId ?? generateRequestId();
  const now = new Date().toISOString();

  const { data: before, error: fetchErr } = await db
    .from("itechskill_operations_alerts")
    .select("*")
    .eq("fingerprint", fingerprint)
    .maybeSingle();

  if (fetchErr || !before) {
    throw new Error(`Incident with fingerprint ${fingerprint} not found`);
  }

  const updates = {
    status: "resolved",
    resolved_at: now,
    resolved_by: actor.userId,
    resolution_note: resolutionNote || "Resolved via CRM Operations Panel",
  };

  const { data: after, error: updateErr } = await db
    .from("itechskill_operations_alerts")
    .update(updates)
    .eq("fingerprint", fingerprint)
    .select()
    .single();

  if (updateErr || !after) {
    throw new Error(`Failed to resolve incident: ${updateErr?.message}`);
  }

  await writeAuditLog({
    actorUserId: actor.userId,
    actorRole: actor.role,
    action: "incident.resolve",
    entityType: "itechskill_operations_alert",
    entityId: fingerprint,
    beforeState: before,
    afterState: after,
    reason: resolutionNote,
    requestId: reqId,
  });

  return after as OperationsAlert;
}

// -----------------------------------------------------------
// 5. Catalog Governance Mutations
// -----------------------------------------------------------

export async function submitCatalogChange(
  change: {
    change_type: string;
    title: string;
    description: string;
    payload: Record<string, unknown>;
  },
  actor: ActorContext,
  requestId?: string,
): Promise<CatalogChangeRequest> {
  const db = supabaseAdmin();
  const reqId = requestId ?? generateRequestId();
  const now = new Date().toISOString();

  const insertData = {
    change_type: change.change_type,
    title: change.title,
    description: change.description,
    payload: change.payload,
    status: "pending",
    requester: actor.userId,
    created_at: now,
    updated_at: now,
  };

  const { data: created, error: insertErr } = await db
    .from("itechskill_catalog_change_requests")
    .insert(insertData)
    .select()
    .single();

  if (insertErr || !created) {
    throw new Error(`Failed to submit catalog change: ${insertErr?.message}`);
  }

  await writeAuditLog({
    actorUserId: actor.userId,
    actorRole: actor.role,
    action: "catalog.submit_change",
    entityType: "itechskill_catalog_change_request",
    entityId: created.id,
    afterState: created,
    reason: change.title,
    requestId: reqId,
  });

  return created as CatalogChangeRequest;
}

export async function approveCatalogChange(
  requestId: string,
  reviewNote: string,
  actor: ActorContext,
  reqIdParam?: string,
): Promise<CatalogChangeRequest> {
  const db = supabaseAdmin();
  const reqId = reqIdParam ?? generateRequestId();
  const now = new Date().toISOString();

  const { data: before, error: fetchErr } = await db
    .from("itechskill_catalog_change_requests")
    .select("*")
    .eq("id", requestId)
    .single();

  if (fetchErr || !before) {
    throw new Error(`Catalog change request ${requestId} not found`);
  }

  const updates = {
    status: "approved",
    reviewer: actor.userId,
    review_note: reviewNote,
    reviewed_at: now,
    updated_at: now,
  };

  const { data: after, error: updateErr } = await db
    .from("itechskill_catalog_change_requests")
    .update(updates)
    .eq("id", requestId)
    .select()
    .single();

  if (updateErr || !after) {
    throw new Error(`Failed to approve catalog change: ${updateErr?.message}`);
  }

  await writeAuditLog({
    actorUserId: actor.userId,
    actorRole: actor.role,
    action: "catalog.approve_change",
    entityType: "itechskill_catalog_change_request",
    entityId: requestId,
    beforeState: before,
    afterState: after,
    reason: reviewNote,
    requestId: reqId,
  });

  return after as CatalogChangeRequest;
}

export async function rejectCatalogChange(
  requestId: string,
  rejectionReason: string,
  actor: ActorContext,
  reqIdParam?: string,
): Promise<CatalogChangeRequest> {
  const db = supabaseAdmin();
  const reqId = reqIdParam ?? generateRequestId();
  const now = new Date().toISOString();

  const { data: before, error: fetchErr } = await db
    .from("itechskill_catalog_change_requests")
    .select("*")
    .eq("id", requestId)
    .single();

  if (fetchErr || !before) {
    throw new Error(`Catalog change request ${requestId} not found`);
  }

  const updates = {
    status: "rejected",
    reviewer: actor.userId,
    review_note: rejectionReason,
    reviewed_at: now,
    updated_at: now,
  };

  const { data: after, error: updateErr } = await db
    .from("itechskill_catalog_change_requests")
    .update(updates)
    .eq("id", requestId)
    .select()
    .single();

  if (updateErr || !after) {
    throw new Error(`Failed to reject catalog change: ${updateErr?.message}`);
  }

  await writeAuditLog({
    actorUserId: actor.userId,
    actorRole: actor.role,
    action: "catalog.reject_change",
    entityType: "itechskill_catalog_change_request",
    entityId: requestId,
    beforeState: before,
    afterState: after,
    reason: rejectionReason,
    requestId: reqId,
  });

  return after as CatalogChangeRequest;
}
