# Integrations

The vault on disk is always the source of truth. Integrations are optional
providers that copy data *out* of it. See `types.ts` for the interface.

| Provider | Status | Where |
| --- | --- | --- |
| Folder backup (works with Dropbox / iCloud / Drive folders) | ✅ working | `backup/folderBackup.ts` |
| Cloud backup (native) | 🔜 planned | implement `BackupProvider` |
