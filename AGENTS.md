<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->


# FORTLINE-PVT — AGENT ENGINEERING CONTRACT

## 1. PURPOSE

This repository is the Fortline-Pvt Executive Sales Operations CRM.

The system is a production-oriented, CEO-only sales communication monitoring and operations platform.

The current application contains:

1. WhatsApp CRM
2. Microsoft 365 / Outlook Email CRM
3. CEO-only authentication
4. Sales-member monitoring
5. Communication history
6. Client/contact data
7. Accountability metrics
8. Notifications/alerts
9. CRM configuration
10. Supabase/PostgreSQL backend
11. Production deployment infrastructure

This file is a mandatory engineering contract for every coding agent operating in this repository.

The agent MUST follow this file before making changes.

The agent MUST NOT silently reinterpret business requirements.

The agent MUST NOT make unrelated changes.

The agent MUST NOT rewrite working systems merely because another architecture appears preferable.

---

# 2. GOLDEN RULE — DO NOT CHANGE WHAT WAS NOT REQUESTED

The agent MUST implement only the requested task and the minimum supporting changes required for that task.

Do NOT:

- refactor unrelated code
- rename unrelated files
- change database schemas unnecessarily
- rewrite working components unnecessarily
- replace the authentication architecture without approval
- replace the WhatsApp architecture without approval
- replace the Microsoft 365 architecture without approval
- replace Supabase without approval
- replace deployment infrastructure without approval
- introduce a new framework without approval
- migrate databases without approval
- remove working functionality
- modify unrelated environment variables
- change production configuration unnecessarily
- delete "old-looking" files without verifying their usage
- remove dependencies merely because they appear unused
- redesign the application globally for a local feature request

Minimal, targeted changes are preferred.

---

# 3. MANDATORY PERMISSION POLICY

## 3.1 Changes the agent MAY make without additional approval

The agent may directly implement changes when they are explicitly requested by the user and the change stays within the existing architecture.

Examples:

- fixing an existing bug
- fixing a TypeScript error
- fixing a UI defect
- implementing an explicitly requested component
- implementing an explicitly requested page
- adding an explicitly requested API endpoint
- adding an explicitly requested database migration
- adding tests for the requested feature
- updating documentation required by the requested feature
- fixing an obvious error introduced by the agent during the same task
- making small refactors strictly necessary for the requested implementation
- updating an existing component to support an explicitly requested feature

The agent must still report what it changed.

---

## 3.2 Changes that REQUIRE USER APPROVAL BEFORE IMPLEMENTATION

The agent MUST STOP and request explicit approval before making any of the following changes unless the user has already explicitly authorized that exact change in the current task.

### Architecture

- replacing the application architecture
- changing major frontend architecture
- changing backend architecture
- introducing a new backend service
- introducing a queue system
- introducing Redis
- introducing a worker architecture
- moving away from Vercel
- moving away from Supabase
- replacing Next.js
- replacing the authentication provider
- introducing microservices
- converting the application into a monorepo
- changing deployment topology

### Database

- deleting existing tables
- dropping columns
- renaming production tables
- renaming production columns
- changing primary keys
- changing foreign-key relationships
- destructive migrations
- data migrations affecting existing production records
- changing existing WhatsApp table relationships
- changing existing RLS architecture
- deleting historical communication data
- introducing a second competing database

### Authentication / authorization

- changing CEO authentication
- changing user roles
- introducing employee CRM accounts
- changing access-control architecture
- changing Supabase Auth configuration
- weakening RLS
- bypassing existing authorization
- introducing service-role access into the browser
- removing existing security controls

### WhatsApp CRM

- changing Meta/WhatsApp authentication
- changing WhatsApp channel ownership logic
- changing WhatsApp webhook architecture
- changing WhatsApp conversation identity
- changing message schema
- changing existing WhatsApp production behavior
- modifying existing WhatsApp integrations for reasons unrelated to the requested task

### Microsoft 365 / Email CRM

- changing Microsoft Graph architecture
- changing Microsoft Entra application permissions
- changing tenant authorization architecture
- changing mailbox-scoping architecture
- changing Exchange Online RBAC configuration
- changing OAuth strategy
- changing mailbox ownership rules
- changing email threading strategy
- changing email synchronization architecture
- changing webhook architecture
- changing token storage architecture
- changing email security architecture

### Infrastructure

