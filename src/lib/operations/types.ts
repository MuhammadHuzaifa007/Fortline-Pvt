// ============================================================
// iTechSkill Operations — shared TypeScript interfaces
//
// These mirror the Postgres tables created by the n8n workflow
// ("Create iTechSkill Tables" node). The CRM reads them via
// supabaseAdmin() — never from browser code. Every field is
// typed to match the DB column; nullable columns are `| null`.
// ============================================================

// -----------------------------------------------------------
// Handoff Cases (itechskill_handoff_cases)
// -----------------------------------------------------------

export type HandoffStatus =
  | "open"
  | "in_progress"
  | "waiting_staff"
  | "resolved"
  | "cancelled";

export type HandoffPriority = "low" | "normal" | "high" | "urgent";

export interface HandoffCase {
  case_id: string;
  id: string;
  phone: string;
  student_name: string | null;
  priority: HandoffPriority;
  category: string | null;
  reason: string | null;
  assigned_to: string | null;
  status: HandoffStatus;
  sla_due_at: string | null;
  resolution_note: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  conversation_context: string | null;
  created_at: string;
  updated_at: string;
}

// -----------------------------------------------------------
// Follow-up Jobs (itechskill_followup_jobs)
// -----------------------------------------------------------

export type FollowupStatus =
  | "pending"
  | "claimed"
  | "sent"
  | "cancelled"
  | "failed"
  | "dead_letter";

export interface FollowupJob {
  job_id: string;
  id: string;
  phone: string;
  student_name: string | null;
  program: string | null;
  template_name: string | null;
  template_language: string | null;
  followup_type: string | null;
  status: FollowupStatus;
  priority: string | null;
  due_at: string | null;
  locked_at: string | null;
  sent_at: string | null;
  attempt_count: number;
  last_error: string | null;
  cancellation_reason: string | null;
  cancelled_by: string | null;
  created_at: string;
  updated_at: string;
}

// -----------------------------------------------------------
// Enrollment Applications (itechskill_enrollment_applications)
// -----------------------------------------------------------

export type PaymentStatus =
  | "not_started"
  | "verification_pending"
  | "verified"
  | "rejected"
  | "refunded";

export type ApplicationStatus =
  | "inquiry"
  | "applied"
  | "payment_pending"
  | "payment_verified"
  | "enrolled"
  | "graduated"
  | "dropped"
  | "rejected";

export interface EnrollmentApplication {
  // DB Columns
  application_id: string;
  phone: string;
  full_name?: string | null;
  email?: string | null;
  city?: string | null;
  program_name?: string | null;
  source_key?: string | null;
  program_type?: string | null;
  total_fee_pkr?: number | null;
  installment_1_pkr?: number | null;
  installment_2_pkr?: number | null;
  installment_3_pkr?: number | null;
  payment_plan?: string | null;
  payment_status: PaymentStatus;
  payment_screenshot_media_id?: string | null;
  payment_screenshot_mime?: string | null;
  payment_screenshot_received_at?: string | null;
  account_status?: string | null;
  login_username?: string | null;
  login_temporary_password?: string | null;
  login_sent_at?: string | null;
  created_at: string;
  updated_at: string;

  // Normalized frontend aliases
  id: string;
  student_name: string | null;
  program: string | null;
  application_status: ApplicationStatus;
  payment_amount: number | null;
  payment_currency: string | null;
  payment_method: string | null;
  receipt_url: string | null;
  receipt_metadata?: Record<string, unknown> | null;
  beneficiary_account?: string | null;
  verified_by?: string | null;
  verified_at?: string | null;
  rejection_reason?: string | null;
  rejected_by?: string | null;
  rejected_at?: string | null;
  account_created?: boolean;
  login_sent?: boolean;
}

// -----------------------------------------------------------
// Operations Alerts (itechskill_operations_alerts)
// -----------------------------------------------------------

export type AlertSeverity = "low" | "normal" | "high" | "urgent";
export type AlertStatus = "pending" | "acknowledged" | "resolved";

