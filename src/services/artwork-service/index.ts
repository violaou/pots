import { supabase } from '../../supabase/client'
import { toSlug } from '../../utils/slug'
import {
  clearListCache,
  getDetailCache,
  prependToListCache,
  removeFromDetailCache,
  removeFromListCache,
  requireAdmin,
  setDetailCache,
  updateListCacheItem
} from './cache'
import type {
  Artwork,
  ArtworkImage,
  ArtworkUpdateInput,
  CreateArtworkInput
} from './types'

export { saveArtworkImages } from './images'
export * from './listArtworks'
export * from './tagManagement'
export * from './types'

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
      creationYear: artworkData.creation_year,
      isPublished: artworkData.is_published,
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
      creation_year: input.creationYear ? parseInt(String(input.creationYear), 10) : null,
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
    creationYear: artworkData.creation_year,
    isPublished: artworkData.is_published,
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
    if ('creationYear' in updates) payload.creation_year = updates.creationYear ? parseInt(String(updates.creationYear), 10) : null
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



