## Project Plan: Artwork Data Restructure and Display

A staged plan to migrate artworks to a relational model with related images, integrate PostgreSQL via Supabase Data Connect, and update the UI.

### Phase 0 — Supabase Postgres Database design
- Define Postgres schema with `artworks` and `artwork_images` (1:N)
- Enforce a single hero image per artwork using a partial unique index on `artwork_id` where `is_hero = true`
- Adopt `slug` as the canonical route key (`/gallery/:slug`), unique per artwork
- create schema and generate a client if needed

DDL (summary):
- `artworks`: id (uuid), slug (unique), title, description, clay, cone, is_microwave_safe, created_at, updated_at
- `artwork_images`: id (uuid), artwork_id (fk → artworks), image_url, alt, sort_order, is_hero, created_at

Details:
- Columns and defaults
  - `artworks`: `id uuid pk default gen_random_uuid()`, `slug text unique not null`, `title text not null`, `description text`, `clay text default 'stoneware'`, `cone text default 'cone 6'`, `is_microwave_safe boolean default true not null`, `is_published boolean default true not null`, `created_at timestamptz default now() not null`, `updated_at timestamptz default now() not null`
  - `artwork_images`: `id uuid pk default gen_random_uuid()`, `artwork_id uuid fk not null`, `image_url text not null`, `alt text`, `sort_order int default 0 not null`, `is_hero boolean default false not null`, `created_at timestamptz default now() not null`
- Constraints and indexes
  - One hero per artwork (partial unique):
    ```sql
    create unique index artwork_images_one_hero
      on artwork_images (artwork_id) where is_hero;
    ```
  - Unique per-artwork sort order:
    ```sql
    create unique index artwork_images_sort_order_unique
      on artwork_images (artwork_id, sort_order);
    ```
  - Slug format check and index:
    ```sql
    alter table artworks add constraint slug_format_chk
      check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$');
    create index artworks_slug_idx on artworks (slug);
    ```
- Triggers
  - Maintain `updated_at` on `artworks`:
    ```sql
    create or replace function set_updated_at() returns trigger
    language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
    create trigger artworks_set_updated_at before update on artworks
      for each row execute function set_updated_at();
    ```
- RLS (Supabase)
  - Enable RLS on `artworks` and `artwork_images`.
  - Public read: allow `select` on `artworks` where `is_published = true`; allow `select` on `artwork_images` when the parent artwork is published.
  - Admin writes: restrict `insert/update/delete` to an admin role claim (e.g., `auth.role() = 'authenticated'` and `jwt()->>'role' = 'admin'`).
- Storage
  - Use a bucket `artwork-images`; public read or signed URLs. Keep URL domain consistent for CORS.

### Phase 1 — Data layer interfaces and adapter (no UI changes)
- Define TypeScript interfaces: `ArtworkImage`, `Artwork`, `ArtworkListItem`
- Create a service: `listArtworks()` and `getArtworkWithImages(slug)`
- Implement a temporary adapter over current `src/artworks.ts` (derive `slug` from `title`, treat the single image as the hero)
- No component changes yet; keeps current app working while enabling future swap to DB

Details:
- Add a mapping layer snake_case ↔ camelCase for DB rows to TS interfaces.
- Feature flag the data source with `VITE_DATA_SOURCE=local|supabase` to pick adapter implementation.
- Local adapter must derive unique slugs from title with collision handling (append `-2`, `-3`, ...).

### Phase 2 — UI updates for related images and hero usage
- `ArtworkGrid` uses `listArtworks()` and displays `heroImageUrl`
- `ArtworkDetail` fetches by slug with `getArtworkWithImages(slug)`
- Render all related images when the detail page is visited: hero first, then by `sortOrder`
- Route detail pages to `/gallery/:slug`
- Use `public/test-images/` for local development; Vite serves static assets from `public/`.
- Prefer local images in dev when `VITE_IMAGE_SOURCE=local`; otherwise use remote URLs.
- Add skeleton loading states and friendly error/empty states.
- Always set `alt` on images; use hero image `alt` for primary image or fall back to artwork title.


