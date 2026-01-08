import { useState, useEffect } from 'react'
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
  const [rotation, setRotation] = useState(0)

  useEffect(() => {
    function handleScroll() {
      // Rotate based on scroll position - every 3px of scroll = 1 degree rotation
      const scrollY = window.scrollY
      setRotation(scrollY / 3)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <Link to="/" className="flex items-center gap-3">
      <img
        src={violaPotsLogo}
        alt="Viola Ou Logo"
        className={`${imageSize} object-contain transition-transform duration-75`}
        style={{ transform: `rotate(${rotation}deg)` }}
      />
      <span className={textClassName}>Viola Ou</span>
    </Link>
  )
}
