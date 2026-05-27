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
}

const emptyExercise: ExerciseForm = {
  name: '',
  description: '',
  youtube_link: '',
  duration_minutes: '0',
  duration_seconds: '30',
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
  const [intervalMinutes, setIntervalMinutes] = useState('60');
  const [exercises, setExercises] = useState<ExerciseForm[]>([{ ...emptyExercise }]);
  const [isSaving, setIsSaving] = useState(false);

  const addExerciseForm = () => {
    setExercises([...exercises, { ...emptyExercise }]);
  };

  const removeExerciseForm = (index: number) => {
    if (exercises.length <= 1) return;
    setExercises(exercises.filter((_, i) => i !== index));
  };

  const updateExerciseForm = (index: number, field: keyof ExerciseForm, value: string) => {
    const updated = [...exercises];
    updated[index] = { ...updated[index], [field]: value };
    setExercises(updated);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Hata', 'Kategori başlığı gerekli.');
      return;
    }

    const validExercises = exercises.filter(e => e.name.trim());
    if (validExercises.length === 0) {
      Alert.alert('Hata', 'En az bir egzersiz ekleyin.');
      return;
    }

    setIsSaving(true);

    try {
      const categoryId = generateId();
      await addCategory({
        id: categoryId,
        title: title.trim(),
        interval_minutes: parseInt(intervalMinutes) || 60,
        is_active: 1,
      });

      for (let i = 0; i < validExercises.length; i++) {
        const ex = validExercises[i];
        const durationSec =
          (parseInt(ex.duration_minutes) || 0) * 60 + (parseInt(ex.duration_seconds) || 30);
        await addExercise({
          id: generateId(),
          category_id: categoryId,
          name: ex.name?.trim() || '',
          description: ex.description?.trim() || '',
          youtube_link: ex.youtube_link?.trim() || '',
          duration_seconds: durationSec,
          sort_order: i,
        });
      }

      // Reschedule notifications
      await scheduleAllNotifications();
      await refreshData();
      router.back();
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Hata', 'Kaydetme sırasında bir hata oluştu.');
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
          <Text style={styles.sectionTitle}>Kategori Bilgileri</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Başlık</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="ör. Scapular Winging"
              placeholderTextColor={Colors.textMuted}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Hatırlatma Aralığı (dakika)</Text>
            <TextInput
              style={styles.input}
              value={intervalMinutes}
              onChangeText={setIntervalMinutes}
              placeholder="60"
              placeholderTextColor={Colors.textMuted}
              keyboardType="number-pad"
            />
          </View>
        </View>

        {/* Exercises */}
        <View style={styles.section}>
          <View style={styles.exerciseHeader}>
            <Text style={styles.sectionTitle}>Egzersizler</Text>
            <TouchableOpacity style={styles.addExerciseBtn} onPress={addExerciseForm}>
              <Ionicons name="add-circle" size={24} color={Colors.accent} />
              <Text style={styles.addExerciseText}>Ekle</Text>
            </TouchableOpacity>
          </View>

          {exercises.map((exercise, index) => (
            <View key={index} style={styles.exerciseCard}>
              <View style={styles.exerciseCardHeader}>
                <Text style={styles.exerciseCardTitle}>Egzersiz {index + 1}</Text>
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
                placeholder="Egzersiz adı"
                placeholderTextColor={Colors.textMuted}
              />

              <TextInput
                style={[styles.input, styles.multilineInput]}
                value={exercise.description}
                onChangeText={v => updateExerciseForm(index, 'description', v)}
                placeholder="Açıklama (isteğe bağlı)"
                placeholderTextColor={Colors.textMuted}
                multiline
                numberOfLines={2}
              />

              <TextInput
                style={styles.input}
                value={exercise.youtube_link}
                onChangeText={v => updateExerciseForm(index, 'youtube_link', v)}
                placeholder="YouTube linki (isteğe bağlı)"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="none"
                keyboardType="url"
              />

              <View style={styles.durationRow}>
                <View style={styles.durationInput}>
                  <Text style={styles.durationLabel}>Dakika</Text>
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
                  <Text style={styles.durationLabel}>Saniye</Text>
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
            {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
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
});
