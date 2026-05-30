import { getDatabase, withDbMutex } from './database';

// ===== Types =====

export interface Category {
  id: string;
  title: string;
  interval_minutes: number;
  is_active: number; // 0 or 1
  sort_order: number;
  created_at: string;
  last_completed_at: string | null;
}

export interface Exercise {
  id: string;
  category_id: string;
  name: string;
  description: string;
  youtube_link: string;
  duration_seconds: number;
  sort_order: number;
  is_two_sided: number;
  type?: 'time' | 'reps';
  reps?: number;
}

export interface Settings {
  id: number;
  active_window_start: string;
  active_window_end: string;
  manual_toggle_state: number;
  manual_toggle_timestamp: string | null;
}

export interface Streaks {
  id: number;
  current_day_streak: number;
  total_stretch_count: number;
  last_completed_date: string | null;
  skipped_today: number;
}

// ===== Category Queries =====

export function getAllCategories(): Promise<Category[]> {
  return withDbMutex(async () => {
    console.log('[DB] getAllCategories');
    const db = await getDatabase();
    const result = await db.getAllAsync<Category>('SELECT * FROM categories ORDER BY sort_order ASC, created_at DESC');
    console.log('[DB] getAllCategories OK, count:', result.length);
    return result;
  });
}

export function getCategoryById(id: string): Promise<Category | null> {
  return withDbMutex(async () => {
    console.log('[DB] getCategoryById:', id);
    const db = await getDatabase();
    const result = await db.getFirstAsync<Category>('SELECT * FROM categories WHERE id = ?', id);
    console.log('[DB] getCategoryById OK:', result ? 'found' : 'not found');
    return result;
  });
}

export function addCategory(category: Omit<Category, 'created_at'>): Promise<void> {
  return withDbMutex(async () => {
    console.log('[DB] addCategory:', category.id, category.title);
    const db = await getDatabase();
    await db.runAsync(
      'INSERT INTO categories (id, title, interval_minutes, is_active, sort_order, last_completed_at) VALUES (?, ?, ?, ?, ?, ?)',
      category.id,
      category.title,
      category.interval_minutes,
      category.is_active,
      category.sort_order ?? 0,
      category.last_completed_at ?? null
    );
    console.log('[DB] addCategory OK');
  });
}

export function updateCategory(id: string, title: string, interval_minutes: number): Promise<void> {
  return withDbMutex(async () => {
    console.log('[DB] updateCategory:', id);
    const db = await getDatabase();
    await db.runAsync(
      'UPDATE categories SET title = ?, interval_minutes = ? WHERE id = ?',
      title,
      interval_minutes,
      id
    );
    console.log('[DB] updateCategory OK');
  });
}

export function toggleCategoryActive(id: string, isActive: boolean): Promise<void> {
  return withDbMutex(async () => {
    console.log('[DB] toggleCategoryActive:', id, isActive);
    const db = await getDatabase();
    await db.runAsync('UPDATE categories SET is_active = ? WHERE id = ?', isActive ? 1 : 0, id);
    console.log('[DB] toggleCategoryActive OK');
  });
}

export function deleteCategory(id: string): Promise<void> {
  return withDbMutex(async () => {
    console.log('[DB] deleteCategory:', id);
    const db = await getDatabase();
    await db.runAsync('DELETE FROM exercises WHERE category_id = ?', id);
    await db.runAsync('DELETE FROM categories WHERE id = ?', id);
    console.log('[DB] deleteCategory OK');
  });
}

export function updateCategoryOrder(orderedIds: string[]): Promise<void> {
  return withDbMutex(async () => {
    console.log('[DB] updateCategoryOrder:', orderedIds);
    const db = await getDatabase();
    for (let i = 0; i < orderedIds.length; i++) {
      await db.runAsync('UPDATE categories SET sort_order = ? WHERE id = ?', i, orderedIds[i]);
    }
    console.log('[DB] updateCategoryOrder OK');
  });
}

export function updateCategoryLastCompleted(categoryId: string, timestamp: string): Promise<void> {
  return withDbMutex(async () => {
    console.log('[DB] updateCategoryLastCompleted:', categoryId);
    const db = await getDatabase();
    await db.runAsync('UPDATE categories SET last_completed_at = ? WHERE id = ?', timestamp, categoryId);
    console.log('[DB] updateCategoryLastCompleted OK');
  });
}

