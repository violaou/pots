import { useState, useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from 'react'
import { X, Plus } from 'lucide-react'
import { theme } from '../styles/theme'
import { getDistinctTagNames, getTagValues } from '../services/artwork-service'

export interface TagItem {
  id?: string
  tagName: string
  tagValue: string
}

export interface TagsEditorRef {
  /** Adds any pending tag (filled but not yet added) and returns updated tags */
  flushPending: () => TagItem[]
}

interface TagsEditorProps {
  tags: TagItem[]
  onChange: (tags: TagItem[]) => void
  disabled?: boolean
}

interface AutocompleteInputProps {
  value: string
  onChange: (value: string) => void
  onKeyDown: (e: React.KeyboardEvent) => void
  placeholder: string
  fetchSuggestions: () => Promise<string[]>
  disabled?: boolean
  className?: string
}

function AutocompleteInput({
  value,
  onChange,
  onKeyDown,
  placeholder,
  fetchSuggestions,
  disabled,
  className
}: AutocompleteInputProps) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  const loadSuggestions = useCallback(async (filter: string) => {
    try {
      const results = await fetchSuggestions()
      const filtered = filter
        ? results.filter(s => s.toLowerCase().includes(filter.toLowerCase()))
        : results.slice(0, 3) // Show top 3 when empty
      setSuggestions(filtered.slice(0, 5))
    } catch {
      setSuggestions([])
    }
  }, [fetchSuggestions])

  const handleFocus = useCallback(() => {
    setIsOpen(true)
    loadSuggestions('')
  }, [loadSuggestions])

  useEffect(() => {
    if (!isOpen) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => loadSuggestions(value), 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [value, isOpen, loadSuggestions])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        dropdownRef.current && !dropdownRef.current.contains(target) &&
        inputRef.current && !inputRef.current.contains(target)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (suggestion: string) => {
    onChange(suggestion)
    setIsOpen(false)
    setHighlightedIndex(-1)
  }

  const handleKeyDownInternal = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) {
      onKeyDown(e)
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex(prev => Math.min(prev + 1, suggestions.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex(prev => Math.max(prev - 1, 0))
        break
      case 'Enter':
        if (highlightedIndex >= 0) {
          e.preventDefault()
          handleSelect(suggestions[highlightedIndex])
        } else {
          onKeyDown(e)
        }
        break
      case 'Escape':
        setIsOpen(false)
        break
      default:
        onKeyDown(e)
    }
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={handleFocus}
        onKeyDown={handleKeyDownInternal}
        placeholder={placeholder}
        disabled={disabled}
        className={className}
        autoComplete="off"
      />
      {isOpen && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md shadow-lg max-h-40 overflow-auto"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => handleSelect(suggestion)}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 ${
                index === highlightedIndex ? 'bg-neutral-100 dark:bg-neutral-700' : ''
              }`}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export const TagsEditor = forwardRef<TagsEditorRef, TagsEditorProps>(
  function TagsEditor({ tags, onChange, disabled = false }, ref) {
    const [newTagName, setNewTagName] = useState('')
    const [newTagValue, setNewTagValue] = useState('')

    const fetchTagNames = useCallback(() => getDistinctTagNames(), [])
    const fetchTagValues = useCallback(() => {
      if (!newTagName) return Promise.resolve([])
      return getTagValues(newTagName)
    }, [newTagName])

    const addPendingTag = useCallback((currentTags: TagItem[]): TagItem[] => {
      const name = newTagName.trim()
      const value = newTagValue.trim()
      if (!name || !value) return currentTags

      const isDuplicate = currentTags.some(
        t => t.tagName.toLowerCase() === name.toLowerCase() &&
             t.tagValue.toLowerCase() === value.toLowerCase()
      )
      if (isDuplicate) return currentTags

      return [...currentTags, { tagName: name, tagValue: value }]
    }, [newTagName, newTagValue])

    // Expose flushPending to parent via ref
    useImperativeHandle(ref, () => ({
      flushPending: () => {
        const updated = addPendingTag(tags)
        if (updated !== tags) {
          onChange(updated)
          setNewTagName('')
          setNewTagValue('')
        }
        return updated
      }
    }), [tags, onChange, addPendingTag])

    const handleAddTag = () => {
      const updated = addPendingTag(tags)
      if (updated !== tags) {
        onChange(updated)
        setNewTagName('')
        setNewTagValue('')
      }
    }

    const handleRemoveTag = (index: number) => {
      onChange(tags.filter((_, i) => i !== index))
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleAddTag()
      }
    }

    return (
      <div className="space-y-3">
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag, index) => (
              <span
                key={tag.id || `${tag.tagName}-${tag.tagValue}-${index}`}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200"
              >
                <span className="font-medium">{tag.tagName}:</span>
                <span>{tag.tagValue}</span>
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(index)}
                    className="ml-1 hover:text-red-600 dark:hover:text-red-400"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </span>
            ))}
          </div>
        )}

        {!disabled && (
          <div className="flex items-center gap-2">
            <AutocompleteInput
              value={newTagName}
              onChange={setNewTagName}
              onKeyDown={handleKeyDown}
              placeholder="Tag name"
              fetchSuggestions={fetchTagNames}
              disabled={disabled}
              className={`${theme.form.input} flex-1 max-w-[150px]`}
            />
            <AutocompleteInput
              value={newTagValue}
              onChange={setNewTagValue}
              onKeyDown={handleKeyDown}
              placeholder="Tag value"
              fetchSuggestions={fetchTagValues}
              disabled={disabled}
              className={`${theme.form.input} flex-1 max-w-[200px]`}
            />
            <button
              type="button"
              onClick={handleAddTag}
              disabled={!newTagName.trim() || !newTagValue.trim()}
              className={`${theme.button.sm.secondary} disabled:opacity-50`}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        )}

        {tags.length === 0 && !disabled && (
          <p className={`text-sm ${theme.text.muted}`}>
            No tags yet. Add tags like "material: stoneware" or "status: for_sale"
          </p>
        )}
      </div>
    )
  }
)
