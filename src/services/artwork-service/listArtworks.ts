import { supabase } from '../../supabase/client'
import {
  getListCache,
  requireAdmin,
  setListCache
} from './cache'
import type { ArtworkListItem } from './types'

// ============================================================================
// Constants
// ============================================================================

const PAGE_SIZE = 12

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
 * Result from paginated artwork list query.
 */
export interface PaginatedArtworksResult {
  items: ArtworkListItem[]
  hasMore: boolean
  nextOffset: number
}

/**
 * List artworks with pagination support.
 * Uses offset-based pagination with Supabase's .range().
 */
export async function listArtworksPaginated(
  offset = 0,
  limit = PAGE_SIZE
): Promise<PaginatedArtworksResult> {
  try {
    const { data, error, count } = await supabase
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
      `, { count: 'exact' })
      .eq('is_published', true)
      .eq('artwork_images.is_hero', true)
      .order('sort_order')
      .range(offset, offset + limit - 1)

    if (error) {
      console.warn('[artwork-service] listArtworksPaginated failed:', error)
      return { items: [], hasMore: false, nextOffset: offset }
    }

    const items: ArtworkListItem[] = (data || []).map((item) => ({
      id: item.id,
      slug: item.slug,
      title: item.title,
      heroImageUrl: Array.isArray(item.artwork_images)
        ? item.artwork_images[0]?.image_url || ''
        : '',
      isPublished: true
    }))

    const totalCount = count ?? 0
    const nextOffset = offset + items.length
    const hasMore = nextOffset < totalCount

    return { items, hasMore, nextOffset }
  } catch (error) {
    console.warn('[artwork-service] listArtworksPaginated failed:', error)
    return { items: [], hasMore: false, nextOffset: offset }
  }
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
