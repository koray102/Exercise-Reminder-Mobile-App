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
 * Schedule notifications for all active categories.
 * Uses real device clock — notifications fire at exact wall-clock times
 * regardless of whether the app is open or not.
 */
export async function scheduleAllNotifications(): Promise<void> {
  // Cancel all existing scheduled notifications
  await Notifications.cancelAllScheduledNotificationsAsync();

  const settings = await getSettings();

  // Check if notifications are enabled
  if (!settings.manual_toggle_state) return;

  // Check if we're in the active window
  if (!isWithinActiveWindow(settings.active_window_start, settings.active_window_end)) {
    // Schedule a notification at the start of the next active window to wake us up
    await scheduleWindowStartNotification(settings.active_window_start);
    return;
  }

  const categories = await getAllCategories();
  const activeCategories = categories.filter(c => c.is_active);

  for (const category of activeCategories) {
    await scheduleCategoryNotification(category);
  }
}

/**
 * Schedule a notification at the start of the next active window.
 * This ensures notifications resume even if the app isn't opened.
 */
async function scheduleWindowStartNotification(startStr: string): Promise<void> {
  const [startH, startM] = startStr.split(':').map(Number);

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🧘 Active Window Started',
        body: 'Your exercise reminder window is now active!',
        data: { type: 'window_start' },
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: startH,
        minute: startM,
      },
    });
  } catch (e) {
    console.warn('[Notifications] Failed to schedule window start notification:', e);
  }
}

/**
 * Schedule a single notification for a category.
 * Uses TIME_INTERVAL trigger which relies on device clock.
 */
export async function scheduleCategoryNotification(
  category: Category,
  delayMinutes?: number
): Promise<string> {
  const delay = delayMinutes ?? category.interval_minutes;

  // Calculate actual delay: if category was recently completed, subtract elapsed time
  let actualDelaySeconds = delay * 60;

  if (!delayMinutes && category.last_completed_at) {
    const lastCompleted = new Date(category.last_completed_at).getTime();
    const now = Date.now();
    const elapsedSeconds = Math.floor((now - lastCompleted) / 1000);
    const intervalSeconds = category.interval_minutes * 60;
    const remaining = intervalSeconds - elapsedSeconds;

    if (remaining > 0) {
      actualDelaySeconds = remaining;
    } else {
      // Already overdue — notify in 10 seconds
      actualDelaySeconds = 10;
    }
  }

  // Minimum 1 second delay
  actualDelaySeconds = Math.max(actualDelaySeconds, 1);

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: '🧘 Stretch Time!',
      body: `${category.title} — Time to exercise!`,
      data: {
        categoryId: category.id,
        categoryTitle: category.title,
        intervalMinutes: category.interval_minutes,
        type: 'reminder',
        snoozeCount: 0,
      },
      categoryIdentifier: 'stretch-reminder',
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: actualDelaySeconds,
      repeats: false, // We manually reschedule for more control
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

/**
 * Set up notification listeners for received & response events.
 * Call this once in _layout.tsx on app start.
 * 
 * - When a reminder notification is received (fires), automatically
 *   reschedule the next one for the same category (using device clock).
 * - When a user taps an action button, handle SNOOZE and SKIP.
 */
export function setupNotificationListeners(): () => void {
  // When a notification is received (fires in foreground or background)
  const receivedSubscription = Notifications.addNotificationReceivedListener(
    async (notification) => {
      const data = notification.request.content.data as any;

      if (data?.type === 'reminder' && data?.categoryId) {
        // Reschedule the next notification for this category
        try {
          const settings = await getSettings();
          if (settings.manual_toggle_state && isWithinActiveWindow(settings.active_window_start, settings.active_window_end)) {
            const intervalMinutes = data.intervalMinutes || 60;
            await Notifications.scheduleNotificationAsync({
              content: {
                title: '🧘 Stretch Time!',
                body: `${data.categoryTitle} — Time to exercise!`,
                data: {
                  categoryId: data.categoryId,
                  categoryTitle: data.categoryTitle,
                  intervalMinutes: intervalMinutes,
                  type: 'reminder',
                  snoozeCount: 0,
                },
                categoryIdentifier: 'stretch-reminder',
                sound: 'default',
              },
              trigger: {
                type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                seconds: intervalMinutes * 60,
                repeats: false,
              },
            });
          }
        } catch (e) {
          console.warn('[Notifications] Failed to reschedule:', e);
        }
      }

      if (data?.type === 'window_start') {
        // Active window just started — schedule all category notifications
        try {
          await scheduleAllNotifications();
        } catch (e) {
          console.warn('[Notifications] Failed to schedule on window start:', e);
        }
      }
    }
  );

  // When user interacts with a notification action button
  const responseSubscription = Notifications.addNotificationResponseReceivedListener(
    async (response) => {
      const data = response.notification.request.content.data as any;
      const actionId = response.actionIdentifier;

      if (data?.type !== 'reminder') return;

      if (actionId === 'SNOOZE') {
        await snoozeNotification(
          data.categoryId,
          data.categoryTitle,
          data.snoozeCount || 0
        );
      } else if (actionId === 'SKIP') {
        // Skip — import dynamically to avoid circular dependency
        const { onReminderSkipped } = require('./streakService');
        await onReminderSkipped();
      }
      // 'START' or default tap opens the app — no extra handling needed
    }
  );

  // Return cleanup function
  return () => {
    receivedSubscription.remove();
    responseSubscription.remove();
  };
}
