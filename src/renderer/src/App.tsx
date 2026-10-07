import { useEffect } from 'react'
import { PassagePicker } from './components/PassagePicker'
import { SearchModal } from './components/SearchModal'
import { SettingsDialog } from './components/SettingsDialog'
import { Sidebar } from './components/Sidebar'
import { Toast } from './components/Toast'
import { useStore } from './store/useStore'
import { BibleView } from './views/BibleView'
import { HomeView } from './views/HomeView'
import { NoteView } from './views/NoteView'

export function App() {
  const ready = useStore((s) => s.ready)
  const view = useStore((s) => s.view)
  const theme = useStore((s) => s.settings.theme)
  const init = useStore((s) => s.init)
  const setSearchOpen = useStore((s) => s.setSearchOpen)

  useEffect(() => {
    void init()
  }, [init])

  useEffect(() => {
    if (theme === 'system') document.documentElement.removeAttribute('data-theme')
    else document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // Notion's quick find: ⌘P, or ⌘K when the editor hasn't claimed it for a link.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      if (!(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey || e.defaultPrevented) return
      if (key === 'p' || key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setSearchOpen])

  if (!ready) return <div className="splash">Opening vault…</div>

  return (
    <div className="app">
      <Sidebar />
      <main className="main">
        {view.kind === 'home' && <HomeView />}
        {view.kind === 'bible' && <BibleView initialReference={view.reference} />}
        {view.kind === 'note' && <NoteView key={view.path} path={view.path} />}
      </main>
      <SearchModal />
      <SettingsDialog />
      <PassagePicker />
      <Toast />
    </div>
  )
}
