# Global AI Agent ON/OFF Master Switch

The Global AI Agent Toggle is a company-wide master switch that controls whether the automated WhatsApp AI Agent is actively replying to inbound student messages and sending scheduled Meta template follow-ups.

---

## 1. How It Works

### Goal
Prevent the sales team and the WhatsApp AI Agent from replying to the same student at the same time.

### Master States
- **ON (`true`) — Green (`#25D366`)**:
  - Indicator: `AI Agent ● ON`
  - Tooltip: *AI is replying to all WhatsApp chats*
  - AI actively generates and sends automated text & voice note replies to incoming messages.
  - 3-day Meta template follow-ups (`followup_guidance_v1`, `followup_guidance_v1_roman`, `followup_guidance_urdu`) can send when due.
- **OFF (`false`) — Red (`#DC2626`)**:
  - Indicator: `AI Agent ○ OFF`
  - Tooltip: *AI paused — sales team only*
  - Inbound WhatsApp messages continue to appear in the CRM inbox in real-time.
  - Sales agents manually answer customer conversations.
  - Automated WhatsApp AI text and voice replies are completely paused.
  - Scheduled follow-up templates are held in the queue without being claimed or sent.

---

## 2. UI Placement

- Located in the CRM top header (`src/components/layout/header.tsx`) **immediately beside the brightness / theme toggle button (`ModeToggle`)**.
- Visible on every authenticated CRM page (Inbox, Dashboard, Contacts, Settings, Automations, etc.).
- One-click toggle with optimistic locking, loading spinner, and toast notifications.
- Automatically synchronizes across all users every 20 seconds.

---

## 3. Database Schema

### Source of Truth: `public.crm_ai_agent_settings`
```sql
CREATE TABLE public.crm_ai_agent_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by_user_id TEXT,
  updated_by_email TEXT,
  CHECK (id = 1)
);
```

### Shared n8n Operations Config: `public.itechskill_operations_config`
```sql
CREATE TABLE public.itechskill_operations_config (
  config_key TEXT PRIMARY KEY,
  config_value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Audit Log: `public.crm_ai_agent_audit_logs`
Records every toggle change, timestamp, and the user who triggered it.

---

## 4. API Endpoints

1. **`GET /api/crm/ai-agent`**
   - Requires authenticated user session.
   - Returns: `{ "ok": true, "enabled": true, "updated_at": "...", "updated_by_email": "..." }`

2. **`PATCH /api/crm/ai-agent`**
   - Requires authenticated user session. Rate-limited to 3 req/sec per user.
   - Body: `{ "enabled": false }`
   - Updates CRM DB, synchronizes n8n config, and logs audit record.

3. **`GET /api/crm/ai-agent/status`**
   - Machine-readable status for n8n / server-to-server calls.
   - Authenticates via header `x-itechskill-crm-secret: <N8N_CRM_WEBHOOK_SECRET>` or user session.
   - Returns: `{ "ok": true, "enabled": true, "updated_at": "..." }`

---

## 5. Verification & Testing

- Unit tests: `npm test`
- Production build: `npm run build`
