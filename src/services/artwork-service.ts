import { artworks as staticArtworks } from '../artworks'
import { getCurrentAuthUser, isAdmin as checkIsAdmin } from '../supabase/auth'
import { supabase } from '../supabase/client'
import type { Artwork, ArtworkImage, ArtworkListItem } from '../types'
import { toSlug } from '../utils/slug'
import { deleteImage as deleteDoSpacesImage, isDoSpacesUrl } from './s3-upload'

/**
 * Input for updating an existing artwork.
 */
export interface ArtworkUpdateInput {
  title?: string
  description?: string
  clay?: string
  cone?: string | number
  isMicrowaveSafe?: boolean
  isPublished?: boolean
}

// Simple in-memory caches for optimistic UI
let artworkListCache: ArtworkListItem[] | null = null
const artworkDetailCache = new Map<string, Artwork>()

function mapStaticToArtworkList(): ArtworkListItem[] {
  return staticArtworks.map((a) => ({
    id: a.id,
    slug: toSlug(a.title),
    title: a.title,
    heroImageUrl: a.imageUrl,
  }))
}
/**
 * This function is needed to adapt the legacy static artwork data to the new relational model
 * defined in the project plan. It transforms the flat artwork objects into the ArtworkListItem[]
 * format, including generating a stable slug for each artwork. This enables the UI and service
 * layer to work with a consistent, future-proof API, decoupled from the underlying data source.
 *
 * TLDR; will be removed later
 */
function mapStaticToArtwork(slug: string): Artwork | null {
  const found = staticArtworks.find((a) => toSlug(a.title) === slug)
  if (!found) return null

  const createdAt = new Date().toISOString()
  const baseUrl = found.imageUrl.split('?')[0]

  const images: ArtworkImage[] = [
    {
      id: `${found.id}-hero`,
      artworkId: found.id,
      imageUrl: found.imageUrl,
      alt: found.title,
      sortOrder: 0,
      isHero: true,
      createdAt,
    },
    {
      id: `${found.id}-rel-1`,
      artworkId: found.id,
      imageUrl: `${baseUrl}?auto=format&fit=crop&w=1200&q=80`,
      alt: `${found.title} – detail 1`,
      sortOrder: 1,
      isHero: false,
      createdAt,
    },
    {
      id: `${found.id}-rel-2`,
      artworkId: found.id,
      imageUrl: `${baseUrl}?auto=format&fit=crop&w=1200&h=900&q=80`,
      alt: `${found.title} – detail 2`,
      sortOrder: 2,
      isHero: false,
      createdAt,
    },
  ]

  return {
    id: found.id,
    slug,
    title: found.title,
    description: found.description,
    materials: found.medium,
    clay: undefined,
    cone: undefined,
    isMicrowaveSafe: false,
    altText: found.altText,
    createdAt,
    updatedAt: createdAt,
    images,
  }
}

export async function listArtworks(): Promise<ArtworkListItem[]> {
  if (artworkListCache) return artworkListCache

  try {
    const { data, error } = await supabase
      .from('artworks')
      .select(`
        id,
        slug,
        title,
        artwork_images!inner (
          image_url,
          is_hero
        )
      `)
      .eq('is_published', true)
      .eq('artwork_images.is_hero', true)
      .order('created_at', { ascending: false })

    if (!error && data) {
      const list: ArtworkListItem[] = data.map((item) => ({
        id: item.id,
        slug: item.slug,
        title: item.title,
        heroImageUrl: Array.isArray(item.artwork_images)
          ? item.artwork_images[0]?.image_url || ''
          : ''
      }))
      artworkListCache = list
      return list
    }
  } catch (error) {
    console.warn('[artwork-service] listArtworks failed:', error)
  }

  // Fallback to static data
  const list = mapStaticToArtworkList()
  artworkListCache = list
  return list
}