// ===== Exercise Queries =====

export function getExercisesByCategory(categoryId: string): Promise<Exercise[]> {
  return withDbMutex(async () => {
    console.log('[DB] getExercisesByCategory:', categoryId);
    const db = await getDatabase();
    const result = await db.getAllAsync<Exercise>(
      'SELECT * FROM exercises WHERE category_id = ? ORDER BY sort_order ASC',
      categoryId
    );
    console.log('[DB] getExercisesByCategory OK, count:', result.length);
    return result;
  });
}

export function addExercise(exercise: Exercise): Promise<void> {
  return withDbMutex(async () => {
    console.log('[DB] addExercise:', exercise.id);
    const db = await getDatabase();
    await db.runAsync(
      'INSERT INTO exercises (id, category_id, name, description, youtube_link, duration_seconds, sort_order, is_two_sided, type, reps) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      exercise.id,
      exercise.category_id,
      exercise.name,
      exercise.description,
      exercise.youtube_link,
      exercise.duration_seconds,
      exercise.sort_order,
      exercise.is_two_sided,
      exercise.type || 'time',
      exercise.reps || 0
    );
    console.log('[DB] addExercise OK');
  });
}

export function updateExercise(exercise: Exercise): Promise<void> {
  return withDbMutex(async () => {
    console.log('[DB] updateExercise:', exercise.id);
    const db = await getDatabase();
    await db.runAsync(
      'UPDATE exercises SET name = ?, description = ?, youtube_link = ?, duration_seconds = ?, sort_order = ?, is_two_sided = ? WHERE id = ?',
      exercise.name,
      exercise.description ?? '',
      exercise.youtube_link ?? '',
      exercise.duration_seconds,
      exercise.sort_order,
      exercise.is_two_sided ?? 0,
      exercise.id
    );
    console.log('[DB] updateExercise OK');
  });
}

export function deleteExercise(id: string): Promise<void> {
  return withDbMutex(async () => {
    console.log('[DB] deleteExercise:', id);
    const db = await getDatabase();
    await db.runAsync('DELETE FROM exercises WHERE id = ?', id);
    console.log('[DB] deleteExercise OK');
  });
}

export function deleteExercisesByCategory(categoryId: string): Promise<void> {
  return withDbMutex(async () => {
    console.log('[DB] deleteExercisesByCategory:', categoryId);
    const db = await getDatabase();
    await db.runAsync('DELETE FROM exercises WHERE category_id = ?', categoryId);
    console.log('[DB] deleteExercisesByCategory OK');
  });
}

// ===== Settings Queries =====

export function getSettings(): Promise<Settings> {
  return withDbMutex(async () => {
    console.log('[DB] getSettings');
    const db = await getDatabase();
    const settings = await db.getFirstAsync<Settings>('SELECT * FROM settings WHERE id = 1');
    console.log('[DB] getSettings OK');
    return settings!;
  });
}

export function updateSettings(settings: Partial<Omit<Settings, 'id'>>): Promise<void> {
  return withDbMutex(async () => {
    console.log('[DB] updateSettings');
    const db = await getDatabase();
    const fields: string[] = [];
    const args: any[] = [];

    if (settings.active_window_start !== undefined) {
      fields.push('active_window_start = ?');
      args.push(settings.active_window_start);
    }
    if (settings.active_window_end !== undefined) {
      fields.push('active_window_end = ?');
      args.push(settings.active_window_end);
    }
    if (settings.manual_toggle_state !== undefined) {
      fields.push('manual_toggle_state = ?');
      args.push(settings.manual_toggle_state);
    }
    if (settings.manual_toggle_timestamp !== undefined) {
      fields.push('manual_toggle_timestamp = ?');
      args.push(settings.manual_toggle_timestamp);
    }

    if (fields.length > 0) {
      await db.runAsync(`UPDATE settings SET ${fields.join(', ')} WHERE id = 1`, ...args);
    }
    console.log('[DB] updateSettings OK');
  });
}

// ===== Streak Queries =====

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
