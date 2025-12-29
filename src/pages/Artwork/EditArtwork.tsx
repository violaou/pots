import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'

import {
  ImageManagementSection,
  artworkImagesToManaged,
  type ManagedImage
} from '../../components'
import { useAuth } from '../../contexts/AuthContext'
import {
  getArtworkWithImages,
  updateArtwork,
  saveArtworkImages
} from '../../services/artwork-service'
import { uploadImage, isMockMode } from '../../services/s3-upload'
import type { Artwork } from '../../types'

const formSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().optional(),
  clay: z.string().optional(),
  cone: z.union([z.string(), z.number()]).optional(),
  isMicrowaveSafe: z.boolean().default(true),
  isPublished: z.boolean().default(true)
})

const STYLES = {
  container: 'min-h-screen py-8',
  content: 'max-w-4xl mx-auto px-4',
  header: 'flex justify-between items-center mb-6',
  title: 'text-2xl font-medium',
  backButton:
    'px-4 py-2 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800',

  form: 'space-y-6',
  section:
    'bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6',
  sectionTitle: 'text-lg font-medium mb-4',

  fieldGroup: 'space-y-2',
  label: 'block text-sm text-gray-600 dark:text-gray-400 mb-1',
  input:
    'w-full border border-gray-200 dark:border-gray-700 rounded px-3 py-2 bg-white dark:bg-gray-900 dark:text-gray-100',
  textarea:
    'w-full border border-gray-200 dark:border-gray-700 rounded px-3 py-2 bg-white dark:bg-gray-900 dark:text-gray-100',

  checkboxGroup: 'flex items-center gap-6',
  checkbox: 'inline-flex items-center gap-2',

  actions: 'flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700',
  submitButton:
    'px-4 py-2 rounded bg-black dark:bg-white text-white dark:text-black disabled:opacity-50',
  cancelButton:
    'px-4 py-2 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800',

  error: 'mb-4 text-sm text-red-600 dark:text-red-400',
  loading: 'min-h-screen flex items-center justify-center',
  loadingText: 'text-lg text-gray-600 dark:text-gray-400',

  accessDenied: 'min-h-screen flex items-center justify-center',
  accessDeniedTitle: 'text-lg text-red-600 dark:text-red-400 mb-2',
  accessDeniedText: 'text-sm text-gray-600 dark:text-gray-400',

  mockWarning:
    'mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md text-sm text-amber-800 dark:text-amber-200'
} as const

