import React from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, fonts, fontSizes, spacing, radius } from '@/lib/tokens';
import { PlanBadge } from '@/components';
import { useAuth } from '@/lib/auth-context';
import { useBillingStore } from '@/store';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SettingsRow {
  icon: string;
  label: string;
  route: string;
}

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const SETTINGS_ROWS: SettingsRow[] = [
  { icon: '\u{1F464}', label: 'Profile', route: '/(shared)/settings/profile' },
  { icon: '\u{1F4E7}', label: 'Billing', route: '/(shared)/settings/billing' },
  { icon: '\u{1F514}', label: 'Notifications', route: '/(shared)/settings/notifications' },
  { icon: '\u{1F512}', label: 'Security', route: '/(shared)/settings/security' },
  { icon: '\u{2753}', label: 'Help', route: '/(shared)/settings/help' },
];

const STATUS_LABELS: Record<string, string> = {
  trialing: 'Free trial',
  active: 'Active',
  past_due: 'Past due',
  canceled: 'Canceled',
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getInitials(name: string | null, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function SettingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const billing = useBillingStore();

  const plan = user?.plan ?? (billing.plan as 'solo' | 'business' | null) ?? 'solo';
  const subscriptionStatus = user?.subscription_status ?? billing.status ?? 'active';
  const statusLabel = STATUS_LABELS[subscriptionStatus] ?? subscriptionStatus;

  const displayName = user?.name ?? 'User';
  const displayEmail = user?.email ?? '';

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Screen Title ──────────────────────────────── */}
        <Text style={styles.screenTitle}>Settings</Text>

        {/* ── User Header ───────────────────────────────── */}
        <View style={styles.userHeader}>
          {user?.avatar_url ? (
            <Image
              source={{ uri: user.avatar_url }}
              style={styles.avatar}
              accessibilityLabel={`${displayName}'s avatar`}
            />
          ) : (
            <View style={styles.initialsCircle}>
              <Text style={styles.initialsText}>
                {getInitials(user?.name ?? null, displayEmail)}
              </Text>
            </View>
          )}

          <View style={styles.userInfo}>
            <Text style={styles.userName} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={styles.userEmail} numberOfLines={1}>
              {displayEmail}
            </Text>
          </View>
        </View>

        {/* ── Plan & Status ─────────────────────────────── */}
        <View style={styles.planRow}>
          <PlanBadge plan={plan} />
          <Text style={styles.statusText}>{statusLabel}</Text>
        </View>

        {/* ── Settings Rows ─────────────────────────────── */}
        <View style={styles.rowsContainer}>
          {SETTINGS_ROWS.map((row, index) => (
            <Pressable
              key={row.route}
              onPress={() => router.push(row.route as never)}
              style={({ pressed }) => [
                styles.row,
                index < SETTINGS_ROWS.length - 1 && styles.rowBorder,
                pressed && styles.rowPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`${row.label} settings`}
            >
              <Text style={styles.rowIcon}>{row.icon}</Text>
              <Text style={styles.rowLabel}>{row.label}</Text>
              <Text style={styles.chevron}>{'\u203A'}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const AVATAR_SIZE = 64;

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

  /* Screen title */
  screenTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.screenTitle,
    color: colors.white,
    marginBottom: spacing.xl,
  },

  /* User header */
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },
  initialsCircle: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: colors.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.hero,
    color: colors.white,
  },
  userInfo: {
    flex: 1,
    marginLeft: spacing.lg,
  },
  userName: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.subtitle,
    color: colors.white,
    marginBottom: spacing.xs,
  },
  userEmail: {
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    color: colors.midGrey,
  },

  /* Plan & status */
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  statusText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    color: colors.midGrey,
  },

  /* Settings rows */
  rowsContainer: {
    backgroundColor: colors.darkGrey,
    borderRadius: radius.card,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    minHeight: 48,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as never } : {}),
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: `${colors.lightGrey}26`, // 0.15 opacity (hex 26 ≈ 15%)
  },
  rowPressed: {
    opacity: 0.7,
  },
  rowIcon: {
    fontSize: fontSizes.screenTitle,
    width: 32,
    textAlign: 'center',
  },
  rowLabel: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: fontSizes.subtitle,
    color: colors.white,
    marginLeft: spacing.md,
  },
  chevron: {
    fontFamily: fonts.body,
    fontSize: fontSizes.hero,
    color: colors.midGrey,
  },
});
