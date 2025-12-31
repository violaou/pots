import { ArrowLeft } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { ConfirmationModal } from '../../components/ConfirmationModal'
import { useAuth } from '../../contexts/AuthContext'
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

function HeroAndRelatedImages({ images }: { images: ArtworkImage[] }) {
  const ordered = useMemo(() => sortArtworkImages(images), [images])

  if (!ordered.length) return null
  const [hero, ...rest] = ordered

  return (
    <div className="space-y-6">
      <div className="aspect-square bg-white">
        <img
          src={hero.imageUrl}
          alt={hero.alt ?? ''}
          className="w-full h-full object-cover"
        />
      </div>
      {rest.length ? (
        <div className="grid grid-cols-2 gap-4">
          {rest.map((img) => (
            <div key={img.id} className="aspect-square bg-white">
              <img
                src={img.imageUrl}
                alt={img.alt ?? ''}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
      ) : null}
    </div>
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
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const { isAdmin } = useAuth()

  useEffect(() => {
    if (!slug) return
    let isMounted = true
    getArtworkWithImages(slug).then((data) => {
      if (isMounted) setArtwork(data)
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
        <button
          onClick={() => navigate(-1)}
          className={`${theme.backLink} mb-8`}
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back
        </button>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <HeroAndRelatedImages images={artwork.images} />
          </div>

          <div className="space-y-6">
            <h1 className={`text-2xl font-medium ${theme.text.h1}`}>
              {artwork.title}
            </h1>

            {isAdmin ? (
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
            ) : null}

            {artwork.description ? (
              <p className={theme.text.muted}>{artwork.description}</p>
            ) : null}

            <div className="space-y-4 pt-4">
              {artwork.materials ? (
                <DetailRow label="Materials" value={artwork.materials} />
              ) : null}
              {typeof artwork.cone === 'number' ? (
                <DetailRow label="Firing Cone" value={`cone ${artwork.cone}`} />
              ) : null}
              {/* <DetailRow
                label="Microwave Safe"
                value={artwork.isMicrowaveSafe ? 'Yes' : 'No'}
              /> */}
            </div>
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
