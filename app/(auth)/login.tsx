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
  email?: string;
  password?: string;
  general?: string;
}

export default function LoginScreen() {
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  const isFormFilled = email.trim().length > 0 && password.length > 0;

  const handleLogin = async () => {
    if (!isFormFilled) return;

    setErrors({});
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (res.ok) {
        if (data.two_fa_enabled) {
          router.push({
            pathname: '/(auth)/two-factor',
            params: {
              user_id: data.user_id,
              temp_token: data.temp_token,
            },
          });
        } else {
          await login(data.accessToken, data.refreshToken, data.user);
          router.replace(
            data.user.plan === 'business' ? '/(business)/' : '/(solo)/',
          );
        }
      } else if (res.status === 401) {
        setErrors({ general: 'Invalid email or password' });
      } else if (res.status === 403 && data.code === 'account_locked') {
        setErrors({
          general: 'Account locked. Check your email to unlock.',
        });
      } else if (res.status === 429) {
        setErrors({
          general: 'Too many attempts. Please wait 15 minutes.',
        });
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
    setToast({
      type: 'info',
      message: 'Google sign-in requires configuration. Use email to continue.',
    });
  };

  const handleApplePress = () => {
    setToast({
      type: 'info',
      message: 'Apple sign-in requires configuration. Use email to continue.',
    });
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
          <Text style={styles.title}>WELCOME BACK</Text>

          {/* General error */}
          {errors.general && (
            <View style={styles.errorBanner}>
              <Ionicons
                name="alert-circle-outline"
                size={20}
                color={colors.orange}
              />
              <Text style={styles.errorBannerText}>{errors.general}</Text>
            </View>
          )}

          {/* Form */}
          <View style={styles.form}>
            <AEGISInput
              label="EMAIL"
              placeholder="Enter your email"
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                if (errors.general) setErrors({});
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

            <View>
              <AEGISInput
                label="PASSWORD"
                placeholder="Enter your password"
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  if (errors.general) setErrors({});
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
                onSubmitEditing={handleLogin}
              />
              <Pressable
                onPress={() => router.push('/(auth)/forgot-password')}
                style={styles.forgotLink}
              >
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </Pressable>
            </View>
          </View>

          <AEGISButton
            variant={isFormFilled ? 'primary' : 'disabled'}
            label="SIGN IN"
            onPress={handleLogin}
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

          {/* Sign up link */}
          <Pressable
            onPress={() => router.push('/(auth)/signup')}
            style={styles.linkButton}
          >
            <Text style={styles.linkText}>
              Don&apos;t have an account?{' '}
              <Text style={styles.linkAccent}>Sign Up</Text>
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
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.orange}1A`,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  errorBannerText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    color: colors.orange,
    flex: 1,
  },
  form: {
    gap: spacing.lg,
    marginBottom: spacing.xl,
  },
  forgotLink: {
    alignSelf: 'flex-end',
    marginTop: spacing.sm,
    padding: spacing.xs,
  },
  forgotText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.label,
    color: colors.purple,
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
