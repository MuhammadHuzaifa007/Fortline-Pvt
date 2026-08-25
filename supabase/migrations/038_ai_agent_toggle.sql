-- ============================================================
-- 038_ai_agent_toggle.sql — Global AI Agent Master Switch
--
-- Adds:
-- 1. public.crm_ai_agent_settings (single-row master switch)
-- 2. public.itechskill_operations_config (shared n8n operations config)
-- 3. public.crm_ai_agent_audit_logs (audit history of toggles)
--
-- Idempotent — safe to run multiple times.
-- ============================================================

-- 1. Main settings table for CRM
CREATE TABLE IF NOT EXISTS public.crm_ai_agent_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by_user_id TEXT,
  updated_by_email TEXT,
  CHECK (id = 1)
);

INSERT INTO public.crm_ai_agent_settings (id, enabled, updated_at)
VALUES (1, true, now())
ON CONFLICT (id) DO NOTHING;

-- 2. Operations config table shared with n8n
CREATE TABLE IF NOT EXISTS public.itechskill_operations_config (
  config_key TEXT PRIMARY KEY,
  config_value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.itechskill_operations_config (config_key, config_value, description, updated_at)
VALUES (
  'ai_agent_enabled',
  'true'::jsonb,
  'Global WhatsApp AI Agent master switch. false = no live AI replies and no template follow-ups.',
  now()
)
ON CONFLICT (config_key) DO UPDATE SET
  config_value = excluded.config_value,
  updated_at = now();

-- 3. Audit logs table for all toggle actions
CREATE TABLE IF NOT EXISTS public.crm_ai_agent_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  old_enabled BOOLEAN,
  new_enabled BOOLEAN NOT NULL,
  changed_by_user_id TEXT,
  changed_by_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Enable RLS and create policies
ALTER TABLE public.crm_ai_agent_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itechskill_operations_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_ai_agent_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "crm_ai_agent_settings_select" ON public.crm_ai_agent_settings;
CREATE POLICY "crm_ai_agent_settings_select" ON public.crm_ai_agent_settings
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "crm_ai_agent_settings_update" ON public.crm_ai_agent_settings;
CREATE POLICY "crm_ai_agent_settings_update" ON public.crm_ai_agent_settings
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "crm_ai_agent_settings_insert" ON public.crm_ai_agent_settings;
CREATE POLICY "crm_ai_agent_settings_insert" ON public.crm_ai_agent_settings
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "itechskill_operations_config_select" ON public.itechskill_operations_config;
CREATE POLICY "itechskill_operations_config_select" ON public.itechskill_operations_config
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "itechskill_operations_config_all" ON public.itechskill_operations_config;
CREATE POLICY "itechskill_operations_config_all" ON public.itechskill_operations_config
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "crm_ai_agent_audit_logs_select" ON public.crm_ai_agent_audit_logs;
CREATE POLICY "crm_ai_agent_audit_logs_select" ON public.crm_ai_agent_audit_logs
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "crm_ai_agent_audit_logs_insert" ON public.crm_ai_agent_audit_logs;
CREATE POLICY "crm_ai_agent_audit_logs_insert" ON public.crm_ai_agent_audit_logs
  FOR INSERT TO authenticated WITH CHECK (true);
