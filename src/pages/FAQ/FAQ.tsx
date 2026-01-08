import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { useAuth } from '../../contexts/AuthContext'
import { getFAQ, type FAQEntry } from '../../services/faq-service'
import { theme } from '../../styles/theme'

function AccordionItem({
  entry,
  isOpen,
  onToggle
}: {
  entry: FAQEntry
  isOpen: boolean
  onToggle: () => void
}) {
  return (
    <div className="border-b border-neutral-200 dark:border-neutral-700 last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center py-5 text-left group"
      >
        <span
          className={`flex-shrink-0 transition-transform duration-300 mr-4 ${theme.text.muted}`}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Horizontal line (always visible) */}
            <path
              d="M4 10H16"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            {/* Vertical line (hidden when open) */}
            <path
              d="M10 4V16"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              className={`origin-center transition-transform duration-300 ${isOpen ? 'scale-y-0' : 'scale-y-100'}`}
            />
          </svg>
        </span>
        <span className={`font-medium pr-4 ${theme.text.h3}`}>
          {entry.question}
        </span>
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? 'max-h-96 pb-5' : 'max-h-0'
        }`}
      >
        <p className={`${theme.text.body} whitespace-pre-wrap`}>
          {entry.answer}
        </p>
      </div>
    </div>
  )
}

export function FAQ() {
  const [entries, setEntries] = useState<FAQEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openIndices, setOpenIndices] = useState<Set<number>>(new Set())
  const { isAdmin } = useAuth()

  useEffect(() => {
    getFAQ()
      .then((faq) => setEntries(faq.entries))
      .catch((err) => {
        console.error('Failed to load FAQ:', err)
        setError('Failed to load FAQ')
      })
      .finally(() => setLoading(false))
  }, [])

  const handleToggle = (index: number) => {
    setOpenIndices((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  if (loading) {
    return (
      <div className={theme.state.loading}>
        <p className={theme.state.loadingText}>Loading...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className={theme.layout.container}>
        <div className={theme.alert.error}>{error}</div>
      </div>
    )
  }

  return (
    <div className={theme.layout.container}>
      <div className="flex justify-between items-center">
        <h1 className={theme.text.h1}>Frequently Asked Questions</h1>
        {isAdmin && (
          <Link to="/faq/edit" className={theme.button.secondary}>
            Edit FAQ
          </Link>
        )}
      </div>

      {entries.length === 0 ? (
        <div className={theme.state.empty}>
          <p className={theme.state.emptyText}>No FAQ entries yet.</p>
        </div>
      ) : (
        <div className="bg-white/50 dark:bg-neutral-800/50 rounded-lg border border-neutral-200 dark:border-neutral-700 p-6 backdrop-blur-sm">
          {entries.map((entry, index) => (
            <AccordionItem
              key={index}
              entry={entry}
              isOpen={openIndices.has(index)}
              onToggle={() => handleToggle(index)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default FAQ
