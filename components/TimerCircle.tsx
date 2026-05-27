import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
  useAnimatedStyle,
  interpolate,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { Colors } from '../constants/Colors';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface TimerCircleProps {
  totalSeconds: number;
  remainingSeconds: number;
  isPrep: boolean;
  label: string;
}

export default function TimerCircle({ totalSeconds, remainingSeconds, isPrep, label }: TimerCircleProps) {
  const progress = useSharedValue(0);
  const pulse = useSharedValue(0);

  const radius = 110;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const size = (radius + strokeWidth) * 2;
  const center = radius + strokeWidth;

  useEffect(() => {
    const ratio = totalSeconds > 0 ? (totalSeconds - remainingSeconds) / totalSeconds : 0;
    progress.value = withTiming(ratio, { duration: 500, easing: Easing.bezier(0.4, 0, 0.2, 1) });
  }, [remainingSeconds, totalSeconds]);

  useEffect(() => {
    if (remainingSeconds <= 3 && remainingSeconds > 0) {
      pulse.value = withTiming(1, { duration: 300 });
      setTimeout(() => { pulse.value = withTiming(0, { duration: 300 }); }, 300);
    }
  }, [remainingSeconds]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.05]) }],
  }));

  const activeColor = isPrep ? Colors.timerPrep : Colors.timerActive;
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  return (
    <Animated.View style={[styles.container, pulseStyle]}>
      <View style={styles.svgContainer}>
        <Svg width={size} height={size}>
          {/* Background circle */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={Colors.timerRing}
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Progress circle */}
          <AnimatedCircle
            cx={center}
            cy={center}
            r={radius}
            stroke={activeColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            animatedProps={animatedProps}
            transform={`rotate(-90 ${center} ${center})`}
          />
        </Svg>
        <View style={styles.centerContent}>
          <Text style={[styles.timerText, { color: activeColor }]}>
            {minutes > 0 ? `${minutes}:${String(seconds).padStart(2, '0')}` : seconds}
          </Text>
          <Text style={styles.labelText}>{label}</Text>
          {isPrep && (
            <Text style={styles.prepText}>Hazırlan!</Text>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  svgContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerText: {
    fontSize: 56,
    fontWeight: '800',
    letterSpacing: -2,
  },
  labelText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
    maxWidth: 160,
  },
  prepText: {
    fontSize: 16,
    color: Colors.timerPrep,
    fontWeight: '700',
    marginTop: 8,
  },
});
