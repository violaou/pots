### Goal
Switch the app from Firebase (Auth, Firestore, Storage) to Supabase (Auth, Postgres, Storage) and Vercel with minimal downtime and a reversible cutover.

### Scope (current usage)
- **Auth**: Google OAuth, allowlist enforced in client (`ALLOWED_EMAILS`).
- **DB**: Firestore collection `blogPosts` with fields: `title`, `content`, `author`, `date` (string), `tags` (string[]), `imageUrl` (string). Artworks are currently static/DC-backed and out of scope for this phase.
- **Storage**: Firebase Storage bucket path `blog-images/*` for featured images.

### Supabase mapping
- **Auth → Supabase Auth**: Google provider via `signInWithOAuth({ provider: 'google' })`.
- **Firestore → Postgres**: Table `blog_posts` with RLS.
- **Storage → Supabase Storage**: Bucket `blog-images` (public read), restricted writes.

### Dependencies
- Add: `@supabase/supabase-js`
- Keep Firebase deps until cutover.

### Environment variables (Vite)
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- Keep Firebase vars until cutover; introduce `VITE_DATA_SOURCE` feature flag: `firebase` | `supabase`.

### Database setup (Postgres) — step-by-step
1. In the Supabase Dashboard, open SQL Editor.
2. Run the consolidated SQL below to create tables, triggers, and RLS policies.
3. Authenticate once with Google (via your site or the Supabase Auth UI) using `ouviola77@gmail.com` so the user exists in `auth.users`.
4. Insert the admin into `public.blog_admins` by email (query included below).
5. Optional: run the verification snippets to confirm reads are public and writes require admin.

Consolidated SQL (schema + RLS):
```sql
-- Extensions
create extension if not exists pgcrypto;

-- Admin membership table (single admin)
create table if not exists public.blog_admins (
  user_id uuid primary key,
  created_at timestamptz not null default now()
);
alter table public.blog_admins enable row level security;
create policy blog_admins_self_read on public.blog_admins for select using (auth.uid() = user_id);

-- Blog posts
create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  author text not null,
  post_date date not null,
  image_url text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists blog_posts_post_date_desc on public.blog_posts (post_date desc);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;
drop trigger if exists blog_posts_set_updated_at on public.blog_posts;
create trigger blog_posts_set_updated_at before update on public.blog_posts for each row execute function public.set_updated_at();

-- RLS for posts
alter table public.blog_posts enable row level security;

drop policy if exists "blog_posts_read" on public.blog_posts;
create policy "blog_posts_read" on public.blog_posts
for select
to public
using (true);

drop policy if exists "blog_posts_write" on public.blog_posts;
create policy "blog_posts_write" on public.blog_posts
for insert
to authenticated
with check (exists (select 1 from public.blog_admins a where a.user_id = auth.uid()));

drop policy if exists "blog_posts_update" on public.blog_posts;
create policy "blog_posts_update" on public.blog_posts
for update
to authenticated
using (exists (select 1 from public.blog_admins a where a.user_id = auth.uid()))
with check (exists (select 1 from public.blog_admins a where a.user_id = auth.uid()));

drop policy if exists "blog_posts_delete" on public.blog_posts;
create policy "blog_posts_delete" on public.blog_posts
for delete
to authenticated
using (exists (select 1 from public.blog_admins a where a.user_id = auth.uid()));
```

Add the admin (after first Google sign-in):
```sql
insert into public.blog_admins (user_id)
select id from auth.users where email = 'ouviola77@gmail.com'
on conflict (user_id) do nothing;
```

Quick verification snippets:
```sql
-- Public read should work (no auth required via PostgREST)
select count(*) from public.blog_posts;

-- As admin (via authenticated Supabase client), this should succeed
-- insert into public.blog_posts (title, content, author, post_date, image_url, tags)
-- values ('Test', 'Hello', 'Viola', current_date, null, array['intro']);
```

