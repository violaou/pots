import { NavItem } from '../types'

export const getNavItems = (): NavItem[] => [
  { path: '/gallery', label: 'Gallery' },
  { path: '/blog', label: 'Blog' },
  { path: '/about', label: 'About' },
  { path: '/contact', label: 'Contact' }
]