- changing DNS
- changing production domains
- changing Vercel project configuration
- changing Hostinger/VPS configuration
- changing Docker architecture
- changing reverse proxy configuration
- changing production secrets
- changing production environment variables
- changing webhook URLs
- changing Microsoft redirect URLs

### Dependencies

- replacing major dependencies
- upgrading framework versions
- downgrading framework versions
- replacing authentication packages
- replacing database packages
- removing major dependencies
- installing a major new infrastructure dependency

The agent may suggest these changes.

The agent must NOT implement them without approval.

---

# 4. REQUIRED CHANGE-CONTROL PROCESS

Before making non-trivial changes, the agent must:

1. Inspect the current implementation.
2. Identify the smallest valid change.
3. Check dependencies and relationships.
4. Determine whether the requested change touches an approval-protected area.
5. If it does, STOP before implementation and request approval.
6. If it does not, implement the change.
7. Run relevant validation.
8. Report exactly what changed.

Do not modify first and ask afterward.

For protected changes:

ASK FIRST.

---

# 5. WHEN THE USER REQUEST IS AMBIGUOUS

Do not guess silently when ambiguity could materially change:

- database behavior
- authentication
- security
- mailbox ownership
- message routing
- WhatsApp behavior
- email sending behavior
- production infrastructure
- data retention
- permissions
- user access
- deployment

Instead:

1. Explain the ambiguity briefly.
2. State the safest interpretation.
3. Ask for approval if the ambiguity affects a protected area.

Do not create an irreversible implementation based on an assumption.

---

# 6. EXISTING APPLICATION IS THE SOURCE OF TRUTH

The repository is the primary source of truth for implementation details.

Before changing an existing feature, inspect:

- actual files
- actual routes
- actual components
- actual database schema
- actual migrations
- actual imports
- actual environment variables
- actual API contracts
- actual authentication logic

Do not rely on assumptions from previous conversations.

Do not invent filenames.

Do not invent schemas.

Do not invent API routes.

Do not invent existing functionality.

---

# 7. NEXT.JS RULES

Always follow the Next.js agent rules at the top of this file.

Before writing Next.js code:

1. inspect the installed Next.js version
2. inspect the relevant documentation under:
   `node_modules/next/dist/docs/`
3. follow the installed version's conventions
4. respect deprecations
5. do not apply patterns from older Next.js versions blindly

Do not assume:

- App Router conventions
- Pages Router conventions
- server action behavior
- caching behavior
- route handler behavior
- middleware behavior
- async API behavior

without inspecting the installed version.

---

# 8. TYPESCRIPT

Prefer strict typing.

Avoid:

- `any`
- unsafe casts
- `as unknown as`
- silent type suppression
- `@ts-ignore`
- `@ts-expect-error`

unless genuinely necessary and documented.

Do not use type assertions to hide a real architecture or data-model problem.

When an API returns uncertain data:

- validate it
- narrow it
- normalize it
- handle failure explicitly

---

# 9. SERVER / CLIENT BOUNDARY

Respect the existing Next.js server/client architecture.

Do not move server-only logic into Client Components.

Never expose:

- Microsoft secrets
- access tokens
- refresh tokens
- encryption keys
- service-role credentials
- private API credentials

to browser code.

Never use:

`NEXT_PUBLIC_*`

for secrets.

---

# 10. SECURITY IS A HARD REQUIREMENT

Security takes priority over convenience.

Never weaken security to make a feature easier to implement.

Never bypass:

- Supabase RLS
- CEO authorization
- backend permission checks
- Microsoft mailbox authorization
- API validation
- webhook validation

Never trust the frontend as the authorization boundary.

The backend must independently validate sensitive operations.

---

# 11. CEO-ONLY MODEL

The Fortline CRM is CEO-only.

There are no sales-member CRM users.

Sales members are monitored entities, not application users.

Do NOT create:

- sales employee logins
- sales employee passwords
- CRM invitations for employees
- employee CRM dashboards
- employee access tokens
- employee CRM roles

unless explicitly requested and approved.

The CEO is the sole CRM operator.

---

# 12. WHATSAPP CRM INVARIANT

The existing WhatsApp CRM is a protected production subsystem.

Unless the user explicitly requests a WhatsApp change:

DO NOT modify:

- Meta integration
- WhatsApp webhooks
- WhatsApp phone-number mapping
- WhatsApp channel ownership
- WhatsApp message routing
- WhatsApp conversation identity
- WhatsApp message history
- WhatsApp CRM permissions
- WhatsApp production data
- existing WhatsApp UI functionality

