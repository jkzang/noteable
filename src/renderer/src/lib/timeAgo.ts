import { differenceInCalendarDays, format } from 'date-fns'

/** Compact Notion-style relative time: "just now", "5m ago", "3h ago", "yesterday", "Oct 2". */
export function timeAgo(when: number | Date, now: Date = new Date()): string {
  const date = new Date(when)
  const minutes = Math.floor((now.getTime() - date.getTime()) / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (minutes < 60 * 24 && differenceInCalendarDays(now, date) === 0) return `${Math.floor(minutes / 60)}h ago`
  const days = differenceInCalendarDays(now, date)
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days}d ago`
  return format(date, date.getFullYear() === now.getFullYear() ? 'MMM d' : 'MMM d, yyyy')
}
