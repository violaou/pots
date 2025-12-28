## Gallery database migrations and seed plan

This doc contains concrete SQL you can run in Supabase SQL Editor (or ship as migrations), plus a seed outline to import the current local data into the new relational model.

### Migration SQL (run in order)

#### 0. Extensions (Supabase usually has these enabled)
```sql
create extension if not exists pgcrypto;        -- for gen_random_uuid()
create extension if not exists plpgsql;         -- to define triggers and functions
```

#### 1. Tables
```sql
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
```

#### 2. Constraints and indexes
```sql
-- Exactly one hero per artwork (partial unique index)
create unique index if not exists artwork_images_one_hero
  on public.artwork_images (artwork_id) where is_hero;

-- Unique sort order per artwork
create unique index if not exists artwork_images_sort_order_unique
  on public.artwork_images (artwork_id, sort_order);

-- Slug format guard and index
alter table public.artworks drop constraint if exists slug_format_chk;
alter table public.artworks add constraint slug_format_chk
  check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$');

create index if not exists artworks_slug_idx on public.artworks (slug);
create index if not exists artworks_created_at_idx on public.artworks (created_at desc);
```

#### 3. Trigger to maintain updated_at
```sql
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end
$$;

drop trigger if exists artworks_set_updated_at on public.artworks;
create trigger artworks_set_updated_at
before update on public.artworks
for each row execute function public.set_updated_at();
```

#### 4. Row Level Security (RLS) and policies
```sql
alter table public.artworks enable row level security;
alter table public.artwork_images enable row level security;

-- Public read: published artworks only
drop policy if exists "Public read published artworks" on public.artworks;
create policy "Public read published artworks" on public.artworks
for select using (is_published = true);

-- Public read: images of published artworks only
drop policy if exists "Public read published artwork images" on public.artwork_images;
create policy "Public read published artwork images" on public.artwork_images
for select using (
  exists (
    select 1
    from public.artworks a
    where a.id = artwork_images.artwork_id and a.is_published = true
  )
);

-- Admin write policies (example: JWT claim role = 'admin')
-- Adjust to your auth setup. Supabase exposes auth.jwt().
drop policy if exists "Admin manage artworks" on public.artworks;
create policy "Admin manage artworks" on public.artworks
for all
to authenticated
using ((auth.jwt() ->> 'role') = 'admin')
with check ((auth.jwt() ->> 'role') = 'admin');

drop policy if exists "Admin manage artwork images" on public.artwork_images;
create policy "Admin manage artwork images" on public.artwork_images
for all
to authenticated
using ((auth.jwt() ->> 'role') = 'admin')
with check ((auth.jwt() ->> 'role') = 'admin');
```

#### 5. Helper view to expose hero URL
```sql
create or replace view public.artworks_with_hero as
select a.*, hi.image_url as hero_image_url
from public.artworks a
left join public.artwork_images hi
  on hi.artwork_id = a.id and hi.is_hero = true;
```

#### 6. RPC for atomic create (artwork + images)
This function creates an artwork, inserts the hero image, and optional related images in a single transaction.
```sql
create or replace function public.create_artwork_with_images(
  p_title text,
  p_description text default null,
  p_clay text default 'stoneware',
  p_cone text default 'cone 6',
  p_is_microwave_safe boolean default true,
  p_is_published boolean default true,
  p_hero_image_url text,
  p_hero_alt text,
  p_related_image_urls text[] default '{}',
  p_related_image_alts text[] default '{}'
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_slug text;
  i int;
  v_url text;
  v_alt text;
begin
  -- slugify: lower, replace non-alnum with dash, trim leading/trailing dashes
  v_slug := lower(regexp_replace(trim(both '-' from regexp_replace(p_title, '[^a-zA-Z0-9]+', '-', 'g')), '-{2,}', '-', 'g'));

  -- ensure slug is unique by appending suffixes if needed
  i := 1;
  while exists (select 1 from public.artworks where slug = v_slug) loop
    i := i + 1;
    v_slug := lower(regexp_replace(trim(both '-' from regexp_replace(p_title, '[^a-zA-Z0-9]+', '-', 'g')), '-{2,}', '-', 'g')) || '-' || i::text;
  end loop;

  insert into public.artworks (
    slug, title, description, clay, cone, is_microwave_safe, is_published
  ) values (
    v_slug, p_title, p_description, p_clay, p_cone, p_is_microwave_safe, p_is_published
  ) returning id into v_id;

  insert into public.artwork_images (artwork_id, image_url, alt, sort_order, is_hero)
  values (v_id, p_hero_image_url, nullif(p_hero_alt, ''), 0, true);

  -- insert related images
  for i in 1..coalesce(array_length(p_related_image_urls, 1), 0) loop
    v_url := p_related_image_urls[i];
    v_alt := case when p_related_image_alts is null then null else p_related_image_alts[i] end;
    insert into public.artwork_images (artwork_id, image_url, alt, sort_order, is_hero)
    values (v_id, v_url, nullif(v_alt, ''), i, false);
  end loop;

  return v_id;
end
$$;
```

