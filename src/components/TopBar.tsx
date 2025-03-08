import React from 'react'
import { Link } from 'react-router-dom'
import { Palette } from 'lucide-react'

export const TopBar: React.FC = () => {
  return (
    <header className="fixed top-0 left-0 right-0 h-16  border-b border-gray-100 lg:hidden">
      <div className="h-full px-4 flex items-center">
        <Link to="/" className="flex items-center space-x-3">
          <Palette className="w-6 h-6 text-gray-900" />
          <span className="text-lg font-medium text-gray-900">Portfolio</span>
        </Link>
      </div>
    </header>
  )
}
