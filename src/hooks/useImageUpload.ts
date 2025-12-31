import React, { useCallback, useState } from 'react'

/**
 * Hook for handling drag-and-drop file upload state
 */
// eslint-disable-next-line no-unused-vars
export function useFileDragDrop(onFiles: (files: FileList) => void, disabled = false) {
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      if (!disabled) setIsDragOver(true)
    },
    [disabled]
  )

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      if (!disabled && e.dataTransfer.files.length > 0) {
        onFiles(e.dataTransfer.files)
      }
    },
    [onFiles, disabled]
  )

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        onFiles(e.target.files)
      }
      e.target.value = '' // Reset to allow same file selection
    },
    [onFiles]
  )

  return {
    isDragOver,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileInputChange
  }
}

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

