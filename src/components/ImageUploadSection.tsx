import { useCallback } from 'react'

import {
  useFileDragDrop,
  processImageFiles,
  setHeroInArray,
  updateAltInArray
} from '../hooks/useImageUpload'

export interface ImagePreview {
  id: string
  file: File
  preview: string
  alt: string
  isHero: boolean
}

interface ImageUploadSectionProps {
  images: ImagePreview[]
  onImagesChange: (images: ImagePreview[]) => void
  error?: string
}

const styles = {
  uploadArea:
    'border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors cursor-pointer',
  uploadAreaActive: 'border-blue-500 bg-blue-50',
  uploadText: 'text-gray-600',
  uploadButton:
    'mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500',
  fileInput: 'hidden',
  imageGrid: 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4',
  imageCard: 'relative group border rounded-lg overflow-hidden',
  imageThumb: 'w-full h-32 object-cover',
  overlay:
    'absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200',
  overlayActions:
    'absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200',
  actionButton:
    'px-3 py-1 bg-white text-gray-800 rounded text-sm font-medium hover:bg-gray-100',
  heroBadge:
    'absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded',
  altInput:
    'absolute bottom-2 left-2 right-2 bg-black bg-opacity-75 text-white text-xs p-2 rounded',
  removeButton:
    'absolute top-2 right-2 bg-red-600 text-white p-1 rounded hover:bg-red-700',
  error: 'text-red-600 text-sm mt-1'
} as const

export default function ImageUploadSection({
  images,
  onImagesChange,
  error
}: ImageUploadSectionProps) {
  const handleFiles = useCallback(
    (files: FileList) => {
      const newImages = processImageFiles<ImagePreview>(
        files,
        images.length,
        (file, id, _index, isFirstHero) => ({
          id,
          file,
          preview: URL.createObjectURL(file),
          alt: '',
          isHero: isFirstHero
        })
      )
      onImagesChange([...images, ...newImages])
    },
    [images, onImagesChange]
  )

  const {
    isDragOver,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileInputChange
  } = useFileDragDrop(handleFiles)

  const setHeroImage = useCallback(
    (imageId: string) => onImagesChange(setHeroInArray(images, imageId)),
    [images, onImagesChange]
  )

  const removeImage = useCallback(
    (imageId: string) => {
      const newImages = images.filter((img) => img.id !== imageId)
      // Reassign hero if removed
      if (newImages.length > 0 && !newImages.some((img) => img.isHero)) {
        newImages[0].isHero = true
      }
      onImagesChange(newImages)
    },
    [images, onImagesChange]
  )

  const updateImageAlt = useCallback(
    (imageId: string, alt: string) =>
      onImagesChange(updateAltInArray(images, imageId, alt)),
    [images, onImagesChange]
  )

  return (
    <div>
      <div
        className={[styles.uploadArea, isDragOver && styles.uploadAreaActive]
          .filter(Boolean)
          .join(' ')}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => document.getElementById('image-upload')?.click()}
      >
        <div className={styles.uploadText}>
          <p>Drag and drop images here, or click to select</p>
          <button type="button" className={styles.uploadButton}>
            Choose Images
          </button>
          <input
            id="image-upload"
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileInputChange}
            className={styles.fileInput}
          />
        </div>
      </div>

      {images.length > 0 && (
        <div className={styles.imageGrid}>
          {images.map((image) => (
            <div key={image.id} className={styles.imageCard}>
              <img
                src={image.preview}
                alt={image.alt || 'Preview'}
                className={styles.imageThumb}
              />

              {image.isHero && <div className={styles.heroBadge}>Hero</div>}

              <div className={styles.overlay}>
                <div className={styles.overlayActions}>
                  {!image.isHero && (
                    <button
                      type="button"
                      onClick={() => setHeroImage(image.id)}
                      className={styles.actionButton}
                    >
                      Set as Hero
                    </button>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => removeImage(image.id)}
                className={styles.removeButton}
                title="Remove image"
              >
                ×
              </button>

              <div className={styles.altInput}>
                <input
                  type="text"
                  placeholder="Alt text..."
                  value={image.alt}
                  onChange={(e) => updateImageAlt(image.id, e.target.value)}
                  className="w-full bg-transparent text-white placeholder-gray-300 text-xs"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {error && <p className={styles.error}>{error}</p>}
    </div>
  )
}
