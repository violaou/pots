import React, { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Menu, X, LogOut } from 'lucide-react'
import violaPotsLogo from '../assets/viola-pots.png'
import { NavItem } from '../types'
import { useAuth } from '../contexts/AuthContext'

export const navItems: NavItem[] = [
  { path: '/gallery', label: 'Gallery' },
  { path: '/blog', label: 'Blog' },
  { path: '/about', label: 'About' },
  { path: '/contact', label: 'Contact' },
  { path: '/login', label: 'Login' }
]

export const TopBar: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { isAuthenticated, logout } = useAuth()

  // Add/remove blur class to main content when menu opens/closes
  useEffect(() => {
    const mainContent = document.getElementById('main-content')
    if (!mainContent) return

    if (isMenuOpen) {
      mainContent.classList.add('blur-sm', 'transition-all', 'duration-300')
    } else {
      mainContent.classList.remove('blur-sm')
    }

    // Prevent body scrolling when menu is open
    document.body.style.overflow = isMenuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [isMenuOpen])

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <>
      <header className="fixed top-0 left-0 right-0 h-16 border-b border-gray-100 bg-white z-10 lg:hidden">
        <div className="h-full px-4 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3">
            <div className="w-8 h-8">
              <img
                src={violaPotsLogo}
                alt="Viola Pots"
                className="w-full h-full object-contain"
              />
            </div>
            <span className="text-lg font-medium text-gray-900">
              Viola Pots
            </span>
          </Link>

          <div className="flex items-center space-x-4">
            {isAuthenticated && (
              <button
                onClick={handleLogout}
                className="text-gray-500 hover:text-gray-900 focus:outline-none"
                aria-label="Logout"
              >
                <LogOut size={20} />
              </button>
            )}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-500 hover:text-gray-900 focus:outline-none transition-transform duration-200 ease-in-out"
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

      {/* Background overlay with fade transition */}
      <div
        className={`fixed inset-0 bg-black transition-opacity duration-300 ease-in-out lg:hidden ${
          isMenuOpen ? 'opacity-50 z-40' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsMenuOpen(false)}
      />

      {/* Slide-in menu */}
      <div
        className={`fixed top-0 bottom-0 right-0 w-64 bg-white shadow-lg z-50 transform transition-transform duration-300 ease-in-out lg:hidden ${
          isMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <span className="text-xl font-medium">Menu</span>
            <button
              onClick={() => setIsMenuOpen(false)}
              className="text-gray-500 hover:text-gray-900 focus:outline-none"
              aria-label="Close menu"
            >
              <X size={24} />
            </button>
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
                      ? 'text-gray-900'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.label}
                </Link>
              )
            })}
            {isAuthenticated && (
              <button
                onClick={() => {
                  handleLogout()
                  setIsMenuOpen(false)
                }}
                className="w-full text-left py-1 text-gray-500 hover:text-gray-900"
              >
                Logout
              </button>
            )}
          </nav>
        </div>
      </div>
    </>
  )
}
