-- 0013_site_content.sql — CMS draft/published content per page

create table if not exists public.site_content (
  slug          text primary key,
  draft         jsonb not null default '{}'::jsonb,
  published     jsonb not null default '{}'::jsonb,
  updated_at    timestamptz not null default now(),
  published_at  timestamptz
);

create index if not exists site_content_updated_idx on public.site_content (updated_at desc);

alter table public.site_content enable row level security;
