import { supabase } from '../../supabase/client'
import { toSlug } from '../../utils/slug'
import {
  clearListCache,
  getDetailCache,
  getListCache,
  prependToListCache,
  removeFromDetailCache,
  removeFromListCache,
  requireAdmin,
  setDetailCache,
  setListCache,
  updateListCacheItem} from './cache'
import type {
  Artwork,
  ArtworkImage,
  ArtworkListItem,
  ArtworkUpdateInput,
  CreateArtworkInput
} from './types'

// Re-export types and image operations
export { saveArtworkImages } from './images'
export * from './types'

// ============================================================================
// List Artworks
// ============================================================================

export async function listArtworks(): Promise<ArtworkListItem[]> {
  const cached = getListCache()
  if (cached) return cached

  try {
    const { data, error } = await supabase
      .from('artworks')
      .select(`
        id,
        slug,
        title,
        sort_order,
        artwork_images!inner (
          image_url,
          is_hero
        )
      `)
      .eq('is_published', true)
      .eq('artwork_images.is_hero', true)
      .order('sort_order')

    if (!error && data) {
      const list: ArtworkListItem[] = data.map((item) => ({
        id: item.id,
        slug: item.slug,
        title: item.title,
        heroImageUrl: Array.isArray(item.artwork_images)
          ? item.artwork_images[0]?.image_url || ''
          : '',
        isPublished: true
      }))
      // Only cache non-empty results to avoid caching failed queries
      if (list.length > 0) {
        setListCache(list)
      }
      return list
    }
  } catch (error) {
    console.warn('[artwork-service] listArtworks failed:', error)
  }

  return []
}

/**
 * List all artworks including unpublished (admin only).
 * Does not use cache since it includes unpublished items.
 * Ordered by sort_order for manual ordering.
 */
export async function listAllArtworks(): Promise<ArtworkListItem[]> {
  await requireAdmin()

  try {
    const { data, error } = await supabase
      .from('artworks')
      .select(`
        id,
        slug,
        title,
        is_published,
        sort_order,
        artwork_images (
          image_url,
          is_hero
        )
      `)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('[artwork-service] listAllArtworks query error:', error)
      return []
    }

    if (data) {
      return data
        .filter((item) => item.artwork_images && item.artwork_images.length > 0)
        .map((item) => {
          // Find hero image or fallback to first image
          const images = item.artwork_images as { image_url: string; is_hero: boolean }[]
          const heroImage = images.find((img) => img.is_hero) || images[0]
          return {
            id: item.id,
            slug: item.slug,
            title: item.title,
            heroImageUrl: heroImage?.image_url || '',
            isPublished: item.is_published
          }
        })
    }
  } catch (error) {
    console.warn('[artwork-service] listAllArtworks failed:', error)
  }

  return []
}

// ============================================================================
// Get Artwork Detail
// ============================================================================

export async function getArtworkWithImages(slug: string): Promise<Artwork | null> {
  const cached = getDetailCache(slug)
  if (cached) return cached

  try {
    const { data: artworkData, error: artworkError } = await supabase
      .from('artworks')
      .select('*')
      .eq('slug', slug)
      .single()

    if (artworkError || !artworkData) {
      console.warn('[artwork-service] Artwork not found:', slug)
      return null
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
      isPublished: artworkData.is_published,
      altText: undefined,
      createdAt: artworkData.created_at,
      updatedAt: artworkData.updated_at,
      images
    }

    setDetailCache(slug, artwork)
    return artwork
  } catch (error) {
    console.warn('[artwork-service] getArtworkWithImages failed:', error)
    return null
  }
}

// ============================================================================
// Create Artwork
// ============================================================================

