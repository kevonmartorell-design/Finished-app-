import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { colors, fonts, fontSizes, spacing, radius } from '@/lib/tokens';

interface ProgressBarProps {
  /** Progress value between 0 and 100. Clamped automatically. */
  value: number;
  /** Accent color for the fill bar. */
  color?: 'purple' | 'orange';
  /** Optional label shown above the bar. */
  label?: string;
}

const TRACK_HEIGHT = 8;

const fillColorMap = {
  purple: colors.purple,
  orange: colors.orange,
} as const;

export function ProgressBar({
  value,
  color = 'purple',
  label,
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(clamped, { duration: 600 });
  }, [clamped, progress]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${progress.value}%` as unknown as number,
    // React Native on iOS/Android doesn't accept '%' for width inside
    // useAnimatedStyle reliably, but Reanimated 3+ supports it.
    // For maximum compatibility we use interpolation from 0 to 100%.
  }));

  return (
    <View
      style={styles.container}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: clamped }}
    >
      {/* Header row: label + percentage */}
      {(label !== undefined || true) && (
        <View style={styles.header}>
          {label ? <Text style={styles.label}>{label}</Text> : <View />}
          <Text style={styles.percentage}>{clamped}%</Text>
        </View>
      )}

      {/* Track */}
      <View style={styles.track}>
        <Animated.View
          style={[
            styles.fill,
            { backgroundColor: fillColorMap[color] },
            fillStyle,
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  label: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.label,
    color: colors.midGrey,
  },
  percentage: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.label,
    color: colors.midGrey,
  },
  track: {
    height: TRACK_HEIGHT,
    backgroundColor: colors.darkGrey,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  fill: {
    height: TRACK_HEIGHT,
    borderRadius: radius.pill,
  },
});
