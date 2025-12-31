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
} from '../../services/artwork-service/index'
import { uploadImage, isMockMode } from '../../services/s3-upload'
import { theme } from '../../styles/theme'
import type { Artwork } from '../../types'

const formSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().optional(),
  clay: z.string().optional(),
  cone: z.union([z.string(), z.number()]).optional(),
  isMicrowaveSafe: z.boolean().default(true),
  isPublished: z.boolean().default(true)
})

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
          cone: data.cone ?? 'cone 6',
          isMicrowaveSafe: data.isMicrowaveSafe,
          isPublished: data.isPublished
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

    // Ensure exactly one hero - auto-assign first active image if none
    const hasHero = activeImages.some((img) => img.isHero)
    if (!hasHero) {
      const firstActiveIndex = images.findIndex((img) => !img.markedForDeletion)
      if (firstActiveIndex !== -1) {
        images[firstActiveIndex] = { ...images[firstActiveIndex], isHero: true }
      }
    }

    setSubmitting(true)
    try {
      // Update artwork metadata
      setUploadStatus('Saving artwork details...')
      await updateArtwork(slug, parsed.data)

      // Calculate image changes
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
        // Skip new images marked for deletion (never saved)
        if (img.isNew && img.markedForDeletion) continue

        // Existing image marked for deletion
        if (img.markedForDeletion) {
          deletions.push(img.id)
          continue
        }

        // New image to upload
        if (img.isNew) {
          additions.push({
            cdnUrl: '', // Filled after upload
            alt: img.alt,
            sortOrder: img.sortOrder,
            isHero: img.isHero
          })
          continue
        }

        // Existing image - check for changes
        const original = originalImages.find((o) => o.id === img.id)
        if (!original) continue

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

      // Upload new images
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
      <div className={theme.state.loading}>
        <p className={theme.state.loadingText}>Loading…</p>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className={theme.layout.pageCenter}>
        <div className="text-center">
          <p className={`text-lg ${theme.text.error} mb-2`}>Access Denied</p>
          <p className={`text-sm ${theme.text.muted}`}>
            You must be an admin to edit artwork.
          </p>
        </div>
      </div>
    )
  }

  if (!artwork) {
    return (
      <div className={theme.state.loading}>
        <p className={theme.state.loadingText}>Loading…</p>
      </div>
    )
  }

  return (
    <div className={theme.layout.page}>
      <div className={theme.layout.container}>
        <div className={theme.layout.header}>
          <h1 className={`text-2xl font-medium ${theme.text.h1}`}>
            Edit Artwork
          </h1>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className={theme.button.secondary}
          >
            Back
          </button>
        </div>

        {error && (
          <div className={`mb-4 text-sm ${theme.text.error}`}>{error}</div>
        )}

        <form className="space-y-6" onSubmit={onSubmit}>
          <div className={theme.section}>
            <h2 className={`text-lg font-medium mb-4 ${theme.text.h1}`}>
              Images
            </h2>
            {isUsingMockUpload && (
              <div className={`mb-4 ${theme.alert.warning}`}>
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

          <div className={theme.section}>
            <h2 className={`text-lg font-medium mb-4 ${theme.text.h1}`}>
              Basic Information
            </h2>

            <div className={theme.form.group}>
              <label className={theme.form.label}>Title</label>
              <input
                name="title"
                value={form.title}
                onChange={onChange}
                className={theme.form.input}
                disabled={submitting}
              />
            </div>

            <div className={theme.form.group}>
              <label className={theme.form.label}>Description</label>
              <textarea
                name="description"
                value={form.description}
                onChange={onChange}
                className={theme.form.textarea}
                rows={4}
                disabled={submitting}
              />
            </div>
          </div>

          {/* Technical Details */}
          <div className={theme.section}>
            <h2 className={`text-lg font-medium mb-4 ${theme.text.h1}`}>
              Technical Details
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div className={theme.form.group}>
                <label className={theme.form.label}>Clay</label>
                <input
                  name="clay"
                  value={form.clay ?? ''}
                  onChange={onChange}
                  className={theme.form.input}
                  disabled={submitting}
                />
              </div>
              <div className={theme.form.group}>
                <label className={theme.form.label}>Cone</label>
                <input
                  name="cone"
                  value={String(form.cone ?? '')}
                  onChange={onChange}
                  className={theme.form.input}
                  disabled={submitting}
                />
              </div>
            </div>

            <div className={theme.form.checkboxGroup}>
              <label className={theme.form.checkboxLabel}>
                <input
                  type="checkbox"
                  name="isMicrowaveSafe"
                  checked={!!form.isMicrowaveSafe}
                  onChange={onChange}
                  disabled={submitting}
                />
                <span>Microwave safe</span>
              </label>
              <label className={theme.form.checkboxLabel}>
                <input
                  type="checkbox"
                  name="isPublished"
                  checked={!!form.isPublished}
                  onChange={onChange}
                  disabled={submitting}
                />
                <span>Public</span>
              </label>
            </div>
          </div>

          {/* Form Actions */}
          <div className={theme.form.actions}>
            <button
              type="submit"
              disabled={submitting}
              className={theme.button.primary}
            >
              {submitting ? uploadStatus || 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className={theme.button.secondary}
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
