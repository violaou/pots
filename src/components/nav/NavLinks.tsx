import { Link, useLocation } from 'react-router-dom'

import { getNavItems } from '../../config/nav'

interface NavLinksProps {
  linkClassName?: string
  activeLinkClassName?: string
  onLinkClick?: () => void
}

const defaultLinkClass =
  'block py-1 text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
const defaultActiveClass = 'block py-1 text-gray-900 dark:text-white'

export function NavLinks({
  linkClassName = defaultLinkClass,
  activeLinkClassName = defaultActiveClass,
  onLinkClick
}: NavLinksProps) {
  const location = useLocation()
  const navItems = getNavItems()

  return (
    <>
      {navItems.map((item) => (
        <Link
          key={item.path}
          to={item.path}
          className={
            location.pathname === item.path
              ? activeLinkClassName
              : linkClassName
          }
          onClick={onLinkClick}
        >
          {item.label}
        </Link>
      ))}
    </>
  )
}
