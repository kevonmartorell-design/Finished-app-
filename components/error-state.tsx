import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  type ViewStyle,
} from 'react-native';
import { colors, fonts, fontSizes, spacing, radius } from '@/lib/tokens';

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <View style={styles.container} accessibilityRole="alert">
      {/* Error icon */}
      <View style={styles.iconCircle}>
        <Text style={styles.iconText} accessibilityElementsHidden>
          !
        </Text>
      </View>

      <Text style={styles.message}>{message}</Text>

      {onRetry != null && (
        <Pressable
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel="Retry"
          accessibilityHint="Tap to try again"
          style={({ pressed }) => [
            styles.retryButton,
            pressed && styles.pressed,
            Platform.OS === 'web' && ({ cursor: 'pointer' } as ViewStyle),
          ]}
        >
          <Text style={styles.retryLabel}>RETRY</Text>
        </Pressable>
      )}
    </View>
  );
}

const MIN_TAP_TARGET = 48;

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: colors.errorRed,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  iconText: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.hero,
    color: colors.errorRed,
    lineHeight: 28,
  },
  message: {
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    color: colors.white,
    textAlign: 'center',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  retryButton: {
    minHeight: MIN_TAP_TARGET,
    minWidth: MIN_TAP_TARGET,
    backgroundColor: colors.orange,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryLabel: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.body,
    color: colors.white,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  pressed: {
    opacity: 0.75,
  },
});
