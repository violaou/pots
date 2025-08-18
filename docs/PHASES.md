## Project Plan: Artwork Data Restructure and Display

A staged plan to migrate artworks to a relational model with related images, integrate PostgreSQL via Firebase Data Connect, and update the UI.

### Phase 0 — Database design and Data Connect plan
- Define Postgres schema with `artworks` and `artwork_images` (1:N)
- Enforce a single hero image per artwork using a partial unique index on `artwork_id` where `is_hero = true`
- Adopt `slug` as the canonical route key (`/gallery/:slug`), unique per artwork
- Prepare Data Connect configuration to introspect the schema and generate a client

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

### Phase 2.5 — switch to use supabase


### Phase 3 — Firebase Data Connect integration
- Provision Postgres

### Phase 4 — Data migration
- Script to import existing static artworks into Postgres
- Upload images to Firebase Storage if needed and persist Storage URLs
- Validate hero image constraints and sort orders

### Phase 5 — Upload form (admin)
- Admin-only upload with Zod validation
- Upload images to Storage, then write rows to DB via Data Connect
- Support marking one image as hero and ordering the rest

## API Contracts (stable for UI)

Interfaces (summary):
- `ArtworkImage`: id, artworkId, imageUrl, alt?, sortOrder, isHero, createdAt
- `Artwork`: id, slug, title, description?, materials?, clay?, cone?, isMicrowaveSafe, isDishwasherSafe, createdAt, updatedAt, images: ArtworkImage[]
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


