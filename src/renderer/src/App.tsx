import { useEffect } from 'react'
import { PassagePicker } from './components/PassagePicker'
import { QuickAddModal } from './components/QuickAddModal'
import { SettingsDialog } from './components/SettingsDialog'
import { Sidebar } from './components/Sidebar'
import { Toast } from './components/Toast'
import { useStore } from './store/useStore'
import { BibleView } from './views/BibleView'
import { CalendarView } from './views/CalendarView'
import { NoteView } from './views/NoteView'
import { InboxView, ProjectView, TodayView, UpcomingView } from './views/TaskViews'

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  return Boolean(el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)))
}

export function App() {
  const ready = useStore((s) => s.ready)
  const view = useStore((s) => s.view)
  const theme = useStore((s) => s.settings.theme)
  const init = useStore((s) => s.init)
  const setQuickAdd = useStore((s) => s.setQuickAdd)

  useEffect(() => {
    void init()
  }, [init])

  useEffect(() => {
    if (theme === 'system') document.documentElement.removeAttribute('data-theme')
    else document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // Todoist's global "Q" shortcut for quick add.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'q' && !e.metaKey && !e.ctrlKey && !e.altKey && !isTyping(e.target)) {
        e.preventDefault()
        setQuickAdd(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setQuickAdd])

  if (!ready) return <div className="splash">Opening vault…</div>

  return (
    <div className="app">
      <Sidebar />
      <main className="main">
        {view.kind === 'inbox' && <InboxView />}
        {view.kind === 'today' && <TodayView />}
        {view.kind === 'upcoming' && <UpcomingView />}
        {view.kind === 'project' && <ProjectView id={view.id} />}
        {view.kind === 'calendar' && <CalendarView />}
        {view.kind === 'bible' && <BibleView initialReference={view.reference} />}
        {view.kind === 'note' && <NoteView key={view.path} path={view.path} />}
      </main>
      <QuickAddModal />
      <SettingsDialog />
      <PassagePicker />
      <Toast />
    </div>
  )
}
