/**
 * Shared theme classes for consistent styling across the app.
 * Use these instead of hardcoding text/background colors.
 */
export const theme = {
  // Text styles
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
    link: 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100',

    // States
    error: 'text-red-600 dark:text-red-400'
  },

  // Background styles
  bg: {
    card: 'bg-white dark:bg-gray-800',
    input: 'bg-white dark:bg-gray-900',
    muted: 'bg-gray-50 dark:bg-gray-800',
    hover: 'hover:bg-gray-50 dark:hover:bg-gray-800'
  },

  // Border styles
  border: {
    default: 'border-gray-200 dark:border-gray-700',
    light: 'border-gray-100 dark:border-gray-700',
    input: 'border-gray-300 dark:border-gray-600'
  },

  // Common component patterns
  section: 'bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6',
  input:
    'w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-900 dark:text-gray-100',
  label: 'block text-sm text-gray-600 dark:text-gray-400 mb-1',
  button: {
    primary:
      'px-4 py-2 rounded bg-black dark:bg-white text-white dark:text-black disabled:opacity-50',
    secondary:
      'px-4 py-2 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800',
    danger:
      'px-4 py-2 rounded border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
  }
} as const
