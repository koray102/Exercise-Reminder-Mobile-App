import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { Colors, getStreakColor, MilestoneColors } from '../constants/Colors';
import { Config } from '../constants/config';

interface StreakDisplayProps {
  currentStreak: number;
  totalCount: number;
  isTodayCompleted?: boolean;
}

export default function StreakDisplay({ currentStreak, totalCount, isTodayCompleted = false }: StreakDisplayProps) {
  // Determine color based on completion status
  const streakColor = isTodayCompleted ? '#00D4AA' : '#FFFFFF';
  const scale = useSharedValue(0);
  const glow = useSharedValue(0);
  const counterScale = useSharedValue(0);

  useEffect(() => {
    scale.value = 1; // 500ms içinde düz şekilde büyür
    counterScale.value = 1;

    if (!isTodayCompleted) {
      glow.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 2000 }),
          withTiming(0, { duration: 4000 })
        ),
        -1,
        true
      );
    } else {
      glow.value = withTiming(0.5, { duration: 500 });
    }
  }, [currentStreak, isTodayCompleted]);

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const animatedGlowStyle = useAnimatedStyle(() => {
    if (isTodayCompleted) {
      return {
        opacity: interpolate(glow.value, [0, 1], [0.3, 0.8]),
        transform: [{ scale: 1 }],
      };
    }
    return {
      opacity: interpolate(glow.value, [0, 1], [0.1, 0.5]),
      transform: [{ scale: interpolate(glow.value, [0, 1], [0.85, 1]) }],
    };
  });

  const animatedCounterStyle = useAnimatedStyle(() => ({
    transform: [{ scale: counterScale.value }],
  }));

  // Find next milestone
  const nextMilestone = Config.STREAK_MILESTONES.find(m => m > currentStreak);
  const prevMilestone = [...Config.STREAK_MILESTONES].reverse().find(m => m <= currentStreak) || 0;
  const progress = nextMilestone
    ? (currentStreak - prevMilestone) / (nextMilestone - prevMilestone)
    : 1;

  return (
    <Animated.View style={[styles.container, animatedContainerStyle]}>
      {/* Glow effect behind the streak number */}
      <View style={styles.streakCircleContainer}>
        <Animated.View
          style={[
            styles.glowCircle,
            { backgroundColor: streakColor },
            animatedGlowStyle,
          ]}
        />
        <View style={[styles.streakCircle, { borderColor: streakColor }]}>
          <Animated.Text
            style={[styles.streakNumber, { color: streakColor }, animatedCounterStyle]}
          >
            {currentStreak}
          </Animated.Text>
          <Text style={styles.streakLabel}>day streak</Text>
        </View>
      </View>

      {/* Progress to next milestone */}
      {nextMilestone && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${Math.min(progress * 100, 100)}%`,
                  backgroundColor: streakColor,
                },
              ]}
            />
          </View>
          <Text style={styles.milestoneText}>
            Next goal: {nextMilestone} days
          </Text>
        </View>
      )}

      {/* Total stretch count */}
      <View style={styles.totalContainer}>
        <Text style={styles.totalNumber}>{totalCount}</Text>
        <Text style={styles.totalLabel}>total stretches</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  streakCircleContainer: {
    position: 'relative',
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  glowCircle: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  streakCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakNumber: {
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: -1,
  },
  streakLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginTop: -4,
  },
  progressContainer: {
    width: '80%',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressBarBg: {
    width: '100%',
    height: 6,
    backgroundColor: Colors.surfaceBorder,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  milestoneText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  totalContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  totalNumber: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  totalLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
});
