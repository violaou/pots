import { z } from 'zod'

import type { Artwork, ArtworkImage, ArtworkListItem } from '../types'
import {
  pickBoolean,
  pickDateString,
  pickNumber,
  pickString,
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
  altText: z.string().optional(),
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
    altText: pickString(raw, 'altText'),
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

async function sendJson(
  url: string,
  method: 'PATCH' | 'PUT' | 'POST' | 'DELETE',
  body?: unknown,
  headers?: Record<string, string>
): Promise<any> {
  const res = await fetch(url, {
    method,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(headers ?? {})
    },
    body: body == null ? undefined : JSON.stringify(body)
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(
      `Data Connect request failed: ${res.status} ${res.statusText} ${text}`
    )
  }
  // Some DELETE endpoints return no content
  const contentType = res.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) return null
  return res.json()
}

export async function sb_listArtworks(
  baseUrl: string
): Promise<ArtworkListItem[]> {
  const payload = await getJson(withTrailingSlash(baseUrl) + 'artworks')
  if (!Array.isArray(payload)) throw new Error('Invalid list payload')
  return payload.map(normalizeListItem)
}

export async function sb_getArtworkWithImages(
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

export interface ArtworkUpdateInput {
  title?: string
  description?: string
  clay?: string
  cone?: string | number
  isMicrowaveSafe?: boolean
  isPublished?: boolean
}

export async function sb_updateArtwork(
  baseUrl: string,
  slug: string,
  updates: ArtworkUpdateInput
): Promise<Artwork> {
  if (!slug) throw new Error('slug is required')
  if (!updates || typeof updates !== 'object') {
    throw new Error('updates payload is required')
  }
  const payload = await sendJson(
    withTrailingSlash(baseUrl) + `artworks/${encodeURIComponent(slug)}`,
    'PATCH',
    updates
  )
  return normalizeArtwork(payload)
}

export async function sb_deleteArtwork(
  baseUrl: string,
  slug: string
): Promise<void> {
  if (!slug) throw new Error('slug is required')
  await sendJson(
    withTrailingSlash(baseUrl) + `artworks/${encodeURIComponent(slug)}`,
    'DELETE'
  )
}
