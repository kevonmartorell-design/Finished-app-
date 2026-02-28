import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AEGISButton } from '@/components/aegis-button';
import { AEGISInput } from '@/components/aegis-input';
import { Toast } from '@/components/toast';
import { colors, fonts, fontSizes, spacing } from '@/lib/tokens';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ToastState = {
  type: 'success' | 'warning' | 'error' | 'info';
  message: string;
} | null;

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  const handleSendReset = async () => {
    if (!email.trim() || !EMAIL_REGEX.test(email.trim())) {
      setEmailError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      await fetch(`${API_BASE}/auth/password/forgot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      // Always show success (security — don't reveal if email exists)
      setSent(true);
    } catch {
      setToast({
        type: 'error',
        message: 'Unable to connect. Check your internet.',
      });
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <View style={styles.container}>
        <View style={styles.centeredContent}>
          <Ionicons
            name="mail-open-outline"
            size={64}
            color={colors.purple}
          />
          <Text style={styles.successTitle}>CHECK YOUR EMAIL</Text>
          <Text style={styles.successMessage}>
            We&apos;ve sent a password reset link to{'\n'}
            <Text style={styles.emailHighlight}>{email.trim()}</Text>
          </Text>
          <View style={styles.spacerXl} />
          <AEGISButton
            variant="primary"
            label="BACK TO SIGN IN"
            onPress={() => router.replace('/(auth)/login')}
          />
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
          <Text style={styles.title}>RESET PASSWORD</Text>
          <Text style={styles.subtitle}>
            Enter your email and we&apos;ll send you a reset link
          </Text>

          <View style={styles.form}>
            <AEGISInput
              label="EMAIL"
              placeholder="Enter your email"
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                if (emailError) setEmailError('');
              }}
              error={emailError}
              icon={
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={colors.purple}
                />
              }
              onSubmitEditing={handleSendReset}
            />
          </View>

          <AEGISButton
            variant={email.trim() ? 'primary' : 'disabled'}
            label="SEND RESET LINK"
            onPress={handleSendReset}
            loading={loading}
          />

          <Pressable
            onPress={() => router.push('/(auth)/login')}
            style={styles.linkButton}
          >
            <Text style={styles.linkText}>Back to Sign In</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

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
    marginBottom: spacing.md,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    color: colors.midGrey,
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },
  form: {
    marginBottom: spacing.xl,
  },
  linkButton: {
    alignSelf: 'center',
    marginTop: spacing.xl,
    padding: spacing.sm,
  },
  linkText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    color: colors.midGrey,
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
    marginBottom: spacing.lg,
  },
  successMessage: {
    fontFamily: fonts.body,
    fontSize: fontSizes.subtitle,
    color: colors.midGrey,
    textAlign: 'center',
    lineHeight: 24,
  },
  emailHighlight: {
    color: colors.white,
  },
  spacerXl: {
    height: spacing.xxl,
  },
});
