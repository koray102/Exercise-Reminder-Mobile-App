import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Config } from '../constants/config';
import { getAllCategories, getSettings, Category, updateCategoryLastCompleted, updateStreaks } from '../db/queries';

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
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  } else {
    return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
  }
}

/**
 * Schedule notifications for all active categories.
 * For each category, schedules:
 *   1. Reminder at interval time: "15 minutes to start!"
 *   2. Warning at interval + 10 min: "5 minutes remaining!"
 *   3. Expiry at interval + 15 min: "Time's up! Streak reset."
 */
export async function scheduleAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();

  const settings = await getSettings();
  if (!settings.manual_toggle_state) return;

  if (!isWithinActiveWindow(settings.active_window_start, settings.active_window_end)) {
    await scheduleWindowStartNotification(settings.active_window_start);
    return;
  }

  const categories = await getAllCategories();
  const activeCategories = categories.filter(c => c.is_active);

  for (const category of activeCategories) {
    await scheduleCategoryNotifications(category);
  }
}

/**
 * Schedule a notification at the start of the next active window.
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
    console.warn('[Notifications] Failed to schedule window start:', e);
  }
}

/**
 * Schedule grace period notifications for a single category.
 * Calculates delay based on real wall-clock time since last completion.
 */
async function scheduleCategoryNotifications(category: Category): Promise<void> {
  const intervalSeconds = category.interval_minutes * 60;
  const graceSeconds = Config.GRACE_PERIOD_MINUTES * 60;

  // Calculate how far into the cycle we are
  let elapsedSeconds = 0;
  if (category.last_completed_at) {
    const lastCompleted = new Date(category.last_completed_at).getTime();
    elapsedSeconds = Math.floor((Date.now() - lastCompleted) / 1000);
  }

  // If already past grace expiry, the check on app focus will handle reset.
  // Schedule fresh notifications for the next cycle.
  if (elapsedSeconds >= intervalSeconds + graceSeconds) {
    // Past grace — schedule for the full interval from now
    await scheduleGraceNotifications(category, intervalSeconds, graceSeconds);
    return;
  }

  // If still in idle phase (interval hasn't expired yet)
  if (elapsedSeconds < intervalSeconds) {
    const remainingToInterval = intervalSeconds - elapsedSeconds;
    await scheduleGraceNotifications(category, remainingToInterval, graceSeconds);
    return;
  }

  // If currently in grace period (interval expired, grace not yet expired)
  const elapsedGrace = elapsedSeconds - intervalSeconds;
  const remainingGrace = graceSeconds - elapsedGrace;

  // Schedule only the remaining grace notifications
  if (remainingGrace > 0) {
    // Warning at 5 min remaining (if not already past)
    const fiveMinMark = graceSeconds - 5 * 60; // seconds into grace when 5 min remain
    const warningDelay = (fiveMinMark - elapsedGrace);
    if (warningDelay > 1) {
      await scheduleNotification(
        category,
        `⚠️ ${category.title} — 5 minutes remaining!`,
        'grace_warning',
        warningDelay
      );
    }

    // Expiry notification
    if (remainingGrace > 1) {
      await scheduleNotification(
        category,
        `❌ ${category.title} — Time's up! Streak reset.`,
        'grace_expired',
        remainingGrace
      );
    }
  }
}

/**
 * Schedule the full set of grace notifications from a given delay.
 * @param delayToInterval - seconds until interval expires
 * @param graceSeconds - total grace period in seconds
 */
async function scheduleGraceNotifications(
  category: Category,
  delayToInterval: number,
  graceSeconds: number
): Promise<void> {
  // 1. Main reminder when interval expires
  if (delayToInterval > 0) {
    await scheduleNotification(
      category,
      `🧘 ${category.title} — ${Config.GRACE_PERIOD_MINUTES} minutes to start!`,
      'grace_start',
      delayToInterval
    );
  }

  // 2. Warning at 5 minutes remaining
  const warningDelay = delayToInterval + graceSeconds - 5 * 60;
  if (warningDelay > 1) {
    await scheduleNotification(
      category,
      `⚠️ ${category.title} — 5 minutes remaining!`,
      'grace_warning',
      warningDelay
    );
  }

  // 3. Expiry notification
  const expiryDelay = delayToInterval + graceSeconds;
  if (expiryDelay > 1) {
    await scheduleNotification(
      category,
      `❌ ${category.title} — Time's up! Streak reset.`,
      'grace_expired',
      expiryDelay
    );
  }
}

/**
 * Schedule a single notification (no action buttons).
 */
async function scheduleNotification(
  category: Category,
  body: string,
  type: string,
  delaySeconds: number
): Promise<string> {
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: '🧘 Stretch Time!',
      body,
      data: {
        categoryId: category.id,
        categoryTitle: category.title,
        intervalMinutes: category.interval_minutes,
        type,
      },
      sound: 'default',
      // No categoryIdentifier — no action buttons
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: Math.max(delaySeconds, 1),
      repeats: false,
    },
  });
  return id;
}

/**
 * Set up notification categories — no action buttons.
 * Keep the function for backwards compatibility but register empty actions.
 */
export async function setupNotificationCategories(): Promise<void> {
  // No action buttons — user just sees the notification
}

/**
 * Set up notification listeners.
 * - grace_expired: reset streak and restart cycle
 * - grace_start: reschedule next cycle after grace
 * - window_start: schedule all notifications
 */
export function setupNotificationListeners(): () => void {
  const receivedSubscription = Notifications.addNotificationReceivedListener(
    async (notification) => {
      const data = notification.request.content.data as any;

      if (data?.type === 'grace_expired' && data?.categoryId) {
        // Grace period expired — reset streak and restart cycle
        try {
          // Reset streak to 0
          await updateStreaks({ current_day_streak: 0 });
          // Restart cycle by setting last_completed_at to now
          await updateCategoryLastCompleted(data.categoryId, new Date().toISOString());
          // Reschedule notifications for the new cycle
          await scheduleAllNotifications();
        } catch (e) {
          console.warn('[Notifications] Grace expiry handling failed:', e);
        }
      }

      if (data?.type === 'window_start') {
        try {
          await scheduleAllNotifications();
        } catch (e) {
          console.warn('[Notifications] Window start scheduling failed:', e);
        }
      }
    }
  );

  // Response listener — just opens the app, no special actions
  const responseSubscription = Notifications.addNotificationResponseReceivedListener(
    async (_response) => {
      // Tapping any notification just opens the app — no button handling needed
    }
  );

  return () => {
    receivedSubscription.remove();
    responseSubscription.remove();
  };
}
