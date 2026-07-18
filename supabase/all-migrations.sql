-- ===== 0001_schema.sql =====
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

-- ===== 0002_functions.sql =====
-- =============================================================================
-- 0002_functions.sql  —  RPCs called by the Netlify Functions API
-- These run as SECURITY DEFINER so all multi-table writes are atomic and the
-- API only needs a single round trip. Execution is granted to service_role only.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- ingest_tracking(p jsonb)
-- Upserts the visitor + session, then inserts a batch of pageview / custom
-- events. Maintains denormalized counters. Returns nothing.
--
-- Expected payload:
-- {
--   "visitor_token": "uuid", "session_token": "uuid",
--   "referrer": "...", "landing_path": "/", "user_agent": "...",
--   "device_type": "mobile", "browser": "...", "os": "...",
--   "ip_hash": "...", "country": "US", "region": "NC", "city": "Charlotte",
--   "utm_source": "...", "utm_medium": "...", "utm_campaign": "...",
--   "utm_term": "...", "utm_content": "...",
--   "events": [
--     { "type": "pageview", "path": "/", "title": "...", "referrer": "...", "ts": "..." },
--     { "type": "cta_click", "name": "request_reservation", "path": "/", "metadata": {}, "ts": "..." }
--   ]
-- }
-- -----------------------------------------------------------------------------
create or replace function public.ingest_tracking(p jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_visitor_token text := nullif(p->>'visitor_token', '');
  v_session_token text := nullif(p->>'session_token', '');
  v_visitor_id    uuid;
  v_session_id    uuid;
  v_session_new   boolean := false;
  v_event         jsonb;
  v_now           timestamptz := now();
  v_new_pageviews integer := 0;
  v_new_events    integer := 0;
begin
  if v_visitor_token is null or v_session_token is null then
    return;
  end if;

  -- Upsert visitor (first-touch attribution kept on insert only)
  insert into public.visitors as v (
    visitor_token, first_seen_at, last_seen_at, first_referrer, first_landing_path,
    first_utm_source, first_utm_medium, first_utm_campaign,
    user_agent, device_type, browser, os, country
  )
  values (
    v_visitor_token, v_now, v_now, p->>'referrer', p->>'landing_path',
    p->>'utm_source', p->>'utm_medium', p->>'utm_campaign',
    p->>'user_agent', coalesce((p->>'device_type')::device_type, 'unknown'),
    p->>'browser', p->>'os', p->>'country'
  )
  on conflict (visitor_token) do update
    set last_seen_at = v_now
  returning v.id into v_visitor_id;

  -- Upsert session; detect whether it was newly inserted (xmax = 0)
  insert into public.sessions as s (
    session_token, visitor_id, started_at, last_activity_at, referrer, landing_path,
    utm_source, utm_medium, utm_campaign, utm_term, utm_content,
    user_agent, device_type, browser, os, ip_hash, country, region, city
  )
  values (
    v_session_token, v_visitor_id, v_now, v_now, p->>'referrer', p->>'landing_path',
    p->>'utm_source', p->>'utm_medium', p->>'utm_campaign', p->>'utm_term', p->>'utm_content',
    p->>'user_agent', coalesce((p->>'device_type')::device_type, 'unknown'),
    p->>'browser', p->>'os', p->>'ip_hash', p->>'country', p->>'region', p->>'city'
  )
  on conflict (session_token) do update
    set last_activity_at = v_now
  returning s.id, (s.xmax = 0) into v_session_id, v_session_new;

  if v_session_new then
    update public.visitors set total_sessions = total_sessions + 1 where id = v_visitor_id;
  end if;

  -- Process the event batch
  for v_event in select * from jsonb_array_elements(coalesce(p->'events', '[]'::jsonb))
  loop
    if (v_event->>'type') = 'pageview' then
      insert into public.page_views (session_id, visitor_id, path, title, referrer, duration_ms, created_at)
      values (
        v_session_id, v_visitor_id,
        coalesce(v_event->>'path', '/'), v_event->>'title', v_event->>'referrer',
        nullif(v_event->>'duration_ms', '')::integer,
        coalesce((v_event->>'ts')::timestamptz, v_now)
      );
      v_new_pageviews := v_new_pageviews + 1;
    else
      insert into public.events (session_id, visitor_id, event_type, event_name, path, metadata, created_at)
      values (
        v_session_id, v_visitor_id,
        coalesce(v_event->>'type', 'custom'), v_event->>'name', v_event->>'path',
        coalesce(v_event->'metadata', '{}'::jsonb),
        coalesce((v_event->>'ts')::timestamptz, v_now)
      );
      v_new_events := v_new_events + 1;
    end if;
  end loop;

  if v_new_pageviews > 0 or v_new_events > 0 then
    update public.sessions
      set page_view_count = page_view_count + v_new_pageviews,
          event_count     = event_count + v_new_events,
          last_activity_at = v_now
      where id = v_session_id;
    update public.visitors
      set total_page_views = total_page_views + v_new_pageviews
      where id = v_visitor_id;
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- submit_contact(p jsonb) -> uuid (submission id)
-- Upserts the lead by email, links the visitor, stores the submission.
-- -----------------------------------------------------------------------------
create or replace function public.submit_contact(p jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email      citext := lower(nullif(p->>'email', ''));
  v_name       text   := nullif(p->>'name', '');
  v_first      text   := split_part(coalesce(v_name, ''), ' ', 1);
  v_last       text   := nullif(trim(substring(coalesce(v_name, '') from position(' ' in coalesce(v_name, '')))), '');
  v_visitor_id uuid;
  v_lead_id    uuid;
  v_id         uuid;
begin
  if v_email is null then
    raise exception 'email is required';
  end if;

  select id into v_visitor_id from public.visitors where visitor_token = nullif(p->>'visitor_token', '');

  insert into public.leads as l (email, first_name, last_name)
  values (v_email, nullif(v_first, ''), v_last)
  on conflict (email) do update
    set first_name = coalesce(l.first_name, excluded.first_name),
        last_name  = coalesce(l.last_name, excluded.last_name),
        updated_at = now()
  returning l.id into v_lead_id;

  if v_visitor_id is not null then
    update public.visitors set lead_id = v_lead_id where id = v_visitor_id and lead_id is null;
  end if;

  insert into public.contact_submissions
    (lead_id, visitor_id, name, email, message, source_path, referrer, ip_hash, user_agent)
  values
    (v_lead_id, v_visitor_id, v_name, v_email, p->>'message', p->>'source_path', p->>'referrer',
     p->>'ip_hash', p->>'user_agent')
  returning id into v_id;

  return v_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- submit_reservation(p jsonb) -> uuid (reservation id)
-- Upserts the lead, links the visitor, stores the request and its interests.
-- p.interests is a JSON array of interest slugs, e.g. ["lesson","demo"].
-- -----------------------------------------------------------------------------
create or replace function public.submit_reservation(p jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email      citext := lower(nullif(p->>'email', ''));
  v_first      text   := nullif(p->>'first_name', '');
  v_last       text   := nullif(p->>'last_name', '');
  v_phone      text   := nullif(p->>'phone', '');
  v_visitor_id uuid;
  v_lead_id    uuid;
  v_id         uuid;
begin
  if v_email is null then
    raise exception 'email is required';
  end if;

  select id into v_visitor_id from public.visitors where visitor_token = nullif(p->>'visitor_token', '');

  insert into public.leads as l (email, first_name, last_name, phone)
  values (v_email, v_first, v_last, v_phone)
  on conflict (email) do update
    set first_name = coalesce(l.first_name, excluded.first_name),
        last_name  = coalesce(l.last_name, excluded.last_name),
        phone      = coalesce(l.phone, excluded.phone),
        updated_at = now()
  returning l.id into v_lead_id;

  if v_visitor_id is not null then
    update public.visitors set lead_id = v_lead_id where id = v_visitor_id and lead_id is null;
  end if;

  insert into public.reservation_requests
    (lead_id, visitor_id, first_name, last_name, email, phone, session_time, launch_location,
     preferred_date, notes, terms_accepted, source_path, referrer, ip_hash, user_agent)
  values
    (v_lead_id, v_visitor_id, v_first, v_last, v_email, v_phone,
     nullif(p->>'session_time', ''), nullif(p->>'launch_location', ''),
     nullif(p->>'preferred_date', ''), nullif(p->>'notes', ''),
     coalesce((p->>'terms_accepted')::boolean, false),
     p->>'source_path', p->>'referrer', p->>'ip_hash', p->>'user_agent')
  returning id into v_id;

  -- Attach selected interests (ignore unknown slugs)
  insert into public.reservation_request_interests (reservation_request_id, interest_type_id)
  select v_id, it.id
  from public.interest_types it
  where it.slug in (
    select jsonb_array_elements_text(coalesce(p->'interests', '[]'::jsonb))
  )
  on conflict do nothing;

  return v_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Permissions: only the service role may execute these.
-- -----------------------------------------------------------------------------
revoke all on function public.ingest_tracking(jsonb)   from public, anon, authenticated;
revoke all on function public.submit_contact(jsonb)    from public, anon, authenticated;
revoke all on function public.submit_reservation(jsonb) from public, anon, authenticated;

grant execute on function public.ingest_tracking(jsonb)   to service_role;
grant execute on function public.submit_contact(jsonb)    to service_role;
grant execute on function public.submit_reservation(jsonb) to service_role;

-- ===== 0003_views.sql =====
-- =============================================================================
-- 0003_views.sql  —  reporting views for the analytics dashboard / queries
-- Query these from the Supabase SQL editor or any service-role client.
-- =============================================================================

-- Daily traffic: unique visitors, sessions, and page views per day.
create or replace view public.analytics_daily_traffic as
select
  date_trunc('day', s.started_at)::date          as day,
  count(distinct s.visitor_id)                    as unique_visitors,
  count(distinct s.id)                            as sessions,
  coalesce(sum(s.page_view_count), 0)             as page_views,
  count(distinct s.id) filter (where s.page_view_count <= 1) as bounced_sessions
from public.sessions s
group by 1
order by 1 desc;

-- New vs returning visitors per day (based on first_seen_at).
create or replace view public.analytics_new_vs_returning as
with daily as (
  select
    date_trunc('day', s.started_at)::date as day,
    s.visitor_id,
    v.first_seen_at
  from public.sessions s
  join public.visitors v on v.id = s.visitor_id
)
select
  day,
  count(distinct visitor_id) filter (where date_trunc('day', first_seen_at)::date = day) as new_visitors,
  count(distinct visitor_id) filter (where date_trunc('day', first_seen_at)::date < day) as returning_visitors
from daily
group by day
order by day desc;

-- Most-viewed pages with unique-visitor reach.
create or replace view public.analytics_top_pages as
select
  pv.path,
  count(*)                        as views,
  count(distinct pv.visitor_id)   as unique_visitors,
  max(pv.created_at)              as last_viewed_at
from public.page_views pv
group by pv.path
order by views desc;

-- Traffic sources by first-touch UTM / referrer at the session level.
create or replace view public.analytics_traffic_sources as
select
  coalesce(nullif(s.utm_source, ''), 'direct/none') as source,
  coalesce(nullif(s.utm_medium, ''), 'none')         as medium,
  coalesce(nullif(s.utm_campaign, ''), 'none')       as campaign,
  count(distinct s.id)                               as sessions,
  count(distinct s.visitor_id)                       as unique_visitors
from public.sessions s
group by 1, 2, 3
order by sessions desc;

-- Event volume by type.
create or replace view public.analytics_event_counts as
select
  e.event_type,
  e.event_name,
  count(*)                       as total,
  count(distinct e.visitor_id)   as unique_visitors,
  max(e.created_at)              as last_seen_at
from public.events e
group by e.event_type, e.event_name
order by total desc;

-- Lead overview with submission/reservation counts and conversion signal.
create or replace view public.analytics_lead_overview as
select
  l.id,
  l.email,
  l.first_name,
  l.last_name,
  l.phone,
  l.status,
  l.created_at,
  count(distinct cs.id)  as contact_submissions,
  count(distinct rr.id)  as reservation_requests,
  count(distinct v.id)   as linked_visitors
from public.leads l
left join public.contact_submissions cs on cs.lead_id = l.id
left join public.reservation_requests rr on rr.lead_id = l.id
left join public.visitors v on v.lead_id = l.id
group by l.id
order by l.created_at desc;

-- Daily submission funnel: contacts vs reservations.
create or replace view public.analytics_daily_submissions as
select
  day,
  sum(contact_count)     as contact_submissions,
  sum(reservation_count) as reservation_requests
from (
  select date_trunc('day', created_at)::date as day, count(*) as contact_count, 0 as reservation_count
    from public.contact_submissions group by 1
  union all
  select date_trunc('day', created_at)::date as day, 0 as contact_count, count(*) as reservation_count
    from public.reservation_requests group by 1
) t
group by day
order by day desc;

-- Restrict view access to the service role (same posture as base tables).
revoke all on public.analytics_daily_traffic     from anon, authenticated;
revoke all on public.analytics_new_vs_returning   from anon, authenticated;
revoke all on public.analytics_top_pages          from anon, authenticated;
revoke all on public.analytics_traffic_sources    from anon, authenticated;
revoke all on public.analytics_event_counts       from anon, authenticated;
revoke all on public.analytics_lead_overview      from anon, authenticated;
revoke all on public.analytics_daily_submissions  from anon, authenticated;

-- ===== 0004_page_duration.sql =====
-- =============================================================================
-- 0004_page_duration.sql  —  time-on-page tracking
-- Adds a client-generated id to page views so the browser can send an engaged
-- time measurement when the visitor leaves the page, and updates the ingest RPC
-- to record it. Also surfaces average time-on-page in the top-pages view.
-- =============================================================================

alter table public.page_views
  add column if not exists client_view_id text;

create index if not exists page_views_client_view_id_idx
  on public.page_views (client_view_id);

-- -----------------------------------------------------------------------------
-- Replace ingest_tracking to:
--   * store client_view_id on pageviews
--   * handle a "page_duration" event that updates the matching pageview's
--     duration_ms (kept as the max reported value; not stored as an event)
-- -----------------------------------------------------------------------------
create or replace function public.ingest_tracking(p jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_visitor_token text := nullif(p->>'visitor_token', '');
  v_session_token text := nullif(p->>'session_token', '');
  v_visitor_id    uuid;
  v_session_id    uuid;
  v_session_new   boolean := false;
  v_event         jsonb;
  v_now           timestamptz := now();
  v_new_pageviews integer := 0;
  v_new_events    integer := 0;
begin
  if v_visitor_token is null or v_session_token is null then
    return;
  end if;

  insert into public.visitors as v (
    visitor_token, first_seen_at, last_seen_at, first_referrer, first_landing_path,
    first_utm_source, first_utm_medium, first_utm_campaign,
    user_agent, device_type, browser, os, country
  )
  values (
    v_visitor_token, v_now, v_now, p->>'referrer', p->>'landing_path',
    p->>'utm_source', p->>'utm_medium', p->>'utm_campaign',
    p->>'user_agent', coalesce((p->>'device_type')::device_type, 'unknown'),
    p->>'browser', p->>'os', p->>'country'
  )
  on conflict (visitor_token) do update
    set last_seen_at = v_now
  returning v.id into v_visitor_id;

  insert into public.sessions as s (
    session_token, visitor_id, started_at, last_activity_at, referrer, landing_path,
    utm_source, utm_medium, utm_campaign, utm_term, utm_content,
    user_agent, device_type, browser, os, ip_hash, country, region, city
  )
  values (
    v_session_token, v_visitor_id, v_now, v_now, p->>'referrer', p->>'landing_path',
    p->>'utm_source', p->>'utm_medium', p->>'utm_campaign', p->>'utm_term', p->>'utm_content',
    p->>'user_agent', coalesce((p->>'device_type')::device_type, 'unknown'),
    p->>'browser', p->>'os', p->>'ip_hash', p->>'country', p->>'region', p->>'city'
  )
  on conflict (session_token) do update
    set last_activity_at = v_now
  returning s.id, (s.xmax = 0) into v_session_id, v_session_new;

  if v_session_new then
    update public.visitors set total_sessions = total_sessions + 1 where id = v_visitor_id;
  end if;

  for v_event in select * from jsonb_array_elements(coalesce(p->'events', '[]'::jsonb))
  loop
    if (v_event->>'type') = 'pageview' then
      insert into public.page_views
        (session_id, visitor_id, path, title, referrer, duration_ms, client_view_id, created_at)
      values (
        v_session_id, v_visitor_id,
        coalesce(v_event->>'path', '/'), v_event->>'title', v_event->>'referrer',
        nullif(v_event->>'duration_ms', '')::integer,
        nullif(v_event->>'client_view_id', ''),
        coalesce((v_event->>'ts')::timestamptz, v_now)
      );
      v_new_pageviews := v_new_pageviews + 1;

    elsif (v_event->>'type') = 'page_duration' then
      update public.page_views
        set duration_ms = greatest(
          coalesce(duration_ms, 0),
          coalesce(nullif(v_event->>'duration_ms', '')::integer, 0)
        )
        where client_view_id = nullif(v_event->>'client_view_id', '')
          and visitor_id = v_visitor_id;

    else
      insert into public.events (session_id, visitor_id, event_type, event_name, path, metadata, created_at)
      values (
        v_session_id, v_visitor_id,
        coalesce(v_event->>'type', 'custom'), v_event->>'name', v_event->>'path',
        coalesce(v_event->'metadata', '{}'::jsonb),
        coalesce((v_event->>'ts')::timestamptz, v_now)
      );
      v_new_events := v_new_events + 1;
    end if;
  end loop;

  if v_new_pageviews > 0 or v_new_events > 0 then
    update public.sessions
      set page_view_count = page_view_count + v_new_pageviews,
          event_count     = event_count + v_new_events,
          last_activity_at = v_now
      where id = v_session_id;
    update public.visitors
      set total_page_views = total_page_views + v_new_pageviews
      where id = v_visitor_id;
  end if;
end;
$$;

revoke all on function public.ingest_tracking(jsonb) from public, anon, authenticated;
grant execute on function public.ingest_tracking(jsonb) to service_role;

-- Surface average time-on-page (ms) alongside views.
drop view if exists public.analytics_top_pages;
create view public.analytics_top_pages as
select
  pv.path,
  count(*)                                          as views,
  count(distinct pv.visitor_id)                      as unique_visitors,
  round(avg(pv.duration_ms) filter (where pv.duration_ms is not null))::bigint as avg_time_ms,
  max(pv.created_at)                                 as last_viewed_at
from public.page_views pv
group by pv.path
order by views desc;

revoke all on public.analytics_top_pages from anon, authenticated;

-- ===== 0005_email_campaigns.sql =====
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

-- ===== 0006_dashboard.sql =====
-- =============================================================================
-- 0006_dashboard.sql  —  aggregated analytics for the admin dashboard
-- One RPC returns all the Wix-style metrics for a rolling window of N days:
-- KPIs, new vs returning, sessions by device, traffic channels, sessions over
-- time, bounce rate, average session duration, and average pages per session.
-- =============================================================================

create or replace function public.admin_dashboard(p_days int default 30)
returns jsonb
language sql
security definer
set search_path = public
as $$
with bounds as (
  select (now() - make_interval(days => greatest(p_days, 1))) as start_ts
),
sess as (
  select
    s.id,
    s.visitor_id,
    s.started_at,
    s.page_view_count,
    coalesce(s.device_type::text, 'unknown') as device,
    greatest(extract(epoch from (s.last_activity_at - s.started_at)), 0) as duration_s,
    v.first_seen_at,
    case
      when coalesce(s.referrer, '') ~* 'charlotteefoil'                            then 'Direct'
      when coalesce(s.utm_source, '') <> ''
        or coalesce(s.utm_medium, '') ~* '(cpc|ppc|paid|display|social|email|newsletter)' then 'Marketing'
      when coalesce(s.referrer, '') ~* '(google\.|bing\.|yahoo\.|duckduckgo\.|ecosia\.|baidu\.|yandex\.|search)' then 'Organic search'
      when coalesce(s.referrer, '') = ''                                           then 'Direct'
      else 'Referral'
    end as channel
  from public.sessions s
  join public.visitors v on v.id = s.visitor_id
  cross join bounds
  where s.started_at >= bounds.start_ts
)
select jsonb_build_object(
  'range_days', greatest(p_days, 1),
  'totals', (
    select jsonb_build_object(
      'sessions', count(*),
      'unique_visitors', count(distinct visitor_id),
      'page_views', coalesce(sum(page_view_count), 0)
    ) from sess
  ),
  'avg_session_duration_seconds', (select coalesce(round(avg(duration_s)), 0) from sess),
  'avg_pages_per_session', (select coalesce(round(avg(page_view_count)::numeric, 2), 0) from sess),
  'bounce_rate', (
    select case when count(*) = 0 then 0
      else round(avg((page_view_count <= 1)::int)::numeric, 4) end
    from sess
  ),
  'new_vs_returning', (
    select jsonb_build_object(
      'new', count(distinct visitor_id) filter (where first_seen_at >= (select start_ts from bounds)),
      'returning', count(distinct visitor_id) filter (where first_seen_at < (select start_ts from bounds))
    ) from sess
  ),
  'sessions_by_device', (
    select coalesce(jsonb_agg(jsonb_build_object('label', device, 'sessions', c) order by c desc), '[]'::jsonb)
    from (select device, count(*) c from sess group by device) d
  ),
  'channels', (
    select coalesce(jsonb_agg(jsonb_build_object('label', channel, 'sessions', c, 'unique_visitors', uv) order by c desc), '[]'::jsonb)
    from (select channel, count(*) c, count(distinct visitor_id) uv from sess group by channel) ch
  ),
  'sessions_over_time', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'day', day, 'sessions', c, 'unique_visitors', uv, 'page_views', pv) order by day), '[]'::jsonb)
    from (
      select date_trunc('day', started_at)::date as day,
             count(*) c, count(distinct visitor_id) uv, coalesce(sum(page_view_count), 0) pv
      from sess group by 1
    ) t
  ),
  'form_submissions', (
    (select count(*) from public.contact_submissions where created_at >= (select start_ts from bounds))
    + (select count(*) from public.reservation_requests where created_at >= (select start_ts from bounds))
  ),
  'contact_submissions', (select count(*) from public.contact_submissions where created_at >= (select start_ts from bounds)),
  'reservation_requests', (select count(*) from public.reservation_requests where created_at >= (select start_ts from bounds))
);
$$;

