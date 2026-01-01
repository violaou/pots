import { Moon, Sun } from 'lucide-react'

import { THEME_DARK, THEME_LIGHT, useTheme } from '../../contexts/ThemeContext'

interface ThemeToggleProps {
  className?: string
  iconSize?: number
}

const defaultClass =
  'flex items-center gap-2 py-1 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'

export function ThemeToggle({
  className = defaultClass,
  iconSize = 16
}: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      className={className}
      aria-label={`Switch to ${theme === THEME_LIGHT ? THEME_DARK : THEME_LIGHT} mode`}
    >
      {theme === THEME_LIGHT ? (
        <Moon size={iconSize} />
      ) : (
        <Sun size={iconSize} />
      )}
    </button>
  )
}
