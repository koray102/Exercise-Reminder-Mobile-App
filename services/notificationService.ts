import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Config } from '../constants/config';
import { getAllCategories, getSettings, Category } from '../db/queries';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Request notification permissions
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return false;
  }

  // Set up Android notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(Config.NOTIFICATION_CHANNEL_ID, {
      name: Config.NOTIFICATION_CHANNEL_NAME,
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#00D4AA',
      sound: 'default',
    });
  }

  return true;
}

/**
 * Check if current time is within the active window
 */
export function isWithinActiveWindow(startStr: string, endStr: string): boolean {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [startH, startM] = startStr.split(':').map(Number);
  const [endH, endM] = endStr.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (startMinutes <= endMinutes) {
    // Normal range (e.g., 09:00 - 17:00)
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  } else {
    // Overnight range (e.g., 13:00 - 02:00)
    return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
  }
}

/**
 * Schedule notifications for all active categories
 */
export async function scheduleAllNotifications(): Promise<void> {
  // Cancel all existing scheduled notifications
  await Notifications.cancelAllScheduledNotificationsAsync();

  const settings = await getSettings();

  // Check if notifications are enabled
  if (!settings.manual_toggle_state) return;

  // Check if we're in the active window
  if (!isWithinActiveWindow(settings.active_window_start, settings.active_window_end)) return;

  const categories = await getAllCategories();
  const activeCategories = categories.filter(c => c.is_active);

  for (const category of activeCategories) {
    await scheduleCategoryNotification(category);
  }
}

/**
 * Schedule a single notification for a category
 */
export async function scheduleCategoryNotification(
  category: Category,
  delayMinutes?: number
): Promise<string> {
  const delay = delayMinutes ?? category.interval_minutes;

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: '🧘 Stretch Time!',
      body: `${category.title} — Time to exercise!`,
      data: {
        categoryId: category.id,
        categoryTitle: category.title,
        type: 'reminder',
        snoozeCount: 0,
      },
      categoryIdentifier: 'stretch-reminder',
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: delay * 60,
      repeats: false,
    },
  });

  return id;
}

/**
 * Snooze a notification (reschedule for 5 minutes later)
 */
export async function snoozeNotification(
  categoryId: string,
  categoryTitle: string,
  currentSnoozeCount: number
): Promise<string | null> {
  if (currentSnoozeCount >= Config.MAX_SNOOZE_COUNT) {
    return null; // No more snoozes
  }

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: '🧘 Stretch Reminder (Snoozed)',
      body: `${categoryTitle} — Snoozes remaining: ${Config.MAX_SNOOZE_COUNT - currentSnoozeCount - 1}`,
      data: {
        categoryId,
        categoryTitle,
        type: 'reminder',
        snoozeCount: currentSnoozeCount + 1,
      },
      categoryIdentifier: 'stretch-reminder',
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: Config.SNOOZE_DURATION_MINUTES * 60,
      repeats: false,
    },
  });

  return id;
}

/**
 * Set up notification categories with action buttons (Android)
 */
export async function setupNotificationCategories(): Promise<void> {
  await Notifications.setNotificationCategoryAsync('stretch-reminder', [
    {
      identifier: 'START',
      buttonTitle: 'Start Stretching 🏃',
      options: { opensAppToForeground: true },
    },
    {
      identifier: 'SNOOZE',
      buttonTitle: 'Snooze ⏰',
      options: { opensAppToForeground: false },
    },
    {
      identifier: 'SKIP',
      buttonTitle: 'Skip ⏭️',
      options: { opensAppToForeground: false, isDestructive: true },
    },
  ]);
}
