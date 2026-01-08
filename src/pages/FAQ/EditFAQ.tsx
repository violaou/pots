import type { DragEvent } from 'react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { DragIcon, DeleteIcon, SpinnerIcon } from '../../components'
import { useAuth } from '../../contexts/AuthContext'
import { getFAQ, updateFAQ, type FAQEntry } from '../../services/faq-service'
import { theme } from '../../styles/theme'

const dragStyles = {
  cardBase: `relative group border ${theme.border.default} ${theme.bg.card} rounded-lg p-4 cursor-move transition-all duration-200`,
  cardDragging: 'opacity-30 scale-95 shadow-2xl z-10',
  cardDropTarget: 'ring-2 ring-blue-500 ring-opacity-50 scale-[1.02] shadow-xl',
  cardHover: 'hover:shadow-md hover:scale-[1.01]',
  dragHandle:
    'flex-shrink-0 cursor-move opacity-40 group-hover:opacity-100 transition-opacity',
  dropZone:
    'absolute inset-0 bg-blue-500 bg-opacity-10 border-2 border-blue-500 border-dashed rounded-lg flex items-center justify-center pointer-events-none',
  dropBadge: 'bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium'
} as const

interface EntryFormData {
  question: string
  answer: string
}

function EntryCard({
  entry,
  index,
  isEditing,
  isDragging,
  isDropTarget,
  onEdit,
  onDelete,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDragEnd,
  onDrop
}: {
  entry: FAQEntry
  index: number
  isEditing: boolean
  isDragging: boolean
  isDropTarget: boolean
  onEdit: () => void
  onDelete: () => void
  onDragStart: (e: DragEvent) => void
  onDragOver: (e: DragEvent) => void
  onDragLeave: () => void
  onDragEnd: () => void
  onDrop: (e: DragEvent) => void
}) {
  const getCardClassName = () => {
    const stateClass = isDragging
      ? dragStyles.cardDragging
      : isDropTarget
        ? dragStyles.cardDropTarget
        : dragStyles.cardHover

    return `${dragStyles.cardBase} ${stateClass}`
  }

  return (
    <div
      draggable={!isEditing}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDragEnd={onDragEnd}
      onDrop={onDrop}
      className={getCardClassName()}
    >
      <div className="flex items-start gap-3">
        <div className={dragStyles.dragHandle}>
          <DragIcon />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <span className={`text-xs font-medium ${theme.text.muted}`}>
              #{index + 1}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onEdit}
                className={`${theme.button.sm.secondary} text-xs`}
              >
                Edit
              </button>
              <button
                type="button"
                onClick={onDelete}
                className={`${theme.button.sm.danger} text-xs p-1.5`}
                title="Delete entry"
              >
                <DeleteIcon />
              </button>
            </div>
          </div>
          <h3 className={`font-medium ${theme.text.h3} mb-1`}>
            {entry.question}
          </h3>
          <p className={`${theme.text.muted} text-sm line-clamp-2`}>
            {entry.answer}
          </p>
        </div>
      </div>

      {isDropTarget && !isDragging && (
        <div className={dragStyles.dropZone}>
          <div className={dragStyles.dropBadge}>Drop here</div>
        </div>
      )}
    </div>
  )
}

function EntryEditor({
  entry,
  onSave,
  onCancel
}: {
  entry: FAQEntry | null
  onSave: (data: EntryFormData) => void
  onCancel: () => void
}) {
  const [formData, setFormData] = useState<EntryFormData>({
    question: entry?.question ?? '',
    answer: entry?.answer ?? ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.question.trim() || !formData.answer.trim()) return
    onSave(formData)
  }

  return (
    <form onSubmit={handleSubmit} className={`${theme.section} space-y-4`}>
      <div className={theme.form.group}>
        <label htmlFor="question" className={theme.form.labelRequired}>
          Question
        </label>
        <input
          type="text"
          id="question"
          value={formData.question}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, question: e.target.value }))
          }
          className={theme.form.input}
          placeholder="e.g. How do I care for my pottery?"
          required
          autoFocus
        />
      </div>

      <div className={theme.form.group}>
        <label htmlFor="answer" className={theme.form.labelRequired}>
          Answer
        </label>
        <textarea
          id="answer"
          value={formData.answer}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, answer: e.target.value }))
          }
          className={theme.form.textarea}
          rows={4}
          placeholder="Enter your answer..."
          required
        />
      </div>

      <div className="flex justify-end gap-3">
        <button type="button" onClick={onCancel} className={theme.button.ghost}>
          Cancel
        </button>
        <button type="submit" className={theme.button.accent}>
          {entry ? 'Update' : 'Add Entry'}
        </button>
      </div>
    </form>
  )
}

