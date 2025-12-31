import { useCallback, useState } from 'react'
import { X } from 'lucide-react'

import type { ArtworkImage } from '../types'
import { styles } from './ImageManagementSection.styles'
import {
  useFileDragDrop,
  processImageFiles,
  setHeroInArray,
  updateAltInArray
} from '../hooks/useImageUpload'

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
 * Convert existing ArtworkImages to ManagedImages
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

export default function ImageManagementSection({
  images,
  onImagesChange,
  error,
  disabled = false
}: ImageManagementSectionProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

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

  const {
    isDragOver,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileInputChange
  } = useFileDragDrop(handleFiles, disabled)

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
          const firstActive = newImages.find((img) => !img.markedForDeletion)
          if (firstActive) firstActive.isHero = true
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
      newImages.forEach((img, i) => {
        img.sortOrder = i
      })

      setDraggedIndex(index)
      onImagesChange(newImages)
    },
    [draggedIndex, images, onImagesChange, disabled]
  )

  const handleDragEnd = useCallback(() => setDraggedIndex(null), [])

  const sortedImages = [...images].sort((a, b) => a.sortOrder - b.sortOrder)

  return (
    <div className={styles.container}>
      <div
        className={[
          styles.uploadArea,
          isDragOver && styles.uploadAreaActive,
          disabled && styles.uploadAreaDisabled
        ]
          .filter(Boolean)
          .join(' ')}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() =>
          !disabled &&
          document.getElementById('image-management-upload')?.click()
        }
      >
        <div className={styles.uploadText}>
          <p>Drag and drop images here, or click to select</p>
          <p className="text-xs text-gray-400 mt-1">
            {activeImages.length} image{activeImages.length !== 1 ? 's' : ''} •
            Drag cards to reorder
          </p>
        </div>
        <input
          id="image-management-upload"
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileInputChange}
          className={styles.fileInput}
          disabled={disabled}
        />
      </div>

      {sortedImages.length > 0 && (
        <div className={styles.imageGrid}>
          {sortedImages.map((image, index) => (
            <div
              key={image.id}
              className={[
                styles.imageCard,
                image.markedForDeletion && styles.imageCardDeleted,
                draggedIndex === index && styles.imageCardDragging
              ]
                .filter(Boolean)
                .join(' ')}
              draggable={!disabled && !image.markedForDeletion}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOverCard(e, index)}
              onDragEnd={handleDragEnd}
            >
              <img
                src={image.preview}
                alt={image.alt || 'Image preview'}
                className={styles.imageThumb}
              />

              {image.markedForDeletion ? (
                <div className={styles.deletedBadge}>Deleted</div>
              ) : (
                <>
                  {image.isHero && <div className={styles.heroBadge}>Hero</div>}
                  {image.isNew && (
                    <div
                      className={
                        image.isHero
                          ? styles.newBadge
                          : `${styles.heroBadge} bg-green-600`
                      }
                    >
                      New
                    </div>
                  )}
                </>
              )}

              {!image.markedForDeletion && !image.isHero && (
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

              {image.markedForDeletion && (
                <div
                  className={styles.overlay}
                  style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
                >
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

              {!image.markedForDeletion && (
                <button
                  type="button"
                  onClick={() => toggleDelete(image.id)}
                  className={styles.removeButton}
                  title={image.isNew ? 'Remove' : 'Mark for deletion'}
                  disabled={disabled}
                >
                  <X size={20} aria-label="Remove image" />
                </button>
              )}

              {!image.markedForDeletion && (
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
              )}

              {!image.markedForDeletion && (
                <div className={styles.dragHandle} title="Drag to reorder">
                  ⋮⋮
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {error && <p className={styles.error}>{error}</p>}
    </div>
  )
}
