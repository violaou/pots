import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  FORMAT_TEXT_COMMAND,
  FORMAT_ELEMENT_COMMAND,
  UNDO_COMMAND,
  REDO_COMMAND,
  CAN_UNDO_COMMAND,
  CAN_REDO_COMMAND,
  COMMAND_PRIORITY_LOW,
  ElementFormatType,
  TextFormatType
} from 'lexical'
import { $setBlocksType } from '@lexical/selection'
import {
  $createHeadingNode,
  $createQuoteNode,
  $isHeadingNode,
  $isQuoteNode,
  HeadingTagType
} from '@lexical/rich-text'
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  REMOVE_LIST_COMMAND,
  $isListNode,
  ListNode
} from '@lexical/list'
import { $isLinkNode, TOGGLE_LINK_COMMAND } from '@lexical/link'
import { $getNearestNodeOfType, mergeRegister } from '@lexical/utils'
import { $createParagraphNode, $isElementNode } from 'lexical'
import { $createCodeNode, $isCodeNode } from '@lexical/code'
import { INSERT_HORIZONTAL_RULE_COMMAND } from '@lexical/react/LexicalHorizontalRuleNode'
import { useCallback, useEffect, useState } from 'react'
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Link,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Undo,
  Redo,
  Type,
  Code,
  FileCode,
  Minus,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  RemoveFormatting,
  Subscript,
  Superscript,
  Highlighter
} from 'lucide-react'

interface ToolbarPluginProps {
  disabled?: boolean
}

