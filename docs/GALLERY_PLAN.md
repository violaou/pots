## Project Plan: Artwork Data Restructure and Display

A staged plan to migrate artworks to a relational model with related images, integrate PostgreSQL via Supabase Data Connect, and update the UI.

### Phase 0 — Supabase Postgres Database design
- Define Postgres schema with `artworks` and `artwork_images` (1:N)
- Enforce a single hero image per artwork using a partial unique index on `artwork_id` where `is_hero = true`
- Adopt `slug` as the canonical route key (`/gallery/:slug`), unique per artwork
- create schema and generate a client if needed

DDL (summary):
- `artworks`: id (uuid), slug (unique), title, description, materials, clay, cone, is_microwave_safe, is_dishwasher_safe, created_at, updated_at
- `artwork_images`: id (uuid), artwork_id (fk → artworks), image_url, alt, sort_order, is_hero, created_at

### Phase 1 — Data layer interfaces and adapter (no UI changes)
- Define TypeScript interfaces: `ArtworkImage`, `Artwork`, `ArtworkListItem`
- Create a service: `listArtworks()` and `getArtworkWithImages(slug)`
- Implement a temporary adapter over current `src/artworks.ts` (derive `slug` from `title`, treat the single image as the hero)
- No component changes yet; keeps current app working while enabling future swap to DB

### Phase 2 — UI updates for related images and hero usage
- `ArtworkGrid` uses `listArtworks()` and displays `heroImageUrl`
- `ArtworkDetail` fetches by slug with `getArtworkWithImages(slug)`
- Render all related images when the detail page is visited: hero first, then by `sortOrder`
- Route detail pages to `/gallery/:slug`
- make it so test images can be accessed via a test_images folder available locally in the root directory of the project
- use test images first if dev environment is set to local


### Phase 3 — Upload form (admin)
- Admin-only upload with Zod validation
- Upload images to Supabase Postgres Storage if needed and persist Storage URLs
  - probably need to create a new page in the admin gated part of this website to do this
  - page should have a clean, react form with
    - REQUIRED:title
    - OPTIONAL:description
    - OPTIONAL:materials
    - OPTIONAL:clay
    - OPTIONAL:cone
    - OPTIONAL:isMicrowaveSafe
    - OPTIONAL:alt_text
    - REQUIRED: hero image (upload) - uploaded image should have isHero set to true
    - OPTIONAL: related images (upload), should support more than one file upload
  - page form onsubmit should validate the form and if valid, submit the form to the backend


### Phase 4 — Data validation

## API Contracts (stable for UI)

Interfaces (summary):
- `ArtworkImage`: id, artworkId, imageUrl, alt?, sortOrder, isHero, createdAt
- `Artwork`: id, slug, title, description?, materials?, clay?, cone?, isMicrowaveSafe, alt_text, createdAt, updatedAt, images: ArtworkImage[]
- `ArtworkListItem`: id, slug, title, heroImageUrl

Service functions:
- `listArtworks(): Promise<ArtworkListItem[]>`
- `getArtworkWithImages(slug: string): Promise<Artwork | null>`

## Routing
- Gallery: `/gallery` (grid of artworks using hero images)
- Detail: `/gallery/:slug` (hero + related images)

## Notes
- Slugs are URL-safe, stable identifiers derived from titles; treat as permanent once published
- One hero image per artwork is enforced by the DB
- Keep UI decoupled from data source via the service layer


