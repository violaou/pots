import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { listArtworks } from '../../services/artwork-service'
import type { ArtworkListItem } from '../../types'

export default function ArtworkGrid() {
  const [items, setItems] = useState<ArtworkListItem[]>([])

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
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4">
      {items.map((artwork) => (
        <Link
          key={artwork.id}
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
      ))}
    </div>
  )
}
