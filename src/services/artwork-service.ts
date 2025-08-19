import { artworks as staticArtworks } from '../artworks'
import type { Artwork, ArtworkImage, ArtworkListItem } from '../types'
import { toSlug } from '../utils/slug'
import { sb_getArtworkWithImages, sb_listArtworks } from './data-connect-adapter'

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
  const baseUrl = import.meta.env.VITE_DATA_CONNECT_URL
  if (baseUrl) {
    try {
      return await sb_listArtworks(baseUrl)
    } catch (error) {
      // Fallback to static mapped data on error

      console.warn('[data-connect] listArtworks failed, falling back to static:', error)
    }
  }
  return mapStaticToArtworkList()
}

export async function getArtworkWithImages(slug: string): Promise<Artwork | null> {
  const baseUrl = import.meta.env.VITE_DATA_CONNECT_URL
  if (baseUrl) {
    try {
      const result = await sb_getArtworkWithImages(baseUrl, slug)
      if (result) return result
    } catch (error) {

      console.warn('[data-connect] getArtworkWithImages failed, falling back to static:', error)
    }
  }
  return mapStaticToArtwork(slug)
}


