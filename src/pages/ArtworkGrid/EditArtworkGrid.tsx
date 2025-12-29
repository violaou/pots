import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { DragEvent } from 'react'

import {
  ConfirmationModal,
  DeleteIcon,
  DragIcon,
  SpinnerIcon
} from '../../components'
import { useAuth } from '../../contexts/AuthContext'
import { deleteArtwork, listArtworks } from '../../services/artwork-service'
import type { ArtworkListItem } from '../../types'

// Styling constants
const STYLES = {
  container: 'min-h-screen py-8',
  content: 'max-w-6xl mx-auto px-4',
  header: 'flex justify-between items-center mb-6',
  title: 'text-2xl font-medium',
  subtitle: 'text-gray-600 dark:text-gray-400 mt-1',
  backButton:
    'px-4 py-2 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800',
  grid: 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4',

  // Artwork card states
  cardBase:
    'relative group border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg overflow-hidden cursor-move transition-all duration-200',
  cardDragging: 'opacity-30 scale-95 rotate-2 shadow-2xl z-10',
  cardDropTarget: 'ring-2 ring-blue-500 ring-opacity-50 scale-105 shadow-xl',
  cardHover: 'hover:shadow-lg hover:scale-105',

  // Image container
  imageContainer: 'aspect-square overflow-hidden',
  image: 'w-full h-full object-cover',

  // Order indicator
  orderBadge:
    'absolute top-2 left-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded',

  // Delete button
  deleteButton:
    'absolute top-2 right-2 bg-red-600 bg-opacity-90 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-opacity-100 disabled:opacity-50',
  deleteIcon: 'w-4 h-4',
  spinnerIcon: 'w-4 h-4 animate-spin',

  // Drag handle
  dragHandle:
    'absolute bottom-2 right-2 bg-black bg-opacity-75 text-white p-1 rounded transition-all duration-200',
  dragHandleVisible: 'opacity-100 scale-110',
  dragHandleHidden: 'opacity-0 group-hover:opacity-100',
  dragIcon: 'w-4 h-4',

  // Drop zone
  dropZone:
    'absolute inset-0 bg-blue-500 bg-opacity-20 border-2 border-blue-500 border-dashed rounded-lg flex items-center justify-center',
  dropBadge:
    'bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium',

  // Card content
  cardContent: 'p-3',
  cardTitle: 'font-medium text-sm truncate',

  // Empty state
  emptyState: 'text-center py-12',
  emptyText: 'text-gray-500 dark:text-gray-400',

  // Access denied
  accessDenied: 'min-h-screen flex items-center justify-center',
  accessDeniedText: 'text-lg text-gray-600 dark:text-gray-400'
} as const

// Drag image configuration
const DRAG_IMAGE_CONFIG = {
  size: '200px',
  offset: { x: 100, y: 100 },
  styles: {
    position: 'absolute',
    top: '-1000px',
    left: '-1000px',
    transform: 'rotate(5deg)',
    opacity: '0.8',
    pointerEvents: 'none',
    zIndex: '9999'
  }
} as const

