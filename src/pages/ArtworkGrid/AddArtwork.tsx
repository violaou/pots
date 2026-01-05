import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import {
  ImageManagementSection,
  managedToImagePreviews,
  type ManagedImage
} from '../../components'
import { useAuth } from '../../contexts/AuthContext'
import { createArtwork } from '../../services/artwork-service/index'
import { uploadImage, isMockMode } from '../../services/s3-upload'
import { theme } from '../../styles/theme'

const artworkSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(100, 'Title must be less than 100 characters'),
  description: z.string().optional(),
  materials: z.string().optional(),
  clay: z.string().optional(),
  cone: z.union([z.string(), z.number()]).optional(),
  isMicrowaveSafe: z.boolean()
})

type ArtworkFormData = z.infer<typeof artworkSchema>

export default function AddArtwork() {
  // Form state
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<ArtworkFormData>({
    resolver: zodResolver(artworkSchema),
    defaultValues: {
      title: '',
      description: '',
      materials: '',
      clay: '',
      cone: '',
      isMicrowaveSafe: true
    }
  })

  // Image state (separate from form since React Hook Form doesn't handle file previews well)
  const [images, setImages] = useState<ManagedImage[]>([])
  const [imageError, setImageError] = useState<string>('')
  const [uploadStatus, setUploadStatus] = useState<string>('')

  const { isAdmin } = useAuth()
  const navigate = useNavigate()

  // Show mock mode indicator in development
  const isUsingMockUpload = isMockMode()

  // Access control
  if (!isAdmin) {
    return (
      <div className={theme.layout.pageCenter}>
        <p className={theme.text.muted}>
          Access denied. Admin privileges required.
        </p>
      </div>
    )
  }

  // Handle image changes
  const handleImagesChange = (newImages: ManagedImage[]) => {
    setImages(newImages)
    if (newImages.length > 0) setImageError('')
  }

  // Form submission
  const onSubmit = async (data: ArtworkFormData) => {
    // Convert to simple previews and validate
    const imagePreviews = managedToImagePreviews(images)
    if (imagePreviews.length === 0) {
      setImageError('At least one image is required')
      return
    }

    try {
      // Upload images to S3 (or mock in dev)
      setUploadStatus(
        `Uploading ${imagePreviews.length} image${imagePreviews.length > 1 ? 's' : ''}...`
      )
      const uploadedImages = await Promise.all(
        imagePreviews.map(async (img) => {
          const cdnUrl = await uploadImage(img.file)
          return {
            cdnUrl,
            alt: img.alt || data.title,
            isHero: img.isHero
          }
        })
      )

      // Step 2: Create artwork record with image URLs
      setUploadStatus('Saving artwork...')
      const artwork = await createArtwork({
        title: data.title,
        description: data.description,
        materials: data.materials,
        clay: data.clay,
        cone: typeof data.cone === 'number' ? String(data.cone) : data.cone,
        isMicrowaveSafe: data.isMicrowaveSafe,
        images: uploadedImages
      })

      setUploadStatus('')
      if (import.meta.env.DEV) {
        console.log('[AddArtwork] Created artwork:', artwork.slug)
      }

      // Navigate to the new artwork
      navigate(`/gallery/${artwork.slug}`)
    } catch (error) {
      setUploadStatus('')
      console.error('Form submission error:', error)
      alert(
        `Failed to add artwork: ${error instanceof Error ? error.message : 'An error occurred'}`
      )
    }
  }

  return (
    <div className={theme.layout.page}>
      <div className={theme.layout.container}>
        <div className={theme.layout.header}>
          <div>
            <h1 className={`text-2xl font-medium ${theme.text.h1}`}>
              Add New Artwork
            </h1>
            <p className={theme.text.muted}>
              Upload images and provide details about your artwork
            </p>
          </div>
          <Link to="/gallery" className={theme.button.secondary}>
            Back to Gallery
          </Link>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className={theme.section}>
            <h2 className={`text-lg font-medium mb-4 ${theme.text.h1}`}>
              Images
            </h2>
            {isUsingMockUpload && (
              <div className={`mb-4 ${theme.alert.warning}`}>
                <strong>Dev Mode:</strong> Images will use local blob URLs (not
                persisted). Set{' '}
                <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded">
                  VITE_USE_REAL_UPLOAD=true
                </code>{' '}
                for real uploads.
              </div>
            )}
            <ImageManagementSection
              images={images}
              onImagesChange={handleImagesChange}
              error={imageError}
            />
          </div>

          {/* Basic Information */}
          <div className={theme.section}>
            <h2 className={`text-lg font-medium mb-4 ${theme.text.h1}`}>
              Basic Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={theme.form.group}>
                <label htmlFor="title" className={theme.form.labelRequired}>
                  Title *
                </label>
                <input
                  id="title"
                  type="text"
                  {...register('title')}
                  className={[
                    theme.form.input,
                    errors.title && theme.form.fieldError
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  placeholder="Enter artwork title"
                />
                {errors.title && (
                  <p className={theme.form.error}>{errors.title.message}</p>
                )}
              </div>

              <div className={theme.form.group}>
                <label htmlFor="materials" className={theme.form.labelRequired}>
                  Materials
                </label>
                <input
                  id="materials"
                  type="text"
                  {...register('materials')}
                  className={theme.form.input}
                  placeholder="e.g., Stoneware, Glaze"
                />
              </div>
            </div>

            <div className={theme.form.group}>
              <label htmlFor="description" className={theme.form.labelRequired}>
                Description
              </label>
              <textarea
                id="description"
                {...register('description')}
                className={theme.form.textarea}
                placeholder="Describe your artwork..."
              />
            </div>
          </div>

          <div className={theme.section}>
            <h2 className={`text-lg font-medium mb-4 ${theme.text.h1}`}>
              Technical Details
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={theme.form.group}>
                <label htmlFor="clay" className={theme.form.labelRequired}>
                  Clay Type
                </label>
                <input
                  id="clay"
                  type="text"
                  {...register('clay')}
                  className={theme.form.input}
                  placeholder="e.g., Stoneware, Porcelain"
                />
              </div>

              <div className={theme.form.group}>
                <label htmlFor="cone" className={theme.form.labelRequired}>
                  Firing Cone
                </label>
                <input
                  id="cone"
                  type="text"
                  {...register('cone')}
                  className={theme.form.input}
                  placeholder="e.g., 6, 10, 04"
                />
              </div>
            </div>

            <div className={theme.form.group}>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  {...register('isMicrowaveSafe')}
                  className={theme.form.checkbox}
                />
                <span className={`ml-2 text-sm ${theme.text.body}`}>
                  Microwave safe
                </span>
              </label>
            </div>
          </div>

          <div className="flex justify-end space-x-4 pt-6 border-t border-neutral-200 dark:border-neutral-700">
            <Link to="/gallery" className={theme.button.secondary}>
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className={theme.button.accent}
            >
              {isSubmitting ? uploadStatus || 'Adding...' : 'Add Artwork'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
