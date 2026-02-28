import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AEGISCard } from './aegis-card';
import { AnimatedCounter } from './animated-counter';
import { colors, fonts, fontSizes, spacing } from '@/lib/tokens';

interface MetricCardProps {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  /** e.g. '+12%' or '-5%'. Sign determines color. */
  trend?: string;
}

/** Returns true when the trend string represents a negative change. */
function isNegativeTrend(trend: string): boolean {
  return trend.trimStart().startsWith('-');
}

export function MetricCard({
  label,
  value,
  prefix,
  suffix,
  trend,
}: MetricCardProps) {
  const trendColor = trend
    ? isNegativeTrend(trend)
      ? colors.errorRed
      : colors.successGreen
    : undefined;

  return (
    <AEGISCard>
      <View style={styles.container}>
        {/* Label */}
        <Text
          style={styles.label}
          accessibilityRole="text"
          numberOfLines={1}
        >
          {label}
        </Text>

        {/* Value row with optional prefix / suffix */}
        <View style={styles.valueRow}>
          <AnimatedCounter
            value={value}
            prefix={prefix}
            suffix={suffix}
          />
        </View>

        {/* Trend indicator */}
        {trend ? (
          <Text
            style={[styles.trend, { color: trendColor }]}
            accessibilityLabel={`Trend: ${trend}`}
          >
            {trend}
          </Text>
        ) : null}
      </View>
    </AEGISCard>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  label: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.label,
    color: colors.midGrey,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  trend: {
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    marginTop: spacing.xs,
  },
});
