import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Platform,
  type NativeSyntheticEvent,
  type TextInputSubmitEditingEventData,
  type ViewStyle,
} from 'react-native';
import { colors, fonts, fontSizes, spacing, radius } from '@/lib/tokens';

interface AEGISInputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  secureTextEntry?: boolean;
  icon?: React.ReactNode;
  disabled?: boolean;
  onSubmitEditing?: () => void;
}

export function AEGISInput({
  label,
  placeholder,
  value,
  onChangeText,
  error,
  secureTextEntry = false,
  icon,
  disabled = false,
  onSubmitEditing,
}: AEGISInputProps) {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const hasError = Boolean(error);

  /** Derive the dynamic border style based on state. */
  const borderStyle: ViewStyle = hasError
    ? styles.borderError
    : focused
      ? styles.borderFocused
      : styles.borderDefault;

  const handleFocus = () => {
    setFocused(true);
  };

  const handleBlur = () => {
    setFocused(false);
  };

  const handleSubmitEditing = (
    _e: NativeSyntheticEvent<TextInputSubmitEditingEventData>,
  ) => {
    onSubmitEditing?.();
  };

  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View style={[styles.inputRow, borderStyle, disabled && styles.disabled]}>
        {icon && <View style={styles.iconWrapper}>{icon}</View>}

        <TextInput
          ref={inputRef}
          style={[
            styles.input,
            Platform.OS === 'web' && ({ outlineStyle: 'none' } as Record<string, string>),
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.midGrey}
          secureTextEntry={secureTextEntry}
          editable={!disabled}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onSubmitEditing={handleSubmitEditing}
          returnKeyType="done"
          accessibilityLabel={label ?? placeholder}
          accessibilityState={{ disabled }}
        />
      </View>

      {hasError && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const BORDER_WIDTH_DEFAULT = 1;
const BORDER_WIDTH_FOCUS = 2;

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    gap: spacing.xs,
  },

  /* ---- Label ---- */
  label: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.label,
    color: colors.white,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },

  /* ---- Input row (icon + field) ---- */
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.darkGrey,
    borderRadius: radius.input,
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },

  /* ---- Border states ---- */
  borderDefault: {
    borderWidth: BORDER_WIDTH_DEFAULT,
    borderColor: 'transparent',
  },
  borderFocused: {
    borderWidth: BORDER_WIDTH_FOCUS,
    borderColor: colors.purple,
  },
  borderError: {
    borderWidth: BORDER_WIDTH_FOCUS,
    borderColor: colors.errorRed,
  },

  /* ---- Disabled ---- */
  disabled: {
    opacity: 0.5,
  },

  /* ---- Icon ---- */
  iconWrapper: {
    marginRight: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* ---- TextInput ---- */
  input: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    color: colors.white,
    paddingVertical: spacing.md,
  },

  /* ---- Error text ---- */
  errorText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.label,
    color: colors.orange,
    marginTop: spacing.xs,
  },
});
