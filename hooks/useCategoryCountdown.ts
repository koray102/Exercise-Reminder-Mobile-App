import { useState, useEffect } from 'react';
import { Category } from '../types';
import { useApp } from '../contexts/AppContext';
import { addActiveMinutes } from '../utils/time';

export function useCategoryCountdown(category: Category) {
  const { state: { settings } } = useApp();
  const [remainingMinutes, setRemainingMinutes] = useState<number | null>(null);
  const [countdownMode, setCountdownMode] = useState<'idle' | 'grace'>('idle');

  // Extract primitive values so useEffect doesn't re-run on object reference changes
  const windowStart = settings?.active_window_start;
  const windowEnd = settings?.active_window_end;

  useEffect(() => {
    if (!category.is_active || !windowStart || !windowEnd) {
      setRemainingMinutes(null);
      return;
    }

    const calculateRemaining = () => {
      if (!category.last_completed_at) {
        setRemainingMinutes(null);
        setCountdownMode('idle');
        return;
      }

      const lastCompleted = new Date(category.last_completed_at);
      const now = new Date();
      const intervalMinutes = category.interval_minutes;

      // Find the next notification time using the same logic as notificationService:
      // Fast-forward through intervals (respecting active window) to find the next one after now
      let cycleStart = lastCompleted;
      let nextNotification: Date | null = null;

      for (let i = 0; i < 100; i++) {
        const intervalEnd = addActiveMinutes(cycleStart, intervalMinutes, windowStart, windowEnd);
        if (intervalEnd > now) {
          nextNotification = intervalEnd;
          break;
        }
        cycleStart = intervalEnd;
      }

      if (nextNotification) {
        const remainingMs = nextNotification.getTime() - now.getTime();
        const remainingMin = Math.ceil(remainingMs / (1000 * 60));
        setCountdownMode('idle');
        setRemainingMinutes(remainingMin);
      } else {
        // All cycles are in the past (shouldn't happen with 100 iterations)
        setRemainingMinutes(null);
        setCountdownMode('idle');
      }
    };

    calculateRemaining();
    const interval = setInterval(calculateRemaining, 15000);
    return () => clearInterval(interval);
  }, [category.last_completed_at, category.interval_minutes, category.is_active, windowStart, windowEnd]);

  return { remainingMinutes, countdownMode };
}
