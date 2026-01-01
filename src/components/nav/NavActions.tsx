import { Instagram, LogOut } from 'lucide-react'

import { useAuth, useLogout } from '../../contexts/AuthContext'

const INSTAGRAM_URL = 'https://www.instagram.com/viola.pots/'

interface NavActionsProps {
  buttonClassName?: string
  iconSize?: number
  showLabels?: boolean
  onActionClick?: () => void
}

const defaultButtonClass =
  'flex items-center gap-2 py-1 text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'

export function NavActions({
  buttonClassName = defaultButtonClass,
  iconSize = 16,
  showLabels = true,
  onActionClick
}: NavActionsProps) {
  const { isAuthenticated } = useAuth()
  const handleLogout = useLogout()

  return (
    <>
      <a
        href={INSTAGRAM_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonClassName}
        onClick={onActionClick}
      >
        <Instagram size={iconSize} />
        {showLabels && <span>Instagram</span>}
      </a>

      {isAuthenticated && (
        <button
          onClick={() => {
            handleLogout()
            onActionClick?.()
          }}
          className={`${buttonClassName} w-full text-left`}
        >
          <LogOut size={iconSize} />
          {showLabels && <span>Logout</span>}
        </button>
      )}
    </>
  )
}
