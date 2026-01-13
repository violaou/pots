import { supabase } from '../../supabase/client'
import type { ArtworkTag } from '../../types'
import { requireAdmin } from './cache'
import type { ArtworkListItem, ArtworkTagInput } from './types'

// ============================================================================
// Artwork Tags
// ============================================================================

/**
 * Get all tags for an artwork by its ID.
 */
export async function getArtworkTags(artworkId: string): Promise<ArtworkTag[]> {
  const { data, error } = await supabase
    .from('artwork_tags')
    .select('*')
    .eq('artwork_id', artworkId)
    .order('tag_name')

  if (error) {
    console.warn('[artwork-service] getArtworkTags failed:', error)
    return []
  }

  return (data || []).map((tag) => ({
    id: tag.id,
    artworkId: tag.artwork_id,
    tagName: tag.tag_name,
    tagValue: tag.tag_value,
    createdAt: tag.created_at
  }))
}

/**
 * Add a tag to an artwork.
 */
export async function addArtworkTag(
  artworkId: string,
  input: ArtworkTagInput
): Promise<ArtworkTag> {
  await requireAdmin()

  const { data, error } = await supabase
    .from('artwork_tags')
    .insert({
      artwork_id: artworkId,
      tag_name: input.tagName,
      tag_value: input.tagValue
    })
    .select()
    .single()

  if (error) {
    console.error('[artwork-service] addArtworkTag failed:', error)
    throw new Error(`Failed to add tag: ${error.message}`)
  }

  return {
    id: data.id,
    artworkId: data.artwork_id,
    tagName: data.tag_name,
    tagValue: data.tag_value,
    createdAt: data.created_at
  }
}

/**
 * Remove a tag from an artwork.
 */
export async function removeArtworkTag(tagId: string): Promise<void> {
  await requireAdmin()

  const { error } = await supabase
    .from('artwork_tags')
    .delete()
    .eq('id', tagId)

  if (error) {
    console.error('[artwork-service] removeArtworkTag failed:', error)
    throw new Error(`Failed to remove tag: ${error.message}`)
  }
}

/**
 * Set all tags for an artwork (replaces existing tags).
 */
export async function setArtworkTags(
  artworkId: string,
  tags: ArtworkTagInput[]
): Promise<ArtworkTag[]> {
  await requireAdmin()

  // Delete existing tags
  const { error: deleteError } = await supabase
    .from('artwork_tags')
    .delete()
    .eq('artwork_id', artworkId)

  if (deleteError) {
    console.error('[artwork-service] setArtworkTags delete failed:', deleteError)
    throw new Error(`Failed to update tags: ${deleteError.message}`)
  }

  if (tags.length === 0) return []

  // Insert new tags
  const inserts = tags.map((tag) => ({
    artwork_id: artworkId,
    tag_name: tag.tagName,
    tag_value: tag.tagValue
  }))

  const { data, error: insertError } = await supabase
    .from('artwork_tags')
    .insert(inserts)
    .select()

  if (insertError) {
    console.error('[artwork-service] setArtworkTags insert failed:', insertError)
    throw new Error(`Failed to update tags: ${insertError.message}`)
  }

  return (data || []).map((tag) => ({
    id: tag.id,
    artworkId: tag.artwork_id,
    tagName: tag.tag_name,
    tagValue: tag.tag_value,
    createdAt: tag.created_at
  }))
}

/**
 * List artworks filtered by a specific tag name and optional value.
 * Useful for gallery filtering (e.g., "show all for_sale artworks").
 */
export async function listArtworksByTag(
  tagName: string,
  tagValue?: string
): Promise<ArtworkListItem[]> {
  let query = supabase
    .from('artwork_tags')
    .select(`
      artwork_id,
      artworks!inner (
        id,
        slug,
        title,
        is_published,
        sort_order,
        artwork_images!inner (
          image_url,
          is_hero
        )
      )
    `)
    .eq('tag_name', tagName)
    .eq('artworks.is_published', true)
    .eq('artworks.artwork_images.is_hero', true)

  if (tagValue) {
    query = query.eq('tag_value', tagValue)
  }

  const { data, error } = await query

  if (error) {
    console.warn('[artwork-service] listArtworksByTag failed:', error)
    return []
  }

  return (data || []).map((item) => {
    const artwork = item.artworks as unknown as {
      id: string
      slug: string
      title: string
      is_published: boolean
      sort_order: number
      artwork_images: { image_url: string; is_hero: boolean }[]
    }
    return {
      id: artwork.id,
      slug: artwork.slug,
      title: artwork.title,
      heroImageUrl: artwork.artwork_images[0]?.image_url || '',
      isPublished: artwork.is_published
    }
  })
}

/**
 * Get all unique tag names used across artworks.
 * Useful for building filter UI.
 */
export async function getDistinctTagNames(): Promise<string[]> {
  const { data, error } = await supabase
    .from('artwork_tags')
    .select('tag_name')

  if (error) {
    console.warn('[artwork-service] getDistinctTagNames failed:', error)
    return []
  }

  const uniqueNames = [...new Set((data || []).map((t) => t.tag_name))]
  return uniqueNames.sort()
}

/**
 * Get all unique values for a specific tag name.
 * Useful for building filter dropdowns.
 */
export async function getTagValues(tagName: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('artwork_tags')
    .select('tag_value')
    .eq('tag_name', tagName)

  if (error) {
    console.warn('[artwork-service] getTagValues failed:', error)
    return []
  }

  const uniqueValues = [...new Set((data || []).map((t) => t.tag_value))]
  return uniqueValues.sort()
}
