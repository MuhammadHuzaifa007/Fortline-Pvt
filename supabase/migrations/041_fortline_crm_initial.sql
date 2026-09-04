-- ============================================================
-- Migration 041: Fortline-Pvt Executive Sales-Operations CRM
--
-- 1. Fortline business entities:
--    - fortline_company_profile
--    - fortline_sales_members (30 sales member records)
--    - fortline_channels (30 WhatsApp channel mappings)
--    - fortline_kpi_config (CEO-editable SLA/KPI thresholds)
--    - fortline_audit_log (CEO audit history)
-- 2. Schema conversions on generic CRM tables:
--    - contacts (assigned_sales_member_id, channel_id, contact_type)
--    - conversations (assigned_sales_member_id, channel_phone_number_id, SLA fields)
--    - messages (channel_phone_number_id, sales_member_id)
--    - notifications (widened types, severity, resolution)
--    - whatsapp_config (allow multi-channel per account)
-- 3. Drops obsolete iTechSkill education & n8n tables.
-- 4. Seeds 30 initial Fortline sales members and channels.
-- ============================================================

-- ---- 1. FORTLINE COMPANY PROFILE ----------------------------
CREATE TABLE IF NOT EXISTS public.fortline_company_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL DEFAULT 'Fortline-Pvt',
  industry TEXT NOT NULL DEFAULT 'IT Infrastructure & Technology Services',
  contact_email TEXT,
  contact_phone TEXT,
  website TEXT,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fortline_company_profile_account_id_key UNIQUE (account_id)
);

ALTER TABLE public.fortline_company_profile ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fortline_company_profile_all" ON public.fortline_company_profile;
CREATE POLICY "fortline_company_profile_all" ON public.fortline_company_profile
  FOR ALL USING (true) WITH CHECK (true);

-- ---- 2. FORTLINE SALES MEMBERS (30 RECORDS) -----------------
CREATE TABLE IF NOT EXISTS public.fortline_sales_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  division TEXT NOT NULL,
  designation TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  channel_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  presence_status TEXT NOT NULL DEFAULT 'unknown'
    CHECK (presence_status IN ('online', 'away', 'offline', 'disconnected', 'unknown')),
  presence_source TEXT NOT NULL DEFAULT 'none'
    CHECK (presence_source IN ('heartbeat', 'channel_activity', 'inferred', 'manual', 'none')),
  last_activity_at TIMESTAMPTZ,
  last_heartbeat_at TIMESTAMPTZ,
  last_inbound_at TIMESTAMPTZ,
  last_outbound_at TIMESTAMPTZ,
  kpi_profile JSONB NOT NULL DEFAULT '{"first_response_target_min": 15, "followup_target_hours": 24}'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fortline_sales_members_account
  ON public.fortline_sales_members(account_id);
CREATE INDEX IF NOT EXISTS idx_fortline_sales_members_presence
  ON public.fortline_sales_members(presence_status);
CREATE INDEX IF NOT EXISTS idx_fortline_sales_members_channel
  ON public.fortline_sales_members(channel_id);

ALTER TABLE public.fortline_sales_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fortline_sales_members_all" ON public.fortline_sales_members;
CREATE POLICY "fortline_sales_members_all" ON public.fortline_sales_members
  FOR ALL USING (true) WITH CHECK (true);

-- ---- 3. FORTLINE CHANNELS (SECURE MAPPING) ------------------
CREATE TABLE IF NOT EXISTS public.fortline_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  sales_member_id UUID REFERENCES public.fortline_sales_members(id) ON DELETE SET NULL,
  phone_number_id TEXT NOT NULL UNIQUE,
  waba_id TEXT,
  display_phone_number TEXT,
  connection_status TEXT NOT NULL DEFAULT 'disconnected'
    CHECK (connection_status IN ('connected', 'disconnected')),
  webhook_status TEXT NOT NULL DEFAULT 'active'
    CHECK (webhook_status IN ('active', 'degraded', 'failing', 'pending')),
  last_successful_event_at TIMESTAMPTZ,
  last_delivery_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fortline_channels_sales_member
  ON public.fortline_channels(sales_member_id);
CREATE INDEX IF NOT EXISTS idx_fortline_channels_phone_number_id
  ON public.fortline_channels(phone_number_id);

ALTER TABLE public.fortline_channels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fortline_channels_all" ON public.fortline_channels;
CREATE POLICY "fortline_channels_all" ON public.fortline_channels
  FOR ALL USING (true) WITH CHECK (true);

