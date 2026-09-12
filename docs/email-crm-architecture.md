# Fortline-Pvt Email CRM — Technical Architecture

## 1. Architectural Overview

The Fortline-Pvt Executive Sales Operations CRM unifies two mission-critical sales communication channels into one CEO dashboard:
1. **WhatsApp CRM** — Gateway / Evolution API / Meta Cloud API
2. **Microsoft 365 / Outlook Email CRM** — Microsoft Graph API / Exchange Online

Both channels operate independently at the data ingestion and provider layer, but share the core Fortline sales monitoring domain (`fortline_sales_members`, presence, audit logging, and contacts).

```
                      ┌────────────────────────────────────────┐
                      │          Fortline-Pvt CEO CRM          │
                      └───────────────────┬────────────────────┘
                                          │
                   ┌──────────────────────┴──────────────────────┐
                   ▼                                             ▼
       ┌────────────────────────┐                   ┌────────────────────────┐
       │      WhatsApp CRM      │                   │  Microsoft 365 CRM     │
       └───────────┬────────────┘                   └───────────┬────────────┘
                   │                                             │
      ┌────────────┴────────────┐                   ┌───────────┴────────────┐
      │ Meta / Evolution API    │                   │ Microsoft Graph API    │
      │ 30 WhatsApp Channels    │                   │ 30 Monitored Mailboxes │
      └─────────────────────────┘                   └────────────────────────┘
```

---

## 2. CEO-Only Security & Send-As Invariants

Per AGENTS.md §11, §14, §15, §17, §18:
- **CEO-Only Model**: Only authenticated CEOs/Admins have access to the dashboard. Sales employees do not log into the CRM.
- **Authoritative Mailbox Resolution**: The client provides `email_account_id`. The backend resolves the authoritative mailbox from the database (`email_accounts` table). The browser cannot spoof arbitrary `fromEmail` headers.
- **Cross-Mailbox Send Prevention**: Every Graph call explicitly executes through `/users/{authorized-mailbox}/sendMail` or `/users/{authorized-mailbox}/messages/{id}/reply`.
- **Audit Logging**: Every CEO send, reply, forward, and connection test is recorded with timestamp, actor, mailbox, and recipient parameters in `email_audit_log`.

---

## 3. Database Schema (Migration 044)

The Email CRM schema is strictly additive and isolated:
- `email_accounts` — 1-to-1 mapping with `fortline_sales_members`
- `email_threads` — Conversation threads grouped by `(email_account_id, provider_thread_id)`
- `email_messages` — Normalized individual emails with body, direction, recipients, attachments
- `email_attachments` — Metadata and download proxy references
- `email_subscriptions` — Microsoft Graph webhook lifecycle management
- `email_notes` — Internal CEO notes on threads and clients
- `email_settings` — Singleton configuration (SLA hours, business hours, timezone)
- `email_audit_log` — Immutable record of all CEO actions

---

## 4. Response Time & SLA Calculation Engine

Response times and waiting states are deterministic:
- **First Response Time**: Measured from the first inbound client email to the first outbound sales rep reply.
- **Average Response Time**: Mean elapsed time across all inbound $\rightarrow$ outbound cycles.
- **Waiting State**:
  - If the last message is inbound $\rightarrow$ `waiting_for = 'employee'`
  - If the last message is outbound $\rightarrow$ `waiting_for = 'client'`
- **Overdue SLA**:
  - If `waiting_for === 'employee'` and `time_elapsed > SLA_THRESHOLD` (default 4h for normal, 1h for high priority) $\rightarrow$ `is_overdue = true`.
- **Automated Email Filtering**: Out-of-office autoreplies, NDR bounces, and newsletter bots are flagged via `is_automated` and excluded from SLA calculations.
