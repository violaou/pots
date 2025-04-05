import { Link, useLocation, useNavigate } from 'react-router-dom'
import violaPotsLogo from '../assets/viola-pots.png'
import { getNavItems } from './TopBar'
import { useAuth } from '../contexts/AuthContext'
import { LogOut } from 'lucide-react'

export const Sidebar = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated, logout } = useAuth()
  const navItems = getNavItems(isAuthenticated)

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <>
      <div className="fixed left-0 top-0 h-screen w-64  border-r border-gray-100 p-8 hidden lg:block">
        <div className="mb-12">
          <Link to="/" className="flex items-center space-x-3">
            <div className="w-8 h-8">
              <img src={violaPotsLogo} alt="Viola Pots" />
            </div>
            <span className="text-xl font-medium text-gray-900">
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
                    ? 'text-gray-900'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
          {isAuthenticated && (
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 text-gray-500 hover:text-gray-900 w-full py-1"
            >
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          )}
        </nav>
      </div>
    </>
  )
}
