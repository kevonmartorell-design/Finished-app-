import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth-context';
import { AEGISButton } from '@/components/aegis-button';
import { AEGISCard } from '@/components/aegis-card';
import { Toast } from '@/components/toast';
import { colors, fonts, fontSizes, spacing } from '@/lib/tokens';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL;

type PlanChoice = 'solo' | 'business' | null;

type ToastState = {
  type: 'success' | 'warning' | 'error' | 'info';
  message: string;
} | null;

const SOLO_FEATURES = [
  'Booking & scheduling',
  'Invoicing & payments',
  'Client management',
  'AI schedule insights',
  'Time tracking',
];

const BUSINESS_FEATURES = [
  'Everything in Solo',
  'Team management',
  'Employee scheduling',
  'Payroll tracking',
  'Contracts & e-signatures',
];

export default function PlanSelectScreen() {
  const { accessToken, login, user } = useAuth();

  const [selectedPlan, setSelectedPlan] = useState<PlanChoice>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  const handleStartTrial = async () => {
    if (!selectedPlan) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/billing/create-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ plan: selectedPlan }),
      });

      const data = await res.json();

      if (res.ok) {
        // Update user in auth context with new plan + subscription status
        if (user) {
          await login(accessToken!, data.refreshToken ?? accessToken!, {
            ...user,
            plan: selectedPlan,
            subscription_status: 'trialing',
            ...(data.user ?? {}),
          });
        }
        router.replace('/(auth)/profile-setup');
      } else {
        setToast({
          type: 'error',
          message: 'Failed to start trial. Please try again.',
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

  return (
    <View style={styles.container}>
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onDismiss={() => setToast(null)}
        />
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>CHOOSE YOUR PLAN</Text>
        <Text style={styles.subtitle}>
          Start with a 14-day free trial. Cancel anytime.
        </Text>

        {/* Plan Cards */}
        <View style={styles.cardsRow}>
          {/* Solo Plan */}
          <Pressable
            onPress={() => setSelectedPlan('solo')}
            style={styles.cardWrapper}
            accessibilityRole="radio"
            accessibilityState={{ selected: selectedPlan === 'solo' }}
            accessibilityLabel="Solo plan, $50 per month"
          >
            <AEGISCard
              glowColor={selectedPlan === 'solo' ? 'purple' : 'none'}
              style={{
                ...styles.planCard,
                ...(selectedPlan === 'solo' ? styles.planCardSelected : {}),
              }}
            >
              <Text style={styles.planTitle}>SOLO</Text>
              <Text style={styles.planPrice}>$50</Text>
              <Text style={styles.planPeriod}>/mo</Text>
              <Text style={styles.planDescription}>
                For independent professionals
              </Text>

              <View style={styles.featureList}>
                {SOLO_FEATURES.map((feature) => (
                  <View key={feature} style={styles.featureRow}>
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color={colors.purple}
                    />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>

              <AEGISButton
                variant={selectedPlan === 'solo' ? 'primary' : 'secondary'}
                label="SELECT SOLO"
                onPress={() => setSelectedPlan('solo')}
              />
            </AEGISCard>
          </Pressable>

          {/* Business Plan */}
          <Pressable
            onPress={() => setSelectedPlan('business')}
            style={styles.cardWrapper}
            accessibilityRole="radio"
            accessibilityState={{ selected: selectedPlan === 'business' }}
            accessibilityLabel="Business plan, $100 per month"
          >
            <AEGISCard
              glowColor={selectedPlan === 'business' ? 'orange' : 'none'}
              style={{
                ...styles.planCard,
                ...(selectedPlan === 'business'
                  ? styles.planCardSelectedOrange
                  : {}),
              }}
            >
              <Text style={styles.planTitle}>BUSINESS</Text>
              <Text style={[styles.planPrice, styles.planPriceOrange]}>
                $100
              </Text>
              <Text style={styles.planPeriod}>/mo</Text>
              <Text style={styles.planDescription}>
                For teams &amp; growing businesses
              </Text>

              <View style={styles.featureList}>
                {BUSINESS_FEATURES.map((feature) => (
                  <View key={feature} style={styles.featureRow}>
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color={colors.orange}
                    />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>

              <AEGISButton
                variant={
                  selectedPlan === 'business' ? 'primary' : 'secondary'
                }
                label="SELECT BUSINESS"
                onPress={() => setSelectedPlan('business')}
              />
            </AEGISCard>
          </Pressable>
        </View>

        {/* Start Trial */}
        <View style={styles.bottomSection}>
          <AEGISButton
            variant={selectedPlan ? 'primary' : 'disabled'}
            label="START FREE TRIAL"
            onPress={handleStartTrial}
            loading={loading}
          />
          <Text style={styles.trialNote}>
            You won&apos;t be charged until your trial ends
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.appBg,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
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
  cardsRow: {
    gap: spacing.lg,
    marginBottom: spacing.xxl,
  },
  cardWrapper: {
    flex: 1,
  },
  planCard: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  planCardSelected: {
    borderColor: colors.purple,
    borderWidth: 1.5,
  },
  planCardSelectedOrange: {
    borderColor: colors.orange,
    borderWidth: 1.5,
  },
  planTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.screenTitle,
    color: colors.white,
    letterSpacing: 2,
    marginBottom: spacing.md,
  },
  planPrice: {
    fontFamily: fonts.heading,
    fontSize: 36,
    color: colors.purple,
  },
  planPriceOrange: {
    color: colors.orange,
  },
  planPeriod: {
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    color: colors.midGrey,
    marginBottom: spacing.md,
  },
  planDescription: {
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    color: colors.midGrey,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  featureList: {
    alignSelf: 'stretch',
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  featureText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    color: colors.white,
  },
  bottomSection: {
    alignItems: 'center',
  },
  trialNote: {
    fontFamily: fonts.body,
    fontSize: fontSizes.label,
    color: colors.midGrey,
    marginTop: spacing.md,
    textAlign: 'center',
  },
});
