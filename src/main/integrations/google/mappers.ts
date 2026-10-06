// Pure mapping between Google Calendar / Google Tasks REST resources and
// Noteable records. Kept free of network code so it can be unit-tested now
// and reused by the sync providers once OAuth is wired up (see README.md).

import type { CalendarEvent, Task } from '@shared/types'

export const GOOGLE_CALENDAR_PROVIDER = 'google-calendar'
export const GOOGLE_TASKS_PROVIDER = 'google-tasks'

/** Subset of https://developers.google.com/calendar/api/v3/reference/events */
export interface GoogleCalendarEvent {
  id: string
  status?: 'confirmed' | 'tentative' | 'cancelled'
  summary?: string
  description?: string
  location?: string
  start: { date?: string; dateTime?: string; timeZone?: string }
  end: { date?: string; dateTime?: string; timeZone?: string }
  updated?: string
}

/** Subset of https://developers.google.com/tasks/reference/rest/v1/tasks */
export interface GoogleTask {
  id: string
  title?: string
  notes?: string
  status: 'needsAction' | 'completed'
  /** RFC 3339; Google Tasks only keeps the date portion. */
  due?: string
  completed?: string
  parent?: string
  updated?: string
  deleted?: boolean
}

export function fromGoogleEvent(g: GoogleCalendarEvent, calendarId: string, existing?: CalendarEvent): CalendarEvent {
  const allDay = Boolean(g.start.date)
  // All-day events use exclusive end dates in Google; keep them as-is (ISO at midnight local).
  const start = allDay ? `${g.start.date}T00:00:00` : g.start.dateTime!
  const end = allDay ? `${g.end.date}T00:00:00` : g.end.dateTime!
  return {
    id: existing?.id ?? crypto.randomUUID(),
    title: g.summary ?? '(No title)',
    description: g.description,
    location: g.location,
    start: new Date(start).toISOString(),
    end: new Date(end).toISOString(),
    allDay,
    calendarId,
    color: existing?.color,
    notePath: existing?.notePath,
    updatedAt: g.updated ?? new Date().toISOString(),
    external: { ...existing?.external, [GOOGLE_CALENDAR_PROVIDER]: g.id }
  }
}

export function toGoogleEvent(e: CalendarEvent): Omit<GoogleCalendarEvent, 'id'> & { id?: string } {
  const toDate = (iso: string) => {
    const d = new Date(iso)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  }
  return {
    id: e.external?.[GOOGLE_CALENDAR_PROVIDER],
    summary: e.title,
    description: e.description,
    location: e.location,
    start: e.allDay ? { date: toDate(e.start) } : { dateTime: e.start },
    end: e.allDay ? { date: toDate(e.end) } : { dateTime: e.end }
  }
}

export function fromGoogleTask(g: GoogleTask, existing?: Task): Task {
  const now = new Date().toISOString()
  return {
    id: existing?.id ?? crypto.randomUUID(),
    content: g.title ?? '',
    description: g.notes,
    projectId: existing?.projectId,
    priority: existing?.priority ?? 4,
    // Google Tasks drops times, so keep any local time/recurrence we already had.
    due: g.due ? { ...existing?.due, date: g.due.slice(0, 10) } : undefined,
    labels: existing?.labels ?? [],
    completed: g.status === 'completed',
    completedAt: g.completed,
    order: existing?.order ?? 0,
    createdAt: existing?.createdAt ?? now,
    updatedAt: g.updated ?? now,
    external: { ...existing?.external, [GOOGLE_TASKS_PROVIDER]: g.id }
  }
}

export function toGoogleTask(t: Task): Omit<GoogleTask, 'id'> & { id?: string } {
  return {
    id: t.external?.[GOOGLE_TASKS_PROVIDER],
    title: t.content,
    notes: t.description,
    status: t.completed ? 'completed' : 'needsAction',
    due: t.due ? `${t.due.date}T00:00:00.000Z` : undefined
  }
}
