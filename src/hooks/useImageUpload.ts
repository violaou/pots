/**
 * Check if a file is an allowed media type (image or video).
 */
export function isAllowedMediaFile(file: File): boolean {
  return file.type.startsWith('image/') ||
         file.type === 'video/mp4' ||
         file.type === 'video/x-m4v'
}

/**
 * Check if a file or URL is a video.
 */
export function isVideoFile(fileOrUrl: File | string): boolean {
  if (typeof fileOrUrl === 'string') {
    const ext = fileOrUrl.split('.').pop()?.toLowerCase()
    return ext === 'mp4' || ext === 'm4v'
  }
  return fileOrUrl.type.startsWith('video/')
}

/**
 * Process files into media previews (images and videos)
 * Note: Videos cannot be hero images, so the first non-video image will be hero
 */
export function processImageFiles<T>(
  files: FileList,
  existingCount: number,
  // eslint-disable-next-line no-unused-vars
  createPreview: (file: File, id: string, index: number, isFirstHero: boolean) => T
): T[] {
  const newImages: T[] = []
  let heroAssigned = existingCount > 0 // Don't assign hero if there are existing images

  Array.from(files).forEach((file, index) => {
    if (!isAllowedMediaFile(file)) return

    const id = `preview-${Date.now()}-${index}`
    // Only assign hero to first non-video image when no existing images
    const isFirstHero = !heroAssigned && !isVideoFile(file)
    if (isFirstHero) heroAssigned = true

    newImages.push(createPreview(file, id, index, isFirstHero))
  })

  return newImages
}

/**
 * Set hero image in an array (only one can be hero)
 */
export function setHeroInArray<T extends { id: string; isHero: boolean }>(
  images: T[],
  heroId: string
): T[] {
  return images.map((img) => ({
    ...img,
    isHero: img.id === heroId
  }))
}

/**
 * Update alt text for an image in array
 */
export function updateAltInArray<T extends { id: string; alt: string }>(
  images: T[],
  imageId: string,
  alt: string
): T[] {
  return images.map((img) => (img.id === imageId ? { ...img, alt } : img))
}

