import { Link, useLocation } from 'react-router-dom'
import violaPotsLogo from '../assets/viola-pots.png'

interface NavItem {
  path: string
  label: string
}

export const Sidebar = () => {
  const location = useLocation()

  const navItems: NavItem[] = [
    { path: '/', label: 'Gallery' },
    { path: '/about', label: 'About' },
    { path: '/contact', label: 'Contact' }
  ]

  return (
    <div className="fixed left-0 top-0 h-screen w-64  border-r border-gray-100 p-8 hidden lg:block">
      <div className="mb-12">
        <Link to="/" className="flex items-center space-x-3">
          <div className="w-8 h-8">
            {/* viola-pots.png */}
            <img src={violaPotsLogo} alt="Viola Pots" />
          </div>
          <span className="text-xl font-medium text-gray-900">Viola Pots</span>
        </Link>
      </div>

      <nav className="space-y-4">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`block py-1 ${isActive ? 'text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
