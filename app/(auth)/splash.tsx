import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AEGISButton } from '@/components/aegis-button';
import { AEGISInput } from '@/components/aegis-input';
import { Toast } from '@/components/toast';
import { colors, fonts, fontSizes, spacing } from '@/lib/tokens';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL;
const LAUNCH_MODE = process.env.EXPO_PUBLIC_LAUNCH_MODE;

type ToastState = {
  type: 'success' | 'warning' | 'error' | 'info';
  message: string;
} | null;

export default function SplashScreen() {
  const isWaitlist = LAUNCH_MODE === 'waitlist';
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  const handleJoinWaitlist = async () => {
    if (!email.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/waitlist/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (res.ok) {
        setToast({ type: 'success', message: "You're on the list! We'll be in touch." });
        setEmail('');
      } else {
        setToast({ type: 'error', message: 'Something went wrong. Please try again.' });
      }
    } catch {
      setToast({ type: 'error', message: 'Unable to connect. Check your internet.' });
    } finally {
      setLoading(false);
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

      <View style={styles.content}>
        {/* Logo section — top third */}
        <View style={styles.logoSection}>
          <Text style={styles.logoText}>AEGIS</Text>
          <Text style={styles.tagline}>Your Business. Your Shield.</Text>
        </View>

        {/* Bottom section */}
        <View style={styles.bottomSection}>
          {isWaitlist ? (
            <>
              <AEGISInput
                placeholder="Enter your email"
                value={email}
                onChangeText={setEmail}
                icon={
                  <Ionicons
                    name="mail-outline"
                    size={20}
                    color={colors.purple}
                  />
                }
              />
              <View style={styles.spacerLg} />
              <AEGISButton
                variant={email.trim() ? 'primary' : 'disabled'}
                label="JOIN THE WAITLIST"
                onPress={handleJoinWaitlist}
                loading={loading}
              />
              <Pressable
                onPress={() => router.push('/(auth)/login')}
                style={styles.linkButton}
              >
                <Text style={styles.linkText}>
                  Already have access?{' '}
                  <Text style={styles.linkAccent}>Sign In</Text>
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              <AEGISButton
                variant="primary"
                label="GET STARTED"
                onPress={() => router.push('/(auth)/signup')}
              />
              <View style={styles.spacerMd} />
              <AEGISButton
                variant="secondary"
                label="SIGN IN"
                onPress={() => router.push('/(auth)/login')}
              />
            </>
          )}

          <Text style={styles.termsText}>
            By continuing, you agree to our Terms &amp; Privacy Policy
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.appBg,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xxl,
    paddingTop: 140,
    paddingBottom: spacing.xxl,
  },
  logoSection: {
    alignItems: 'center',
  },
  logoText: {
    fontFamily: fonts.heading,
    fontSize: 40,
    color: colors.white,
    letterSpacing: 8,
    textShadowColor: colors.purple,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 30,
  },
  tagline: {
    fontFamily: fonts.body,
    fontSize: fontSizes.subtitle,
    color: colors.white,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  bottomSection: {
    width: '100%',
  },
  spacerLg: {
    height: spacing.lg,
  },
  spacerMd: {
    height: spacing.md,
  },
  linkButton: {
    alignSelf: 'center',
    marginTop: spacing.lg,
    padding: spacing.sm,
  },
  linkText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    color: colors.midGrey,
  },
  linkAccent: {
    color: colors.purple,
  },
  termsText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.label,
    color: colors.midGrey,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
