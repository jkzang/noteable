# Roadmap

## Done

- [x] Electron app with a sandboxed renderer and typed IPC
- [x] Vault folder: Markdown pages with frontmatter
- [x] Notion-style editor: slash menu, Markdown shortcuts, bubble toolbar, to-dos
- [x] Notion-style shell: page tree sidebar, home with recent pages, page
      icons, properties, quick find (`⌘K` / `⌘P`)
- [x] ESV passage lookup, Bible Study view (reader + study note, quote verses),
      `/passage` in any page
- [x] Folder backup (works with any synced folder)
- [x] Light/dark theme, browser preview mode (`npm run dev:web`)

## Next

**Notes**
- [ ] Watch the vault for outside changes (e.g. `chokidar`) so edits from other
      apps or sync clients show up live
- [ ] `[[Wiki links]]` + backlinks, and full-text search across page bodies
- [ ] Drag-to-reorder blocks (Notion drag handle), callouts, toggles, tables, images
- [ ] Drag pages between folders in the sidebar; create/rename folders in-app
- [ ] Page covers, favourites, and a full emoji picker with search
- [ ] Page templates beyond the Bible study one

**Bible study**
- [ ] Hover a reference like "John 3:16" in any page to preview it
- [ ] Cross-references and footnotes (ESV API `include-footnotes`)
- [ ] Respect ESV caching limits if passages are cached on disk

**Backup & sync**
- [ ] Native cloud backup (e.g. S3-compatible or Google Drive API) via `BackupProvider`
- [ ] Scheduled automatic backups

**App**
- [ ] App icon + code signing / notarisation for macOS and Windows
- [ ] Auto-update (`electron-updater`)
- [ ] E2E tests with Playwright's Electron support
