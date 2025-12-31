import { Instagram, LogOut, Moon, Sun } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

import violaPotsLogo from '../assets/viola-pots.png'
import { useAuth, useLogout } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { getNavItems } from './TopBar'

const styles = {
  container:
    'fixed left-0 top-0 h-screen w-64 border-r border-gray-100 dark:border-gray-800 p-8 hidden lg:block',
  logo: 'flex items-center gap-3',
  logoText: 'text-xl font-medium text-gray-900 dark:text-gray-100',
  nav: 'space-y-4',
  navLink:
    'block py-1 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100',
  navLinkActive: 'block py-1 text-gray-900 dark:text-gray-100',
  navButton:
    'flex items-center gap-2 py-1 w-full text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
} as const

export default function Sidebar() {
  const location = useLocation()
  const { isAuthenticated } = useAuth()
  const handleLogout = useLogout()
  const { theme, toggleTheme } = useTheme()
  const navItems = getNavItems()

  return (
    <div className={styles.container}>
      <div className="mb-12">
        <Link to="/" className={styles.logo}>
          <img src={violaPotsLogo} alt="Viola Pots" className="w-8 h-8" />
          <span className={styles.logoText}>Viola Pots</span>
        </Link>
      </div>

      <nav className={styles.nav}>
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={
              location.pathname === item.path
                ? styles.navLinkActive
                : styles.navLink
            }
          >
            {item.label}
          </Link>
        ))}

        <a
          href="https://www.instagram.com/viola.pots/"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.navButton}
        >
          <Instagram size={16} />
          <span>Instagram</span>
        </a>

        {isAuthenticated && (
          <button onClick={handleLogout} className={styles.navButton}>
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        )}

        <button
          onClick={toggleTheme}
          className={styles.navButton}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
        </button>
      </nav>
    </div>
  )
}
