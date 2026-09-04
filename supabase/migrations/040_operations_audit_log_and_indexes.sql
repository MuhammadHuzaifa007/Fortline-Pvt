-- ============================================================
-- Migration 040: Operations Audit Log & Performance Indexes
--
-- Provides:
-- 1. `itechskill_audit_log` table for tracking all human CRM
--    operations mutations (assign/resolve handoff, approve/reject
--    payment, cancel follow-up, resolve incident, catalog approvals).
-- 2. Performance indexes on existing iTechSkill operational tables.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.itechskill_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id text NOT NULL,
  actor_role text NOT NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  before_state jsonb,
  after_state jsonb,
  reason text,
  request_id text,
  ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_itechskill_audit_log_entity
  ON public.itechskill_audit_log(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_itechskill_audit_log_actor
  ON public.itechskill_audit_log(actor_user_id);

CREATE INDEX IF NOT EXISTS idx_itechskill_audit_log_created
  ON public.itechskill_audit_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_itechskill_audit_log_request_id
  ON public.itechskill_audit_log(request_id);

-- ------------------------------------------------------------
-- Performance indexes for CRM queries (idempotent / safe)
-- ------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'itechskill_handoff_cases') THEN
    CREATE INDEX IF NOT EXISTS idx_handoff_status_priority_sla
      ON public.itechskill_handoff_cases(status, priority, sla_due_at);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'itechskill_followup_jobs') THEN
    CREATE INDEX IF NOT EXISTS idx_followup_status_due
      ON public.itechskill_followup_jobs(status, due_at, priority);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'itechskill_enrollment_applications') THEN
    CREATE INDEX IF NOT EXISTS idx_enrollment_payment_updated
      ON public.itechskill_enrollment_applications(payment_status, updated_at);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'itechskill_operations_alerts') THEN
    CREATE INDEX IF NOT EXISTS idx_alerts_status_seen
      ON public.itechskill_operations_alerts(status, last_seen_at);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'itechskill_call_summaries') THEN
    CREATE INDEX IF NOT EXISTS idx_call_summaries_phone_created
      ON public.itechskill_call_summaries(phone, created_at);
  END IF;
END $$;
