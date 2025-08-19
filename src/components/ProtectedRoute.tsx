import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
  adminOnly?: boolean
}

export const ProtectedRoute = ({
  children,
  adminOnly
}: ProtectedRouteProps) => {
  const { isAuthenticated, isAdmin, adminLoading } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    // Redirect to login page but save the attempted location
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Admin gating with loading state consideration
  if (adminLoading && adminOnly) return null

  // If this route is admin-only, enforce admin membership
  if (adminOnly && !isAdmin) {
    return <Navigate to="/blog" replace />
  }

  return <>{children}</>
}
