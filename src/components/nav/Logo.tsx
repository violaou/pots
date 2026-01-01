import { Link } from 'react-router-dom'

import violaPotsLogo from '../../assets/viola-pots.png'

interface LogoProps {
  textClassName?: string
  imageSize?: string
}

export function Logo({
  textClassName = 'text-xl font-medium text-gray-900 dark:text-gray-100',
  imageSize = 'w-8 h-8'
}: LogoProps) {
  return (
    <Link to="/" className="flex items-center gap-3">
      <img
        src={violaPotsLogo}
        alt="Viola Pots"
        className={`${imageSize} object-contain`}
      />
      <span className={textClassName}>Viola Pots</span>
    </Link>
  )
}
