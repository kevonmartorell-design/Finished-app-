import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { colors, spacing, radius, shadows } from '@/lib/tokens';

type GlowColor = 'purple' | 'orange' | 'none';

interface AEGISCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  glowColor?: GlowColor;
}

/** Map glow options to the matching token color. */
const glowColorMap: Record<Exclude<GlowColor, 'none'>, string> = {
  purple: colors.purple,
  orange: colors.orange,
};

function getGlowStyle(glow: GlowColor): ViewStyle {
  if (glow === 'none') return {};

  const color = glowColorMap[glow];

  return {
    shadowColor: color,
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 20,
    elevation: shadows.card.elevation,
  };
}

export function AEGISCard({
  children,
  style,
  glowColor = 'none',
}: AEGISCardProps) {
  return (
    <View style={[styles.card, getGlowStyle(glowColor), style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.darkGrey,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: `${colors.lightGrey}26`, // lightGrey at ~15% opacity (hex 26 ≈ 0.15)
    padding: spacing.lg,
    ...shadows.card,
  },
});