revoke all on function public.admin_dashboard(int) from public, anon, authenticated;
grant execute on function public.admin_dashboard(int) to service_role;

-- ===== 0007_email_bounces.sql =====
-- =============================================================================
-- 0007_email_bounces.sql  —  bounce / complaint handling for email marketing
-- Permanent bounces and spam complaints remove the lead from the database.
-- Transient bounces are flagged so they are excluded from future campaigns.
-- =============================================================================

alter table public.leads
  add column if not exists bounced_at   timestamptz,
  add column if not exists bounce_reason text,
  add column if not exists bounce_kind   text;  -- bounce | complaint | send_failure

create index if not exists leads_bounced_at_idx on public.leads (bounced_at desc)
  where bounced_at is not null;

create table if not exists public.email_bounces (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid references public.leads (id) on delete set null,
  email       citext not null,
  kind        text not null,          -- bounce | complaint | send_failure
  permanent   boolean not null default true,
  reason      text,
  raw         jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists email_bounces_email_idx on public.email_bounces (email);
create index if not exists email_bounces_created_at_idx on public.email_bounces (created_at desc);

-- Marketing audience excludes unsubscribed and flagged bounces.
create or replace view public.email_audience as
select id, email, first_name, last_name, unsubscribe_token
from public.leads
where unsubscribed_at is null
  and bounced_at is null;

-- Admin list of contacts flagged or logged as bounced (lead may already be deleted).
create or replace view public.email_bounced_contacts as
select
  l.id,
  l.email,
  l.first_name,
  l.last_name,
  l.bounced_at,
  l.bounce_kind,
  l.bounce_reason,
  l.unsubscribed_at,
  l.created_at
from public.leads l
where l.bounced_at is not null;

-- Record a bounce/complaint/send failure and optionally delete the lead.
create or replace function public.handle_email_bounce(
  p_email citext,
  p_reason text default null,
  p_kind text default 'bounce',
  p_permanent boolean default true,
  p_raw jsonb default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lead public.leads%rowtype;
  v_deleted boolean := false;
begin
  if p_email is null or trim(p_email::text) = '' then
    return jsonb_build_object('ok', false, 'error', 'missing email');
  end if;

  select * into v_lead from public.leads where email = p_email limit 1;

  insert into public.email_bounces (lead_id, email, kind, permanent, reason, raw)
  values (v_lead.id, p_email, coalesce(nullif(p_kind, ''), 'bounce'), coalesce(p_permanent, true), p_reason, p_raw);

  if v_lead.id is null then
    return jsonb_build_object('ok', true, 'deleted', false, 'message', 'logged only — no lead matched');
  end if;

  if coalesce(p_permanent, true) or p_kind = 'complaint' then
    delete from public.leads where id = v_lead.id;
    v_deleted := true;
  else
    update public.leads
    set bounced_at = coalesce(bounced_at, now()),
        bounce_reason = coalesce(p_reason, bounce_reason),
        bounce_kind = coalesce(nullif(p_kind, ''), bounce_kind),
        marketing_consent = false
    where id = v_lead.id;
  end if;

  return jsonb_build_object('ok', true, 'deleted', v_deleted, 'lead_id', v_lead.id);
end;
$$;

-- Admin manual delete of a contact (e.g. after reviewing a transient bounce).
create or replace function public.admin_delete_lead(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_id is null then
    return jsonb_build_object('ok', false, 'error', 'missing id');
  end if;

  delete from public.leads where id = p_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not found');
  end if;

  return jsonb_build_object('ok', true, 'id', p_id);
end;
$$;

-- Bulk delete all flagged bounced contacts still in the database.
create or replace function public.admin_delete_bounced_leads()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  delete from public.leads where bounced_at is not null;
  get diagnostics v_count = row_count;
  return jsonb_build_object('ok', true, 'deleted', v_count);
end;
$$;

revoke all on function public.handle_email_bounce(citext, text, text, boolean, jsonb) from public, anon, authenticated;
revoke all on function public.admin_delete_lead(uuid) from public, anon, authenticated;
revoke all on function public.admin_delete_bounced_leads() from public, anon, authenticated;

grant execute on function public.handle_email_bounce(citext, text, text, boolean, jsonb) to service_role;
grant execute on function public.admin_delete_lead(uuid) to service_role;
grant execute on function public.admin_delete_bounced_leads() to service_role;

revoke all on public.email_bounces from anon, authenticated;
revoke all on public.email_bounced_contacts from anon, authenticated;

-- ===== 0008_email_schedules.sql =====
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

-- ===== 0009_email_flyers.sql =====
-- =============================================================================
-- 0009_email_flyers.sql  —  optional flyer image on campaigns and schedules
-- =============================================================================

alter table public.email_campaigns
  add column if not exists flyer_id uuid;

alter table public.email_schedules
  add column if not exists flyer_id uuid;

create index if not exists email_campaigns_flyer_idx on public.email_campaigns (flyer_id)
  where flyer_id is not null;

create index if not exists email_schedules_flyer_idx on public.email_schedules (flyer_id)
  where flyer_id is not null;

-- ===== 0010_email_flyer_html.sql =====
-- =============================================================================
-- 0010_email_flyer_html.sql  —  GrapesJS-designed flyer HTML on campaigns
-- =============================================================================

alter table public.email_campaigns
  add column if not exists flyer_html text;

alter table public.email_schedules
  add column if not exists flyer_html text;

-- ===== 0011_schedule_day_of_month_31.sql =====
-- Allow scheduling on the 29th, 30th, and 31st (skips months without that day).

alter table public.email_schedules
  drop constraint if exists email_schedules_day_of_month_check;

alter table public.email_schedules
  add constraint email_schedules_day_of_month_check
  check (day_of_month between 1 and 31);

