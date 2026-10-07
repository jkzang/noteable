import { format, isSameDay, isToday } from 'date-fns'
import clsx from 'clsx'
import { Check } from 'lucide-react'
import { isSpanning, itemDays, shortTime, timeRange, touchesDay, type CalItem } from '@renderer/lib/calendar'

interface Props {
  days: Date[]
  items: CalItem[]
  now: Date
  selectedId: string | null
  onPickDay(day: Date): void
  onOpen(item: CalItem, el: Element): void
  onToggleTask(id: string): void
}

function whenOn(item: CalItem, day: Date): string {
  if (isSpanning(item)) return 'All day'
  const { first, last } = itemDays(item)
  if (isSameDay(first, last)) return timeRange(item.start, item.end)
  if (isSameDay(day, first)) return `${shortTime(item.start)} –`
  if (isSameDay(day, last)) return `– ${shortTime(item.end)}`
  return 'All day'
}

/** Google's "Schedule" view: an agenda of upcoming days that have something on them. */
export function ScheduleList({ days, items, now, selectedId, onPickDay, onOpen, onToggleTask }: Props) {
  const groups = days
    .map((day) => ({
      day,
      items: items
        .filter((i) => touchesDay(i, day))
        .sort((a, b) => Number(isSpanning(b)) - Number(isSpanning(a)) || a.start.getTime() - b.start.getTime())
    }))
    .filter((g) => g.items.length > 0)

  if (groups.length === 0) {
    return (
      <div className="sch">
        <div className="sch-empty">
          Nothing planned from {format(days[0], 'MMMM d')} to {format(days[days.length - 1], 'MMMM d')}.
        </div>
      </div>
    )
  }

  return (
    <div className="sch">
      {groups.map(({ day, items: dayItems }) => (
        <div key={day.toISOString()} className={clsx('sch-day', isToday(day) && 'today')}>
          <button className="sch-date" onClick={() => onPickDay(day)}>
            <span className="dom">{format(day, 'd')}</span>
            <span className="sch-dow">{format(day, 'MMM, EEE')}</span>
          </button>
          <div className="sch-items">
            {dayItems.map((item) => (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                className={clsx('sch-item', item.end < now && 'past', item.id === selectedId && 'selected')}
                style={{ '--ev': item.color } as React.CSSProperties}
                onClick={(e) => onOpen(item, e.currentTarget)}
                onKeyDown={(e) => e.key === 'Enter' && onOpen(item, e.currentTarget)}
              >
                {item.kind === 'task' ? (
                  <button
                    className="mini-check"
                    onClick={(e) => {
                      e.stopPropagation()
                      onToggleTask(item.id)
                    }}
                    title="Mark complete"
                  >
                    <Check size={9} strokeWidth={3} />
                  </button>
                ) : (
                  <span className="dot" />
                )}
                <span className="sch-time">{whenOn(item, day)}</span>
                <span className="sch-title">{item.title}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
