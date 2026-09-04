-- ============================================================
-- 037_calls.sql — Reference migration for public.calls
-- Idempotent — safe to run multiple times.
-- ============================================================

create table if not exists public.calls (
  id                uuid primary key default gen_random_uuid(),
  account_id        uuid not null default 'b131fded-81f8-4a7b-b231-db9b8ab846b8',
  contact_id        uuid references public.contacts(id) on delete cascade,
  conversation_id   uuid references public.conversations(id) on delete set null,
  agent_id          uuid not null,
  direction         text not null default 'outgoing' check (direction in ('outgoing','incoming','missed')),
  call_method       text not null default 'phone' check (call_method in ('phone','whatsapp','other')),
  duration_seconds  integer not null default 0 check (duration_seconds >= 0),
  outcome           text not null default 'answered' check (outcome in ('answered','no_answer','busy','callback_scheduled','not_reachable','wrong_number')),
  notes             text default '',
  call_started_at   timestamptz not null default now(),
  follow_up_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_calls_contact on public.calls (contact_id, call_started_at desc);
create index if not exists idx_calls_agent on public.calls (agent_id, call_started_at desc);
create index if not exists idx_calls_conversation on public.calls (conversation_id);

alter table public.calls enable row level security;

drop policy if exists "calls_select_account" on public.calls;
create policy "calls_select_account" on public.calls for select using (account_id = (select account_id from profiles where user_id = auth.uid()));

drop policy if exists "calls_insert_account" on public.calls;
create policy "calls_insert_account" on public.calls for insert with check (agent_id = auth.uid() and account_id = (select account_id from profiles where user_id = auth.uid()));

drop policy if exists "calls_update_own" on public.calls;
create policy "calls_update_own" on public.calls for update using (agent_id = auth.uid());
