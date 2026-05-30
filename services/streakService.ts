import { getStreaks, updateStreaks, incrementStretchCount, markSkippedToday, resetDailySkipFlag, updateCategoryLastCompleted, getAllCategories } from '../db/queries';
import { Config } from '../constants/config';

/**
 * Get today's date as YYYY-MM-DD string (Local Time)
 */
export function getTodayString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * Check if an ISO date string matches today's Local Time date
 */
export function isDateStringToday(isoString: string | null): boolean {
  if (!isoString) return false;
  const d = new Date(isoString);
  const localDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return localDateStr === getTodayString();
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

  // Check if ALL active categories are completed TODAY (using Local Time)
  const categories = await getAllCategories();
  const activeCategories = categories.filter(c => c.is_active);
  const allCompletedToday = activeCategories.length > 0 && activeCategories.every(c => {
    return isDateStringToday(c.last_completed_at);
  });

  let newStreak = streaks.current_day_streak;

  if (allCompletedToday) {
    if (streaks.last_completed_date === today) {
      // Zaten bugün tamamlanmış, streak artmaz
    } else if (streaks.last_completed_date && isYesterday(streaks.last_completed_date)) {
      // Dün yapılmış → streak devam
      newStreak += 1;
    } else if (!streaks.last_completed_date) {
      // İlk defa
      newStreak = 1;
    } else {
      // Ara verilmiş → 1'den başla
      newStreak = 1;
    }

    await updateStreaks({
      current_day_streak: newStreak,
      last_completed_date: today,
    });
  }

  return {
    newStreak,
    totalCount: streaks.total_stretch_count + 1,
  };
}

/**
 * Called when a grace period expires for a category.
 * - Resets streak to 0
 * - Sets last_completed_at = now to restart the interval cycle
 */
export async function onGraceExpired(categoryId: string): Promise<void> {
  console.log('[Streak] Grace expired for category:', categoryId);
  // Ceza kaldirildi: Artık grace period dolsa da streak bozulmuyor. Sadece döngü baştan başlıyor.
  await updateCategoryLastCompleted(categoryId, new Date().toISOString());
}

/**
 * Check all categories for expired grace periods.
 * If any category's grace period has expired (elapsed >= interval + grace),
 * reset streak and restart the cycle.
 * 
 * Call this on app open and screen focus to catch expirations
 * that happened while the app was closed.
 */
export async function checkAllGracePeriods(): Promise<boolean> {
  let anyExpired = false;

  try {
    const categories = await getAllCategories();
    const now = Date.now();

    for (const category of categories) {
      if (!category.is_active || !category.last_completed_at) continue;

      const lastCompleted = new Date(category.last_completed_at).getTime();
      const elapsedMinutes = (now - lastCompleted) / (1000 * 60);
      const graceDeadline = category.interval_minutes + Config.GRACE_PERIOD_MINUTES;

      if (elapsedMinutes >= graceDeadline) {
        // Grace period has expired — reset streak and restart cycle
        await onGraceExpired(category.id);
        anyExpired = true;
      }
    }
  } catch (error) {
    console.error('[Streak] checkAllGracePeriods error:', error);
  }

  return anyExpired;
}

/**
 * Called when user presses "Skip" on a reminder.
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
