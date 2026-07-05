-- =============================================================================
-- 0005_email_campaigns.sql  —  bulk email (Amazon SES) support
-- Adds unsubscribe handling to leads and campaign/send tracking tables so the
-- admin dashboard can email-blast all contacts a couple times a month.
-- =============================================================================

-- Unsubscribe support on the lead record.
alter table public.leads
  add column if not exists unsubscribe_token uuid not null default gen_random_uuid(),
  add column if not exists unsubscribed_at   timestamptz;

create unique index if not exists leads_unsubscribe_token_idx
  on public.leads (unsubscribe_token);

do $$ begin
  create type campaign_status as enum ('draft', 'sending', 'sent', 'failed');
exception when duplicate_object then null; end $$;

create table if not exists public.email_campaigns (
  id               uuid primary key default gen_random_uuid(),
  subject          text not null,
  html             text not null,
  status           campaign_status not null default 'draft',
  total_recipients integer not null default 0,
  sent_count       integer not null default 0,
  failed_count     integer not null default 0,
  error            text,
  created_at       timestamptz not null default now(),
  sent_at          timestamptz
);

create index if not exists email_campaigns_created_at_idx on public.email_campaigns (created_at desc);

create table if not exists public.email_sends (
  id          uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.email_campaigns (id) on delete cascade,
  lead_id     uuid references public.leads (id) on delete set null,
  email       citext not null,
  status      text not null default 'sent',   -- sent | failed
  error       text,
  created_at  timestamptz not null default now()
);

create index if not exists email_sends_campaign_idx on public.email_sends (campaign_id);
create index if not exists email_sends_lead_idx      on public.email_sends (lead_id);

-- Eligible marketing audience: everyone with an email who hasn't unsubscribed.
create or replace view public.email_audience as
select id, email, first_name, last_name, unsubscribe_token
from public.leads
where unsubscribed_at is null;

alter table public.email_campaigns enable row level security;
alter table public.email_sends     enable row level security;

revoke all on all tables in schema public from anon, authenticated;
revoke all on public.email_audience from anon, authenticated;
