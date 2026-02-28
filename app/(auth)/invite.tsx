import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth-context';
import { AEGISButton } from '@/components/aegis-button';
import { AEGISInput } from '@/components/aegis-input';
import { AEGISCard } from '@/components/aegis-card';
import { Toast } from '@/components/toast';
import { colors, fonts, fontSizes, spacing } from '@/lib/tokens';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL;

type ToastState = {
  type: 'success' | 'warning' | 'error' | 'info';
  message: string;
} | null;

interface InvitePreview {
  org_name: string;
  invitee_email: string;
  has_account: boolean;
}

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
}

export default function InviteScreen() {
  const { login, user } = useAuth();
  const { invite_token } = useLocalSearchParams<{ invite_token: string }>();

  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [previewError, setPreviewError] = useState('');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  // Fetch invite preview
  useEffect(() => {
    const fetchPreview = async () => {
      try {
        const res = await fetch(
          `${API_BASE}/auth/invite/preview?token=${invite_token}`,
        );
        if (res.ok) {
          const data: InvitePreview = await res.json();
          setPreview(data);
          if (data.invitee_email) setEmail(data.invitee_email);
        } else {
          setPreviewError('This invite link is invalid or has expired.');
        }
      } catch {
        setPreviewError('Unable to load invite details.');
      } finally {
        setPreviewLoading(false);
      }
    };

    if (invite_token) {
      fetchPreview();
    } else {
      setPreviewLoading(false);
      setPreviewError('No invite token provided.');
    }
  }, [invite_token]);

  const isFormFilled =
    name.trim().length > 0 && email.trim().length > 0 && password.length > 0;

  const handleJoinTeam = async () => {
    // Validate
    const newErrors: FormErrors = {};
    if (!name.trim() || name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }
    if (!password || password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/invite/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invite_token,
          name: name.trim(),
          email: email.trim(),
          password,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        if (data.accessToken) {
          await login(data.accessToken, data.refreshToken, data.user);
          router.replace('/(business)/');
        } else if (data.requiresLogin) {
          setToast({
            type: 'info',
            message: 'Please sign in to join the team.',
          });
          router.replace('/(auth)/login');
        }
      } else {
        setToast({
          type: 'error',
          message: 'Failed to accept invite. Please try again.',
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

  const handleSignInAndJoin = () => {
    // Navigate to login — the invite can be auto-accepted after login
    router.push('/(auth)/login');
  };

  // Loading state
  if (previewLoading) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color={colors.purple} />
        <Text style={styles.loadingText}>Loading invite...</Text>
      </View>
    );
  }

  // Error state
  if (previewError) {
    return (
      <View style={styles.centeredContainer}>
        <Ionicons
          name="alert-circle-outline"
          size={64}
          color={colors.orange}
        />
        <Text style={styles.errorTitle}>{previewError}</Text>
        <View style={styles.spacerXl} />
        <AEGISButton
          variant="primary"
          label="GO TO SIGN IN"
          onPress={() => router.replace('/(auth)/login')}
        />
      </View>
    );
  }

  const hasExistingAccount = preview?.has_account || !!user;

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
          <Ionicons
            name="people-outline"
            size={48}
            color={colors.purple}
            style={styles.headerIcon}
          />

          <Text style={styles.title}>JOIN YOUR TEAM</Text>

          {preview?.org_name && (
            <AEGISCard glowColor="purple" style={styles.orgCard}>
              <Text style={styles.orgLabel}>You&apos;ve been invited to</Text>
              <Text style={styles.orgName}>{preview.org_name}</Text>
            </AEGISCard>
          )}

          {hasExistingAccount ? (
            /* Existing account flow */
            <View style={styles.existingSection}>
              <Text style={styles.existingText}>
                You already have an AEGIS account. Sign in to join this team.
              </Text>
              <View style={styles.spacerXl} />
              <AEGISButton
                variant="primary"
                label="SIGN IN & JOIN"
                onPress={handleSignInAndJoin}
              />
            </View>
          ) : (
            /* New account flow */
            <View style={styles.form}>
              <AEGISInput
                label="FULL NAME"
                placeholder="Enter your name"
                value={name}
                onChangeText={(t) => {
                  setName(t);
                  if (errors.name)
                    setErrors((prev) => ({ ...prev, name: undefined }));
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
                placeholder="Your email"
                value={email}
                onChangeText={setEmail}
                disabled={!!preview?.invitee_email}
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
                onSubmitEditing={handleJoinTeam}
              />

              <View style={styles.spacerLg} />

              <AEGISButton
                variant={isFormFilled ? 'primary' : 'disabled'}
                label="JOIN TEAM"
                onPress={handleJoinTeam}
                loading={loading}
              />
            </View>
          )}
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
  centeredContainer: {
    flex: 1,
    backgroundColor: colors.appBg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  scrollContent: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl * 2,
    paddingBottom: spacing.xxl,
    alignItems: 'center',
  },
  headerIcon: {
    marginBottom: spacing.xl,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.hero,
    color: colors.white,
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },
  loadingText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    color: colors.midGrey,
    marginTop: spacing.lg,
  },
  errorTitle: {
    fontFamily: fonts.body,
    fontSize: fontSizes.subtitle,
    color: colors.orange,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  orgCard: {
    width: '100%',
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  orgLabel: {
    fontFamily: fonts.body,
    fontSize: fontSizes.label,
    color: colors.midGrey,
    marginBottom: spacing.xs,
  },
  orgName: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.screenTitle,
    color: colors.white,
    letterSpacing: 1,
  },
  existingSection: {
    width: '100%',
    alignItems: 'center',
  },
  existingText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    color: colors.midGrey,
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    width: '100%',
    gap: spacing.lg,
  },
  spacerLg: {
    height: spacing.lg,
  },
  spacerXl: {
    height: spacing.xxl,
  },
});
