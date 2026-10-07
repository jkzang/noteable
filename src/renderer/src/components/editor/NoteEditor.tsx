import { useEffect, useRef, useState } from 'react'
import Highlight from '@tiptap/extension-highlight'
import { TaskItem, TaskList } from '@tiptap/extension-list'
import { Placeholder } from '@tiptap/extensions'
import { Markdown } from '@tiptap/markdown'
import { EditorContent, useEditor, type Editor } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import StarterKit from '@tiptap/starter-kit'
import clsx from 'clsx'
import { Bold, Code, Highlighter, Italic, Link2, Strikethrough } from 'lucide-react'
import { SlashCommand } from './slashCommand'

interface Props {
  /** Initial Markdown; the editor is uncontrolled after mount. */
  markdown: string
  onChange(markdown: string): void
  onReady?(editor: Editor): void
  placeholder?: string
}

export const editorExtensions = (placeholder = "Write, or type '/' for commands…") => [
  StarterKit.configure({
    link: { openOnClick: false, autolink: true, HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' } }
  }),
  TaskList,
  TaskItem.configure({ nested: true }),
  Highlight,
  Placeholder.configure({
    placeholder: ({ node }) => (node.type.name === 'heading' ? `Heading ${node.attrs.level}` : placeholder)
  }),
  Markdown,
  SlashCommand
]

export function NoteEditor({ markdown, onChange, onReady, placeholder }: Props) {
  // Keep the latest callback without recreating the editor.
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const [linking, setLinking] = useState(false)

  const editor = useEditor({
    extensions: editorExtensions(placeholder),
    content: markdown,
    contentType: 'markdown',
    editorProps: {
      attributes: { class: 'prose', spellcheck: 'true' },
      // ⌘K on a selection edits its link, as in Notion. Handling it here
      // marks the event as handled, so the global quick-find shortcut skips it.
      handleKeyDown: (view, event) => {
        const mod = event.metaKey || event.ctrlKey
        if (mod && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'k' && !view.state.selection.empty) {
          setLinking(true)
          return true
        }
        return false
      }
    },
    onUpdate: ({ editor }) => onChangeRef.current(editor.getMarkdown())
  })

  useEffect(() => {
    if (editor) onReady?.(editor)
  }, [editor, onReady])

  if (!editor) return null
  return (
    <>
      <BubbleToolbar editor={editor} linking={linking} setLinking={setLinking} />
      <EditorContent editor={editor} className="editor" />
    </>
  )
}

function BubbleToolbar({
  editor,
  linking,
  setLinking
}: {
  editor: Editor
  linking: boolean
  setLinking(linking: boolean): void
}) {
  const [href, setHref] = useState('')

  useEffect(() => {
    if (linking) setHref(editor.getAttributes('link').href ?? '')
  }, [linking, editor])

  const button = (active: boolean, onClick: () => void, title: string, icon: React.ReactNode) => (
    <button
      className={clsx('bubble-button', active && 'active')}
      onMouseDown={(e) => {
        e.preventDefault()
        onClick()
      }}
      title={title}
    >
      {icon}
    </button>
  )

  const applyLink = () => {
    const url = href.trim()
    const c = editor.chain().focus().extendMarkRange('link')
    if (url) c.setLink({ href: /^[a-z]+:/i.test(url) ? url : `https://${url}` }).run()
    else c.unsetLink().run()
    setLinking(false)
  }

  return (
    <BubbleMenu editor={editor} className="bubble-menu" options={{ placement: 'top' }}>
      {linking ? (
        <input
          className="bubble-input"
          autoFocus
          placeholder="Paste a link…"
          value={href}
          onChange={(e) => setHref(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              applyLink()
            }
            if (e.key === 'Escape') setLinking(false)
          }}
          onBlur={() => setLinking(false)}
        />
      ) : (
        <>
          {button(editor.isActive('bold'), () => editor.chain().focus().toggleBold().run(), 'Bold (⌘B)', <Bold size={15} />)}
          {button(editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run(), 'Italic (⌘I)', <Italic size={15} />)}
          {button(editor.isActive('strike'), () => editor.chain().focus().toggleStrike().run(), 'Strikethrough', <Strikethrough size={15} />)}
          {button(editor.isActive('code'), () => editor.chain().focus().toggleCode().run(), 'Inline code (⌘E)', <Code size={15} />)}
          {button(editor.isActive('highlight'), () => editor.chain().focus().toggleHighlight().run(), 'Highlight', <Highlighter size={15} />)}
          {button(editor.isActive('link'), () => setLinking(true), 'Link (⌘K)', <Link2 size={15} />)}
        </>
      )}
    </BubbleMenu>
  )
}
