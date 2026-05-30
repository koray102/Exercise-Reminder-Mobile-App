import React, { useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { useApp } from '../contexts/AppContext';
import { Category, deleteCategory, updateCategoryOrder } from '../db/queries';
import { checkAllGracePeriods, isDateStringToday } from '../services/streakService';
import { scheduleAllNotifications } from '../services/notificationService';
import StreakDisplay from '../components/StreakDisplay';
import CategoryAccordion from '../components/CategoryAccordion';
import FAB from '../components/FAB';


export default function Dashboard() {
  const router = useRouter();
  const { state, refreshData, refreshStreaks } = useApp();
  const { categories, exercisesByCategory, streaks, isLoading } = state;

  const [editMode, setEditMode] = useState(false);
  const [orderedCategories, setOrderedCategories] = useState<Category[]>(categories);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingDeletions, setPendingDeletions] = useState<string[]>([]);

  // Overlay animation
  const overlayOpacity = useSharedValue(0);

  // Sync ordered categories when not in edit mode
  useEffect(() => {
    if (!editMode) {
      setOrderedCategories(categories);
    }
  }, [categories, editMode]);

  // Animate overlay when edit mode changes
  useEffect(() => {
    overlayOpacity.value = withTiming(editMode ? 1 : 0, {
      duration: 300,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
    });
  }, [editMode]);

  // Refresh data and check grace periods when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const checkGrace = async () => {
        const anyExpired = await checkAllGracePeriods();
        if (anyExpired) {
          await refreshStreaks();
          await scheduleAllNotifications();
        }
        await refreshData();
      };
      checkGrace();
      setEditMode(false);
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  };

  const enterEditMode = () => {
    setOrderedCategories([...categories]);
    setPendingDeletions([]);
    setEditMode(true);
  };

  const saveEditMode = async () => {
    // Perform pending deletions
    for (const id of pendingDeletions) {
      await deleteCategory(id);
    }
    // Save the new order
    const orderedIds = orderedCategories.map(c => c.id);
    await updateCategoryOrder(orderedIds);
    setPendingDeletions([]);
    setEditMode(false);
    await refreshData();
  };

  const cancelEditMode = () => {
    const orderChanged = orderedCategories.length !== categories.length ||
      orderedCategories.some((c, i) => c.id !== categories[i]?.id);
    const hasChanges = pendingDeletions.length > 0 || orderChanged;

    if (hasChanges) {
      Alert.alert(
        'Discard Changes',
        'Are you sure you want to discard your changes?',
        [
          { text: 'No', style: 'cancel' },
          {
            text: 'Yes',
            style: 'destructive',
            onPress: () => {
              setOrderedCategories([...categories]);
              setPendingDeletions([]);
              setEditMode(false);
            },
          },
        ]
      );
    } else {
      setEditMode(false);
    }
  };

  const handleDeleteCategory = (categoryId: string, categoryTitle: string) => {
    Alert.alert(
      'Delete Category',
      `Are you sure you want to delete "${categoryTitle}" and all its exercises?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // Defer deletion — only remove from local state
            setOrderedCategories(prev => prev.filter(c => c.id !== categoryId));
            setPendingDeletions(prev => [...prev, categoryId]);
          },
        },
      ]
    );
  };

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  if (isLoading && !streaks) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.accent} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const displayCategories = editMode ? orderedCategories : categories;
  const hasCategories = displayCategories.length > 0;

  // Calculate if daily streak condition is met (all active categories completed today)
  const activeCategories = categories.filter(c => c.is_active);
  const isTodayCompleted = activeCategories.length > 0 && activeCategories.every(c => {
    return isDateStringToday(c.last_completed_at);
  });

  const renderItem = ({ item, drag, isActive }: RenderItemParams<Category>) => (
    <ScaleDecorator>
      <CategoryAccordion
        category={item}
        exercises={exercisesByCategory[item.id] || []}
        onStartExercise={(categoryId) => router.push(`/exercise/${categoryId}`)}
        onEditCategory={(categoryId) => router.push(`/category/${categoryId}/edit`)}
        editMode={editMode}
        onLongPressActivate={enterEditMode}
        onDrag={drag}
        isDragging={isActive}
        onDelete={() => handleDeleteCategory(item.id, item.title)}
      />
    </ScaleDecorator>
  );

  const ListHeader = () => (
    <>
      {!editMode && (
        <StreakDisplay
          currentStreak={streaks?.current_day_streak ?? 0}
          totalCount={streaks?.total_stretch_count ?? 0}
          isTodayCompleted={isTodayCompleted}
        />
      )}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {editMode ? 'Edit Mode' : 'Categories'}
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
    </>
  );

  const ListFooter = () => (
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
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        containerStyle={styles.listContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        dragItemOverflow={true}
      />

      {/* FAB — hide in edit mode */}
      {!editMode && <FAB onPress={() => router.push('/category/add')} />}

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