export function EditFAQ() {
  const navigate = useNavigate()
  const { isAdmin, loading: authLoading, adminLoading } = useAuth()

  const [entries, setEntries] = useState<FAQEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(false)

  // Editing state
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [isAdding, setIsAdding] = useState(false)

  // Drag state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  useEffect(() => {
    if (authLoading || adminLoading) return
    if (!isAdmin) return

    getFAQ()
      .then((faq) => setEntries(faq.entries))
      .catch((err) => {
        console.error('Failed to load FAQ:', err)
        setError('Failed to load FAQ')
      })
      .finally(() => setLoading(false))
  }, [authLoading, adminLoading, isAdmin])

  // Drag handlers
  const handleDragStart = useCallback((e: DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }, [])

  const handleDragOver = useCallback((e: DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIndex(index)
  }, [])

  const handleDragLeave = useCallback(() => setDragOverIndex(null), [])

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }, [])

  const handleDrop = useCallback(
    (e: DragEvent, targetIndex: number) => {
      e.preventDefault()
      if (draggedIndex === null || draggedIndex === targetIndex) return

      const newEntries = [...entries]
      const [draggedEntry] = newEntries.splice(draggedIndex, 1)
      newEntries.splice(targetIndex, 0, draggedEntry)

      setEntries(newEntries)
      setHasChanges(true)
      setDraggedIndex(null)
      setDragOverIndex(null)
    },
    [draggedIndex, entries]
  )

  const handleAddEntry = useCallback((data: EntryFormData) => {
    setEntries((prev) => [
      ...prev,
      { question: data.question, answer: data.answer }
    ])
    setIsAdding(false)
    setHasChanges(true)
  }, [])

  const handleEditEntry = useCallback(
    (data: EntryFormData) => {
      if (editingIndex === null) return
      setEntries((prev) =>
        prev.map((entry, i) =>
          i === editingIndex
            ? { question: data.question, answer: data.answer }
            : entry
        )
      )
      setEditingIndex(null)
      setHasChanges(true)
    },
    [editingIndex]
  )

  const handleDeleteEntry = useCallback((index: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== index))
    setHasChanges(true)
  }, [])

  const handleSave = useCallback(async () => {
    setSaving(true)
    setError(null)

    try {
      await updateFAQ(entries)
      setHasChanges(false)
      navigate('/faq')
    } catch (err) {
      console.error('Failed to save FAQ:', err)
      setError('Failed to save FAQ. Please try again.')
    } finally {
      setSaving(false)
    }
  }, [entries, navigate])

  if (authLoading || adminLoading || loading) {
    return (
      <div className={theme.state.loading}>
        <p className={theme.state.loadingText}>Loading...</p>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className={theme.layout.pageCenter}>
        <p className={theme.text.muted}>
          Access denied. Admin privileges required.
        </p>
      </div>
    )
  }

  return (
    <div className={theme.layout.container}>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className={theme.text.h1}>Edit FAQ</h1>
          <p className={theme.text.muted}>
            Drag to reorder • {entries.length}{' '}
            {entries.length === 1 ? 'entry' : 'entries'}
          </p>
        </div>
        <div className="flex gap-3">
          <Link to="/faq" className={theme.button.ghost}>
            Cancel
          </Link>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className={theme.button.accent}
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <SpinnerIcon /> Saving...
              </span>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>

      {error && <div className={`${theme.alert.error} mb-6`}>{error}</div>}

      {hasChanges && (
        <div className={`${theme.alert.warning} mb-6`}>
          You have unsaved changes.
        </div>
      )}

      <div className="space-y-4 mb-6">
        {entries.map((entry, index) => {
          if (editingIndex === index) {
            return (
              <EntryEditor
                key={index}
                entry={entry}
                onSave={handleEditEntry}
                onCancel={() => setEditingIndex(null)}
              />
            )
          }

          return (
            <EntryCard
              key={index}
              entry={entry}
              index={index}
              isEditing={editingIndex !== null || isAdding}
              isDragging={draggedIndex === index}
              isDropTarget={dragOverIndex === index && draggedIndex !== index}
              onEdit={() => setEditingIndex(index)}
              onDelete={() => handleDeleteEntry(index)}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDragEnd={handleDragEnd}
              onDrop={(e) => handleDrop(e, index)}
            />
          )
        })}
      </div>

      {isAdding ? (
        <EntryEditor
          entry={null}
          onSave={handleAddEntry}
          onCancel={() => setIsAdding(false)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          disabled={editingIndex !== null}
          className={`w-full py-4 border-2 border-dashed ${theme.border.default} rounded-lg ${theme.text.muted} hover:border-neutral-400 dark:hover:border-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors`}
        >
          + Add FAQ Entry
        </button>
      )}

      {entries.length === 0 && !isAdding && (
        <div className={`${theme.state.empty} mt-8`}>
          <p className={theme.state.emptyText}>
            No FAQ entries yet. Click "Add FAQ Entry" to create your first
            question.
          </p>
        </div>
      )}
    </div>
  )
}

export default EditFAQ
