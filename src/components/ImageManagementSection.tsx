import { useCallback, useEffect, useState } from 'react'
import { Upload, X } from 'lucide-react'

import {
  isVideoFile,
  processImageFiles,
  setHeroInArray,
  updateAltInArray
} from '../hooks/useImageUpload'
import type { ArtworkImage } from '../types'
import { styles } from './ImageManagementSection.styles'

/**
 * Represents an image in the management UI.
 * Can be either an existing image (from DB) or a new upload.
 */
export interface ManagedImage {
  id: string
  imageUrl?: string // For existing images
  file?: File // For new uploads
  preview: string
  alt: string
  isHero: boolean
  sortOrder: number
  isNew: boolean
  markedForDeletion?: boolean
}

interface ImageManagementSectionProps {
  images: ManagedImage[]
  onImagesChange: (images: ManagedImage[]) => void
  error?: string
  disabled?: boolean
}

/**
 * Convert existing ArtworkImages to ManagedImages (for edit mode)
 */
export function artworkImagesToManaged(images: ArtworkImage[]): ManagedImage[] {
  return images
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((img) => ({
      id: img.id,
      imageUrl: img.imageUrl,
      preview: img.imageUrl,
      alt: img.alt || '',
      isHero: img.isHero,
      sortOrder: img.sortOrder,
      isNew: false,
      markedForDeletion: false
    }))
}

/**
 * Simple image preview type for add mode (backwards compatibility)
 */
export interface ImagePreview {
  id: string
  file: File
  preview: string
  alt: string
  isHero: boolean
}

/**
 * Convert simple ImagePreview array to ManagedImages (for add mode)
 */
export function imagePreviewsToManaged(images: ImagePreview[]): ManagedImage[] {
  return images.map((img, index) => ({
    id: img.id,
    file: img.file,
    preview: img.preview,
    alt: img.alt,
    isHero: img.isHero,
    sortOrder: index,
    isNew: true
  }))
}

/**
 * Convert ManagedImages back to simple ImagePreview array (for add mode submission)
 */
export function managedToImagePreviews(images: ManagedImage[]): ImagePreview[] {
  return images
    .filter((img) => !img.markedForDeletion && img.file)
    .map((img) => ({
      id: img.id,
      file: img.file!,
      preview: img.preview,
      alt: img.alt,
      isHero: img.isHero
    }))
}

/**
 * Renders a media thumbnail (image or video)
 */
function MediaThumbnail({ image }: { image: ManagedImage }) {
  const isVideo = image.file
    ? isVideoFile(image.file)
    : isVideoFile(image.preview)

  if (isVideo) {
    return (
      <video
        src={image.preview}
        className={styles.imageThumb}
        loop
        muted
        autoPlay
        playsInline
      />
    )
  }

  return (
    <img
      src={image.preview}
      alt={image.alt || 'Image preview'}
      className={styles.imageThumb}
    />
  )
}

/**
 * Renders status badges for an image card
 */
function ImageBadges({ image }: { image: ManagedImage }) {
  if (image.markedForDeletion)
    return (
      <span className={`${styles.badge} ${styles.badgeDeleted}`}>Deleted</span>
    )

  return (
    <>
      {image.isHero && (
        <span className={`${styles.badge} ${styles.badgeHero}`}>Hero</span>
      )}
      {image.isNew && (
        <span
          className={`${styles.badge} ${image.isHero ? styles.badgeNew : styles.badgeNewOnly}`}
        >
          New
        </span>
      )}
    </>
  )
}

