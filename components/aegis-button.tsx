import React from 'react';
import {
  Pressable,
  Text,
  ActivityIndicator,
  StyleSheet,
  Platform,
  View,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { colors, fonts, fontSizes, spacing, radius, shadows } from '@/lib/tokens';

type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'disabled';

interface AEGISButtonProps {
  variant: ButtonVariant;
  label: string;
  onPress: () => void;
  loading?: boolean;
  icon?: React.ReactNode;
}

const MIN_TAP_TARGET = 48;

export function AEGISButton({
  variant,
  label,
  onPress,
  loading = false,
  icon,
}: AEGISButtonProps) {
  const isDisabled = variant === 'disabled' || loading;

  const containerStyle: ViewStyle[] = [
    styles.base,
    styles[variant],
    variant === 'primary' && shadows.button,
    Platform.OS === 'web' && !isDisabled && ({ cursor: 'pointer' } as ViewStyle),
  ].filter(Boolean) as ViewStyle[];

  const labelStyle: TextStyle[] = [
    styles.label,
    variant === 'secondary' && styles.secondaryLabel,
  ].filter(Boolean) as TextStyle[];

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      accessibilityLabel={label}
      style={({ pressed }) => [
        ...containerStyle,
        pressed && !isDisabled && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'secondary' ? colors.purple : colors.white}
        />
      ) : (
        <View style={styles.content}>
          {icon && <View style={styles.iconWrapper}>{icon}</View>}
          <Text style={labelStyle}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: MIN_TAP_TARGET,
    minWidth: MIN_TAP_TARGET,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },

  /* ---- Variant fills ---- */
  primary: {
    backgroundColor: colors.purple,
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.purple,
  },
  destructive: {
    backgroundColor: colors.errorRed,
  },
  disabled: {
    backgroundColor: colors.midGrey,
  },

  /* ---- Label ---- */
  label: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.body,
    color: colors.white,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  secondaryLabel: {
    color: colors.purple,
  },

  /* ---- Interaction ---- */
  pressed: {
    opacity: 0.75,
  },

  /* ---- Icon ---- */
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
