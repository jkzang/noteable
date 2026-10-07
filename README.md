# Noteable

Notes, tasks and a calendar in one local-first desktop app — Notion's editor,
Todoist's task flow and a Google-Calendar-style calendar, with ESV Bible study
built in.

- **Local-first, like Obsidian.** Your data lives in a *vault* folder on disk.
  Notes are plain Markdown files (with YAML frontmatter), so you can open them
  in any editor, sync the folder, or put it under git.
- **Notion-style editing.** Type `/` for the block menu (headings, lists,
  to-dos, quotes, code, dividers, Bible passages, today's date). Markdown
  shortcuts (`#`, `-`, `1.`, `[]`, `>`, ```` ``` ````, `---`) work as you type.
  Select text for a formatting toolbar.
- **Todoist-style tasks.** Inbox, Today, Upcoming and Projects; priorities
  P1–P4; labels; recurring tasks. Press **Q** anywhere for quick add with
  natural-language parsing:
  `Read Romans 8 tomorrow 7am p2 #Bible Study @devotional every day`.
- **Google-Calendar-style calendar.** Day, 4-day, Week, Month and Schedule
  views with a mini-month side panel. Click or drag on empty space to create
  an event (or a task), drag events to move them, drag their bottom edge to
  resize. Multi-day and all-day events span across days. Click an event for a
  details card. Google's shortcuts work: **D/W/M/X/A** switch views, **T**
  today, **J/K** next/previous, **C** create.
- **Bible study.** Look up any passage with the ESV API, read it beside your
  study note, click verses to quote them into the note, or drop a passage into
  any note with `/passage`. Study notes use an Observation → Interpretation →
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
welcome note and a few sample tasks. Change it any time in **Settings → Vault**.

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
| UI | React 19 + TypeScript, Zustand for state, plain CSS (Todoist-like theme, light/dark) |
| Editor | TipTap 3 (ProseMirror) with `@tiptap/markdown` for Markdown in/out |
| Dates | `chrono-node` (natural language), `date-fns` |
| Storage | Markdown files + JSON in the vault folder (no database) |

```
src/
  shared/            Types, the IPC contract (api.ts) and pure helpers used by both sides
  main/              Electron main process
    vault/           Vault folder: Markdown notes, JSON collections, first-run seed
    bible/esv.ts     ESV API client (runs here so the key stays private)
    integrations/    Backup + sync provider interfaces, folder backup, Google mappers
    ipc.ts           Implements every NoteableApi method as an ipcMain handler
  preload/           Exposes the API to the page as window.noteable
  renderer/          React app
    src/lib/         api (desktop or in-memory), quick-add parser, recurrence, dates
    src/store/       Zustand store (single source of UI state)
    src/components/  Sidebar, task editor/list, editor (slash menu, bubble menu), dialogs
    src/views/       Inbox/Today/Upcoming/Project, Note, Calendar, Bible
```

### Vault layout

```
Noteable/
  Welcome to Noteable.md
  Bible Study/
    Romans 8 1–11.md        ← frontmatter: passage: "Romans 8:1–11"
  .noteable/
    tasks.json
    projects.json
    events.json
  .trash/                   ← deleted notes go here, like Obsidian
```

Anything under the vault that ends in `.md` shows up as a note; folders become
groups in the sidebar. Files are written atomically (temp file + rename).

### Adding an API method

1. Add it to `NoteableApi` and `API_CHANNELS` in `src/shared/api.ts`.
2. Implement it in the `handlers` map in `src/main/ipc.ts` (TypeScript will
   complain until you do).
3. Implement it in `src/renderer/src/lib/memoryApi.ts` for the browser preview.

The preload script needs no changes — it generates `window.noteable` from the
channel list.

## Roadmap

See [docs/ROADMAP.md](docs/ROADMAP.md). Google Calendar / Google Tasks sync is
designed but not wired up yet — see
[src/main/integrations/README.md](src/main/integrations/README.md).
