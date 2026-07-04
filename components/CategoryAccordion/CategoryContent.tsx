import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import Animated, { SharedValue, useAnimatedStyle, interpolate } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { Exercise } from '../../types';

interface Props {
  exercises: Exercise[];
  categoryId: string;
  height: SharedValue<number>;
  onStartExercise: (categoryId: string) => void;
}

export default function CategoryContent({ exercises, categoryId, height, onStartExercise }: Props) {
  const contentStyle = useAnimatedStyle(() => ({
    opacity: height.value,
    maxHeight: interpolate(height.value, [0, 1], [0, 1000]),
  }));

  const formatDuration = (seconds: number) => {
    if (seconds >= 60) {
      const min = Math.floor(seconds / 60);
      const sec = seconds % 60;
      return sec > 0 ? `${min}m ${sec}s` : `${min}m`;
    }
    return `${seconds}s`;
  };

  return (
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
                {exercise.type === 'reps' ? (
                  <>
                    <Ionicons name="repeat-outline" size={12} color={Colors.accent} />
                    <Text style={styles.durationText}>{exercise.reps} Reps</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="time-outline" size={12} color={Colors.accent} />
                    <Text style={styles.durationText}>{formatDuration(exercise.duration_seconds)}</Text>
                  </>
                )}
              </View>
              {exercise.youtube_link ? (
                <TouchableOpacity
                  style={styles.youtubeLink}
                  onPress={() => Linking.openURL(exercise.youtube_link!)}
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

      {exercises.length > 0 && (
        <TouchableOpacity
          style={styles.startButton}
          onPress={() => onStartExercise(categoryId)}
          activeOpacity={0.8}
        >
          <Ionicons name="play" size={18} color={Colors.textInverse} />
          <Text style={styles.startButtonText}>Start Routine</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
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
});
