import React, { useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { addCategory } from '../../repositories/CategoryRepository';
import { addExercise } from '../../repositories/ExerciseRepository';
import { generateId } from '../../utils/id';
import { useApp } from '../../contexts/AppContext';
import { scheduleAllNotifications } from '../../services/notificationService';
import CategoryForm from '../../components/CategoryForm/CategoryForm';
import { ExerciseFormData } from '../../components/CategoryForm/types';

export default function AddCategory() {
  const router = useRouter();
  const { refreshData } = useApp();
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (data: { title: string; totalIntervalMinutes: number; validExercises: ExerciseFormData[] }) => {
    setIsSaving(true);
    try {
      const categoryId = generateId();
      await addCategory({
        id: categoryId,
        title: data.title,
        interval_minutes: data.totalIntervalMinutes,
        is_active: 1,
        sort_order: 0,
        last_completed_at: null,
        last_routine_completed_at: null,
      });

      for (let i = 0; i < data.validExercises.length; i++) {
        const ex = data.validExercises[i];
        const durationSec =
          (parseInt(ex.duration_minutes) || 0) * 60 + (parseInt(ex.duration_seconds) || 0);
        await addExercise({
          id: generateId(),
          category_id: categoryId,
          name: ex.name,
          description: ex.description,
          youtube_link: ex.youtube_link,
          duration_seconds: durationSec > 0 ? durationSec : 30, // default 30s if nothing entered
          sort_order: i,
          is_two_sided: ex.is_two_sided ? 1 : 0,
          type: ex.type,
          reps: parseInt(ex.reps) || 0,
        });
      }

      await scheduleAllNotifications();
      await refreshData();
      router.back();
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Error', 'An error occurred while saving.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <CategoryForm
      onSave={handleSave}
      buttonText="Save"
      isSaving={isSaving}
    />
  );
}
