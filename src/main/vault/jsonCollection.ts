import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

/** Writes via a temp file + rename so a crash never leaves a half-written file. */
export async function writeFileAtomic(file: string, data: string): Promise<void> {
  await mkdir(dirname(file), { recursive: true })
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`
  await writeFile(tmp, data, 'utf8')
  await rename(tmp, file)
}

/**
 * A small JSON-file-backed collection of records keyed by `id`.
 * Reads are served from memory; writes are serialised so they never interleave.
 */
export class JsonCollection<T extends { id: string }> {
  private items: Map<string, T> | null = null
  private writing: Promise<void> = Promise.resolve()

  constructor(private readonly file: string) {}

  private async load(): Promise<Map<string, T>> {
    if (this.items) return this.items
    let list: T[] = []
    try {
      const parsed = JSON.parse(await readFile(this.file, 'utf8'))
      if (Array.isArray(parsed)) list = parsed
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
    }
    this.items = new Map(list.map((item) => [item.id, item]))
    return this.items
  }

  async list(): Promise<T[]> {
    return [...(await this.load()).values()]
  }

  async upsert(item: T): Promise<T> {
    ;(await this.load()).set(item.id, item)
    await this.persist()
    return item
  }

  async remove(id: string): Promise<void> {
    if ((await this.load()).delete(id)) await this.persist()
  }

  private persist(): Promise<void> {
    const snapshot = JSON.stringify([...this.items!.values()], null, 2)
    this.writing = this.writing.catch(() => {}).then(() => writeFileAtomic(this.file, snapshot + '\n'))
    return this.writing
  }
}
