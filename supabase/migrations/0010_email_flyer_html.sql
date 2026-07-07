-- =============================================================================
-- 0010_email_flyer_html.sql  —  GrapesJS-designed flyer HTML on campaigns
-- =============================================================================

alter table public.email_campaigns
  add column if not exists flyer_html text;

alter table public.email_schedules
  add column if not exists flyer_html text;
