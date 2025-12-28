import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'magic' | 'signin' | 'signup'>('magic')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()
  const { sendMagicLink, signInWithPassword, signUpWithEmail } = useAuth()

  async function handleSubmit() {
    setError('')
    setMessage('')
    if (!email) {
      setError('Email is required')
      return
    }
    setIsSubmitting(true)
    try {
      if (mode === 'magic') {
        await sendMagicLink(email)
        setMessage('Check your email for a sign-in link.')
        return
      }
      if (!password) {
        setError('Password is required')
        return
      }
      if (mode === 'signin') {
        await signInWithPassword(email, password)
        navigate('/blog')
        return
      }
      if (mode === 'signup') {
        await signUpWithEmail(email, password)
        setMessage('Sign-up email sent. Confirm it, then sign in.')
        return
      }
    } catch (err) {
      console.error('Auth error:', err)
      if (err instanceof Error) setError(err.message)
      else setError('An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
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
          {message && (
            <div className="text-green-700 text-sm text-center p-4 bg-green-50 rounded-md">
              {message}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>

            {mode !== 'magic' && (
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                  placeholder="Your password"
                  autoComplete={
                    mode === 'signin' ? 'current-password' : 'new-password'
                  }
                />
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setMode('magic')}
                className={`flex-1 py-2 rounded-md text-sm border ${mode === 'magic' ? 'bg-yellow-200 border-yellow-400' : 'bg-white border-gray-300'}`}
                type="button"
              >
                Use magic link
              </button>
              <button
                onClick={() => setMode('signin')}
                className={`flex-1 py-2 rounded-md text-sm border ${mode === 'signin' ? 'bg-yellow-200 border-yellow-400' : 'bg-white border-gray-300'}`}
                type="button"
              >
                Password sign in
              </button>
              <button
                onClick={() => setMode('signup')}
                className={`flex-1 py-2 rounded-md text-sm border ${mode === 'signup' ? 'bg-yellow-200 border-yellow-400' : 'bg-white border-gray-300'}`}
                type="button"
              >
                Sign up
              </button>
            </div>

            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-black bg-yellow-200 hover:bg-yellow-300 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
            >
              {isSubmitting
                ? 'Submitting...'
                : mode === 'magic'
                  ? 'Send magic link'
                  : mode === 'signin'
                    ? 'Sign in'
                    : 'Create account'}
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
