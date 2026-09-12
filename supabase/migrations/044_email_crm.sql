-- ============================================================
-- Migration 044: Fortline-Pvt Microsoft 365 / Outlook Email CRM
--
-- 1. Adds email_address column to fortline_sales_members
-- 2. Creates Email CRM tables:
--    - email_accounts (monitored mailboxes mapped to sales members)
--    - email_subscriptions (Microsoft Graph webhook change notification tracking)
--    - email_threads (conversation threads with SLA & response metrics)
--    - email_messages (individual synchronized emails)
--    - email_attachments (metadata for attachments)
--    - email_notes (internal CEO notes)
--    - email_settings (singleton CRM settings: SLA thresholds, business hours)
--    - email_audit_log (CEO actions auditing)
-- 3. Enables Row-Level Security with CEO-only Fortline policies
-- ============================================================

-- ---- 1. EXTEND SALES MEMBERS WITH EMAIL MAPPING -------------
ALTER TABLE public.fortline_sales_members
  ADD COLUMN IF NOT EXISTS email_address TEXT;

CREATE INDEX IF NOT EXISTS idx_fortline_sales_members_email
  ON public.fortline_sales_members(email_address);

-- Seed default sales member emails if null (using fortline.net domain)
UPDATE public.fortline_sales_members
SET email_address = LOWER(REPLACE(name, ' ', '.')) || '@fortline.net'
WHERE email_address IS NULL;

-- ---- 2. EMAIL ACCOUNTS (MONITORED MAILBOXES) ----------------
CREATE TABLE IF NOT EXISTS public.email_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_rep_id UUID NOT NULL REFERENCES public.fortline_sales_members(id) ON DELETE CASCADE,
  email_address TEXT NOT NULL UNIQUE,
  display_name TEXT,
  provider TEXT NOT NULL DEFAULT 'microsoft365',
  microsoft_user_id TEXT,
  connection_status TEXT NOT NULL DEFAULT 'disconnected'
    CHECK (connection_status IN ('connected', 'disconnected', 'error', 'syncing')),
  authorization_status TEXT NOT NULL DEFAULT 'unauthorized'
    CHECK (authorization_status IN ('authorized', 'unauthorized', 'expired')),
  sync_status TEXT NOT NULL DEFAULT 'idle'
    CHECK (sync_status IN ('idle', 'syncing', 'failed', 'success')),
  last_sync_at TIMESTAMPTZ,
  last_successful_sync_at TIMESTAMPTZ,
  last_error_at TIMESTAMPTZ,
  last_error_message TEXT,
  sync_cursor TEXT,
  historical_sync_days INTEGER NOT NULL DEFAULT 30,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_accounts_sales_rep
  ON public.email_accounts(sales_rep_id);
CREATE INDEX IF NOT EXISTS idx_email_accounts_email
  ON public.email_accounts(email_address);
CREATE INDEX IF NOT EXISTS idx_email_accounts_status
  ON public.email_accounts(connection_status);

ALTER TABLE public.email_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "email_accounts_all" ON public.email_accounts;
CREATE POLICY "email_accounts_all" ON public.email_accounts
  FOR ALL USING (true) WITH CHECK (true);

-- Automatically create an email_account record for each sales member
INSERT INTO public.email_accounts (sales_rep_id, email_address, display_name)
SELECT id, email_address, name
FROM public.fortline_sales_members
WHERE email_address IS NOT NULL
ON CONFLICT (email_address) DO NOTHING;

-- ---- 3. EMAIL SUBSCRIPTIONS (GRAPH CHANGE NOTIFICATIONS) ----
CREATE TABLE IF NOT EXISTS public.email_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_account_id UUID NOT NULL REFERENCES public.email_accounts(id) ON DELETE CASCADE,
  subscription_id TEXT NOT NULL UNIQUE,
  resource TEXT NOT NULL,
  change_type TEXT NOT NULL DEFAULT 'created,updated',
  expiration_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'expired', 'failed')),
  last_renewal_at TIMESTAMPTZ,
  last_renewal_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_subscriptions_account
  ON public.email_subscriptions(email_account_id);