When adding another communication channel:

prefer isolation and reuse of shared infrastructure rather than rewriting WhatsApp.

---

# 13. EMAIL CRM INVARIANT

The Email CRM is Microsoft 365 / Outlook based.

Provider:

`Microsoft 365 / Exchange Online`

Primary API:

`Microsoft Graph`

Do NOT introduce Gmail functionality unless the user explicitly requests it.

Do NOT replace Microsoft Graph with IMAP/POP3 as the primary architecture.

The Email CRM must remain independent from WhatsApp while sharing appropriate common CRM infrastructure.

---

# 14. MICROSOFT 365 SECURITY INVARIANT

The Email CRM must respect the Microsoft 365 security architecture.

The agent must not assume that a normal user login provides access to all monitored mailboxes.

Mailbox access must be explicitly authorized.

Where application permissions are used:

- use least privilege
- scope mailbox access appropriately
- maintain tenant authorization
- maintain secure server-side credentials
- do not expose tokens to the browser

Do not change Microsoft Graph permissions or Exchange Online mailbox-scoping strategy without approval.

---

# 15. EMAIL MAILBOX OWNERSHIP INVARIANT

Each monitored mailbox must have an authoritative relationship to its sales member.

Conceptually:

`Sales Member`
→
`Email Account`
→
`Microsoft 365 Mailbox`

Do not determine ownership only from a user-provided email string.

Do not allow the frontend to impersonate arbitrary mailboxes.

The backend must resolve the selected mailbox using the trusted database mapping.

---

# 16. CEO EMAIL AUTHORITY

The CEO has full operational authority inside the Email CRM.

This includes:

- read
- search
- filter
- inspect
- compose
- reply
- reply all
- forward
- send
- attachments
- drafts where supported
- read/unread
- conversation status
- priority
- notes
- mailbox synchronization
- mailbox management
- analytics
- alerts
- auditing

This authority must be implemented securely through Microsoft Graph.

The CEO does NOT need employee Outlook passwords.

---

# 17. EMAIL SEND-AS INVARIANT

When the CEO selects:

`From: employee@fortline.net`

the backend must resolve that mailbox from the authorized mailbox record.

Never trust:

`fromEmail`

provided directly by the browser as authorization.

Before sending:

- verify CEO
- verify mailbox
- verify mailbox authorization
- verify Microsoft 365 access
- verify mailbox status
- verify recipients
- verify attachments
- send through the correct mailbox
- confirm provider success
- store provider message ID
- update local state
- create audit record

Never silently fall back to another mailbox.

---

# 18. NO ACCIDENTAL CROSS-MAILBOX SENDING

A critical security rule:

If the CEO selects:

`finance@fortline.net`

the email MUST NOT accidentally be sent using:

- another employee mailbox
- CEO's personal mailbox
- default application mailbox
- another authorized employee mailbox

The backend mapping is authoritative.

Any mismatch must fail safely.

---

# 19. EMAIL THREADING INVARIANT

Do not merge email conversations solely because of:

- same client
- same subject
- same sender
- same domain

Prefer provider conversation/thread identifiers.

Preserve separate employee conversations.

The same client may communicate separately with multiple sales members.

Those conversations must remain correctly attributable.

---

# 20. EMAIL SYNCHRONIZATION INVARIANT

The Email CRM should use Microsoft Graph capabilities appropriate for:

- initial synchronization
- incremental synchronization
- delta/reconciliation
- change notifications
- lifecycle notifications
- subscription renewal
- missed notification recovery

Do not silently replace this with browser polling.

Do not implement fake real-time synchronization.

Do not mark data synchronized unless synchronization actually succeeded.

---

# 21. WEBHOOK INVARIANT

Microsoft Graph webhook processing must be:

- secure
- validated
- idempotent
- recoverable
- observable

A duplicate notification must not create duplicate communication records.

One mailbox's webhook problem must not stop other mailboxes.

Do not change webhook architecture without approval.

---

# 22. DATABASE RULES

Before touching the database:

1. inspect current schema
2. inspect current migrations
3. inspect foreign keys
4. inspect indexes
5. inspect RLS
6. inspect existing data relationships

Prefer additive migrations.

Never use destructive SQL casually.

Never:

- drop production tables
- drop production columns
- delete historical records
- rewrite primary keys
- break foreign keys

without explicit approval.

---

