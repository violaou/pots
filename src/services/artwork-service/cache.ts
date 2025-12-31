import { getCurrentAuthUser, isAdmin as checkIsAdmin } from '../../supabase/auth'
import type { Artwork, ArtworkListItem } from '../../types'

// eslint-disable-next-line no-unused-vars
type ListItemUpdater = (item: ArtworkListItem) => ArtworkListItem

// In-memory caches for optimistic UI
let artworkListCache: ArtworkListItem[] | null = null
const artworkDetailCache = new Map<string, Artwork>()

// List cache
export function getListCache(): ArtworkListItem[] | null {
  // Treat empty arrays as cache misses to avoid returning stale empty results
  if (artworkListCache && artworkListCache.length === 0) return null
  return artworkListCache
}

export function setListCache(list: ArtworkListItem[]): void {
  artworkListCache = list
}

export function clearListCache(): void {
  artworkListCache = null
}

export function updateListCacheItem(id: string, updater: ListItemUpdater): void {
  if (artworkListCache) {
    artworkListCache = artworkListCache.map((item) =>
      item.id === id ? updater(item) : item
    )
  }
}

export function removeFromListCache(slug: string): void {
  if (artworkListCache) {
    artworkListCache = artworkListCache.filter((item) => item.slug !== slug)
  }
}

export function prependToListCache(item: ArtworkListItem): void {
  if (artworkListCache) {
    artworkListCache = [item, ...artworkListCache]
  }
}

// Detail cache
export function getDetailCache(slug: string): Artwork | undefined {
  return artworkDetailCache.get(slug)
}

export function setDetailCache(slug: string, artwork: Artwork): void {
  artworkDetailCache.set(slug, artwork)
}

export function clearDetailCache(): void {
  artworkDetailCache.clear()
}

export function removeFromDetailCache(slug: string): void {
  artworkDetailCache.delete(slug)
}

// Auth helper
export async function requireAdmin(): Promise<string> {
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

