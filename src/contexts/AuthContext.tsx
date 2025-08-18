import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect
} from 'react'
import { User as FirebaseUser } from 'firebase/auth'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import {
  signInWithGoogle as fbSignIn,
  logout as fbLogout,
  onAuthStateChange as fbOnAuthStateChange
} from '../firebase/authService'
import {
  signInWithGoogle as sbSignIn,
  logout as sbLogout,
  onAuthStateChange as sbOnAuthStateChange
} from '../supabase/auth'
import { isSupabase } from '../services/data-source'

interface User {
  email: string | null
  displayName: string | null
  photoURL: string | null
  uid: string
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  login: () => Promise<void>
  logout: () => Promise<void>
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const AUTH_STORAGE_KEY = 'auth_user'

function mapAuthUserFromFirebase(
  firebaseUser: FirebaseUser | null
): User | null {
  if (!firebaseUser) return null
  return {
    email: firebaseUser.email,
    displayName: firebaseUser.displayName,
    photoURL: firebaseUser.photoURL,
    uid: firebaseUser.uid
  }
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
    // Initialize from localStorage if available
    const storedUser = localStorage.getItem(AUTH_STORAGE_KEY)
    return storedUser ? JSON.parse(storedUser) : null
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const usingSupabase = isSupabase()
    const onChange = usingSupabase ? sbOnAuthStateChange : fbOnAuthStateChange

    const unsubscribe = onChange((authUser) => {
      const mappedUser = usingSupabase
        ? mapAuthUserFromSupabase(authUser as SupabaseUser | null)
        : mapAuthUserFromFirebase(authUser as FirebaseUser | null)
      setUser(mappedUser)
      setLoading(false)
      if (mappedUser) {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(mappedUser))
      } else {
        localStorage.removeItem(AUTH_STORAGE_KEY)
      }
    })

    return () => unsubscribe()
  }, [])

  const login = async () => {
    try {
      if (isSupabase()) await sbSignIn()
      else await fbSignIn()
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  }

  const logout = async () => {
    try {
      if (isSupabase()) await sbLogout()
      else await fbLogout()
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