export async function getArtworkWithImages(slug: string): Promise<Artwork | null> {
  const cached = artworkDetailCache.get(slug)
  if (cached) {
    return cached
  }

  try {
    const { data: artworkData, error: artworkError } = await supabase
      .from('artworks')
      .select('*')
      .eq('slug', slug)
      .single()

    if (artworkError || !artworkData) {
      console.warn('[artwork-service] Artwork not found:', slug)
      return mapStaticToArtwork(slug)
    }

    const { data: imagesData } = await supabase
      .from('artwork_images')
      .select('*')
      .eq('artwork_id', artworkData.id)
      .order('sort_order', { ascending: true })

    const images: ArtworkImage[] = (imagesData || []).map((img) => ({
      id: img.id,
      artworkId: img.artwork_id,
      imageUrl: img.image_url,
      alt: img.alt,
      sortOrder: img.sort_order,
      isHero: img.is_hero,
      createdAt: img.created_at
    }))

    const artwork: Artwork = {
      id: artworkData.id,
      slug: artworkData.slug,
      title: artworkData.title,
      description: artworkData.description,
      materials: undefined,
      clay: artworkData.clay,
      cone: artworkData.cone ? parseInt(artworkData.cone.replace(/\D/g, ''), 10) : undefined,
      isMicrowaveSafe: artworkData.is_microwave_safe,
      altText: undefined,
      createdAt: artworkData.created_at,
      updatedAt: artworkData.updated_at,
      images
    }

    artworkDetailCache.set(slug, artwork)
    return artwork
  } catch (error) {
    console.warn('[artwork-service] getArtworkWithImages failed:', error)
  }

  // Fallback to static data
  const fallback = mapStaticToArtwork(slug)
  if (fallback) artworkDetailCache.set(slug, fallback)
  return fallback
}

export async function updateArtwork(
  slug: string,
  updates: ArtworkUpdateInput
): Promise<Artwork> {
  // Verify admin access
  await requireAdmin()

  // Snapshot for rollback
  const prevDetail = artworkDetailCache.get(slug)
  const prevList = artworkListCache ? [...artworkListCache] : null

  // Optimistically update detail cache
  if (prevDetail) {
    const optimistic: Artwork = {
      ...prevDetail,
      title: updates.title ?? prevDetail.title,
      description: updates.description ?? prevDetail.description,
      clay: updates.clay ?? prevDetail.clay,
      cone: normalizeCone(updates.cone, prevDetail.cone),
      isMicrowaveSafe:
        typeof updates.isMicrowaveSafe === 'boolean'
          ? updates.isMicrowaveSafe
          : prevDetail.isMicrowaveSafe,
      updatedAt: new Date().toISOString()
    }
    artworkDetailCache.set(slug, optimistic)

    // Update title in list cache if present
    if (artworkListCache) {
      artworkListCache = artworkListCache.map((item) =>
        item.id === optimistic.id
          ? { ...item, title: optimistic.title }
          : item
      )
    }
  }

  try {
    // Direct Supabase update
    const payload: Record<string, unknown> = {}
    if (updates.title !== undefined) payload.title = updates.title
    if (updates.description !== undefined) payload.description = updates.description
    if (updates.clay !== undefined) payload.clay = updates.clay
    if (updates.cone !== undefined) {
      // Normalize cone to string format for DB
      payload.cone = typeof updates.cone === 'number'
        ? `cone ${updates.cone}`
        : updates.cone
    }
    if (updates.isMicrowaveSafe !== undefined) payload.is_microwave_safe = updates.isMicrowaveSafe
    if (updates.isPublished !== undefined) payload.is_published = updates.isPublished

    const { error } = await supabase
      .from('artworks')
      .update(payload)
      .eq('slug', slug)

    if (error) {
      throw new Error(`Failed to update artwork: ${error.message}`)
    }

    // Fetch updated artwork with images
    const updated = await getArtworkWithImages(slug)
    if (!updated) {
      throw new Error('Failed to fetch updated artwork')
    }

    // Clear cache to force refresh
    artworkDetailCache.delete(slug)
    artworkDetailCache.set(slug, updated)

    // Update list cache
    if (artworkListCache) {
      artworkListCache = artworkListCache.map((item) => {
        if (item.slug !== slug) return item
        return { ...item, title: updated.title }
      })
    }

    console.log('[artwork-service] Updated artwork:', slug)
    return updated
  } catch (error) {
    // Rollback on failure
    if (prevDetail) artworkDetailCache.set(slug, prevDetail)
    if (prevList) artworkListCache = prevList
    throw error
  }
}

export async function deleteArtwork(slug: string): Promise<void> {
  // Verify admin access before attempting delete
  await requireAdmin()

  // Snapshot caches
  const prevList = artworkListCache ? [...artworkListCache] : null
  const prevDetail = artworkDetailCache.get(slug)

  // Optimistic removal
  if (artworkListCache) {
    artworkListCache = artworkListCache.filter((item) => item.slug !== slug)
  }
  artworkDetailCache.delete(slug)

  try {
    // Note: artwork_images will be cascade deleted via FK
    const { data, error } = await supabase
      .from('artworks')
      .delete()
      .eq('slug', slug)
      .select('id')

    if (error) {
      throw new Error(`Failed to delete artwork: ${error.message}`)
    }

    // RLS may silently block delete - check if anything was actually deleted
    if (!data || data.length === 0) {
      throw new Error('Delete failed: artwork not found or permission denied')
    }

    console.log(`[artwork-service] Deleted artwork: ${slug}`)
  } catch (error) {
    // Rollback
    if (prevList) artworkListCache = prevList
    if (prevDetail) artworkDetailCache.set(slug, prevDetail)
    throw error
  }
}