export async function createArtwork(input: CreateArtworkInput): Promise<Artwork> {
  const userId = await requireAdmin()
  console.log(`[artwork-service] Admin ${userId} creating artwork: ${input.title}`)

  const slug = toSlug(input.title)

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
    console.error('[artwork-service] Failed to create images, rolling back:', imagesError)
    await supabase.from('artworks').delete().eq('id', artworkId)
    throw new Error(`Failed to create artwork images: ${imagesError.message}`)
  }

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
    isPublished: artworkData.is_published,
    altText: input.altText,
    createdAt: artworkData.created_at,
    updatedAt: artworkData.updated_at,
    images
  }

  // Update caches
  setDetailCache(slug, artwork)
  const heroImage = images.find((img) => img.isHero) || images[0]
  prependToListCache({
    id: artwork.id,
    slug: artwork.slug,
    title: artwork.title,
    heroImageUrl: heroImage?.imageUrl || ''
  })

  console.log('[artwork-service] Created artwork:', slug)
  return artwork
}

// ============================================================================
// Update Artwork
// ============================================================================

export async function updateArtwork(
  slug: string,
  updates: ArtworkUpdateInput
): Promise<Artwork> {
  await requireAdmin()

  const prevDetail = getDetailCache(slug)

  // Optimistic update
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
    setDetailCache(slug, optimistic)
    updateListCacheItem(optimistic.id, (item) => ({
      ...item,
      title: optimistic.title
    }))
  }

  try {
    const payload: Record<string, unknown> = {}
    if ('title' in updates) payload.title = updates.title
    if ('description' in updates) payload.description = updates.description
    if ('clay' in updates) payload.clay = updates.clay
    if ('cone' in updates) {
      payload.cone = typeof updates.cone === 'number'
        ? `cone ${updates.cone}`
        : updates.cone
    }
    if ('isMicrowaveSafe' in updates) payload.is_microwave_safe = updates.isMicrowaveSafe
    if ('isPublished' in updates) payload.is_published = updates.isPublished

    const { error } = await supabase
      .from('artworks')
      .update(payload)
      .eq('slug', slug)

    if (error) {
      throw new Error(`Failed to update artwork: ${error.message}`)
    }

    // Fetch updated artwork
    removeFromDetailCache(slug)
    const updated = await getArtworkWithImages(slug)
    if (!updated) {
      throw new Error('Failed to fetch updated artwork')
    }

    console.log('[artwork-service] Updated artwork:', slug)
    return updated
  } catch (error) {
    // Rollback on failure
    if (prevDetail) setDetailCache(slug, prevDetail)
    throw error
  }
}

// ============================================================================
// Update Sort Order (Bulk)
// ============================================================================

export async function updateArtworkSortOrder(
  items: { id: string; sortOrder: number }[]
): Promise<void> {
  await requireAdmin()

  // Update each artwork's sort_order
  const updates = items.map(({ id, sortOrder }) =>
    supabase
      .from('artworks')
      .update({ sort_order: sortOrder })
      .eq('id', id)
  )

  const results = await Promise.all(updates)
  const errors = results.filter((r) => r.error)

  if (errors.length > 0) {
    console.error('[artwork-service] Failed to update some sort orders:', errors)
    throw new Error('Failed to update artwork order')
  }

  // Clear list cache since order changed
  clearListCache()
  console.log('[artwork-service] Updated sort order for', items.length, 'artworks')
}

// ============================================================================
// Delete Artwork
// ============================================================================

export async function deleteArtwork(slug: string): Promise<void> {
  await requireAdmin()

  // Optimistic removal
  removeFromListCache(slug)
  removeFromDetailCache(slug)

  try {
    const { data, error } = await supabase
      .from('artworks')
      .delete()
      .eq('slug', slug)
      .select('id')

    if (error) {
      throw new Error(`Failed to delete artwork: ${error.message}`)
    }

    if (!data || data.length === 0) {
      throw new Error('Delete failed: artwork not found or permission denied')
    }

    console.log(`[artwork-service] Deleted artwork: ${slug}`)
  } catch (error) {
    // Rollback by clearing caches (will refetch)
    clearListCache()
    throw error
  }
}

// ============================================================================
// Helpers
// ============================================================================

function normalizeCone(
  next: string | number | undefined,
  fallback: number | undefined
): number | undefined {
  if (typeof next === 'number') return next
  if (typeof next === 'string') {
    const match = next.match(/(-?\d+(?:\.\d+)?)/)
    const parsed = match ? Number(match[1]) : Number(next)
    return Number.isFinite(parsed) ? parsed : fallback
  }
  return fallback
}

