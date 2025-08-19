import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { useAuth } from '../contexts/AuthContext'

export const Login = () => {
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { login } = useAuth()

  const handleGoogleLogin = async () => {
    try {
      setError('')
      await login()
      navigate('/blog')
    } catch (err) {
      console.error('Login error:', err)
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('An unexpected error occurred during sign in')
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
        </div>
        <div className="mt-8 space-y-6">
          {error && (
            <div className="text-red-500 text-sm text-center p-4 bg-red-50 rounded-md">
              {error}
            </div>
          )}

          <div>
            <button
              onClick={handleGoogleLogin}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-black bg-yellow-200 hover:bg-yellow-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
            >
              Sign in with Google
            </button>
          </div>

          <div className="text-sm text-center">
            <Link to="/blog" className="text-black hover:text-gray-700">
              Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
