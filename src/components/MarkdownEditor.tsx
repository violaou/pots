import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { ListPlugin } from '@lexical/react/LexicalListPlugin'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { HorizontalRuleNode } from '@lexical/react/LexicalHorizontalRuleNode'
import { HorizontalRulePlugin } from '@lexical/react/LexicalHorizontalRulePlugin'
import { CodeNode, CodeHighlightNode } from '@lexical/code'
import { ListItemNode, ListNode } from '@lexical/list'
import { AutoLinkNode, LinkNode } from '@lexical/link'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin'
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin'
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  TRANSFORMERS
} from '@lexical/markdown'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { EditorState, LexicalEditor } from 'lexical'
import { useEffect, useRef, useCallback, useMemo } from 'react'

import { useTheme } from '../contexts/ThemeContext'
import ToolbarPlugin from './editor/ToolbarPlugin'

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  minHeight?: string
}

// Lexical theme configuration
const editorTheme = {
  root: 'lexical-root',
  paragraph: 'lexical-paragraph',
  heading: {
    h1: 'lexical-h1',
    h2: 'lexical-h2',
    h3: 'lexical-h3'
  },
  list: {
    ul: 'lexical-ul',
    ol: 'lexical-ol',
    listitem: 'lexical-li',
    nested: {
      listitem: 'lexical-li-nested'
    }
  },
  link: 'lexical-link',
  quote: 'lexical-quote',
  code: 'lexical-code',
  codeHighlight: {
    atrule: 'lexical-tokenAttr',
    attr: 'lexical-tokenAttr',
    boolean: 'lexical-tokenProperty',
    builtin: 'lexical-tokenSelector',
    cdata: 'lexical-tokenComment',
    char: 'lexical-tokenSelector',
    class: 'lexical-tokenFunction',
    'class-name': 'lexical-tokenFunction',
    comment: 'lexical-tokenComment',
    constant: 'lexical-tokenProperty',
    deleted: 'lexical-tokenProperty',
    doctype: 'lexical-tokenComment',
    entity: 'lexical-tokenOperator',
    function: 'lexical-tokenFunction',
    important: 'lexical-tokenVariable',
    inserted: 'lexical-tokenSelector',
    keyword: 'lexical-tokenAttr',
    namespace: 'lexical-tokenVariable',
    number: 'lexical-tokenProperty',
    operator: 'lexical-tokenOperator',
    prolog: 'lexical-tokenComment',
    property: 'lexical-tokenProperty',
    punctuation: 'lexical-tokenPunctuation',
    regex: 'lexical-tokenVariable',
    selector: 'lexical-tokenSelector',
    string: 'lexical-tokenSelector',
    symbol: 'lexical-tokenProperty',
    tag: 'lexical-tokenProperty',
    url: 'lexical-tokenOperator',
    variable: 'lexical-tokenVariable'
  },
  horizontalRule: 'lexical-hr',
  text: {
    bold: 'lexical-bold',
    italic: 'lexical-italic',
    underline: 'lexical-underline',
    strikethrough: 'lexical-strikethrough',
    code: 'lexical-text-code',
    subscript: 'lexical-subscript',
    superscript: 'lexical-superscript',
    highlight: 'lexical-highlight'
  }
}

// Error handler
function onError(error: Error) {
  console.error('Lexical error:', error)
}

// Plugin to sync external value changes
function ValueSyncPlugin({
  value,
  lastKnownMarkdownRef
}: {
  value: string
  lastKnownMarkdownRef: React.MutableRefObject<string>
}) {
  const [editor] = useLexicalComposerContext()
  const isFirstRender = useRef(true)

  useEffect(() => {
    // Skip first render - initial value is already set via editorState
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    // Only update if value changed externally (not from our own onChange)
    // Compare against lastKnownMarkdownRef which tracks both internal edits and external updates
    if (value !== lastKnownMarkdownRef.current) {
      editor.update(() => {
        $convertFromMarkdownString(value, TRANSFORMERS)
      })
      lastKnownMarkdownRef.current = value
    }
  }, [editor, value, lastKnownMarkdownRef])

  return null
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder = 'Enter some text...',
  disabled = false,
  minHeight = '300px'
}: MarkdownEditorProps) {
  const { isDark } = useTheme()
  const lastMarkdownRef = useRef(value)
  const initialValueRef = useRef(value)

  // Memoize initialConfig to prevent recreation on every render
  const initialConfig = useMemo(
    () => ({
      namespace: 'MarkdownEditor',
      theme: editorTheme,
      nodes: [
        HeadingNode,
        QuoteNode,
        ListNode,
        ListItemNode,
        LinkNode,
        AutoLinkNode,
        CodeNode,
        CodeHighlightNode,
        HorizontalRuleNode
      ],
      editable: !disabled,
      editorState: () => {
        $convertFromMarkdownString(initialValueRef.current, TRANSFORMERS)
      },
      onError
    }),
    [disabled]
  )

  const handleChange = useCallback(
    (_editorState: EditorState, editor: LexicalEditor) => {
      editor.read(() => {
        const markdown = $convertToMarkdownString(TRANSFORMERS)
        // Only trigger onChange if content actually changed
        if (markdown !== lastMarkdownRef.current) {
          lastMarkdownRef.current = markdown
          onChange(markdown)
        }
      })
    },
    [onChange]
  )

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div
        className={`editor-container ${isDark ? 'dark' : ''}`}
        style={{ '--editor-min-height': minHeight } as React.CSSProperties}
      >
        <ToolbarPlugin />
        <div className="editor-inner">
          <RichTextPlugin
            contentEditable={
              <ContentEditable className="editor-input" spellCheck={true} />
            }
            placeholder={
              <div className="editor-placeholder">{placeholder}</div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
          <HistoryPlugin />
          <ListPlugin />
          <LinkPlugin />
          <HorizontalRulePlugin />
          <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
          <OnChangePlugin onChange={handleChange} />
          <ValueSyncPlugin
            value={value}
            lastKnownMarkdownRef={lastMarkdownRef}
          />
        </div>
      </div>
    </LexicalComposer>
  )
}