### Database schema (SQL)
```sql
-- Enable needed extensions
create extension if not exists pgcrypto;

-- Blog posts
create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  author text not null,
  post_date date not null,            -- maps from Firestore string date (YYYY-MM-DD)
  image_url text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for performance
create index if not exists blog_posts_post_date_desc on public.blog_posts (post_date desc);

-- Updated_at trigger function
create or replace function public.set_updated_at()
returns trigger language plpgsql security definer as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Trigger for automatically updating updated_at
drop trigger if exists blog_posts_set_updated_at on public.blog_posts;
create trigger blog_posts_set_updated_at
before update on public.blog_posts
for each row execute function public.set_updated_at();

-- Row Level Security
alter table public.blog_posts enable row level security;

-- Policies with more specific roles
-- Read: everyone (public site)
create policy "Public can read blog posts" on public.blog_posts
for select to public
using (true);

-- Admin write policies
create table if not exists public.blog_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- RLS on blog_admins
alter table public.blog_admins enable row level security;

create policy "Admins can read their own record" on public.blog_admins
for select
to authenticated
using (auth.uid() = user_id);

-- Admin write policies for blog_posts
create policy "Admins can write blog posts" on public.blog_posts
for insert
to authenticated
with check (exists (
  select 1 from public.blog_admins a
  where a.user_id = auth.uid()
));

create policy "Admins can update blog posts" on public.blog_posts
for update
to authenticated
using (exists (
  select 1 from public.blog_admins a
  where a.user_id = auth.uid()
))
with check (exists (
  select 1 from public.blog_admins a
  where a.user_id = auth.uid()
));

create policy "Admins can delete blog posts" on public.blog_posts
for delete
to authenticated
using (exists (
  select 1 from public.blog_admins a
  where a.user_id = auth.uid()
));
```

### Storage (bucket + policies)
```sql
-- Create bucket (run once in SQL editor if not created via UI)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'blog-images',  -- bucket id
  'blog-images',  -- bucket name
  true,          -- public read
  10 * 1024 * 1024,  -- 10MB file size limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']  -- allowed mime types
) on conflict (id) do nothing;

-- Improved Policies
-- Public read: Allow anyone to view images in the blog-images bucket
create policy "Public can view blog images" on storage.objects
  for select
  using (bucket_id = 'blog-images');

-- Admin write policies with more descriptive names and stricter checks
create policy "Admins can upload blog images" on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'blog-images'
    and exists (select 1 from public.blog_admins a where a.user_id = auth.uid())
    and (
      -- Optional: Add filename validation
      right(name, 4) = '.jpg' or
      right(name, 4) = '.png' or
      right(name, 5) = '.webp' or
      right(name, 4) = '.gif'
    )
  );

create policy "Admins can update blog images" on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'blog-images'
    and exists (select 1 from public.blog_admins a where a.user_id = auth.uid())
  )
  with check (
    bucket_id = 'blog-images'
    and exists (select 1 from public.blog_admins a where a.user_id = auth.uid())
  );

create policy "Admins can delete blog images" on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'blog-images'
    and exists (select 1 from public.blog_admins a where a.user_id = auth.uid())
  );
```

### Auth configuration
- Enable Google provider in Supabase Auth.
- Add Redirect URLs: `http://localhost:5173`, production domain, and Vercel preview domain(s) once available (e.g. `https://pots-<hash>-violaou.vercel.app`).
- Follow the official Supabase guide for migrating from Firebase Auth: [Supabase “Migrate from Firebase Auth to Supabase”](https://supabase.com/docs/guides/platform/migrating-to-supabase/firebase-auth).
- We only use Google OAuth (no password migration required). Ensure Google provider is configured; users will authenticate via Supabase.
- Admin assignment (single admin): insert the admin by email using a server-side query that resolves the `auth.users.id` for `ouviola77@gmail.com`:
```sql
insert into public.blog_admins (user_id)
select id from auth.users where email = 'ouviola77@gmail.com'
on conflict (user_id) do nothing;
```

### Client modules to add (TypeScript)
- `src/supabase/client.ts`:
```ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

- `src/supabase/auth.ts`:
```ts
import type { User } from '@supabase/supabase-js'
import { supabase } from './client'

export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' })
  if (error) throw error
}

