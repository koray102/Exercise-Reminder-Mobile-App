import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { addCategory, addExercise } from '../../db/queries';
import { useApp } from '../../contexts/AppContext';
import { scheduleAllNotifications } from '../../services/notificationService';

interface ExerciseForm {
  name: string;
  description: string;
  youtube_link: string;
  duration_minutes: string;
  duration_seconds: string;
  is_two_sided: boolean;
}

const emptyExercise: ExerciseForm = {
  name: '',
  description: '',
  youtube_link: '',
  duration_minutes: '0',
  duration_seconds: '30',
  is_two_sided: false,
};

function generateId(): string {
  return 'xxxx-xxxx-xxxx'.replace(/x/g, () =>
    Math.floor(Math.random() * 16).toString(16)
  );
}

export default function AddCategory() {
  const router = useRouter();
  const { refreshData } = useApp();

  const [title, setTitle] = useState('');
  const [intervalHours, setIntervalHours] = useState('1');
  const [intervalMinutes, setIntervalMinutes] = useState('0');
  const [exercises, setExercises] = useState<ExerciseForm[]>([{ ...emptyExercise }]);
  const [isSaving, setIsSaving] = useState(false);

  const addExerciseForm = () => {
    setExercises([...exercises, { ...emptyExercise }]);
  };

  const removeExerciseForm = (index: number) => {
    if (exercises.length <= 1) return;
    setExercises(exercises.filter((_, i) => i !== index));
  };

  const updateExerciseForm = (index: number, field: keyof ExerciseForm, value: string | boolean) => {
    const updated = [...exercises];
    updated[index] = { ...updated[index], [field]: value };
    setExercises(updated);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Category title is required.');
      return;
    }

    const validExercises = exercises.filter(e => e.name.trim());
    if (validExercises.length === 0) {
      Alert.alert('Error', 'Add at least one exercise.');
      return;
    }

    // Calculate total interval in minutes
    const totalIntervalMinutes = (parseInt(intervalHours) || 0) * 60 + (parseInt(intervalMinutes) || 0);
    if (totalIntervalMinutes <= 0) {
      Alert.alert('Error', 'Reminder interval must be at least 1 minute.');
      return;
    }

    setIsSaving(true);

    try {
      const categoryId = generateId();
      await addCategory({
        id: categoryId,
        title: title.trim(),
        interval_minutes: totalIntervalMinutes,
        is_active: 1,
        sort_order: 0,
        last_completed_at: null,
      });

      for (let i = 0; i < validExercises.length; i++) {
        const ex = validExercises[i];
        const durationSec =
          (parseInt(ex.duration_minutes) || 0) * 60 + (parseInt(ex.duration_seconds) || 0);
        await addExercise({
          id: generateId(),
          category_id: categoryId,
          name: ex.name?.trim() || '',
          description: ex.description?.trim() || '',
          youtube_link: ex.youtube_link?.trim() || '',
          duration_seconds: durationSec > 0 ? durationSec : 30, // default 30s if nothing entered
          sort_order: i,
          is_two_sided: ex.is_two_sided ? 1 : 0,
        });
      }

      // Reschedule notifications
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Category Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Category Info</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Title</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Scapular Winging"
              placeholderTextColor={Colors.textMuted}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Reminder Interval</Text>
            <View style={styles.durationRow}>
              <View style={styles.durationInput}>
                <Text style={styles.durationLabel}>Hours</Text>
                <TextInput
                  style={styles.input}
                  value={intervalHours}
                  onChangeText={setIntervalHours}
                  placeholder="1"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="number-pad"
                />
              </View>
              <View style={styles.durationInput}>
                <Text style={styles.durationLabel}>Minutes</Text>
                <TextInput
                  style={styles.input}
                  value={intervalMinutes}
                  onChangeText={setIntervalMinutes}
                  placeholder="0"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="number-pad"
                />
              </View>
            </View>
          </View>
        </View>

        {/* Exercises */}
        <View style={styles.section}>
          <View style={styles.exerciseHeader}>
            <Text style={styles.sectionTitle}>Exercises</Text>
            <TouchableOpacity style={styles.addExerciseBtn} onPress={addExerciseForm}>
              <Ionicons name="add-circle" size={24} color={Colors.accent} />
              <Text style={styles.addExerciseText}>Add</Text>
            </TouchableOpacity>
          </View>

          {exercises.map((exercise, index) => (
            <View key={index} style={styles.exerciseCard}>
              <View style={styles.exerciseCardHeader}>
                <Text style={styles.exerciseCardTitle}>Exercise {index + 1}</Text>
                {exercises.length > 1 && (
                  <TouchableOpacity onPress={() => removeExerciseForm(index)}>
                    <Ionicons name="close-circle" size={22} color={Colors.error} />
                  </TouchableOpacity>
                )}
              </View>

              <TextInput
                style={styles.input}
                value={exercise.name}
                onChangeText={v => updateExerciseForm(index, 'name', v)}
                placeholder="Exercise name"
                placeholderTextColor={Colors.textMuted}
              />

              <TextInput
                style={[styles.input, styles.multilineInput]}
                value={exercise.description}
                onChangeText={v => updateExerciseForm(index, 'description', v)}
                placeholder="Description (optional)"
                placeholderTextColor={Colors.textMuted}
                multiline
                numberOfLines={2}
              />

              <TextInput
                style={styles.input}
                value={exercise.youtube_link}
                onChangeText={v => updateExerciseForm(index, 'youtube_link', v)}
                placeholder="YouTube link (optional)"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="none"
                keyboardType="url"
              />

              <View style={styles.durationRow}>
                <View style={styles.durationInput}>
                  <Text style={styles.durationLabel}>Minutes</Text>
                  <TextInput
                    style={styles.input}
                    value={exercise.duration_minutes}
                    onChangeText={v => updateExerciseForm(index, 'duration_minutes', v)}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
                <View style={styles.durationInput}>
                  <Text style={styles.durationLabel}>Seconds</Text>
                  <TextInput
                    style={styles.input}
                    value={exercise.duration_seconds}
                    onChangeText={v => updateExerciseForm(index, 'duration_seconds', v)}
                    keyboardType="number-pad"
                    placeholder="30"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
              </View>

              {/* Two-Sided Toggle */}
              <View style={styles.twoSidedRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.twoSidedLabel}>Two-Sided</Text>
                  <Text style={styles.twoSidedDesc}>Perform on both left and right sides</Text>
                </View>
                <Switch
                  value={exercise.is_two_sided}
                  onValueChange={v => updateExerciseForm(index, 'is_two_sided', v)}
                  trackColor={{ false: Colors.surfaceBorder, true: Colors.accentMuted }}
                  thumbColor={exercise.is_two_sided ? Colors.accent : Colors.textMuted}
                />
              </View>
            </View>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Save Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isSaving}
          activeOpacity={0.8}
        >
          <Ionicons name="checkmark-circle" size={22} color={Colors.textInverse} />
          <Text style={styles.saveButtonText}>
            {isSaving ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginBottom: 8,
  },
  multilineInput: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addExerciseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addExerciseText: {
    fontSize: 14,
    color: Colors.accent,
    fontWeight: '600',
  },
  exerciseCard: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  exerciseCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  exerciseCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.accent,
  },
  durationRow: {
    flexDirection: 'row',
    gap: 12,
  },
  durationInput: {
    flex: 1,
  },
  durationLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
    marginBottom: 4,
  },
  bottomBar: {
    padding: 16,
    paddingBottom: 32,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.accent,
    paddingVertical: 16,
    borderRadius: 14,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textInverse,
  },
  twoSidedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
  },
  twoSidedLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  twoSidedDesc: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
});
