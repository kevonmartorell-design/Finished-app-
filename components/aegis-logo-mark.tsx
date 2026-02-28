import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { colors, fonts, fontSizes, spacing } from '@/lib/tokens';

const LETTERS = ['A', 'E', 'G', 'I', 'S'] as const;

/** Delay between each letter reveal (ms). */
const LETTER_STAGGER = 100;

/** Duration of each letter's fade-in + slide animation (ms). */
const LETTER_DURATION = 400;

/** How far each letter slides up from (px). */
const LETTER_TRANSLATE_Y = 12;

/** Delay before the underline starts (after the last letter begins). */
const UNDERLINE_DELAY = LETTERS.length * LETTER_STAGGER + LETTER_DURATION;

/** Duration of the underline width animation (ms). */
const UNDERLINE_DURATION = 500;

/** Delay before the tagline fades in (after the underline starts). */
const TAGLINE_DELAY = UNDERLINE_DELAY + UNDERLINE_DURATION;

/** Duration of the tagline fade-in (ms). */
const TAGLINE_DURATION = 400;

/* ------------------------------------------------------------------ */
/*  Animated Letter                                                    */
/* ------------------------------------------------------------------ */

interface AnimatedLetterProps {
  letter: string;
  index: number;
}

function AnimatedLetter({ letter, index }: AnimatedLetterProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(LETTER_TRANSLATE_Y);

  useEffect(() => {
    const delay = index * LETTER_STAGGER;
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: LETTER_DURATION, easing: Easing.out(Easing.quad) }),
    );
    translateY.value = withDelay(
      delay,
      withTiming(0, { duration: LETTER_DURATION, easing: Easing.out(Easing.quad) }),
    );
  }, [index, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.Text style={[styles.letter, animatedStyle]}>
      {letter}
    </Animated.Text>
  );
}

/* ------------------------------------------------------------------ */
/*  AEGISLogoMark                                                      */
/* ------------------------------------------------------------------ */

export function AEGISLogoMark() {
  /* ---- Underline animation ---- */
  const underlineWidth = useSharedValue(0);

  /* ---- Tagline animation ---- */
  const taglineOpacity = useSharedValue(0);

  useEffect(() => {
    // Animate the underline from 0% to 100% width
    underlineWidth.value = withDelay(
      UNDERLINE_DELAY,
      withTiming(1, { duration: UNDERLINE_DURATION, easing: Easing.out(Easing.quad) }),
    );

    // Fade in the tagline after the underline finishes
    taglineOpacity.value = withDelay(
      TAGLINE_DELAY,
      withTiming(1, { duration: TAGLINE_DURATION, easing: Easing.out(Easing.quad) }),
    );
  }, [underlineWidth, taglineOpacity]);

  const underlineAnimatedStyle = useAnimatedStyle(() => ({
    width: `${underlineWidth.value * 100}%` as unknown as number,
    // React Native accepts percentage strings on web; on native the
    // parent width is constrained so this works cross-platform.
  }));

  const taglineAnimatedStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
  }));

  return (
    <View style={styles.container}>
      {/* Letters */}
      <View style={styles.letterRow}>
        {LETTERS.map((letter, index) => (
          <AnimatedLetter key={letter} letter={letter} index={index} />
        ))}
      </View>

      {/* Gradient underline */}
      {/* // TODO: replace with LinearGradient for true purple→orange gradient */}
      <View style={styles.underlineTrack}>
        <Animated.View style={[styles.underline, underlineAnimatedStyle]} />
      </View>

      {/* Tagline */}
      <Animated.Text style={[styles.tagline, taglineAnimatedStyle]}>
        Business Solutions with Precision
      </Animated.Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const UNDERLINE_HEIGHT = 3;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },

  /* ---- Letters ---- */
  letterRow: {
    flexDirection: 'row',
  },
  letter: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.hero,
    color: colors.white,
    letterSpacing: 4,
  },

  /* ---- Underline ---- */
  underlineTrack: {
    width: '100%',
    height: UNDERLINE_HEIGHT,
    marginTop: spacing.sm,
    borderRadius: UNDERLINE_HEIGHT / 2,
    overflow: 'hidden',
  },
  underline: {
    height: UNDERLINE_HEIGHT,
    borderRadius: UNDERLINE_HEIGHT / 2,
    backgroundColor: colors.purple,
    // TODO: replace with LinearGradient for true purple→orange gradient
  },

  /* ---- Tagline ---- */
  tagline: {
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    color: colors.midGrey,
    marginTop: spacing.sm,
  },
});
