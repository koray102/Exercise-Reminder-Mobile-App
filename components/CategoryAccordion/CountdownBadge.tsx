import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';

interface Props {
  remainingMinutes: number | null;
  countdownMode: 'idle' | 'grace';
}

export default function CountdownBadge({ remainingMinutes, countdownMode }: Props) {
  if (remainingMinutes === null) return null;

  const isGrace = countdownMode === 'grace';
  const isOverdue = isGrace && remainingMinutes <= 0;

  const formatRemainingTime = (minutes: number): string => {
    if (minutes >= 60) {
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      return m > 0 ? `${h}h ${m}m` : `${h}h`;
    }
    return `${minutes}m`;
  };

  return (
    <View style={[styles.badge, isGrace && styles.badgeGrace]}>
      <Ionicons
        name={isOverdue ? 'alert-circle' : isGrace ? 'warning-outline' : 'time-outline'}
        size={11}
        color={isGrace ? '#FF4757' : Colors.accent}
      />
      <Text style={[styles.text, isGrace && styles.textGrace]}>
        {isOverdue ? 'Now!' : formatRemainingTime(remainingMinutes)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.accentMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeGrace: {
    backgroundColor: 'rgba(255, 71, 87, 0.15)',
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.accent,
  },
  textGrace: {
    color: '#FF4757',
  },
});
