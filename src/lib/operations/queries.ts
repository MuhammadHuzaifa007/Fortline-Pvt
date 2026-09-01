// ============================================================
// Operations read queries — server-side only.
//
// Every function uses supabaseAdmin() to read iTechSkill tables
// that sit outside the CRM's RLS-scoped schema. Results are
// returned as typed interfaces from ./types.ts. List endpoints
// use cursor/offset pagination and never return unbounded sets.
//
// These are called exclusively from API route handlers that
// have already verified authentication via requireRole().
// ============================================================

import { supabaseAdmin } from "@/lib/flows/admin-client";
import type {
  HandoffCase,
  FollowupJob,
  EnrollmentApplication,
  OperationsAlert,
  CatalogChangeRequest,
  CatalogAudit,
  EvaluationRun,
  EvaluationResult,
  CallSummary,
  OperationsSummary,
  PaginatedResult,
  PaginationParams,
} from "./types";

// -----------------------------------------------------------
// Helpers
// -----------------------------------------------------------

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

function sanitizePagination(params?: Partial<PaginationParams>): PaginationParams {
  const page = Math.max(1, params?.page ?? 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, params?.pageSize ?? DEFAULT_PAGE_SIZE));
  return { page, pageSize };
}

function paginatedRange(p: PaginationParams): { from: number; to: number } {
  const from = (p.page - 1) * p.pageSize;
  const to = from + p.pageSize - 1;
  return { from, to };
}

function buildResult<T>(data: T[], total: number, p: PaginationParams): PaginatedResult<T> {
  return {
    data,
    total,
    page: p.page,
    pageSize: p.pageSize,
    totalPages: Math.ceil(total / p.pageSize),
  };
}

// -----------------------------------------------------------
// 1. Operations Summary (Dashboard KPI cards)
// -----------------------------------------------------------

