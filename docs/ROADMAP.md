# Roadmap

## Done in the scaffold

- [x] Electron app with a sandboxed renderer and typed IPC
- [x] Vault folder: Markdown notes with frontmatter, tasks/projects/events as JSON
- [x] Notion-style editor: slash menu, Markdown shortcuts, bubble toolbar, to-dos
- [x] Todoist-style tasks: Inbox / Today / Upcoming / Projects, P1–P4, labels,
      natural-language quick add (`Q`), recurring tasks, undo toasts
- [x] Google-Calendar-style calendar: Day / 4-day / Week / Month / Schedule
      views, mini month, drag to create/move/resize, multi-day events, event
      detail cards, Google's keyboard shortcuts; scheduled tasks shown alongside
- [x] ESV passage lookup, Bible Study view (reader + study note, quote verses),
      `/passage` in any note
- [x] Folder backup (works with any synced folder)
- [x] Light/dark theme, browser preview mode (`npm run dev:web`)

## Next

**Notes**
- [ ] Watch the vault for outside changes (e.g. `chokidar`) so edits from other
      apps or sync clients show up live
- [ ] `[[Wiki links]]` + backlinks, and search across notes (⌘K command palette)
- [ ] Drag-to-reorder blocks (Notion drag handle), callouts, tables, images
- [ ] Note templates beyond the Bible study one

**Tasks**
- [ ] Sub-tasks (`parentId` is already in the model), sections within projects
- [ ] Drag-and-drop ordering and rescheduling
- [ ] Link tasks to notes from the editor (`notePath` is already in the model)
- [ ] Reminders / desktop notifications
- [ ] Filters & labels views

**Calendar**
- [ ] Recurring events
- [ ] Search events (Google's `/`)
- [ ] Auto-scroll the grid while dragging near its edge

**Bible study**
- [ ] Hover a reference like "John 3:16" in any note to preview it
- [ ] Cross-references and footnotes (ESV API `include-footnotes`)
- [ ] Reading plans that generate recurring tasks
- [ ] Respect ESV caching limits if passages are cached on disk

**Sync & cloud**
- [ ] Google Calendar two-way sync (see `src/main/integrations/README.md`)
- [ ] Google Tasks two-way sync
- [ ] Native cloud backup (e.g. S3-compatible or Google Drive API) via `BackupProvider`
- [ ] Scheduled automatic backups
- [ ] Per-record files instead of one JSON file per collection, to make
      folder-sync conflicts rarer once multiple devices are involved

**App**
- [ ] App icon + code signing / notarisation for macOS and Windows
- [ ] Auto-update (`electron-updater`)
- [ ] E2E tests with Playwright's Electron support
