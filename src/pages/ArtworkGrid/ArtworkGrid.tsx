import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { SettingsIcon } from '../../components'
import { useAuth } from '../../contexts/AuthContext'
import { listArtworks } from '../../services/artwork-service/index'
import { theme } from '../../styles/theme'
import type { ArtworkListItem } from '../../types'

function ArtworkCard({
  artwork,
  index,
  isAdmin
}: {
  artwork: ArtworkListItem
  index: number
  isAdmin: boolean
}) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Stagger the animation start
    const timer = setTimeout(() => setIsVisible(true), index * 80)
    return () => clearTimeout(timer)
  }, [index])

  // Handle cached images that load before React attaches the onLoad handler
  const handleImageRef = (img: HTMLImageElement | null) => {
    if (img?.complete && !isLoaded) setIsLoaded(true)
  }

  return (
    <div
      className="relative group"
      style={{
        opacity: isVisible && isLoaded ? 1 : 0,
        transform: isVisible && isLoaded ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 0.5s ease-out, transform 0.5s ease-out'
      }}
    >
      <Link to={`/gallery/${artwork.slug}`} className="block aspect-square">
        <div className="w-full h-full overflow-hidden bg-white">
          <img
            ref={handleImageRef}
            src={artwork.heroImageUrl}
            alt={artwork.title}
            className={`${theme.image.cover} transition-transform duration-300 hover:scale-105`}
            onLoad={() => setIsLoaded(true)}
          />
        </div>
      </Link>
      {isAdmin && (
        <Link
          to={`/gallery/${artwork.slug}/edit`}
          className={theme.overlay.button}
        >
          Edit
        </Link>
      )}
    </div>
  )
}

export default function ArtworkGrid() {
  const [items, setItems] = useState<ArtworkListItem[]>([])
  const { isAdmin } = useAuth()

  useEffect(() => {
    let isMounted = true
    listArtworks()
      .then((data) => {
        if (isMounted) setItems(data)
      })
      .catch((err) => {
        console.error('[ArtworkGrid] Failed to load artworks:', err)
      })
    return () => {
      isMounted = false
    }
  }, [])

  return (
    <div>
      {isAdmin && (
        <div className={`p-4 border-b ${theme.border.default}`}>
          <Link
            to="/gallery/manage"
            className={`inline-flex items-center gap-2 ${theme.button.primary}`}
          >
            <SettingsIcon />
            Manage Artworks
          </Link>
        </div>
      )}
      <div className={theme.grid.gallery}>
        {items.map((artwork, index) => (
          <ArtworkCard
            key={artwork.id}
            artwork={artwork}
            index={index}
            isAdmin={isAdmin}
          />
        ))}
      </div>
    </div>
  )
}
