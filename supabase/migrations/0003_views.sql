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
