import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { CheckCircle2, Trash2 } from 'lucide-react'
import { TaskItem } from '@renderer/components/TaskItem'
import { TaskList } from '@renderer/components/TaskList'
import { nextDays, todayISO, toISODate } from '@renderer/lib/dates'
import { compareTasks, inboxTasks, projectTasks, tasksOn, todayTasks } from '@renderer/lib/tasks'
import { useStore } from '@renderer/store/useStore'

function ViewHeader(props: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <header className="view-header">
      <div>
        <h1>{props.title}</h1>
        {props.subtitle && <div className="view-subtitle">{props.subtitle}</div>}
      </div>
      <div className="view-actions">{props.actions}</div>
    </header>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="empty-state">
      <CheckCircle2 size={40} strokeWidth={1.2} />
      <p>{message}</p>
    </div>
  )
}

function CompletedToggle({ projectId, inbox }: { projectId?: string; inbox?: boolean }) {
  const [show, setShow] = useState(false)
  const tasks = useStore((s) => s.tasks)
  const done = tasks
    .filter((t) => t.completed && (inbox ? !t.projectId : t.projectId === projectId))
    .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))
  if (done.length === 0) return null
  return (
    <div className="completed-section">
      <button className="link-button" onClick={() => setShow(!show)}>
        {show ? 'Hide' : 'Show'} completed ({done.length})
      </button>
      {show && done.map((t) => <TaskItem key={t.id} task={t} />)}
    </div>
  )
}

export function InboxView() {
  const tasks = useStore((s) => s.tasks)
  const list = useMemo(() => inboxTasks(tasks), [tasks])
  return (
    <div className="view">
      <ViewHeader title="Inbox" />
      <TaskList tasks={list} />
      <CompletedToggle inbox />
    </div>
  )
}

export function TodayView() {
  const tasks = useStore((s) => s.tasks)
  const { overdue, today } = useMemo(() => todayTasks(tasks), [tasks])
  return (
    <div className="view">
      <ViewHeader title="Today" subtitle={`${today.length + overdue.length} tasks · ${format(new Date(), 'EEE MMM d')}`} />
      {overdue.length > 0 && (
        <section>
          <h2 className="section-title overdue">Overdue</h2>
          <TaskList tasks={overdue} showProject readOnly />
        </section>
      )}
      <section>
        {overdue.length > 0 && <h2 className="section-title">{format(new Date(), 'MMM d')} · Today</h2>}
        <TaskList tasks={today} showProject defaults={{ due: { date: todayISO() } }} />
      </section>
      {today.length + overdue.length === 0 && <EmptyState message="You're all done for today. Enjoy the rest of your day!" />}
    </div>
  )
}

export function UpcomingView() {
  const tasks = useStore((s) => s.tasks)
  const days = useMemo(() => nextDays(14), [])
  const overdue = useMemo(() => todayTasks(tasks).overdue, [tasks])
  const later = useMemo(() => {
    const cutoff = toISODate(days[days.length - 1])
    return tasks.filter((t) => !t.completed && t.due && t.due.date > cutoff).sort(compareTasks)
  }, [tasks, days])

  return (
    <div className="view">
      <ViewHeader title="Upcoming" subtitle={format(new Date(), 'MMMM yyyy')} />
      {overdue.length > 0 && (
        <section>
          <h2 className="section-title overdue">Overdue</h2>
          <TaskList tasks={overdue} showProject readOnly />
        </section>
      )}
      {days.map((d, i) => {
        const iso = toISODate(d)
        return (
          <section key={iso}>
            <h2 className="section-title">
              {format(d, 'MMM d')} · {i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : format(d, 'EEEE')}
            </h2>
            <TaskList tasks={tasksOn(tasks, iso)} showProject defaults={{ due: { date: iso } }} />
          </section>
        )
      })}
      {later.length > 0 && (
        <section>
          <h2 className="section-title">Later</h2>
          <TaskList tasks={later} showProject readOnly />
        </section>
      )}
    </div>
  )
}

export function ProjectView({ id }: { id: string }) {
  const tasks = useStore((s) => s.tasks)
  const project = useStore((s) => s.projects.find((p) => p.id === id))
  const deleteProject = useStore((s) => s.deleteProject)
  const list = useMemo(() => projectTasks(tasks, id), [tasks, id])
  const [confirm, setConfirm] = useState(false)

  if (!project) return <EmptyState message="Project not found." />

  return (
    <div className="view">
      <ViewHeader
        title={project.name}
        actions={
          confirm ? (
            <>
              <span className="muted">Delete project? Tasks move to Inbox.</span>
              <button className="button secondary" onClick={() => setConfirm(false)}>
                Cancel
              </button>
              <button className="button danger" onClick={() => void deleteProject(id)}>
                Delete
              </button>
            </>
          ) : (
            <button className="icon-button" onClick={() => setConfirm(true)} title="Delete project">
              <Trash2 size={18} />
            </button>
          )
        }
      />
      <TaskList tasks={list} defaults={{ projectId: id }} />
      <CompletedToggle projectId={id} />
    </div>
  )
}
