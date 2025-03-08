import React from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { artworks } from '../assets/artworks'

export const ArtworkDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const artwork = artworks.find((a) => a.id === id)

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
        <Link
          to="/"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-8"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back
        </Link>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="aspect-square bg-gray-50">
            <img
              src={artwork.imageUrl}
              alt={artwork.title}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="space-y-6">
            <h1 className="text-2xl font-medium text-gray-900">
              {artwork.title}
            </h1>
            <p className="text-gray-600">{artwork.description}</p>

            <div className="space-y-4 pt-4">
              <div className="flex justify-between py-2 border-t border-gray-100">
                <span className="text-gray-500">Year</span>
                <span>{artwork.year}</span>
              </div>
              <div className="flex justify-between py-2 border-t border-gray-100">
                <span className="text-gray-500">Medium</span>
                <span>{artwork.medium}</span>
              </div>
              <div className="flex justify-between py-2 border-t border-gray-100">
                <span className="text-gray-500">Dimensions</span>
                <span>{artwork.dimensions}</span>
              </div>
              {artwork.price && (
                <div className="flex justify-between py-2 border-t border-gray-100">
                  <span className="text-gray-500">Price</span>
                  <span>{artwork.price}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
