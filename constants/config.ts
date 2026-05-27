// App-wide configuration constants

export const Config = {
  // Default active window
  DEFAULT_ACTIVE_WINDOW_START: '13:00',
  DEFAULT_ACTIVE_WINDOW_END: '02:00',

  // Timer
  PREP_DURATION_SECONDS: 5,

  // Snooze
  MAX_SNOOZE_COUNT: 3,
  SNOOZE_DURATION_MINUTES: 5,

  // Notification channel
  NOTIFICATION_CHANNEL_ID: 'flexify-reminders',
  NOTIFICATION_CHANNEL_NAME: 'Egzersiz Hatırlatmaları',

  // Background task
  BACKGROUND_TASK_NAME: 'FLEXIFY_BACKGROUND_FETCH',

  // Streak milestones (days)
  STREAK_MILESTONES: [7, 30, 90, 180, 365],

  // DB
  DB_NAME: 'flexify.db',
};
