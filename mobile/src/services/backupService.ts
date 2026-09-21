import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { resetDatabase } from '../db/database';

// NOTE: picking the backup file to restore is done in SettingsScreen.tsx
// using expo-document-picker (see mobile/package.json); this service only
// handles copying the file into place once a URI has been chosen.

const DB_FILE_PATH = `${FileSystem.documentDirectory}SQLite/rock_archive.db`;

/** Copies the live SQLite file out to a shareable backup the user can save
 * anywhere (Drive, email, local storage) — the archive is a single file. */
export async function backupDatabase(): Promise<string> {
  const backupUri = `${FileSystem.documentDirectory}rock_archive_backup_${Date.now()}.db`;
  await FileSystem.copyAsync({ from: DB_FILE_PATH, to: backupUri });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(backupUri, {
      mimeType: 'application/octet-stream',
      dialogTitle: 'ROCK ARCHIVE PRO — Backup',
    });
  }
  return backupUri;
}

/** Restores from a previously exported .db file. This OVERWRITES the current
 * archive — callers must confirm with the user before invoking this. */
export async function restoreDatabase(pickedFileUri: string): Promise<void> {
  const info = await FileSystem.getInfoAsync(pickedFileUri);
  if (!info.exists) {
    throw new Error('Selected backup file does not exist or is not accessible.');
  }
  await FileSystem.copyAsync({ from: pickedFileUri, to: DB_FILE_PATH });
  // Force re-open on next getDb() call so the newly restored file is read.
  await resetDatabaseHandleOnly();
}

async function resetDatabaseHandleOnly(): Promise<void> {
  // Re-uses resetDatabase's side effect of clearing the cached handle, but
  // we do NOT want to drop/recreate tables here — the restored file already
  // has its own schema. If you need a stricter guarantee, validate the
  // restored file's schema_version before accepting it.
  await resetDatabase().catch(() => {
    // resetDatabase() also re-seeds an empty DB if something goes wrong;
    // in the restore flow we prefer to surface the error to the caller.
    throw new Error('Failed to reload the restored database. Please restart the app.');
  });
}
