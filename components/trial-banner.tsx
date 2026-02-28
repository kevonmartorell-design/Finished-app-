import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  type ViewStyle,
} from 'react-native';
import { colors, fonts, fontSizes, spacing, radius } from '@/lib/tokens';

interface TrialBannerProps {
  daysRemaining: number;
  onUpgrade?: () => void;
  onDismiss?: () => void;
}

const MIN_TAP_TARGET = 48;
const ACCENT_BAR_WIDTH = 4;

export function TrialBanner({
  daysRemaining,
  onUpgrade,
  onDismiss,
}: TrialBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <View style={styles.container} accessibilityRole="alert">
      {/* Purple left accent bar */}
      <View style={styles.accentBar} />

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.bodyText}>
          <Text style={styles.daysNumber}>{daysRemaining}</Text>
          <Text style={styles.bodyMuted}> days left in trial. </Text>
          {onUpgrade ? (
            <Text
              style={styles.upgradeLink}
              onPress={onUpgrade}
              accessibilityRole="link"
              accessibilityLabel="Upgrade now"
            >
              Upgrade now &rarr;
            </Text>
          ) : (
            <Text style={styles.upgradeStatic}>Upgrade now &rarr;</Text>
          )}
        </Text>
      </View>

      {/* Dismiss button */}
      <Pressable
        onPress={handleDismiss}
        accessibilityRole="button"
        accessibilityLabel="Dismiss trial banner"
        hitSlop={8}
        style={({ pressed }) => [
          styles.dismissButton,
          pressed && styles.pressed,
          Platform.OS === 'web' && ({ cursor: 'pointer' } as ViewStyle),
        ]}
      >
        <Text style={styles.dismissIcon}>✕</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.darkGrey,
    borderRadius: radius.card,
    overflow: 'hidden',
  },
  accentBar: {
    width: ACCENT_BAR_WIDTH,
    alignSelf: 'stretch',
    backgroundColor: colors.purple,
  },
  content: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  bodyText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    color: colors.midGrey,
  },
  daysNumber: {
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    color: colors.white,
    fontWeight: '700',
  },
  bodyMuted: {
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    color: colors.midGrey,
  },
  upgradeLink: {
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    color: colors.orange,
  },
  upgradeStatic: {
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    color: colors.orange,
  },
  dismissButton: {
    minWidth: MIN_TAP_TARGET,
    minHeight: MIN_TAP_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs,
  },
  dismissIcon: {
    fontFamily: fonts.body,
    fontSize: fontSizes.subtitle,
    color: colors.midGrey,
  },
  pressed: {
    opacity: 0.6,
  },
});
