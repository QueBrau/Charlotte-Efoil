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
