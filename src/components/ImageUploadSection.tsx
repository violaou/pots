import { useCallback, useState } from 'react'

export interface ImagePreview {
  id: string
  file: File
  preview: string
  alt?: string
  isHero: boolean
}

interface ImageUploadSectionProps {
  images: ImagePreview[]
  onImagesChange: (images: ImagePreview[]) => void
  error?: string
}

// Styling constants
const STYLES = {
  // Image upload
  imageUpload:
    'border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors',
  imageUploadActive: 'border-blue-500 bg-blue-50',
  imageUploadText: 'text-gray-600',
  imageUploadButton:
    'mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500',
  fileInput: 'hidden',

  // Image preview grid
  imageGrid: 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4',
  imagePreview: 'relative group border rounded-lg overflow-hidden',
  imagePreviewImage: 'w-full h-32 object-cover',
  imagePreviewOverlay:
    'absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200',
  imagePreviewActions:
    'absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200',
  imagePreviewButton:
    'px-3 py-1 bg-white text-gray-800 rounded text-sm font-medium hover:bg-gray-100',
  imagePreviewHero:
    'absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded',
  imagePreviewAlt:
    'absolute bottom-2 left-2 right-2 bg-black bg-opacity-75 text-white text-xs p-2 rounded',
  imagePreviewRemove:
    'absolute top-2 right-2 bg-red-600 text-white p-1 rounded hover:bg-red-700',

  // Error states
  error: 'text-red-600 text-sm mt-1'
} as const

export default function ImageUploadSection({
  images,
  onImagesChange,
  error
}: ImageUploadSectionProps) {
  const [isDragOver, setIsDragOver] = useState(false)

  // Handle image file selection
  const handleImageSelect = useCallback(
    (files: FileList | null) => {
      if (!files) return

      const newImages: ImagePreview[] = []

      Array.from(files).forEach((file, index) => {
        if (file.type.startsWith('image/')) {
          const id = `preview-${Date.now()}-${index}`
          const preview = URL.createObjectURL(file)
          newImages.push({
            id,
            file,
            preview,
            alt: '',
            isHero: images.length === 0 && index === 0 // First image is hero by default
          })
        }
      })

      onImagesChange([...images, ...newImages])
    },
    [images, onImagesChange]
  )

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      handleImageSelect(e.dataTransfer.files)
    },
    [handleImageSelect]
  )

  // Handle file input change
  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleImageSelect(e.target.files)
    },
    [handleImageSelect]
  )

  // Set hero image
  const setHeroImage = useCallback(
    (imageId: string) => {
      onImagesChange(
        images.map((img) => ({
          ...img,
          isHero: img.id === imageId
        }))
      )
    },
    [images, onImagesChange]
  )

  // Remove image
  const removeImage = useCallback(
    (imageId: string) => {
      const newImages = images.filter((img) => img.id !== imageId)
      // If we removed the hero image, make the first remaining image the hero
      if (newImages.length > 0 && !newImages.some((img) => img.isHero)) {
        newImages[0].isHero = true
      }
      onImagesChange(newImages)
    },
    [images, onImagesChange]
  )

  // Update image alt text
  const updateImageAlt = useCallback(
    (imageId: string, alt: string) => {
      onImagesChange(
        images.map((img) => (img.id === imageId ? { ...img, alt } : img))
      )
    },
    [images, onImagesChange]
  )

  return (
    <div>
      {/* Image Upload Area */}
      <div
        className={`${STYLES.imageUpload} ${
          isDragOver ? STYLES.imageUploadActive : ''
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className={STYLES.imageUploadText}>
          <p>Drag and drop images here, or click to select</p>
          <button
            type="button"
            onClick={() => document.getElementById('image-upload')?.click()}
            className={STYLES.imageUploadButton}
          >
            Choose Images
          </button>
          <input
            id="image-upload"
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileInputChange}
            className={STYLES.fileInput}
          />
        </div>
      </div>

      {/* Image Previews */}
      {images.length > 0 && (
        <div className={STYLES.imageGrid}>
          {images.map((image) => (
            <div key={image.id} className={STYLES.imagePreview}>
              <img
                src={image.preview}
                alt={image.alt || 'Preview'}
                className={STYLES.imagePreviewImage}
              />

              {image.isHero && (
                <div className={STYLES.imagePreviewHero}>Hero</div>
              )}

              <div className={STYLES.imagePreviewOverlay}>
                <div className={STYLES.imagePreviewActions}>
                  {!image.isHero && (
                    <button
                      type="button"
                      onClick={() => setHeroImage(image.id)}
                      className={STYLES.imagePreviewButton}
                    >
                      Set as Hero
                    </button>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => removeImage(image.id)}
                className={STYLES.imagePreviewRemove}
                title="Remove image"
              >
                ×
              </button>

              <div className={STYLES.imagePreviewAlt}>
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

      {error && <p className={STYLES.error}>{error}</p>}
    </div>
  )
}
