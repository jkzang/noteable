import { BookOpen, FileText } from 'lucide-react'
import type { NoteMeta } from '@shared/types'
import { pageEmoji } from '@renderer/lib/pages'

/** A page's emoji icon, or a default document glyph like Notion's. */
export function PageIcon({ note, size = 16 }: { note: Pick<NoteMeta, 'frontmatter'>; size?: number }) {
  const emoji = pageEmoji(note)
  if (emoji) {
    return (
      <span className="page-emoji" style={{ fontSize: size * 1.05 }}>
        {emoji}
      </span>
    )
  }
  const Icon = note.frontmatter.passage ? BookOpen : FileText
  return <Icon size={size} strokeWidth={1.75} />
}
