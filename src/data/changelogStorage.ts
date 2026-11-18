import AsyncStorage from '@react-native-async-storage/async-storage';
import { APP_VERSION } from '../version';

const SEEN_KEY = 'servizio_v1_changelog_seen';

/** True when the user has not yet seen the notes for this app version. */
export async function shouldShowWhatsNew(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(SEEN_KEY)) !== APP_VERSION;
  } catch {
    return false;
  }
}

export async function markWhatsNewSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(SEEN_KEY, APP_VERSION);
  } catch {
    // Not critical: the modal may show once more.
  }
}
