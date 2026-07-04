import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, SharedValue } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { Category, Exercise } from '../../types';
import CountdownBadge from './CountdownBadge';

interface Props {
  category: Category;
  exercises: Exercise[];
  editMode: boolean;
  isCompletedToday: boolean;
  remainingMinutes: number | null;
  countdownMode: 'idle' | 'grace';
  rotation: SharedValue<number>;
  onEditCategory: (categoryId: string) => void;
  onToggleActive?: (id: string, title: string, status: number) => void;
  onDrag?: () => void;
  toggleExpand: () => void;
  handlePressIn: (e: any) => void;
  handlePressOut: () => void;
}

export default function CategoryHeader({
  category,
  exercises,
  editMode,
  isCompletedToday,
  remainingMinutes,
  countdownMode,
  rotation,
  onEditCategory,
  onToggleActive,
  onDrag,
  toggleExpand,
  handlePressIn,
  handlePressOut,
}: Props) {
  const arrowStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(rotation.value, [0, 1], [0, 180])}deg` }],
  }));

  const totalDuration = exercises.reduce((sum, e) => sum + e.duration_seconds, 0);

  const formatDuration = (seconds: number) => {
    if (seconds >= 60) {
      const min = Math.floor(seconds / 60);
      const sec = seconds % 60;
      return sec > 0 ? `${min}m ${sec}s` : `${min}m`;
    }
    return `${seconds}s`;
  };

  return (
    <Pressable
      style={styles.header}
      onPress={editMode ? undefined : toggleExpand}
      onPressIn={editMode ? onDrag : handlePressIn}
      onPressOut={editMode ? undefined : handlePressOut}
    >
      {editMode && (
        <View style={styles.dragHandle}>
          <Ionicons name="reorder-three" size={24} color={Colors.textSecondary} />
        </View>
      )}

      <View style={[styles.headerLeft, editMode && { marginLeft: 4 }]}>
        {!editMode && category.type !== 'workout' && (
          <TouchableOpacity 
            style={[styles.activeToggle, { backgroundColor: category.is_active ? Colors.accent : '#FF4757' }]} 
            onPress={() => onToggleActive?.(category.id, category.title, category.is_active)}
            activeOpacity={0.8}
          >
            <Text style={styles.activeToggleText}>
              {category.is_active ? 'Active' : 'Rest'}
            </Text>
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }}>
          <View style={styles.titleRow}>
            <Text 
              style={[
                styles.categoryTitle, 
                { color: isCompletedToday ? Colors.success : Colors.textPrimary }
              ]} 
              numberOfLines={1}
            >
              {category.title}
            </Text>
            {!editMode && !!category.is_active && category.type !== 'workout' && (
              <CountdownBadge remainingMinutes={remainingMinutes} countdownMode={countdownMode} />
            )}
          </View>
          <Text style={styles.categoryMeta}>
            {exercises.length} exercise{exercises.length !== 1 ? 's' : ''} · {formatDuration(totalDuration)}
            {category.type !== 'workout' && ` · Every ${category.interval_minutes} min`}
          </Text>
        </View>
      </View>

      {!editMode && (
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={() => onEditCategory(category.id)}
            style={styles.editButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="pencil-outline" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
          <Animated.View style={arrowStyle}>
            <Ionicons name="chevron-down" size={20} color={Colors.textSecondary} />
          </Animated.View>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    zIndex: 1,
  },
  dragHandle: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginRight: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  activeToggle: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 50,
  },
  activeToggleText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    flexShrink: 1,
  },
  categoryMeta: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editButton: {
    padding: 4,
  },
});
