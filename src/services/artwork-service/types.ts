import type { Artwork, ArtworkImage, ArtworkListItem } from '../../types'

/**
 * Input for creating a new artwork with images.
 */
export interface CreateArtworkInput {
  title: string
  description?: string
  creationYear?: string
  isPublished?: boolean
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
  creationYear?: number | string
  isPublished?: boolean
  tags?: string[]
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

/**
 * Input for creating/updating artwork tags.
 */
export interface ArtworkTagInput {
  tagName: string
  tagValue: string
}

// Re-export domain types for convenience
export type { Artwork, ArtworkImage, ArtworkListItem, ArtworkTag }

