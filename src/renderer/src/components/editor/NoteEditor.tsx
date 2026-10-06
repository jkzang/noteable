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

  const editor = useEditor({
    extensions: editorExtensions(placeholder),
    content: markdown,
    contentType: 'markdown',
    editorProps: { attributes: { class: 'prose', spellcheck: 'true' } },
    onUpdate: ({ editor }) => onChangeRef.current(editor.getMarkdown())
  })

  useEffect(() => {
    if (editor) onReady?.(editor)
  }, [editor, onReady])

  if (!editor) return null
  return (
    <>
      <BubbleToolbar editor={editor} />
      <EditorContent editor={editor} className="editor" />
    </>
  )
}

function BubbleToolbar({ editor }: { editor: Editor }) {
  const [linking, setLinking] = useState(false)
  const [href, setHref] = useState('')

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
          {button(
            editor.isActive('link'),
            () => {
              setHref(editor.getAttributes('link').href ?? '')
              setLinking(true)
            },
            'Link (⌘K)',
            <Link2 size={15} />
          )}
        </>
      )}
    </BubbleMenu>
  )
}
