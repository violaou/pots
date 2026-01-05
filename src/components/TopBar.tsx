import { LogOut, Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'

import { useAuth, useLogout } from '../contexts/AuthContext'
import { Logo, NavActions, NavLinks, ThemeToggle } from './nav'

const styles = {
  header: 'fixed top-0 left-0 right-0 h-16 z-10 lg:hidden select-none',
  headerInner: 'h-full px-4 flex items-center justify-between',
  iconButton:
    'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 focus:outline-none select-none',
  menuTitle: 'text-xl font-medium text-gray-900 dark:text-gray-100',
  overlay:
    'fixed inset-0 bg-black transition-opacity duration-300 ease-in-out lg:hidden',
  slideMenu:
    'fixed top-0 bottom-0 right-0 w-64 bg-white dark:bg-neutral-900 shadow-lg z-50 transform transition-transform duration-300 ease-in-out lg:hidden select-none'
} as const

export function TopBar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { isAuthenticated } = useAuth()
  const handleLogout = useLogout()

  const closeMenu = () => setIsMenuOpen(false)

  useEffect(() => {
    const mainContent = document.getElementById('main-content')
    if (!mainContent) return

    if (isMenuOpen) {
      mainContent.classList.add('blur-sm')
    } else {
      mainContent.classList.remove('blur-sm')
    }
    // Prevent body scrolling when menu is open
    document.body.style.overflow = isMenuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [isMenuOpen])

  return (
    <>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Logo />

          <div className="flex items-center space-x-4">
            {isAuthenticated && (
              <button
                onClick={handleLogout}
                className={styles.iconButton}
                aria-label="Logout"
              >
                <LogOut size={20} />
              </button>
            )}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`${styles.iconButton} transition-transform duration-200 ease-in-out`}
              aria-label="Toggle menu"
            >
              <Menu
                size={24}
                className={isMenuOpen ? 'opacity-0 absolute' : 'opacity-100'}
              />
              <X
                size={24}
                className={isMenuOpen ? 'opacity-100' : 'opacity-0 absolute'}
                style={{ marginTop: isMenuOpen ? '0' : '-24px' }}
              />
            </button>
          </div>
        </div>
      </header>

      {/* Background overlay */}
      <div
        className={`${styles.overlay} ${isMenuOpen ? 'opacity-50 z-40' : 'opacity-0 pointer-events-none'}`}
        onClick={closeMenu}
      />

      {/* Slide-in menu */}
      <div
        className={`${styles.slideMenu} flex flex-col ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="p-6 flex flex-col flex-1">
          <div className="flex items-center justify-between mb-8">
            <span className={styles.menuTitle}>Menu</span>
            <button
              onClick={closeMenu}
              className={styles.iconButton}
              aria-label="Close menu"
            >
              <X size={24} />
            </button>
          </div>

          <nav className="space-y-4">
            <NavLinks onLinkClick={closeMenu} />
            <NavActions onActionClick={closeMenu} />
            <ThemeToggle />
          </nav>
        </div>
      </div>
    </>
  )
}
