import { getStreaks, updateStreaks, incrementStretchCount } from '../repositories/StreakRepository';
import { updateCategoryRoutineCompleted, getAllCategories } from '../repositories/CategoryRepository';
import { getTodayString, isDateStringToday, isYesterday } from '../utils/date';



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
  // Update category's last completed timestamp and routine completion timestamp
  await updateCategoryRoutineCompleted(categoryId, new Date().toISOString());

  // Always increment total stretch count
  await incrementStretchCount();

  // Evaluate if daily streak should be updated
  await evaluateDailyStreak();

  // Fetch updated streaks to return
  const updatedStreaks = await getStreaks();

  return {
    newStreak: updatedStreaks.current_day_streak,
    totalCount: updatedStreaks.total_stretch_count,
  };
}

/**
 * Checks if all active categories are completed today.
 * If so, updates the daily streak.
 * This can be called after a routine is finished, or if a category is deleted/deactivated.
 */
export async function evaluateDailyStreak(): Promise<void> {
  const streaks = await getStreaks();
  const today = getTodayString();

  if (streaks.last_completed_date === today) {
    return; // Bugün zaten tamamlanmış
  }

  // Check if ALL active categories are completed TODAY (using Local Time)
  const categories = await getAllCategories();
  const activeCategories = categories.filter(c => c.is_active && c.type !== 'workout');
  const allCompletedToday = activeCategories.length > 0 && activeCategories.every(c => {
    return isDateStringToday(c.last_routine_completed_at);
  });

  if (allCompletedToday) {
    let newStreak = streaks.current_day_streak;
    
    if (streaks.last_completed_date && isYesterday(streaks.last_completed_date)) {
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
}

/**
 * Called when a grace period expires for a category.
 * No-op: Grace period expiring has no penalty.
 * Notifications continue at fixed intervals regardless of user action.
 * Streak is evaluated purely on a daily basis (did user complete all categories today?).
 */
export async function onGraceExpired(_categoryId: string): Promise<void> {
  // No-op: grace period expiring doesn't affect timing or streak
}

/**
 * Check all categories for expired grace periods.
 * Since grace period expiring has no penalty and doesn't affect timing,
 * this is now a no-op that returns false to prevent unnecessary rescheduling.
 */
export async function checkAllGracePeriods(): Promise<boolean> {
  return false;
}

/**
 * Should be called at app open to handle day transitions.
 * - Resets streak to 0 if a day was missed entirely
 */
export async function checkAndResetDailyStreak(): Promise<void> {
  const streaks = await getStreaks();
  const today = getTodayString();

  const streakEarnedToday = streaks.last_completed_date === today;
  const streakEarnedYesterday = streaks.last_completed_date ? isYesterday(streaks.last_completed_date) : false;

  // If streak wasn't earned today or yesterday, a day was missed → reset streak
  if (streaks.last_completed_date && !streakEarnedToday && !streakEarnedYesterday) {
    await updateStreaks({ current_day_streak: 0 });
  }
}
