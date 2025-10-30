import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { ImageUploadSection, type ImagePreview } from '../../components'
import { useAuth } from '../../contexts/AuthContext'

// Form validation schema
const artworkSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(100, 'Title must be less than 100 characters'),
  description: z.string().optional(),
  materials: z.string().optional(),
  clay: z.string().optional(),
  cone: z.union([z.string(), z.number()]).optional(),
  isMicrowaveSafe: z.boolean(),
  altText: z.string().optional()
})

type ArtworkFormData = z.infer<typeof artworkSchema>

// Styling constants
const STYLES = {
  container: 'min-h-screen py-8',
  content: 'max-w-4xl mx-auto px-4',
  header: 'flex justify-between items-center mb-6',
  title: 'text-2xl font-medium',
  subtitle: 'text-gray-600 mt-1',
  backButton: 'px-4 py-2 rounded border hover:bg-gray-50',

  // Form styles
  form: 'space-y-6',
  formSection: 'bg-white rounded-lg border p-6',
  sectionTitle: 'text-lg font-medium mb-4',

  // Form fields
  fieldGroup: 'space-y-2',
  label: 'block text-sm font-medium text-gray-700',
  input:
    'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
  textarea:
    'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical min-h-[100px]',
  select:
    'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
  checkbox: 'h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded',

  // Form actions
  formActions: 'flex justify-end space-x-4 pt-6 border-t',
  submitButton:
    'px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed',
  cancelButton:
    'px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500',

  // Error states
  error: 'text-red-600 text-sm mt-1',
  fieldError: 'border-red-500 focus:ring-red-500',

  // Access denied
  accessDenied: 'min-h-screen flex items-center justify-center',
  accessDeniedText: 'text-lg text-gray-600'
} as const

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
      isMicrowaveSafe: true,
      altText: ''
    }
  })

  // Image state (separate from form since React Hook Form doesn't handle file previews well)
  const [images, setImages] = useState<ImagePreview[]>([])
  const [imageError, setImageError] = useState<string>('')

  const { isAdmin } = useAuth()
  const navigate = useNavigate()

  // Access control
  if (!isAdmin) {
    return (
      <div className={STYLES.accessDenied}>
        <p className={STYLES.accessDeniedText}>
          Access denied. Admin privileges required.
        </p>
      </div>
    )
  }

  // Handle image changes
  const handleImagesChange = (newImages: ImagePreview[]) => {
    setImages(newImages)
    // Clear image error when images are added
    if (newImages.length > 0 && imageError) {
      setImageError('')
    }
  }

  // Form submission
  const onSubmit = async (data: ArtworkFormData) => {
    // Validate images
    if (images.length === 0) {
      setImageError('At least one image is required')
      return
    }

    try {
      // TODO: Here you would integrate with Cloudinary upload service
      console.log('Form data:', data)
      console.log(
        'Images to upload:',
        images.map((img) => ({
          file: img.file,
          alt: img.alt,
          isHero: img.isHero
        }))
      )

      // For now, just show success message
      alert('Artwork form is ready! (Image upload integration pending)')

      // Navigate back to gallery
      navigate('/gallery')
    } catch (error) {
      console.error('Form submission error:', error)
      alert('An error occurred. Please try again.')
    }
  }

  return (
    <div className={STYLES.container}>
      <div className={STYLES.content}>
        {/* Header */}
        <div className={STYLES.header}>
          <div>
            <h1 className={STYLES.title}>Add New Artwork</h1>
            <p className={STYLES.subtitle}>
              Upload images and provide details about your artwork
            </p>
          </div>
          <Link to="/gallery" className={STYLES.backButton}>
            Back to Gallery
          </Link>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className={STYLES.form}>
          {/* Images Section */}
          <div className={STYLES.formSection}>
            <h2 className={STYLES.sectionTitle}>Images</h2>
            <ImageUploadSection
              images={images}
              onImagesChange={handleImagesChange}
              error={imageError}
            />
          </div>

          {/* Basic Information */}
          <div className={STYLES.formSection}>
            <h2 className={STYLES.sectionTitle}>Basic Information</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={STYLES.fieldGroup}>
                <label htmlFor="title" className={STYLES.label}>
                  Title *
                </label>
                <input
                  id="title"
                  type="text"
                  {...register('title')}
                  className={`${STYLES.input} ${
                    errors.title ? STYLES.fieldError : ''
                  }`}
                  placeholder="Enter artwork title"
                />
                {errors.title && (
                  <p className={STYLES.error}>{errors.title.message}</p>
                )}
              </div>

              <div className={STYLES.fieldGroup}>
                <label htmlFor="materials" className={STYLES.label}>
                  Materials
                </label>
                <input
                  id="materials"
                  type="text"
                  {...register('materials')}
                  className={STYLES.input}
                  placeholder="e.g., Stoneware, Glaze"
                />
              </div>
            </div>

            <div className={STYLES.fieldGroup}>
              <label htmlFor="description" className={STYLES.label}>
                Description
              </label>
              <textarea
                id="description"
                {...register('description')}
                className={STYLES.textarea}
                placeholder="Describe your artwork..."
              />
            </div>
          </div>

          {/* Technical Details */}
          <div className={STYLES.formSection}>
            <h2 className={STYLES.sectionTitle}>Technical Details</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={STYLES.fieldGroup}>
                <label htmlFor="clay" className={STYLES.label}>
                  Clay Type
                </label>
                <input
                  id="clay"
                  type="text"
                  {...register('clay')}
                  className={STYLES.input}
                  placeholder="e.g., Stoneware, Porcelain"
                />
              </div>

              <div className={STYLES.fieldGroup}>
                <label htmlFor="cone" className={STYLES.label}>
                  Firing Cone
                </label>
                <input
                  id="cone"
                  type="text"
                  {...register('cone')}
                  className={STYLES.input}
                  placeholder="e.g., 6, 10, 04"
                />
              </div>
            </div>

            <div className={STYLES.fieldGroup}>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  {...register('isMicrowaveSafe')}
                  className={STYLES.checkbox}
                />
                <span className="ml-2 text-sm text-gray-700">
                  Microwave safe
                </span>
              </label>
            </div>
          </div>

          {/* Accessibility */}
          <div className={STYLES.formSection}>
            <h2 className={STYLES.sectionTitle}>Accessibility</h2>

            <div className={STYLES.fieldGroup}>
              <label htmlFor="altText" className={STYLES.label}>
                Alt Text
              </label>
              <input
                id="altText"
                type="text"
                {...register('altText')}
                className={STYLES.input}
                placeholder="Describe the artwork for screen readers"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className={STYLES.formActions}>
            <Link to="/gallery" className={STYLES.cancelButton}>
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className={STYLES.submitButton}
            >
              {isSubmitting ? 'Adding...' : 'Add Artwork'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
