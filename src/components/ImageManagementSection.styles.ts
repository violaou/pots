export const styles = {
  container: 'space-y-4',

  // Upload area
  uploadArea:
    'border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-gray-400 dark:hover:border-gray-500 transition-colors cursor-pointer',
  uploadAreaDisabled: 'opacity-50 cursor-not-allowed',
  uploadText: 'text-gray-600 dark:text-gray-400 text-sm',
  uploadHint: 'text-xs text-gray-400 mt-1',
  fileInput: 'hidden',

  // Full-page drop overlay
  dropOverlay: 'fixed inset-0 z-50 bg-black/40 flex items-center justify-center pointer-events-none',
  dropOverlayContent: 'bg-soft-white dark:bg-neutral-900 rounded-lg p-12 flex flex-col items-center gap-4',
  dropOverlayIcon: 'w-8 h-8 text-gray-800 dark:text-gray-100',
  dropOverlayText: 'text-lg text-gray-800 dark:text-gray-100',

  // Image grid
  imageGrid: 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4',

  // Image card
  imageCard:
    'relative group border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-neutral-800',
  imageCardDeleted: 'opacity-40 border-red-300 dark:border-red-800',
  imageCardDragging: 'ring-2 ring-blue-500 shadow-lg',
  imageThumb: 'w-full h-32 object-cover',

  // Badges (base + variants)
  badge: 'absolute top-2 text-white text-xs px-2 py-1 rounded font-medium',
  badgeHero: 'left-2 bg-blue-600',
  badgeNew: 'left-16 bg-green-600',
  badgeNewOnly: 'left-2 bg-green-600',
  badgeDeleted: 'left-2 bg-red-600',

  // Overlay actions
  overlay:
    'absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all duration-200 flex items-center justify-center',
  overlayDeleted: 'absolute inset-0 bg-black/30 flex items-center justify-center',
  overlayActions:
    'opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col gap-2',
  actionButton:
    'px-3 py-1 bg-white dark:bg-neutral-800 text-gray-800 dark:text-gray-200 rounded text-xs font-medium hover:bg-gray-100 dark:hover:bg-neutral-700 shadow',

  // Remove button
  removeButton:
    'absolute top-2 right-2 bg-red-600 text-white w-6 h-6 rounded-full hover:bg-red-700 text-sm font-bold flex items-center justify-center',

  // Alt text input
  altInput: 'absolute bottom-0 left-0 right-0 bg-black/75 p-2 pr-10',
  altInputField:
    'w-full bg-transparent text-white placeholder-gray-400 text-xs border-none focus:outline-none focus:ring-0',

  // Drag handle
  dragHandle:
    'absolute bottom-1 right-1 text-white bg-black/50 rounded p-1 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity z-10',

  // Error
  error: 'text-red-600 dark:text-red-400 text-sm mt-2'
} as const