export default function ImageManagementSection({
  images,
  onImagesChange,
  error,
  disabled = false
}: ImageManagementSectionProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [isPageDragOver, setIsPageDragOver] = useState(false)

  const activeImages = images.filter((img) => !img.markedForDeletion)

  const handleFiles = useCallback(
    (files: FileList) => {
      if (disabled) return
      const currentMaxSort = Math.max(0, ...images.map((img) => img.sortOrder))

      const newImages = processImageFiles<ManagedImage>(
        files,
        activeImages.length,
        (file, id, index, isFirstHero) => ({
          id,
          file,
          preview: URL.createObjectURL(file),
          alt: '',
          isHero: isFirstHero,
          sortOrder: currentMaxSort + index + 1,
          isNew: true
        })
      )
      onImagesChange([...images, ...newImages])
    },
    [images, activeImages.length, onImagesChange, disabled]
  )

  // Full-page drag and drop
  useEffect(() => {
    if (disabled) return

    let dragCounter = 0

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault()
      dragCounter++
      if (e.dataTransfer?.types.includes('Files')) {
        setIsPageDragOver(true)
      }
    }

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault()
      dragCounter--
      if (dragCounter === 0) {
        setIsPageDragOver(false)
      }
    }

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault()
    }

    const handleDrop = (e: DragEvent) => {
      e.preventDefault()
      dragCounter = 0
      setIsPageDragOver(false)
      if (e.dataTransfer?.files.length) {
        handleFiles(e.dataTransfer.files)
      }
    }

    document.addEventListener('dragenter', handleDragEnter)
    document.addEventListener('dragleave', handleDragLeave)
    document.addEventListener('dragover', handleDragOver)
    document.addEventListener('drop', handleDrop)

    return () => {
      document.removeEventListener('dragenter', handleDragEnter)
      document.removeEventListener('dragleave', handleDragLeave)
      document.removeEventListener('dragover', handleDragOver)
      document.removeEventListener('drop', handleDrop)
    }
  }, [disabled, handleFiles])

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFiles(e.target.files)
      }
      e.target.value = ''
    },
    [handleFiles]
  )

  const setHeroImage = useCallback(
    (imageId: string) => {
      if (disabled) return
      onImagesChange(setHeroInArray(images, imageId))
    },
    [images, onImagesChange, disabled]
  )

  const toggleDelete = useCallback(
    (imageId: string) => {
      if (disabled) return
      const image = images.find((img) => img.id === imageId)
      if (!image) return

      if (image.isNew) {
        const newImages = images.filter((img) => img.id !== imageId)
        if (image.isHero && newImages.length > 0) {
          // Find first active non-video image to be hero
          const firstActiveImage = newImages.find(
            (img) =>
              !img.markedForDeletion && !isVideoFile(img.file ?? img.preview)
          )
          if (firstActiveImage) firstActiveImage.isHero = true
        }
        onImagesChange(newImages)
      } else {
        onImagesChange(
          images.map((img) =>
            img.id !== imageId
              ? img
              : { ...img, markedForDeletion: !img.markedForDeletion }
          )
        )
      }
    },
    [images, onImagesChange, disabled]
  )

  const restoreImage = useCallback(
    (imageId: string) => {
      if (disabled) return
      onImagesChange(
        images.map((img) =>
          img.id === imageId ? { ...img, markedForDeletion: false } : img
        )
      )
    },
    [images, onImagesChange, disabled]
  )

  const updateAlt = useCallback(
    (imageId: string, alt: string) => {
      if (disabled) return
      onImagesChange(updateAltInArray(images, imageId, alt))
    },
    [images, onImagesChange, disabled]
  )

  const handleDragStart = useCallback(
    (e: React.DragEvent, index: number) => {
      if (disabled) return
      setDraggedIndex(index)
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData('text/plain', String(index))
    },
    [disabled]
  )

  const handleDragOverCard = useCallback(
    (e: React.DragEvent, index: number) => {
      e.preventDefault()
      if (draggedIndex === null || draggedIndex === index || disabled) return

      const newImages = [...images]
      const [draggedItem] = newImages.splice(draggedIndex, 1)
      newImages.splice(index, 0, draggedItem)
      // Create new objects with updated sortOrder to avoid mutating originals
      const updatedImages = newImages.map((img, i) => ({
        ...img,
        sortOrder: i
      }))

      setDraggedIndex(index)
      onImagesChange(updatedImages)
    },
    [draggedIndex, images, onImagesChange, disabled]
  )

  const handleDragEnd = useCallback(() => setDraggedIndex(null), [])

  const sortedImages = [...images].sort((a, b) => a.sortOrder - b.sortOrder)

  const uploadAreaClass = `${styles.uploadArea} ${disabled ? styles.uploadAreaDisabled : ''}`

  const openFileDialog = () => {
    if (!disabled) document.getElementById('image-management-upload')?.click()
  }

  return (
    <div className={styles.container}>
      {isPageDragOver && (
        <div className={styles.dropOverlay}>
          <div className={styles.dropOverlayContent}>
            <Upload className={styles.dropOverlayIcon} />
            <p className={styles.dropOverlayText}>Drop images here</p>
          </div>
        </div>
      )}

      <div className={uploadAreaClass} onClick={openFileDialog}>
        <div className={styles.uploadText}>
          <p>Drop images anywhere, or click to select</p>
          <p className={styles.uploadHint}>
            {activeImages.length} image{activeImages.length !== 1 ? 's' : ''} •
            Drag cards to reorder
          </p>
        </div>
        <input
          id="image-management-upload"
          type="file"
          multiple
          accept="image/*,video/mp4,video/x-m4v,.mp4,.m4v"
          onChange={handleFileInputChange}
          className={styles.fileInput}
          disabled={disabled}
        />
      </div>

      {sortedImages.length > 0 && (
        <div className={styles.imageGrid}>
          {sortedImages.map((image, index) => {
            const isDeleted = image.markedForDeletion
            const isDragging = draggedIndex === index
            const cardClass = `${styles.imageCard} ${isDeleted ? styles.imageCardDeleted : ''} ${isDragging ? styles.imageCardDragging : ''}`

            return (
              <div
                key={image.id}
                className={cardClass}
                draggable={!disabled && !isDeleted}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOverCard(e, index)}
                onDragEnd={handleDragEnd}
              >
                <MediaThumbnail image={image} />

                <ImageBadges image={image} />

                {!isDeleted &&
                  !image.isHero &&
                  !isVideoFile(image.file ?? image.preview) && (
                    <div className={styles.overlay}>
                      <div className={styles.overlayActions}>
                        <button
                          type="button"
                          onClick={() => setHeroImage(image.id)}
                          className={styles.actionButton}
                          disabled={disabled}
                        >
                          Set as Hero
                        </button>
                      </div>
                    </div>
                  )}

                {isDeleted && (
                  <div className={styles.overlayDeleted}>
                    <button
                      type="button"
                      onClick={() => restoreImage(image.id)}
                      className={styles.actionButton}
                      disabled={disabled}
                    >
                      Restore
                    </button>
                  </div>
                )}

                {!isDeleted && (
                  <>
                    <button
                      type="button"
                      onClick={() => toggleDelete(image.id)}
                      className={styles.removeButton}
                      title={image.isNew ? 'Remove' : 'Mark for deletion'}
                      disabled={disabled}
                    >
                      <X size={20} aria-label="Remove image" />
                    </button>

                    <div className={styles.altInput}>
                      <input
                        type="text"
                        placeholder="Alt text..."
                        value={image.alt}
                        onChange={(e) => updateAlt(image.id, e.target.value)}
                        className={styles.altInputField}
                        onClick={(e) => e.stopPropagation()}
                        disabled={disabled}
                      />
                    </div>

                    <div className={styles.dragHandle} title="Drag to reorder">
                      ⋮⋮
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}

      {error && <p className={styles.error}>{error}</p>}
    </div>
  )
}
