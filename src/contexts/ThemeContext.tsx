import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react'

export const THEME_LIGHT = 'light'
export const THEME_DARK = 'dark'
const STORAGE_KEY = 'theme-preference'
const PREFERENCE_TTL_MS = (60 * 60 * 1000) / 2 // 30 minutes

type Theme = typeof THEME_LIGHT | typeof THEME_DARK

interface StoredPreference {
  isDark: boolean
  timestamp: number
}

interface ThemeContextValue {
  theme: Theme
  isDark: boolean
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

function getSystemIsDark(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function getStoredPreference(): StoredPreference | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return null
    return JSON.parse(stored) as StoredPreference
  } catch {
    return null
  }
}

function isPreferenceExpired(preference: StoredPreference): boolean {
  return Date.now() - preference.timestamp > PREFERENCE_TTL_MS
}

function getStoredIsDark(): boolean | null {
  const preference = getStoredPreference()
  if (!preference) return null
  if (isPreferenceExpired(preference)) return null
  return preference.isDark
}

function savePreference(isDark: boolean) {
  const preference: StoredPreference = { isDark, timestamp: Date.now() }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(preference))
}

function applyTheme(isDark: boolean) {
  document.documentElement.classList.toggle(THEME_DARK, isDark)
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(
    () => getStoredIsDark() ?? getSystemIsDark()
  )

  // Derive string theme from boolean
  const theme: Theme = isDark ? THEME_DARK : THEME_LIGHT

  // Apply theme on mount and when it changes
  useEffect(() => {
    applyTheme(isDark)
  }, [isDark])

  // Listen for system preference changes only if no stored preference
  useEffect(() => {
    if (getStoredIsDark() !== null) return // User has explicit preference

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e: MediaQueryListEvent) => setIsDark(e.matches)

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev
      savePreference(next)
      return next
    })
  }, [])

  const value = useMemo(
    () => ({ theme, isDark, toggleTheme }),
    [theme, isDark, toggleTheme]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
