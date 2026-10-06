import { useStore } from '@renderer/store/useStore'
import { Modal } from './Modal'
import { TaskEditor } from './TaskEditor'

/** Global quick add (press Q). Defaults to the project you're looking at. */
export function QuickAddModal() {
  const open = useStore((s) => s.quickAddOpen)
  const setQuickAdd = useStore((s) => s.setQuickAdd)
  const view = useStore((s) => s.view)
  const close = () => setQuickAdd(false)
  return (
    <Modal open={open} onClose={close} top className="quick-add">
      <TaskEditor defaults={{ projectId: view.kind === 'project' ? view.id : undefined }} onClose={close} />
    </Modal>
  )
}
