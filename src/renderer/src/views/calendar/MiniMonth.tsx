import { useEffect, useState } from 'react'
import { addDays, addMonths, format, isSameDay, isSameMonth, isToday, startOfMonth, startOfWeek } from 'date-fns'
import clsx from 'clsx'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  selected: Date
  /** Days the main view currently shows, highlighted softly. */
  range: Date[]
  weekStartsOn: 0 | 1
  onPick(day: Date): void
}

/** The small month navigator in Google Calendar's side panel. */
export function MiniMonth({ selected, range, weekStartsOn, onPick }: Props) {
  const [month, setMonth] = useState(() => startOfMonth(selected))

  useEffect(() => {
    setMonth(startOfMonth(selected))
  }, [selected])

  const first = startOfWeek(month, { weekStartsOn })
  const cells = Array.from({ length: 42 }, (_, i) => addDays(first, i))
  const inRange = (d: Date) => range.length > 0 && range.length <= 31 && d >= range[0] && d <= range[range.length - 1]

  return (
    <div className="mini-month">
      <div className="mini-month-head">
        <span>{format(month, 'MMMM yyyy')}</span>
        <button className="icon-button small" onClick={() => setMonth(addMonths(month, -1))} title="Previous month">
          <ChevronLeft size={16} />
        </button>
        <button className="icon-button small" onClick={() => setMonth(addMonths(month, 1))} title="Next month">
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="mini-month-grid">
        {cells.slice(0, 7).map((d) => (
          <span key={`h${d.getDay()}`} className="mini-dow">
            {format(d, 'EEEEE')}
          </span>
        ))}
        {cells.map((d) => (
          <button
            key={d.toISOString()}
            className={clsx(
              'mini-day',
              !isSameMonth(d, month) && 'outside',
              inRange(d) && 'in-range',
              isSameDay(d, selected) && 'selected',
              isToday(d) && 'today'
            )}
            onClick={() => onPick(d)}
          >
            {d.getDate()}
          </button>
        ))}
      </div>
    </div>
  )
}
