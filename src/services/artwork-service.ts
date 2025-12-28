import { artworks as staticArtworks } from '../artworks'
import { getCurrentAuthUser,isAdmin as checkIsAdmin } from '../supabase/auth'
import { supabase } from '../supabase/client'
import type { Artwork, ArtworkImage, ArtworkListItem } from '../types'
import { toSlug } from '../utils/slug'
import type { ArtworkUpdateInput } from './artwork-api-client'
import * as apiClient from './artwork-api-client'

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
  const baseUrl = import.meta.env.VITE_DATA_CONNECT_URL
  if (baseUrl) {
    try {
      const list = await apiClient.listArtworks(baseUrl)
      artworkListCache = list
      return list
    } catch (error) {
      // Fallback to static mapped data on error
      console.warn('[artwork-api] listArtworks failed, falling back to static:', error)
    }
  } else {
    // Direct Supabase fetch when no API backend
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
  }
  const list = mapStaticToArtworkList()
  artworkListCache = list
  return list
}

export async function getArtworkWithImages(slug: string): Promise<Artwork | null> {
  const cached = artworkDetailCache.get(slug)
  if (cached) {
    return cached
  }
  const baseUrl = import.meta.env.VITE_DATA_CONNECT_URL
  if (baseUrl) {
    try {
      const result = await apiClient.getArtworkWithImages(baseUrl, slug)
      if (result) {
        artworkDetailCache.set(slug, result)
        return result
      }
    } catch (error) {
      console.warn('[artwork-api] getArtworkWithImages failed, falling back:', error)
    }
  } else {
    // Direct Supabase fetch when no API backend
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
  }
  const fallback = mapStaticToArtwork(slug)
  if (fallback) artworkDetailCache.set(slug, fallback)
  return fallback
}

export async function updateArtwork(
  slug: string,
  updates: ArtworkUpdateInput
): Promise<Artwork> {
  const baseUrl = import.meta.env.VITE_DATA_CONNECT_URL
  if (!baseUrl) throw new Error('Updating artworks requires artwork API backend')
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
    const saved = await apiClient.updateArtwork(baseUrl, slug, updates)

    // If slug changed on the server, move cache entry
    if (saved.slug !== slug) {
      artworkDetailCache.delete(slug)
    }
    artworkDetailCache.set(saved.slug, saved)

    // Sync list cache with returned title/slug
    if (artworkListCache) {
      artworkListCache = artworkListCache.map((item) => {
        if (item.id !== saved.id) return item
        return { ...item, title: saved.title, slug: saved.slug }
      })
    }

    return saved
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
    const baseUrl = import.meta.env.VITE_DATA_CONNECT_URL
    if (baseUrl) {
      // Use API backend if available
      await apiClient.deleteArtwork(baseUrl, slug)
    } else {
      // Direct Supabase delete
      // Note: artwork_images will be cascade deleted via FK, triggering S3 cleanup
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
    }

    console.log(`[artwork-service] Deleted artwork: ${slug}`)
  } catch (error) {
    // Rollback
    if (prevList) artworkListCache = prevList
    if (prevDetail) artworkDetailCache.set(slug, prevDetail)
    throw error
  }
}

export async function reorderArtworks(artworkIds: string[]): Promise<void> {
  const baseUrl = import.meta.env.VITE_DATA_CONNECT_URL
  if (!baseUrl) throw new Error('Reordering artworks requires artwork API backend')

  // Snapshot for rollback
  const prevList = artworkListCache ? [...artworkListCache] : null

  // Optimistically update order in cache
  if (artworkListCache) {
    artworkListCache = artworkListCache.map((item, index) => ({
      ...item,
      sortOrder: artworkIds.indexOf(item.id) !== -1 ? artworkIds.indexOf(item.id) : index
    }))
  }

  try {
    // TODO:For now, we'll just update the cache since there's no backend reorder endpoint
    // In a real implementation, you'd call a backend endpoint to update sortOrder
    console.log('Reordered artworks:', artworkIds)
  } catch (error) {
    // Rollback on failure
    if (prevList) artworkListCache = prevList
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


