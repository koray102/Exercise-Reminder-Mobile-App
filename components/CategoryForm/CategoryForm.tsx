import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { useCategoryForm } from '../../hooks/useCategoryForm';
import { ExerciseFormData } from './types';
import ExerciseFormCard from './ExerciseFormCard';

interface Props {
  initialTitle?: string;
  initialIntervalHours?: string;
  initialIntervalMinutes?: string;
  initialExercises?: ExerciseFormData[];
  isSaving?: boolean;
  onSave: (data: { title: string; totalIntervalMinutes: number; validExercises: ExerciseFormData[] }) => Promise<void>;
  buttonText: string;
  onDelete?: () => void;
  categoryType?: 'stretch' | 'workout';
}

export default function CategoryForm({
  initialTitle,
  initialIntervalHours,
  initialIntervalMinutes,
  initialExercises,
  isSaving: externalIsSaving = false,
  onSave,
  buttonText,
  onDelete,
  categoryType = 'stretch',
}: Props) {
  const {
    title, setTitle,
    intervalHours, setIntervalHours,
    intervalMinutes, setIntervalMinutes,
    exercises,
    isSaving, setIsSaving,
    addExerciseForm, removeExerciseForm, updateExerciseForm,
    validate
  } = useCategoryForm(initialTitle, initialIntervalHours, initialIntervalMinutes, initialExercises);

  const handleSave = async () => {
    const validData = validate();
    if (!validData) return;

    setIsSaving(true);
    try {
      await onSave({
        title: title.trim(),
        totalIntervalMinutes: validData.totalIntervalMinutes,
        validExercises: validData.validExercises
      });
    } finally {
      setIsSaving(false);
    }
  };

  const currentIsSaving = isSaving || externalIsSaving;

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

          {categoryType === 'stretch' && (
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
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.exerciseHeader}>
            <Text style={styles.sectionTitle}>Exercises</Text>
            <TouchableOpacity style={styles.addExerciseBtn} onPress={addExerciseForm}>
              <Ionicons name="add-circle" size={24} color={Colors.accent} />
              <Text style={styles.addExerciseText}>Add</Text>
            </TouchableOpacity>
          </View>

          {exercises.map((exercise, index) => (
            <ExerciseFormCard
              key={index}
              index={index}
              exercise={exercise}
              onUpdate={updateExerciseForm}
              onRemove={removeExerciseForm}
              categoryType={categoryType}
            />
          ))}

          {exercises.length === 0 && (
            <View style={styles.emptyExercises}>
              <Text style={styles.emptyText}>No exercises added yet</Text>
            </View>
          )}
        </View>

        {onDelete && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={onDelete}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={20} color={Colors.error} />
            <Text style={styles.deleteButtonText}>Delete Category</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.saveButton, currentIsSaving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={currentIsSaving}
          activeOpacity={0.8}
        >
          {currentIsSaving ? (
            <ActivityIndicator color={Colors.textInverse} size="small" />
          ) : (
            <Ionicons name="checkmark-circle" size={22} color={Colors.textInverse} />
          )}
          <Text style={styles.saveButtonText}>
            {currentIsSaving ? 'Saving...' : buttonText}
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
  emptyExercises: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.error,
    marginBottom: 16,
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.error,
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
});
