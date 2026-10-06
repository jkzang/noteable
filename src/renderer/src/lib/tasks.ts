import type { Priority, Task } from '@shared/types'
import { dueToDate, isOverdue, todayISO } from './dates'

export const PRIORITY_COLORS: Record<Priority, string> = {
  1: 'var(--p1)',
  2: 'var(--p2)',
  3: 'var(--p3)',
  4: 'var(--p4)'
}

/** Due date/time first (undated last), then priority, then manual order. */
export function compareTasks(a: Task, b: Task): number {
  if (a.due && b.due) {
    const d = dueToDate(a.due).getTime() - dueToDate(b.due).getTime()
    if (d !== 0) return d
  } else if (a.due || b.due) {
    return a.due ? -1 : 1
  }
  return a.priority - b.priority || a.order - b.order || a.createdAt.localeCompare(b.createdAt)
}

export const openTasks = (tasks: Task[]) => tasks.filter((t) => !t.completed)

export function inboxTasks(tasks: Task[]): Task[] {
  return openTasks(tasks).filter((t) => !t.projectId).sort(compareTasks)
}

export function todayTasks(tasks: Task[]): { overdue: Task[]; today: Task[] } {
  const today = todayISO()
  const open = openTasks(tasks).filter((t) => t.due)
  return {
    overdue: open.filter((t) => isOverdue(t.due)).sort(compareTasks),
    today: open.filter((t) => t.due!.date === today).sort(compareTasks)
  }
}

export function tasksOn(tasks: Task[], date: string): Task[] {
  return openTasks(tasks)
    .filter((t) => t.due?.date === date)
    .sort(compareTasks)
}

export function projectTasks(tasks: Task[], projectId: string): Task[] {
  return openTasks(tasks)
    .filter((t) => t.projectId === projectId)
    .sort(compareTasks)
}

export const PROJECT_COLORS = [
  '#db4035',
  '#ff9933',
  '#fad000',
  '#7ecc49',
  '#299438',
  '#6accbc',
  '#158fad',
  '#14aaf5',
  '#4073ff',
  '#884dff',
  '#af38eb',
  '#eb96eb',
  '#e05194',
  '#808080'
]
