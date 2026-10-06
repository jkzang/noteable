# Integrations

The vault on disk is always the source of truth. Integrations are optional
providers that copy data *out* (backups) or keep it in step with a remote
service (sync). See `types.ts` for the interfaces.

| Provider | Status | Where |
| --- | --- | --- |
| Folder backup (works with Dropbox / iCloud / Drive folders) | ✅ working | `backup/folderBackup.ts` |
| Cloud backup (native) | 🔜 planned | implement `BackupProvider` |
| Google Calendar | 🧩 mappers done, sync TODO | `google/mappers.ts` |
| Google Tasks | 🧩 mappers done, sync TODO | `google/mappers.ts` |

## Wiring up Google (next steps)

1. Create an OAuth client of type **Desktop app** in Google Cloud Console and
   enable the *Google Calendar API* and *Google Tasks API*.
2. Implement OAuth in the main process using the **loopback + PKCE** flow:
   start a local HTTP server on `127.0.0.1:<random port>`, open the consent URL
   with `shell.openExternal`, exchange the code for tokens, and store the
   refresh token with `safeStorage` (same as the ESV key in `settings.ts`).
   Scopes: `https://www.googleapis.com/auth/calendar.events` and
   `https://www.googleapis.com/auth/tasks`.
3. Implement `SyncProvider<CalendarEvent>`:
   - `pull`: `GET /calendar/v3/calendars/{id}/events?syncToken=…` (first run:
     `timeMin` = 3 months ago, `singleEvents=true`); map with `fromGoogleEvent`;
     persist `nextSyncToken` as the cursor. A `410 Gone` means drop the token
     and do a full sync.
   - `push`: insert/patch/delete with `toGoogleEvent`, storing the returned id
     in `event.external['google-calendar']`.
4. Implement `SyncProvider<Task>` against `tasks/v1/lists/{list}/tasks`
   (`updatedMin` for incremental pulls). Map Noteable projects ↔ Google task
   lists. Google Tasks has no priorities, labels or times — the mappers keep
   the local values for those.
5. Add a sync scheduler in the main process (on launch, every N minutes, and
   after local edits — debounced) and IPC channels for connect/disconnect.

Conflict policy to start with: last-writer-wins on `updatedAt`.
