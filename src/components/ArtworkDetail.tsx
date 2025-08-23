import { ArrowLeft } from 'lucide-react'
import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import {
  deleteArtwork,
  getArtworkWithImages
} from '../services/artwork-service'
import type { Artwork, ArtworkImage } from '../types'
import { useAuth } from '../contexts/AuthContext'

export const ArtworkDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [artwork, setArtwork] = useState<Artwork | null>(null)
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

  if (!artwork) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg text-gray-600">Artwork not found</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-5xl mx-auto px-4">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-8"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back
        </button>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <HeroAndRelatedImages images={artwork.images} />
          </div>
          <div className="space-y-6">
            <h1 className="text-2xl font-medium text-gray-900">
              {artwork.title}
            </h1>
            {/* {isAdmin ? (
              <div className="flex items-center gap-3">
                <Link
                  to={`/gallery/${artwork.slug}/edit`}
                  className="px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-50"
                >
                  Edit
                </Link>
                <button
                  onClick={async () => {
                    if (!slug) return
                    const ok = window.confirm(
                      'Delete this artwork? This cannot be undone.'
                    )
                    if (!ok) return
                    try {
                      await deleteArtwork(slug)
                      navigate('/gallery')
                    } catch (err) {
                      console.error('Delete failed', err)
                      alert('Failed to delete artwork')
                    }
                  }}
                  className="px-3 py-1.5 rounded border border-red-300 text-red-600 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            ) : null} */}
            {artwork.description ? (
              <p className="text-gray-600">{artwork.description}</p>
            ) : null}
            <div className="space-y-4 pt-4">
              {/* {artwork.materials ? (
                <div className="flex justify-between py-2 border-t border-gray-100">
                  <span className="text-gray-500">Materials</span>
                  <span>{artwork.materials}</span>
                </div>
              ) : null}
              {typeof artwork.cone === 'number' ? (
                <div className="flex justify-between py-2 border-t border-gray-100">
                  <span className="text-gray-500">Firing Cone</span>
                  <span>cone {artwork.cone}</span>
                </div>
              ) : null} */}
              {/* <div className="flex justify-between py-2 border-t border-gray-100">
                <span className="text-gray-500">Microwave Safe</span>
                <span>{artwork.isMicrowaveSafe ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex justify-between py-2 border-t border-gray-100">
                <span className="text-gray-500">Dishwasher Safe</span>
                <span>{artwork.isDishwasherSafe ? 'Yes' : 'No'}</span>
              </div> */}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

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
  const ordered = useMemo(() => {
    return sortArtworkImages(images)
  }, [images])

  if (!ordered.length) return null
  const [hero, ...rest] = ordered

  return (
    <div className="space-y-6">
      <div className="aspect-square bg-gray-50">
        <img
          src={hero.imageUrl}
          alt={hero.alt ?? ''}
          className="w-full h-full object-cover"
        />
      </div>
      {rest.length ? (
        <div className="grid grid-cols-2 gap-4">
          {rest.map((img) => (
            <div key={img.id} className="aspect-square bg-gray-50">
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
