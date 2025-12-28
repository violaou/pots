-- 0) Extensions
create extension if not exists pgcrypto;
create extension if not exists plpgsql;

-- 1) Tables
create table if not exists public.artworks (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  clay text default 'stoneware',
  cone text default 'cone 6',
  is_microwave_safe boolean not null default true,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.artwork_images (
  id uuid primary key default gen_random_uuid(),
  artwork_id uuid not null references public.artworks(id) on delete cascade,
  image_url text not null,
  alt text,
  sort_order int not null default 0,
  is_hero boolean not null default false,
  created_at timestamptz not null default now()
);

-- 2) Constraints and indexes
-- Exactly one hero per artwork
create unique index if not exists artwork_images_one_hero
  on public.artwork_images (artwork_id) where is_hero;

-- Unique sort order per artwork
create unique index if not exists artwork_images_sort_order_unique
  on public.artwork_images (artwork_id, sort_order);

-- Slug guard and indexes
alter table public.artworks drop constraint if exists slug_format_chk;
alter table public.artworks add constraint slug_format_chk
  check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$');

create index if not exists artworks_slug_idx on public.artworks (slug);
create index if not exists artworks_created_at_idx on public.artworks (created_at desc);

-- 3) updated_at trigger
-- runs on row updates and sets NEW.updated_at to the current timestamp.
-- updated_at auto-refreshes on any change, even if the application doesn't set it. Idempotent setup via drop trigger if exists.
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now(); -- now() is the transaction start time
  return new;
end
$$;

drop trigger if exists artworks_set_updated_at on public.artworks;
create trigger artworks_set_updated_at
before update on public.artworks
for each row execute function public.set_updated_at();

-- 4) RLS
alter table public.artworks enable row level security;
alter table public.artwork_images enable row level security;

-- Public read (published only)
drop policy if exists "Public read published artworks" on public.artworks;
create policy "Public read published artworks" on public.artworks
for select using (is_published = true);

drop policy if exists "Public read published artwork images" on public.artwork_images;
create policy "Public read published artwork images" on public.artwork_images
for select using (
  exists (
    select 1
    from public.artworks a
    where a.id = artwork_images.artwork_id and a.is_published = true
  )
);

-- Admin writes (consistent with blog_admins)
-- Requires you already have public.blog_admins from your blog setup
drop policy if exists "Admin manage artworks" on public.artworks;
create policy "Admin manage artworks" on public.artworks
for all
to authenticated
using (exists (select 1 from public.blog_admins a where a.user_id = auth.uid()))
with check (exists (select 1 from public.blog_admins a where a.user_id = auth.uid()));

drop policy if exists "Admin manage artwork images" on public.artwork_images;
create policy "Admin manage artwork images" on public.artwork_images
for all
to authenticated
using (exists (select 1 from public.blog_admins a where a.user_id = auth.uid()))
with check (exists (select 1 from public.blog_admins a where a.user_id = auth.uid()));

-- 5) Helper view: hero image url for listings
create or replace view public.artworks_with_hero as
select a.*, hi.image_url as hero_image_url
from public.artworks a
left join public.artwork_images hi
  on hi.artwork_id = a.id and hi.is_hero = true;

-- 6) Allows anyone (no role restriction) to SELECT objects where bucket_id = 'artwork-images'. This makes that bucket publicly readable.
create policy "Public can view artwork images" on storage.objects
  for select using (bucket_id = 'artwork-images');

-- Admin manage (CRUD) artwork images
create policy "Admins can manage artwork images" on storage.objects
  for all to authenticated
  using (bucket_id = 'artwork-images' and exists (select 1 from public.blog_admins a where a.user_id = auth.uid()))
  with check (bucket_id = 'artwork-images' and exists (select 1 from public.blog_admins a where a.user_id = auth.uid()));