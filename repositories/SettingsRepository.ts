import { getDatabase, withDbMutex } from '../db/database';
import { Settings } from '../types';

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
    if (settings.haptics_enabled !== undefined) {
      fields.push('haptics_enabled = ?');
      args.push(settings.haptics_enabled);
    }
    if (settings.vibration_intensity !== undefined) {
      fields.push('vibration_intensity = ?');
      args.push(settings.vibration_intensity);
    }
    if (settings.sound_enabled !== undefined) {
      fields.push('sound_enabled = ?');
      args.push(settings.sound_enabled);
    }
    if (settings.sound_volume !== undefined) {
      fields.push('sound_volume = ?');
      args.push(settings.sound_volume);
    }

    if (fields.length > 0) {
      await db.runAsync(`UPDATE settings SET ${fields.join(', ')} WHERE id = 1`, ...args);
    }
    console.log('[DB] updateSettings OK');
  });
}
