import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { Trash2, X } from 'lucide-react'
import type { CalendarEvent } from '@shared/types'
import { PROJECT_COLORS } from '@renderer/lib/tasks'
import { useStore } from '@renderer/store/useStore'
import { Modal } from './Modal'

interface Props {
  event: CalendarEvent | null
  onClose(): void
}

const dateOf = (iso: string) => format(new Date(iso), 'yyyy-MM-dd')
const timeOf = (iso: string) => format(new Date(iso), 'HH:mm')
const combine = (date: string, time: string) => new Date(`${date}T${time}:00`).toISOString()

export function EventDialog({ event, onClose }: Props) {
  const saveEvent = useStore((s) => s.saveEvent)
  const deleteEvent = useStore((s) => s.deleteEvent)
  const exists = useStore((s) => (event ? s.events.some((e) => e.id === event.id) : false))

  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [start, setStart] = useState('09:00')
  const [end, setEnd] = useState('10:00')
  const [allDay, setAllDay] = useState(false)
  const [color, setColor] = useState(PROJECT_COLORS[12])
  const [description, setDescription] = useState('')

  useEffect(() => {
    if (!event) return
    setTitle(event.title)
    setDate(dateOf(event.start))
    setStart(timeOf(event.start))
    setEnd(timeOf(event.end))
    setAllDay(event.allDay)
    setColor(event.color ?? PROJECT_COLORS[12])
    setDescription(event.description ?? '')
  }, [event])

  if (!event) return null

  const save = async () => {
    const startIso = allDay ? combine(date, '00:00') : combine(date, start)
    let endIso = allDay ? combine(date, '23:59') : combine(date, end)
    if (endIso <= startIso) endIso = new Date(new Date(startIso).getTime() + 30 * 60000).toISOString()
    await saveEvent({
      ...event,
      title: title.trim() || '(No title)',
      start: startIso,
      end: endIso,
      allDay,
      color,
      description: description.trim() || undefined
    })
    onClose()
  }

  return (
    <Modal open onClose={onClose} className="event-dialog">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
      >
        <header className="modal-header">
          <input className="event-title" autoFocus placeholder="Add title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <button type="button" className="icon-button" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </header>
        <div className="settings-row">
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          {!allDay && (
            <>
              <input className="input" type="time" value={start} onChange={(e) => setStart(e.target.value)} />
              <span className="muted">–</span>
              <input className="input" type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
            </>
          )}
          <label className="checkbox">
            <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />
            All day
          </label>
        </div>
        <textarea
          className="input"
          rows={3}
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <div className="color-row">
          {PROJECT_COLORS.map((c) => (
            <button
              type="button"
              key={c}
              className={`color-swatch ${c === color ? 'selected' : ''}`}
              style={{ background: c }}
              onClick={() => setColor(c)}
              aria-label={`Color ${c}`}
            />
          ))}
        </div>
        <div className="modal-footer">
          {exists && (
            <button
              type="button"
              className="icon-button"
              title="Delete event"
              onClick={() => {
                void deleteEvent(event.id)
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
          <button type="submit" className="button primary">
            Save
          </button>
        </div>
      </form>
    </Modal>
  )
}
