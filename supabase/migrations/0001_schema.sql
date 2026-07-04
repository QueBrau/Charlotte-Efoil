-- =============================================================================
-- CharlotteEfoil backend schema
-- 0001_schema.sql  —  core tables, enums, indexes, RLS
-- =============================================================================
-- Design overview
--   leads .................. one row per unique person (deduped by email)
--     ├─ contact_submissions ....... every contact-form submit (many per lead)
--     └─ reservation_requests ...... every reservation request (many per lead)
--          └─ reservation_request_interests  (M:N → interest_types)
--
--   visitors ............... one row per unique browser (deduped by token)
--     │   may be linked to a lead once they submit a form (visitors.lead_id)
--     └─ sessions .................. a visit / browsing session (many per visitor)
--          ├─ page_views ........... each page load in a session
--          └─ events ............... custom interactions (clicks, form events…)
--
-- All access happens through Netlify Functions using the service-role key.
-- RLS is enabled with NO public policies, so the anon/public key cannot read or
-- write any of this data directly. The service role bypasses RLS.
-- =============================================================================

create extension if not exists pgcrypto;   -- gen_random_uuid()
create extension if not exists citext;      -- case-insensitive email

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
do $$ begin
  create type lead_status as enum ('new', 'contacted', 'qualified', 'booked', 'customer', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type submission_status as enum ('new', 'read', 'responded', 'spam', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type device_type as enum ('desktop', 'mobile', 'tablet', 'bot', 'unknown');
exception when duplicate_object then null; end $$;

-- -----------------------------------------------------------------------------
-- Shared updated_at trigger
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =============================================================================
-- LEADS  — the unique person / contact record
-- =============================================================================
create table if not exists public.leads (
  id              uuid primary key default gen_random_uuid(),
  email           citext not null unique,
  first_name      text,
  last_name       text,
  phone           text,
  status          lead_status not null default 'new',
  marketing_consent boolean not null default false,
  notes           text,
  first_seen_at   timestamptz not null default now(),
  last_contact_at timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists leads_status_idx     on public.leads (status);
create index if not exists leads_created_at_idx  on public.leads (created_at desc);

drop trigger if exists leads_set_updated_at on public.leads;
create trigger leads_set_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

-- =============================================================================
-- VISITORS  — unique browser, deduped by client-stored token
-- =============================================================================
create table if not exists public.visitors (
  id                 uuid primary key default gen_random_uuid(),
  visitor_token      text not null unique,
  lead_id            uuid references public.leads (id) on delete set null,
  first_seen_at      timestamptz not null default now(),
  last_seen_at       timestamptz not null default now(),
  first_referrer     text,
  first_landing_path text,
  first_utm_source   text,
  first_utm_medium   text,
  first_utm_campaign text,
  user_agent         text,
  device_type        device_type not null default 'unknown',
  browser            text,
  os                 text,
  country            text,
  total_sessions     integer not null default 0,
  total_page_views   integer not null default 0,
  created_at         timestamptz not null default now()
);

create index if not exists visitors_lead_id_idx    on public.visitors (lead_id);
create index if not exists visitors_first_seen_idx  on public.visitors (first_seen_at);
create index if not exists visitors_last_seen_idx   on public.visitors (last_seen_at);

-- =============================================================================
-- SESSIONS  — a single visit, deduped by client-stored session token
-- =============================================================================
create table if not exists public.sessions (
  id               uuid primary key default gen_random_uuid(),
  session_token    text not null unique,
  visitor_id       uuid not null references public.visitors (id) on delete cascade,
  started_at       timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  ended_at         timestamptz,
  referrer         text,
  landing_path     text,
  utm_source       text,
  utm_medium       text,
  utm_campaign     text,
  utm_term         text,
  utm_content      text,
  user_agent       text,
  device_type      device_type not null default 'unknown',
  browser          text,
  os               text,
  ip_hash          text,
  country          text,
  region           text,
  city             text,
  page_view_count  integer not null default 0,
  event_count      integer not null default 0
);

create index if not exists sessions_visitor_id_idx on public.sessions (visitor_id);
create index if not exists sessions_started_at_idx  on public.sessions (started_at desc);
create index if not exists sessions_utm_source_idx  on public.sessions (utm_source);

-- =============================================================================
-- PAGE_VIEWS
-- =============================================================================
create table if not exists public.page_views (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.sessions (id) on delete cascade,
  visitor_id  uuid not null references public.visitors (id) on delete cascade,
  path        text not null,
  title       text,
  referrer    text,
  duration_ms integer,
  created_at  timestamptz not null default now()
);

create index if not exists page_views_session_idx    on public.page_views (session_id);
create index if not exists page_views_visitor_idx     on public.page_views (visitor_id);
create index if not exists page_views_created_at_idx  on public.page_views (created_at desc);
create index if not exists page_views_path_idx        on public.page_views (path);

-- =============================================================================
-- EVENTS  — custom interactions (cta_click, phone_click, form_start, etc.)
-- =============================================================================
create table if not exists public.events (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.sessions (id) on delete cascade,
  visitor_id  uuid not null references public.visitors (id) on delete cascade,
  event_type  text not null,
  event_name  text,
  path        text,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists events_session_idx    on public.events (session_id);
create index if not exists events_visitor_idx     on public.events (visitor_id);
create index if not exists events_type_idx        on public.events (event_type);
create index if not exists events_created_at_idx  on public.events (created_at desc);

-- =============================================================================
-- CONTACT SUBMISSIONS
-- =============================================================================
create table if not exists public.contact_submissions (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid references public.leads (id) on delete set null,
  visitor_id  uuid references public.visitors (id) on delete set null,
  session_id  uuid references public.sessions (id) on delete set null,
  name        text,
  email       citext not null,
  message     text not null,
  status      submission_status not null default 'new',
  source_path text,
  referrer    text,
  ip_hash     text,
  user_agent  text,
  created_at  timestamptz not null default now()
);

create index if not exists contact_submissions_lead_idx       on public.contact_submissions (lead_id);
create index if not exists contact_submissions_status_idx      on public.contact_submissions (status);
create index if not exists contact_submissions_created_at_idx  on public.contact_submissions (created_at desc);
create index if not exists contact_submissions_email_idx       on public.contact_submissions (email);

-- =============================================================================
-- RESERVATION REQUESTS  (+ interests lookup / join)
-- =============================================================================
create table if not exists public.interest_types (
  id    smallserial primary key,
  slug  text not null unique,
  label text not null
);

insert into public.interest_types (slug, label) values
  ('lesson',    'One-on-one or 2-rider private session'),
  ('demo',      'Lift eFoil purchase demonstration'),
  ('corporate', 'Corporate event / team building'),
  ('family',    'Family gathering or outing')
on conflict (slug) do nothing;

create table if not exists public.reservation_requests (
  id              uuid primary key default gen_random_uuid(),
  lead_id         uuid references public.leads (id) on delete set null,
  visitor_id      uuid references public.visitors (id) on delete set null,
  session_id      uuid references public.sessions (id) on delete set null,
  first_name      text,
  last_name       text,
  email           citext not null,
  phone           text,
  session_time    text,          -- morning | afternoon | flexible
  launch_location text,          -- public | private | unsure
  preferred_date  text,
  notes           text,
  terms_accepted  boolean not null default false,
  status          submission_status not null default 'new',
  source_path     text,
  referrer        text,
  ip_hash         text,
  user_agent      text,
  created_at      timestamptz not null default now()
);

create index if not exists reservation_requests_lead_idx      on public.reservation_requests (lead_id);
create index if not exists reservation_requests_status_idx     on public.reservation_requests (status);
create index if not exists reservation_requests_created_at_idx on public.reservation_requests (created_at desc);
create index if not exists reservation_requests_email_idx      on public.reservation_requests (email);

create table if not exists public.reservation_request_interests (
  reservation_request_id uuid not null references public.reservation_requests (id) on delete cascade,
  interest_type_id       smallint not null references public.interest_types (id) on delete cascade,
  primary key (reservation_request_id, interest_type_id)
);

create index if not exists rri_interest_idx on public.reservation_request_interests (interest_type_id);

-- =============================================================================
-- ROW LEVEL SECURITY
-- Enable RLS everywhere and add NO public policies. The anon/public API key
-- therefore has zero access. Only the service-role key (used by the Netlify
-- Functions) can read/write, because it bypasses RLS.
-- =============================================================================
alter table public.leads                          enable row level security;
alter table public.visitors                        enable row level security;
alter table public.sessions                        enable row level security;
alter table public.page_views                      enable row level security;
alter table public.events                          enable row level security;
alter table public.contact_submissions             enable row level security;
alter table public.reservation_requests            enable row level security;
alter table public.reservation_request_interests   enable row level security;
alter table public.interest_types                  enable row level security;

-- Lock down direct table grants for the browser-facing roles.
revoke all on all tables in schema public from anon, authenticated;