export default function EditArtwork() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { isAdmin, adminLoading, loading: authLoading } = useAuth()

  const [artwork, setArtwork] = useState<Artwork | null>(null)
  const [form, setForm] = useState<z.infer<typeof formSchema>>({
    title: '',
    description: '',
    clay: 'stoneware',
    cone: 'cone 6',
    isMicrowaveSafe: true,
    isPublished: true
  })
  const [images, setImages] = useState<ManagedImage[]>([])
  const [originalImages, setOriginalImages] = useState<ManagedImage[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadStatus, setUploadStatus] = useState<string>('')

  const isUsingMockUpload = isMockMode()

  useEffect(() => {
    if (!slug) return
    let isMounted = true
    getArtworkWithImages(slug).then((data) => {
      if (!isMounted) return
      setArtwork(data)
      if (data) {
        setForm({
          title: data.title,
          description: data.description ?? '',
          clay: data.clay ?? 'stoneware',
          cone: (data.cone as any) ?? 'cone 6',
          isMicrowaveSafe: data.isMicrowaveSafe,
          isPublished: true
        })
        const managedImages = artworkImagesToManaged(data.images)
        setImages(managedImages)
        setOriginalImages(managedImages)
      }
    })
    return () => {
      isMounted = false
    }
  }, [slug])

  const onChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, type } = e.target
    const value =
      type === 'checkbox'
        ? (e.target as HTMLInputElement).checked
        : e.target.value
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!slug || !artwork) return
    setError(null)

    const parsed = formSchema.safeParse(form)
    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? 'Invalid form')
      return
    }

    // Validate at least one non-deleted image
    const activeImages = images.filter((img) => !img.markedForDeletion)
    if (activeImages.length === 0) {
      setError('At least one image is required')
      return
    }

    // Ensure exactly one hero
    const heroCount = activeImages.filter((img) => img.isHero).length
    if (heroCount === 0) {
      // Auto-assign first image as hero
      const firstActive = images.find((img) => !img.markedForDeletion)
      if (firstActive) firstActive.isHero = true
    }

    setSubmitting(true)
    try {
      // Step 1: Update artwork metadata
      setUploadStatus('Saving artwork details...')
      await updateArtwork(slug, parsed.data)

      // Step 2: Calculate image changes
      const deletions: string[] = []
      const updates: {
        id: string
        alt?: string
        sortOrder?: number
        isHero?: boolean
      }[] = []
      const additions: {
        cdnUrl: string
        alt?: string
        sortOrder: number
        isHero: boolean
      }[] = []

      for (const img of images) {
        if (img.markedForDeletion && !img.isNew) {
          // Existing image marked for deletion
          deletions.push(img.id)
        } else if (img.isNew && !img.markedForDeletion) {
          // New image to upload and add
          additions.push({
            cdnUrl: '', // Will be filled after upload
            alt: img.alt,
            sortOrder: img.sortOrder,
            isHero: img.isHero
          })
        } else if (!img.isNew && !img.markedForDeletion) {
          // Existing image - check for changes
          const original = originalImages.find((o) => o.id === img.id)
          if (original) {
            const hasChanges =
              original.alt !== img.alt ||
              original.sortOrder !== img.sortOrder ||
              original.isHero !== img.isHero

            if (hasChanges) {
              updates.push({
                id: img.id,
                alt: img.alt,
                sortOrder: img.sortOrder,
                isHero: img.isHero
              })
            }
          }
        }
      }

      // Step 3: Upload new images
      const newImages = images.filter(
        (img) => img.isNew && !img.markedForDeletion && img.file
      )
      if (newImages.length > 0) {
        setUploadStatus(
          `Uploading ${newImages.length} new image${newImages.length > 1 ? 's' : ''}...`
        )

        for (let i = 0; i < newImages.length; i++) {
          const img = newImages[i]
          if (!img.file) continue

          setUploadStatus(`Uploading image ${i + 1} of ${newImages.length}...`)
          const cdnUrl = await uploadImage(img.file)

          // Find the corresponding addition and update its URL
          const additionIndex = additions.findIndex(
            (a) => a.sortOrder === img.sortOrder && a.alt === img.alt
          )
          if (additionIndex !== -1) {
            additions[additionIndex].cdnUrl = cdnUrl
          }
        }
      }

      // Step 4: Save all image changes
      if (deletions.length > 0 || updates.length > 0 || additions.length > 0) {
        setUploadStatus('Saving image changes...')
        await saveArtworkImages(artwork.id, {
          updates,
          deletions,
          additions: additions.filter((a) => a.cdnUrl) // Only add images that were uploaded
        })
      }

      setUploadStatus('')
      navigate(`/gallery/${slug}`)
    } catch (err) {
      console.error(err)
      setError('Failed to save changes')
      setUploadStatus('')
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading || adminLoading) {
    return (
      <div className={STYLES.loading}>
        <p className={STYLES.loadingText}>Loading…</p>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className={STYLES.accessDenied}>
        <div className="text-center">
          <p className={STYLES.accessDeniedTitle}>Access Denied</p>
          <p className={STYLES.accessDeniedText}>
            You must be an admin to edit artwork.
          </p>
        </div>
      </div>
    )
  }

  if (!artwork) {
    return (
      <div className={STYLES.loading}>
        <p className={STYLES.loadingText}>Loading…</p>
      </div>
    )
  }

  return (
    <div className={STYLES.container}>
      <div className={STYLES.content}>
        {/* Header */}
        <div className={STYLES.header}>
          <h1 className={STYLES.title}>Edit Artwork</h1>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className={STYLES.backButton}
          >
            Back
          </button>
        </div>

        {error && <div className={STYLES.error}>{error}</div>}

        <form className={STYLES.form} onSubmit={onSubmit}>
          {/* Images Section */}
          <div className={STYLES.section}>
            <h2 className={STYLES.sectionTitle}>Images</h2>
            {isUsingMockUpload && (
              <div className={STYLES.mockWarning}>
                <strong>Dev Mode:</strong> New images will use local blob URLs
                (not persisted).
              </div>
            )}
            <ImageManagementSection
              images={images}
              onImagesChange={setImages}
              disabled={submitting}
            />
          </div>

          {/* Basic Information */}
          <div className={STYLES.section}>
            <h2 className={STYLES.sectionTitle}>Basic Information</h2>

            <div className={STYLES.fieldGroup}>
              <label className={STYLES.label}>Title</label>
              <input
                name="title"
                value={form.title}
                onChange={onChange}
                className={STYLES.input}
                disabled={submitting}
              />
            </div>

            <div className={STYLES.fieldGroup}>
              <label className={STYLES.label}>Description</label>
              <textarea
                name="description"
                value={form.description}
                onChange={onChange}
                className={STYLES.textarea}
                rows={4}
                disabled={submitting}
              />
            </div>
          </div>

          {/* Technical Details */}
          <div className={STYLES.section}>
            <h2 className={STYLES.sectionTitle}>Technical Details</h2>

            <div className="grid grid-cols-2 gap-4">
              <div className={STYLES.fieldGroup}>
                <label className={STYLES.label}>Clay</label>
                <input
                  name="clay"
                  value={form.clay ?? ''}
                  onChange={onChange}
                  className={STYLES.input}
                  disabled={submitting}
                />
              </div>
              <div className={STYLES.fieldGroup}>
                <label className={STYLES.label}>Cone</label>
                <input
                  name="cone"
                  value={String(form.cone ?? '')}
                  onChange={onChange}
                  className={STYLES.input}
                  disabled={submitting}
                />
              </div>
            </div>

            <div className={STYLES.checkboxGroup}>
              <label className={STYLES.checkbox}>
                <input
                  type="checkbox"
                  name="isMicrowaveSafe"
                  checked={!!form.isMicrowaveSafe}
                  onChange={onChange}
                  disabled={submitting}
                />
                <span>Microwave safe</span>
              </label>
              <label className={STYLES.checkbox}>
                <input
                  type="checkbox"
                  name="isPublished"
                  checked={!!form.isPublished}
                  onChange={onChange}
                  disabled={submitting}
                />
                <span>Published</span>
              </label>
            </div>
          </div>

          {/* Form Actions */}
          <div className={STYLES.actions}>
            <button
              type="submit"
              disabled={submitting}
              className={STYLES.submitButton}
            >
              {submitting ? uploadStatus || 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className={STYLES.cancelButton}
              disabled={submitting}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
