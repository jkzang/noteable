import YAML from 'yaml'
import type { NoteFrontmatter } from '@shared/types'

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/

export function parseNote(raw: string): { frontmatter: NoteFrontmatter; body: string } {
  const match = FRONTMATTER.exec(raw)
  if (!match) return { frontmatter: {}, body: raw }

  let frontmatter: NoteFrontmatter = {}
  try {
    const parsed = YAML.parse(match[1])
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) frontmatter = parsed
  } catch {
    // Malformed YAML: treat the block as body text rather than losing it.
    return { frontmatter: {}, body: raw }
  }
  return { frontmatter, body: raw.slice(match[0].length).replace(/^\r?\n/, '') }
}

export function serializeNote(frontmatter: NoteFrontmatter, body: string): string {
  const entries = Object.entries(frontmatter).filter(([, v]) => v !== undefined && v !== null && v !== '')
  if (entries.length === 0) return body
  const yaml = YAML.stringify(Object.fromEntries(entries)).trimEnd()
  return `---\n${yaml}\n---\n\n${body.replace(/^\n+/, '')}`
}
