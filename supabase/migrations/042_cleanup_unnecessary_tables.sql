-- ============================================================
-- Migration 042: Cleanup Unnecessary Tables for Fortline-Pvt CRM
--
-- This migration removes legacy tables from obsolete modules:
-- 1. Visual Flow Builder (flows, flow_nodes, flow_runs, flow_run_events)
-- 2. Rules Automation Engine (automations, automation_steps, automation_logs, automation_pending_executions)
-- 3. Legacy AI Agent & Knowledge RAG (ai_configs, ai_knowledge_documents, ai_knowledge_chunks, ai_usage_log, crm_ai_agent_settings, crm_ai_agent_audit_logs)
-- 4. Bulk Marketing Broadcasts (broadcasts, broadcast_recipients)
-- 5. Sales Pipelines & Deals (pipelines, pipeline_stages, deals)
-- 6. Telephony / Call Center Tracker (calls)
-- 7. Team Self-Signup Invitations & Legacy Presence (account_invitations, member_presence)
-- 8. Obsolete iTechSkill Education & Automation tables (idempotent drops)
--
-- RETAINED CORE FORTLINE TABLES:
-- - accounts
-- - profiles
-- - fortline_company_profile
-- - fortline_sales_members
-- - fortline_channels
-- - fortline_kpi_config
-- - fortline_audit_log
-- - contacts
-- - tags
-- - contact_tags
-- - custom_fields
-- - contact_custom_values
-- - contact_notes
-- - conversations
-- - messages
-- - message_reactions
-- - whatsapp_config
-- - message_templates
-- - quick_replies
-- - notifications
-- - api_keys
-- - webhook_endpoints
-- ============================================================

-- 1. DROP VISUAL FLOW BUILDER TABLES
DROP TABLE IF EXISTS public.flow_run_events CASCADE;
DROP TABLE IF EXISTS public.flow_runs CASCADE;
DROP TABLE IF EXISTS public.flow_nodes CASCADE;
DROP TABLE IF EXISTS public.flows CASCADE;

-- 2. DROP RULES AUTOMATIONS ENGINE TABLES
DROP TABLE IF EXISTS public.automation_pending_executions CASCADE;
DROP TABLE IF EXISTS public.automation_logs CASCADE;
DROP TABLE IF EXISTS public.automation_steps CASCADE;
DROP TABLE IF EXISTS public.automations CASCADE;

-- 3. DROP LEGACY AI AGENT & KNOWLEDGE RAG TABLES
DROP TABLE IF EXISTS public.crm_ai_agent_audit_logs CASCADE;
DROP TABLE IF EXISTS public.crm_ai_agent_settings CASCADE;
DROP TABLE IF EXISTS public.ai_usage_log CASCADE;
DROP TABLE IF EXISTS public.ai_knowledge_chunks CASCADE;
DROP TABLE IF EXISTS public.ai_knowledge_documents CASCADE;
DROP TABLE IF EXISTS public.ai_configs CASCADE;

-- 4. DROP BULK MARKETING BROADCAST TABLES
DROP TABLE IF EXISTS public.broadcast_recipients CASCADE;
DROP TABLE IF EXISTS public.broadcasts CASCADE;

-- 5. DROP SALES PIPELINES & DEALS TABLES
DROP TABLE IF EXISTS public.deals CASCADE;
DROP TABLE IF EXISTS public.pipeline_stages CASCADE;
DROP TABLE IF EXISTS public.pipelines CASCADE;

-- 6. DROP TELEPHONY / CALL LOGGING TABLES
DROP TABLE IF EXISTS public.calls CASCADE;

-- 7. DROP TEAM INVITATIONS & LEGACY USER PRESENCE
DROP TABLE IF EXISTS public.account_invitations CASCADE;
DROP TABLE IF EXISTS public.member_presence CASCADE;

-- 8. IDEMPOTENT CLEANUP OF OBSOLETE EDUCATION & ITECHSKILL TABLES
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

-- 9. DROP OBSOLETE HELPER FUNCTIONS / RPCS
DROP FUNCTION IF EXISTS public.increment_flow_counter CASCADE;
DROP FUNCTION IF EXISTS public.increment_automation_counter CASCADE;
DROP FUNCTION IF EXISTS public.increment_broadcast_sent_count CASCADE;
DROP FUNCTION IF EXISTS public.increment_broadcast_delivered_count CASCADE;
DROP FUNCTION IF EXISTS public.increment_broadcast_read_count CASCADE;
DROP FUNCTION IF EXISTS public.increment_broadcast_failed_count CASCADE;
DROP FUNCTION IF EXISTS public.create_account_invitation CASCADE;
DROP FUNCTION IF EXISTS public.accept_account_invitation CASCADE;
DROP FUNCTION IF EXISTS public.revoke_account_invitation CASCADE;
