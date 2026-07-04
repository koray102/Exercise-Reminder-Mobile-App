import { useState, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Category } from '../types';
import { deleteCategory, updateCategoryOrder, toggleCategoryActive, updateCategoryLastCompleted } from '../repositories/CategoryRepository';
import { checkAllGracePeriods, evaluateDailyStreak } from '../services/streakService';
import { isDateStringToday } from '../utils/date';
import { scheduleAllNotifications } from '../services/notificationService';
import { useApp } from '../contexts/AppContext';

export function useDashboard() {
  const { state: { categories }, refreshData, refreshStreaks } = useApp();
  const [editMode, setEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'stretch' | 'workout'>('stretch');
  const [orderedCategories, setOrderedCategories] = useState<Category[]>(categories);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingDeletions, setPendingDeletions] = useState<string[]>([]);

  useEffect(() => {
    if (!editMode) {
      setOrderedCategories(categories);
    }
  }, [categories, editMode]);

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
    }, [refreshStreaks, refreshData])
  );

  useEffect(() => {
    const interval = setInterval(async () => {
      const anyExpired = await checkAllGracePeriods();
      if (anyExpired) {
        await refreshStreaks();
        await scheduleAllNotifications();
        await refreshData();
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [refreshStreaks, refreshData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  };

  const enterEditMode = useCallback(() => {
    setOrderedCategories([...categories]);
    setPendingDeletions([]);
    setEditMode(true);
  }, [categories]);

  const saveEditMode = async () => {
    for (const id of pendingDeletions) {
      await deleteCategory(id);
    }
    const orderedIds = orderedCategories.map(c => c.id);
    await updateCategoryOrder(orderedIds);
    setPendingDeletions([]);
    setEditMode(false);
    
    if (pendingDeletions.length > 0) {
      await evaluateDailyStreak();
    }
    
    await refreshData();
    await scheduleAllNotifications();
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

  const handleDeleteCategory = useCallback((categoryId: string, categoryTitle: string) => {
    Alert.alert(
      'Delete Category',
      `Are you sure you want to delete "${categoryTitle}" and all its exercises?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setOrderedCategories(prev => prev.filter(c => c.id !== categoryId));
            setPendingDeletions(prev => [...prev, categoryId]);
          },
        },
      ]
    );
  }, []);

  const handleToggleActive = useCallback((categoryId: string, categoryTitle: string, currentStatus: number) => {
    const isCurrentlyActive = currentStatus === 1;
    const newStatusLabel = isCurrentlyActive ? 'Rest' : 'Active';
    
    Alert.alert(
      `${newStatusLabel} Mode`,
      `Are you sure you want to change "${categoryTitle}" to ${newStatusLabel} mode?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: 'default',
          onPress: async () => {
            try {
              await toggleCategoryActive(categoryId, !isCurrentlyActive);
              if (!isCurrentlyActive) {
                await updateCategoryLastCompleted(categoryId, new Date().toISOString());
              } else {
                await evaluateDailyStreak();
              }
              await refreshData();
              await scheduleAllNotifications();
            } catch (error) {
              console.error('Failed to toggle category state:', error);
            }
          },
        },
      ]
    );
  }, [refreshData]);

  const filteredCategories = categories.filter(c => (c.type || 'stretch') === activeTab);

  const displayCategories = editMode 
    ? orderedCategories.filter(c => (c.type || 'stretch') === activeTab)
    : [...filteredCategories].sort((a, b) => {
        if (a.is_active === b.is_active) return (a.sort_order ?? 0) - (b.sort_order ?? 0);
        return a.is_active ? -1 : 1;
      });

  const hasCategories = displayCategories.length > 0;

  const activeCategories = categories.filter(c => c.is_active && (c.type || 'stretch') === 'stretch');
  const isTodayCompleted = activeCategories.length > 0 && activeCategories.every(c => {
    return isDateStringToday(c.last_routine_completed_at);
  });

  return {
    editMode, setEditMode,
    activeTab, setActiveTab,
    orderedCategories, setOrderedCategories,
    refreshing, onRefresh,
    enterEditMode, saveEditMode, cancelEditMode,
    handleDeleteCategory, handleToggleActive,
    displayCategories, hasCategories, isTodayCompleted
  };
}
