import { join } from 'node:path'
import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { API_CHANNELS, type ApiChannel, type ApiMethod } from '@shared/api'
import { fetchPassage } from './bible/esv'
import { FolderBackupProvider } from './integrations/backup/folderBackup'
import { loadSettings, updateSettings } from './settings'
import { seedVault } from './vault/seed'
import { Vault } from './vault/vault'

type Handlers = { [C in ApiChannel]: ApiMethod<C> }

let vault: Vault | null = null

export async function openVault(path: string): Promise<Vault> {
  const opened = await Vault.open(path)
  if (opened.isNew && (await opened.vault.listNotes()).length === 0) await seedVault(opened.vault)
  vault = opened.vault
  await updateSettings({ vaultPath: vault.root })
  return vault
}

export async function openInitialVault(): Promise<Vault> {
  const settings = await loadSettings()
  return openVault(settings.vaultPath ?? join(app.getPath('documents'), 'Noteable'))
}

function current(): Vault {
  if (!vault) throw new Error('No vault is open.')
  return vault
}

const focused = () => BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]

async function pickFolder(title: string): Promise<string | null> {
  const res = await dialog.showOpenDialog(focused(), {
    title,
    properties: ['openDirectory', 'createDirectory']
  })
  return res.canceled || !res.filePaths[0] ? null : res.filePaths[0]
}

// Every method of NoteableApi, implemented against the open vault.
const handlers: Handlers = {
  'vault.info': async () => current().info(),
  'vault.choose': async () => {
    const dir = await pickFolder('Open or create a vault')
    return dir ? (await openVault(dir)).info() : null
  },
  'vault.reveal': async (rel) => {
    const v = current()
    if (rel) shell.showItemInFolder(v.resolvePath(rel))
    else await shell.openPath(v.root)
  },

  'notes.list': () => current().listNotes(),
  'notes.read': (path) => current().readNote(path),
  'notes.create': (input) => current().createNote(input),
  'notes.write': (path, body, fm) => current().writeNote(path, body, fm),
  'notes.rename': (path, title) => current().renameNote(path, title),
  'notes.remove': (path) => current().removeNote(path),

  'settings.get': () => loadSettings(),
  'settings.update': (patch) => updateSettings(patch),

  'bible.passage': async (reference) => fetchPassage(reference, (await loadSettings()).esvApiKey),

  'backup.run': async () => {
    const { backupDir } = await loadSettings()
    if (!backupDir) throw new Error('Choose a backup folder in Settings first.')
    return new FolderBackupProvider(backupDir).backup(current().root)
  },
  'backup.chooseDir': async () => {
    const dir = await pickFolder('Choose a backup folder')
    if (dir) await updateSettings({ backupDir: dir })
    return dir
  }
}

export function registerIpc(): void {
  for (const channel of API_CHANNELS) {
    ipcMain.handle(`noteable:${channel}`, (_event, ...args) =>
      (handlers[channel] as (...a: unknown[]) => Promise<unknown>)(...args)
    )
  }
}
