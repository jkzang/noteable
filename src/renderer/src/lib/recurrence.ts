import { addDays, addMonths, addWeeks, addYears, format, getDay, parseISO } from 'date-fns'
import type { Due, ISODate } from '@shared/types'

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

/** Matches the recurrence phrases we understand, e.g. "every day", "every 2 weeks", "every monday". */
export const RECURRENCE_PATTERN =
  /\bevery\s+(?:other\s+)?(?:day|weekday|week|month|year|\d+\s+(?:days?|weeks?|months?|years?)|(?:mon|tues|wednes|thurs|fri|satur|sun)day)\b/i

type Step = (d: Date) => Date

function stepFor(rule: string): Step | null {
  const r = rule.toLowerCase().replace(/\s+/g, ' ').trim()
  const m = /^every (other |\d+ )?(\w+)$/.exec(r)
  if (!m) return null
  const n = m[1] === 'other ' ? 2 : m[1] ? parseInt(m[1], 10) : 1
  const unit = m[2].replace(/s$/, '')

  switch (unit) {
    case 'day':
      return (d) => addDays(d, n)
    case 'week':
      return (d) => addWeeks(d, n)
    case 'month':
      return (d) => addMonths(d, n)
    case 'year':
      return (d) => addYears(d, n)
    case 'weekday':
      return (d) => {
        let next = addDays(d, 1)
        while (getDay(next) === 0 || getDay(next) === 6) next = addDays(next, 1)
        return next
      }
    default: {
      const target = WEEKDAYS.indexOf(unit)
      if (target === -1) return null
      return (d) => {
        let next = addDays(d, 1)
        while (getDay(next) !== target) next = addDays(next, 1)
        return next
      }
    }
  }
}

export function isValidRecurrence(rule: string): boolean {
  return stepFor(rule) !== null
}

/** First date on or after `from` that matches the rule (for "every monday" typed without a date). */
export function firstOccurrence(rule: string, from: Date): ISODate {
  const r = rule.toLowerCase()
  const weekday = WEEKDAYS.findIndex((w) => r.endsWith(w))
  let d = from
  if (weekday !== -1) while (getDay(d) !== weekday) d = addDays(d, 1)
  if (r.endsWith('weekday')) while (getDay(d) === 0 || getDay(d) === 6) d = addDays(d, 1)
  return format(d, 'yyyy-MM-dd')
}

/**
 * The next due date after completing a recurring task. Advances from the
 * current due date and skips any occurrences that are already in the past.
 */
export function nextDue(due: Due, today: Date = new Date()): Due | null {
  if (!due.recurrence) return null
  const step = stepFor(due.recurrence)
  if (!step) return null
  const todayStr = format(today, 'yyyy-MM-dd')
  let next = step(parseISO(due.date))
  while (format(next, 'yyyy-MM-dd') <= todayStr) next = step(next)
  return { ...due, date: format(next, 'yyyy-MM-dd') }
}
