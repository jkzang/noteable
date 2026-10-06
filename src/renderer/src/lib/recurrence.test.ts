import { describe, expect, it } from 'vitest'
import { isValidRecurrence, nextDue } from './recurrence'

const today = new Date(2026, 9, 6) // Tue 6 Oct 2026

describe('nextDue', () => {
  it('advances daily tasks to tomorrow', () => {
    expect(nextDue({ date: '2026-10-06', recurrence: 'every day' }, today)).toEqual({
      date: '2026-10-07',
      recurrence: 'every day'
    })
  })

  it('skips missed occurrences of overdue tasks', () => {
    expect(nextDue({ date: '2026-09-01', recurrence: 'every day' }, today)?.date).toBe('2026-10-07')
  })

  it('keeps the time and handles weekdays', () => {
    expect(nextDue({ date: '2026-10-06', time: '07:00', recurrence: 'every friday' }, today)).toEqual({
      date: '2026-10-09',
      time: '07:00',
      recurrence: 'every friday'
    })
    // Friday 9 Oct → Monday 12 Oct
    expect(nextDue({ date: '2026-10-09', recurrence: 'every weekday' }, today)?.date).toBe('2026-10-12')
  })

  it('supports intervals', () => {
    expect(nextDue({ date: '2026-10-06', recurrence: 'every 2 weeks' }, today)?.date).toBe('2026-10-20')
    expect(nextDue({ date: '2026-10-31', recurrence: 'every month' }, today)?.date).toBe('2026-11-30')
    expect(nextDue({ date: '2026-10-06', recurrence: 'every other day' }, today)?.date).toBe('2026-10-08')
  })

  it('returns null for non-recurring or unknown rules', () => {
    expect(nextDue({ date: '2026-10-06' }, today)).toBeNull()
    expect(isValidRecurrence('every blue moon')).toBe(false)
  })
})
