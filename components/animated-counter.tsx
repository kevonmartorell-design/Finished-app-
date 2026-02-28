import React, { useEffect } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useDerivedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { colors, fonts, fontSizes } from '@/lib/tokens';

interface AnimatedCounterProps {
  value: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
}

/**
 * Animates from 0 to `value` on mount and re-animates whenever `value` changes.
 * The displayed number is always rounded to the nearest integer.
 */
export function AnimatedCounter({
  value,
  prefix,
  suffix,
  duration = 1000,
}: AnimatedCounterProps) {
  const animatedValue = useSharedValue(0);
  const [displayValue, setDisplayValue] = React.useState(0);

  // Push the latest rounded number from the UI thread to the JS thread.
  const updateDisplay = React.useCallback((v: number) => {
    setDisplayValue(Math.round(v));
  }, []);

  useDerivedValue(() => {
    runOnJS(updateDisplay)(animatedValue.value);
  });

  useEffect(() => {
    animatedValue.value = 0;
    animatedValue.value = withTiming(value, { duration });
  }, [value, duration, animatedValue]);

  // Opacity fades in alongside the count so the "0" flash is barely visible.
  const fadeStyle = useAnimatedStyle(() => ({
    opacity: value === 0 ? 1 : Math.min(animatedValue.value / (value || 1), 1),
  }));

  return (
    <Animated.View style={[styles.container, fadeStyle]}>
      {prefix ? <Text style={styles.affix}>{prefix}</Text> : null}
      <Text
        style={styles.value}
        accessibilityRole="text"
        accessibilityLabel={`${prefix ?? ''}${value}${suffix ?? ''}`}
      >
        {displayValue.toLocaleString()}
      </Text>
      {suffix ? <Text style={styles.affix}>{suffix}</Text> : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  value: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.hero,
    color: colors.white,
  },
  affix: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.hero,
    color: colors.white,
  },
});
