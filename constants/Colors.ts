// Flexify Color System — Dark-first premium palette

export const Colors = {
  // Core palette
  background: '#0A0A0F',
  backgroundSecondary: '#12121A',
  backgroundTertiary: '#1A1A26',
  surface: '#1E1E2E',
  surfaceHover: '#252538',
  surfaceBorder: '#2A2A3E',

  // Text
  textPrimary: '#F0F0F5',
  textSecondary: '#8E8EA0',
  textMuted: '#5A5A6E',
  textInverse: '#0A0A0F',

  // Accent — Vibrant Teal/Cyan
  accent: '#00D4AA',
  accentLight: '#33DFBE',
  accentDark: '#00A888',
  accentMuted: 'rgba(0, 212, 170, 0.15)',

  // Secondary accent — Warm Amber
  secondary: '#FFB347',
  secondaryLight: '#FFC570',
  secondaryDark: '#E69A30',

  // Status
  success: '#4ADE80',
  warning: '#FBBF24',
  error: '#F87171',
  info: '#60A5FA',

  // Gradients
  gradientStart: '#00D4AA',
  gradientEnd: '#0891B2',
  gradientWarm: '#FFB347',
  gradientWarmEnd: '#FF6B6B',

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.6)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',

  // Timer
  timerPrep: '#FBBF24',
  timerActive: '#00D4AA',
  timerFinished: '#4ADE80',
  timerRing: '#2A2A3E',
};

// Milestone streak colors — unlock as you progress
export const MilestoneColors: Record<number, string> = {
  0: '#5A5A6E',     // Default — muted gray
  7: '#60A5FA',     // 7 days — Ocean Blue
  30: '#A78BFA',    // 30 days — Royal Purple
  90: '#F472B6',    // 90 days — Hot Pink
  180: '#FFD700',   // 180 days — Gold
  365: '#FF6B6B',   // 365 days — Legendary Red
};

export function getStreakColor(streak: number): string {
  const milestones = Object.keys(MilestoneColors)
    .map(Number)
    .sort((a, b) => b - a);

  for (const milestone of milestones) {
    if (streak >= milestone) {
      return MilestoneColors[milestone];
    }
  }
  return MilestoneColors[0];
}