# 23. DATABASE MIGRATION RULE

Every schema change must use a proper migration.

Never modify production schema manually as a hidden step.

Migration must:

- be deterministic
- be reviewable
- have safe constraints
- preserve existing data
- preserve existing functionality

For risky migrations, STOP and request approval.

---

# 24. EXISTING DATA PRESERVATION

Historical CRM communication data is valuable.

Do not delete or overwrite historical:

- WhatsApp messages
- WhatsApp conversations
- email messages
- email threads
- client records
- sales-member mappings
- audit records

unless explicitly requested and approved.

Prefer additive changes.

---

# 25. SHARED DATA MODEL RULE

If existing tables can safely support the new feature:

reuse them.

Do not create duplicate concepts such as:

- two sales-member tables
- two contact systems
- two client systems
- two audit systems

unless there is a documented architectural reason.

If a new entity is genuinely required:

document its relationship to the existing system.

---

# 26. UI CHANGE RULE

Match the existing Fortline design system unless the user explicitly requests redesign.

Do not:

- introduce unrelated branding
- reintroduce iTechSkill branding
- change global colors unnecessarily
- redesign every page for one feature
- replace working navigation without reason

Email UI may be channel-specific.

WhatsApp UI should remain WhatsApp-appropriate.

---

# 27. BRANDING INVARIANT

The project is:

`Fortline-Pvt`

Never reintroduce:

- iTechSkill branding
- education CRM terminology
- old company names
- old project labels

unless the user explicitly requests it.

---

# 28. COMPONENT DESIGN

Prefer:

- small focused components
- reusable UI components
- explicit props
- server/client boundaries
- clear loading states
- clear error states

Avoid giant components when the existing architecture supports modularization.

Do not refactor the whole component tree without a reason.

---

# 29. API DESIGN

Use the existing API/routing conventions.

Before adding an endpoint:

inspect how similar endpoints are implemented.

Maintain:

- authentication
- validation
- error handling
- typed responses
- status codes
- authorization

Do not introduce multiple competing API styles unnecessarily.

---

# 30. INPUT VALIDATION

Validate user-controlled data on the server.

Validate:

- IDs
- email addresses
- query parameters
- request bodies
- mailbox IDs
- thread IDs
- message IDs
- attachment references

Do not trust frontend validation alone.

---

# 31. ERROR HANDLING

Errors must be:

- predictable
- logged appropriately
- understandable in the UI
- safe for users

Do not expose:

- stack traces
- secrets
- database credentials
- access tokens
- internal security details

Use useful user-facing messages such as:

`Mailbox authorization has expired. Reconnect this mailbox.`

rather than:

`TypeError: Cannot read properties of undefined...`

---

# 32. NO SILENT FALLBACKS

Do not silently fall back from:

- one mailbox to another
- one user to another
- one database to another
- one provider to another
- one configuration to another

When a required dependency is unavailable:

fail clearly.

---

# 33. NO FAKE FUNCTIONALITY

A button is not "implemented" merely because it appears.

Do not create:

- fake inboxes
- fake sync status
- fake connected indicators
- fake send confirmations
- fake analytics
- placeholder API responses presented as real data

If a feature is not connected to its backend/provider:

say so.

---

# 34. NO FAKE STATUS

Do not display:

`Connected`

unless the actual connection was validated.

Do not display:

`Synced`

unless synchronization actually succeeded.

Do not display:

`Sent`

until the provider confirms the send.

Do not display:

`Healthy`

when the underlying system is unhealthy.

---

# 35. LOADING / EMPTY / ERROR STATES

Every data-driven UI should handle:

1. loading
2. success with data
3. success with no data
4. error
5. retry where appropriate

Do not leave the user with unexplained blank screens.

---

# 36. PERFORMANCE RULE

Do not load unnecessarily large datasets into the browser.

Prefer:

- server-side pagination
- cursor pagination
- indexed queries
- lazy loading
- aggregations
- incremental data loading

Do not fetch entire mailboxes into React state.

Do not fetch entire message histories when only a page is required.

---

# 37. SEARCH RULE

Search should be server-side for large datasets.

Do not implement:

`SELECT everything → browser → filter with JavaScript`

when the dataset may be large.

Use appropriate database search/indexes.

---

# 38. ANALYTICS RULE

Analytics must come from deterministic stored data.

Do not fabricate numbers.

Metrics must have documented calculation logic.

If a metric cannot be reliably calculated:

