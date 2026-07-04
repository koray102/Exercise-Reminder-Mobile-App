export interface Category {
  id: string;
  title: string;
  interval_minutes: number;
  is_active: number; // 0 or 1
  sort_order: number;
  created_at: string;
  last_completed_at: string | null;
  last_routine_completed_at: string | null;
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
  haptics_enabled: number;
}

export interface Streaks {
  id: number;
  current_day_streak: number;
  total_stretch_count: number;
  last_completed_date: string | null;
  skipped_today: number;
}
