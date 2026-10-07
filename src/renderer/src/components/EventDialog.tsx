import { useEffect, useState } from 'react'
import { addDays, differenceInCalendarDays, differenceInMinutes, format } from 'date-fns'
import { AlignLeft, Clock, MapPin, Palette, Trash2, X } from 'lucide-react'
import type { CalendarEvent } from '@shared/types'
import { DEFAULT_EVENT_COLOR, EVENT_COLORS, itemDays } from '@renderer/lib/calendar'
import { useStore } from '@renderer/store/useStore'
import { Modal } from './Modal'

interface Props {
  event: CalendarEvent | null
  onClose(): void
}

const dateOf = (d: Date) => format(d, 'yyyy-MM-dd')
const timeOf = (d: Date) => format(d, 'HH:mm')
const combine = (date: string, time: string) => new Date(`${date}T${time}:00`)

/** Google-Calendar-style event editor ("More options"). */
export function EventDialog({ event, onClose }: Props) {
  const saveEvent = useStore((s) => s.saveEvent)
  const deleteEvent = useStore((s) => s.deleteEvent)
  const notify = useStore((s) => s.notify)
  const exists = useStore((s) => (event ? s.events.some((e) => e.id === event.id) : false))

  const [title, setTitle] = useState('')
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [endDate, setEndDate] = useState('')
  const [endTime, setEndTime] = useState('10:00')
  const [allDay, setAllDay] = useState(false)
  const [color, setColor] = useState(DEFAULT_EVENT_COLOR)
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    if (!event) return
    const start = new Date(event.start)
    const end = new Date(event.end)
    setTitle(event.title === '(No title)' ? '' : event.title)
    setAllDay(event.allDay)
    setStartDate(dateOf(start))
    if (event.allDay) {
      // All-day ends are exclusive (midnight after the last day); show the last day itself.
      setEndDate(dateOf(itemDays({ start, end }).last))
      setStartTime('09:00')
      setEndTime('10:00')
    } else {
      setEndDate(dateOf(end))
      setStartTime(timeOf(start))
      setEndTime(timeOf(end))
    }
    setColor(event.color ?? DEFAULT_EVENT_COLOR)
    setLocation(event.location ?? '')
    setDescription(event.description ?? '')
  }, [event])

  if (!event) return null

  // Like Google, moving the start keeps the event's length.
  const moveStart = (date: string, time: string) => {
    const oldStart = combine(startDate, startTime)
    if (allDay) {
      const days = differenceInCalendarDays(combine(endDate, '00:00'), combine(startDate, '00:00'))
      setEndDate(dateOf(addDays(combine(date, '00:00'), Math.max(days, 0))))
    } else {
      const minutes = Math.max(differenceInMinutes(combine(endDate, endTime), oldStart), 15)
      const end = new Date(combine(date, time).getTime() + minutes * 60000)
      setEndDate(dateOf(end))
      setEndTime(timeOf(end))
    }
    setStartDate(date)
    setStartTime(time)
  }

  const save = async () => {
    let start: Date
    let end: Date
    if (allDay) {
      start = combine(startDate, '00:00')
      end = addDays(combine(endDate < startDate ? startDate : endDate, '00:00'), 1)
    } else {
      start = combine(startDate, startTime)
      end = combine(endDate, endTime)
      if (end <= start) end = new Date(start.getTime() + 30 * 60000)
    }
    await saveEvent({
      ...event,
      title: title.trim() || '(No title)',
      start: start.toISOString(),
      end: end.toISOString(),
      allDay,
      color,
      location: location.trim() || undefined,
      description: description.trim() || undefined
    })
    onClose()
  }

  const palette = EVENT_COLORS.some((c) => c.value === color) ? EVENT_COLORS : [...EVENT_COLORS, { name: 'Custom', value: color }]

  return (
    <Modal open onClose={onClose} className="event-dialog">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
      >
        <header className="modal-header">
          <button type="button" className="icon-button" onClick={onClose} title="Close">
            <X size={18} />
          </button>
          <input className="event-title" autoFocus placeholder="Add title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <button type="submit" className="button primary">
            Save
          </button>
        </header>

        <div className="ed-row">
          <Clock size={18} className="ed-icon" />
          <div className="ed-when">
            <input className="input" type="date" value={startDate} onChange={(e) => moveStart(e.target.value, startTime)} required />
            {!allDay && (
              <input className="input" type="time" value={startTime} onChange={(e) => moveStart(startDate, e.target.value)} required />
            )}
            <span className="muted">to</span>
            {!allDay && <input className="input" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />}
            <input className="input" type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} required />
          </div>
        </div>
        <div className="ed-row">
          <span className="ed-icon" />
          <label className="checkbox">
            <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />
            All day
          </label>
        </div>
        <div className="ed-row">
          <MapPin size={18} className="ed-icon" />
          <input className="input grow" placeholder="Add location" value={location} onChange={(e) => setLocation(e.target.value)} />
        </div>
        <div className="ed-row">
          <AlignLeft size={18} className="ed-icon" />
          <textarea className="input grow" rows={4} placeholder="Add description" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="ed-row">
          <Palette size={18} className="ed-icon" />
          <div className="color-row">
            {palette.map((c) => (
              <button
                type="button"
                key={c.value}
                className={`color-swatch ${c.value === color ? 'selected' : ''}`}
                style={{ background: c.value }}
                onClick={() => setColor(c.value)}
                title={c.name}
                aria-label={c.name}
              />
            ))}
          </div>
        </div>

        <div className="modal-footer">
          {exists && (
            <button
              type="button"
              className="icon-button"
              title="Delete event"
              onClick={() => {
                void deleteEvent(event.id)
                notify('Event deleted', () => void saveEvent(event))
                onClose()
              }}
            >
              <Trash2 size={18} />
            </button>
          )}
          <div className="spacer" />
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  )
}
