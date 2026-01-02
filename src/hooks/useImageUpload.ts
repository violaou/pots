/**
 * Process files into image previews
 */
export function processImageFiles<T>(
  files: FileList,
  existingCount: number,
  // eslint-disable-next-line no-unused-vars
  createPreview: (file: File, id: string, index: number, isFirstHero: boolean) => T
): T[] {
  const newImages: T[] = []

  Array.from(files).forEach((file, index) => {
    if (!file.type.startsWith('image/')) return

    const id = `preview-${Date.now()}-${index}`
    const isFirstHero = existingCount === 0 && index === 0
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

