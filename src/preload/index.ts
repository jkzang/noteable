import { contextBridge, ipcRenderer } from 'electron'
import { API_CHANNELS, type NoteableApi } from '@shared/api'

// Builds `window.noteable.<group>.<method>(...)` from the channel list, each
// forwarding to the matching ipcMain handler in src/main/ipc.ts.
const api: Record<string, Record<string, (...args: unknown[]) => Promise<unknown>>> = {}

for (const channel of API_CHANNELS) {
  const [group, method] = channel.split('.')
  api[group] ??= {}
  api[group][method] = async (...args) => {
    try {
      return await ipcRenderer.invoke(`noteable:${channel}`, ...args)
    } catch (err) {
      // Strip Electron's "Error invoking remote method '…': Error:" prefix.
      const message = String((err as Error)?.message ?? err).replace(/^Error invoking remote method '[^']+': (\w*Error: )?/, '')
      throw new Error(message)
    }
  }
}

contextBridge.exposeInMainWorld('noteable', api as unknown as NoteableApi)
