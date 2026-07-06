import { Ionicons } from '@expo/vector-icons';
import React, { useCallback } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';
import { Colors } from '../../constants/Colors';
import { useCategoryForm } from '../../hooks/useCategoryForm';
import ExerciseFormCard from './ExerciseFormCard';
import { ExerciseFormData } from './types';

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
    handleDragEnd,
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

  const renderItem = useCallback(({ item, getIndex, drag, isActive }: RenderItemParams<ExerciseFormData>) => {
    const index = getIndex();
    if (index === undefined) return null;
    
    return (
      <ScaleDecorator>
        <ExerciseFormCard
          index={index}
          exercise={item}
          onUpdate={updateExerciseForm}
          onRemove={removeExerciseForm}
          categoryType={categoryType}
          drag={drag}
          isActive={isActive}
        />
      </ScaleDecorator>
    );
  }, [updateExerciseForm, removeExerciseForm, categoryType]);

  const listHeader = (
    <View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Category Info</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Title</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder={categoryType === 'workout' ? 'e.g. Leg Day' : 'e.g. Scapular Winging'}
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

      <View style={styles.exerciseHeader}>
        <Text style={styles.sectionTitle}>Exercises</Text>
        <TouchableOpacity style={styles.addExerciseBtn} onPress={addExerciseForm}>
          <Ionicons name="add-circle" size={24} color={Colors.accent} />
          <Text style={styles.addExerciseText}>Add</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const listFooter = (
    <View style={{ paddingBottom: 100 }}>
      {exercises.length === 0 && (
        <View style={styles.emptyExercises}>
          <Text style={styles.emptyText}>No exercises added yet</Text>
        </View>
      )}

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
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <DraggableFlatList
        data={exercises}
        onDragEnd={({ data }) => handleDragEnd(data)}
        keyExtractor={(item) => item.id!}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        ListFooterComponent={listFooter}
        containerStyle={styles.listContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        dragItemOverflow={true}
      />

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
  listContainer: {
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
