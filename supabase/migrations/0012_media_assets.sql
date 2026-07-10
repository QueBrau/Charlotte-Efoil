-- 0012_media_assets.sql  —  media library metadata for email flyer assets
-- Binary files are stored in Netlify Blobs; this table tracks names and types.

create table if not exists public.media_assets (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  original_filename text,
  content_type  text not null,
  kind          text not null check (kind in ('image', 'video', 'logo')),
  size_bytes    integer not null check (size_bytes > 0),
  alt_text      text,
  created_at    timestamptz not null default now()
);

create index if not exists media_assets_created_idx on public.media_assets (created_at desc);
create index if not exists media_assets_kind_idx on public.media_assets (kind);

alter table public.media_assets enable row level security;