export async function logout() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export function onAuthStateChange(cb: (user: User | null) => void) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => cb(session?.user ?? null))
  return () => data.subscription.unsubscribe()
}

// Optional: used by UI to gate admin-only features client-side (RLS still protects server-side)
export async function isAdmin(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('blog_admins')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return !!data
}
```

- `src/supabase/blog-service.ts`:
```ts
import { supabase } from './client'
import type { BlogPost } from '../types'

export async function createBlogPost(post: Omit<BlogPost, 'id' | 'date'> & { date: string }): Promise<string> {
  const { data, error } = await supabase
    .from('blog_posts')
    .insert({
      title: post.title,
      content: post.content,
      author: post.author,
      post_date: post.date,
      image_url: post.imageUrl,
      tags: post.tags ?? []
    })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

export async function getBlogPosts(): Promise<BlogPost[]> {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('id, title, content, author, post_date, image_url, tags')
    .order('post_date', { ascending: false })
  if (error) throw error
  return (data ?? []).map(r => ({
    id: r.id,
    title: r.title,
    content: r.content,
    author: r.author,
    date: String(r.post_date),
    imageUrl: r.image_url ?? undefined,
    tags: (r.tags ?? []) as string[]
  }))
}

export async function getBlogPost(id: string): Promise<BlogPost | null> {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('id, title, content, author, post_date, image_url, tags')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  return {
    id: data.id,
    title: data.title,
    content: data.content,
    author: data.author,
    date: String(data.post_date),
    imageUrl: data.image_url ?? undefined,
    tags: (data.tags ?? []) as string[]
  }
}
```

- `src/supabase/storage.ts`:
```ts
import { supabase } from './client'

export async function uploadImage(file: File): Promise<string> {
  const filename = `${Date.now()}-${file.name}`
  const { error: uploadError } = await supabase.storage.from('blog-images').upload(filename, file, { upsert: false })
  if (uploadError) throw uploadError
  const { data } = supabase.storage.from('blog-images').getPublicUrl(filename)
  return data.publicUrl
}
```

### Adapter layer (simple selectors)
- Add thin adapters to avoid import churn:
```ts
// src/services/blog-adapter.ts
import { createBlogPost as fbCreate, getBlogPosts as fbList, getBlogPost as fbGet } from '../firebase/blogService'
import { createBlogPost as sbCreate, getBlogPosts as sbList, getBlogPost as sbGet } from '../supabase/blog-service'

const source = import.meta.env.VITE_DATA_SOURCE

export const createBlogPost = source === 'supabase' ? sbCreate : fbCreate
export const getBlogPosts = source === 'supabase' ? sbList : fbList
export const getBlogPost = source === 'supabase' ? sbGet : fbGet
```

```ts
// src/services/image-adapter.ts
import { uploadImage as fbUpload } from '../firebase/imageService'
import { uploadImage as sbUpload } from '../supabase/storage'

const source = import.meta.env.VITE_DATA_SOURCE
export const uploadImage = source === 'supabase' ? sbUpload : fbUpload
```

- In `AuthContext`, when `VITE_DATA_SOURCE === 'supabase'`, wire to `supabase/auth.ts` (optionally call `isAdmin` to gate admin UI).

### Incremental rollout
1. Add Supabase modules and env vars without removing Firebase.
2. Add `VITE_DATA_SOURCE` flag and adapter layer:
   - Auth: wire `AuthContext` to Supabase when flag is `supabase` (optional UI admin check via `isAdmin`).
   - Blog: choose between `firebase/blogService` and `supabase/blog-service` via adapter.
   - Images: choose between `firebase/imageService` and `supabase/storage` via adapter.
3. Verify local flows: sign-in, create post with image, list posts.
4. Deploy behind flag to production; validate auth and RLS.
5. Flip flag to `supabase`.
6. After monitoring, remove Firebase code/vars.

### Hosting migration (Firebase Hosting → Vercel)
- Keep Firebase hosting config until cutover for rollback.
- Vercel project setup:
  - Import Git repo, framework preset: Vite (this auto-configures SPA rewrites). If you prefer explicit config, add `vercel.json` (optional, shown below).
  - Build command: `npm run build`. Output directory: `dist`.
  - Environment variables in Vercel:
    - `VITE_DATA_SOURCE` = `firebase` initially; flip to `supabase` at backend cutover.
    - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
    - Keep Firebase vars until full removal.
- Optional `vercel.json` for explicit SPA routing:
```json
{
  "version": 2,
  "builds": [{ "src": "index.html", "use": "@vercel/static-build", "config": { "distDir": "dist" } }],
  "routes": [{ "src": "/(.*)", "dest": "/index.html" }]
}
```
- Add Vercel scripts to `package.json` (use npx to avoid adding a new devDependency):
```json
{
  "scripts": {
    "vercel:dev": "npx vercel dev",
    "vercel:deploy": "npx vercel --prod"
  }
}
```
- Cutover to Vercel hosting:
  - Validate preview deployments (routing, env vars, auth, storage).
  - Add the preview domain to Supabase Auth Redirect URLs if not already added.
  - Point production domain DNS to Vercel.
  - Monitor. Keep Firebase hosting config for quick rollback until stable.
  - Remove Firebase hosting config/scripts after stabilization.

- Migrate Your Custom Domain (Optional but Recommended)
  - The final step is to switch your custom domain from Firebase to Vercel.
  - Add your domain to Vercel: In your Vercel project dashboard, go to the "Settings" tab, then "Domains." Add your custom domain (e.g., your-personal-site.com).
  - Configure DNS: Vercel will provide you with the necessary DNS records (usually an A record and a CNAME record).
  - Update your DNS provider: Go to the dashboard of your domain registrar (e.g., GoDaddy, Namecheap, Google Domains) where you bought the domain. Find the DNS settings and delete the existing DNS records that point to Firebase Hosting. Then, add the new records provided by Vercel.
  - Wait for propagation: DNS changes can take up to 48 hours to fully propagate, but it usually happens much faster (minutes to a few hours). You can check the status on your Vercel dashboard, which will show when the domain is active.

### Data migration
- Not required. We will start fresh with an empty `blog_posts` table.

### App changes (high level)
- Replace `src/firebase/authService.ts` usage in `AuthContext` with `supabase/auth.ts` when `VITE_DATA_SOURCE === 'supabase'`. Optionally call `isAdmin` to drive admin UI visibility.
- Replace `createBlogPost`, `getBlogPosts`, `getBlogPost` imports in pages to use the adapter.
- Replace image uploader to use `supabase/storage.ts` behind the same adapter.
- Keep the UI allowlist for now, but enforce server-side via `blog_admins` for real protection.

### Cutover checklist
- [ ] Supabase project created, Google provider enabled, redirect URLs set (dev, preview, prod).
- [ ] Dependency installed: `@supabase/supabase-js`.
- [ ] Env vars added locally and in prod: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_DATA_SOURCE`.
- [ ] Schema + RLS + storage bucket created.
- [ ] Single admin user inserted into `public.blog_admins` (by email `ouviola77@gmail.com`).
- [ ] App builds locally with `VITE_DATA_SOURCE=supabase` and all flows pass.
- [ ] Vercel project configured; preview deploy verified (SPA routes, env vars, auth).
- [ ] Domain DNS switched to Vercel when ready.
- [ ] Flip production flag to `supabase`.
- [ ] Monitor errors; roll back by switching the flag if needed.
- [ ] Remove Firebase code/vars and Firebase Hosting after stabilization.
- [ ] Update README to use `npm run build` (no `--base=/dist/`), and document Vercel deploy steps.

### Notes
- Future: move artworks to Postgres (`artworks`, `artwork_images`) when ready; current DC/static path remains.
- Consider moving the email allowlist to a table or user metadata; current `blog_admins` is robust and auditable.

