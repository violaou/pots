import { artworks as staticArtworks } from '../artworks'
import type { Artwork, ArtworkImage, ArtworkListItem } from '../types'
import { toSlug } from '../utils/slug'
import {
  type ArtworkUpdateInput,
  sb_deleteArtwork,
  sb_getArtworkWithImages,
  sb_listArtworks,
  sb_updateArtwork} from './data-connect-adapter'

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
      const list = await sb_listArtworks(baseUrl)
      artworkListCache = list
      return list
    } catch (error) {
      // Fallback to static mapped data on error
      console.warn('[data-connect] listArtworks failed, falling back to static:', error)
    }
  }
  const list = mapStaticToArtworkList()
  artworkListCache = list
  return list
}

export async function getArtworkWithImages(slug: string): Promise<Artwork | null> {
  const cached = artworkDetailCache.get(slug)
  if (cached) return cached
  const baseUrl = import.meta.env.VITE_DATA_CONNECT_URL
  if (baseUrl) {
    try {
      const result = await sb_getArtworkWithImages(baseUrl, slug)
      if (result) {
        artworkDetailCache.set(slug, result)
        return result
      }
    } catch (error) {
      console.warn('[data-connect] getArtworkWithImages failed, falling back to static:', error)
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
  if (!baseUrl) throw new Error('Updating artworks requires Data Connect backend')
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
    const saved = await sb_updateArtwork(baseUrl, slug, updates)

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
  const baseUrl = import.meta.env.VITE_DATA_CONNECT_URL
  if (!baseUrl) throw new Error('Deleting artworks requires Data Connect backend')
  // Snapshot caches
  const prevList = artworkListCache ? [...artworkListCache] : null
  const prevDetail = artworkDetailCache.get(slug)

  // Optimistic removal
  if (artworkListCache) {
    artworkListCache = artworkListCache.filter((item) => item.slug !== slug)
  }
  artworkDetailCache.delete(slug)

  try {
    await sb_deleteArtwork(baseUrl, slug)
  } catch (error) {
    // Rollback
    if (prevList) artworkListCache = prevList
    if (prevDetail) artworkDetailCache.set(slug, prevDetail)
    throw error
  }
}

export async function reorderArtworks(artworkIds: string[]): Promise<void> {
  const baseUrl = import.meta.env.VITE_DATA_CONNECT_URL
  if (!baseUrl) throw new Error('Reordering artworks requires Data Connect backend')

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


