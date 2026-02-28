import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  useWindowDimensions,
  type ViewStyle,
} from 'react-native';
import { colors, fonts, fontSizes, spacing, radius } from '@/lib/tokens';

interface Tab {
  key: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

interface BottomTabBarProps {
  tabs: Tab[];
  activeRoute: string;
  onTabPress: (key: string) => void;
}

const MIN_TAP_TARGET = 48;
const SIDEBAR_WIDTH = 72;
const SIDEBAR_BREAKPOINT = 768;
const MAX_TABS = 5;
const BADGE_SIZE = 18;
const INDICATOR_DOT_SIZE = 5;

export function BottomTabBar({
  tabs,
  activeRoute,
  onTabPress,
}: BottomTabBarProps) {
  const { width } = useWindowDimensions();
  const isSidebar = width >= SIDEBAR_BREAKPOINT;
  const visibleTabs = tabs.slice(0, MAX_TABS);

  if (isSidebar) {
    return (
      <View style={styles.sidebar}>
        {visibleTabs.map((tab) => {
          const isActive = tab.key === activeRoute;
          return (
            <Pressable
              key={tab.key}
              onPress={() => onTabPress(tab.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={tab.label}
              style={({ pressed }) => [
                styles.sidebarTab,
                pressed && styles.pressed,
                Platform.OS === 'web' && ({ cursor: 'pointer' } as ViewStyle),
              ]}
            >
              <View style={styles.iconContainer}>
                {tab.icon}
                {tab.badge != null && tab.badge > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {tab.badge > 99 ? '99+' : tab.badge}
                    </Text>
                  </View>
                )}
              </View>
              <Text
                style={[
                  styles.label,
                  { color: isActive ? colors.purple : colors.midGrey },
                ]}
                numberOfLines={1}
              >
                {tab.label}
              </Text>
              {isActive && <View style={styles.indicatorDot} />}
            </Pressable>
          );
        })}
      </View>
    );
  }

  return (
    <View style={styles.bottomBar}>
      {visibleTabs.map((tab) => {
        const isActive = tab.key === activeRoute;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onTabPress(tab.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={tab.label}
            style={({ pressed }) => [
              styles.bottomTab,
              pressed && styles.pressed,
              Platform.OS === 'web' && ({ cursor: 'pointer' } as ViewStyle),
            ]}
          >
            <View style={styles.iconContainer}>
              {tab.icon}
              {tab.badge != null && tab.badge > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </Text>
                </View>
              )}
            </View>
            <Text
              style={[
                styles.label,
                { color: isActive ? colors.purple : colors.midGrey },
              ]}
              numberOfLines={1}
            >
              {tab.label}
            </Text>
            {isActive && <View style={styles.indicatorDot} />}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  /* ---- Bottom bar (mobile) ---- */
  bottomBar: {
    flexDirection: 'row',
    backgroundColor: colors.darkGrey,
    borderTopWidth: 1,
    borderTopColor: `${colors.lightGrey}26`, // lightGrey at ~0.15 opacity
    paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.sm,
    paddingTop: spacing.sm,
  },
  bottomTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: MIN_TAP_TARGET,
    minWidth: MIN_TAP_TARGET,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },

  /* ---- Sidebar (web / wide) ---- */
  sidebar: {
    width: SIDEBAR_WIDTH,
    backgroundColor: colors.darkGrey,
    borderRightWidth: 1,
    borderRightColor: `${colors.lightGrey}26`, // lightGrey at ~0.15 opacity
    paddingTop: spacing.xl,
    alignItems: 'center',
    gap: spacing.lg,
  },
  sidebarTab: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: MIN_TAP_TARGET,
    minWidth: MIN_TAP_TARGET,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },

  /* ---- Shared ---- */
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
  },
  label: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.label,
    textAlign: 'center',
  },
  indicatorDot: {
    width: INDICATOR_DOT_SIZE,
    height: INDICATOR_DOT_SIZE,
    borderRadius: INDICATOR_DOT_SIZE / 2,
    backgroundColor: colors.purple,
    marginTop: spacing.xs,
  },

  /* ---- Badge ---- */
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: radius.badge,
    backgroundColor: colors.errorRed,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.white,
    fontWeight: '700',
    textAlign: 'center',
  },

  /* ---- Interaction ---- */
  pressed: {
    opacity: 0.6,
  },
});
