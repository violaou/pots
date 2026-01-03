import { ArrowLeft } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { ConfirmationModal } from '../../components/ConfirmationModal'
import { useAuth } from '../../contexts/AuthContext'
import { isVideoFile } from '../../hooks/useImageUpload'
import {
  deleteArtwork,
  getArtworkWithImages
} from '../../services/artwork-service/index'
import { theme } from '../../styles/theme'
import type { Artwork, ArtworkImage } from '../../types'

/**
 * Sort the artwork images by their sort order,
 * with the hero image first, then the rest by sort order.
 */
function sortArtworkImages(images: ArtworkImage[]): ArtworkImage[] {
  return [...images].sort((a, b) => {
    if (a.isHero && !b.isHero) return -1
    if (!a.isHero && b.isHero) return 1
    return a.sortOrder - b.sortOrder
  })
}

/**
 * Renders either an image or video element based on file type
 */
function MediaElement({
  img,
  className,
  onLoad,
  showControls = false
}: {
  img: ArtworkImage
  className: string
  onLoad?: () => void
  showControls?: boolean
}) {
  if (isVideoFile(img.imageUrl)) {
    return (
      <video
        src={img.imageUrl}
        className={className}
        loop
        muted
        autoPlay
        playsInline
        controls={showControls}
        onLoadedData={onLoad}
      />
    )
  }

  return (
    <img
      src={img.imageUrl}
      alt={img.alt ?? ''}
      className={className}
      onLoad={onLoad}
    />
  )
}

function ImageGallery({ images }: { images: ArtworkImage[] }) {
  const ordered = useMemo(() => sortArtworkImages(images), [images])
  const [selectedImage, setSelectedImage] = useState<ArtworkImage | null>(null)
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set())

  const closeLightbox = useCallback(() => setSelectedImage(null), [])

  const handleImageLoad = useCallback((id: string) => {
    setLoadedImages((prev) => new Set(prev).add(id))
  }, [])

  // Close on Escape key
  useEffect(() => {
    if (!selectedImage) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [selectedImage, closeLightbox])

  if (!ordered.length) return null

  return (
    <>
      <div className="space-y-4">
        {ordered.map((img) => (
          <div
            key={img.id}
            className="aspect-square bg-neutral-100 dark:bg-neutral-800 cursor-pointer"
            onClick={() => setSelectedImage(img)}
          >
            <MediaElement
              img={img}
              className={`w-full h-full object-cover img-fade ${loadedImages.has(img.id) ? 'loaded' : ''}`}
              onLoad={() => handleImageLoad(img.id)}
            />
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setSelectedImage(null)}
        >
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 text-white text-3xl font-light hover:text-gray-300 z-10"
            aria-label="Close"
          >
            ×
          </button>
          <div onClick={(e) => e.stopPropagation()}>
            <MediaElement
              img={selectedImage}
              className="max-h-[90vh] max-w-[1000px] w-[80vw] object-contain bg-white"
              showControls={isVideoFile(selectedImage.imageUrl)}
            />
          </div>
        </div>
      )}
    </>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className={theme.detailRow}>
      <span className={theme.text.subtle}>{label}</span>
      <span className={theme.text.h1}>{value}</span>
    </div>
  )
}

export function ArtworkDetail() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [artwork, setArtwork] = useState<Artwork | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const { isAdmin } = useAuth()

  useEffect(() => {
    if (!slug) return
    let isMounted = true
    setIsLoading(true)
    getArtworkWithImages(slug)
      .then((data) => {
        if (isMounted) setArtwork(data)
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })
    return () => {
      isMounted = false
    }
  }, [slug])

  const handleDelete = async () => {
    if (!slug) return
    setIsDeleting(true)
    try {
      await deleteArtwork(slug)
      navigate('/gallery')
    } catch (err) {
      console.error('Delete failed', err)
      alert('Failed to delete artwork')
    } finally {
      setIsDeleting(false)
      setShowDeleteModal(false)
    }
  }

  // Show nothing while loading to prevent flash
  if (isLoading) return null

  if (!artwork) {
    return (
      <div className={theme.layout.pageCenter}>
        <p className={`text-lg ${theme.text.muted}`}>Artwork not found</p>
      </div>
    )
  }

  return (
    <div className={theme.layout.page}>
      <div className={theme.layout.containerWide}>
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <ImageGallery images={artwork.images} />
          </div>

          <div className="relative">
            <div className="md:sticky md:top-8 space-y-6">
              <button onClick={() => navigate(-1)} className={theme.backLink}>
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back
              </button>

              <h1 className={`text-2xl font-medium ${theme.text.h1}`}>
                {artwork.title}
              </h1>

              {isAdmin && (
                <div className="flex items-center gap-3">
                  <Link
                    to={`/gallery/${artwork.slug}/edit`}
                    className={theme.button.sm.secondary}
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className={theme.button.sm.danger}
                  >
                    Delete
                  </button>
                </div>
              )}

              {artwork.description && (
                <p className={theme.text.muted}>{artwork.description}</p>
              )}
            </div>

            {(artwork.materials || typeof artwork.cone === 'number') && (
              <div className="md:fixed md:bottom-8 md:w-80 space-y-2 mt-8 md:mt-0">
                {artwork.materials && (
                  <DetailRow label="Materials" value={artwork.materials} />
                )}
                {typeof artwork.cone === 'number' && (
                  <DetailRow
                    label="Firing Cone"
                    value={`cone ${artwork.cone}`}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Artwork"
        message="Are you sure you want to delete this artwork? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        isDestructive={true}
        isLoading={isDeleting}
      />
    </div>
  )
}
