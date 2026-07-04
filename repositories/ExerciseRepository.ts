import { getDatabase, withDbMutex } from '../db/database';
import { Exercise } from '../types';

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
