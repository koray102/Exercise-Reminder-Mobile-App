import React, { useState, useEffect } from 'react';
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/Colors';
import {
  getCategoryById,
  getExercisesByCategory,
  updateCategory,
  deleteCategory,
  deleteExercisesByCategory,
  addExercise,
  Exercise,
} from '../../../db/queries';
import { useApp } from '../../../contexts/AppContext';
import { scheduleAllNotifications } from '../../../services/notificationService';

interface ExerciseForm {
  id?: string;
  name: string;
  description: string;
  youtube_link: string;
  duration_minutes: string;
  duration_seconds: string;
}

function generateId(): string {
  return 'xxxx-xxxx-xxxx'.replace(/x/g, () =>
    Math.floor(Math.random() * 16).toString(16)
  );
}

export default function EditCategory() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { refreshData } = useApp();

  const [title, setTitle] = useState('');
  const [intervalMinutes, setIntervalMinutes] = useState('60');
  const [exercises, setExercises] = useState<ExerciseForm[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    if (!id) return;
    try {
      const category = await getCategoryById(id);
      if (!category) {
        Alert.alert('Hata', 'Kategori bulunamadı.');
        router.back();
        return;
      }

      setTitle(category.title);
      setIntervalMinutes(String(category.interval_minutes));

      const exList = await getExercisesByCategory(id);
      setExercises(
        exList.map(ex => ({
          id: ex.id,
          name: ex.name,
          description: ex.description,
          youtube_link: ex.youtube_link,
          duration_minutes: String(Math.floor(ex.duration_seconds / 60)),
          duration_seconds: String(ex.duration_seconds % 60),
        }))
      );
    } catch (error) {
      console.error('Load error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addExerciseForm = () => {
    setExercises([
      ...exercises,
      { name: '', description: '', youtube_link: '', duration_minutes: '0', duration_seconds: '30' },
    ]);
  };

  const removeExerciseForm = (index: number) => {
    setExercises(exercises.filter((_, i) => i !== index));
  };

  const updateExerciseForm = (index: number, field: keyof ExerciseForm, value: string) => {
    const updated = [...exercises];
    updated[index] = { ...updated[index], [field]: value };
    setExercises(updated);
  };

  const handleSave = async () => {
    if (!id || !title.trim()) {
      Alert.alert('Hata', 'Kategori başlığı gerekli.');
      return;
    }

    setIsSaving(true);

    try {
      await updateCategory(id, title.trim(), parseInt(intervalMinutes) || 60);

      // Delete all existing exercises and re-add
      await deleteExercisesByCategory(id);

      const validExercises = exercises.filter(e => e.name.trim());
      for (let i = 0; i < validExercises.length; i++) {
        const ex = validExercises[i];
        const durationSec =
          (parseInt(ex.duration_minutes) || 0) * 60 + (parseInt(ex.duration_seconds) || 30);
        await addExercise({
          id: ex.id || generateId(),
          category_id: id,
          name: ex.name?.trim() || '',
          description: ex.description?.trim() || '',
          youtube_link: ex.youtube_link?.trim() || '',
          duration_seconds: durationSec,
          sort_order: i,
        });
      }

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

  const handleDelete = () => {
    Alert.alert(
      'Kategoriyi Sil',
      'Bu kategori ve tüm egzersizleri kalıcı olarak silinecek. Emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
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

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }

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
              placeholder="Kategori başlığı"
              placeholderTextColor={Colors.textMuted}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Hatırlatma Aralığı (dakika)</Text>
            <TextInput
              style={styles.input}
              value={intervalMinutes}
              onChangeText={setIntervalMinutes}
              keyboardType="number-pad"
              placeholder="60"
              placeholderTextColor={Colors.textMuted}
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
                <TouchableOpacity onPress={() => removeExerciseForm(index)}>
                  <Ionicons name="close-circle" size={22} color={Colors.error} />
                </TouchableOpacity>
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

          {exercises.length === 0 && (
            <View style={styles.emptyExercises}>
              <Text style={styles.emptyText}>Henüz egzersiz eklenmemiş</Text>
            </View>
          )}
        </View>

        {/* Delete Button */}
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}
          activeOpacity={0.7}
        >
          <Ionicons name="trash-outline" size={20} color={Colors.error} />
          <Text style={styles.deleteButtonText}>Kategoriyi Sil</Text>
        </TouchableOpacity>

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
            {isSaving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
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
