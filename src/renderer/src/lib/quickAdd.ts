import * as chrono from 'chrono-node'
import type { Due, Priority, Project } from '@shared/types'
import { toISODate } from './dates'
import { firstOccurrence, RECURRENCE_PATTERN } from './recurrence'

export interface ParsedQuickAdd {
  content: string
  due?: Due
  priority?: Priority
  projectId?: string
  labels: string[]
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Removes a matched span and tidies the whitespace left behind. */
function cut(text: string, index: number, length: number): string {
  return (text.slice(0, index) + ' ' + text.slice(index + length)).replace(/\s{2,}/g, ' ')
}

/**
 * Todoist-style natural language parsing:
 *   "Read Romans 8 tomorrow 7am p2 #Bible Study @devotional every day"
 * → content "Read Romans 8", due tomorrow 07:00 recurring daily, priority 2,
 *   project "Bible Study" (matched against existing projects), label "devotional".
 */
export function parseQuickAdd(input: string, projects: Project[] = [], now = new Date()): ParsedQuickAdd {
  let text = ` ${input} `
  const result: ParsedQuickAdd = { content: '', labels: [] }

  // Recurrence first so chrono does not swallow "monday" out of "every monday".
  let recurrence: string | undefined
  const rec = RECURRENCE_PATTERN.exec(text)
  if (rec) {
    recurrence = rec[0].toLowerCase().replace(/\s+/g, ' ')
    text = cut(text, rec.index, rec[0].length)
  }

  const prio = /\s[pP]([1-4])(?=\s)/.exec(text)
  if (prio) {
    result.priority = Number(prio[1]) as Priority
    text = cut(text, prio.index, prio[0].length)
  }

  // Projects may contain spaces, so match known names longest-first.
  const byLength = [...projects].sort((a, b) => b.name.length - a.name.length)
  for (const p of byLength) {
    const re = new RegExp(`\\s#${p.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=\\s)`, 'i')
    const m = re.exec(text)
    if (m) {
      result.projectId = p.id
      text = cut(text, m.index, m[0].length)
      break
    }
  }

  text = text.replace(/\s@([\w-]+)(?=\s)/g, (_, label: string) => {
    result.labels.push(label)
    return ' '
  })

  const [date] = chrono.parse(text, now, { forwardDate: true })
  if (date) {
    const start = date.start
    const due: Due = { date: toISODate(start.date()) }
    if (start.isCertain('hour')) due.time = `${pad(start.get('hour') ?? 0)}:${pad(start.get('minute') ?? 0)}`
    result.due = due
    text = cut(text, date.index, date.text.length)
  }

  if (recurrence) {
    result.due = { ...(result.due ?? { date: firstOccurrence(recurrence, now) }), recurrence }
  }

  result.content = text.replace(/\s+/g, ' ').trim()
  return result
}
