import { NavItem } from '../types'

export const getNavItems = (): NavItem[] => [
  { path: '/about', label: 'About' },
  { path: '/gallery', label: 'Gallery' },
  { path: '/blog', label: 'Blog' },
  { path: '/contact', label: 'Contact' },
  { path: '/faq', label: 'FAQ' }
]

