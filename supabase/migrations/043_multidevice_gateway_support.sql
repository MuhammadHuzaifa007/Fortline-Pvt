-- ============================================================
-- Migration 043: Multi-Device QR Code Gateway Support (Path B)
-- Allows 30 sales members to keep using their personal/company
-- WhatsApp mobile app while mirroring chats into Fortline CRM.
-- ============================================================

-- 1. Extend fortline_channels with QR gateway fields
ALTER TABLE public.fortline_channels
  ADD COLUMN IF NOT EXISTS channel_type TEXT NOT NULL DEFAULT 'cloud_api'
    CHECK (channel_type IN ('cloud_api', 'qr_gateway')),
  ADD COLUMN IF NOT EXISTS gateway_instance_id TEXT,
  ADD COLUMN IF NOT EXISTS qr_code_raw TEXT,
  ADD COLUMN IF NOT EXISTS pairing_state TEXT NOT NULL DEFAULT 'disconnected'
    CHECK (pairing_state IN ('connected', 'connecting', 'qrcode', 'disconnected')),
  ADD COLUMN IF NOT EXISTS last_qr_generated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS gateway_metadata JSONB DEFAULT '{}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS idx_fortline_channels_gateway_instance
  ON public.fortline_channels (gateway_instance_id)
  WHERE gateway_instance_id IS NOT NULL;

-- 2. Gateway global settings table for host URL and API key
CREATE TABLE IF NOT EXISTS public.fortline_gateway_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  gateway_url TEXT NOT NULL DEFAULT 'http://localhost:8080',
  api_key TEXT NOT NULL DEFAULT '',
  webhook_secret TEXT NOT NULL DEFAULT '',
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_fortline_gateway_config_account UNIQUE (account_id)
);

ALTER TABLE public.fortline_gateway_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fortline_gateway_config_all" ON public.fortline_gateway_config;
CREATE POLICY "fortline_gateway_config_all" ON public.fortline_gateway_config
  FOR ALL
  USING (account_id = public.current_account_id())
  WITH CHECK (account_id = public.current_account_id());

-- 3. Pre-seed gateway instance IDs for any existing fortline_channels
UPDATE public.fortline_channels
SET 
  gateway_instance_id = 'fortline_rep_' || SUBSTRING(id::text, 1, 8),
  channel_type = 'qr_gateway',
  pairing_state = 'disconnected'
WHERE gateway_instance_id IS NULL;
