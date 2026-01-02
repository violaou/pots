import { motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { SettingsIcon } from '../../components'
import { useAuth } from '../../contexts/AuthContext'
import { listArtworks } from '../../services/artwork-service/index'
import { theme } from '../../styles/theme'
import type { ArtworkListItem } from '../../types'

const GAP = 16 // gap-4 = 16px
const PADDING = 16 // p-4 = 16px

// Calculate card size and columns based on viewport width
function getGridConfig(containerWidth: number) {
  let cardSize: number
  if (containerWidth >= 1600) cardSize = 500
  else if (containerWidth >= 1200) cardSize = 400
  else if (containerWidth >= 900) cardSize = 350
  else if (containerWidth >= 600) cardSize = 300
  else cardSize = Math.min((containerWidth - GAP) / 2, 300)

  const availableWidth = containerWidth - PADDING * 2
  const columns = Math.max(
    1,
    Math.floor((availableWidth + GAP) / (cardSize + GAP))
  )

  return { cardSize, columns }
}

function ArtworkCard({
  artwork,
  index,
  isAdmin,
  size,
  x,
  y
}: {
  artwork: ArtworkListItem
  index: number
  isAdmin: boolean
  size: number
  x: number
  y: number
}) {
  const [isLoaded, setIsLoaded] = useState(false)

  const handleImageRef = (img: HTMLImageElement | null) => {
    if (img?.complete && !isLoaded) setIsLoaded(true)
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, x, y, width: size, height: size }}
      animate={{
        opacity: isLoaded ? 1 : 0,
        scale: isLoaded ? 1 : 0.9,
        x,
        y,
        width: size,
        height: size
      }}
      transition={{
        opacity: { duration: 0.4, delay: index * 0.05 },
        scale: { duration: 0.4, delay: index * 0.05 },
        x: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] },
        y: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] },
        width: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] },
        height: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }
      }}
      className="absolute top-0 left-0 group"
    >
      <Link to={`/gallery/${artwork.slug}`} className="block w-full h-full">
        <div className="w-full h-full overflow-hidden bg-white rounded-lg">
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
    </motion.div>
  )
}

export default function ArtworkGrid() {
  const [items, setItems] = useState<ArtworkListItem[]>([])
  const [containerWidth, setContainerWidth] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
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

  // Measure actual container width
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const updateWidth = () => {
      setContainerWidth(container.offsetWidth)
    }

    updateWidth()

    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(updateWidth)
    })
    resizeObserver.observe(container)

    return () => resizeObserver.disconnect()
  }, [])

  const { cardSize, columns } = getGridConfig(containerWidth)

  // Calculate positions for each card
  const positions = useMemo(() => {
    const totalGridWidth = columns * cardSize + (columns - 1) * GAP
    const startX = (containerWidth - totalGridWidth) / 2

    return items.map((_, index) => {
      const col = index % columns
      const row = Math.floor(index / columns)
      return {
        x: startX + col * (cardSize + GAP),
        y: PADDING + row * (cardSize + GAP)
      }
    })
  }, [items.length, columns, cardSize, containerWidth])

  const rows = Math.ceil(items.length / columns)
  const gridHeight = rows * cardSize + (rows - 1) * GAP + PADDING * 2

  return (
    <div ref={containerRef}>
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
      {containerWidth > 0 && (
        <div className="relative" style={{ height: gridHeight }}>
          {items.map((artwork, index) => (
            <ArtworkCard
              key={artwork.id}
              artwork={artwork}
              index={index}
              isAdmin={isAdmin}
              size={cardSize}
              x={positions[index]?.x ?? 0}
              y={positions[index]?.y ?? 0}
            />
          ))}
        </div>
      )}
    </div>
  )
}
