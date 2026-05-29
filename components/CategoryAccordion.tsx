import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { Category, Exercise } from '../db/queries';

interface CategoryAccordionProps {
  category: Category;
  exercises: Exercise[];
  onStartExercise: (categoryId: string) => void;
  onEditCategory: (categoryId: string) => void;
  // Edit mode props
  editMode?: boolean;
  onLongPressActivate?: () => void;
  onDrag?: () => void;
  isDragging?: boolean;
  onDelete?: () => void;
}

export default function CategoryAccordion({
  category,
  exercises,
  onStartExercise,
  onEditCategory,
  editMode = false,
  onLongPressActivate,
  onDrag,
  isDragging = false,
  onDelete,
}: CategoryAccordionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const rotation = useSharedValue(0);
  const height = useSharedValue(0);

  // Countdown state — remaining minutes until next reminder
  const [remainingMinutes, setRemainingMinutes] = useState<number | null>(null);

  // Ripple state
  const rippleScale = useSharedValue(0);
  const rippleOpacity = useSharedValue(0);
  const rippleX = useSharedValue(0);
  const rippleY = useSharedValue(0);
  const cardWidth = useSharedValue(300);
  const cardHeight = useSharedValue(80);
  const isLongPressActivated = useRef(false);

  // Calculate and update remaining minutes
  useEffect(() => {
    const calculateRemaining = () => {
      if (!category.last_completed_at) {
        setRemainingMinutes(null);
        return;
      }

      const lastCompleted = new Date(category.last_completed_at).getTime();
      const now = Date.now();
      const elapsedMinutes = (now - lastCompleted) / (1000 * 60);
      const remaining = Math.ceil(category.interval_minutes - elapsedMinutes);

      setRemainingMinutes(remaining);
    };

    calculateRemaining();

    // Update every 30 seconds for smooth countdown
    const interval = setInterval(calculateRemaining, 30000);
    return () => clearInterval(interval);
  }, [category.last_completed_at, category.interval_minutes]);

  const toggleExpand = () => {
    if (editMode || isLongPressActivated.current) return;
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    rotation.value = withTiming(newExpanded ? 1 : 0, { duration: 300, easing: Easing.bezier(0.4, 0, 0.2, 1) });
    height.value = withTiming(newExpanded ? 1 : 0, { duration: 300, easing: Easing.bezier(0.4, 0, 0.2, 1) });
  };

  // Activate edit mode when ripple animation covers the entire card
  const activateEditMode = () => {
    isLongPressActivated.current = true;
    rippleOpacity.value = withTiming(0, { duration: 400 });
    rippleScale.value = withTiming(1.2, { duration: 400 });
    onLongPressActivate?.();
  };

  // Ripple handlers
  const handlePressIn = (e: any) => {
    if (editMode) return;
    isLongPressActivated.current = false;
    const { locationX, locationY } = e.nativeEvent;
    rippleX.value = locationX;
    rippleY.value = locationY;
    rippleOpacity.value = withTiming(1, { duration: 200 });
    rippleScale.value = withTiming(1, { duration: 1300, easing: Easing.out(Easing.quad) }, (finished) => {
      if (finished) {
        runOnJS(activateEditMode)();
      }
    });
  };

  const handlePressOut = () => {
    if (!isLongPressActivated.current) {
      // Cancelled — reverse ripple
      rippleOpacity.value = withTiming(0, { duration: 200 });
      rippleScale.value = withTiming(0, { duration: 200 });
    }
  };

  const handleCardLayout = (e: any) => {
    const { width, height: h } = e.nativeEvent.layout;
    cardWidth.value = width;
    cardHeight.value = h;
  };

  // Animated styles
  const arrowStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(rotation.value, [0, 1], [0, 180])}deg` }],
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: height.value,
    maxHeight: interpolate(height.value, [0, 1], [0, 1000]),
  }));

  const rippleAnimStyle = useAnimatedStyle(() => {
    const maxR = Math.sqrt(cardWidth.value * cardWidth.value + cardHeight.value * cardHeight.value);
    return {
      position: 'absolute' as const,
      left: rippleX.value - maxR,
      top: rippleY.value - maxR,
      width: maxR * 2,
      height: maxR * 2,
      borderRadius: maxR,
      backgroundColor: 'rgba(255, 255, 255, 0.12)',
      opacity: rippleOpacity.value,
      transform: [{ scale: rippleScale.value }],
    };
  });

  const formatDuration = (seconds: number) => {
    if (seconds >= 60) {
      const min = Math.floor(seconds / 60);
      const sec = seconds % 60;
      return sec > 0 ? `${min}m ${sec}s` : `${min}m`;
    }
    return `${seconds}s`;
  };

  /**
   * Format remaining minutes for the countdown badge.
   * Shows hours and minutes if >= 60, otherwise just minutes.
   */
  const formatRemainingTime = (minutes: number): string => {
    if (minutes >= 60) {
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      return m > 0 ? `${h}h ${m}m` : `${h}h`;
    }
    return `${minutes}m`;
  };

  const totalDuration = exercises.reduce((sum, e) => sum + e.duration_seconds, 0);

  // Determine countdown badge content
  const isOverdue = remainingMinutes !== null && remainingMinutes <= 0;
  const showCountdown = remainingMinutes !== null;

  return (
    <Animated.View
      style={[
        styles.container,
        editMode && styles.containerEditMode,
        isDragging && styles.containerDragging,
      ]}
      onLayout={handleCardLayout}
    >
      {/* Ripple overlay — only in normal mode */}
      {!editMode && (
        <View style={styles.rippleContainer} pointerEvents="none">
          <Animated.View style={rippleAnimStyle} />
        </View>
      )}

      {/* Delete button — top right in edit mode */}
      {editMode && (
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={onDelete}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <View style={styles.deleteCircle}>
            <Ionicons name="close" size={14} color="#FFFFFF" />
          </View>
        </TouchableOpacity>
      )}

      {/* Header */}
      <Pressable
        style={styles.header}
        onPress={editMode ? undefined : toggleExpand}
        onPressIn={editMode ? undefined : handlePressIn}
        onPressOut={editMode ? undefined : handlePressOut}
        onLongPress={editMode ? onDrag : undefined}
        delayLongPress={editMode ? 150 : undefined}
      >
        {/* Drag handle icon — left side in edit mode */}
        {editMode && (
          <View style={styles.dragHandle}>
            <Ionicons name="reorder-three" size={24} color={Colors.textSecondary} />
          </View>
        )}

        <View style={[styles.headerLeft, editMode && { marginLeft: 4 }]}>
          {!editMode && (
            <View style={[styles.categoryDot, { backgroundColor: category.is_active ? Colors.accent : Colors.textMuted }]} />
          )}
          <View style={{ flex: 1 }}>
            <View style={styles.titleRow}>
              <Text style={styles.categoryTitle} numberOfLines={1}>{category.title}</Text>
              {/* Countdown Badge */}
              {!editMode && showCountdown && (
                <View style={[styles.countdownBadge, isOverdue && styles.countdownBadgeOverdue]}>
                  <Ionicons
                    name={isOverdue ? 'notifications' : 'time-outline'}
                    size={11}
                    color={isOverdue ? Colors.secondary : Colors.accent}
                  />
                  <Text style={[styles.countdownText, isOverdue && styles.countdownTextOverdue]}>
                    {isOverdue ? 'Now!' : formatRemainingTime(remainingMinutes!)}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.categoryMeta}>
              {exercises.length} exercise{exercises.length !== 1 ? 's' : ''} · {formatDuration(totalDuration)} · Every {category.interval_minutes} min
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

      {/* Expandable Content — hidden in edit mode */}
      {!editMode && (
        <Animated.View style={[styles.content, contentStyle]}>
          {exercises.map((exercise, index) => (
            <View key={exercise.id} style={styles.exerciseItem}>
              <View style={styles.exerciseIndex}>
                <Text style={styles.exerciseIndexText}>{index + 1}</Text>
              </View>
              <View style={styles.exerciseInfo}>
                <Text style={styles.exerciseName}>{exercise.name}</Text>
                {exercise.description ? (
                  <Text style={styles.exerciseDesc} numberOfLines={2}>
                    {exercise.description}
                  </Text>
                ) : null}
                <View style={styles.exerciseFooter}>
                  <View style={styles.durationBadge}>
                    <Ionicons name="time-outline" size={12} color={Colors.accent} />
                    <Text style={styles.durationText}>{formatDuration(exercise.duration_seconds)}</Text>
                  </View>
                  {exercise.youtube_link ? (
                    <TouchableOpacity
                      style={styles.youtubeLink}
                      onPress={() => Linking.openURL(exercise.youtube_link)}
                    >
                      <Ionicons name="logo-youtube" size={14} color="#FF0000" />
                      <Text style={styles.youtubeLinkText}>Video</Text>
                    </TouchableOpacity>
                  ) : null}
                  {exercise.is_two_sided ? (
                    <View style={styles.twoSidedBadge}>
                      <Ionicons name="swap-horizontal" size={12} color={Colors.secondary} />
                      <Text style={styles.twoSidedText}>2-Sided</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </View>
          ))}

          {/* Start Button */}
          {exercises.length > 0 && (
            <TouchableOpacity
              style={styles.startButton}
              onPress={() => onStartExercise(category.id)}
              activeOpacity={0.8}
            >
              <Ionicons name="play" size={18} color={Colors.textInverse} />
              <Text style={styles.startButtonText}>Start Routine</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    overflow: 'visible',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    position: 'relative',
  },
  containerEditMode: {
    backgroundColor: Colors.surfaceHover,
    borderColor: 'rgba(0, 212, 170, 0.25)',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  containerDragging: {
    backgroundColor: Colors.backgroundTertiary,
    borderColor: Colors.accent,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
    transform: [{ scale: 1.03 }],
  },
  rippleContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    borderRadius: 16,
    zIndex: 0,
  },
  deleteButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    zIndex: 10,
  },
  deleteCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
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
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
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
  countdownBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.accentMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  countdownBadgeOverdue: {
    backgroundColor: 'rgba(255, 179, 71, 0.15)',
  },
  countdownText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.accent,
  },
  countdownTextOverdue: {
    color: Colors.secondary,
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
  content: {
    overflow: 'hidden',
    paddingHorizontal: 16,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
    gap: 12,
  },
  exerciseIndex: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  exerciseIndexText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.accent,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  exerciseDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  exerciseFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 6,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.accentMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  durationText: {
    fontSize: 12,
    color: Colors.accent,
    fontWeight: '600',
  },
  youtubeLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  youtubeLinkText: {
    fontSize: 12,
    color: '#FF4444',
    fontWeight: '600',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.accent,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 12,
    marginBottom: 16,
  },
  startButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textInverse,
  },
  twoSidedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255, 179, 71, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  twoSidedText: {
    fontSize: 11,
    color: Colors.secondary,
    fontWeight: '600',
  },
});