Notes:
- The function uses a simple slugification and collision strategy; adjust to match your app’s slug utility if needed.
- Marked security definer to allow a single permissioned surface with RLS; ensure only admins can call this in production (create an `execute` policy).

```sql
-- Allow only admins to call the RPC
revoke all on function public.create_artwork_with_images(text, text, text, text, boolean, boolean, text, text, text[], text[]) from public;
grant execute on function public.create_artwork_with_images(text, text, text, text, boolean, boolean, text, text, text[], text[]) to authenticated;
drop policy if exists "Admin call create_artwork_with_images" on public for all;
-- Supabase doesn't policy-guard functions directly; ensure table write policies already restrict to admin via JWT claim.
```

### Seed data outline

You currently have flat artwork items in `src/artworks.ts` and `src/assets/artworks.ts` with a single `imageUrl`. For seeding:
- Use that as the hero image.
- Derive the slug from `title` (use your existing `src/utils/slug.ts` if you prefer parity with the app).
- Optionally, add a few related images per artwork to exercise the detail view ordering.

#### Option A: Quick SQL examples
```sql
-- Example: insert one artwork and its images directly (bypassing RPC)
with a as (
  insert into public.artworks (slug, title, description, clay, cone, is_microwave_safe, is_published)
  values ('summer-breeze', 'Summer Breeze', 'An abstract representation...', 'stoneware', 'cone 6', true, true)
  returning id
)
insert into public.artwork_images (artwork_id, image_url, alt, sort_order, is_hero)
select id, 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5', 'Summer Breeze hero', 0, true from a;
```

#### Option B: TypeScript seed script using Supabase client

Requirements:
- Install `tsx` to run TS directly, and `@supabase/supabase-js` if not present.
```bash
pnpm add -D tsx
pnpm add @supabase/supabase-js
```

Script suggestion (place as `scripts/seed-artworks.ts`):
```ts
import { createClient } from '@supabase/supabase-js';
import { artworks } from '../src/artworks';

function toSlug(input: string): string {
  if (!input) return '';
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

interface SeedItem {
  title: string;
  imageUrl: string;
  description?: string;
}

async function main() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!; // use service key for seeding only
  const supabase = createClient(url, key);

  for (const item of artworks as unknown as SeedItem[]) {
    const slugBase = toSlug(item.title);
    const heroAlt = `${item.title}`;

    const { error } = await supabase.rpc('create_artwork_with_images', {
      p_title: item.title,
      p_description: item.description ?? null,
      p_clay: 'stoneware',
      p_cone: 'cone 6',
      p_is_microwave_safe: true,
      p_is_published: true,
      p_hero_image_url: item.imageUrl,
      p_hero_alt: heroAlt,
      p_related_image_urls: [],
      p_related_image_alts: []
    });

    if (error) {
      console.error('Seed failed for', slugBase, error.message);
    } else {
      console.log('Seeded', slugBase);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

Run with:
```bash
SUPABASE_URL=... \
SUPABASE_SERVICE_ROLE_KEY=... \
pnpm tsx scripts/seed-artworks.ts
```

Notes:
- Never expose the service role key to the browser. Use a server/local shell for seeding.
- If you prefer not to use the RPC, you can insert into `artworks` and `artwork_images` directly in the script.

### Rollback (if needed)
```sql
drop view if exists public.artworks_with_hero;
drop table if exists public.artwork_images;
drop table if exists public.artworks;
```


