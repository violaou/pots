/**
 * Artwork API Client
 *
 * HTTP client for artwork REST API endpoints. This module handles:
 * - Making HTTP requests to artwork API endpoints
 * - Normalizing API responses from various formats (camelCase/snake_case) to consistent TypeScript types
 * - Validating response data using Zod schemas
 * - Providing type-safe functions for CRUD operations on artworks
 *
 * The API is expected to return data in either camelCase or snake_case format.
 * This adapter normalizes all responses to camelCase for consistent use throughout the application.
 *
 * @example
 * ```ts
 * const baseUrl = import.meta.env.VITE_DATA_CONNECT_URL
 * const artworks = await listArtworks(baseUrl)
 * const artwork = await getArtworkWithImages(baseUrl, 'my-artwork-slug')
 * ```
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from 'zod'

import type { Artwork, ArtworkImage, ArtworkListItem } from '../types'
import {
  pickBoolean,
  pickDateString,
  pickNumber,
  pickString,
  withTrailingSlash
} from '../utils/utils'

// ============================================================================
// API Endpoints
// ============================================================================

const ENDPOINTS = {
  ARTWORKS: 'artworks',
  artworkBySlug: (slug: string) => `artworks/${encodeURIComponent(slug)}`
} as const

// ============================================================================
// Validation Schemas
// ============================================================================

/**
 * Zod schemas for runtime validation of API responses.
 * These ensure the normalized data matches the expected TypeScript types.
 */
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

// ============================================================================
// Data Normalization
// ============================================================================

/**
 * Normalizes raw API response for an artwork image.
 * Handles both camelCase (imageUrl) and snake_case (image_url) field names.
 */
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

/**
 * Normalizes raw API response for a complete artwork with images.
 * Handles both camelCase and snake_case field names from the API.
 */
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

/**
 * Normalizes raw API response for an artwork list item.
 * Handles multiple possible field names for the hero image URL.
 */
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

// ============================================================================
// HTTP Helpers
// ============================================================================

/**
 * Makes a GET request and returns the JSON response.
 * Throws an error if the response is not OK.
 */
async function getJson(url: string, init?: globalThis.RequestInit): Promise<any> {
  const res = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    ...init
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(
      `Artwork API request failed: ${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`
    )
  }
  return res.json()
}

/**
 * Makes a request with JSON body (PATCH, PUT, POST, DELETE) and returns the JSON response.
 * Handles cases where DELETE endpoints return no content.
 */
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
      `Artwork API request failed: ${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`
    )
  }
  // Some DELETE endpoints return no content
  const contentType = res.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) return null
  return res.json()
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Fetches a list of all artworks.
 * Returns a simplified list suitable for grid/list views.
 *
 * @param baseUrl - Base URL of the artwork API (e.g., from VITE_DATA_CONNECT_URL)
 * @returns Array of artwork list items with id, slug, title, and heroImageUrl
 * @throws Error if the API request fails or returns invalid data
 */
export async function listArtworks(
  baseUrl: string
): Promise<ArtworkListItem[]> {
  const url = withTrailingSlash(baseUrl) + ENDPOINTS.ARTWORKS
  const payload = await getJson(url)
  if (!Array.isArray(payload)) {
    throw new Error(`Invalid response: expected array, got ${typeof payload}`)
  }
  return payload.map(normalizeListItem)
}

/**
 * Fetches a single artwork by slug with all associated images.
 *
 * @param baseUrl - Base URL of the artwork API
 * @param slug - URL-friendly identifier for the artwork
 * @returns Artwork object with full details and images, or null if not found
 * @throws Error if the API request fails
 */
export async function getArtworkWithImages(
  baseUrl: string,
  slug: string
): Promise<Artwork | null> {
  if (!slug) return null
  const url = withTrailingSlash(baseUrl) + ENDPOINTS.artworkBySlug(slug)
  const payload = await getJson(url)
  if (!payload) return null
  return normalizeArtwork(payload)
}

/**
 * Input type for updating an artwork.
 * All fields are optional - only provided fields will be updated.
 */
export interface ArtworkUpdateInput {
  title?: string
  description?: string
  clay?: string
  cone?: string | number
  isMicrowaveSafe?: boolean
  isPublished?: boolean
}

/**
 * Updates an artwork by slug.
 *
 * @param baseUrl - Base URL of the artwork API
 * @param slug - URL-friendly identifier for the artwork to update
 * @param updates - Partial artwork data to update
 * @returns Updated artwork object with full details
 * @throws Error if slug is missing, updates are invalid, or API request fails
 */
export async function updateArtwork(
  baseUrl: string,
  slug: string,
  updates: ArtworkUpdateInput
): Promise<Artwork> {
  if (!slug) throw new Error('slug is required')
  if (!updates || typeof updates !== 'object') {
    throw new Error('updates payload is required and must be an object')
  }
  const url = withTrailingSlash(baseUrl) + ENDPOINTS.artworkBySlug(slug)
  const payload = await sendJson(url, 'PATCH', updates)
  return normalizeArtwork(payload)
}

/**
 * Deletes an artwork by slug.
 *
 * @param baseUrl - Base URL of the artwork API
 * @param slug - URL-friendly identifier for the artwork to delete
 * @throws Error if slug is missing or API request fails
 */
export async function deleteArtwork(
  baseUrl: string,
  slug: string
): Promise<void> {
  if (!slug) throw new Error('slug is required')
  const url = withTrailingSlash(baseUrl) + ENDPOINTS.artworkBySlug(slug)
  await sendJson(url, 'DELETE')
}

// ============================================================================
// Legacy Exports (for backward compatibility)
// ============================================================================

/**
 * @deprecated Use `listArtworks` instead. This export will be removed in a future version.
 */
export const sb_listArtworks = listArtworks

/**
 * @deprecated Use `getArtworkWithImages` instead. This export will be removed in a future version.
 */
export const sb_getArtworkWithImages = getArtworkWithImages

/**
 * @deprecated Use `updateArtwork` instead. This export will be removed in a future version.
 */
export const sb_updateArtwork = updateArtwork

/**
 * @deprecated Use `deleteArtwork` instead. This export will be removed in a future version.
 */
export const sb_deleteArtwork = deleteArtwork

