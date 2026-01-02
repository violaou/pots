import type { DragEvent } from 'react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import {
  ConfirmationModal,
  DeleteIcon,
  DragIcon,
  SpinnerIcon
} from '../../components'
import { useAuth } from '../../contexts/AuthContext'
import {
  deleteArtwork,
  listAllArtworks,
  updateArtwork,
  updateArtworkSortOrder
} from '../../services/artwork-service/index'
import { theme } from '../../styles/theme'
import type { ArtworkListItem } from '../../types'

// Drag-specific styles (unique to this component)
const dragStyles = {
  cardBase: `relative group border ${theme.border.default} ${theme.bg.card} rounded-lg overflow-hidden cursor-move transition-all duration-200`,
  cardUnpublished: 'ring-2 ring-yellow-500 ring-offset-2 ring-offset-stone-900',
  cardDragging: 'opacity-30 scale-95 rotate-2 shadow-2xl z-10',
  cardDropTarget: 'ring-2 ring-blue-500 ring-opacity-50 scale-105 shadow-xl',
  cardHover: 'hover:shadow-lg hover:scale-105',
  unpublishedBadge:
    'absolute top-2 left-2 bg-yellow-500 text-black px-2 py-0.5 rounded text-xs font-medium z-10',
  dragHandle:
    'absolute bottom-2 right-2 bg-black bg-opacity-75 text-white p-1 rounded transition-all duration-200',
  dragHandleVisible: 'opacity-100 scale-110',
  dragHandleHidden: 'opacity-0 group-hover:opacity-100',
  dropZone:
    'absolute inset-0 bg-blue-500 bg-opacity-20 border-2 border-blue-500 border-dashed rounded-lg flex items-center justify-center',
  dropBadge:
    'bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium',
  editButton:
    'absolute top-2 right-10 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-opacity-90',
  hideButton:
    'absolute top-2 right-20 bg-yellow-500 text-black px-2 py-1 rounded text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-yellow-400',
  cardTitle: `font-medium text-sm truncate ${theme.text.h1}`
} as const

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
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [artworkToDelete, setArtworkToDelete] =
    useState<ArtworkListItem | null>(null)
  const [loadingArtworks, setLoadingArtworks] = useState(true)
  const { isAdmin, loading: authLoading, adminLoading } = useAuth()

  useEffect(() => {
    // Wait for auth to be ready before fetching
    if (authLoading || adminLoading) return
    if (!isAdmin) return

    let isMounted = true
    setLoadingArtworks(true)

    listAllArtworks()
      .then((data) => {
        if (isMounted) {
          setItems(data)
        }
      })
      .catch((err) => {
        console.error('[EditArtworkGrid] Failed to load artworks:', err)
      })
      .finally(() => {
        if (isMounted) setLoadingArtworks(false)
      })

    return () => {
      isMounted = false
    }
  }, [authLoading, adminLoading, isAdmin])

  // Drag and drop handlers
  const handleDragStart = useCallback((e: DragEvent, itemId: string) => {
    setDraggedItem(itemId)
    e.dataTransfer.effectAllowed = 'move'

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

  const handleDragLeave = useCallback(() => setDragOverItem(null), [])

  const handleDragEnd = useCallback(() => {
    setDraggedItem(null)
    setDragOverItem(null)
  }, [])

  const handleDrop = useCallback(
    async (e: DragEvent, targetId: string) => {
      e.preventDefault()
      if (!draggedItem || draggedItem === targetId) return

      const newItems = [...items]
      const draggedIndex = newItems.findIndex((item) => item.id === draggedItem)
      const targetIndex = newItems.findIndex((item) => item.id === targetId)

      if (draggedIndex === -1 || targetIndex === -1) return

      // Reorder items
      const [draggedItemData] = newItems.splice(draggedIndex, 1)
      newItems.splice(targetIndex, 0, draggedItemData)

      // Update sort order locally
      const updatedItems = newItems.map((item, index) => ({
        ...item,
        sortOrder: index
      }))
      setItems(updatedItems)
      setDraggedItem(null)
      setDragOverItem(null)

      // Save to database
      try {
        await updateArtworkSortOrder(
          updatedItems.map((item, index) => ({ id: item.id, sortOrder: index }))
        )
      } catch (error) {
        console.error('Failed to save sort order:', error)
        // Revert on failure
        setItems(items)
      }
    },
    [draggedItem, items]
  )

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

  const handleToggleVisibility = useCallback(
    async (artwork: ArtworkListItem) => {
      setTogglingId(artwork.id)
      try {
        const newPublished = !artwork.isPublished
        await updateArtwork(artwork.slug, { isPublished: newPublished })
        setItems((prev) =>
          prev.map((item) =>
            item.id === artwork.id
              ? { ...item, isPublished: newPublished }
              : item
          )
        )
      } catch (error) {
        console.error('Failed to toggle visibility:', error)
        alert('Failed to update artwork visibility. Please try again.')
      } finally {
        setTogglingId(null)
      }
    },
    []
  )

  const getCardClassName = (artwork: ArtworkListItem) => {
    const isDragging = draggedItem === artwork.id
    const isDropTarget = dragOverItem === artwork.id && !isDragging

    const stateClass = isDragging
      ? dragStyles.cardDragging
      : isDropTarget
        ? dragStyles.cardDropTarget
        : dragStyles.cardHover

    const classes = [
      dragStyles.cardBase,
      stateClass,
      !artwork.isPublished && dragStyles.cardUnpublished
    ]

    return classes.filter(Boolean).join(' ')
  }

  const getDragHandleClassName = (artworkId: string) => {
    const isDragging = draggedItem === artworkId
    const classes = [
      dragStyles.dragHandle,
      isDragging ? dragStyles.dragHandleVisible : dragStyles.dragHandleHidden
    ]
    return classes.join(' ')
  }

  if (authLoading || adminLoading || loadingArtworks) {
    return (
      <div className={theme.layout.pageCenter}>
        <p className={theme.text.muted}>Loading...</p>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className={theme.layout.pageCenter}>
        <p className={theme.text.muted}>
          Access denied. Admin privileges required.
        </p>
      </div>
    )
  }

  return (
    <div className={theme.layout.page}>
      <div className={theme.layout.containerFull}>
        <div className={theme.layout.header}>
          <div>
            <h1 className={`text-2xl font-medium ${theme.text.h1}`}>
              Manage Artworks
            </h1>
            <p className={theme.text.muted}>
              Drag to reorder • Click delete to remove
            </p>
          </div>
          <div className="flex space-x-2">
            <Link to="/gallery/add" className={theme.button.accent}>
              Add Artwork
            </Link>
            <Link to="/gallery" className={theme.button.secondary}>
              Back to Gallery
            </Link>
          </div>
        </div>

        <div className={theme.grid.manage}>
          {items.map((artwork, index) => {
            const isToggling = togglingId === artwork.id
            const isDeleting = deletingId === artwork.id
            const isDropTarget =
              dragOverItem === artwork.id && draggedItem !== artwork.id

            return (
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
                <div className={theme.image.square}>
                  <img
                    src={artwork.heroImageUrl}
                    alt={artwork.title}
                    className={theme.image.cover}
                  />
                </div>

                {!artwork.isPublished && (
                  <div className={dragStyles.unpublishedBadge}>Hidden</div>
                )}

                <div className={theme.overlay.badge}>#{index + 1}</div>

                <button
                  onClick={() => handleToggleVisibility(artwork)}
                  disabled={isToggling}
                  className={dragStyles.hideButton}
                  title={
                    artwork.isPublished
                      ? 'Hide from gallery'
                      : 'Show in gallery'
                  }
                >
                  {isToggling ? '...' : artwork.isPublished ? 'Hide' : 'Show'}
                </button>

                <Link
                  to={`/gallery/${artwork.slug}/edit`}
                  className={dragStyles.editButton}
                  onClick={(e) => e.stopPropagation()}
                >
                  Edit
                </Link>

                <button
                  onClick={() => handleDeleteClick(artwork)}
                  disabled={isDeleting}
                  className={theme.overlay.deleteButton}
                  title="Delete artwork"
                >
                  {isDeleting ? <SpinnerIcon /> : <DeleteIcon />}
                </button>

                <div className={getDragHandleClassName(artwork.id)}>
                  <DragIcon />
                </div>

                {isDropTarget && (
                  <div className={dragStyles.dropZone}>
                    <div className={dragStyles.dropBadge}>Drop here</div>
                  </div>
                )}

                <div className="p-3">
                  <h3 className={dragStyles.cardTitle}>{artwork.title}</h3>
                </div>
              </div>
            )
          })}
        </div>

        {items.length === 0 && (
          <div className={theme.state.empty}>
            <p className={theme.state.emptyText}>No artworks found.</p>
          </div>
        )}
      </div>

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
