/**
 * Shared theme classes for consistent styling across the app.
 * Use these instead of hardcoding text/background colors.
 */
export const theme = {
  text: {
    // Headings
    h1: 'text-gray-900 dark:text-gray-100',
    h2: 'text-gray-800 dark:text-gray-100',
    h3: 'text-gray-800 dark:text-gray-100',

    // Body text
    body: 'text-gray-700 dark:text-gray-300',
    muted: 'text-gray-600 dark:text-gray-400',
    subtle: 'text-gray-500 dark:text-gray-400',

    // Interactive
    link: 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100',

    // States
    error: 'text-red-600 dark:text-red-400'
  },

  // Background styles
  bg: {
    card: 'bg-white dark:bg-neutral-800',
    input: 'bg-white dark:bg-neutral-900',
    muted: 'bg-neutral-50 dark:bg-neutral-800',
    hover: 'hover:bg-neutral-50 dark:hover:bg-neutral-800'
  },

  // Border styles
  border: {
    default: 'border-neutral-200 dark:border-neutral-700',
    light: 'border-neutral-100 dark:border-neutral-700',
    input: 'border-neutral-300 dark:border-neutral-600'
  },

  // Layout patterns
  layout: {
    page: 'min-h-screen',
    pageCenter: 'min-h-screen flex items-center justify-center',
    container: 'max-w-4xl mx-auto px-4 py-8',
    containerWide: 'max-w-5xl mx-auto px-4 py-8',
    containerFull: 'max-w-6xl mx-auto px-4 py-8',
    header: 'flex justify-between items-center mb-6'
  },

  // Section/card patterns
  section:
    'bg-white dark:bg-neutral-800 rounded-lg p-6',

  // Form elements
  form: {
    group: 'space-y-2',
    label: 'block text-sm text-neutral-600 dark:text-neutral-400 mb-1',
    labelRequired: 'block text-sm font-medium text-gray-700 dark:text-gray-300',
    input:
      'w-full border border-neutral-300 dark:border-neutral-600 rounded px-3 py-2 bg-white dark:bg-neutral-900 text-gray-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
    textarea:
      'w-full border border-neutral-300 dark:border-neutral-600 rounded px-3 py-2 bg-white dark:bg-neutral-900 text-gray-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical min-h-[100px]',
    checkbox: 'h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded',
    checkboxLabel: 'inline-flex items-center gap-2 text-gray-700 dark:text-gray-300',
    checkboxGroup: 'flex items-center gap-6 pt-4',
    actions: 'flex gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-700',
    error: 'text-red-600 dark:text-red-400 text-sm mt-1',
    fieldError: 'border-red-500 focus:ring-red-500'
  },

  // common form elements (backward compatible)
  input:
    'w-full border border-neutral-300 dark:border-neutral-600 rounded px-3 py-2 bg-white dark:bg-neutral-900 dark:text-neutral-100',
  label: 'block text-sm text-neutral-600 dark:text-neutral-400 mb-1',

  // Button variants
  button: {
    primary:
      'px-4 py-2 rounded bg-black dark:bg-neutral-100 text-white dark:text-black hover:bg-gray-800 dark:hover:bg-white disabled:opacity-50',
    secondary:
      'px-4 py-2 rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-gray-700 dark:text-gray-300 hover:bg-neutral-100 dark:hover:bg-neutral-700',
    danger:
      'px-4 py-2 rounded border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30',
    dangerSolid:
      'px-4 py-2 rounded bg-red-600 dark:bg-red-700 text-white hover:bg-red-700 dark:hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed',
    accent:
      'px-4 py-2 rounded bg-amber-700 dark:bg-amber-800 text-white hover:bg-amber-800 dark:hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed',
    ghost:
      'px-4 py-2 rounded bg-gray-200 dark:bg-neutral-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed',
    sm: {
      secondary:
        'px-3 py-1.5 rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-gray-700 dark:text-gray-300 hover:bg-neutral-100 dark:hover:bg-neutral-700',
      danger:
        'px-3 py-1.5 rounded border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30'
    }
  },

  // Navigation
  backLink:
    'inline-flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100',

  // Detail/info display
  detailRow: 'flex justify-between py-2 border-t border-neutral-100 dark:border-neutral-700',

  // Alerts/warnings
  alert: {
    warning:
      'p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md text-sm text-amber-800 dark:text-amber-200',
    error:
      'p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-800 rounded text-red-700 dark:text-red-400',
    success:
      'p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md text-sm text-green-700 dark:text-green-200',
    info:
      'p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md text-sm text-blue-800 dark:text-blue-200'
  },

  // Empty/loading states
  state: {
    empty: 'text-center py-12',
    emptyText: 'text-gray-500 dark:text-gray-400',
    loading: 'min-h-screen flex items-center justify-center',
    loadingText: 'text-lg text-gray-600 dark:text-gray-400'
  },

  // Card overlays (badges, buttons that appear on hover)
  overlay: {
    badge: 'absolute top-2 left-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded',
    button:
      'absolute top-2 right-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-opacity-90',
    deleteButton:
      'absolute top-2 right-2 bg-red-600 bg-opacity-90 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-opacity-100 disabled:opacity-50'
  },

  // Grid layouts
  grid: {
    gallery: 'grid grid-cols-2 md:grid-cols-3 gap-4 p-4',
    manage: 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'
  },

  // Image containers
  image: {
    square: 'aspect-square overflow-hidden',
    cover: 'w-full h-full object-cover'
  },

  // Prose/content
  prose: 'prose max-w-none text-gray-700 dark:text-gray-300',

  // Tags
  tag: 'bg-gray-100 dark:bg-neutral-700 text-gray-800 dark:text-gray-200 text-xs px-2 py-1 rounded'
} as const