do not invent an estimate and present it as fact.

---

# 39. RESPONSE-TIME RULE

Response metrics must be deterministic.

Do not count:

- invalid negative intervals
- employee self-replies
- obvious automated responses
- unrelated forwarded historical content

Store timestamps in UTC.

Convert to the configured business timezone for display.

---

# 40. ACCOUNTABILITY RULE

The system is intended to provide CEO visibility into sales communication.

Employee metrics should include where data supports them:

- outgoing messages
- incoming messages
- active conversations
- unanswered client messages
- overdue responses
- first response time
- average response time
- client coverage
- last activity

Do not introduce subjective AI-based performance judgments into core metrics.

---

# 41. AI RULE

AI is NOT required for core CRM operation.

Do not introduce AI dependencies into:

- email synchronization
- WhatsApp synchronization
- message storage
- response-time calculations
- authentication
- authorization
- basic accountability metrics

unless explicitly requested.

---

# 42. N8N RULE

n8n is NOT a required dependency for core CRM communication functionality.

Do not make core:

- WhatsApp monitoring
- email monitoring
- email synchronization
- Microsoft Graph webhooks
- email sending
- email reply
- response metrics

dependent on n8n unless explicitly requested.

---

# 43. ENVIRONMENT VARIABLES

Before adding or modifying environment variables:

inspect:

- `.env`
- `.env.local`
- `.env.example`
- deployment configuration
- existing environment-variable naming conventions

Never expose secrets through source code.

Never commit real secrets.

Do not rename an existing environment variable simply for preference.

If renaming is genuinely required:

STOP and request approval unless explicitly requested.

---

# 44. SECRET HANDLING

Never print secrets in:

- terminal output
- logs
- source files
- PR comments
- UI
- API responses

Treat all of the following as sensitive:

- Microsoft client secret
- Microsoft access token
- Microsoft refresh token
- Supabase service-role key
- encryption key
- webhook secrets
- API credentials

---

# 45. LOGGING

Logs should contain enough information for debugging without leaking sensitive data.

Useful fields may include:

- request ID
- mailbox ID
- sales rep ID
- provider
- operation
- message/thread ID
- success/failure
- duration

Never log credentials.

---

# 46. AUDIT LOGGING

CEO actions affecting communication or configuration should be auditable where the product requires it.

Examples:

- send
- reply
- forward
- mark read/unread
- priority change
- close/reopen
- mailbox connect/disconnect
- sync
- configuration change

Audit records must identify:

- actor
- action
- time
- affected resource
- mailbox where applicable
- success/failure
- safe metadata

Do not store credentials inside audit records.

---

# 47. TESTING POLICY

Every non-trivial implementation must be validated.

At minimum run the checks relevant to the project:

- TypeScript
- lint
- build
- unit tests
- integration tests
- API tests
- database migration checks
- security checks
- end-to-end checks where available

Do not skip validation merely because the change appears small.

---

# 48. REGRESSION TESTING

When changing shared infrastructure:

test all affected modules.

Examples:

Changing authentication:
→ test WhatsApp + Email

Changing shared client data:
→ test WhatsApp + Email + Clients

Changing navigation:
→ test all CRM sections

Changing database relations:
→ test existing WhatsApp data and Email data

---

# 49. WHATSAPP REGRESSION REQUIREMENT

Any task that changes shared infrastructure must confirm:

- WhatsApp login
- WhatsApp dashboard
- WhatsApp inbox
- WhatsApp conversations
- WhatsApp messages
- WhatsApp filters
- WhatsApp sales-member mappings
- WhatsApp channels
- existing webhook behavior

are still intact.

---

# 50. EMAIL REGRESSION REQUIREMENT

Any task that changes email functionality must confirm:

- mailbox list
- mailbox mapping
- synchronization
- inbox
- thread display
- send
- reply
- reply all
- forward
- attachments
- unread state
- waiting state
- overdue state
- analytics
- alerts
- audit

remain functional.

---

# 51. MICROSOFT GRAPH RATE LIMITING

Respect Microsoft Graph throttling behavior.

Use:

- bounded retries
- appropriate backoff
- provider guidance
- Retry-After where applicable

Do not create infinite retry loops.

Do not blindly retry send operations in a way that can create duplicate emails.

---

# 52. SEND RETRY SAFETY

Sending an email is an irreversible external operation.

If a send request times out ambiguously:

do NOT blindly resend.

First determine whether the provider accepted the message where possible.

