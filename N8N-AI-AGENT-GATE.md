# n8n Workflow Gates: Global AI Agent Master Switch

**Workflow Target:** `iTechSkill WhatsApp Company Website Credentials - 18-08-2026`  
**Purpose:** Ensure sales team and WhatsApp AI Agent never reply to the same student at the same time by enforcing the global master switch (`ai_agent_enabled`) in n8n before any automated replies or template follow-ups are sent.

---

## 1. Overview of Gating Logic

| Path | Gate Condition | When ON (`true`) | When OFF (`false`) |
| :--- | :--- | :--- | :--- |
| **Live Inbound WhatsApp Message** | `ai_agent_enabled === true` | AI Agent generates & sends response (text/voice), posts AI reply to CRM, and schedules 3-day follow-up. | **AI sends nothing.** Message is still ingested and visible in CRM inbox for manual sales reply. No follow-up job is created. |
| **Scheduled 3-Day Follow-ups** | `ai_agent_enabled === true` AND `template_followups_enabled === true` | Follow-up job is claimed and sent via Meta API. | **Follow-up is NOT sent.** Job stays in queue with status untouched until switch is turned ON again. |

---

## 2. Gate A: Live Inbound WhatsApp Message Path

### Placement
Add an **IF Node** named `IF AI Agent Enabled` immediately after `IF Process Message` evaluates to `true` (or immediately before `Send Student Reply` / `Send Student Voice Note Reply` / `Save AI Reply To CRM`).

### Option 1: Shared Postgres Query (Recommended if n8n connects to CRM Supabase)
Execute SQL query in a Postgres node before the IF gate:
```sql
SELECT COALESCE(
  (config_value #>> '{}')::boolean,
  (SELECT enabled FROM public.crm_ai_agent_settings WHERE id = 1),
  true
) AS ai_agent_enabled
FROM public.itechskill_operations_config
WHERE config_key = 'ai_agent_enabled';
```
*Note: If no row exists or key is missing, it evaluates to `true` (fail-open).*

### Option 2: HTTP Request to CRM Status Endpoint
Add an **HTTP Request** node:
- **Method:** `GET`
- **URL:** `https://itechskill-whatsapp-crm.vercel.app/api/crm/ai-agent/status` (or your CRM base URL)
- **Headers:**
  - `x-itechskill-crm-secret`: `{{ $env.N8N_CRM_WEBHOOK_SECRET }}`
- **Response Format:** JSON (`{ "ok": true, "enabled": true }`)

### IF Node Configuration (`IF AI Agent Enabled`)
- **Condition:** `{{ $json.ai_agent_enabled ?? $json.enabled ?? true }}` is equal to `true`
- **True Branch:** Continue to `Student Advisor` / `Send Student Reply` / `Send Student Voice Note Reply` / `Save AI Reply To CRM`.
- **False Branch:** Connect to end / No Operation (skip all AI sends, skip voice notes, skip AI reply insertion). Inbound message ingestion into CRM remains intact.

---

## 3. Gate B: Follow-up Claim SQL (3-Day Meta Templates)

Update the SQL node `Claim Due Student Follow-ups` to include the global AI master switch:

```sql
UPDATE public.itechskill_followup_queue
SET status = 'processing',
    claimed_at = now()
WHERE id IN (
  SELECT id
  FROM public.itechskill_followup_queue
  WHERE status = 'pending'
    AND due_at <= now()
    -- Must have template followups enabled
    AND coalesce((
      SELECT (config_value #>> '{}')::boolean
      FROM public.itechskill_operations_config
      WHERE config_key = 'template_followups_enabled'
    ), true)
    -- Must have global AI Agent switch ON
    AND coalesce((
      SELECT (config_value #>> '{}')::boolean
      FROM public.itechskill_operations_config
      WHERE config_key = 'ai_agent_enabled'
    ), true)
  ORDER BY due_at ASC
  LIMIT 20
  FOR UPDATE SKIP LOCKED
)
RETURNING *;
```

---

## 4. Gate C: Dual-Flag Enforcement on Follow-ups

Both flags must be `true` for a scheduled template follow-up (`followup_guidance_v1`, `followup_guidance_v1_roman`, `followup_guidance_urdu`) to be dispatched:
1. `template_followups_enabled == true`
2. `ai_agent_enabled == true`

If `ai_agent_enabled` is `false`, queued jobs remain in `pending` state and will be claimed automatically once the master switch is toggled back ON.

---

## 5. Operations Config Bootstrap SQL

Run once in your Supabase SQL editor:
```sql
INSERT INTO public.itechskill_operations_config (config_key, config_value, description)
VALUES (
  'ai_agent_enabled',
  'true'::jsonb,
  'Global WhatsApp AI Agent master switch from CRM header. false stops live replies and template follow-ups.'
)
ON CONFLICT (config_key) DO NOTHING;
```
