import { getDatabase, withDbMutex } from '../db/database';
import { Streaks } from '../types';

export function getStreaks(): Promise<Streaks> {
  return withDbMutex(async () => {
    console.log('[DB] getStreaks');
    const db = await getDatabase();
    const streaks = await db.getFirstAsync<Streaks>('SELECT * FROM streaks WHERE id = 1');
    console.log('[DB] getStreaks OK');
    return streaks!;
  });
}

export function updateStreaks(streaks: Partial<Omit<Streaks, 'id'>>): Promise<void> {
  return withDbMutex(async () => {
    console.log('[DB] updateStreaks');
    const db = await getDatabase();
    const fields: string[] = [];
    const args: any[] = [];

    if (streaks.current_day_streak !== undefined) {
      fields.push('current_day_streak = ?');
      args.push(streaks.current_day_streak);
    }
    if (streaks.total_stretch_count !== undefined) {
      fields.push('total_stretch_count = ?');
      args.push(streaks.total_stretch_count);
    }
    if (streaks.last_completed_date !== undefined) {
      fields.push('last_completed_date = ?');
      args.push(streaks.last_completed_date);
    }
    if (streaks.skipped_today !== undefined) {
      fields.push('skipped_today = ?');
      args.push(streaks.skipped_today);
    }

    if (fields.length > 0) {
      await db.runAsync(`UPDATE streaks SET ${fields.join(', ')} WHERE id = 1`, ...args);
    }
    console.log('[DB] updateStreaks OK');
  });
}

export function incrementStretchCount(): Promise<void> {
  return withDbMutex(async () => {
    console.log('[DB] incrementStretchCount');
    const db = await getDatabase();
    await db.runAsync('UPDATE streaks SET total_stretch_count = total_stretch_count + 1 WHERE id = 1');
    console.log('[DB] incrementStretchCount OK');
  });
}

export function markSkippedToday(): Promise<void> {
  return withDbMutex(async () => {
    console.log('[DB] markSkippedToday');
    const db = await getDatabase();
    await db.runAsync('UPDATE streaks SET skipped_today = 1, current_day_streak = 0 WHERE id = 1');
    console.log('[DB] markSkippedToday OK');
  });
}

export function resetDailySkipFlag(): Promise<void> {
  return withDbMutex(async () => {
    console.log('[DB] resetDailySkipFlag');
    const db = await getDatabase();
    await db.runAsync('UPDATE streaks SET skipped_today = 0 WHERE id = 1');
    console.log('[DB] resetDailySkipFlag OK');
  });
}