-- ---- 4. FORTLINE KPI & SLA CONFIG ---------------------------
CREATE TABLE IF NOT EXISTS public.fortline_kpi_config (
  id INTEGER PRIMARY KEY DEFAULT 1,
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  first_response_target_min INTEGER NOT NULL DEFAULT 15,
  followup_target_hours INTEGER NOT NULL DEFAULT 24,
  unanswered_threshold_min INTEGER NOT NULL DEFAULT 30,
  overdue_threshold_hours INTEGER NOT NULL DEFAULT 48,
  online_window_min INTEGER NOT NULL DEFAULT 5,
  away_window_min INTEGER NOT NULL DEFAULT 60,
  business_hours_start TEXT NOT NULL DEFAULT '09:00',
  business_hours_end TEXT NOT NULL DEFAULT '18:00',
  alert_severity_unanswered TEXT NOT NULL DEFAULT 'warning',
  alert_severity_sla_breach TEXT NOT NULL DEFAULT 'critical',
  alert_severity_disconnect TEXT NOT NULL DEFAULT 'critical',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fortline_kpi_config_id_check CHECK (id = 1)
);

INSERT INTO public.fortline_kpi_config (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.fortline_kpi_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fortline_kpi_config_all" ON public.fortline_kpi_config;
CREATE POLICY "fortline_kpi_config_all" ON public.fortline_kpi_config
  FOR ALL USING (true) WITH CHECK (true);

-- ---- 5. FORTLINE AUDIT LOG ----------------------------------
CREATE TABLE IF NOT EXISTS public.fortline_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  actor_email TEXT,
  actor_role TEXT NOT NULL DEFAULT 'ceo',
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fortline_audit_log_created
  ON public.fortline_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fortline_audit_log_entity
  ON public.fortline_audit_log(entity_type, entity_id);

ALTER TABLE public.fortline_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fortline_audit_log_all" ON public.fortline_audit_log;
CREATE POLICY "fortline_audit_log_all" ON public.fortline_audit_log
  FOR ALL USING (true) WITH CHECK (true);

-- ---- 6. EXTEND CORE CRM TABLES ------------------------------

-- contacts: add sales member assignment and channel tracking
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS assigned_sales_member_id UUID REFERENCES public.fortline_sales_members(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS channel_id TEXT,
  ADD COLUMN IF NOT EXISTS contact_type TEXT DEFAULT 'lead';

CREATE INDEX IF NOT EXISTS idx_contacts_assigned_sales_member
  ON public.contacts(assigned_sales_member_id);
CREATE INDEX IF NOT EXISTS idx_contacts_channel_id
  ON public.contacts(channel_id);

-- conversations: add sales member assignment, channel, and SLA metrics
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS assigned_sales_member_id UUID REFERENCES public.fortline_sales_members(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS channel_phone_number_id TEXT,
  ADD COLUMN IF NOT EXISTS first_response_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS first_response_time_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS is_unanswered BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_overdue BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sla_breached BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_conversations_assigned_sales_member
  ON public.conversations(assigned_sales_member_id);
CREATE INDEX IF NOT EXISTS idx_conversations_unanswered
  ON public.conversations(is_unanswered);
CREATE INDEX IF NOT EXISTS idx_conversations_overdue
  ON public.conversations(is_overdue);
CREATE INDEX IF NOT EXISTS idx_conversations_sla_breached
  ON public.conversations(sla_breached);

-- messages: add channel and sales member attribution
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS channel_phone_number_id TEXT,
  ADD COLUMN IF NOT EXISTS sales_member_id UUID REFERENCES public.fortline_sales_members(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_messages_sales_member
  ON public.messages(sales_member_id);

-- whatsapp_config: drop single-account unique constraint to allow multi-channel mapping
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'whatsapp_config_account_id_key'
      AND conrelid = 'public.whatsapp_config'::regclass
  ) THEN
    ALTER TABLE public.whatsapp_config DROP CONSTRAINT whatsapp_config_account_id_key;
  END IF;
END $$;

ALTER TABLE public.whatsapp_config
  ADD COLUMN IF NOT EXISTS sales_member_id UUID REFERENCES public.fortline_sales_members(id) ON DELETE SET NULL;

-- notifications: widen type and add severity / resolution fields
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'info',
  ADD COLUMN IF NOT EXISTS entity_type TEXT,
  ADD COLUMN IF NOT EXISTS entity_id TEXT,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

DO $$
BEGIN
  -- Drop restrictive type check constraint if present
  ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
END $$;

-- ---- 7. CLEANUP OBSOLETE ITECHSKILL TABLES --------------------
DROP TABLE IF EXISTS public.itechskill_student_sessions CASCADE;
DROP TABLE IF EXISTS public.itechskill_student_360 CASCADE;
DROP TABLE IF EXISTS public.itechskill_student_memory_facts CASCADE;
DROP TABLE IF EXISTS public.itechskill_student_memory_summaries CASCADE;
DROP TABLE IF EXISTS public.itechskill_conversation_logs CASCADE;
DROP TABLE IF EXISTS public.itechskill_handoff_cases CASCADE;
DROP TABLE IF EXISTS public.itechskill_followup_jobs CASCADE;
DROP TABLE IF EXISTS public.itechskill_enrollment_applications CASCADE;
DROP TABLE IF EXISTS public.itechskill_operations_alerts CASCADE;
DROP TABLE IF EXISTS public.itechskill_catalog_change_requests CASCADE;
DROP TABLE IF EXISTS public.itechskill_catalog_versions CASCADE;
DROP TABLE IF EXISTS public.itechskill_catalog_publish_jobs CASCADE;
DROP TABLE IF EXISTS public.itechskill_catalog_audits CASCADE;
DROP TABLE IF EXISTS public.itechskill_evaluation_runs CASCADE;
DROP TABLE IF EXISTS public.itechskill_evaluation_results CASCADE;
DROP TABLE IF EXISTS public.itechskill_operations_config CASCADE;
DROP TABLE IF EXISTS public.itechskill_processed_messages CASCADE;
DROP TABLE IF EXISTS public.itechskill_lead_events CASCADE;
DROP TABLE IF EXISTS public.itechskill_workflow_events CASCADE;
DROP TABLE IF EXISTS public.itechskill_call_recordings CASCADE;
DROP TABLE IF EXISTS public.itechskill_call_summaries CASCADE;
DROP TABLE IF EXISTS public.course_documents CASCADE;
DROP TABLE IF EXISTS public.itechskill_audit_log CASCADE;

-- ---- 8. SEED 30 FORTLINE SALES MEMBERS -----------------------
DO $$
DECLARE
  v_account_id UUID;
  v_member_id UUID;
  v_channel_num INT;
  v_phone TEXT;
  v_phone_id TEXT;
  v_names TEXT[] := ARRAY[
    'Tariq Mahmood', 'Zeeshan Ali', 'Bilal Hassan', 'Hamza Farooq', 'Usman Rauf', 'Saad Qureshi',
    'Fahad Siddiqui', 'Adeel Akhtar', 'Khurram Shahzad', 'Omer Latif', 'Daniyal Naim', 'Mustafa Kamal',
    'Arsalan Javed', 'Rizwan Haider', 'Waqas Anwar', 'Zubair Baig', 'Naveed Akhtar', 'Junaid Bashir',
    'Asim Munir', 'Rashid Minhas', 'Imran Chaudhry', 'Salman Butt', 'Shahbaz Gillani', 'Kashif Mehmood',
    'Haris Abbasi', 'Noman Sarwar', 'Farhan Tahir', 'Babar Azam', 'Shoaib Malik', 'Yasir Arafat'
  ];
  v_divisions TEXT[] := ARRAY[
    'Enterprise Servers', 'Enterprise Servers', 'Enterprise Servers', 'Enterprise Servers', 'Enterprise Servers', 'Enterprise Servers',
    'Laptops & Corporate Fleet', 'Laptops & Corporate Fleet', 'Laptops & Corporate Fleet', 'Laptops & Corporate Fleet', 'Laptops & Corporate Fleet', 'Laptops & Corporate Fleet',
    'PCs & Hardware Components', 'PCs & Hardware Components', 'PCs & Hardware Components', 'PCs & Hardware Components', 'PCs & Hardware Components', 'PCs & Hardware Components',
    'Data Center Infrastructure', 'Data Center Infrastructure', 'Data Center Infrastructure', 'Data Center Infrastructure', 'Data Center Infrastructure', 'Data Center Infrastructure',
    'IT Managed & Cloud Services', 'IT Managed & Cloud Services', 'IT Managed & Cloud Services', 'IT Managed & Cloud Services', 'IT Managed & Cloud Services', 'IT Managed & Cloud Services'
  ];
  v_designations TEXT[] := ARRAY[
    'Lead Server Specialist', 'Senior Enterprise Account Exec', 'Server Sales Consultant', 'Enterprise Solution Architect', 'Server Account Specialist', 'Technical Sales Rep',
    'Corporate Fleet Lead', 'Senior Laptop Specialist', 'Commercial Hardware Exec', 'Client Computing Specialist', 'Fleet Sales Associate', 'Corporate Account Manager',
    'Hardware Solutions Lead', 'Senior Components Specialist', 'PC Hardware Consultant', 'OEM Hardware Associate', 'Component Sales Exec', 'Hardware Sales Consultant',
    'Data Center Solutions Lead', 'Senior Infrastructure Exec', 'Power & Cooling Specialist', 'Storage & Rack Consultant', 'Facility Infrastructure Exec', 'Data Center Account Manager',
    'Managed Services Lead', 'Cloud Solutions Specialist', 'IT Support Contract Exec', 'Infrastructure Services Exec', 'Network Solutions Consultant', 'Client Support Manager'
  ];
  v_statuses TEXT[] := ARRAY[
    'online', 'online', 'online', 'away', 'away', 'online',
    'online', 'away', 'offline', 'online', 'away', 'offline',
    'online', 'online', 'away', 'offline', 'online', 'away',
    'online', 'away', 'offline', 'disconnected', 'online', 'away',
    'online', 'online', 'away', 'offline', 'unknown', 'online'
  ];
  v_sources TEXT[] := ARRAY[
    'heartbeat', 'channel_activity', 'heartbeat', 'channel_activity', 'channel_activity', 'heartbeat',
    'heartbeat', 'channel_activity', 'inferred', 'heartbeat', 'channel_activity', 'inferred',
    'heartbeat', 'channel_activity', 'channel_activity', 'inferred', 'heartbeat', 'channel_activity',
    'heartbeat', 'channel_activity', 'inferred', 'none', 'heartbeat', 'channel_activity',
    'heartbeat', 'channel_activity', 'channel_activity', 'inferred', 'none', 'heartbeat'
  ];
BEGIN
  -- Resolve primary account
  SELECT id INTO v_account_id FROM public.accounts LIMIT 1;
  
  -- Insert only if fortline_sales_members is empty
  IF NOT EXISTS (SELECT 1 FROM public.fortline_sales_members) THEN
    FOR i IN 1..30 LOOP
      v_phone := '+92300' || LPAD((1000000 + i * 1357)::text, 7, '0');
      v_phone_id := 'phone_id_fortline_' || LPAD(i::text, 3, '0');

      INSERT INTO public.fortline_sales_members (
        account_id,
        name,
        division,
        designation,
        phone_number,
        channel_id,
        is_active,
        presence_status,
        presence_source,
        last_activity_at,
        last_heartbeat_at,
        last_inbound_at,
        last_outbound_at,
        kpi_profile,
        notes
      ) VALUES (
        v_account_id,
        v_names[i],
        v_divisions[i],
        v_designations[i],
        v_phone,
        v_phone_id,
        true,
        v_statuses[i],
        v_sources[i],
        CASE 
          WHEN v_statuses[i] = 'online' THEN now() - interval '2 minutes'
          WHEN v_statuses[i] = 'away' THEN now() - interval '25 minutes'
          WHEN v_statuses[i] = 'offline' THEN now() - interval '3 hours'
          ELSE now() - interval '1 day'
        END,
        CASE WHEN v_statuses[i] = 'online' THEN now() - interval '1 minute' ELSE NULL END,
        now() - (i * interval '15 minutes'),
        now() - (i * interval '18 minutes'),
        jsonb_build_object(
          'first_response_target_min', 15,
          'followup_target_hours', 24
        ),
        'Sales member for ' || v_divisions[i] || ' division.'
      ) RETURNING id INTO v_member_id;

      -- Create mapped channel in fortline_channels
      INSERT INTO public.fortline_channels (
        account_id,
        sales_member_id,
        phone_number_id,
        waba_id,
        display_phone_number,
        connection_status,
        webhook_status,
        last_successful_event_at
      ) VALUES (
        v_account_id,
        v_member_id,
        v_phone_id,
        'waba_fortline_prod_01',
        v_phone,
        CASE WHEN v_statuses[i] = 'disconnected' THEN 'disconnected' ELSE 'connected' END,
        'active',
        now() - (i * interval '10 minutes')
      ) ON CONFLICT (phone_number_id) DO NOTHING;
    END LOOP;
  END IF;
END $$;
