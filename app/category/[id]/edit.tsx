import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import {
  getCategoryById,
  updateCategory,
  deleteCategory,
} from '../../../repositories/CategoryRepository';
import {
  getExercisesByCategory,
  deleteExercisesByCategory,
  addExercise,
} from '../../../repositories/ExerciseRepository';
import { generateId } from '../../../utils/id';
import { useApp } from '../../../contexts/AppContext';
import { scheduleAllNotifications } from '../../../services/notificationService';
import CategoryForm from '../../../components/CategoryForm/CategoryForm';
import { ExerciseFormData } from '../../../components/CategoryForm/types';
import { Colors } from '../../../constants/Colors';

export default function EditCategory() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { refreshData } = useApp();
  const [initialData, setInitialData] = useState<{
    title: string;
    intervalHours: string;
    intervalMinutes: string;
    exercises: ExerciseFormData[];
    type: 'stretch' | 'workout';
  } | null>(null);
  
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    if (!id) return;
    try {
      const category = await getCategoryById(id);
      if (!category) {
        Alert.alert('Error', 'Category not found.');
        router.back();
        return;
      }

      const hours = Math.floor(category.interval_minutes / 60);
      const mins = category.interval_minutes % 60;

      const exList = await getExercisesByCategory(id);
      setInitialData({
        title: category.title,
        intervalHours: String(hours),
        intervalMinutes: String(mins),
        exercises: exList.map(ex => ({
          id: ex.id,
          name: ex.name,
          description: ex.description,
          youtube_link: ex.youtube_link,
          duration_minutes: String(Math.floor(ex.duration_seconds / 60)),
          duration_seconds: String(ex.duration_seconds % 60),
          is_two_sided: !!ex.is_two_sided,
          type: ex.type || 'time',
          reps: String(ex.reps || 15),
          weight: ex.weight || '',
        })),
        type: category.type as 'stretch' | 'workout' || 'stretch',
      });
    } catch (error) {
      console.error('Load error:', error);
    }
  };

  const handleSave = async (data: { title: string; totalIntervalMinutes: number; validExercises: ExerciseFormData[] }) => {
    if (!id) return;
    setIsSaving(true);
    try {
      await updateCategory(id, data.title, data.totalIntervalMinutes, initialData?.type);

      await deleteExercisesByCategory(id);

      for (let i = 0; i < data.validExercises.length; i++) {
        const ex = data.validExercises[i];
        const durationSec =
          (parseInt(ex.duration_minutes) || 0) * 60 + (parseInt(ex.duration_seconds) || 0);
        await addExercise({
          id: ex.id || generateId(),
          category_id: id,
          name: ex.name,
          description: ex.description,
          youtube_link: ex.youtube_link,
          duration_seconds: durationSec > 0 ? durationSec : 30, // default 30s if nothing entered
          sort_order: i,
          is_two_sided: ex.is_two_sided ? 1 : 0,
          type: ex.type,
          reps: parseInt(ex.reps) || 0,
          weight: ex.weight || '',
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

  const handleDelete = () => {
    Alert.alert(
      'Delete Category',
      'This category and all exercises will be permanently deleted. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!id) return;
            await deleteCategory(id);
            await scheduleAllNotifications();
            await refreshData();
            router.back();
          },
        },
      ]
    );
  };

  if (!initialData) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const pageTitle = initialData.type === 'workout' ? 'Edit Workout' : 'Edit Stretching';

  return (
    <>
      <Stack.Screen options={{ title: pageTitle }} />
      <CategoryForm
      initialTitle={initialData.title}
      initialIntervalHours={initialData.intervalHours}
      initialIntervalMinutes={initialData.intervalMinutes}
      initialExercises={initialData.exercises}
      onSave={handleSave}
      isSaving={isSaving}
      buttonText="Save Changes"
      onDelete={handleDelete}
      categoryType={initialData.type}
    />
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
});
