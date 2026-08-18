import { Platform } from 'react-native';
import { Asset } from '../domain/types';
import { daysUntil, resolveServiceStatus } from '../domain/status';

async function nativeNotifications() {
  return import('expo-notifications');
}

export async function ensureNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const Notifications = await nativeNotifications();
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    const asked = await Notifications.requestPermissionsAsync();
    return !!asked.granted;
  } catch {
    return false;
  }
}

/** Best-effort: native only. Web shows Due Soon / Overdue in-app. */
export async function syncAssetReminders(assets: Asset[]): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const Notifications = await nativeNotifications();
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });

    const granted = await ensureNotificationPermission();
    if (!granted) return;
    await Notifications.cancelAllScheduledNotificationsAsync();

    for (const asset of assets.filter((a) => !a.archived)) {
      const status = resolveServiceStatus(asset);
      if (status !== 'due_soon' && status !== 'overdue') continue;

      const days = daysUntil(asset.nextServiceAt);
      const seconds = Math.max(5, Math.min(60, Math.abs(days) + 5));
      await Notifications.scheduleNotificationAsync({
        content: {
          title: status === 'overdue' ? 'Servizio: Overdue' : 'Servizio: Due Soon',
          body: `${asset.name} — service ${status === 'overdue' ? 'overdue' : 'due soon'}`,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds,
          repeats: false,
        },
      });
    }
  } catch {
    // Notifications are best-effort in Expo Go / simulators / web
  }
}
