import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { app, safeStorage } from 'electron'
import type { Settings } from '@shared/types'
import { writeFileAtomic } from './vault/atomic'

const DEFAULTS: Settings = { theme: 'system' }

/** On-disk shape: secrets are stored encrypted with the OS keychain when possible. */
interface StoredSettings extends Omit<Settings, 'esvApiKey'> {
  esvApiKey?: string
  esvApiKeyEncrypted?: string
}

const file = () => join(app.getPath('userData'), 'settings.json')

let cache: Settings | null = null

export async function loadSettings(): Promise<Settings> {
  if (cache) return cache
  let stored: StoredSettings = { ...DEFAULTS }
  try {
    stored = { ...DEFAULTS, ...JSON.parse(await readFile(file(), 'utf8')) }
  } catch {
    // First run or unreadable file: fall back to defaults.
  }
  const { esvApiKeyEncrypted, ...rest } = stored
  let esvApiKey = rest.esvApiKey
  if (esvApiKeyEncrypted && safeStorage.isEncryptionAvailable()) {
    try {
      esvApiKey = safeStorage.decryptString(Buffer.from(esvApiKeyEncrypted, 'base64'))
    } catch {
      esvApiKey = undefined
    }
  }
  cache = { ...rest, esvApiKey }
  return cache
}

export async function updateSettings(patch: Partial<Settings>): Promise<Settings> {
  const next: Settings = { ...(await loadSettings()), ...patch }
  const { esvApiKey, ...rest } = next
  const stored: StoredSettings = { ...rest }
  if (esvApiKey) {
    if (safeStorage.isEncryptionAvailable()) {
      stored.esvApiKeyEncrypted = safeStorage.encryptString(esvApiKey).toString('base64')
    } else {
      stored.esvApiKey = esvApiKey
    }
  }
  await writeFileAtomic(file(), JSON.stringify(stored, null, 2) + '\n')
  cache = next
  return next
}
