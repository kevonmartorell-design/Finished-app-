import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
  Linking,
  type ViewStyle,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, fonts, fontSizes, spacing, radius } from '@/lib/tokens';
import { AEGISButton, AEGISInput, AEGISCard, SectionHeader } from '@/components';
import { useAuth } from '@/lib/auth-context';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface FAQItem {
  question: string;
  answer: string;
}

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const FAQ_DATA: FAQItem[] = [
  {
    question: 'How do I change my subscription plan?',
    answer:
      'Go to Settings > Billing to upgrade or downgrade your plan. Changes take effect at the start of your next billing cycle.',
  },
  {
    question: 'How does the 14-day free trial work?',
    answer:
      'Your trial gives you full access to all features of your selected plan. You won\u2019t be charged until the trial ends.',
  },
  {
    question: 'How do I invite team members?',
    answer:
      'Business plan users can invite team members from the Team section. Go to Team > Invite and enter their email address.',
  },
  {
    question: 'Can I export my data?',
    answer:
      'Yes, you can export invoices, timesheets, and reports as PDF or CSV from their respective sections.',
  },
  {
    question: 'How do I set up two-factor authentication?',
    answer:
      'Go to Settings > Security and toggle on Two-Factor Authentication. Follow the prompts to set up your authenticator app.',
  },
  {
    question: 'How do I contact support?',
    answer:
      'You can email us at support@aegiscert.org or use the Contact Support button below.',
  },
  {
    question: 'What payment methods are accepted?',
    answer:
      'We accept all major credit and debit cards through our secure Stripe integration.',
  },
  {
    question: 'How do I reset my password?',
    answer:
      'On the login screen, tap \u2018Forgot Password\u2019 and follow the instructions sent to your email.',
  },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function HelpScreen() {
  const router = useRouter();
  const { accessToken } = useAuth();

  const [searchText, setSearchText] = useState('');
  const [expandedIndices, setExpandedIndices] = useState<Set<number>>(new Set());
  const [replayLoading, setReplayLoading] = useState(false);

  /* ---- Filtered FAQ list ---- */
  const filteredFAQs = useMemo(() => {
    const query = searchText.toLowerCase().trim();
    if (!query) return FAQ_DATA;

    return FAQ_DATA.filter(
      (item) =>
        item.question.toLowerCase().includes(query) ||
        item.answer.toLowerCase().includes(query),
    );
  }, [searchText]);

  /* ---- FAQ expand/collapse ---- */
  const toggleFAQ = useCallback((index: number) => {
    setExpandedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  /* ---- Contact support ---- */
  const handleContactSupport = useCallback(() => {
    Linking.openURL('mailto:support@aegiscert.org?subject=AEGIS Support Request');
  }, []);

  /* ---- Replay onboarding ---- */
  const handleReplayOnboarding = useCallback(async () => {
    setReplayLoading(true);
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_BASE_URL}/user/me`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ walkthrough_completed: false }),
        },
      );

      if (!response.ok) {
        throw new Error('Failed to reset onboarding');
      }

      router.replace('/');
    } catch {
      // Silently fail — user can retry
    } finally {
      setReplayLoading(false);
    }
  }, [accessToken, router]);

  /* ---- Back navigation ---- */
  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Back Button ──────────────────────────────── */}
        <Pressable
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={8}
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.pressed,
            Platform.OS === 'web' && ({ cursor: 'pointer' } as ViewStyle),
          ]}
        >
          <Text style={styles.backChevron}>{'\u2039'}</Text>
          <Text style={styles.backLabel}>Back</Text>
        </Pressable>

        {/* ── Screen Title ─────────────────────────────── */}
        <Text style={styles.screenTitle}>Help & Support</Text>

        {/* ── FAQ Search ───────────────────────────────── */}
        <View style={styles.searchWrapper}>
          <AEGISInput
            label="Search FAQ"
            placeholder="Type your question..."
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>

        {/* ── FAQ List ─────────────────────────────────── */}
        <View style={styles.faqList}>
          {filteredFAQs.length === 0 ? (
            <Text style={styles.noResults}>
              No matching questions found. Try a different search term.
            </Text>
          ) : (
            filteredFAQs.map((item, index) => {
              const isExpanded = expandedIndices.has(index);
              const originalIndex = FAQ_DATA.indexOf(item);

              return (
                <AEGISCard key={originalIndex} style={styles.faqCard}>
                  <Pressable
                    onPress={() => toggleFAQ(index)}
                    accessibilityRole="button"
                    accessibilityLabel={`${item.question}. ${isExpanded ? 'Collapse' : 'Expand'}`}
                    accessibilityState={{ expanded: isExpanded }}
                    style={({ pressed }) => [
                      styles.faqPressable,
                      pressed && styles.pressed,
                      Platform.OS === 'web' && ({ cursor: 'pointer' } as ViewStyle),
                    ]}
                  >
                    <Text style={styles.faqQuestion} numberOfLines={isExpanded ? undefined : 3}>
                      {item.question}
                    </Text>
                    <Text style={styles.faqChevron}>
                      {isExpanded ? '\u02C5' : '\u203A'}
                    </Text>
                  </Pressable>

                  {isExpanded && (
                    <Text style={styles.faqAnswer}>{item.answer}</Text>
                  )}
                </AEGISCard>
              );
            })
          )}
        </View>

        {/* ── Contact Support ──────────────────────────── */}
        <View style={styles.section}>
          <SectionHeader title="Contact Support" />
          <AEGISButton
            variant="secondary"
            label="Email Support"
            onPress={handleContactSupport}
          />
        </View>

        {/* ── Replay Onboarding ────────────────────────── */}
        <View style={styles.section}>
          <SectionHeader title="Onboarding" />
          <AEGISButton
            variant="secondary"
            label="Replay Onboarding"
            onPress={handleReplayOnboarding}
            loading={replayLoading}
          />
        </View>
      </ScrollView>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const MIN_TAP_TARGET = 48;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.appBg,
  },
  scrollContent: {
    paddingTop: Platform.OS === 'web' ? spacing.xxl : 60,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },

  /* Back button */
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: MIN_TAP_TARGET,
    minWidth: MIN_TAP_TARGET,
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
  },
  backChevron: {
    fontFamily: fonts.body,
    fontSize: fontSizes.hero,
    color: colors.purple,
    marginRight: spacing.xs,
  },
  backLabel: {
    fontFamily: fonts.body,
    fontSize: fontSizes.subtitle,
    color: colors.purple,
  },
  pressed: {
    opacity: 0.6,
  },

  /* Screen title */
  screenTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.screenTitle,
    color: colors.white,
    marginBottom: spacing.xl,
  },

  /* Search */
  searchWrapper: {
    marginBottom: spacing.lg,
  },

  /* FAQ list */
  faqList: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  faqCard: {
    padding: 0,
    overflow: 'hidden',
  },
  faqPressable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    minHeight: MIN_TAP_TARGET,
  },
  faqQuestion: {
    flex: 1,
    fontFamily: fonts.heading,
    fontSize: fontSizes.body,
    color: colors.white,
    marginRight: spacing.md,
  },
  faqChevron: {
    fontFamily: fonts.body,
    fontSize: fontSizes.hero,
    color: colors.midGrey,
  },
  faqAnswer: {
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    color: colors.midGrey,
    lineHeight: fontSizes.body * 1.6,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  noResults: {
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    color: colors.midGrey,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },

  /* Sections */
  section: {
    marginBottom: spacing.xl,
  },
});
