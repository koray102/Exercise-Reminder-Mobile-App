import { useState } from 'react';
import { Alert } from 'react-native';
import { ExerciseFormData, emptyExercise } from '../components/CategoryForm/types';

export function useCategoryForm(
  initialTitle = '',
  initialIntervalH = '1',
  initialIntervalM = '0',
  initialExercises: ExerciseFormData[] = [{ ...emptyExercise }]
) {
  const [title, setTitle] = useState(initialTitle);
  const [intervalHours, setIntervalHours] = useState(initialIntervalH);
  const [intervalMinutes, setIntervalMinutes] = useState(initialIntervalM);
  const [exercises, setExercises] = useState<ExerciseFormData[]>(initialExercises);
  const [isSaving, setIsSaving] = useState(false);

  const addExerciseForm = () => {
    setExercises([...exercises, { ...emptyExercise }]);
  };

  const removeExerciseForm = (index: number) => {
    setExercises(exercises.filter((_, i) => i !== index));
  };

  const updateExerciseForm = (index: number, field: keyof ExerciseFormData, value: string | boolean) => {
    const updated = [...exercises];
    updated[index] = { ...updated[index], [field]: value };
    setExercises(updated);
  };

  const validate = () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Category title is required.');
      return null;
    }

    const totalIntervalMinutes = (parseInt(intervalHours) || 0) * 60 + (parseInt(intervalMinutes) || 0);
    if (totalIntervalMinutes <= 0) {
      Alert.alert('Error', 'Reminder interval must be at least 1 minute.');
      return null;
    }

    const validExercises = exercises.filter(e => e.name.trim());
    
    return { totalIntervalMinutes, validExercises };
  };

  return {
    title, setTitle,
    intervalHours, setIntervalHours,
    intervalMinutes, setIntervalMinutes,
    exercises, setExercises,
    isSaving, setIsSaving,
    addExerciseForm, removeExerciseForm, updateExerciseForm,
    validate
  };
}
