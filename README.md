# Noteable

Notion-style notes in a local-first desktop app, with ESV Bible study built in.

- **Local-first, like Obsidian.** Your data lives in a *vault* folder on disk.
  Every page is a plain Markdown file (with YAML frontmatter), so you can open
  them in any editor, sync the folder, or put it under git.
- **Looks and writes like Notion.** A quiet sidebar page tree, wide centred
  pages with emoji icons and properties, and a home screen of recent pages.
  Type `/` for the block menu (headings, lists, to-dos, quotes, code,
  dividers, Bible passages, today's date). Markdown shortcuts (`#`, `-`, `1.`,
  `[]`, `>`, ```` ``` ````, `---`) work as you type. Select text for a
  formatting toolbar; `⌘K` on a selection adds a link.
- **Quick find.** `⌘K` / `⌘P` (`Ctrl` on Windows/Linux) searches pages by
  title, or creates a new one.
- **Bible study.** Look up any passage with the ESV API, read it beside your
  study note, click verses to quote them into the note, or type a reference
  straight into the slash menu — `/Matthew 12`, `/Matthew 12:13`,
  `/Matthew 12: 13-24`, `/Mt 12:46-13:9`, `/1 Cor 13:4-7` — and press Enter to
  insert it as a quote. A chapter is required (`/Matthew` alone won't insert
  the whole book). `/passage` opens a look-up dialog instead. Study notes use an Observation → Interpretation →
  Application → Prayer template.
- **Backups.** One click copies the vault into a folder of your choice — pick
  one inside Dropbox / iCloud Drive / Google Drive for an off-site copy.

## Getting started

```bash
npm install
npm run dev        # desktop app with hot reload
npm run dev:web    # renderer only, in the browser, with sample data (no Electron)
npm test           # unit tests (vitest)
npm run build      # typecheck + production build into out/
npm run package    # unpacked app in release/ (electron-builder)
npm run dist       # installers for the current OS
```

On first launch the app creates a `Noteable` vault in your Documents folder with a
welcome page. Change it any time in **Settings → Vault**.

### ESV API key

Passage lookup needs a free key from
[api.esv.org](https://api.esv.org/account/create-application/). Paste it into
**Settings → ESV Bible**. The key is stored encrypted with the OS keychain
(Electron `safeStorage`) where available, and all ESV requests are made from
the main process, so the key never reaches the web page.

Please follow the [ESV API terms](https://api.esv.org/#conditions): keep the
"(ESV)" attribution on quotes (Noteable adds it for you) and show the copyright
notice (shown under passages in the Bible view).

## How it's built

| Layer | Tech |
| --- | --- |
| Shell | Electron (sandboxed renderer, context isolation) via `electron-vite` |
| UI | React 19 + TypeScript, Zustand for state, plain CSS (Notion-like theme, light/dark) |
| Editor | TipTap 3 (ProseMirror) with `@tiptap/markdown` for Markdown in/out |
| Dates | `date-fns` |
| Storage | Markdown files + JSON in the vault folder (no database) |

```
src/
  shared/            Types, the IPC contract (api.ts) and pure helpers used by both sides
  main/              Electron main process
    vault/           Vault folder: Markdown notes, JSON collections, first-run seed
    bible/esv.ts     ESV API client (runs here so the key stays private)
    integrations/    Backup provider interface and folder backup
    ipc.ts           Implements every NoteableApi method as an ipcMain handler
  preload/           Exposes the API to the page as window.noteable
  renderer/          React app
    src/lib/         api (desktop or in-memory), page tree, relative times, autosave
    src/store/       Zustand store (single source of UI state)
    src/components/  Sidebar, search, icon picker, editor (slash menu, bubble menu), dialogs
    src/views/       Home, Note (page), Bible
```

### Vault layout

```
Noteable/
  Welcome to Noteable.md    ← frontmatter: icon: 👋
  Bible Study/
    Romans 8 1–11.md        ← frontmatter: passage: "Romans 8:1–11"
  .noteable/                ← marks the folder as a vault
  .trash/                   ← deleted pages go here, like Obsidian
```

Anything under the vault that ends in `.md` shows up as a page; folders become
collapsible groups in the sidebar's page tree. Files are written atomically (temp file + rename).

### Adding an API method

1. Add it to `NoteableApi` and `API_CHANNELS` in `src/shared/api.ts`.
2. Implement it in the `handlers` map in `src/main/ipc.ts` (TypeScript will
   complain until you do).
3. Implement it in `src/renderer/src/lib/memoryApi.ts` for the browser preview.

The preload script needs no changes — it generates `window.noteable` from the
channel list.

## Roadmap

See [docs/ROADMAP.md](docs/ROADMAP.md).