Prevent duplicate client emails.

---

# 53. DESTRUCTIVE ACTIONS

Any destructive action must be treated as high risk.

Examples:

- delete email data
- delete client data
- disconnect all mailboxes
- reset synchronization state
- drop database schema
- remove authentication configuration
- disable security policies
- delete historical messages

Do not perform these automatically.

Require explicit authorization when not already part of the user's exact request.

---

# 54. PRODUCTION DEPLOYMENT RULE

Do not deploy production changes automatically unless the user has explicitly requested deployment.

Do not change:

- production secrets
- domain configuration
- webhook URLs
- DNS
- production database
- production environment

without explicit authorization.

Development validation and production deployment are separate actions.

---

# 55. GIT / SOURCE CONTROL RULE

Keep changes reviewable.

Prefer focused commits/changes.

Do not:

- rewrite unrelated history
- delete branches
- force-push
- mass-format the entire repository
- modify thousands of unrelated lines
- remove unrelated files

unless explicitly requested.

When possible, preserve existing formatting.

---

# 56. FILE DELETION RULE

Never delete a file simply because:

- it appears unused
- it has an old name
- it looks duplicated
- it is not imported immediately

First determine whether:

- dynamic imports use it
- scripts use it
- deployment uses it
- migrations reference it
- documentation references it
- runtime configuration references it

Deletion requires explicit approval when uncertain.

---

# 57. DEPENDENCY MANAGEMENT

Before installing a package:

check whether existing dependencies can already solve the requirement.

Do not install multiple packages for the same purpose.

Before removing/upgrading a dependency:

inspect usage.

Major dependency changes require approval unless explicitly requested.

---

# 58. DOCUMENTATION RULE

When a new architectural capability is added, update relevant documentation.

Documentation should explain:

- purpose
- setup
- configuration
- environment variables
- operation
- troubleshooting
- limitations

Never document a feature as supported if it is not actually implemented.

---

# 59. CODE COMMENTS

Comments should explain:

- why something is necessary
- security-sensitive behavior
- non-obvious provider behavior
- business rules
- important invariants

Do not add comments that merely restate obvious code.

---

# 60. BUSINESS LOGIC MUST NOT BE HIDDEN IN UI

Critical business rules must be enforced server-side.

Examples:

- mailbox ownership
- CEO-only access
- send authorization
- client/employee relationship
- response-time calculation
- overdue rules
- audit rules

Do not rely exclusively on UI state.

---

# 61. DATA SOURCE OF TRUTH

Each concept must have one authoritative source.

Examples:

Sales member:
→ database

Mailbox:
→ database mapping + Microsoft 365 provider identity

Email message:
→ provider message identity + normalized database record

WhatsApp number:
→ existing WhatsApp channel mapping

CEO authorization:
→ existing authentication/authorization system

Do not create competing sources of truth.

---

# 62. EXTERNAL SERVICE INTEGRATIONS

Treat every external service as unreliable.

Examples:

- Microsoft Graph
- Meta WhatsApp
- Supabase
- Vercel
- storage providers

Handle:

- timeout
- unauthorized
- rate limit
- unavailable
- malformed response
- partial failure

Do not assume external requests always succeed.

---

# 63. WEBHOOK IDEMPOTENCY

Every webhook handler must be safe against duplicate delivery.

Use:

- provider event IDs
- message IDs
- subscription/resource identity
- database unique constraints
- processing records where appropriate

Avoid duplicate inserts.

---

# 64. BACKGROUND PROCESSING

Do not introduce long-running server processes into a deployment environment that cannot support them.

Before adding workers/queues/background services:

inspect current deployment constraints.

If a new background architecture is required:

STOP and request approval unless explicitly requested.

---

# 65. FEATURE FLAGS

For risky features, use an explicit feature-flag pattern where appropriate.

Do not hide partially implemented functionality behind an apparently completed UI.

A feature flag must not be treated as an excuse to leave broken production code.

---

# 66. LOCAL DEVELOPMENT

Before changing development infrastructure:

inspect:

- package scripts
- Docker configuration
- environment files
- local database setup
- webhook tunneling
- existing development instructions

Do not replace working local infrastructure without approval.

---

# 67. PRODUCTION VS DEVELOPMENT DATA

Never mix:

- production mailbox data
- test mailbox data
- demo data
- fake client data

without explicit safeguards.

Test against safe accounts/data.

