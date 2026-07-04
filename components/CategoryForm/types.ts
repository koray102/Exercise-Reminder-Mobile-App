export interface ExerciseFormData {
  id?: string;
  name: string;
  description: string;
  youtube_link: string;
  duration_minutes: string;
  duration_seconds: string;
  is_two_sided: boolean;
  type: 'time' | 'reps';
  reps: string;
}

export const emptyExercise: ExerciseFormData = {
  name: '',
  description: '',
  youtube_link: '',
  duration_minutes: '0',
  duration_seconds: '30',
  is_two_sided: false,
  type: 'time',
  reps: '15',
};
