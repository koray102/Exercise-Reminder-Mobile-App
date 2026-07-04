import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { ExerciseFormData } from './types';

interface Props {
  exercise: ExerciseFormData;
  index: number;
  onUpdate: (index: number, field: keyof ExerciseFormData, value: string | boolean) => void;
  onRemove: (index: number) => void;
}

export default function ExerciseFormCard({ exercise, index, onUpdate, onRemove }: Props) {
  return (
    <View style={styles.exerciseCard}>
      <View style={styles.exerciseCardHeader}>
        <Text style={styles.exerciseCardTitle}>Exercise {index + 1}</Text>
        <TouchableOpacity onPress={() => onRemove(index)}>
          <Ionicons name="close-circle" size={22} color={Colors.error} />
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.input}
        value={exercise.name}
        onChangeText={v => onUpdate(index, 'name', v)}
        placeholder="Exercise name"
        placeholderTextColor={Colors.textMuted}
      />

      <TextInput
        style={[styles.input, styles.multilineInput]}
        value={exercise.description}
        onChangeText={v => onUpdate(index, 'description', v)}
        placeholder="Description (optional)"
        placeholderTextColor={Colors.textMuted}
        multiline
        numberOfLines={2}
      />

      <TextInput
        style={styles.input}
        value={exercise.youtube_link}
        onChangeText={v => onUpdate(index, 'youtube_link', v)}
        placeholder="YouTube link (optional)"
        placeholderTextColor={Colors.textMuted}
        autoCapitalize="none"
        keyboardType="url"
      />

      <View style={styles.typeToggleContainer}>
        <TouchableOpacity
          style={[styles.typeOption, exercise.type === 'time' && styles.typeOptionActive]}
          onPress={() => onUpdate(index, 'type', 'time')}
        >
          <Text style={[styles.typeOptionText, exercise.type === 'time' && styles.typeOptionTextActive]}>Time</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.typeOption, exercise.type === 'reps' && styles.typeOptionActive]}
          onPress={() => onUpdate(index, 'type', 'reps')}
        >
          <Text style={[styles.typeOptionText, exercise.type === 'reps' && styles.typeOptionTextActive]}>Reps</Text>
        </TouchableOpacity>
      </View>

      {exercise.type === 'time' ? (
        <View style={styles.durationRow}>
          <View style={styles.durationInput}>
            <Text style={styles.durationLabel}>Minutes</Text>
            <TextInput
              style={styles.input}
              value={exercise.duration_minutes}
              onChangeText={v => onUpdate(index, 'duration_minutes', v)}
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
              onChangeText={v => onUpdate(index, 'duration_seconds', v)}
              keyboardType="number-pad"
              placeholder="30"
              placeholderTextColor={Colors.textMuted}
            />
          </View>
        </View>
      ) : (
        <View style={styles.durationRow}>
          <View style={styles.durationInput}>
            <Text style={styles.durationLabel}>Rep Count</Text>
            <TextInput
              style={styles.input}
              value={exercise.reps}
              onChangeText={v => onUpdate(index, 'reps', v.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              placeholder="15"
              placeholderTextColor={Colors.textMuted}
            />
          </View>
        </View>
      )}

      {/* Two-Sided Toggle */}
      <View style={styles.twoSidedRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.twoSidedLabel}>Two-Sided</Text>
          <Text style={styles.twoSidedDesc}>Perform on both left and right sides</Text>
        </View>
        <Switch
          value={exercise.is_two_sided}
          onValueChange={v => onUpdate(index, 'is_two_sided', v)}
          trackColor={{ false: Colors.surfaceBorder, true: Colors.accentMuted }}
          thumbColor={exercise.is_two_sided ? Colors.accent : Colors.textMuted}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  typeToggleContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceBorder,
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  typeOption: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  typeOptionActive: {
    backgroundColor: Colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  typeOptionText: {
    fontSize: 14,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  typeOptionTextActive: {
    color: Colors.textPrimary,
  },
});
