import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { colors, fonts, fontSizes, spacing, radius } from '@/lib/tokens';

interface LoadingStateProps {
  message?: string;
}

const SKELETON_WIDTHS: `${number}%`[] = ['100%', '75%', '60%', '85%'];
const SKELETON_HEIGHT = 14;
const PULSE_DURATION_MS = 1200;
// Purple at 15% opacity for skeleton tint border
const PURPLE_TINT = colors.purple + '26';

function SkeletonRow({ widthPercent }: { widthPercent: `${number}%` }) {
  const opacity = useSharedValue(0.3);

  React.useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: PULSE_DURATION_MS, easing: Easing.inOut(Easing.ease) }),
      -1, // infinite
      true, // reverse
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.skeletonRow,
        { width: widthPercent },
        animatedStyle,
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}

export function LoadingState({ message }: LoadingStateProps) {
  return (
    <View
      style={styles.container}
      accessibilityRole="progressbar"
      accessibilityLabel={message ?? 'Loading content'}
    >
      {SKELETON_WIDTHS.map((width, index) => (
        <SkeletonRow key={index} widthPercent={width} />
      ))}

      {message != null && (
        <Text style={styles.message}>{message}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  skeletonRow: {
    height: SKELETON_HEIGHT,
    borderRadius: radius.card,
    // Purple-tinted skeleton: darkGrey base with a purple overlay effect
    // Using a mix that reads as a subtle purple tint over dark grey
    backgroundColor: colors.darkGrey,
    borderWidth: 1,
    borderColor: PURPLE_TINT,
    // Add a purple tint via shadow on iOS / elevation tint on Android
    shadowColor: colors.purple,
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 4,
    elevation: 1,
  },
  message: {
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    color: colors.midGrey,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
