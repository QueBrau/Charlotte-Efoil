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
