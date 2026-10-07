import { existsSync } from 'node:fs'
import { mkdir, readdir, readFile, rename, stat, writeFile } from 'node:fs/promises'
import { basename as pathBasename, join, relative, resolve, sep } from 'node:path'
import type { CreateNoteInput } from '@shared/api'
import { basename, dirname, joinPath, titleToFileName } from '@shared/filenames'
import type { Note, NoteFrontmatter, NoteMeta, VaultInfo } from '@shared/types'
import { parseNote, serializeNote } from './frontmatter'
import { writeFileAtomic } from './atomic'

/** Hidden folder that marks a folder as a Noteable vault (and holds any app data). */
export const APP_DIR = '.noteable'
/** Deleted notes are moved here, like Obsidian's `.trash`. */
export const TRASH_DIR = '.trash'

/**
 * A vault is a plain folder on disk. Notes are Markdown files (with optional
 * YAML frontmatter) anywhere inside it; `.noteable/` marks it as a vault.
 * Nothing is locked into a database, so the folder can be synced, versioned
 * or opened in other Markdown tools.
 */
export class Vault {
  private constructor(readonly root: string) {}

  /** Opens (creating if needed) a vault. `isNew` is true when the app folder did not exist yet. */
  static async open(root: string): Promise<{ vault: Vault; isNew: boolean }> {
    const abs = resolve(root)
    const isNew = !existsSync(join(abs, APP_DIR))
    await mkdir(join(abs, APP_DIR), { recursive: true })
    return { vault: new Vault(abs), isNew }
  }

  info(): VaultInfo {
    return { path: this.root, name: pathBasename(this.root) }
  }

  /** Resolves a vault-relative path, refusing anything that escapes the vault. */
  resolvePath(rel: string): string {
    const abs = resolve(this.root, rel)
    if (abs !== this.root && !abs.startsWith(this.root + sep)) {
      throw new Error(`Path is outside the vault: ${rel}`)
    }
    return abs
  }

  private toRel(abs: string): string {
    return relative(this.root, abs).split(sep).join('/')
  }

  // ---------------------------------------------------------------- notes

  async listNotes(): Promise<NoteMeta[]> {
    const out: NoteMeta[] = []
    const walk = async (dir: string) => {
      for (const entry of await readdir(dir, { withFileTypes: true })) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules') continue
        const abs = join(dir, entry.name)
        if (entry.isDirectory()) await walk(abs)
        else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
          out.push(await this.readMeta(abs))
        }
      }
    }
    await walk(this.root)
    return out.sort((a, b) => b.mtime - a.mtime)
  }

  private async readMeta(abs: string): Promise<NoteMeta> {
    const note = await this.readAbs(abs)
    const { body: _body, ...meta } = note
    return meta
  }

  private async readAbs(abs: string): Promise<Note> {
    const [raw, info] = await Promise.all([readFile(abs, 'utf8'), stat(abs)])
    const { frontmatter, body } = parseNote(raw)
    const path = this.toRel(abs)
    return {
      path,
      title: typeof frontmatter.title === 'string' && frontmatter.title ? frontmatter.title : basename(path),
      folder: dirname(path),
      frontmatter,
      mtime: info.mtimeMs,
      body
    }
  }

  async readNote(path: string): Promise<Note> {
    return this.readAbs(this.resolvePath(path))
  }

  async createNote(input: CreateNoteInput): Promise<NoteMeta> {
    const folder = input.folder?.replace(/^\/+|\/+$/g, '') ?? ''
    const abs = await this.uniquePath(folder, input.title)
    await mkdir(resolve(abs, '..'), { recursive: true })
    const frontmatter: NoteFrontmatter = {
      ...input.frontmatter,
      created: input.frontmatter?.created ?? new Date().toISOString()
    }
    // Only keep an explicit title when the file name could not represent it exactly.
    if (titleToFileName(input.title) === input.title) delete frontmatter.title
    else frontmatter.title = input.title
    await writeFile(abs, serializeNote(frontmatter, input.body ?? ''), { encoding: 'utf8', flag: 'wx' })
    return this.readMeta(abs)
  }

  async writeNote(path: string, body: string, frontmatter?: NoteFrontmatter): Promise<NoteMeta> {
    const abs = this.resolvePath(path)
    const fm = frontmatter ?? (existsSync(abs) ? parseNote(await readFile(abs, 'utf8')).frontmatter : {})
    await writeFileAtomic(abs, serializeNote(fm, body))
    return this.readMeta(abs)
  }

  async renameNote(path: string, title: string): Promise<NoteMeta> {
    const abs = this.resolvePath(path)
    const note = await this.readAbs(abs)
    const fm = { ...note.frontmatter }
    if (titleToFileName(title) === title) delete fm.title
    else fm.title = title

    let target = abs
    if (titleToFileName(title) !== basename(note.path)) {
      target = await this.uniquePath(note.folder, title)
      await rename(abs, target)
    }
    await writeFileAtomic(target, serializeNote(fm, note.body))
    return this.readMeta(target)
  }

  async removeNote(path: string): Promise<void> {
    const abs = this.resolvePath(path)
    const trash = join(this.root, TRASH_DIR)
    await mkdir(trash, { recursive: true })
    const name = `${basename(path)} ${Date.now()}.md`
    await rename(abs, join(trash, name))
  }

  private async uniquePath(folder: string, title: string): Promise<string> {
    const base = titleToFileName(title)
    for (let i = 0; ; i++) {
      const name = i === 0 ? `${base}.md` : `${base} ${i}.md`
      const abs = this.resolvePath(joinPath(folder, name))
      if (!existsSync(abs)) return abs
    }
  }
}