export default function EditArtworkGrid() {
  const [items, setItems] = useState<ArtworkListItem[]>([])
  const [draggedItem, setDraggedItem] = useState<string | null>(null)
  const [dragOverItem, setDragOverItem] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [artworkToDelete, setArtworkToDelete] =
    useState<ArtworkListItem | null>(null)
  const { isAdmin } = useAuth()

  // Load artworks on mount
  useEffect(() => {
    let isMounted = true
    listArtworks().then((data) => {
      if (isMounted) {
        const sortedData = [...data].sort((a, b) => {
          const aOrder = a.sortOrder ?? 0
          const bOrder = b.sortOrder ?? 0
          return aOrder - bOrder
        })
        setItems(sortedData)
      }
    })
    return () => {
      isMounted = false
    }
  }, [])

  // Drag and drop handlers
  const handleDragStart = useCallback((e: DragEvent, itemId: string) => {
    setDraggedItem(itemId)
    e.dataTransfer.effectAllowed = 'move'

    // Create custom drag image
    const dragImage = e.currentTarget.cloneNode(true) as HTMLElement
    Object.assign(dragImage.style, {
      ...DRAG_IMAGE_CONFIG.styles,
      width: DRAG_IMAGE_CONFIG.size,
      height: DRAG_IMAGE_CONFIG.size
    })

    // Scale image properly
    const img = dragImage.querySelector('img')
    if (img) {
      Object.assign(img.style, {
        width: '100%',
        height: '100%',
        objectFit: 'cover'
      })
    }

    document.body.appendChild(dragImage)
    e.dataTransfer.setDragImage(
      dragImage,
      DRAG_IMAGE_CONFIG.offset.x,
      DRAG_IMAGE_CONFIG.offset.y
    )
    setTimeout(() => document.body.removeChild(dragImage), 0)
  }, [])

  const handleDragOver = useCallback((e: DragEvent, targetId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverItem(targetId)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOverItem(null)
  }, [])

  const handleDragEnd = useCallback(() => {
    setDraggedItem(null)
    setDragOverItem(null)
  }, [])

  const handleDrop = useCallback(
    (e: DragEvent, targetId: string) => {
      e.preventDefault()
      if (!draggedItem || draggedItem === targetId) return

      const newItems = [...items]
      const draggedIndex = newItems.findIndex((item) => item.id === draggedItem)
      const targetIndex = newItems.findIndex((item) => item.id === targetId)

      if (draggedIndex === -1 || targetIndex === -1) return

      // Reorder items
      const [draggedItemData] = newItems.splice(draggedIndex, 1)
      newItems.splice(targetIndex, 0, draggedItemData)

      // Update sort order
      const updatedItems = newItems.map((item, index) => ({
        ...item,
        sortOrder: index
      }))

      setItems(updatedItems)
      setDraggedItem(null)
      setDragOverItem(null)

      // Note: Reorder is UI-only for now (not persisted to database)
    },
    [draggedItem, items]
  )

  // Delete handlers
  const handleDeleteClick = useCallback((item: ArtworkListItem) => {
    setArtworkToDelete(item)
    setShowDeleteModal(true)
  }, [])

  const handleDeleteConfirm = useCallback(async () => {
    if (!artworkToDelete) return

    setDeletingId(artworkToDelete.id)
    try {
      await deleteArtwork(artworkToDelete.slug)
      setItems((prev) => prev.filter((i) => i.id !== artworkToDelete.id))
      setShowDeleteModal(false)
      setArtworkToDelete(null)
    } catch (error) {
      console.error('Failed to delete artwork:', error)
      alert('Failed to delete artwork. Please try again.')
    } finally {
      setDeletingId(null)
    }
  }, [artworkToDelete])

  const handleDeleteCancel = useCallback(() => {
    setShowDeleteModal(false)
    setArtworkToDelete(null)
  }, [])

  const getCardClassName = (artwork: ArtworkListItem) => {
    const baseClass = STYLES.cardBase
    if (draggedItem === artwork.id) {
      return `${baseClass} ${STYLES.cardDragging}`
    }
    if (dragOverItem === artwork.id && draggedItem !== artwork.id) {
      return `${baseClass} ${STYLES.cardDropTarget}`
    }
    return `${baseClass} ${STYLES.cardHover}`
  }

  const getDragHandleClassName = (artwork: ArtworkListItem) => {
    const baseClass = STYLES.dragHandle
    const visibilityClass =
      draggedItem === artwork.id
        ? STYLES.dragHandleVisible
        : STYLES.dragHandleHidden
    return `${baseClass} ${visibilityClass}`
  }

  // Access control
  if (!isAdmin) {
    return (
      <div className={STYLES.accessDenied}>
        <p className={STYLES.accessDeniedText}>
          Access denied. Admin privileges required.
        </p>
      </div>
    )
  }

  return (
    <div className={STYLES.container}>
      <div className={STYLES.content}>
        {/* Header */}
        <div className={STYLES.header}>
          <div>
            <h1 className={STYLES.title}>Manage Artworks</h1>
            <p className={STYLES.subtitle}>
              Drag to reorder • Click delete to remove
            </p>
          </div>
          <div className="flex space-x-2">
            <Link
              to="/gallery/add"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Add Artwork
            </Link>
            <Link to="/gallery" className={STYLES.backButton}>
              Back to Gallery
            </Link>
          </div>
        </div>

        {/* Artwork Grid */}
        <div className={STYLES.grid}>
          {items.map((artwork, index) => (
            <div
              key={artwork.id}
              draggable
              onDragStart={(e) => handleDragStart(e, artwork.id)}
              onDragOver={(e) => handleDragOver(e, artwork.id)}
              onDragLeave={handleDragLeave}
              onDragEnd={handleDragEnd}
              onDrop={(e) => handleDrop(e, artwork.id)}
              className={getCardClassName(artwork)}
            >
              {/* Image */}
              <div className={STYLES.imageContainer}>
                <img
                  src={artwork.heroImageUrl}
                  alt={artwork.title}
                  className={STYLES.image}
                />
              </div>

              {/* Order Badge */}
              <div className={STYLES.orderBadge}>#{index + 1}</div>

              {/* Delete Button */}
              <button
                onClick={() => handleDeleteClick(artwork)}
                disabled={deletingId === artwork.id}
                className={STYLES.deleteButton}
                title="Delete artwork"
              >
                {deletingId === artwork.id ? (
                  <SpinnerIcon className={STYLES.spinnerIcon} />
                ) : (
                  <DeleteIcon className={STYLES.deleteIcon} />
                )}
              </button>

              {/* Drag Handle */}
              <div className={getDragHandleClassName(artwork)}>
                <DragIcon className={STYLES.dragIcon} />
              </div>

              {/* Drop Zone Indicator */}
              {dragOverItem === artwork.id && draggedItem !== artwork.id && (
                <div className={STYLES.dropZone}>
                  <div className={STYLES.dropBadge}>Drop here</div>
                </div>
              )}

              {/* Card Content */}
              <div className={STYLES.cardContent}>
                <h3 className={STYLES.cardTitle}>{artwork.title}</h3>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {items.length === 0 && (
          <div className={STYLES.emptyState}>
            <p className={STYLES.emptyText}>No artworks found.</p>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Artwork"
        message={`Are you sure you want to delete "${artworkToDelete?.title}"? This action cannot be undone and will permanently remove the artwork from your gallery.`}
        confirmText="Delete Artwork"
        cancelText="Cancel"
        isDestructive={true}
        isLoading={deletingId === artworkToDelete?.id}
      />
    </div>
  )
}
