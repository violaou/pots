import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import {
  ImageManagementSection,
  MarkdownEditor,
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
  creationYear: z.string().optional()
})

type ArtworkFormData = z.infer<typeof artworkSchema>

export default function AddArtwork() {
  // Form state
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<ArtworkFormData>({
    resolver: zodResolver(artworkSchema),
    defaultValues: {
      title: '',
      description: '',
      creationYear: ''
    }
  })

  const description = watch('description')
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
        <h1 className={`text-2xl font-medium ${theme.text.h1}`}>
          Add New Artwork
        </h1>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className={theme.section}>
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
            <div className={theme.form.inlineGroup}>
              <label
                htmlFor="title"
                className={theme.form.label}
                style={{ marginRight: '1rem', minWidth: '80px' }}
              >
                Title
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

            <div className={theme.form.inlineGroup}>
              <label
                htmlFor="creationYear"
                className={theme.form.label}
                style={{ marginRight: '1rem', minWidth: '80px' }}
              >
                Year
              </label>
              <input
                id="creationYear"
                type="number"
                {...register('creationYear')}
                className={theme.form.input}
                placeholder={new Date().getFullYear().toString()}
                defaultValue={new Date().getFullYear()}
                style={{ marginRight: '1rem', maxWidth: '300px' }}
              />

              <label htmlFor="isPublished" className={theme.form.checkboxLabel}>
                <input
                  type="checkbox"
                  name="isPublished"
                  checked={true}
                  onChange={() => {}}
                  disabled={isSubmitting}
                />
                <span>Publish</span>
              </label>
            </div>

            <h2 className={`text-lg font-medium mb-4 mt-4 ${theme.text.h1}`}>
              Description
            </h2>
            <MarkdownEditor
              value={description ?? ''}
              onChange={(value) => setValue('description', value)}
              placeholder="Describe your artwork..."
              disabled={isSubmitting}
              minHeight="200px"
            />
          </div>

          {/* Technical Details */}
          <div className={theme.section}>
            <h2 className={`text-lg font-medium mb-4 mt-4 ${theme.text.h1}`}>
              Technical Details
            </h2>

            {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </div> */}
          </div>

          {/* Form Actions */}
          <div className={theme.form.actions}>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className={theme.button.secondary}
              disabled={isSubmitting}
            >
              Cancel
            </button>
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
