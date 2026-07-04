import { getDatabase, withDbMutex } from '../db/database';
import { Category } from '../types';

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

export function updateCategoryRoutineCompleted(categoryId: string, timestamp: string): Promise<void> {
  return withDbMutex(async () => {
    console.log('[DB] updateCategoryRoutineCompleted:', categoryId);
    const db = await getDatabase();
    await db.runAsync(
      'UPDATE categories SET last_completed_at = ?, last_routine_completed_at = ? WHERE id = ?', 
      timestamp, timestamp, categoryId
    );
    console.log('[DB] updateCategoryRoutineCompleted OK');
  });
}
