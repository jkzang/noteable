import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import type { Settings } from '@shared/types'
import { api, isDesktop } from '@renderer/lib/api'
import { useStore } from '@renderer/store/useStore'
import { Modal } from './Modal'

export function SettingsDialog() {
  const open = useStore((s) => s.settingsOpen)
  const setOpen = useStore((s) => s.setSettingsOpen)
  const settings = useStore((s) => s.settings)
  const vault = useStore((s) => s.vault)
  const updateSettings = useStore((s) => s.updateSettings)
  const switchVault = useStore((s) => s.switchVault)
  const notify = useStore((s) => s.notify)

  const [esvKey, setEsvKey] = useState('')
  const [backingUp, setBackingUp] = useState(false)

  useEffect(() => {
    if (open) setEsvKey(settings.esvApiKey ?? '')
  }, [open, settings.esvApiKey])

  const close = () => setOpen(false)

  const saveKey = async () => {
    if (esvKey.trim() === (settings.esvApiKey ?? '')) return
    await updateSettings({ esvApiKey: esvKey.trim() || undefined })
    notify('ESV API key saved')
  }

  const chooseBackupDir = async () => {
    const dir = await api.backup.chooseDir()
    if (dir) await updateSettings({ backupDir: dir })
  }

  const backupNow = async () => {
    setBackingUp(true)
    try {
      const res = await api.backup.run()
      notify(`Backed up ${res.files} files`)
    } catch (err) {
      notify((err as Error).message)
    } finally {
      setBackingUp(false)
    }
  }

  return (
    <Modal open={open} onClose={close} className="settings">
      <header className="modal-header">
        <h2>Settings</h2>
        <button className="icon-button" onClick={close} title="Close">
          <X size={18} />
        </button>
      </header>

      <section className="settings-section">
        <h3>Vault</h3>
        <p className="muted">Notes are plain Markdown files in this folder. Tasks and events live in its <code>.noteable</code> folder.</p>
        <div className="settings-row">
          <code className="path">{vault?.path}</code>
          {isDesktop && (
            <>
              <button className="button secondary" onClick={() => void api.vault.reveal()}>
                Show
              </button>
              <button className="button secondary" onClick={() => void switchVault()}>
                Change…
              </button>
            </>
          )}
        </div>
      </section>

      <section className="settings-section">
        <h3>ESV Bible</h3>
        <p className="muted">
          Get a free key at{' '}
          <a href="https://api.esv.org/account/create-application/" target="_blank" rel="noreferrer">
            api.esv.org
          </a>
          . It is stored encrypted with your OS keychain when available.
        </p>
        <div className="settings-row">
          <input
            className="input"
            type="password"
            placeholder="ESV API key"
            value={esvKey}
            onChange={(e) => setEsvKey(e.target.value)}
            onBlur={() => void saveKey()}
            onKeyDown={(e) => e.key === 'Enter' && void saveKey()}
          />
        </div>
      </section>

      <section className="settings-section">
        <h3>Backup</h3>
        <p className="muted">
          Copies the whole vault into a folder. Pick a folder inside Dropbox, iCloud Drive or Google Drive for an
          off-site copy. The 10 most recent backups are kept.
        </p>
        <div className="settings-row">
          <code className="path">{settings.backupDir ?? 'No folder chosen'}</code>
          <button className="button secondary" onClick={() => void chooseBackupDir()} disabled={!isDesktop}>
            Choose…
          </button>
          <button className="button primary" onClick={() => void backupNow()} disabled={!settings.backupDir || backingUp}>
            {backingUp ? 'Backing up…' : 'Back up now'}
          </button>
        </div>
      </section>

      <section className="settings-section">
        <h3>Appearance</h3>
        <div className="settings-row">
          <label className="field">
            Theme
            <select
              className="input"
              value={settings.theme}
              onChange={(e) => void updateSettings({ theme: e.target.value as Settings['theme'] })}
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>
          <label className="field">
            Week starts on
            <select
              className="input"
              value={settings.weekStartsOn}
              onChange={(e) => void updateSettings({ weekStartsOn: Number(e.target.value) as 0 | 1 })}
            >
              <option value={0}>Sunday</option>
              <option value={1}>Monday</option>
            </select>
          </label>
        </div>
      </section>

      <section className="settings-section">
        <h3>Integrations</h3>
        <p className="muted">Google Calendar and Google Tasks sync are coming soon.</p>
      </section>
    </Modal>
  )
}