export interface OperationsAlert {
  id: string;
  fingerprint: string;
  alert_type: string;
  severity: AlertSeverity;
  status: AlertStatus;
  details: Record<string, unknown> | null;
  first_seen_at: string;
  last_seen_at: string;
  last_sent_at: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_note: string | null;
  created_at: string;
}

// -----------------------------------------------------------
// Catalog Governance
// -----------------------------------------------------------

export type CatalogChangeStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "published"
  | "archived";

export interface CatalogChangeRequest {
  id: string;
  change_type: string;
  title: string | null;
  description: string | null;
  payload: Record<string, unknown> | null;
  status: CatalogChangeStatus;
  requester: string | null;
  reviewer: string | null;
  review_note: string | null;
  reviewed_at: string | null;
  published_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CatalogAudit {
  id: string;
  audit_type: string;
  status: string;
  expected_counts: Record<string, number> | null;
  actual_counts: Record<string, number> | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface CatalogVersion {
  id: string;
  version_number: number;
  change_request_id: string | null;
  snapshot: Record<string, unknown> | null;
  created_at: string;
}

// -----------------------------------------------------------
// AI Evaluation / Regression
// -----------------------------------------------------------

export type EvaluationRunStatus = "running" | "passed" | "failed";

export interface EvaluationRun {
  id: string;
  status: EvaluationRunStatus;
  total_cases: number;
  passed_cases: number;
  failed_cases: number;
  pass_rate: number | null;
  model_version: string | null;
  prompt_version: string | null;
  workflow_version: string | null;
  started_at: string;
  completed_at: string | null;
  created_at: string;
}

export interface EvaluationResult {
  id: string;
  run_id: string;
  case_id: string | null;
  case_name: string | null;
  is_critical: boolean;
  passed: boolean;
  expected_route: string | null;
  actual_route: string | null;
  expected_keywords: string[] | null;
  actual_response: string | null;
  error: string | null;
  created_at: string;
}

// -----------------------------------------------------------
// Workflow Events (itechskill_workflow_events)
// -----------------------------------------------------------

export interface WorkflowEvent {
  id: string;
  trace_id: string | null;
  event_name: string;
  phone: string | null;
  status: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

// -----------------------------------------------------------
// Call Intelligence (future — itechskill_call_recordings /
// itechskill_call_summaries)
// -----------------------------------------------------------

export interface CallRecording {
  id: string;
  phone: string;
  call_date: string;
  duration_seconds: number | null;
  salesperson: string | null;
  provider: string | null;
  recording_url: string | null;
  transcript: string | null;
  status: string;
  created_at: string;
}

export interface CallSummary {
  id: string;
  phone: string;
  recording_id: string | null;
  call_date: string | null;
  duration_seconds: number | null;
  salesperson: string | null;
  provider: string | null;
  summary: string | null;
  client_intent: string | null;
  program_interest: string | null;
  seriousness_score: number | null;
  lead_temperature: string | null;
  client_questions: string[] | null;
  objections: string[] | null;
  commitments: string[] | null;
  next_steps: string[] | null;
  caller_quality_score: number | null;
  rubric_scores: Record<string, number> | null;
  missed_opportunities: string[] | null;
  policy_flags: string[] | null;
  human_followup_required: boolean | null;
  created_at: string;
}

// -----------------------------------------------------------
// Audit Log (itechskill_audit_log — created by CRM migration)
// -----------------------------------------------------------

export interface AuditLogEntry {
  id: string;
  actor_user_id: string;
  actor_role: string;
  action: string;
  entity_type: string;
  entity_id: string;
  before_state: Record<string, unknown> | null;
  after_state: Record<string, unknown> | null;
  reason: string | null;
  request_id: string | null;
  ip_hash: string | null;
  created_at: string;
}

// -----------------------------------------------------------
// Operations Summary (aggregated KPI response)
// -----------------------------------------------------------

export interface OperationsSummary {
  openHandoffs: number;
  overdueHandoffs: number;
  hotLeads: number;
  pendingFollowups: number;
  pendingPayments: number;
  aiPassRate: number | null;
  activeIncidents: number;
  avgCallQuality: number | null;
}

// -----------------------------------------------------------
// Pagination
// -----------------------------------------------------------

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
