import { mkdir, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

/** Writes via a temp file + rename so a crash never leaves a half-written file. */
export async function writeFileAtomic(file: string, data: string): Promise<void> {
  await mkdir(dirname(file), { recursive: true })
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`
  await writeFile(tmp, data, 'utf8')
  await rename(tmp, file)
}
