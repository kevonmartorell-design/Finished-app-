import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts, fontSizes, spacing, radius } from '@/lib/tokens';

type BadgeStatus = 'active' | 'pending' | 'late' | 'inactive' | 'error';

interface StatusBadgeProps {
  status: BadgeStatus;
}

/** Map each status to its token color. */
const statusColorMap: Record<BadgeStatus, string> = {
  active: colors.successGreen,
  pending: colors.warningAmber,
  late: colors.errorRed,
  inactive: colors.midGrey,
  error: colors.errorRed,
};

/**
 * Append a hex alpha channel (~15 % opacity = 0x26) to the base color.
 * Works for 6-char hex strings produced by our tokens.
 */
function withAlpha15(hex: string): string {
  return `${hex}26`;
}

/** Capitalize the first letter for display. */
function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const color = statusColorMap[status];

  return (
    <View
      style={[styles.badge, { backgroundColor: withAlpha15(color) }]}
      accessibilityRole="text"
      accessibilityLabel={`Status: ${status}`}
    >
      <Text style={[styles.label, { color }]}>{capitalize(status)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radius.badge,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  label: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.label,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