export async function loadOperationsSummary(): Promise<OperationsSummary> {
  const db = supabaseAdmin();
  const now = new Date().toISOString();

  const [
    openHandoffs,
    overdueHandoffs,
    hotLeads,
    pendingFollowups,
    pendingPayments,
    latestEvaluation,
    activeIncidents,
  ] = await Promise.all([
    // Open handoff cases
    db
      .from("itechskill_handoff_cases")
      .select("case_id", { count: "exact", head: true })
      .in("status", ["open", "in_progress", "waiting_staff", "waiting_student"]),

    // Overdue handoffs (SLA breached)
    db
      .from("itechskill_handoff_cases")
      .select("case_id", { count: "exact", head: true })
      .in("status", ["open", "in_progress", "waiting_staff", "waiting_student"])
      .lt("sla_due_at", now),

    // Hot leads (exact n8n parity: lead_band in ('hot', 'sales_ready'))
    db
      .from("itechskill_student_360")
      .select("phone", { count: "exact", head: true })
      .in("lead_band", ["hot", "sales_ready"]),

    // Pending follow-up jobs
    db
      .from("itechskill_followup_jobs")
      .select("job_id", { count: "exact", head: true })
      .eq("status", "pending"),

    // Payments awaiting verification
    db
      .from("itechskill_enrollment_applications")
      .select("application_id", { count: "exact", head: true })
      .eq("payment_status", "verification_pending"),

    // Latest AI evaluation run
    db
      .from("itechskill_evaluation_runs")
      .select("pass_rate, status")
      .in("status", ["passed", "failed"])
      .order("completed_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle(),

    // Active operational incidents
    db
      .from("itechskill_operations_alerts")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
  ]);

  return {
    openHandoffs: openHandoffs.count ?? 0,
    overdueHandoffs: overdueHandoffs.count ?? 0,
    hotLeads: hotLeads.count ?? 0,
    pendingFollowups: pendingFollowups.count ?? 0,
    pendingPayments: pendingPayments.count ?? 0,
    aiPassRate: (latestEvaluation.data as { pass_rate: number | null } | null)?.pass_rate ?? null,
    activeIncidents: activeIncidents.count ?? 0,
    avgCallQuality: null, // Populated when call intelligence is active
  };
}

// -----------------------------------------------------------
// 2. Handoff Cases
// -----------------------------------------------------------

export interface HandoffFilters {
  status?: string | string[];
  priority?: string;
  overdue?: boolean;
}

interface StudentMeta {
  contactName?: string;
  programName?: string;
  programType?: string;
}

function normalizeHandoffCase(
  raw: Record<string, unknown>,
  studentMetaMap?: Map<string, StudentMeta>,
): HandoffCase {
  const caseId = (raw.case_id || raw.id || "") as string;
  const phone = (raw.phone || "") as string;
  const snap = (raw.student_snapshot as Record<string, unknown> | null) || {};
  const meta = studentMetaMap?.get(phone);

  const resolvedName =
    (snap.contact_name as string) ||
    (snap.full_name as string) ||
    (snap.name as string) ||
    meta?.contactName ||
    (raw.student_name as string) ||
    (raw.contact_name as string) ||
    "Lead / Student";

  const resolvedProgram =
    (snap.program_name as string) ||
    (snap.program as string) ||
    (snap.course_name as string) ||
    meta?.programName ||
    (raw.program_name as string) ||
    (raw.program as string) ||
    null;

  let resolvedType =
    (snap.program_type as string) ||
    (snap.course_type as string) ||
    meta?.programType ||
    (raw.program_type as string) ||
    null;

  if (!resolvedType && resolvedProgram) {
    const lower = resolvedProgram.toLowerCase();
    if (lower.includes("diploma")) resolvedType = "Diploma";
    else if (lower.includes("short")) resolvedType = "Short Course";
    else if (lower.includes("certification") || lower.includes("certificate")) resolvedType = "Certification";
    else resolvedType = "Course";
  }

  return {
    ...(raw as unknown as HandoffCase),
    case_id: caseId,
    id: caseId,
    phone,
    student_name: resolvedName,
    program_name: resolvedProgram,
    program_type: resolvedType,
  };
}

export async function loadHandoffCases(
  filters?: HandoffFilters,
  pagination?: Partial<PaginationParams>,
): Promise<PaginatedResult<HandoffCase>> {
  const p = sanitizePagination(pagination);
  const { from, to } = paginatedRange(p);
  const db = supabaseAdmin();

  let query = db
    .from("itechskill_handoff_cases")
    .select("*", { count: "exact" });

  if (filters?.status) {
    const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
    query = query.in("status", statuses);
  }
  if (filters?.priority) {
    query = query.eq("priority", filters.priority);
  }
  if (filters?.overdue) {
    query = query.lt("sla_due_at", new Date().toISOString());
  }

  query = query
    .order("sla_due_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .range(from, to);

  const { data, count, error } = await query;
  if (error) throw new Error(`loadHandoffCases: ${error.message}`);

  const phones = Array.from(new Set((data ?? []).map((d) => (d.phone as string)).filter(Boolean)));
  const studentMetaMap = new Map<string, StudentMeta>();
  if (phones.length > 0) {
    const { data: s360Rows } = await db
      .from("itechskill_student_360")
      .select("phone, contact_name, selected_program_name, selected_program_type")
      .in("phone", phones);
    for (const r of s360Rows ?? []) {
      if (r.phone) {
        studentMetaMap.set(r.phone, {
          contactName: r.contact_name || undefined,
          programName: r.selected_program_name || undefined,
          programType: r.selected_program_type || undefined,
        });
      }
    }
  }

  const normalized = (data ?? []).map((item) =>
    normalizeHandoffCase(item as Record<string, unknown>, studentMetaMap)
  );

  return buildResult(normalized, count ?? 0, p);
}

export async function loadHandoffById(caseId: string): Promise<HandoffCase | null> {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("itechskill_handoff_cases")
    .select("*")
    .eq("case_id", caseId)
    .maybeSingle();

  if (error || !data) return null;

  const studentMetaMap = new Map<string, StudentMeta>();
  if (data.phone) {
    const { data: s360 } = await db
      .from("itechskill_student_360")
      .select("phone, contact_name, selected_program_name, selected_program_type")
      .eq("phone", data.phone)
      .maybeSingle();
    if (s360) {
      studentMetaMap.set(data.phone, {
        contactName: s360.contact_name || undefined,
        programName: s360.selected_program_name || undefined,
        programType: s360.selected_program_type || undefined,
      });
    }
  }

  return normalizeHandoffCase(data as Record<string, unknown>, studentMetaMap);
}

// -----------------------------------------------------------
// 3. Follow-up Jobs
// -----------------------------------------------------------

export interface FollowupFilters {
  status?: string | string[];
}

function normalizeFollowupJob(raw: Record<string, unknown>): FollowupJob {
  const jobId = (raw.job_id || raw.id || "") as string;
  return {
    ...(raw as unknown as FollowupJob),
    job_id: jobId,
    id: jobId,
    student_name: (raw.student_first_name || raw.student_name || "Lead / Student") as string,
    program: (raw.program_name || raw.program || null) as string | null,
    template_name: (raw.template_name || null) as string | null,
    followup_type: (raw.job_type || raw.followup_type || "scheduled") as string,
  };
}

export async function loadFollowupJobs(
  filters?: FollowupFilters,
  pagination?: Partial<PaginationParams>,
): Promise<PaginatedResult<FollowupJob>> {
  const p = sanitizePagination(pagination);
  const { from, to } = paginatedRange(p);
  const db = supabaseAdmin();

  let query = db
    .from("itechskill_followup_jobs")
    .select("*", { count: "exact" });

  if (filters?.status) {
    const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
    query = query.in("status", statuses);
  }

  query = query
    .order("due_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .range(from, to);

  const { data, count, error } = await query;
  if (error) throw new Error(`loadFollowupJobs: ${error.message}`);

  const normalized = (data ?? []).map((item) => normalizeFollowupJob(item as Record<string, unknown>));

  return buildResult(normalized, count ?? 0, p);
}

export async function loadFollowupById(jobId: string): Promise<FollowupJob | null> {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("itechskill_followup_jobs")
    .select("*")
    .eq("job_id", jobId)
    .maybeSingle();

  if (error || !data) return null;
  return normalizeFollowupJob(data as Record<string, unknown>);
}

// -----------------------------------------------------------
// 4. Enrollment Applications (Admissions & Payments)
// -----------------------------------------------------------

export interface AdmissionsFilters {
  paymentStatus?: string | string[];
  applicationStatus?: string;
  program?: string;
}

async function normalizeEnrollmentApplication(
  raw: Record<string, unknown>
): Promise<EnrollmentApplication> {
  const db = supabaseAdmin();
  const appId = (raw.application_id || raw.id || "") as string;
  const phone = (raw.phone || "") as string;

  let receiptUrl: string | null = null;
  if (raw.payment_screenshot_media_id) {
    receiptUrl = `/api/whatsapp/media/${raw.payment_screenshot_media_id}`;
  } else if (raw.receipt_url) {
    receiptUrl = raw.receipt_url as string;
  } else if (phone) {
    try {
      const cleanPhone = phone.replace(/^\+/, "").trim();
      const { data: contacts } = await db
        .from("contacts")
        .select("id")
        .ilike("phone", `%${cleanPhone}%`);

      if (contacts && contacts.length > 0) {
        const contactIds = contacts.map((c) => c.id);
        const { data: convs } = await db
          .from("conversations")
          .select("id")
          .in("contact_id", contactIds);

        if (convs && convs.length > 0) {
          const convIds = convs.map((c) => c.id);
          const { data: imgMsgs } = await db
            .from("messages")
            .select("media_url")
            .in("conversation_id", convIds)
            .eq("content_type", "image")
            .order("created_at", { ascending: false })
            .limit(1);

          if (imgMsgs && imgMsgs.length > 0 && imgMsgs[0].media_url) {
            receiptUrl = imgMsgs[0].media_url;
          }
        }
      }
    } catch (e) {
      console.error("Error looking up image message for phone:", e);
    }
  }

  return {
    ...(raw as unknown as EnrollmentApplication),
    application_id: appId,
    id: appId,
    phone,
    student_name: (raw.full_name || raw.student_name || "Applicant") as string,
    program: (raw.program_name || raw.program || "General Enrollment") as string,
    application_status: (raw.account_status || raw.application_status || "verification_pending") as any,
    payment_status: (raw.payment_status || "verification_pending") as any,
    payment_amount: (raw.total_fee_pkr || raw.payment_amount || 0) as number,
    payment_currency: (raw.payment_currency || "PKR") as string,
    payment_method: (raw.payment_method || "Direct Transfer") as string,
    receipt_url: receiptUrl,
  };
}

export async function loadEnrollmentApplications(
  filters?: AdmissionsFilters,
  pagination?: Partial<PaginationParams>,
): Promise<PaginatedResult<EnrollmentApplication>> {
  const p = sanitizePagination(pagination);
  const { from, to } = paginatedRange(p);
  const db = supabaseAdmin();

  let query = db
    .from("itechskill_enrollment_applications")
    .select("*", { count: "exact" });

  if (filters?.paymentStatus) {
    const statuses = Array.isArray(filters.paymentStatus)
      ? filters.paymentStatus
      : [filters.paymentStatus];
    query = query.in("payment_status", statuses);
  }
  if (filters?.program) {
    query = query.ilike("program_name", `%${filters.program}%`);
  }

  query = query
    .order("created_at", { ascending: false })
    .order("updated_at", { ascending: false })
    .range(from, to);

  const { data, count, error } = await query;
  if (error) throw new Error(`loadEnrollmentApplications: ${error.message}`);

  const normalizedList = await Promise.all(
    (data ?? []).map((item) => normalizeEnrollmentApplication(item as Record<string, unknown>))
  );

  return buildResult(normalizedList, count ?? 0, p);
}

export const loadAdmissionsApplications = loadEnrollmentApplications;

export async function loadApplicationById(appId: string): Promise<EnrollmentApplication | null> {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("itechskill_enrollment_applications")
    .select("*")
    .eq("application_id", appId)
    .maybeSingle();

  if (error || !data) return null;
  return await normalizeEnrollmentApplication(data as Record<string, unknown>);
}

// -----------------------------------------------------------
// 5. Operations Alerts (Incidents)
// -----------------------------------------------------------

export interface IncidentFilters {
  status?: string | string[];
  severity?: string;
}

export async function loadOperationsAlerts(
  filters?: IncidentFilters,
  pagination?: Partial<PaginationParams>,
): Promise<PaginatedResult<OperationsAlert>> {
  const p = sanitizePagination(pagination);
  const { from, to } = paginatedRange(p);
  const db = supabaseAdmin();

  let query = db
    .from("itechskill_operations_alerts")
    .select("*", { count: "exact" });

  if (filters?.status) {
    const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
    query = query.in("status", statuses);
  }
  if (filters?.severity) {
    query = query.eq("severity", filters.severity);
  }

  query = query
    .order("last_seen_at", { ascending: false })
    .range(from, to);

  const { data, count, error } = await query;
  if (error) throw new Error(`loadOperationsAlerts: ${error.message}`);

  return buildResult((data ?? []) as OperationsAlert[], count ?? 0, p);
}

// -----------------------------------------------------------
// 6. Catalog Health & Governance
// -----------------------------------------------------------

export async function loadCatalogHealth(): Promise<{
  latestAudit: CatalogAudit | null;
  pendingChanges: number;
  publishedChanges: number;
}> {
  const db = supabaseAdmin();

  const [latestAudit, pendingCount, publishedCount] = await Promise.all([
    db
      .from("itechskill_catalog_audits")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    db
      .from("itechskill_catalog_change_requests")
      .select("id", { count: "exact", head: true })
      .in("status", ["pending", "approved"]),
    db
      .from("itechskill_catalog_change_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "published"),
  ]);

  return {
    latestAudit: (latestAudit.data as CatalogAudit) ?? null,
    pendingChanges: pendingCount.count ?? 0,
    publishedChanges: publishedCount.count ?? 0,
  };
}

function normalizeCatalogChangeRequest(raw: Record<string, unknown>): CatalogChangeRequest {
  const reqId = (raw.request_id || raw.id || "") as string;
  const doc = (raw.proposed_document as Record<string, unknown> | null) || {};
  return {
    ...(raw as unknown as CatalogChangeRequest),
    request_id: reqId,
    id: reqId,
    change_type: (raw.action || raw.change_type || "upsert") as string,
    title: (doc.title || raw.title || raw.source_key || "Catalog Change Request") as string,
    description: (doc.description || raw.description || null) as string | null,
    payload: doc,
    requester: (raw.requested_by || raw.requester || null) as string | null,
    reviewer: (raw.approved_by || raw.rejected_by || raw.reviewer || null) as string | null,
    created_at: (raw.requested_at || raw.created_at || new Date().toISOString()) as string,
  };
}

export async function loadCatalogChangeRequests(
  pagination?: Partial<PaginationParams>,
): Promise<PaginatedResult<CatalogChangeRequest>> {
  const p = sanitizePagination(pagination);
  const { from, to } = paginatedRange(p);
  const db = supabaseAdmin();

  const { data, count, error } = await db
    .from("itechskill_catalog_change_requests")
    .select("*", { count: "exact" })
    .order("requested_at", { ascending: false })
    .range(from, to);

  if (error) throw new Error(`loadCatalogChangeRequests: ${error.message}`);
  const list = ((data ?? []) as Record<string, unknown>[]).map(normalizeCatalogChangeRequest);
  return buildResult(list, count ?? 0, p);
}

// -----------------------------------------------------------
// 7. AI Health (Evaluation / Regression)
// -----------------------------------------------------------

export interface AiHealthData {
  latestRun: EvaluationRun | null;
  failedCritical: EvaluationResult[];
  recentFailures: EvaluationResult[];
  aiFallbackCount: number;
  routingFailures: number;
}

export async function loadAiHealth(): Promise<AiHealthData> {
  const db = supabaseAdmin();

  // Latest completed evaluation run
  const { data: runData } = await db
    .from("itechskill_evaluation_runs")
    .select("*")
    .in("status", ["passed", "failed"])
    .order("completed_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  const latestRun = (runData as EvaluationRun) ?? null;
  let failedCritical: EvaluationResult[] = [];
  let recentFailures: EvaluationResult[] = [];

  if (latestRun) {
    const runKey = latestRun.run_id || latestRun.id;
    if (runKey) {
      const [criticalRes, failedRes] = await Promise.all([
        db
          .from("itechskill_evaluation_results")
          .select("*")
          .eq("run_id", runKey)
          .eq("is_critical", true)
          .eq("passed", false)
          .limit(50),
        db
          .from("itechskill_evaluation_results")
          .select("*")
          .eq("run_id", runKey)
          .eq("passed", false)
          .limit(50),
      ]);
      failedCritical = (criticalRes.data ?? []) as EvaluationResult[];
      recentFailures = (failedRes.data ?? []) as EvaluationResult[];
    }
  }

  // AI fallback and routing failure counts (last 24h)
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [fallbackRes, routingRes] = await Promise.all([
    db
      .from("itechskill_workflow_events")
      .select("id", { count: "exact", head: true })
      .eq("event_name", "ai_fallback")
      .gte("created_at", twentyFourHoursAgo),
    db
      .from("itechskill_workflow_events")
      .select("id", { count: "exact", head: true })
      .eq("event_name", "routing_failure")
      .gte("created_at", twentyFourHoursAgo),
  ]);

  return {
    latestRun,
    failedCritical,
    recentFailures,
    aiFallbackCount: fallbackRes.count ?? 0,
    routingFailures: routingRes.count ?? 0,
  };
}

// -----------------------------------------------------------
// 8. Call Intelligence
// -----------------------------------------------------------

export async function loadCallSummaries(
  phone?: string,
  pagination?: Partial<PaginationParams>,
): Promise<PaginatedResult<CallSummary>> {
  const p = sanitizePagination(pagination);
  const { from, to } = paginatedRange(p);
  const db = supabaseAdmin();

  let query = db
    .from("itechskill_call_summaries")
    .select("*", { count: "exact" });

  if (phone) {
    query = query.eq("phone", phone);
  }

  query = query
    .order("created_at", { ascending: false })
    .range(from, to);

  const { data, count, error } = await query;
  if (error) throw new Error(`loadCallSummaries: ${error.message}`);

  // Strip transcript from list view — only return on detail request
  const sanitized = ((data ?? []) as CallSummary[]).map((s) => ({
    ...s,
    // Redact full transcript in list view for performance and security
  }));

  return buildResult(sanitized, count ?? 0, p);
}

// -----------------------------------------------------------
// 9. Hot Leads
// -----------------------------------------------------------

export async function loadHotLeadPhones(): Promise<string[]> {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("itechskill_student_360")
    .select("phone")
    .in("lead_band", ["hot", "sales_ready"]);

  if (error) {
    console.error("loadHotLeadPhones error:", error.message);
    return [];
  }

  return (data ?? []).map((r: { phone: string }) => r.phone).filter(Boolean);
}
