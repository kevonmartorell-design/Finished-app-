import React, { useEffect } from 'react';
import { Pressable, Text, StyleSheet, Platform, type ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';
import { colors, fonts, fontSizes, spacing, radius, shadows } from '@/lib/tokens';

type ToastType = 'success' | 'warning' | 'error' | 'info';

interface ToastProps {
  type: ToastType;
  message: string;
  onDismiss?: () => void;
}

const AUTO_DISMISS_MS = 4000;
const SLIDE_DURATION_MS = 300;
const STATUS_BAR_PADDING = 48;

const typeColorMap: Record<ToastType, string> = {
  success: colors.successGreen,
  warning: colors.warningAmber,
  error: colors.errorRed,
  info: colors.purple,
};

export function Toast({ type, message, onDismiss }: ToastProps) {
  const translateY = useSharedValue(-100);
  const accentColor = typeColorMap[type];

  useEffect(() => {
    // Slide in
    translateY.value = withTiming(0, { duration: SLIDE_DURATION_MS });

    // Auto-dismiss after 4 seconds
    if (onDismiss) {
      translateY.value = withDelay(
        AUTO_DISMISS_MS,
        withTiming(-100, { duration: SLIDE_DURATION_MS }, (finished) => {
          if (finished) {
            runOnJS(onDismiss)();
          }
        }),
      );
    }
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const handleDismiss = () => {
    translateY.value = withTiming(-100, { duration: SLIDE_DURATION_MS }, (finished) => {
      if (finished && onDismiss) {
        runOnJS(onDismiss)();
      }
    });
  };

  const accentStyle: ViewStyle = {
    backgroundColor: accentColor,
  };

  return (
    <Animated.View
      style={[styles.wrapper, animatedStyle]}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
    >
      <Pressable
        onPress={handleDismiss}
        style={({ pressed }) => [
          styles.container,
          shadows.card,
          pressed && styles.pressed,
          Platform.OS === 'web' && ({ cursor: 'pointer' } as ViewStyle),
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Dismiss ${type} notification: ${message}`}
        accessibilityHint="Tap to dismiss"
      >
        <Animated.View style={[styles.accent, accentStyle]} />
        <Text style={styles.message} numberOfLines={3}>
          {message}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingTop: STATUS_BAR_PADDING,
    paddingHorizontal: spacing.lg,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: colors.darkGrey,
    borderRadius: radius.card,
    overflow: 'hidden',
  },
  accent: {
    width: 4,
  },
  message: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    color: colors.white,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  pressed: {
    opacity: 0.85,
  },
});