export default function ToolbarPlugin({
  disabled = false
}: ToolbarPluginProps) {
  const [editor] = useLexicalComposerContext()
  const [isBold, setIsBold] = useState(false)
  const [isItalic, setIsItalic] = useState(false)
  const [isUnderline, setIsUnderline] = useState(false)
  const [isStrikethrough, setIsStrikethrough] = useState(false)
  const [isCode, setIsCode] = useState(false)
  const [isSubscript, setIsSubscript] = useState(false)
  const [isSuperscript, setIsSuperscript] = useState(false)
  const [isHighlight, setIsHighlight] = useState(false)
  const [isLink, setIsLink] = useState(false)
  const [blockType, setBlockType] = useState<string>('paragraph')
  const [elementFormat, setElementFormat] = useState<ElementFormatType>('left')
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  const updateToolbar = useCallback(() => {
    const selection = $getSelection()
    if ($isRangeSelection(selection)) {
      setIsBold(selection.hasFormat('bold'))
      setIsItalic(selection.hasFormat('italic'))
      setIsUnderline(selection.hasFormat('underline'))
      setIsStrikethrough(selection.hasFormat('strikethrough'))
      setIsCode(selection.hasFormat('code'))
      setIsSubscript(selection.hasFormat('subscript'))
      setIsSuperscript(selection.hasFormat('superscript'))
      setIsHighlight(selection.hasFormat('highlight'))

      // Check for links
      const node = selection.anchor.getNode()
      const parent = node.getParent()
      setIsLink($isLinkNode(parent) || $isLinkNode(node))

      // Check block type and alignment
      const anchorNode = selection.anchor.getNode()
      let element =
        anchorNode.getKey() === 'root'
          ? anchorNode
          : anchorNode.getTopLevelElementOrThrow()

      const elementKey = element.getKey()
      const elementDOM = editor.getElementByKey(elementKey)

      if (elementDOM !== null) {
        if ($isListNode(element)) {
          const parentList = $getNearestNodeOfType(anchorNode, ListNode)
          setBlockType(parentList ? parentList.getListType() : 'paragraph')
        } else {
          const type = $isHeadingNode(element)
            ? element.getTag()
            : $isCodeNode(element)
              ? 'code'
              : $isQuoteNode(element)
                ? 'quote'
                : 'paragraph'
          setBlockType(type)
        }
      }

      // Get element format (alignment)
      if ($isElementNode(element)) {
        setElementFormat(element.getFormatType() || 'left')
      }
    }
  }, [editor])

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          updateToolbar()
        })
      }),
      editor.registerCommand(
        CAN_UNDO_COMMAND,
        (payload) => {
          setCanUndo(payload)
          return false
        },
        COMMAND_PRIORITY_LOW
      ),
      editor.registerCommand(
        CAN_REDO_COMMAND,
        (payload) => {
          setCanRedo(payload)
          return false
        },
        COMMAND_PRIORITY_LOW
      )
    )
  }, [editor, updateToolbar])

  const formatHeading = (headingTag: HeadingTagType) => {
    if (blockType !== headingTag) {
      editor.update(() => {
        const selection = $getSelection()
        if ($isRangeSelection(selection)) {
          $setBlocksType(selection, () => $createHeadingNode(headingTag))
        }
      })
    } else {
      formatParagraph()
    }
  }

  const formatParagraph = () => {
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createParagraphNode())
      }
    })
  }

  const formatQuote = () => {
    if (blockType !== 'quote') {
      editor.update(() => {
        const selection = $getSelection()
        if ($isRangeSelection(selection)) {
          $setBlocksType(selection, () => $createQuoteNode())
        }
      })
    } else {
      formatParagraph()
    }
  }

  const formatCodeBlock = () => {
    if (blockType !== 'code') {
      editor.update(() => {
        const selection = $getSelection()
        if ($isRangeSelection(selection)) {
          if (selection.isCollapsed()) {
            $setBlocksType(selection, () => $createCodeNode())
          } else {
            const textContent = selection.getTextContent()
            const codeNode = $createCodeNode()
            selection.insertNodes([codeNode])
            selection.insertRawText(textContent)
          }
        }
      })
    } else {
      formatParagraph()
    }
  }

  const formatBulletList = () => {
    if (blockType !== 'bullet') {
      editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)
    } else {
      editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined)
    }
  }

  const formatNumberedList = () => {
    if (blockType !== 'number') {
      editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)
    } else {
      editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined)
    }
  }

  const insertLink = () => {
    if (!isLink) {
      const url = prompt('Enter URL:')
      if (url) {
        editor.dispatchCommand(TOGGLE_LINK_COMMAND, url)
      }
    } else {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, null)
    }
  }

  const insertHorizontalRule = () => {
    editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined)
  }

  const clearFormatting = useCallback(() => {
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        const anchor = selection.anchor
        const focus = selection.focus
        const nodes = selection.getNodes()

        if (anchor.key === focus.key && anchor.offset === focus.offset) {
          return
        }

        nodes.forEach((node) => {
          if ($isTextNode(node)) {
            const formats: TextFormatType[] = [
              'bold',
              'italic',
              'underline',
              'strikethrough',
              'code',
              'subscript',
              'superscript',
              'highlight'
            ]
            formats.forEach((format) => {
              if (node.hasFormat(format)) {
                selection.formatText(format)
              }
            })
          }
        })
      }
    })
  }, [editor])

  const ToolbarButton = ({
    onClick,
    isActive = false,
    disabled: buttonDisabled = false,
    children,
    title
  }: {
    onClick: () => void
    isActive?: boolean
    disabled?: boolean
    children: React.ReactNode
    title: string
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || buttonDisabled}
      title={title}
      className={`toolbar-button ${isActive ? 'active' : ''}`}
    >
      {children}
    </button>
  )

  const Separator = () => <div className="toolbar-separator" />

  return (
    <div className="editor-toolbar">
      {/* Undo/Redo */}
      <ToolbarButton
        onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
        disabled={!canUndo}
        title="Undo (Ctrl+Z)"
      >
        <Undo size={18} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}
        disabled={!canRedo}
        title="Redo (Ctrl+Y)"
      >
        <Redo size={18} />
      </ToolbarButton>

      <Separator />

      {/* Block Type */}
      <ToolbarButton
        onClick={formatParagraph}
        isActive={blockType === 'paragraph'}
        title="Normal Text"
      >
        <Type size={18} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => formatHeading('h1')}
        isActive={blockType === 'h1'}
        title="Heading 1"
      >
        <Heading1 size={18} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => formatHeading('h2')}
        isActive={blockType === 'h2'}
        title="Heading 2"
      >
        <Heading2 size={18} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => formatHeading('h3')}
        isActive={blockType === 'h3'}
        title="Heading 3"
      >
        <Heading3 size={18} />
      </ToolbarButton>

      <Separator />

      {/* Text Formatting */}
      <ToolbarButton
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')}
        isActive={isBold}
        title="Bold (Ctrl+B)"
      >
        <Bold size={18} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')}
        isActive={isItalic}
        title="Italic (Ctrl+I)"
      >
        <Italic size={18} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline')}
        isActive={isUnderline}
        title="Underline (Ctrl+U)"
      >
        <Underline size={18} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() =>
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough')
        }
        isActive={isStrikethrough}
        title="Strikethrough"
      >
        <Strikethrough size={18} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'code')}
        isActive={isCode}
        title="Inline Code"
      >
        <Code size={18} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'highlight')}
        isActive={isHighlight}
        title="Highlight"
      >
        <Highlighter size={18} />
      </ToolbarButton>

      <Separator />

      {/* Subscript/Superscript */}
      <ToolbarButton
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'subscript')}
        isActive={isSubscript}
        title="Subscript"
      >
        <Subscript size={18} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() =>
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'superscript')
        }
        isActive={isSuperscript}
        title="Superscript"
      >
        <Superscript size={18} />
      </ToolbarButton>

      <Separator />

      {/* Link */}
      <ToolbarButton onClick={insertLink} isActive={isLink} title="Insert Link">
        <Link size={18} />
      </ToolbarButton>

      <Separator />

      {/* Lists & Blocks */}
      <ToolbarButton
        onClick={formatBulletList}
        isActive={blockType === 'bullet'}
        title="Bullet List"
      >
        <List size={18} />
      </ToolbarButton>
      <ToolbarButton
        onClick={formatNumberedList}
        isActive={blockType === 'number'}
        title="Numbered List"
      >
        <ListOrdered size={18} />
      </ToolbarButton>
      <ToolbarButton
        onClick={formatQuote}
        isActive={blockType === 'quote'}
        title="Block Quote"
      >
        <Quote size={18} />
      </ToolbarButton>
      <ToolbarButton
        onClick={formatCodeBlock}
        isActive={blockType === 'code'}
        title="Code Block"
      >
        <FileCode size={18} />
      </ToolbarButton>

      <Separator />

      {/* Horizontal Rule */}
      <ToolbarButton onClick={insertHorizontalRule} title="Horizontal Rule">
        <Minus size={18} />
      </ToolbarButton>

      <Separator />

      {/* Text Alignment */}
      <ToolbarButton
        onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'left')}
        isActive={elementFormat === 'left'}
        title="Align Left"
      >
        <AlignLeft size={18} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'center')}
        isActive={elementFormat === 'center'}
        title="Align Center"
      >
        <AlignCenter size={18} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'right')}
        isActive={elementFormat === 'right'}
        title="Align Right"
      >
        <AlignRight size={18} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() =>
          editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'justify')
        }
        isActive={elementFormat === 'justify'}
        title="Justify"
      >
        <AlignJustify size={18} />
      </ToolbarButton>

      <Separator />

      {/* Clear Formatting */}
      <ToolbarButton onClick={clearFormatting} title="Clear Formatting">
        <RemoveFormatting size={18} />
      </ToolbarButton>
    </div>
  )
}
