import { getWriteClient,supabase } from '../../supabase/client'
import { deleteImage as deleteDoSpacesImage, isDoSpacesUrl } from '../s3-upload'
import { clearDetailCache, clearListCache,requireAdmin } from './cache'
import type { AddImageInput, ArtworkImage, ImageChanges,UpdateImageInput } from './types'

/**
 * Update multiple images for an artwork (sort order, alt text, hero status).
 * Handles sort_order updates in two passes to avoid unique constraint violations.
 */
async function updateArtworkImages(
  artworkId: string,
  updates: UpdateImageInput[]
): Promise<void> {
  // Separate sort order updates from other updates
  const sortOrderUpdates = updates.filter((u) => u.sortOrder !== undefined)
  const otherUpdates = updates.map((u) => {
    // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
    const { sortOrder: _, ...rest } = u
    return rest
  })

  // First pass: set sort_order to negative values to avoid conflicts
  if (sortOrderUpdates.length > 0) {
    for (const update of sortOrderUpdates) {
      const { error } = await getWriteClient()
        .from('artwork_images')
        .update({ sort_order: -(update.sortOrder! + 1000) })
        .eq('id', update.id)
        .eq('artwork_id', artworkId)

      if (error) {
        console.error('[artwork-service] Failed to update image sort order (pass 1):', error)
        throw new Error(`Failed to update image: ${error.message}`)
      }
    }

    // Second pass: set final sort_order values
    for (const update of sortOrderUpdates) {
      const { error } = await getWriteClient()
        .from('artwork_images')
        .update({ sort_order: update.sortOrder })
        .eq('id', update.id)
        .eq('artwork_id', artworkId)

      if (error) {
        console.error('[artwork-service] Failed to update image sort order (pass 2):', error)
        throw new Error(`Failed to update image: ${error.message}`)
      }
    }
  }

  // Update other fields (alt, isHero)
  const heroFalseUpdates = otherUpdates.filter((u) => u.isHero === false)
  const heroTrueUpdates = otherUpdates.filter((u) => u.isHero === true)
  const nonHeroUpdates = otherUpdates.filter((u) => u.isHero === undefined)

  // Order: remove hero status first, then non-hero updates, then set new hero
  const orderedUpdates = [...heroFalseUpdates, ...nonHeroUpdates, ...heroTrueUpdates]

  for (const update of orderedUpdates) {
    const payload: Record<string, unknown> = {}
    if (update.alt !== undefined) payload.alt = update.alt
    if (update.isHero !== undefined) payload.is_hero = update.isHero

    if (Object.keys(payload).length > 0) {
      const { error } = await getWriteClient()
        .from('artwork_images')
        .update(payload)
        .eq('id', update.id)
        .eq('artwork_id', artworkId)

      if (error) {
        console.error('[artwork-service] Failed to update image:', error)
        throw new Error(`Failed to update image: ${error.message}`)
      }
    }
  }
  console.log('[artwork-service] Updated images for artwork:', artworkId)
}

/**
 * Delete an image from an artwork.
 * Also cleans up the image from DO Spaces storage.
 */
async function deleteArtworkImage(
  artworkId: string,
  imageId: string
): Promise<void> {
  // First get the image URL for S3 cleanup
  const { data: imageData } = await supabase
    .from('artwork_images')
    .select('image_url')
    .eq('id', imageId)
    .eq('artwork_id', artworkId)
    .single()

  const { error } = await getWriteClient()
    .from('artwork_images')
    .delete()
    .eq('id', imageId)
    .eq('artwork_id', artworkId)

  if (error) {
    console.error('[artwork-service] Failed to delete image:', error)
    throw new Error(`Failed to delete image: ${error.message}`)
  }

  // Clean up from S3 storage
  if (imageData?.image_url && isDoSpacesUrl(imageData.image_url)) {
    try {
      await deleteDoSpacesImage(imageData.image_url)
    } catch (e) {
      // Non-fatal: DB record is deleted, just log S3 cleanup failure
      console.warn('[artwork-service] Failed to delete image from S3:', e)
    }
  }

  console.log('[artwork-service] Deleted image:', imageId)
}

/**
 * Add a new image to an existing artwork.
 */
async function addArtworkImage(
  artworkId: string,
  image: AddImageInput
): Promise<ArtworkImage> {
  const { data, error } = await supabase
    .from('artwork_images')
    .insert({
      artwork_id: artworkId,
      image_url: image.cdnUrl,
      alt: image.alt || '',
      sort_order: image.sortOrder,
      is_hero: image.isHero
    })
    .select()
    .single()

  if (error) {
    console.error('[artwork-service] Failed to add image:', error)
    throw new Error(`Failed to add image: ${error.message}`)
  }

  console.log('[artwork-service] Added image to artwork:', artworkId)

  return {
    id: data.id,
    artworkId: data.artwork_id,
    imageUrl: data.image_url,
    alt: data.alt,
    sortOrder: data.sort_order,
    isHero: data.is_hero,
    createdAt: data.created_at
  }
}

/**
 * Batch save all image changes for an artwork.
 * Handles updates, deletions, and new additions in one call.
 */
export async function saveArtworkImages(
  artworkId: string,
  changes: ImageChanges
): Promise<void> {
  await requireAdmin()

  // Process deletions first
  for (const imageId of changes.deletions) {
    await deleteArtworkImage(artworkId, imageId)
  }

  // Process updates
  if (changes.updates.length > 0) {
    await updateArtworkImages(artworkId, changes.updates)
  }

  // Process additions
  for (const image of changes.additions) {
    await addArtworkImage(artworkId, image)
  }

  // Invalidate caches
  clearDetailCache()
  clearListCache()

  console.log('[artwork-service] Saved all image changes for artwork:', artworkId)
}

