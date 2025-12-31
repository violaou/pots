import { useCallback, useState } from 'react'
import type { ArtworkImage } from '../types'
import { X } from 'lucide-react'

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

const STYLES = {
  container: 'space-y-4',

  // Upload area
  uploadArea:
    'border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-gray-400 dark:hover:border-gray-500 transition-colors cursor-pointer',
  uploadAreaActive: 'border-blue-500 bg-blue-50 dark:bg-blue-900/20',
  uploadAreaDisabled: 'opacity-50 cursor-not-allowed',
  uploadText: 'text-gray-600 dark:text-gray-400 text-sm',
  uploadButton:
    'mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm',
  fileInput: 'hidden',

  // Image grid
  imageGrid: 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4',

  // Image card
  imageCard:
    'relative group border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-neutral-800',
  imageCardDeleted: 'opacity-40 border-red-300 dark:border-red-800',
  imageCardDragging: 'ring-2 ring-blue-500 shadow-lg',
  imageThumb: 'w-full h-32 object-cover',

  // Badges
  heroBadge:
    'absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded font-medium',
  newBadge:
    'absolute top-2 left-12 bg-green-600 text-white text-xs px-2 py-1 rounded font-medium',
  deletedBadge:
    'absolute top-2 left-2 bg-red-600 text-white text-xs px-2 py-1 rounded font-medium',

  // Overlay actions
  overlay:
    'absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center',
  overlayActions:
    'opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col gap-2',
  actionButton:
    'px-3 py-1 bg-white dark:bg-neutral-800 text-gray-800 dark:text-gray-200 rounded text-xs font-medium hover:bg-gray-100 dark:hover:bg-neutral-700 shadow',

  // Remove button
  removeButton:
    'absolute top-2 right-2 bg-red-600 text-white w-6 h-6 rounded-full hover:bg-red-700 text-sm font-bold flex items-center justify-center',

  // Alt text input
  altInput: 'absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 p-2',
  altInputField:
    'w-full bg-transparent text-white placeholder-gray-400 text-xs border-none focus:outline-none focus:ring-0',

  // Drag handle
  dragHandle:
    'absolute bottom-2 right-2 text-white bg-black bg-opacity-50 rounded p-1 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity',

  // Error
  error: 'text-red-600 dark:text-red-400 text-sm mt-2'
} as const

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

/**
 *
 * @param images - The images to manage
 * @param onImagesChange - The function to call when the images change
 * @param error - The error to display
 * @param disabled - Whether the section is disabled
 * @returns
 */
