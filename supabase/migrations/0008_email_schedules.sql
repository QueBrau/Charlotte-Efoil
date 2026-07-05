-- =============================================================================
-- 0008_email_schedules.sql  —  recurring monthly marketing email schedules
-- =============================================================================

create table if not exists public.email_schedules (
  id             uuid primary key default gen_random_uuid(),
  name           text,
  subject        text not null,
  html           text not null,
  day_of_month   smallint not null check (day_of_month between 1 and 28),
  send_hour      smallint not null default 9 check (send_hour between 0 and 23),
  timezone       text not null default 'America/New_York',
  enabled        boolean not null default true,
  last_sent_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists email_schedules_enabled_idx on public.email_schedules (enabled)
  where enabled = true;

alter table public.email_campaigns
  add column if not exists schedule_id uuid references public.email_schedules (id) on delete set null;

create index if not exists email_campaigns_schedule_idx on public.email_campaigns (schedule_id);

drop trigger if exists email_schedules_set_updated_at on public.email_schedules;
create trigger email_schedules_set_updated_at
  before update on public.email_schedules
  for each row execute function public.set_updated_at();

alter table public.email_schedules enable row level security;
revoke all on public.email_schedules from anon, authenticated;
