import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AEGISButton } from '@/components/aegis-button';
import { AEGISInput } from '@/components/aegis-input';
import { Toast } from '@/components/toast';
import { colors, fonts, fontSizes, spacing } from '@/lib/tokens';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL;

type ToastState = {
  type: 'success' | 'warning' | 'error' | 'info';
  message: string;
} | null;

interface FormErrors {
  password?: string;
  confirmPassword?: string;
}

export default function PasswordResetScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [tokenError, setTokenError] = useState('');
  const [toast, setToast] = useState<ToastState>(null);

  // Password requirements
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);

  const isFormFilled = password.length > 0 && confirmPassword.length > 0;

  // Auto-navigate to login after success
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        router.replace('/(auth)/login');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!hasMinLength) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!hasUppercase) {
      newErrors.password = 'Password must contain at least 1 uppercase letter';
    } else if (!hasNumber) {
      newErrors.password = 'Password must contain at least 1 number';
    }
    if (confirmPassword !== password) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleReset = async () => {
    if (!validate()) return;

    setLoading(true);
    setTokenError('');
    try {
      const res = await fetch(`${API_BASE}/auth/password/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: password }),
      });

      if (res.ok) {
        setSuccess(true);
      } else {
        const data = await res.json();
        if (res.status === 400 && data.code === 'token_expired') {
          setTokenError(
            'This reset link has expired. Please request a new one.',
          );
        } else if (res.status === 400 && data.code === 'token_invalid') {
          setTokenError('Invalid reset link.');
        } else {
          setToast({
            type: 'error',
            message: 'Something went wrong. Please try again.',
          });
        }
      }
    } catch {
      setToast({
        type: 'error',
        message: 'Unable to connect. Check your internet.',
      });
    } finally {
      setLoading(false);
    }
  };

  // Success state
  if (success) {
    return (
      <View style={styles.container}>
        <View style={styles.centeredContent}>
          <Ionicons
            name="checkmark-circle-outline"
            size={64}
            color={colors.successGreen}
          />
          <Text style={styles.successTitle}>PASSWORD UPDATED</Text>
          <Text style={styles.successMessage}>
            Redirecting to sign in...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onDismiss={() => setToast(null)}
        />
      )}

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>NEW PASSWORD</Text>

          {/* Token error */}
          {tokenError ? (
            <View style={styles.tokenErrorBox}>
              <Ionicons
                name="alert-circle-outline"
                size={20}
                color={colors.orange}
              />
              <Text style={styles.tokenErrorText}>{tokenError}</Text>
              <Pressable
                onPress={() => router.replace('/(auth)/forgot-password')}
                style={styles.tokenErrorLink}
              >
                <Text style={styles.tokenErrorLinkText}>
                  Request a new link
                </Text>
              </Pressable>
            </View>
          ) : null}

          {/* Form */}
          <View style={styles.form}>
            <AEGISInput
              label="NEW PASSWORD"
              placeholder="Enter new password"
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                if (errors.password)
                  setErrors((prev) => ({ ...prev, password: undefined }));
              }}
              error={errors.password}
              secureTextEntry
              icon={
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={colors.purple}
                />
              }
            />

            <AEGISInput
              label="CONFIRM PASSWORD"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChangeText={(t) => {
                setConfirmPassword(t);
                if (errors.confirmPassword)
                  setErrors((prev) => ({
                    ...prev,
                    confirmPassword: undefined,
                  }));
              }}
              error={errors.confirmPassword}
              secureTextEntry
              icon={
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={colors.purple}
                />
              }
              onSubmitEditing={handleReset}
            />
          </View>

          {/* Password requirements checklist */}
          <View style={styles.checklist}>
            <RequirementItem
              met={hasMinLength}
              label="At least 8 characters"
            />
            <RequirementItem
              met={hasUppercase}
              label="At least 1 uppercase letter"
            />
            <RequirementItem met={hasNumber} label="At least 1 number" />
          </View>

          <View style={styles.spacerXl} />

          <AEGISButton
            variant={isFormFilled && !tokenError ? 'primary' : 'disabled'}
            label="SET NEW PASSWORD"
            onPress={handleReset}
            loading={loading}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function RequirementItem({ met, label }: { met: boolean; label: string }) {
  return (
    <View style={reqStyles.row} accessibilityLabel={`${label}: ${met ? 'met' : 'not met'}`}>
      <Ionicons
        name={met ? 'checkmark-circle' : 'remove-outline'}
        size={18}
        color={met ? colors.successGreen : colors.midGrey}
      />
      <Text style={[reqStyles.label, met && reqStyles.labelMet]}>
        {label}
      </Text>
    </View>
  );
}

const reqStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  label: {
    fontFamily: fonts.body,
    fontSize: fontSizes.label,
    color: colors.midGrey,
  },
  labelMet: {
    color: colors.successGreen,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.appBg,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl * 2,
    paddingBottom: spacing.xxl,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.hero,
    color: colors.white,
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },
  form: {
    gap: spacing.lg,
    marginBottom: spacing.xl,
  },
  checklist: {
    paddingLeft: spacing.xs,
  },
  spacerXl: {
    height: spacing.xl,
  },
  tokenErrorBox: {
    backgroundColor: `${colors.orange}1A`,
    borderRadius: 8,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    gap: spacing.sm,
    alignItems: 'center',
  },
  tokenErrorText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    color: colors.orange,
    textAlign: 'center',
  },
  tokenErrorLink: {
    padding: spacing.xs,
  },
  tokenErrorLinkText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    color: colors.purple,
  },
  centeredContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  successTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.screenTitle,
    color: colors.white,
    letterSpacing: 2,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  successMessage: {
    fontFamily: fonts.body,
    fontSize: fontSizes.subtitle,
    color: colors.midGrey,
    textAlign: 'center',
  },
});
