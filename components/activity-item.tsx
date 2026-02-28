import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { colors, fonts, fontSizes, spacing } from '@/lib/tokens';

interface ActivityItemProps {
  /** Icon element rendered on the left side of the row. */
  icon: React.ReactNode;
  /** Description of the action, e.g. "booked a session". */
  action: string;
  /** Name of the person who performed the action. */
  actor: string;
  /** Human-readable timestamp, e.g. "2 min ago". */
  time: string;
  /** Optional activity type for semantic context. */
  type?: string;
  /** Stagger delay in ms for the fade-in animation. Default 0. */
  delay?: number;
}

export function ActivityItem({
  icon,
  action,
  actor,
  time,
  type,
  delay = 0,
}: ActivityItemProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(8);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 400 }));
    translateY.value = withDelay(delay, withTiming(0, { duration: 400 }));
  }, [delay, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[styles.container, animatedStyle]}
      accessibilityRole="text"
      accessibilityLabel={`${actor} ${action} ${time}`}
    >
      {/* Icon */}
      <View style={styles.iconWrapper}>{icon}</View>

      {/* Text column */}
      <View style={styles.textColumn}>
        <Text style={styles.actorAction} numberOfLines={2}>
          <Text style={styles.actor}>{actor}</Text>
          {' '}
          <Text style={styles.action}>{action}</Text>
        </Text>
        {type ? (
          <Text style={styles.type} numberOfLines={1}>
            {type}
          </Text>
        ) : null}
      </View>

      {/* Time */}
      <Text style={styles.time}>{time}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: `${colors.lightGrey}26`, // lightGrey at ~15 % opacity
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${colors.purple}1A`, // subtle purple tint at ~10 %
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  textColumn: {
    flex: 1,
    marginRight: spacing.sm,
  },
  actorAction: {
    flexShrink: 1,
  },
  actor: {
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    fontWeight: '700',
    color: colors.white,
  },
  action: {
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    color: colors.midGrey,
  },
  type: {
    fontFamily: fonts.body,
    fontSize: fontSizes.label,
    color: colors.midGrey,
    marginTop: 2,
  },
  time: {
    fontFamily: fonts.body,
    fontSize: fontSizes.label,
    color: colors.midGrey,
  },
});