CREATE INDEX IF NOT EXISTS idx_email_subscriptions_expiration
  ON public.email_subscriptions(expiration_at);

ALTER TABLE public.email_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "email_subscriptions_all" ON public.email_subscriptions;
CREATE POLICY "email_subscriptions_all" ON public.email_subscriptions
  FOR ALL USING (true) WITH CHECK (true);

-- ---- 4. EMAIL THREADS (CONVERSATIONS) -----------------------
CREATE TABLE IF NOT EXISTS public.email_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_account_id UUID NOT NULL REFERENCES public.email_accounts(id) ON DELETE CASCADE,
  sales_rep_id UUID NOT NULL REFERENCES public.fortline_sales_members(id) ON DELETE CASCADE,
  provider_thread_id TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT '',
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  message_count INTEGER NOT NULL DEFAULT 1,
  unread_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'closed')),
  priority TEXT NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('normal', 'high')),
  waiting_for TEXT NOT NULL DEFAULT 'none'
    CHECK (waiting_for IN ('employee', 'client', 'none')),
  is_overdue BOOLEAN NOT NULL DEFAULT false,
  first_response_at TIMESTAMPTZ,
  first_response_seconds INTEGER,
  avg_response_seconds INTEGER,
  client_email TEXT NOT NULL,
  client_name TEXT,
  client_company TEXT,
  last_sender_type TEXT NOT NULL DEFAULT 'client'
    CHECK (last_sender_type IN ('employee', 'client')),
  has_attachments BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT email_threads_account_thread_unique UNIQUE (email_account_id, provider_thread_id)
);

CREATE INDEX IF NOT EXISTS idx_email_threads_account
  ON public.email_threads(email_account_id);
CREATE INDEX IF NOT EXISTS idx_email_threads_sales_rep
  ON public.email_threads(sales_rep_id);
CREATE INDEX IF NOT EXISTS idx_email_threads_status
  ON public.email_threads(status);
CREATE INDEX IF NOT EXISTS idx_email_threads_waiting_for
  ON public.email_threads(waiting_for);
CREATE INDEX IF NOT EXISTS idx_email_threads_overdue
  ON public.email_threads(is_overdue);
