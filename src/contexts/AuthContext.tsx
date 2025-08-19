import type { User as SupabaseUser } from '@supabase/supabase-js'
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState} from 'react'

import {
  isAdmin as sbIsAdmin,
  logout as sbLogout,
  onAuthStateChange as sbOnAuthStateChange,
  signInWithGoogle as sbSignIn} from '../supabase/auth'

interface User {
  email: string | null
  displayName: string | null
  photoURL: string | null
  uid: string
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isAdmin: boolean
  adminLoading: boolean
  login: () => Promise<void>
  logout: () => Promise<void>
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const AUTH_STORAGE_KEY = 'auth_user'

function mapAuthUserFromSupabase(
  supabaseUser: SupabaseUser | null
): User | null {
  if (!supabaseUser) return null
  const meta =
    (supabaseUser.user_metadata as Record<string, unknown> | undefined) ?? {}
  const fullName = meta.full_name as string | undefined
  const avatarUrl = meta.avatar_url as string | undefined
  return {
    email: supabaseUser.email ?? null,
    displayName: fullName! ?? null,
    photoURL: avatarUrl! ?? null,
    uid: supabaseUser.id
  }
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    // Initialize from localStorage if available
    const storedUser = localStorage.getItem(AUTH_STORAGE_KEY)
    return storedUser ? JSON.parse(storedUser) : null
  })
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminLoading, setAdminLoading] = useState(false)

  useEffect(() => {
    const unsubscribe = sbOnAuthStateChange((authUser) => {
      const mappedUser = mapAuthUserFromSupabase(
        authUser as SupabaseUser | null
      )
      setUser(mappedUser)
      if (mappedUser) {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(mappedUser))
      } else {
        localStorage.removeItem(AUTH_STORAGE_KEY)
      }

      // Compute admin membership using Supabase
      if (mappedUser) {
        setAdminLoading(true)
        sbIsAdmin(mappedUser.uid)
          .then((member) => setIsAdmin(!!member))
          .catch((err) => {
            console.error('Failed to determine admin membership', err)
            setIsAdmin(false)
          })
          .finally(() => setAdminLoading(false))
      } else {
        setIsAdmin(false)
        setAdminLoading(false)
      }

      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const login = async () => {
    try {
      await sbSignIn()
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  }

  const logout = async () => {
    try {
      await sbLogout()
    } catch (error) {
      console.error('Logout error:', error)
      throw error
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isAdmin,
        adminLoading,
        login,
        logout,
        loading
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
