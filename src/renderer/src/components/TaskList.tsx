import { useState } from 'react'
import { Plus } from 'lucide-react'
import type { Due, Task } from '@shared/types'
import { TaskEditor } from './TaskEditor'
import { TaskItem } from './TaskItem'

interface Props {
  tasks: Task[]
  showProject?: boolean
  /** Defaults for tasks added from this list (e.g. the project or day it belongs to). */
  defaults?: { projectId?: string; due?: Due }
  /** Hide the "Add task" row (e.g. for an Overdue section). */
  readOnly?: boolean
}

export function TaskList({ tasks, showProject, defaults, readOnly }: Props) {
  const [adding, setAdding] = useState(false)
  return (
    <div className="task-list">
      {tasks.map((t) => (
        <TaskItem key={t.id} task={t} showProject={showProject} />
      ))}
      {!readOnly &&
        (adding ? (
          <TaskEditor defaults={defaults} onClose={() => setAdding(false)} keepOpen />
        ) : (
          <button className="add-task-row" onClick={() => setAdding(true)}>
            <span className="add-task-plus">
              <Plus size={16} />
            </span>
            Add task
          </button>
        ))}
    </div>
  )
}
