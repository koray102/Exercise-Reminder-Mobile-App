import { getStreaks, updateStreaks, incrementStretchCount, markSkippedToday, resetDailySkipFlag, updateCategoryLastCompleted } from '../db/queries';

/**
 * Get today's date as YYYY-MM-DD string
 */
function getTodayString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * Check if a date string is yesterday
 */
function isYesterday(dateStr: string): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
  return dateStr === yStr;
}

/**
 * Called when a user completes all exercises in a category routine.
 * - Updates category's last_completed_at timestamp
 * - Increments total_stretch_count (never resets)
 * - Evaluates day streak
 */
export async function onRoutineCompleted(categoryId: string): Promise<{
  newStreak: number;
  totalCount: number;
}> {
  const streaks = await getStreaks();
  const today = getTodayString();

  // Update category's last completed timestamp
  await updateCategoryLastCompleted(categoryId, new Date().toISOString());

  // Always increment total stretch count
  await incrementStretchCount();

  // If already skipped today, streak stays at 0
  if (streaks.skipped_today) {
    return {
      newStreak: 0,
      totalCount: streaks.total_stretch_count + 1,
    };
  }

  let newStreak = streaks.current_day_streak;

  if (streaks.last_completed_date === today) {
    // Already completed today, streak doesn't change
  } else if (streaks.last_completed_date && isYesterday(streaks.last_completed_date)) {
    // Completed yesterday → continue streak
    newStreak += 1;
  } else if (!streaks.last_completed_date) {
    // First ever completion
    newStreak = 1;
  } else {
    // Missed a day → reset streak
    newStreak = 1;
  }

  await updateStreaks({
    current_day_streak: newStreak,
    last_completed_date: today,
  });

  return {
    newStreak,
    totalCount: streaks.total_stretch_count + 1,
  };
}

/**
 * Called when user presses "Atla" (Skip) on a reminder.
 * - Resets current_day_streak to 0
 * - Marks that a skip happened today
 */
export async function onReminderSkipped(): Promise<void> {
  await markSkippedToday();
}

/**
 * Should be called at midnight or app open to reset daily skip flag.
 */
export async function checkAndResetDailyStreak(): Promise<void> {
  const streaks = await getStreaks();
  const today = getTodayString();

  // If last completed date is not today or yesterday, we need to evaluate
  if (streaks.last_completed_date && streaks.last_completed_date !== today && !isYesterday(streaks.last_completed_date)) {
    // Missed a day → reset streak
    await updateStreaks({ current_day_streak: 0 });
  }

  // Reset daily skip flag if it's a new day
  if (streaks.last_completed_date !== today) {
    await resetDailySkipFlag();
  }
}
