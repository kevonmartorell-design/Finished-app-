import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts, fontSizes, spacing } from '@/lib/tokens';
import { AEGISButton } from './aegis-button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon,
  title,
  subtitle,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const showAction = actionLabel != null && onAction != null;

  return (
    <View style={styles.container} accessibilityRole="summary">
      {icon != null && (
        <View style={styles.iconContainer}>{icon}</View>
      )}

      <Text style={styles.title}>{title}</Text>

      {subtitle != null && (
        <Text style={styles.subtitle}>{subtitle}</Text>
      )}

      {showAction && (
        <View style={styles.actionWrapper}>
          <AEGISButton
            variant="secondary"
            label={actionLabel}
            onPress={onAction}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  iconContainer: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.subtitle,
    color: colors.white,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    color: colors.midGrey,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  actionWrapper: {
    marginTop: spacing.md,
  },
});
