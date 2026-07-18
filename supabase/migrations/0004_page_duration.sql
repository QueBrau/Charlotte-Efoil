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
