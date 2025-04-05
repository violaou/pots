import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth'
import { auth } from './config'

// Verify Firebase auth is initialized
if (!auth) {
  throw new Error('Firebase Auth is not initialized')
}

const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({
  prompt: 'select_account'
})

// Add your Google email to the allowed list
const ALLOWED_EMAILS = ['ouviola77@gmail.com']

export const signInWithGoogle = async () => {
  try {
    console.log('Starting Google sign in...')
    if (!auth) {
      throw new Error('Firebase Auth is not initialized')
    }

    const result = await signInWithPopup(auth, googleProvider)
    console.log('Sign in successful:', result.user.email)

    if (!ALLOWED_EMAILS.includes(result.user.email || '')) {
      console.log('User not in allowed list:', result.user.email)
      await signOut(auth)
      throw new Error('Unauthorized access')
    }
    return result.user
  } catch (error) {
    console.error('Detailed error signing in with Google:', error)
    if (error instanceof Error) {
      throw new Error(`Google Sign-In failed: ${error.message}`)
    }
    throw error
  }
}

export const logout = async () => {
  try {
    if (!auth) {
      throw new Error('Firebase Auth is not initialized')
    }
    await signOut(auth)
  } catch (error) {
    console.error('Error signing out:', error)
    throw error
  }
}

export const onAuthStateChange = (callback: (user: FirebaseUser | null) => void) => {
  if (!auth) {
    throw new Error('Firebase Auth is not initialized')
  }
  return onAuthStateChanged(auth, callback)
}

export function isUserAuthorized(user: FirebaseUser | null): boolean {
  return user !== null && ALLOWED_EMAILS.includes(user.email || '')
}