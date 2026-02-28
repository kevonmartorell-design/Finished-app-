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
import { useAuth } from '@/lib/auth-context';
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
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignupScreen() {
  const { login } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  const isFormFilled =
    name.trim().length > 0 &&
    email.trim().length > 0 &&
    password.length > 0 &&
    confirmPassword.length > 0;

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!name.trim() || name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }
    if (!email.trim() || !EMAIL_REGEX.test(email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!password || password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/[A-Z]/.test(password)) {
      newErrors.password = 'Password must contain at least 1 uppercase letter';
    } else if (!/\d/.test(password)) {
      newErrors.password = 'Password must contain at least 1 number';
    }
    if (confirmPassword !== password) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
          name: name.trim(),
        }),
      });

      const data = await res.json();

      if (res.status === 201) {
        await login(data.accessToken, data.refreshToken, data.user);
        router.replace('/(auth)/plan-select');
      } else if (res.status === 409) {
        setErrors({ email: 'An account with this email already exists' });
      } else if (res.status === 422 && data.errors) {
        const fieldErrors: FormErrors = {};
        if (data.errors.email) fieldErrors.email = data.errors.email;
        if (data.errors.password) fieldErrors.password = data.errors.password;
        if (data.errors.name) fieldErrors.name = data.errors.name;
        setErrors(fieldErrors);
      } else {
        setToast({
          type: 'error',
          message: 'Something went wrong. Please try again.',
        });
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

  const handleGooglePress = () => {
    // Wire up with: npx expo install expo-auth-session expo-web-browser
    // Use useAuthRequest hook → get id_token → POST /auth/social/google
    setToast({
      type: 'info',
      message: 'Google sign-in requires configuration. Use email to continue.',
    });
  };

  const handleApplePress = () => {
    // Wire up with: npx expo install expo-apple-authentication
    // Use AppleAuthentication.signInAsync() → POST /auth/social/apple
    setToast({
      type: 'info',
      message: 'Apple sign-in requires configuration. Use email to continue.',
    });
  };

  const clearFieldError = (field: keyof FormErrors) => {
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

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
          <Text style={styles.title}>CREATE ACCOUNT</Text>

          {/* Form */}
          <View style={styles.form}>
            <AEGISInput
              label="FULL NAME"
              placeholder="Enter your name"
              value={name}
              onChangeText={(t) => {
                setName(t);
                clearFieldError('name');
              }}
              error={errors.name}
              icon={
                <Ionicons
                  name="person-outline"
                  size={20}
                  color={colors.purple}
                />
              }
            />

            <AEGISInput
              label="EMAIL"
              placeholder="Enter your email"
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                clearFieldError('email');
              }}
              error={errors.email}
              icon={
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={colors.purple}
                />
              }
            />

            <AEGISInput
              label="PASSWORD"
              placeholder="Create a password"
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                clearFieldError('password');
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
              placeholder="Confirm your password"
              value={confirmPassword}
              onChangeText={(t) => {
                setConfirmPassword(t);
                clearFieldError('confirmPassword');
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
              onSubmitEditing={handleSignup}
            />
          </View>

          <AEGISButton
            variant={isFormFilled ? 'primary' : 'disabled'}
            label="CREATE ACCOUNT"
            onPress={handleSignup}
            loading={loading}
          />

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Social Auth */}
          <AEGISButton
            variant="secondary"
            label="Continue with Google"
            onPress={handleGooglePress}
            icon={
              <Ionicons name="logo-google" size={20} color={colors.purple} />
            }
          />
          <View style={styles.spacerSm} />
          <AEGISButton
            variant="secondary"
            label="Continue with Apple"
            onPress={handleApplePress}
            icon={
              <Ionicons name="logo-apple" size={20} color={colors.purple} />
            }
          />

          {/* Sign in link */}
          <Pressable
            onPress={() => router.push('/(auth)/login')}
            style={styles.linkButton}
          >
            <Text style={styles.linkText}>
              Already have an account?{' '}
              <Text style={styles.linkAccent}>Sign In</Text>
            </Text>
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
    marginBottom: spacing.xxl,
  },
  form: {
    gap: spacing.lg,
    marginBottom: spacing.xl,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.midGrey,
    opacity: 0.3,
  },
  dividerText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    color: colors.midGrey,
    marginHorizontal: spacing.lg,
  },
  spacerSm: {
    height: spacing.sm,
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
    textAlign: 'center',
  },
  linkAccent: {
    color: colors.purple,
  },
});