export default function ImageManagementSection({
  images,
  onImagesChange,
  error,
  disabled = false
}: ImageManagementSectionProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  // Filter out deleted images for display count
  const activeImages = images.filter((img) => !img.markedForDeletion)

  // Handle file selection
  const handleFileSelect = useCallback(
    (files: FileList | null) => {
      if (!files || disabled) return

      const newImages: ManagedImage[] = []
      const currentMaxSort = Math.max(0, ...images.map((img) => img.sortOrder))

      Array.from(files).forEach((file, index) => {
        if (file.type.startsWith('image/')) {
          const id = `new-${Date.now()}-${index}`
          const preview = URL.createObjectURL(file)
          newImages.push({
            id,
            file,
            preview,
            alt: '',
            isHero: activeImages.length === 0 && index === 0,
            sortOrder: currentMaxSort + index + 1,
            isNew: true
          })
        }
      })

      onImagesChange([...images, ...newImages])
    },
    [images, activeImages.length, onImagesChange, disabled]
  )

  // Drag and drop for file upload
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
      if (!disabled) handleFileSelect(e.dataTransfer.files)
    },
    [handleFileSelect, disabled]
  )

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFileSelect(e.target.files)
      e.target.value = '' // Reset to allow same file selection
    },
    [handleFileSelect]
  )

  // Set hero image
  const setHeroImage = useCallback(
    (imageId: string) => {
      if (disabled) return
      onImagesChange(
        images.map((img) => ({
          ...img,
          isHero: img.id === imageId
        }))
      )
    },
    [images, onImagesChange, disabled]
  )

  // Toggle deletion mark (for existing images) or remove (for new images)
  const toggleDelete = useCallback(
    (imageId: string) => {
      if (disabled) return
      const image = images.find((img) => img.id === imageId)
      if (!image) return

      if (image.isNew) {
        // Actually remove new uploads
        const newImages = images.filter((img) => img.id !== imageId)
        // Reassign hero if needed
        if (image.isHero && newImages.length > 0) {
          const firstActive = newImages.find((img) => !img.markedForDeletion)
          if (firstActive) firstActive.isHero = true
        }
        onImagesChange(newImages)
      } else {
        // Toggle deletion mark for existing images
        onImagesChange(
          images.map((img) => {
            if (img.id !== imageId) return img
            const newMarked = !img.markedForDeletion
            // If unmarking, keep hero status; if marking and was hero, we'll need to reassign
            return { ...img, markedForDeletion: newMarked }
          })
        )
      }
    },
    [images, onImagesChange, disabled]
  )

  // Restore a deleted image
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

  // Update alt text
  const updateAlt = useCallback(
    (imageId: string, alt: string) => {
      if (disabled) return
      onImagesChange(
        images.map((img) => (img.id === imageId ? { ...img, alt } : img))
      )
    },
    [images, onImagesChange, disabled]
  )

  // Drag reordering handlers
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

      // Reorder images
      const newImages = [...images]
      const [draggedItem] = newImages.splice(draggedIndex, 1)
      newImages.splice(index, 0, draggedItem)

      // Update sort orders
      newImages.forEach((img, i) => {
        img.sortOrder = i
      })

      setDraggedIndex(index)
      onImagesChange(newImages)
    },
    [draggedIndex, images, onImagesChange, disabled]
  )

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null)
  }, [])

  // Sort images by sortOrder for display
  const sortedImages = [...images].sort((a, b) => a.sortOrder - b.sortOrder)

  return (
    <div className={STYLES.container}>
      {/* Upload Area */}
      <div
        className={`${STYLES.uploadArea} ${isDragOver ? STYLES.uploadAreaActive : ''} ${disabled ? STYLES.uploadAreaDisabled : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() =>
          !disabled &&
          document.getElementById('image-management-upload')?.click()
        }
      >
        <div className={STYLES.uploadText}>
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
          className={STYLES.fileInput}
          disabled={disabled}
        />
      </div>

      {/* Image Grid */}
      {sortedImages.length > 0 && (
        <div className={STYLES.imageGrid}>
          {sortedImages.map((image, index) => (
            <div
              key={image.id}
              className={`${STYLES.imageCard} ${image.markedForDeletion ? STYLES.imageCardDeleted : ''} ${draggedIndex === index ? STYLES.imageCardDragging : ''}`}
              draggable={!disabled && !image.markedForDeletion}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOverCard(e, index)}
              onDragEnd={handleDragEnd}
            >
              <img
                src={image.preview}
                alt={image.alt || 'Image preview'}
                className={STYLES.imageThumb}
              />

              {/* Badges */}
              {image.markedForDeletion ? (
                <div className={STYLES.deletedBadge}>Deleted</div>
              ) : (
                <>
                  {image.isHero && <div className={STYLES.heroBadge}>Hero</div>}
                  {image.isNew && (
                    <div
                      className={
                        image.isHero
                          ? STYLES.newBadge
                          : `${STYLES.heroBadge} bg-green-600`
                      }
                    >
                      New
                    </div>
                  )}
                </>
              )}

              {/* Overlay with actions - only show for non-hero images */}
              {!image.markedForDeletion && !image.isHero && (
                <div className={STYLES.overlay}>
                  <div className={STYLES.overlayActions}>
                    <button
                      type="button"
                      onClick={() => setHeroImage(image.id)}
                      className={STYLES.actionButton}
                      disabled={disabled}
                    >
                      Set as Hero
                    </button>
                  </div>
                </div>
              )}

              {/* Restore button for deleted images */}
              {image.markedForDeletion && (
                <div
                  className={STYLES.overlay}
                  style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
                >
                  <button
                    type="button"
                    onClick={() => restoreImage(image.id)}
                    className={STYLES.actionButton}
                    disabled={disabled}
                  >
                    Restore
                  </button>
                </div>
              )}

              {/* Remove button (top right) */}
              {!image.markedForDeletion && (
                <button
                  type="button"
                  onClick={() => toggleDelete(image.id)}
                  className={STYLES.removeButton}
                  title={image.isNew ? 'Remove' : 'Mark for deletion'}
                  disabled={disabled}
                >
                  <X size={20} aria-label="Remove image" />
                </button>
              )}

              {/* Alt text input */}
              {!image.markedForDeletion && (
                <div className={STYLES.altInput}>
                  <input
                    type="text"
                    placeholder="Alt text..."
                    value={image.alt}
                    onChange={(e) => updateAlt(image.id, e.target.value)}
                    className={STYLES.altInputField}
                    onClick={(e) => e.stopPropagation()}
                    disabled={disabled}
                  />
                </div>
              )}

              {/* Drag indicator */}
              {!image.markedForDeletion && (
                <div className={STYLES.dragHandle} title="Drag to reorder">
                  ⋮⋮
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {error && <p className={STYLES.error}>{error}</p>}
    </div>
  )
}
