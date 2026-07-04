import React, { useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { isDateStringToday } from '../../utils/date';
import { CategoryAccordionProps } from './types';
import { useCategoryCountdown } from '../../hooks/useCategoryCountdown';
import CategoryHeader from './CategoryHeader';
import CategoryContent from './CategoryContent';

const CategoryAccordion = React.memo(({
  category,
  exercises,
  onStartExercise,
  onEditCategory,
  editMode = false,
  onLongPressActivate,
  onDrag,
  isDragging = false,
  onDelete,
  onToggleActive,
}: CategoryAccordionProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const rotation = useSharedValue(0);
  const height = useSharedValue(0);

  const { remainingMinutes, countdownMode } = useCategoryCountdown(category);

  // Ripple state
  const rippleScale = useSharedValue(0);
  const rippleOpacity = useSharedValue(0);
  const rippleX = useSharedValue(0);
  const rippleY = useSharedValue(0);
  const cardWidth = useSharedValue(300);
  const cardHeight = useSharedValue(80);
  const isLongPressActivated = useRef(false);

  const toggleExpand = () => {
    if (editMode || isLongPressActivated.current) return;
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    rotation.value = withTiming(newExpanded ? 1 : 0, { duration: 300, easing: Easing.bezier(0.4, 0, 0.2, 1) });
    height.value = withTiming(newExpanded ? 1 : 0, { duration: 300, easing: Easing.bezier(0.4, 0, 0.2, 1) });
  };

  const activateEditMode = () => {
    isLongPressActivated.current = true;
    rippleOpacity.value = withTiming(0, { duration: 400 });
    rippleScale.value = withTiming(1.2, { duration: 400 });
    onLongPressActivate?.();
  };

  const handlePressIn = (e: any) => {
    if (editMode) return;
    isLongPressActivated.current = false;
    const { locationX, locationY } = e.nativeEvent;
    rippleX.value = locationX;
    rippleY.value = locationY;
    rippleOpacity.value = withTiming(1, { duration: 200 });
    rippleScale.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.quad) }, (finished) => {
      if (finished) {
        runOnJS(activateEditMode)();
      }
    });
  };

  const handlePressOut = () => {
    if (!isLongPressActivated.current) {
      rippleOpacity.value = withTiming(0, { duration: 200 });
      rippleScale.value = withTiming(0, { duration: 200 });
    }
  };

  const handleCardLayout = (e: any) => {
    const { width, height: h } = e.nativeEvent.layout;
    cardWidth.value = width;
    cardHeight.value = h;
  };

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

  const containerAnimStyle = useAnimatedStyle(() => {
    const targetOpacity = (!category.is_active && !editMode) ? 0.5 : 1;
    return {
      opacity: withTiming(targetOpacity, { duration: 300 }),
    };
  });

  const isCompletedToday = isDateStringToday(category.last_routine_completed_at);

  return (
    <Animated.View
      style={[
        styles.container,
        editMode && styles.containerEditMode,
        isDragging && styles.containerDragging,
        containerAnimStyle,
      ]}
      onLayout={handleCardLayout}
    >
      {!editMode && (
        <View style={styles.rippleContainer} pointerEvents="none">
          <Animated.View style={rippleAnimStyle} />
        </View>
      )}

      {editMode && (
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => onDelete?.(category.id, category.title)}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <View style={styles.deleteCircle}>
            <Ionicons name="close" size={14} color="#FFFFFF" />
          </View>
        </TouchableOpacity>
      )}

      <CategoryHeader
        category={category}
        exercises={exercises}
        editMode={editMode}
        isCompletedToday={isCompletedToday}
        remainingMinutes={remainingMinutes}
        countdownMode={countdownMode}
        rotation={rotation}
        onEditCategory={onEditCategory}
        onToggleActive={onToggleActive}
        onDrag={onDrag}
        toggleExpand={toggleExpand}
        handlePressIn={handlePressIn}
        handlePressOut={handlePressOut}
      />

      {!editMode && (
        <CategoryContent
          exercises={exercises}
          categoryId={category.id}
          height={height}
          onStartExercise={onStartExercise}
          categoryType={category.type as 'stretch' | 'workout'}
        />
      )}
    </Animated.View>
  );
});

export default CategoryAccordion;

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
});
