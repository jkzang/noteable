import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns'
import type { Due, ISODate } from '@shared/types'

export const toISODate = (d: Date): ISODate => format(d, 'yyyy-MM-dd')
export const todayISO = (): ISODate => toISODate(new Date())
export const fromISODate = (s: ISODate): Date => parseISO(s)

/** Due date + time as a Date (time defaults to end of day for sorting). */
export function dueToDate(due: Due): Date {
  const d = parseISO(due.date)
  if (due.time) {
    const [h, m] = due.time.split(':').map(Number)
    d.setHours(h, m, 0, 0)
  } else {
    d.setHours(23, 59, 59, 999)
  }
  return d
}

export function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const d = new Date()
  d.setHours(h, m, 0, 0)
  return format(d, m === 0 ? 'h a' : 'h:mm a')
}

export type DueTone = 'overdue' | 'today' | 'tomorrow' | 'week' | 'later'

/** Todoist-style relative label and colour bucket for a due date. */
export function describeDue(due: Due, now = new Date()): { label: string; tone: DueTone } {
  const date = parseISO(due.date)
  const diff = differenceInCalendarDays(date, now)
  let label: string
  let tone: DueTone
  if (diff < 0) {
    tone = 'overdue'
    label = diff === -1 ? 'Yesterday' : format(date, date.getFullYear() === now.getFullYear() ? 'MMM d' : 'MMM d yyyy')
  } else if (diff === 0) {
    tone = 'today'
    label = 'Today'
  } else if (diff === 1) {
    tone = 'tomorrow'
    label = 'Tomorrow'
  } else if (diff < 7) {
    tone = 'week'
    label = format(date, 'EEEE')
  } else {
    tone = 'later'
    label = format(date, date.getFullYear() === now.getFullYear() ? 'MMM d' : 'MMM d yyyy')
  }
  if (due.time) label += ` ${formatTime(due.time)}`
  if (tone === 'today' && due.time && dueToDate(due) < now) tone = 'overdue'
  return { label, tone }
}

export function isOverdue(due: Due | undefined, now = new Date()): boolean {
  if (!due) return false
  return differenceInCalendarDays(parseISO(due.date), now) < 0
}

export function nextDays(count: number, from = new Date()): Date[] {
  return Array.from({ length: count }, (_, i) => addDays(from, i))
}
