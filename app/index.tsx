import React, { useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { useApp } from '../contexts/AppContext';
import { Category, Exercise } from '../types';
import StreakDisplay from '../components/StreakDisplay';
import CategoryAccordion from '../components/CategoryAccordion';
import FAB from '../components/FAB';
import { useDashboard } from '../hooks/useDashboard';

export default function Dashboard() {
  const router = useRouter();
  const { state: { streaks, isLoading, exercisesByCategory } } = useApp();
  
  const {
    editMode,
    orderedCategories,
    setOrderedCategories,
    enterEditMode,
    saveEditMode,
    cancelEditMode,
    handleDeleteCategory,
    handleToggleActive,
    displayCategories,
    hasCategories,
    isTodayCompleted,
    activeTab,
    setActiveTab,
  } = useDashboard();

  // Overlay animation
  const overlayOpacity = useSharedValue(0);

  // Animate overlay when edit mode changes
  useEffect(() => {
    overlayOpacity.value = withTiming(editMode ? 1 : 0, {
      duration: 300,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
    });
  }, [editMode, overlayOpacity]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const EMPTY_EXERCISES: Exercise[] = [];

  const handleStartExercise = useCallback((categoryId: string) => {
    router.push(`/exercise/${categoryId}`);
  }, [router]);

  const handleEditCategory = useCallback((categoryId: string) => {
    router.push(`/category/${categoryId}/edit`);
  }, [router]);

  const renderItem = useCallback(({ item, drag, isActive }: RenderItemParams<Category>) => (
    <ScaleDecorator>
      <CategoryAccordion
        category={item}
        exercises={exercisesByCategory[item.id] || EMPTY_EXERCISES}
        onStartExercise={handleStartExercise}
        onEditCategory={handleEditCategory}
        editMode={editMode}
        onLongPressActivate={enterEditMode}
        onDrag={drag}
        isDragging={isActive}
        onDelete={handleDeleteCategory}
        onToggleActive={handleToggleActive}
      />
    </ScaleDecorator>
  ), [
    editMode, 
    exercisesByCategory, 
    handleStartExercise, 
    handleEditCategory, 
    enterEditMode, 
    handleDeleteCategory, 
    handleToggleActive
  ]);

  if (isLoading && !streaks) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.accent} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const listHeaderNode = (
    <View style={{ paddingBottom: 8 }}>
      {!editMode && (
        <StreakDisplay
          currentStreak={streaks?.current_day_streak ?? 0}
          totalCount={streaks?.total_stretch_count ?? 0}
          isTodayCompleted={isTodayCompleted}
          isWorkoutMode={activeTab === 'workout'}
        />
      )}

      <View style={styles.sectionHeader}>
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'stretch' && styles.tabButtonActive]}
            onPress={() => setActiveTab('stretch')}
          >
            <Text style={[styles.tabText, activeTab === 'stretch' && styles.tabTextActive]}>Stretching</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'workout' && styles.tabButtonActive]}
            onPress={() => setActiveTab('workout')}
          >
            <Text style={[styles.tabText, activeTab === 'workout' && styles.tabTextActive]}>Workout</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>
          {editMode ? 'Edit Mode' : ''}
        </Text>
        {editMode ? (
          <TouchableOpacity onPress={saveEditMode} style={styles.doneButton}>
            <Ionicons name="checkmark-circle" size={20} color={Colors.accent} />
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => router.push('/settings')}
            style={styles.settingsButton}
          >
            <Ionicons name="settings-outline" size={22} color={Colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {!hasCategories && !editMode && (
        <View style={styles.emptyState}>
          <Ionicons name="fitness-outline" size={64} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>No categories yet</Text>
          <Text style={styles.emptySubtitle}>
            Tap the + button in the bottom right{'\n'}to add your first exercise category!
          </Text>
        </View>
      )}
    </View>
  );

  const listFooterNode = (
    <View style={{ height: editMode ? 80 : 100 }} />
  );

  return (
    <View style={styles.container}>
      {/* Dark overlay — visual only, no touch interaction */}
      <Animated.View
        style={[styles.overlay, overlayStyle]}
        pointerEvents="none"
      />

      {/* Category list */}
      <DraggableFlatList
        data={displayCategories}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        onDragEnd={({ data }) => setOrderedCategories(data)}
        ListHeaderComponent={listHeaderNode}
        ListFooterComponent={listFooterNode}
        containerStyle={styles.listContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        dragItemOverflow={true}
      />

      {/* FAB — hide in edit mode */}
      {!editMode && <FAB onPress={() => router.push(`/category/add?type=${activeTab}`)} />}

      {/* Cancel edit mode button */}
      {editMode && (
        <TouchableOpacity style={styles.cancelEditButton} onPress={cancelEditMode} activeOpacity={0.8}>
          <Ionicons name="close-circle" size={18} color="#FFFFFF" />
          <Text style={styles.cancelEditText}>Exit Edit Mode</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    zIndex: 1,
  },
  listContainer: {
    flex: 1,
    zIndex: 2,
  },
  scrollContent: {
    paddingTop: 8,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 4,
    flex: 1,
    marginRight: 12,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: Colors.accent,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: '#000000',
  },
  settingsButton: {
    padding: 4,
  },
  doneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.accentMuted,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  doneButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.accent,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  cancelEditButton: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.error,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    shadowColor: Colors.error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 100,
  },
  cancelEditText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
