import { z } from 'zod'
import type { Artwork, ArtworkImage, ArtworkListItem } from '../types'
import {
  pickString,
  pickNumber,
  pickBoolean,
  pickDateString,
  withTrailingSlash
} from './utils'

// Schemas for validated, normalized shapes used by the UI
const ArtworkImageSchema = z.object({
  id: z.string(),
  artworkId: z.string(),
  imageUrl: z.string(),
  alt: z.string().optional(),
  sortOrder: z.number(),
  isHero: z.boolean(),
  createdAt: z.string()
})

const ArtworkSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  description: z.string().optional(),
  materials: z.string().optional(),
  clay: z.string().optional(),
  cone: z.number().optional(),
  isMicrowaveSafe: z.boolean(),
  isDishwasherSafe: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  images: z.array(ArtworkImageSchema)
})

const ArtworkListItemSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  heroImageUrl: z.string()
})

function normalizeImage(raw: any): ArtworkImage {
  const normalized: ArtworkImage = {
    id: String(raw.id),
    artworkId: pickString(raw, 'artworkId', 'artwork_id')!,
    imageUrl: pickString(raw, 'imageUrl', 'image_url')!,
    alt: pickString(raw, 'alt'),
    sortOrder: pickNumber(raw, 'sortOrder', 'sort_order') ?? 0,
    isHero: pickBoolean(raw, false, 'isHero', 'is_hero'),
    createdAt: pickDateString(raw, 'createdAt', 'created_at')
  }
  return ArtworkImageSchema.parse(normalized)
}

function normalizeArtwork(raw: any): Artwork {
  const imagesRaw = Array.isArray(raw.images) ? raw.images : []
  const normalized: Artwork = {
    id: String(raw.id),
    slug: String(raw.slug),
    title: String(raw.title),
    description: pickString(raw, 'description'),
    materials: pickString(raw, 'materials'),
    clay: pickString(raw, 'clay'),
    cone: pickNumber(raw, 'cone'),
    isMicrowaveSafe: pickBoolean(
      raw,
      false,
      'isMicrowaveSafe',
      'is_microwave_safe'
    ),
    isDishwasherSafe: pickBoolean(
      raw,
      false,
      'isDishwasherSafe',
      'is_dishwasher_safe'
    ),
    createdAt: pickDateString(raw, 'createdAt', 'created_at'),
    updatedAt: pickDateString(raw, 'updatedAt', 'updated_at'),
    images: imagesRaw.map(normalizeImage)
  }
  return ArtworkSchema.parse(normalized)
}

function normalizeListItem(raw: any): ArtworkListItem {
  const normalized: ArtworkListItem = {
    id: String(raw.id),
    slug: String(raw.slug),
    title: String(raw.title),
    heroImageUrl: pickString(
      raw,
      'heroImageUrl',
      'hero_image_url',
      'image_url',
      'hero_image'
    )!
  }
  return ArtworkListItemSchema.parse(normalized)
}

async function getJson(url: string, init?: RequestInit): Promise<any> {
  const res = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    ...init
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(
      `Data Connect request failed: ${res.status} ${res.statusText} ${text}`
    )
  }
  return res.json()
}

export async function dc_listArtworks(
  baseUrl: string
): Promise<ArtworkListItem[]> {
  const payload = await getJson(withTrailingSlash(baseUrl) + 'artworks')
  if (!Array.isArray(payload)) throw new Error('Invalid list payload')
  return payload.map(normalizeListItem)
}

export async function dc_getArtworkWithImages(
  baseUrl: string,
  slug: string
): Promise<Artwork | null> {
  if (!slug) return null
  const payload = await getJson(
    withTrailingSlash(baseUrl) + `artworks/${encodeURIComponent(slug)}`
  )
  if (!payload) return null
  return normalizeArtwork(payload)
}
