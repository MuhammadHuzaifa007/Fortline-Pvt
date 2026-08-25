-- ============================================================
-- 039_calls_custom_platform_and_spam.sql
-- Idempotent — safe to run multiple times.
-- ============================================================

-- 1. Add custom_platform to public.calls
ALTER TABLE public.calls
  ADD COLUMN IF NOT EXISTS custom_platform TEXT DEFAULT NULL;

-- 2. Add is_spam to public.contacts
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS is_spam BOOLEAN NOT NULL DEFAULT FALSE;

-- Create index on is_spam for performance
CREATE INDEX IF NOT EXISTS idx_contacts_is_spam ON public.contacts(is_spam);

-- 3. Widen public.calls.outcome check constraint
ALTER TABLE public.calls
  DROP CONSTRAINT IF EXISTS calls_outcome_check;

ALTER TABLE public.calls
  ADD CONSTRAINT calls_outcome_check CHECK (
    outcome IN (
      'answered',
      'no_answer',
      'busy',
      'callback_scheduled',
      'not_reachable',
      'wrong_number',
      'spam'
    )
  );