Never insert fabricated test emails into real production mailboxes unless explicitly intended and approved.

---

# 68. UI ACCESSIBILITY

Maintain accessible:

- labels
- buttons
- keyboard behavior
- focus states
- contrast
- semantic elements

Do not sacrifice accessibility for visual effects.

---

# 69. RESPONSIVE DESIGN

The CRM should remain usable on:

- desktop
- tablet
- mobile

However, do not redesign unrelated sections merely to satisfy a local UI request.

---

# 70. OBSERVABILITY

When implementing integrations, provide useful operational visibility:

- connection status
- last sync
- last successful sync
- last failure
- provider status
- webhook status
- subscription status

Do not expose sensitive provider credentials.

---

# 71. ERROR RECOVERY

Every external integration should have a recovery path.

Examples:

Mailbox authorization expired:
→ reconnect

Sync failure:
→ retry/recover

Webhook missed:
→ reconciliation

Subscription expired:
→ renew/recreate

Provider throttling:
→ backoff

Do not leave systems silently broken.

---

# 72. AGENT MUST READ BEFORE EDITING

Before editing an existing file:

1. read the complete relevant file or sufficient surrounding code
2. identify imports
3. identify dependencies
4. identify related callers
5. identify tests
6. identify side effects

Do not patch blind.

---

# 73. AGENT MUST SEARCH BEFORE CREATING

Before creating a new:

- component
- hook
- API route
- utility
- database table
- type
- service
- configuration object

search the repository for an existing equivalent.

Reuse where appropriate.

Avoid duplicate implementations.

---

# 74. AGENT MUST UNDERSTAND BEFORE REFACTORING

Do not refactor code whose behavior is not understood.

Before refactoring:

identify:

- current behavior
- dependencies
- callers
- side effects
- tests
- production usage

A refactor is acceptable only when behavior is preserved and the request requires or materially benefits from it.

---

# 75. CHANGE BOUNDARY

At the start of every task, establish:

### Requested change

What the user actually asked for.

### Required supporting changes

What must change to make the request function correctly.

### Out-of-scope changes

What should remain untouched.

Do not expand the task silently.

---

# 76. BEFORE IMPLEMENTATION SUMMARY

For any task involving multiple files or architectural implications, the agent should internally establish a concise implementation boundary.

If an approval-protected decision is required:

STOP and ask.

Otherwise proceed.

Do not ask for approval for every line of ordinary implementation.

---

# 77. AFTER IMPLEMENTATION REPORT

After completing a task, report:

## Changed

Files/features actually modified.

## Why

Why each relevant change was necessary.

## Validation

Tests/checks actually run.

## Result

What now works.

## Remaining

Any real limitation or required manual configuration.

Do not claim tests were run if they were not.

Do not claim production deployment if it was not performed.

---

# 78. NO FALSE CLAIMS

Never say:

- "fully tested"
- "100% bug-free"
- "production ready"
- "works perfectly"
- "verified"

unless the available evidence supports the statement.

Be precise.

Example:

`TypeScript check passed; end-to-end Microsoft 365 send test could not be performed because no test mailbox authorization was available.`

is acceptable.

---

# 79. USER APPROVAL FORMAT

When approval is required, provide:

### Proposed change
What will be changed.

### Why it is required
Why the current architecture cannot safely satisfy the request without it.

### Impact
What existing behavior may be affected.

### Risk
Database/security/integration/deployment risk.

### Exact files/systems expected to change
Known scope.

Then ask for explicit approval.

Do not implement the protected change before approval.

---

# 80. HIGH-RISK APPROVAL EXAMPLES

The agent MUST ask before:

### Example 1

"To implement this feature I need to add a new database table."

If additive and explicitly required by the user's request:
may proceed.

### Example 2

"To implement this I need to drop/rename an existing production table."

STOP and ask.

### Example 3

"To make all mailboxes accessible I need to change Microsoft Graph application permissions."

STOP and ask unless that permission change was explicitly requested as part of the task.

### Example 4

"To fix this I need to change CEO authentication."

STOP and ask.

### Example 5

"To implement this I need to replace the existing WhatsApp integration."

STOP and ask.

---

# 81. WHATSAPP + EMAIL IS ONE CRM, TWO CHANNELS

The application should be understood as:

`Fortline CEO CRM`

with:

`WhatsApp`

and:

`Email`

as separate communication modules.

Shared infrastructure may include:

- CEO authentication
- sales members
- clients
- audit
- notifications
- common design system