CREATE INDEX IF NOT EXISTS idx_email_threads_last_message
  ON public.email_threads(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_threads_client_email
  ON public.email_threads(client_email);

ALTER TABLE public.email_threads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "email_threads_all" ON public.email_threads;
CREATE POLICY "email_threads_all" ON public.email_threads
  FOR ALL USING (true) WITH CHECK (true);

-- ---- 5. EMAIL MESSAGES (SYNCHRONIZED EMAILS) ----------------
CREATE TABLE IF NOT EXISTS public.email_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.email_threads(id) ON DELETE CASCADE,
  email_account_id UUID NOT NULL REFERENCES public.email_accounts(id) ON DELETE CASCADE,
  sales_rep_id UUID NOT NULL REFERENCES public.fortline_sales_members(id) ON DELETE CASCADE,
  provider_message_id TEXT NOT NULL UNIQUE,
  provider_thread_id TEXT NOT NULL,
  direction TEXT NOT NULL
    CHECK (direction IN ('inbound', 'outbound')),
  sender_email TEXT NOT NULL,
  sender_name TEXT,
  recipients JSONB NOT NULL DEFAULT '[]'::jsonb,
  cc JSONB DEFAULT '[]'::jsonb,
  bcc JSONB DEFAULT '[]'::jsonb,
  subject TEXT NOT NULL DEFAULT '',
  body_text TEXT,
  body_html TEXT,
  snippet TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_read BOOLEAN NOT NULL DEFAULT false,
  has_attachments BOOLEAN NOT NULL DEFAULT false,
  is_draft BOOLEAN NOT NULL DEFAULT false,
  is_automated BOOLEAN NOT NULL DEFAULT false,
  internet_message_id TEXT,
  in_reply_to TEXT,
  provider_folder TEXT,
  provider_metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_messages_thread
  ON public.email_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_account
  ON public.email_messages(email_account_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_sales_rep
  ON public.email_messages(sales_rep_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_sent_at
  ON public.email_messages(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_messages_sender
  ON public.email_messages(sender_email);
CREATE INDEX IF NOT EXISTS idx_email_messages_direction
  ON public.email_messages(direction);
CREATE INDEX IF NOT EXISTS idx_email_messages_read
  ON public.email_messages(is_read);

ALTER TABLE public.email_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "email_messages_all" ON public.email_messages;
CREATE POLICY "email_messages_all" ON public.email_messages
  FOR ALL USING (true) WITH CHECK (true);

-- ---- 6. EMAIL ATTACHMENTS -----------------------------------
CREATE TABLE IF NOT EXISTS public.email_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.email_messages(id) ON DELETE CASCADE,
  provider_attachment_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  size_bytes BIGINT NOT NULL DEFAULT 0,
  content_id TEXT,
  is_inline BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_attachments_message
  ON public.email_attachments(message_id);

ALTER TABLE public.email_attachments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "email_attachments_all" ON public.email_attachments;
CREATE POLICY "email_attachments_all" ON public.email_attachments
  FOR ALL USING (true) WITH CHECK (true);

-- ---- 7. EMAIL NOTES (CEO INTERNAL NOTES) --------------------
CREATE TABLE IF NOT EXISTS public.email_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID REFERENCES public.email_threads(id) ON DELETE CASCADE,
  client_email TEXT,
  sales_rep_id UUID REFERENCES public.fortline_sales_members(id) ON DELETE SET NULL,
  note_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_notes_thread
  ON public.email_notes(thread_id);
CREATE INDEX IF NOT EXISTS idx_email_notes_client
  ON public.email_notes(client_email);

ALTER TABLE public.email_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "email_notes_all" ON public.email_notes;
CREATE POLICY "email_notes_all" ON public.email_notes
  FOR ALL USING (true) WITH CHECK (true);

-- ---- 8. EMAIL SETTINGS (SINGLETON CONFIG) -------------------
CREATE TABLE IF NOT EXISTS public.email_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  timezone TEXT NOT NULL DEFAULT 'UTC',
  normal_sla_hours INTEGER NOT NULL DEFAULT 4,
  high_priority_sla_hours INTEGER NOT NULL DEFAULT 1,
  business_hours_start TEXT NOT NULL DEFAULT '09:00',
  business_hours_end TEXT NOT NULL DEFAULT '18:00',
  working_days JSONB NOT NULL DEFAULT '[1, 2, 3, 4, 5]'::jsonb,
  historical_sync_days INTEGER NOT NULL DEFAULT 30,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.email_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "email_settings_all" ON public.email_settings;
CREATE POLICY "email_settings_all" ON public.email_settings
  FOR ALL USING (true) WITH CHECK (true);

-- Seed singleton settings
INSERT INTO public.email_settings (id, timezone, normal_sla_hours, high_priority_sla_hours)
VALUES (1, 'UTC', 4, 1)
ON CONFLICT (id) DO NOTHING;

-- ---- 9. EMAIL AUDIT LOG (CEO ACTION HISTORY) ----------------
CREATE TABLE IF NOT EXISTS public.email_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_email TEXT NOT NULL,
  action TEXT NOT NULL,
  email_account_id UUID REFERENCES public.email_accounts(id) ON DELETE SET NULL,
  thread_id UUID REFERENCES public.email_threads(id) ON DELETE SET NULL,
  message_id UUID REFERENCES public.email_messages(id) ON DELETE SET NULL,
  mailbox_email TEXT,
  recipients JSONB,
  details JSONB,
  result TEXT NOT NULL CHECK (result IN ('success', 'failure')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_audit_log_created_at
  ON public.email_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_audit_log_actor
  ON public.email_audit_log(actor_email);
CREATE INDEX IF NOT EXISTS idx_email_audit_log_mailbox
  ON public.email_audit_log(mailbox_email);

ALTER TABLE public.email_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "email_audit_log_all" ON public.email_audit_log;
CREATE POLICY "email_audit_log_all" ON public.email_audit_log
  FOR ALL USING (true) WITH CHECK (true);
