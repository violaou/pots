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
  contentType: string
): Promise<PresignResponse> {
  const { data, error } = await supabase.functions.invoke(EDGE_FUNCTION_NAME, {
    body: { filename, contentType }
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
async function realUpload(file: File): Promise<UploadResult> {
  // Get presigned URL
  const { uploadUrl, cdnUrl, key } = await getPresignedUrl(file.name, file.type)

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
 * @returns The CDN URL of the uploaded image
 * @throws Error if upload fails
 */
export async function uploadImage(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Only image files are allowed')
  }

  if (shouldUseMockMode()) {
    const result = mockUpload(file)
    return result.cdnUrl
  }

  const result = await realUpload(file)
  return result.cdnUrl
}

/**
 * Upload multiple images in parallel.
 *
 * @param files - Array of image files to upload
 * @returns Array of CDN URLs in the same order as input files
 * @throws Error if any upload fails
 */
export async function uploadImages(files: File[]): Promise<string[]> {
  const results = await Promise.all(files.map(uploadImage))
  return results
}

/**
 * Check if mock mode is currently active.
 * Useful for showing UI indicators in development.
 */
export function isMockMode(): boolean {
  return shouldUseMockMode()
}

