import { useMemo, useState } from 'react'
import { CalendarDays, Flag, Hash, Repeat, Tag, X } from 'lucide-react'
import type { Due, Priority, Task } from '@shared/types'
import { describeDue } from '@renderer/lib/dates'
import { parseQuickAdd } from '@renderer/lib/quickAdd'
import { PRIORITY_COLORS } from '@renderer/lib/tasks'
import { useStore } from '@renderer/store/useStore'

interface Props {
  task?: Task
  defaults?: { projectId?: string; due?: Due }
  onClose(): void
  /** Keep the editor open after adding, for rapid entry (Todoist behaviour). */
  keepOpen?: boolean
}

export function TaskEditor({ task, defaults, onClose, keepOpen }: Props) {
  const projects = useStore((s) => s.projects)
  const addTask = useStore((s) => s.addTask)
  const updateTask = useStore((s) => s.updateTask)

  const [content, setContent] = useState(task?.content ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [due, setDue] = useState<Due | undefined>(task?.due ?? defaults?.due)
  const [priority, setPriority] = useState<Priority>(task?.priority ?? 4)
  const [projectId, setProjectId] = useState<string | undefined>(task ? task.projectId : defaults?.projectId)

  const parsed = useMemo(() => parseQuickAdd(content, projects), [content, projects])
  const effectiveDue = parsed.due ?? due
  const effectivePriority = parsed.priority ?? priority
  const effectiveProject = parsed.projectId ?? projectId
  const project = projects.find((p) => p.id === effectiveProject)

  const submit = async () => {
    if (!parsed.content) return
    const fields = {
      content: parsed.content,
      description: description.trim() || undefined,
      due: effectiveDue,
      priority: effectivePriority,
      projectId: effectiveProject,
      labels: [...new Set([...(task?.labels ?? []), ...parsed.labels])]
    }
    if (task) {
      await updateTask(task.id, fields)
      onClose()
    } else {
      await addTask(fields)
      if (keepOpen) {
        setContent('')
        setDescription('')
      } else onClose()
    }
  }

  return (
    <form
      className="task-editor"
      onSubmit={(e) => {
        e.preventDefault()
        void submit()
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation()
          onClose()
        }
      }}
    >
      <input
        className="task-editor-content"
        autoFocus
        placeholder="Task name — try “Pray for Sam tomorrow 8am p1 #Bible Study”"
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      <input
        className="task-editor-desc"
        placeholder="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <div className="chip-row">
        <label className={`chip due-${effectiveDue ? describeDue(effectiveDue).tone : 'none'}`} title="Due date">
          <CalendarDays size={14} />
          {effectiveDue ? describeDue(effectiveDue).label : 'Date'}
          {effectiveDue?.recurrence && <Repeat size={12} />}
          <input
            type="date"
            className="chip-overlay-input"
            value={due?.date ?? ''}
            onChange={(e) => setDue(e.target.value ? { ...due, date: e.target.value } : undefined)}
          />
        </label>
        {due && !parsed.due && (
          <button type="button" className="chip chip-icon" title="Clear date" onClick={() => setDue(undefined)}>
            <X size={12} />
          </button>
        )}
        {due && !parsed.due && (
          <input
            type="time"
            className="chip chip-time"
            value={due.time ?? ''}
            onChange={(e) => setDue({ ...due, time: e.target.value || undefined })}
            title="Time"
          />
        )}

        <label className="chip" title="Priority">
          <Flag size={14} color={PRIORITY_COLORS[effectivePriority]} fill={effectivePriority < 4 ? PRIORITY_COLORS[effectivePriority] : 'none'} />
          {effectivePriority < 4 ? `P${effectivePriority}` : 'Priority'}
          <select
            className="chip-overlay-input"
            value={priority}
            onChange={(e) => setPriority(Number(e.target.value) as Priority)}
          >
            {[1, 2, 3, 4].map((p) => (
              <option key={p} value={p}>
                Priority {p}
              </option>
            ))}
          </select>
        </label>

        {parsed.labels.map((l) => (
          <span key={l} className="chip chip-label">
            <Tag size={12} />
            {l}
          </span>
        ))}
        {parsed.due?.recurrence && (
          <span className="chip">
            <Repeat size={12} />
            {parsed.due.recurrence}
          </span>
        )}
      </div>

      <div className="task-editor-footer">
        <label className="chip project-chip" title="Project">
          <Hash size={14} color={project?.color} />
          {project?.name ?? 'Inbox'}
          <select
            className="chip-overlay-input"
            value={projectId ?? ''}
            onChange={(e) => setProjectId(e.target.value || undefined)}
          >
            <option value="">Inbox</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <div className="spacer" />
        <button type="button" className="button secondary" onClick={onClose}>
          Cancel
        </button>
        <button type="submit" className="button primary" disabled={!parsed.content}>
          {task ? 'Save' : 'Add task'}
        </button>
      </div>
    </form>
  )
}
