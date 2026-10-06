/** Turns a note title into a safe, Obsidian-compatible file name (without extension). */
export function titleToFileName(title: string): string {
  const cleaned = title
    .replace(/[\\/:*?"<>|#^[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\.+/, '')
    .slice(0, 120)
  return cleaned || 'Untitled'
}

export function basename(path: string): string {
  const name = path.split('/').pop() ?? path
  return name.replace(/\.md$/i, '')
}

export function dirname(path: string): string {
  const i = path.lastIndexOf('/')
  return i === -1 ? '' : path.slice(0, i)
}

export function joinPath(folder: string | undefined, name: string): string {
  return folder ? `${folder.replace(/\/+$/, '')}/${name}` : name
}
