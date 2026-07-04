import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Config } from '../constants/config';
import { getAllCategories } from '../repositories/CategoryRepository';
import { getSettings } from '../repositories/SettingsRepository';
import { Category } from '../types';
import { isWithinActiveWindow, addActiveMinutes } from '../utils/time';

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

let isScheduling = false;
let pendingSchedule = false;

/**
 * Schedule notifications for all active categories.
 * Uses a mutex to prevent duplicate notifications if called concurrently.
 */
export async function scheduleAllNotifications(): Promise<void> {
  if (isScheduling) {
    pendingSchedule = true;
    return;
  }

  isScheduling = true;

  try {
    do {
      pendingSchedule = false;
      await Notifications.cancelAllScheduledNotificationsAsync();

      const settings = await getSettings();
      if (!settings.manual_toggle_state) continue;

      // We still schedule a 'window_start' notification if they want, but it's optional.
      if (!isWithinActiveWindow(new Date(), settings.active_window_start, settings.active_window_end)) {
        await scheduleWindowStartNotification(settings.active_window_start);
      }

      const categories = await getAllCategories();
      const activeCategories = categories.filter(c => c.is_active);

      for (const category of activeCategories) {
        await scheduleCategoryNotifications(category, settings.active_window_start, settings.active_window_end);
      }
    } while (pendingSchedule);
  } catch (error) {
    console.error('[Notifications] Failed to schedule:', error);
  } finally {
    isScheduling = false;
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
 * Schedule grace period notifications for a single category using Timeline Simulation.
 * Automatically skips time outside the active window.
 */
async function scheduleCategoryNotifications(category: Category, startStr: string, endStr: string): Promise<void> {
  const intervalMinutes = category.interval_minutes;
  const graceMinutes = Config.GRACE_PERIOD_MINUTES;
  const now = new Date();

  // 1. Determine when the current cycle started
  let cycleStart = now;
  if (category.last_completed_at) {
    const lastCompleted = new Date(category.last_completed_at);
    // When would this cycle have naturally expired? (Accounting for active hours)
    const expirationTime = addActiveMinutes(lastCompleted, intervalMinutes + graceMinutes, startStr, endStr);
    
    if (now > expirationTime) {
      // The user completely missed the window and the streak is dead.
      // We start counting from NOW so they get a fresh reminder.
      cycleStart = now;
    } else {
      // Streak is still alive. The cycle started when they last completed it.
      cycleStart = lastCompleted;
    }
  }

  // 2. Project the next 10 cycles into the future
  const MAX_CYCLES = 10;
  let currentCycleStart = cycleStart;

  for (let i = 0; i < MAX_CYCLES; i++) {
    // Add interval time (ignoring time outside active window)
    const intervalEnd = addActiveMinutes(currentCycleStart, intervalMinutes, startStr, endStr);
    // Add grace time (ignoring time outside active window)
    const graceEnd = addActiveMinutes(currentCycleStart, intervalMinutes + graceMinutes, startStr, endStr);

    // Schedule: Main reminder when interval expires
    if (intervalEnd > now) {
      const delaySec = Math.floor((intervalEnd.getTime() - now.getTime()) / 1000);
      await scheduleNotification(
        category,
        `🧘 ${category.title} — It's time to stretch!`,
        'grace_start',
        delaySec
      );
    }



    // The next cycle mathematically starts exactly when this cycle's grace period ends.
    currentCycleStart = graceEnd;
  }
}

/**
 * Schedule a single notification.
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
 * Empty implementation for backwards compatibility.
 */
export async function setupNotificationCategories(): Promise<void> {}

/**
 * Set up notification listeners.
 * Background listeners are unreliable, so we only handle responses (tapping the notification).
 * The OS will handle delivering the pre-scheduled timeline, and database sync will happen lazily on app open.
 */
export function setupNotificationListeners(): () => void {
  // Response listener — opens the app
  const responseSubscription = Notifications.addNotificationResponseReceivedListener(
    async (_response) => {
      // Tapping any notification opens the app, which mounts Dashboard and triggers streak evaluation.
    }
  );

  return () => {
    responseSubscription.remove();
  };
}
