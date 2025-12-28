import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { useAuth } from '../../contexts/AuthContext'
import { listArtworks } from '../../services/artwork-service'
import type { ArtworkListItem } from '../../types'

export default function ArtworkGrid() {
  const [items, setItems] = useState<ArtworkListItem[]>([])
  const { isAdmin } = useAuth()

  useEffect(() => {
    let isMounted = true
    listArtworks().then((data) => {
      if (isMounted) setItems(data)
    })
    return () => {
      isMounted = false
    }
  }, [])

  return (
    <div>
      {isAdmin && (
        <div className="p-4 border-b">
          <Link
            to="/gallery/manage"
            className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"
              />
            </svg>
            Manage Artworks
          </Link>
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4">
        {items.map((artwork) => (
          <div key={artwork.id} className="relative group">
            <Link
              to={`/gallery/${artwork.slug}`}
              className="block aspect-square"
            >
              <div className="w-full h-full overflow-hidden">
                <img
                  src={artwork.heroImageUrl}
                  alt={artwork.title}
                  className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                />
              </div>
            </Link>
            {isAdmin && (
              <Link
                to={`/gallery/${artwork.slug}/edit`}
                className="absolute top-2 right-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-opacity-90"
              >
                Edit
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
