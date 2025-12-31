import { useState } from 'react'

import { useAuth } from '../contexts/AuthContext'
import { theme } from '../styles/theme'

export default function Login() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { sendMagicLink } = useAuth()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setMessage('')

    if (!email) {
      setError('Email is required')
      return
    }

    setIsSubmitting(true)
    try {
      await sendMagicLink(email)
      setMessage('Check your email for a sign-in link.')
      window.open('https://mail.google.com/mail/u/0/#inbox', '_blank') // open gmail in a new tab
    } catch (err) {
      console.error('Auth error:', err)
      setError(
        err instanceof Error ? err.message : 'An unexpected error occurred'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={theme.layout.pageCenter}>
      <div className="max-w-sm w-full space-y-6">
        <h2 className={`text-2xl font-medium text-center ${theme.text.h1}`}>
          Sign in
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className={theme.alert.error}>{error}</div>}
          {message && <div className={theme.alert.success}>{message}</div>}

          <div className="flex gap-2">
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) =>
                e.key === 'Enter' && e.currentTarget.form?.requestSubmit()
              }
              className={`${theme.form.input} flex-1`}
              placeholder="you@example.com"
              autoComplete="email"
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className={theme.button.accent}
            >
              {isSubmitting ? 'Sending...' : 'Send magic link'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
