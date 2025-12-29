import type { User as SupabaseUser } from '@supabase/supabase-js'
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState
} from 'react'
import { useNavigate } from 'react-router-dom'

import {
  isAdmin as sbIsAdmin,
  logout as sbLogout,
  onAuthStateChange as sbOnAuthStateChange,
  sendMagicLink as sbSendMagicLink,
  signInWithPassword as sbSignInWithPassword,
  signUpWithEmail as sbSignUpWithEmail
} from '../supabase/auth'

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
  sendMagicLink: (email: string) => Promise<void>
  signInWithPassword: (email: string, password: string) => Promise<void>
  signUpWithEmail: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const AUTH_STORAGE_KEY = 'auth_user'

const isDevLoggedIn =
  import.meta.env.DEV && import.meta.env.VITE_LOGGED_IN === 'true'

const DEV_USER: User = {
  email: 'dev@example.com',
  displayName: 'Dev Admin',
  photoURL: null,
  uid: 'dev-admin'
}

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
    if (isDevLoggedIn) return DEV_USER
    const storedUser = localStorage.getItem(AUTH_STORAGE_KEY)
    return storedUser ? JSON.parse(storedUser) : null
  })
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState<boolean>(isDevLoggedIn)
  const [adminLoading, setAdminLoading] = useState<boolean>(false)

  useEffect(() => {
    if (isDevLoggedIn) {
      setLoading(false)
      setAdminLoading(false)
      return
    }

    // onAuthStateChange fires immediately with the current session,
    // so we don't need a separate initialization call
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

  const sendMagicLink = async (email: string) => {
    if (isDevLoggedIn) return
    await sbSendMagicLink(email)
  }

  const signInWithPassword = async (email: string, password: string) => {
    if (isDevLoggedIn) return
    await sbSignInWithPassword(email, password)
  }

  const signUpWithEmail = async (email: string, password: string) => {
    if (isDevLoggedIn) return
    await sbSignUpWithEmail(email, password)
  }

  const logout = async () => {
    if (isDevLoggedIn) return
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
        sendMagicLink,
        signInWithPassword,
        signUpWithEmail,
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

/**
 * Hook that provides a logout function which also navigates to home.
 * Use this instead of manually calling logout() and navigate('/').
 */
export function useLogout() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  return useCallback(() => {
    logout()
    navigate('/')
  }, [logout, navigate])
}
