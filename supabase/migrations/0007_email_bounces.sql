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
