import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect
} from 'react'
import { User as FirebaseUser } from 'firebase/auth'
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

const mapFirebaseUser = (firebaseUser: FirebaseUser | null): User | null => {
  if (!firebaseUser) return null
  return {
    email: firebaseUser.email,
    displayName: firebaseUser.displayName,
    photoURL: firebaseUser.photoURL,
    uid: firebaseUser.uid
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
    const source =
      (import.meta.env.VITE_DATA_SOURCE as string | undefined) ?? 'firebase'
    const onChange =
      source === 'supabase' ? sbOnAuthStateChange : fbOnAuthStateChange

    const unsubscribe = onChange((firebaseUser) => {
      const mappedUser = mapFirebaseUser(
        firebaseUser as unknown as FirebaseUser | null
      )
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
      const source =
        (import.meta.env.VITE_DATA_SOURCE as string | undefined) ?? 'firebase'
      if (source === 'supabase') await sbSignIn()
      else await fbSignIn()
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  }

  const logout = async () => {
    try {
      const source =
        (import.meta.env.VITE_DATA_SOURCE as string | undefined) ?? 'firebase'
      if (source === 'supabase') await sbLogout()
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
