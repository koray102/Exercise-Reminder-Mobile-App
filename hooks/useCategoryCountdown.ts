import { useState, useEffect } from 'react';
import { Category } from '../types';
import { Config } from '../constants/config';

export function useCategoryCountdown(category: Category) {
  const [remainingMinutes, setRemainingMinutes] = useState<number | null>(null);
  const [countdownMode, setCountdownMode] = useState<'idle' | 'grace'>('idle');

  useEffect(() => {
    if (!category.is_active) {
      setRemainingMinutes(null);
      return;
    }

    const calculateRemaining = () => {
      if (!category.last_completed_at) {
        setRemainingMinutes(null);
        setCountdownMode('idle');
        return;
      }

      const lastCompleted = new Date(category.last_completed_at).getTime();
      const now = Date.now();
      const elapsedMinutes = (now - lastCompleted) / (1000 * 60);
      const intervalMin = category.interval_minutes;
      const graceDeadline = intervalMin + Config.GRACE_PERIOD_MINUTES;

      if (elapsedMinutes < intervalMin) {
        setCountdownMode('idle');
        setRemainingMinutes(Math.ceil(intervalMin - elapsedMinutes));
      } else if (elapsedMinutes < graceDeadline) {
        setCountdownMode('grace');
        setRemainingMinutes(Math.ceil(graceDeadline - elapsedMinutes));
      } else {
        setCountdownMode('grace');
        setRemainingMinutes(0);
      }
    };

    calculateRemaining();
    const interval = setInterval(calculateRemaining, 15000);
    return () => clearInterval(interval);
  }, [category.last_completed_at, category.interval_minutes, category.is_active]);

  return { remainingMinutes, countdownMode };
}