// ============================================================================
// Auth Helpers
// ============================================================================

/**
 * Verify the current user is authenticated and is an admin.
 * @throws Error if not authenticated or not an admin
 */
async function requireAdmin(): Promise<string> {
  const user = await getCurrentAuthUser()
  if (!user) {
    throw new Error('Authentication required')
  }

  const isAdminUser = await checkIsAdmin(user.id)
  if (!isAdminUser) {
    throw new Error('Admin access required')
  }

  return user.id
}

// ============================================================================
// Create Artwork (Direct Supabase)
// ============================================================================

/**
 * Input for creating a new artwork with images.
 */
export interface CreateArtworkInput {
  title: string
  description?: string
  materials?: string
  clay?: string
  cone?: string
  isMicrowaveSafe: boolean
  altText?: string
  images: {
    cdnUrl: string
    alt?: string
    isHero: boolean
  }[]
}

/**
 * Creates a new artwork with associated images in Supabase.
 * Uses a transaction-like approach: creates artwork first, then images.
 *
 * Requires admin authentication. The database RLS policies also enforce this,
 * but we check client-side for better error messages.
 *
 * @param input - The artwork data and images to create
 * @returns The created artwork with images
 * @throws Error if not authenticated, not admin, or creation fails
 */
export async function createArtwork(input: CreateArtworkInput): Promise<Artwork> {
  // Verify admin access before attempting insert
  const userId = await requireAdmin()
  console.log(`[artwork-service] Admin ${userId} creating artwork: ${input.title}`)

  const slug = toSlug(input.title)

  // Insert artwork record
  const { data: artworkData, error: artworkError } = await supabase
    .from('artworks')
    .insert({
      slug,
      title: input.title,
      description: input.description || null,
      clay: input.clay || 'stoneware',
      cone: input.cone || 'cone 6',
      is_microwave_safe: input.isMicrowaveSafe,
      is_published: true
    })
    .select()
    .single()

  if (artworkError) {
    console.error('[artwork-service] Failed to create artwork:', artworkError)
    throw new Error(`Failed to create artwork: ${artworkError.message}`)
  }

  const artworkId = artworkData.id

  // Insert image records
  const imageInserts = input.images.map((img, index) => ({
    artwork_id: artworkId,
    image_url: img.cdnUrl,
    alt: img.alt || input.title,
    sort_order: index,
    is_hero: img.isHero
  }))

  const { data: imagesData, error: imagesError } = await supabase
    .from('artwork_images')
    .insert(imageInserts)
    .select()

  if (imagesError) {
    // Rollback: delete the artwork if images failed
    console.error('[artwork-service] Failed to create images, rolling back:', imagesError)
    await supabase.from('artworks').delete().eq('id', artworkId)
    throw new Error(`Failed to create artwork images: ${imagesError.message}`)
  }

  // Build the Artwork response
  const images: ArtworkImage[] = (imagesData || []).map((img) => ({
    id: img.id,
    artworkId: img.artwork_id,
    imageUrl: img.image_url,
    alt: img.alt,
    sortOrder: img.sort_order,
    isHero: img.is_hero,
    createdAt: img.created_at
  }))

  const artwork: Artwork = {
    id: artworkData.id,
    slug: artworkData.slug,
    title: artworkData.title,
    description: artworkData.description,
    materials: input.materials,
    clay: artworkData.clay,
    cone: artworkData.cone ? parseInt(artworkData.cone.replace(/\D/g, ''), 10) : undefined,
    isMicrowaveSafe: artworkData.is_microwave_safe,
    altText: input.altText,
    createdAt: artworkData.created_at,
    updatedAt: artworkData.updated_at,
    images
  }

  // Update caches
  artworkDetailCache.set(slug, artwork)
  const heroImage = images.find((img) => img.isHero) || images[0]
  if (artworkListCache) {
    artworkListCache = [
      {
        id: artwork.id,
        slug: artwork.slug,
        title: artwork.title,
        heroImageUrl: heroImage?.imageUrl || ''
      },
      ...artworkListCache
    ]
  }

  console.log('[artwork-service] Created artwork:', slug)
  return artwork
}

function normalizeCone(
  next: string | number | undefined,
  fallback: number | undefined
): number | undefined {
  if (typeof next === 'number') return next
  if (typeof next === 'string') {
    // Try to parse trailing number, e.g., "cone 6" -> 6
    const match = next.match(/(-?\d+(?:\.\d+)?)/)
    const parsed = match ? Number(match[1]) : Number(next)
    return Number.isFinite(parsed) ? parsed : fallback
  }
  return fallback
}

