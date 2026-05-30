// App-wide configuration constants

export const Config = {
  // App version
  APP_VERSION: '0.5',

  // Default active window
  DEFAULT_ACTIVE_WINDOW_START: '13:00',
  DEFAULT_ACTIVE_WINDOW_END: '02:00',

  // Timer
  PREP_DURATION_SECONDS: 5,

  // Grace period — how long user has to START the first exercise
  // after a reminder fires before streak resets (in minutes)
  GRACE_PERIOD_MINUTES: 15,

  // Notification channel
  NOTIFICATION_CHANNEL_ID: 'flexify-reminders',
  NOTIFICATION_CHANNEL_NAME: 'Exercise Reminders',

  // Background task
  BACKGROUND_TASK_NAME: 'FLEXIFY_BACKGROUND_FETCH',

  // Streak milestones (days)
  STREAK_MILESTONES: [7, 30, 90, 180, 365],

  // DB
  DB_NAME: 'flexify.db',
};
