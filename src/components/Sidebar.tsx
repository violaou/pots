import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Palette } from 'lucide-react';

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <div className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-100 p-8 hidden lg:block">
      <div className="mb-12">
        <Link to="/" className="flex items-center space-x-3">
          <Palette className="w-8 h-8 text-gray-900" />
          <span className="text-xl font-medium text-gray-900">Portfolio</span>
        </Link>
      </div>
      
      <nav className="space-y-4">
        <Link 
          to="/" 
          className={`block py-2 ${isHome ? 'text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
        >
          Gallery
        </Link>
      </nav>
    </div>
  );
};