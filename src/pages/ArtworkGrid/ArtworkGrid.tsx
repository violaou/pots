import { motion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { SettingsIcon } from '../../components'
import { useAuth } from '../../contexts/AuthContext'
import { listArtworksPaginated } from '../../services/artwork-service/index'
import { theme } from '../../styles/theme'
import type { ArtworkListItem } from '../../types'

const GAP = 16 // gap-4 = 16px
const PADDING = 16 // p-4 = 16px

function getGridConfig(containerWidth: number) {
  // Calculate card size and columns based on viewport width
  // Always show minimum 2 columns
  const availableWidth = containerWidth - PADDING * 2
  const minColumns = 2

  let cardSize: number
  if (containerWidth >= 1600) cardSize = 500
  else if (containerWidth >= 1200) cardSize = 400
  else if (containerWidth >= 900) cardSize = 350
  else if (containerWidth >= 600) cardSize = 300
  else {
    // For narrow screens, calculate card size to fit 2 columns
    cardSize = Math.floor((availableWidth - GAP) / minColumns)
  }

  const columns = Math.max(
    minColumns,
    Math.floor((availableWidth + GAP) / (cardSize + GAP))
  )

  return { cardSize, columns }
}

function ArtworkCard({
  artwork,
  animationIndex,
  isAdmin,
  size,
  x,
  y
}: {
  artwork: ArtworkListItem
  animationIndex: number // Index relative to when item was loaded (for stagger animation)
  isAdmin: boolean
  size: number
  x: number
  y: number
}) {
  const [isLoaded, setIsLoaded] = useState(false)

  const handleImageRef = (img: HTMLImageElement | null) => {
    if (img?.complete && !isLoaded) setIsLoaded(true)
  }

  // Only apply stagger delay for newly loaded items (animationIndex >= 0)
  // Items from previous loads get animationIndex < 0 and no delay
  const staggerDelay = animationIndex >= 0 ? animationIndex * 0.05 : 0

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
        opacity: { duration: 0.4, delay: staggerDelay },
        scale: { duration: 0.4, delay: staggerDelay },
        x: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] },
        y: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] },
        width: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] },
        height: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }
      }}
      className="absolute top-0 left-0 group"
    >
      <Link to={`/gallery/${artwork.slug}`} className="block w-full h-full">
        <div className="w-full h-full overflow-hidden rounded-lg">
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
  const [hasMore, setHasMore] = useState(true)
  const [nextOffset, setNextOffset] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [loadedCount, setLoadedCount] = useState(0) // Track how many items were in previous loads for animation offset
  const containerRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const isLoadingRef = useRef(false) // Ref to guard against race conditions
  const initialLoadDone = useRef(false) // Track if initial load completed
  const { isAdmin } = useAuth()

  const loadMore = useCallback(async () => {
    // Use ref to guard against duplicate calls from race conditions
    if (isLoadingRef.current || !hasMore) return

    isLoadingRef.current = true
    setIsLoading(true)
    try {
      const result = await listArtworksPaginated(nextOffset)
      setItems((prev) => {
        setLoadedCount(prev.length) // Store current count before adding new items
        return [...prev, ...result.items]
      })
      setHasMore(result.hasMore)
      setNextOffset(result.nextOffset)
    } catch (err) {
      console.error('[ArtworkGrid] Failed to load artworks:', err)
    } finally {
      isLoadingRef.current = false
      setIsLoading(false)
    }
  }, [nextOffset, hasMore])

  // Initial load
  useEffect(() => {
    loadMore().then(() => {
      // Small delay to let the grid render before enabling observer-triggered loads
      setTimeout(() => {
        initialLoadDone.current = true
      }, 100)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Infinite scroll with Intersection Observer
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        // Only trigger loads after initial load is complete
        if (
          entries[0].isIntersecting &&
          hasMore &&
          !isLoading &&
          initialLoadDone.current
        ) {
          loadMore()
        }
      },
      { threshold: 0.1 } // Trigger when sentinel is 10% visible (no rootMargin to prevent eager loading)
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, isLoading, loadMore])

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
              animationIndex={index - loadedCount} // Negative for old items, 0+ for new items
              isAdmin={isAdmin}
              size={cardSize}
              x={positions[index]?.x ?? 0}
              y={positions[index]?.y ?? 0}
            />
          ))}
        </div>
      )}
      {/* Sentinel element for infinite scroll */}
      <div ref={sentinelRef} className="h-4" />
      {isLoading && (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-2 border-current border-t-transparent rounded-full animate-spin opacity-50" />
        </div>
      )}
    </div>
  )
}
