import { useState } from 'react'
import clsx from 'clsx'
import { CalendarDays, Check, FileText, Pencil, Repeat, Trash2 } from 'lucide-react'
import type { Task } from '@shared/types'
import { describeDue } from '@renderer/lib/dates'
import { PRIORITY_COLORS } from '@renderer/lib/tasks'
import { useStore } from '@renderer/store/useStore'
import { TaskEditor } from './TaskEditor'

export function TaskItem({ task, showProject }: { task: Task; showProject?: boolean }) {
  const [editing, setEditing] = useState(false)
  const toggleTask = useStore((s) => s.toggleTask)
  const deleteTask = useStore((s) => s.deleteTask)
  const navigate = useStore((s) => s.navigate)
  const project = useStore((s) => s.projects.find((p) => p.id === task.projectId))

  if (editing) return <TaskEditor task={task} onClose={() => setEditing(false)} />

  const due = task.due ? describeDue(task.due) : null

  return (
    <div className={clsx('task-row', task.completed && 'completed')}>
      <button
        className={clsx('task-check', `p${task.priority}`)}
        style={{ '--prio': PRIORITY_COLORS[task.priority] } as React.CSSProperties}
        onClick={() => void toggleTask(task.id)}
        title={task.completed ? 'Mark incomplete' : 'Complete'}
      >
        <Check size={12} strokeWidth={3} />
      </button>

      <div className="task-body" onClick={() => setEditing(true)}>
        <div className="task-content">{task.content}</div>
        {task.description && <div className="task-desc">{task.description}</div>}
        {(due || task.labels.length > 0 || task.notePath) && (
          <div className="task-meta">
            {due && (
              <span className={`task-due due-${due.tone}`}>
                <CalendarDays size={12} />
                {due.label}
                {task.due?.recurrence && <Repeat size={11} />}
              </span>
            )}
            {task.labels.map((l) => (
              <span key={l} className="task-label">
                @{l}
              </span>
            ))}
            {task.notePath && (
              <button
                className="task-note-link"
                onClick={(e) => {
                  e.stopPropagation()
                  navigate({ kind: 'note', path: task.notePath! })
                }}
              >
                <FileText size={12} />
                Note
              </button>
            )}
          </div>
        )}
      </div>

      {showProject && (
        <span className="task-project">
          {project?.name ?? 'Inbox'}
          <span className="dot" style={{ background: project?.color ?? 'var(--blue)' }} />
        </span>
      )}

      <div className="task-actions">
        <button className="icon-button small" onClick={() => setEditing(true)} title="Edit">
          <Pencil size={15} />
        </button>
        <button className="icon-button small" onClick={() => void deleteTask(task.id)} title="Delete">
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  )
}