### Phase 3 — Upload form in the admin gated part of the website (admin)
- Admin-only upload with Zod validation
- Upload information to Supabase Postgres Storage if needed and persist image URLs to image_url field
  - page should have a clean, react form with the following:
    - REQUIRED: title
    - OPTIONAL: description (textarea)
    - OPTIONAL:clay (string) default "stoneware"
    - OPTIONAL:cone (string) default "cone 6"
    - OPTIONAL:isMicrowaveSafe (boolean checkbox) default true
    - OPTIONAL:alt_text (string)
    - REQUIRED: hero image url - set image should have isHero set to true
      - image url will be taken as a string input.
      - there should be a preview of the image when given a url.
        - after a debounce of 1 second, there should be an attempt to fetch the image from the url to show in the preview thumbnail.
      - there should be a submit and cancel button.
    - OPTIONAL: related image urls, should support more than one url.
      - each url should be added to the form as a new field.
      - there should be a button to "add another image"
      - there should be a preview of the image when given a url.
        - after a debounce of 1 second, there should be an attempt to fetch the image from the url to show in the preview thumbnail.
      - there should be a submit and cancel button.
  - page form onsubmit should validate the form and if valid, submit the details to the backend


### Phase 4 — Data validation

Details:
- Server-side: validate that `image_url` points to image content-type where feasible (or restrict uploads to your Storage domain).
- Enforce at least one image per artwork; exactly one hero image (DB-level already ensures uniqueness).
- Optional publishing workflow: default `is_published = true`; hide unpublished from public reads.
## API Contracts (stable for UI)

Interfaces (summary):
- `ArtworkImage`: id, artworkId, imageUrl, alt?, sortOrder, isHero, createdAt
- `Artwork`: id, slug, title, description?, clay?, cone?, isMicrowaveSafe, isPublished, createdAt, updatedAt, images: ArtworkImage[]
- `ArtworkListItem`: id, slug, title, heroImageUrl

Service functions:
- `listArtworks(opts?: { limit?: number; offset?: number; sort?: 'createdAt' | 'title' }): Promise<ArtworkListItem[]>`
- `getArtworkWithImages(slug: string): Promise<Artwork | null>`

Behavioral notes:
- `listArtworks` returns only published artworks; heroImageUrl is resolved via hero image or null.
- `getArtworkWithImages` returns `null` for not found; images ordered with hero first, then ascending `sortOrder`.

## Routing
- Gallery: `/gallery` (grid of artworks using hero images)
- Detail: `/gallery/:slug` (hero + related images)

## Notes
- Slugs are URL-safe, stable identifiers derived from titles; treat as permanent once published
- One hero image per artwork is enforced by the DB
- Keep UI decoupled from data source via the service layer

## Cross-cutting concerns

- Configuration: `VITE_DATA_SOURCE`, `VITE_IMAGE_SOURCE`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` are required.
- Mapping helpers: centralize snake_case ↔ camelCase conversions for both tables.
- Pagination: default `limit 24`, `offset 0`; index `created_at` for sorting.
- Testing:
  - Unit: slugify, mappers, hero selection and image ordering, service adapters.
  - Integration: services against local adapter and Supabase with seed data.
  - E2E: gallery → detail navigation; admin create → appears in grid.
- Migrations/seed: maintain Supabase migrations for schema/policies; provide a seed to import existing `src/artworks.ts` data.
- Performance: expose a view to return `hero_image_url` for listing to avoid N+1 joins:
  ```sql
  create view artworks_with_hero as
  select a.*, hi.image_url as hero_image_url
  from artworks a
  left join artwork_images hi on hi.artwork_id = a.id and hi.is_hero = true;
  ```
- Error handling: normalize service errors, log unexpected failures once; UI should distinguish not-found from general failures.
- Naming: use dash-case directories, named exports for components, and `function` declarations for React components.