// ============================================================================
// Image Management
// ============================================================================

/**
 * Input for updating an existing artwork image.
 */
export interface UpdateImageInput {
  id: string
  alt?: string
  sortOrder?: number
  isHero?: boolean
}

/**
 * Input for adding a new image to an existing artwork.
 */
export interface AddImageInput {
  cdnUrl: string
  alt?: string
  sortOrder: number
  isHero: boolean
}

/**
 * Update multiple images for an artwork (sort order, alt text, hero status).
 */
export async function updateArtworkImages(
  artworkId: string,
  updates: UpdateImageInput[]
): Promise<void> {
  await requireAdmin()

  // Update each image
  for (const update of updates) {
    const payload: Record<string, unknown> = {}
    if (update.alt !== undefined) payload.alt = update.alt
    if (update.sortOrder !== undefined) payload.sort_order = update.sortOrder
    if (update.isHero !== undefined) payload.is_hero = update.isHero

    if (Object.keys(payload).length > 0) {
      const { error } = await supabase
        .from('artwork_images')
        .update(payload)
        .eq('id', update.id)
        .eq('artwork_id', artworkId)

      if (error) {
        console.error('[artwork-service] Failed to update image:', error)
        throw new Error(`Failed to update image: ${error.message}`)
      }
    }
  }

  // Invalidate cache
  artworkDetailCache.clear()
  console.log('[artwork-service] Updated images for artwork:', artworkId)
}

/**
 * Delete an image from an artwork.
 * Also cleans up the image from DO Spaces storage.
 */
export async function deleteArtworkImage(
  artworkId: string,
  imageId: string
): Promise<void> {
  await requireAdmin()

  // First get the image URL for S3 cleanup
  const { data: imageData } = await supabase
    .from('artwork_images')
    .select('image_url')
    .eq('id', imageId)
    .eq('artwork_id', artworkId)
    .single()

  const { error } = await supabase
    .from('artwork_images')
    .delete()
    .eq('id', imageId)
    .eq('artwork_id', artworkId)

  if (error) {
    console.error('[artwork-service] Failed to delete image:', error)
    throw new Error(`Failed to delete image: ${error.message}`)
  }

  // Clean up from S3 storage
  if (imageData?.image_url && isDoSpacesUrl(imageData.image_url)) {
    try {
      await deleteDoSpacesImage(imageData.image_url)
    } catch (e) {
      // Non-fatal: DB record is deleted, just log S3 cleanup failure
      console.warn('[artwork-service] Failed to delete image from S3:', e)
    }
  }

  // Invalidate cache
  artworkDetailCache.clear()
  console.log('[artwork-service] Deleted image:', imageId)
}

/**
 * Add a new image to an existing artwork.
 */
export async function addArtworkImage(
  artworkId: string,
  image: AddImageInput
): Promise<ArtworkImage> {
  await requireAdmin()

  const { data, error } = await supabase
    .from('artwork_images')
    .insert({
      artwork_id: artworkId,
      image_url: image.cdnUrl,
      alt: image.alt || '',
      sort_order: image.sortOrder,
      is_hero: image.isHero
    })
    .select()
    .single()

  if (error) {
    console.error('[artwork-service] Failed to add image:', error)
    throw new Error(`Failed to add image: ${error.message}`)
  }

  // Invalidate cache
  artworkDetailCache.clear()
  console.log('[artwork-service] Added image to artwork:', artworkId)

  return {
    id: data.id,
    artworkId: data.artwork_id,
    imageUrl: data.image_url,
    alt: data.alt,
    sortOrder: data.sort_order,
    isHero: data.is_hero,
    createdAt: data.created_at
  }
}

/**
 * Batch save all image changes for an artwork.
 * Handles updates, deletions, and new additions in one call.
 */
export async function saveArtworkImages(
  artworkId: string,
  changes: {
    updates: UpdateImageInput[]
    deletions: string[]
    additions: AddImageInput[]
  }
): Promise<void> {
  await requireAdmin()

  // Process deletions first
  for (const imageId of changes.deletions) {
    await deleteArtworkImage(artworkId, imageId)
  }

  // Process updates
  if (changes.updates.length > 0) {
    await updateArtworkImages(artworkId, changes.updates)
  }

  // Process additions
  for (const image of changes.additions) {
    await addArtworkImage(artworkId, image)
  }

  // Invalidate caches
  artworkDetailCache.clear()
  artworkListCache = null

  console.log('[artwork-service] Saved all image changes for artwork:', artworkId)
}


