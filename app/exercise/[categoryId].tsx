import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeIn,
  FadeOut,
  SlideInRight,
} from 'react-native-reanimated';
import { Colors } from '../../constants/Colors';
import { getExercisesByCategory, getCategoryById, Exercise } from '../../db/queries';
import { onRoutineCompleted } from '../../services/streakService';
import { useApp } from '../../contexts/AppContext';
import { Config } from '../../constants/config';
import TimerCircle from '../../components/TimerCircle';

type Phase = 'prep' | 'active' | 'finished' | 'completed';

export default function ExerciseScreen() {
  const { categoryId } = useLocalSearchParams<{ categoryId: string }>();
  const router = useRouter();
  const { refreshStreaks } = useApp();

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [categoryTitle, setCategoryTitle] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('prep');
  const [remainingSeconds, setRemainingSeconds] = useState(Config.PREP_DURATION_SECONDS);
  const [isLoading, setIsLoading] = useState(true);
  const [currentSide, setCurrentSide] = useState<'left' | 'right'>('left');

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load exercises
  useEffect(() => {
    loadExercises();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [categoryId]);

  const loadExercises = async () => {
    if (!categoryId) return;
    try {
      const cat = await getCategoryById(categoryId);
      if (cat) setCategoryTitle(cat.title);

      const exList = await getExercisesByCategory(categoryId);
      setExercises(exList);

      if (exList.length === 0) {
        Alert.alert('Error', 'No exercises found in this category.');
        router.back();
        return;
      }

      setIsLoading(false);
      startPrepPhase();
    } catch (error) {
      console.error('Load error:', error);
      router.back();
    }
  };

  const startPrepPhase = () => {
    setPhase('prep');
    setRemainingSeconds(Config.PREP_DURATION_SECONDS);
    startTimer(Config.PREP_DURATION_SECONDS, () => {
      // Auto transition to active phase after prep
      startActivePhase();
    });
  };

  const startActivePhase = useCallback(() => {
    setPhase('active');
    const duration = exercises[currentIndex]?.duration_seconds ?? 30;
    setRemainingSeconds(duration);
    startTimer(duration, () => {
      // Timer done, show finish button (don't auto-skip)
      setPhase('finished');
    });
  }, [currentIndex, exercises]);

  // Effect to start active phase when exercises load
  useEffect(() => {
    if (exercises.length > 0 && phase === 'prep' && remainingSeconds === 0) {
      startActivePhase();
    }
  }, [exercises, phase, remainingSeconds, startActivePhase]);

  const startTimer = (seconds: number, onComplete: () => void) => {
    if (timerRef.current) clearInterval(timerRef.current);

    let remaining = seconds;
    setRemainingSeconds(remaining);

    timerRef.current = setInterval(() => {
      remaining -= 1;
      setRemainingSeconds(remaining);

      if (remaining <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        onComplete();
      }
    }, 1000);
  };

  const handleFinish = async () => {
    if (timerRef.current) clearInterval(timerRef.current);

    const currentExercise = exercises[currentIndex];

    // Two-sided: if just finished left side, switch to right
    if (currentExercise.is_two_sided && currentSide === 'left') {
      setCurrentSide('right');
      setPhase('prep');
      setRemainingSeconds(Config.PREP_DURATION_SECONDS);
      setTimeout(() => {
        startTimer(Config.PREP_DURATION_SECONDS, () => {
          setPhase('active');
          const duration = currentExercise.duration_seconds ?? 30;
          setRemainingSeconds(duration);
          startTimer(duration, () => {
            setPhase('finished');
          });
        });
      }, 300);
      return;
    }

    // Reset side for next exercise
    setCurrentSide('left');

    const nextIndex = currentIndex + 1;

    if (nextIndex >= exercises.length) {
      // All exercises completed!
      setPhase('completed');

      try {
        const result = await onRoutineCompleted();
        await refreshStreaks();
      } catch (error) {
        console.error('Streak update error:', error);
      }
    } else {
      // Move to next exercise
      setCurrentIndex(nextIndex);
      setPhase('prep');
      setRemainingSeconds(Config.PREP_DURATION_SECONDS);

      // Small delay for animation
      setTimeout(() => {
        startTimer(Config.PREP_DURATION_SECONDS, () => {
          setPhase('active');
          const duration = exercises[nextIndex]?.duration_seconds ?? 30;
          setRemainingSeconds(duration);
          startTimer(duration, () => {
            setPhase('finished');
          });
        });
      }, 300);
    }
  };

  const handleExit = () => {
    Alert.alert(
      'Exit',
      'Are you sure you want to quit? This won\'t affect your streak.',
      [
        { text: 'Continue', style: 'cancel' },
        {
          text: 'Exit',
          style: 'destructive',
          onPress: () => {
            if (timerRef.current) clearInterval(timerRef.current);
            router.back();
          },
        },
      ]
    );
  };

  if (isLoading || exercises.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const currentExercise = exercises[currentIndex];
  const totalDuration = phase === 'prep'
    ? Config.PREP_DURATION_SECONDS
    : currentExercise?.duration_seconds ?? 30;

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
      {currentExercise?.is_two_sided && (
        <View style={styles.sideIndicator}>
          <View style={[styles.sideBadge, currentSide === 'left' && styles.sideBadgeActive]}>
            <Text style={[styles.sideText, currentSide === 'left' && styles.sideTextActive]}>Left</Text>
          </View>
          <Ionicons name="swap-horizontal" size={16} color={Colors.textMuted} />
          <View style={[styles.sideBadge, currentSide === 'right' && styles.sideBadgeActive]}>
            <Text style={[styles.sideText, currentSide === 'right' && styles.sideTextActive]}>Right</Text>
          </View>
        </View>
      )}

      {/* Timer */}
      <View style={styles.timerContainer}>
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
                {currentExercise.is_two_sided && currentSide === 'left'
                  ? 'Switch Side →'
                  : currentIndex + 1 >= exercises.length ? 'Complete ✓' : 'Finish → Next'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {phase === 'active' && (
          <TouchableOpacity
            style={styles.skipTimerButton}
            onPress={() => {
              if (timerRef.current) clearInterval(timerRef.current);
              setPhase('finished');
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.skipTimerText}>Skip Timer</Text>
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
  // Completed
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
