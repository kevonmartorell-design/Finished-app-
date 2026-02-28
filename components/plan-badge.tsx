import React from 'react';
import { Text, View, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { colors, fonts, fontSizes, spacing, radius } from '@/lib/tokens';

type Plan = 'solo' | 'business';

interface PlanBadgeProps {
  plan: Plan;
}

const PLAN_CONFIG: Record<Plan, { label: string; color: string }> = {
  solo: { label: '$50/mo', color: colors.orange },
  business: { label: '$100/mo', color: colors.purple },
};

export function PlanBadge({ plan }: PlanBadgeProps) {
  const { label, color } = PLAN_CONFIG[plan];

  const badgeStyle: ViewStyle = {
    ...styles.badge,
    backgroundColor: `${color}26`, // 15% opacity (hex 26 ≈ 0.15)
  };

  const textStyle: TextStyle = {
    ...styles.text,
    color,
  };

  return (
    <View style={badgeStyle}>
      <Text style={textStyle}>{label}</Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  badge: {
    borderRadius: radius.badge,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    alignSelf: 'flex-start',
  },
  text: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.label,
  },
});
