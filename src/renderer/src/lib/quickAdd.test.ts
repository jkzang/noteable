import { describe, expect, it } from 'vitest'
import type { Project } from '@shared/types'
import { parseQuickAdd } from './quickAdd'

// Tuesday, 6 Oct 2026, 09:00 local
const now = new Date(2026, 9, 6, 9, 0)
const projects: Project[] = [
  { id: 'bible', name: 'Bible Study', color: '#7ecc49', order: 0 },
  { id: 'bib', name: 'Bible', color: '#000', order: 1 }
]

describe('parseQuickAdd', () => {
  it('extracts date, time, priority, project and labels', () => {
    const r = parseQuickAdd('Read Romans 8 tomorrow 7am p2 #Bible Study @devotional', projects, now)
    expect(r).toEqual({
      content: 'Read Romans 8',
      due: { date: '2026-10-07', time: '07:00' },
      priority: 2,
      projectId: 'bible',
      labels: ['devotional']
    })
  })

  it('leaves plain text alone', () => {
    expect(parseQuickAdd('Buy milk', projects, now)).toEqual({ content: 'Buy milk', labels: [] })
  })

  it('parses weekdays forward and date-only dues', () => {
    const r = parseQuickAdd('Call mom friday', [], now)
    expect(r.content).toBe('Call mom')
    expect(r.due).toEqual({ date: '2026-10-09' })
  })

  it('parses recurrence and anchors it to the first occurrence', () => {
    expect(parseQuickAdd('Small group every wednesday', [], now).due).toEqual({
      date: '2026-10-07',
      recurrence: 'every wednesday'
    })
    // 6am has already passed today, so the first occurrence is tomorrow.
    expect(parseQuickAdd('Read Psalms every day at 6am', [], now).due).toEqual({
      date: '2026-10-07',
      time: '06:00',
      recurrence: 'every day'
    })
  })

  it('ignores unknown projects and keeps them in the text', () => {
    expect(parseQuickAdd('Thing #Nope', projects, now).content).toBe('Thing #Nope')
  })
})
