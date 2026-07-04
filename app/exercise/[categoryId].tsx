import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeIn,
  SlideInRight,
} from 'react-native-reanimated';
import { Colors } from '../../constants/Colors';
import TimerCircle from '../../components/TimerCircle';
import { useExerciseSession } from '../../hooks/useExerciseSession';

export default function ExerciseScreen() {
  const { categoryId } = useLocalSearchParams<{ categoryId: string }>();
  
  const {
    exercises,
    categoryTitle,
    currentIndex,
    phase,
    remainingSeconds,
    isLoading,
    currentSide,
    currentExercise,
    totalDuration,
    handleFinish,
    handleExit,
    handleSkipTimer,
    router
  } = useExerciseSession(categoryId);

  if (isLoading || exercises.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Completed screen
  if (phase === 'completed') {
    return (
      <View style={styles.container}>
        <Animated.View entering={FadeIn.duration(500)} style={styles.completedContainer}>
          <View style={styles.completedIcon}>
            <Ionicons name="checkmark-circle" size={80} color={Colors.success} />
          </View>
          <Text style={styles.completedTitle}>Congrats! 🎉</Text>
          <Text style={styles.completedSubtitle}>
            You completed all exercises in {categoryTitle}!
          </Text>
          <TouchableOpacity
            style={styles.completedButton}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Text style={styles.completedButtonText}>Back to Home</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleExit} style={styles.exitButton}>
          <Ionicons name="close" size={24} color={Colors.textSecondary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.categoryLabel}>{categoryTitle}</Text>
          <Text style={styles.progressText}>
            {currentIndex + 1} / {exercises.length}
          </Text>
        </View>
        <View style={styles.exitButton} />
      </View>

      {/* Progress Dots */}
      <View style={styles.progressDots}>
        {exercises.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              index < currentIndex
                ? styles.dotCompleted
                : index === currentIndex
                  ? styles.dotActive
                  : styles.dotInactive,
            ]}
          />
        ))}
      </View>

      {/* Side Indicator for two-sided exercises */}
      {currentExercise?.is_two_sided ? (
        <View style={styles.sideIndicator}>
          <View style={[styles.sideBadge, currentSide === 'left' && styles.sideBadgeActive]}>
            <Text style={[styles.sideText, currentSide === 'left' && styles.sideTextActive]}>Left</Text>
          </View>
          <Ionicons name="swap-horizontal" size={16} color={Colors.textMuted} />
          <View style={[styles.sideBadge, currentSide === 'right' && styles.sideBadgeActive]}>
            <Text style={[styles.sideText, currentSide === 'right' && styles.sideTextActive]}>Right</Text>
          </View>
        </View>
      ) : null}

      {/* Timer or Reps Display */}
      <View style={styles.timerContainer}>
        {phase === 'prep' || currentExercise?.type !== 'reps' ? (
          <TimerCircle
            totalSeconds={totalDuration}
            remainingSeconds={remainingSeconds}
            isPrep={phase === 'prep'}
            label={
              currentExercise?.is_two_sided
                ? `${currentExercise?.name ?? ''} (${currentSide === 'left' ? 'Left' : 'Right'})`
                : currentExercise?.name ?? ''
            }
          />
        ) : (
          <View style={styles.repsDisplay}>
            <Text style={styles.repsCount}>{currentExercise.reps}</Text>
            <Text style={styles.repsLabel}>Reps</Text>
            <Text style={styles.repsSubLabel}>Complete at your own pace</Text>
          </View>
        )}
      </View>

      {/* Exercise Info */}
      <Animated.View
        key={`exercise-${currentIndex}-${currentSide}`}
        entering={SlideInRight.duration(300)}
        style={styles.exerciseInfo}
      >
        <Text style={styles.exerciseName}>{currentExercise?.name}</Text>
        {currentExercise?.description ? (
          <Text style={styles.exerciseDesc}>{currentExercise.description}</Text>
        ) : null}
      </Animated.View>

      {/* Action Button */}
      <View style={styles.actionContainer}>
        {phase === 'finished' && (
          <Animated.View entering={FadeIn.duration(300)}>
            <TouchableOpacity
              style={styles.finishButton}
              onPress={handleFinish}
              activeOpacity={0.8}
            >
              <Text style={styles.finishButtonText}>
                {currentExercise?.is_two_sided && currentSide === 'left'
                  ? 'Switch Side →'
                  : currentIndex + 1 >= exercises.length ? 'Complete ✓' : 'Finish → Next'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {phase === 'active' && (
          <TouchableOpacity
            style={currentExercise?.type === 'reps' ? styles.finishButton : styles.skipTimerButton}
            onPress={handleSkipTimer}
            activeOpacity={0.8}
          >
            {currentExercise?.type === 'reps' ? (
              <Text style={styles.finishButtonText}>
                {currentExercise.is_two_sided && currentSide === 'left'
                  ? 'Switch Side →'
                  : currentIndex + 1 >= exercises.length ? 'Complete ✓' : 'Finish → Next'}
              </Text>
            ) : (
              <Text style={styles.skipTimerText}>Skip Timer</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
  },
  exitButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    alignItems: 'center',
  },
  categoryLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  progressText: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 2,
  },
  progressDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotCompleted: {
    backgroundColor: Colors.success,
  },
  dotActive: {
    backgroundColor: Colors.accent,
    width: 24,
  },
  dotInactive: {
    backgroundColor: Colors.surfaceBorder,
  },
  timerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 20,
  },
  exerciseInfo: {
    alignItems: 'center',
    paddingHorizontal: 32,
    marginBottom: 16,
  },
  exerciseName: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  exerciseDesc: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  repsDisplay: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: Colors.surfaceBorder,
    borderWidth: 4,
    borderColor: Colors.accent,
  },
  repsCount: {
    fontSize: 72,
    fontWeight: '800',
    color: Colors.accent,
    marginBottom: -10,
  },
  repsLabel: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  repsSubLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textMuted,
  },
  actionContainer: {
    alignItems: 'center',
    paddingBottom: 48,
    paddingHorizontal: 24,
    minHeight: 120,
    justifyContent: 'center',
  },
  finishButton: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 48,
    paddingVertical: 18,
    borderRadius: 16,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  finishButtonText: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textInverse,
  },
  skipTimerButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  skipTimerText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  completedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  completedIcon: {
    marginBottom: 8,
  },
  completedTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  completedSubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  completedButton: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 16,
  },
  completedButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textInverse,
  },
  sideIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 8,
    marginBottom: 4,
  },
  sideBadge: {
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  sideBadgeActive: {
    backgroundColor: Colors.accentMuted,
    borderColor: Colors.accent,
  },
  sideText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  sideTextActive: {
    color: Colors.accent,
  },
});
