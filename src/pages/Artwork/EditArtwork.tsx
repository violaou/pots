import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'

import {
  ImageManagementSection,
  MarkdownEditor,
  TagsEditor,
  artworkImagesToManaged,
  type ManagedImage,
  type TagItem
} from '../../components'
import { useAuth } from '../../contexts/AuthContext'
import { isVideoFile } from '../../hooks/useImageUpload'
import {
  getArtworkWithImages,
  updateArtwork,
  saveArtworkImages,
  getArtworkTags,
  setArtworkTags
} from '../../services/artwork-service/index'
import { uploadImage, isMockMode } from '../../services/s3-upload'
import { theme } from '../../styles/theme'
import type { Artwork } from '../../types'

const formSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().optional(),
  creationYear: z.string().optional(),
  isPublished: z.boolean()
})

export default function EditArtwork() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { isAdmin, adminLoading, loading: authLoading } = useAuth()

  const [artwork, setArtwork] = useState<Artwork | null>(null)
  const [form, setForm] = useState<z.infer<typeof formSchema>>({
    title: '',
    description: '',
    creationYear: '',
    isPublished: true
  })
  const [images, setImages] = useState<ManagedImage[]>([])
  const [originalImages, setOriginalImages] = useState<ManagedImage[]>([])
  const [tags, setTags] = useState<TagItem[]>([])
  const [isSubmitting, setSubmitting] = useState(false)
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
          creationYear: data.creationYear?.toString() ?? '',
          isPublished: data.isPublished
        })
        const managedImages = artworkImagesToManaged(data.images)
        setImages(managedImages)
        setOriginalImages(managedImages)
        // Load tags
        getArtworkTags(data.id).then((artworkTags) => {
          if (isMounted) {
            setTags(artworkTags.map(t => ({
              id: t.id,
              tagName: t.tagName,
              tagValue: t.tagValue
            })))
          }
        })
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

    // Ensure exactly one hero - auto-assign first active non-video image if none
    const hasHero = activeImages.some((img) => img.isHero)
    if (!hasHero) {
      const firstActiveImageIndex = images.findIndex(
        (img) => !img.markedForDeletion && !isVideoFile(img.file ?? img.preview)
      )
      if (firstActiveImageIndex !== -1) {
        images[firstActiveImageIndex] = {
          ...images[firstActiveImageIndex],
          isHero: true
        }
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

      // Step 5: Save tags
      setUploadStatus('Saving tags...')
      await setArtworkTags(artwork.id, tags.map(t => ({
        tagName: t.tagName,
        tagValue: t.tagValue
      })))

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
        <h1 className={`text-2xl font-medium mb-6 ${theme.text.h1}`}>
          Edit Artwork
        </h1>

        {error && (
          <div className={`mb-4 text-sm ${theme.text.error}`}>{error}</div>
        )}

        <form onSubmit={onSubmit} className="space-y-6">
          <div className={theme.section}>
            {isUsingMockUpload && (
              <div className={`mb-4 ${theme.alert.warning}`}>
                <strong>Dev Mode:</strong> New images will use local blob URLs
                (not persisted). Set{' '}
                <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded">
                  VITE_USE_REAL_UPLOAD=true
                </code>{' '}
                for real uploads.
              </div>
            )}
            <ImageManagementSection
              images={images}
              onImagesChange={setImages}
              disabled={isSubmitting}
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
                name="title"
                value={form.title}
                onChange={onChange}
                className={theme.form.input}
                disabled={isSubmitting}
              />
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
                name="creationYear"
                type="number"
                value={form.creationYear}
                onChange={onChange}
                className={theme.form.input}
                placeholder={new Date().getFullYear().toString()}
                style={{ marginRight: '1rem', maxWidth: '300px' }}
              />

              <label htmlFor="isPublished" className={theme.form.checkboxLabel}>
                <input
                  type="checkbox"
                  name="isPublished"
                  checked={!!form.isPublished}
                  onChange={onChange}
                  disabled={isSubmitting}
                />
                <span>Publish</span>
              </label>
            </div>

            <h2 className={`text-lg font-medium mb-4 mt-4 ${theme.text.h1}`}>
              Description
            </h2>
            <MarkdownEditor
              value={form.description ?? ''}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, description: value }))
              }
              placeholder="Describe your artwork..."
              disabled={isSubmitting}
              minHeight="200px"
            />
          </div>

          {/* Tags */}
          <div className={theme.section}>
            <h2 className={`text-lg font-medium mb-4 ${theme.text.h1}`}>
              Tags
            </h2>
            <TagsEditor
              tags={tags}
              onChange={setTags}
              disabled={isSubmitting}
            />
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
              className={theme.button.primary}
            >
              {isSubmitting ? uploadStatus || 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
