/**
 * S3 Upload Service for DigitalOcean Spaces
 *
 * Handles image uploads to DO Spaces via presigned URLs.
 * In development, uses mock mode by default (returns blob URLs).
 *
 * @example
 * ```ts
 * const cdnUrl = await uploadImage(file)
 * Returns: https://pots.nyc3.cdn.digitaloceanspaces.com/artworks/...
 * Or in dev mock mode: blob:http://localhost:5173/...
 * ```
 */

import { supabase } from '../supabase/client'

// ============================================================================
// Types
// ============================================================================

interface PresignResponse {
  uploadUrl: string
  cdnUrl: string
  key: string
}

// Allowed folder prefixes for uploads (must match edge function)
export type AllowedFolder = 'artworks' | 'blog'

interface UploadResult {
  cdnUrl: string
  key: string
}

// ============================================================================
// Configuration
// ============================================================================

const EDGE_FUNCTION_NAME = 'presign-upload'

/**
 * Check if we should use mock mode.
 * Mock mode is enabled in development unless VITE_USE_REAL_UPLOAD is set.
 */
function shouldUseMockMode(): boolean {
  return import.meta.env.DEV && import.meta.env.VITE_USE_REAL_UPLOAD !== 'true'
}

// ============================================================================
// Mock Implementation (Development Only)
// ============================================================================

/**
 * Mock upload that returns a blob URL.
 * Only used in development mode for UI testing.
 */
function mockUpload(file: File): UploadResult {
  console.log('[s3-upload] Mock mode: creating blob URL for', file.name)
  const blobUrl = URL.createObjectURL(file)
  return {
    cdnUrl: blobUrl,
    key: `mock/${Date.now()}-${file.name}`
  }
}

// ============================================================================
// Real Implementation
// ============================================================================

/**
 * Get a presigned upload URL from the edge function.
 */
async function getPresignedUrl(
  filename: string,
  contentType: string,
  folder: AllowedFolder = 'artworks'
): Promise<PresignResponse> {
  const { data, error } = await supabase.functions.invoke(EDGE_FUNCTION_NAME, {
    body: { filename, contentType, folder }
  })

  if (error) {
    console.error('[s3-upload] Failed to get presigned URL:', error)
    throw new Error(`Failed to get upload URL: ${error.message}`)
  }

  if (!data?.uploadUrl || !data?.cdnUrl) {
    throw new Error('Invalid response from presign endpoint')
  }

  return data as PresignResponse
}

/**
 * Upload a file directly to S3 using the presigned URL.
 */
async function uploadToS3(file: File, uploadUrl: string): Promise<void> {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type,
      'x-amz-acl': 'public-read'
    }
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Upload failed: ${response.status} ${response.statusText}${text ? ` - ${text}` : ''}`)
  }
}

/**
 * Real upload implementation using presigned URLs.
 */
async function realUpload(file: File, folder: AllowedFolder = 'artworks'): Promise<UploadResult> {
  // Get presigned URL
  const { uploadUrl, cdnUrl, key } = await getPresignedUrl(file.name, file.type, folder)

  // Upload directly to S3
  await uploadToS3(file, uploadUrl)

  console.log('[s3-upload] Successfully uploaded:', cdnUrl)
  return { cdnUrl, key }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Upload an image file to DigitalOcean Spaces.
 *
 * In development (mock mode), returns a blob URL for UI testing.
 * In production, uploads to DO Spaces and returns the CDN URL.
 *
 * @param file - The image file to upload
 * @param folder - The folder prefix for the upload ('artworks' or 'blog'). Defaults to 'artworks'.
 * @returns The CDN URL of the uploaded image
 * @throws Error if upload fails
 */
export async function uploadImage(file: File, folder: AllowedFolder = 'artworks'): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Only image files are allowed')
  }

  if (shouldUseMockMode()) {
    const result = mockUpload(file)
    return result.cdnUrl
  }

  const result = await realUpload(file, folder)
  return result.cdnUrl
}

/**
 * Upload multiple images in parallel.
 *
 * @param files - Array of image files to upload
 * @param folder - The folder prefix for the uploads ('artworks' or 'blog'). Defaults to 'artworks'.
 * @returns Array of CDN URLs in the same order as input files
 * @throws Error if any upload fails
 */
export async function uploadImages(files: File[], folder: AllowedFolder = 'artworks'): Promise<string[]> {
  const results = await Promise.all(files.map(file => uploadImage(file, folder)))
  return results
}

/**
 * Check if mock mode is currently active.
 * Useful for showing UI indicators in development.
 */
export function isMockMode(): boolean {
  return shouldUseMockMode()
}

// ============================================================================
// Deletion
// ============================================================================

const DELETE_EDGE_FUNCTION_NAME = 'delete-s3-image'

/**
 * Check if a URL is a DigitalOcean Spaces CDN URL.
 */
export function isDoSpacesUrl(url: string): boolean {
  return url.includes('.digitaloceanspaces.com/')
}

/**
 * Extract S3 key from a DO Spaces CDN URL.
 * Example: https://pots.nyc3.cdn.digitaloceanspaces.com/blog/123-image.jpg
 * Returns: blog/123-image.jpg
 */
export function extractKeyFromUrl(imageUrl: string): string | null {
  try {
    const url = new URL(imageUrl)
    const key = url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname
    return key || null
  } catch {
    return null
  }
}

/**
 * Delete an image from DigitalOcean Spaces.
 *
 * @param imageUrl - The CDN URL of the image to delete
 * @throws Error if deletion fails
 */
export async function deleteImage(imageUrl: string): Promise<void> {
  // Skip mock/blob URLs
  if (imageUrl.startsWith('blob:') || imageUrl.startsWith('data:')) {
    console.log('[s3-upload] Skipping deletion of mock URL')
    return
  }

  // Skip non-DO Spaces URLs
  if (!isDoSpacesUrl(imageUrl)) {
    console.log('[s3-upload] Skipping deletion of non-DO Spaces URL:', imageUrl)
    return
  }

  const key = extractKeyFromUrl(imageUrl)
  if (!key) {
    console.warn('[s3-upload] Could not extract key from URL:', imageUrl)
    return
  }

  const { error } = await supabase.functions.invoke(DELETE_EDGE_FUNCTION_NAME, {
    body: { key }
  })

  if (error) {
    console.error('[s3-upload] Failed to delete image:', error)
    throw new Error(`Failed to delete image: ${error.message}`)
  }

  console.log('[s3-upload] Successfully deleted:', key)
}

