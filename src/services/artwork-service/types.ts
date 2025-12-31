import type { Artwork, ArtworkImage, ArtworkListItem } from '../../types'

/**
 * Input for creating a new artwork with images.
 */
export interface CreateArtworkInput {
  title: string
  description?: string
  materials?: string
  clay?: string
  cone?: string
  isMicrowaveSafe: boolean
  altText?: string
  images: {
    cdnUrl: string
    alt?: string
    isHero: boolean
  }[]
}

/**
 * Input for updating an existing artwork.
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
 * Input for updating an existing artwork image.
 */
export interface UpdateImageInput {
  id: string
  alt?: string
  sortOrder?: number
  isHero?: boolean
}

/**
 * Input for adding a new image to an existing artwork.
 */
export interface AddImageInput {
  cdnUrl: string
  alt?: string
  sortOrder: number
  isHero: boolean
}

/**
 * Batch changes for artwork images.
 */
export interface ImageChanges {
  updates: UpdateImageInput[]
  deletions: string[]
  additions: AddImageInput[]
}

// Re-export domain types for convenience
export type { Artwork, ArtworkImage, ArtworkListItem }

