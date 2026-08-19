import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { AppState } from '../domain/types';

export const BACKUP_VERSION = 1;

export type ServizioBackup = {
  servizioBackupVersion: number;
  exportedAt: string;
  email: string;
  state: AppState;
};

export function buildBackup(email: string, state: AppState): ServizioBackup {
  return {
    servizioBackupVersion: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    email,
    state,
  };
}

export function parseBackup(raw: string): ServizioBackup {
  const parsed = JSON.parse(raw) as ServizioBackup;
  if (!parsed || parsed.servizioBackupVersion !== BACKUP_VERSION) {
    throw new Error('Unsupported backup version');
  }
  if (!parsed.state?.assets || !Array.isArray(parsed.state.assets)) {
    throw new Error('Invalid backup: missing assets');
  }
  if (!parsed.state.vendors || !Array.isArray(parsed.state.vendors)) {
    throw new Error('Invalid backup: missing vendors');
  }
  return parsed;
}

export function backupSummary(backup: ServizioBackup): {
  assets: number;
  logs: number;
  exportedAt: string;
  email: string;
} {
  return {
    assets: backup.state.assets.length,
    logs: backup.state.logs?.length ?? 0,
    exportedAt: backup.exportedAt,
    email: backup.email,
  };
}

function downloadJsonWeb(filename: string, payload: ServizioBackup): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function exportBackupFile(email: string, state: AppState): Promise<void> {
  const payload = buildBackup(email, state);
  const stamp = payload.exportedAt.slice(0, 10);
  const filename = `servizio-backup-${stamp}.json`;

  if (Platform.OS === 'web') {
    if (typeof document === 'undefined') throw new Error('Download unavailable');
    downloadJsonWeb(filename, payload);
    return;
  }

  const uri = `${FileSystem.cacheDirectory ?? FileSystem.documentDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(uri, JSON.stringify(payload, null, 2));
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/json',
      dialogTitle: 'Export Servizio backup',
    });
  } else {
    throw new Error('Sharing unavailable on this device');
  }
}

export async function pickBackupFile(): Promise<string> {
  if (Platform.OS === 'web') {
    return new Promise((resolve, reject) => {
      if (typeof document === 'undefined') {
        reject(new Error('File picker unavailable'));
        return;
      }
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/json,.json';
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) {
          reject(new Error('No file selected'));
          return;
        }
        try {
          resolve(await file.text());
        } catch (err) {
          reject(err);
        }
      };
      input.click();
    });
  }

  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
  });
  if (result.canceled || !result.assets[0]?.uri) {
    throw new Error('No file selected');
  }
  return FileSystem.readAsStringAsync(result.assets[0].uri);
}
