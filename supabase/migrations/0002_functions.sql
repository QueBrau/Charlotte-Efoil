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
