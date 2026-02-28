import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Pressable,
} from 'react-native';
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

interface Slide {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}

const SLIDES: Slide[] = [
  {
    icon: 'calendar-outline',
    title: 'SMART SCHEDULING',
    description:
      'Book clients, manage your calendar, and let AI optimize your day.',
  },
  {
    icon: 'cash-outline',
    title: 'GET PAID FASTER',
    description:
      'Send invoices, accept payments, and track your earnings in real-time.',
  },
  {
    icon: 'grid-outline',
    title: 'ALL-IN-ONE DASHBOARD',
    description:
      'Contracts, time tracking, messaging — everything in one place.',
  },
  {
    icon: 'rocket-outline',
    title: "YOU'RE READY!",
    description: "Let's build your business empire.",
  },
];

export default function OnboardingScreen() {
  const { user, accessToken } = useAuth();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  const isLastSlide = currentIndex === SLIDES.length - 1;

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / width);
    if (index !== currentIndex && index >= 0 && index < SLIDES.length) {
      setCurrentIndex(index);
    }
  };

  const goToNext = () => {
    if (isLastSlide) {
      handleFinish();
    } else {
      const nextIndex = currentIndex + 1;
      scrollRef.current?.scrollTo({ x: nextIndex * width, animated: true });
      setCurrentIndex(nextIndex);
    }
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      await fetch(`${API_BASE}/user/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ walkthrough_completed: true }),
      });
    } catch {
      // Non-critical — continue to dashboard anyway
    } finally {
      setLoading(false);
      const destination =
        user?.plan === 'business' ? '/(business)/' : '/(solo)/';
      router.replace(destination);
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

      {/* Slides */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.carousel}
      >
        {SLIDES.map((slide, index) => (
          <View key={index} style={[styles.slide, { width }]}>
            <Ionicons
              name={slide.icon}
              size={80}
              color={colors.purple}
              style={styles.slideIcon}
            />
            <Text style={styles.slideTitle}>{slide.title}</Text>
            <Text style={styles.slideDescription}>{slide.description}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Bottom controls */}
      <View style={styles.bottomControls}>
        {/* Dot indicators */}
        <View style={styles.dots}>
          {SLIDES.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentIndex && styles.dotActive,
              ]}
            />
          ))}
        </View>

        {/* Action button */}
        <View style={styles.buttonRow}>
          <AEGISButton
            variant="primary"
            label={isLastSlide ? "LET'S GO" : 'NEXT'}
            onPress={goToNext}
            loading={loading}
          />
        </View>

        {/* Skip link (not on last slide) */}
        {!isLastSlide && (
          <Pressable onPress={handleFinish} style={styles.skipButton}>
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.appBg,
  },
  carousel: {
    flex: 1,
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  slideIcon: {
    marginBottom: spacing.xxl,
  },
  slideTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.screenTitle,
    color: colors.white,
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  slideDescription: {
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    color: colors.midGrey,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
  bottomControls: {
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.xxl,
    alignItems: 'center',
  },
  dots: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.midGrey,
    opacity: 0.4,
  },
  dotActive: {
    backgroundColor: colors.purple,
    opacity: 1,
    width: 24,
  },
  buttonRow: {
    width: '100%',
    marginBottom: spacing.md,
  },
  skipButton: {
    padding: spacing.sm,
  },
  skipText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    color: colors.midGrey,
  },
});
