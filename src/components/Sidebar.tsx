import { Instagram, LogOut, Moon, Sun } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

import violaPotsLogo from '../assets/viola-pots.png'
import { useAuth, useLogout } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { getNavItems } from './TopBar'

export default function Sidebar() {
  const location = useLocation()
  const { isAuthenticated } = useAuth()
  const handleLogout = useLogout()
  const { theme, toggleTheme } = useTheme()
  const navItems = getNavItems()

  return (
    <>
      <div className="fixed left-0 top-0 h-screen w-64 border-r border-gray-100 dark:border-gray-800 p-8 hidden lg:block">
        <div className="mb-12">
          <Link to="/" className="flex items-center space-x-3">
            <div className="w-8 h-8">
              <img src={violaPotsLogo} alt="Viola Pots" />
            </div>
            <span className="text-xl font-medium text-gray-900 dark:text-gray-100">
              Viola Pots
            </span>
          </Link>
        </div>

        <nav className="space-y-4">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`block py-1 ${
                  isActive
                    ? 'text-gray-900 dark:text-gray-100'
                    : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
          <a
            href="https://www.instagram.com/viola.pots/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 py-1"
          >
            <Instagram size={16} />
            <span>Instagram</span>
          </a>
          {isAuthenticated && (
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 w-full py-1"
            >
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          )}
          <button
            onClick={toggleTheme}
            className="flex items-center space-x-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 w-full py-1"
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            <span>{theme === 'light' ? 'Dark mode' : 'Light mode'}</span>
          </button>
        </nav>
      </div>
    </>
  )
}