Channel-specific functionality remains isolated.

---

# 82. CHANNEL SWITCHER INVARIANT

The global switcher must not:

- reset authentication
- mix messages
- change mailbox ownership
- alter WhatsApp routing
- destroy filters unnecessarily
- cause data leakage

Switching to Email:

→ Email CRM

Switching to WhatsApp:

→ existing WhatsApp CRM

---

# 83. CLIENT CROSS-CHANNEL RULE

The same client may appear in both:

- WhatsApp
- Email

A shared client identity is allowed.

However:

WhatsApp history must remain WhatsApp.

Email history must remain Email.

Do not flatten both into one ambiguous message stream.

---

# 84. EMPLOYEE ACCOUNTABILITY RULE

The CRM exists partly for CEO accountability.

Communication metrics must remain attributable to the correct:

- sales member
- mailbox
- client
- conversation
- channel

Never assign an email to the wrong employee because two employees communicate with the same client.

---

# 85. EMAIL SEND AUDIT INVARIANT

For every CEO send/reply/forward action through an employee mailbox, retain enough safe metadata to establish:

`CEO`
→
`action`
→
`selected mailbox`
→
`associated sales member`
→
`conversation/message`
→
`provider result`

This is required for accountability and auditability.

---

# 86. MAILBOX FAILURE ISOLATION

If one employee's Microsoft 365 mailbox fails:

do not stop the other mailboxes.

Each monitored mailbox must maintain independent:

- sync state
- authorization state
- webhook/subscription state
- error state
- activity state

---

# 87. PRODUCTION SAFETY

Any operation that can affect external customers, real email, real WhatsApp conversations, or production data must be treated as consequential.

Examples:

- send email
- delete message
- modify production data
- disconnect mailbox
- rotate credentials
- alter webhook
- change production permissions

The agent must not perform such actions without explicit authorization when they are not already part of the user’s requested task.

---

# 88. NO AUTOMATIC CUSTOMER CONTACT

The agent must not:

- send customer emails
- send WhatsApp messages
- create customer contacts
- modify customer-facing communication

as part of development/testing unless explicitly requested.

Use safe test accounts for integration testing.

---

# 89. NO AUTOMATIC PRODUCTION DEPLOYMENT

Code implementation and deployment are separate actions.

Do not:

- deploy
- push to production
- modify Vercel production settings
- alter production database
- change production secrets

unless explicitly requested.

---

# 90. FINAL DEFINITION OF DONE

A task is complete only when:

1. Requested functionality is implemented.
2. Existing protected functionality remains intact.
3. Appropriate tests/checks pass.
4. No known critical errors remain.
5. Security requirements are preserved.
6. Database changes are migration-backed.
7. External integration behavior is validated as far as available.
8. Documentation/configuration is updated where needed.
9. No unrelated files were changed without reason.
10. The final report accurately describes what was and was not verified.

---

# 91. AGENT BEHAVIOR — FINAL CONTRACT

The agent MUST:

- inspect before changing
- understand before refactoring
- search before creating duplicates
- preserve existing functionality
- prefer minimal changes
- enforce security server-side
- protect credentials
- use migrations
- validate external integrations
- test affected functionality
- report actual results
- ask before high-risk architectural changes

The agent MUST NOT:

- guess silently on critical requirements
- make protected architectural changes without approval
- rewrite working systems unnecessarily
- weaken security
- expose secrets
- create fake functionality
- claim unverified success
- delete production data casually
- change unrelated features
- deploy without authorization

---

# 92. PROJECT PRIORITY ORDER

When requirements conflict, use this priority order:

1. Security
2. User's explicit current task
3. Existing production behavior
4. Data integrity
5. Microsoft / Meta provider correctness
6. Authentication and authorization
7. Backward compatibility
8. Performance
9. Maintainability
10. Visual improvements

Do not sacrifice security or data integrity for convenience or speed.

---

# 93. FINAL PROJECT IDENTITY

This repository represents:

# FORTLINE-PVT CEO SALES COMMUNICATION COMMAND CENTER

Core communication channels:

- WhatsApp
- Microsoft 365 / Outlook Email

Primary operator:

`CEO`

CRM employee users:

`None`

Core objective:

`Monitor → Understand → Measure → Audit → Control`

The system must preserve complete communication traceability while keeping the CEO as the sole CRM operator.

Any future feature must fit into this model unless the user explicitly changes the business requirements.