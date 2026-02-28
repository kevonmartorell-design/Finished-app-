import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth-context';
import { AEGISButton } from '@/components/aegis-button';
import { Toast } from '@/components/toast';
import { colors, fonts, fontSizes, spacing } from '@/lib/tokens';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL;

type ToastState = {
  type: 'success' | 'warning' | 'error' | 'info';
  message: string;
} | null;

export default function BillingSetupScreen() {
  const { accessToken } = useAuth();

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  const handleSetupPayment = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/billing/update-payment-method`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = await res.json();

      if (res.ok && data.url) {
        // Open Stripe billing portal
        if (typeof window !== 'undefined') {
          window.open(data.url, '_blank');
        }
        // On native, you could use Linking.openURL(data.url)
      } else {
        setToast({
          type: 'error',
          message: 'Failed to open payment setup. Please try again.',
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

  const handleSkip = () => {
    router.replace('/(auth)/profile-setup');
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
        <Ionicons
          name="card-outline"
          size={64}
          color={colors.purple}
          style={styles.icon}
        />

        <Text style={styles.title}>SET UP PAYMENT</Text>
        <Text style={styles.subtitle}>
          Your 14-day trial is free. Add a payment method for when it ends.
        </Text>

        <View style={styles.buttonSection}>
          <AEGISButton
            variant="primary"
            label="ADD PAYMENT METHOD"
            onPress={handleSetupPayment}
            loading={loading}
            icon={
              <Ionicons name="card-outline" size={20} color={colors.white} />
            }
          />

          <Pressable onPress={handleSkip} style={styles.skipButton}>
            <Text style={styles.skipText}>Skip for now</Text>
          </Pressable>
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  icon: {
    marginBottom: spacing.xxl,
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
    fontSize: fontSizes.subtitle,
    color: colors.midGrey,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.xxl,
    maxWidth: 300,
  },
  buttonSection: {
    width: '100%',
    alignItems: 'center',
  },
  skipButton: {
    marginTop: spacing.xl,
    padding: spacing.sm,
  },
  skipText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    color: colors.midGrey,
  },
});
