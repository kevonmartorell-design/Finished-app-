import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Switch,
  StyleSheet,
  Platform,
  type ViewStyle,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, fonts, fontSizes, spacing, radius } from '@/lib/tokens';
import {
  AEGISButton,
  AEGISCard,
  SectionHeader,
  LoadingState,
  ErrorState,
} from '@/components';
import { useAuth } from '@/lib/auth-context';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Session {
  id: string;
  device_name: string;
  last_active: string;
  is_current: boolean;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const MIN_TAP_TARGET = 48;
const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function SecuritySettingsScreen() {
  const router = useRouter();
  const { accessToken } = useAuth();

  /* ── Local state ──────────────────────────────────────────────── */
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  /* ── Fetch sessions ───────────────────────────────────────────── */
  const fetchSessions = useCallback(async () => {
    setSessionsLoading(true);
    setSessionsError(null);

    try {
      const response = await fetch(`${API_BASE}/auth/sessions`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to load sessions (${response.status})`);
      }

      const data: Session[] = await response.json();
      setSessions(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Could not load sessions';
      setSessionsError(message);
    } finally {
      setSessionsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  /* ── Revoke a session ─────────────────────────────────────────── */
  const revokeSession = async (sessionId: string) => {
    setRevokingId(sessionId);

    try {
      const response = await fetch(`${API_BASE}/auth/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to revoke session (${response.status})`);
      }

      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch {
      // Silently fail for now; a toast can be added later
    } finally {
      setRevokingId(null);
    }
  };

  /* ── 2FA toggle handler ───────────────────────────────────────── */
  const handleTwoFactorToggle = (value: boolean) => {
    if (value) {
      // Navigate to Agent 1's 2FA setup flow
      router.push('/(auth)/two-factor' as never);
    }
    setTwoFactorEnabled(value);
  };

  /* ── Biometric toggle handler ─────────────────────────────────── */
  const handleBiometricToggle = (value: boolean) => {
    // TODO: Agent 1 implements biometric enrollment logic
    setBiometricEnabled(value);
  };

  /* ── Render ───────────────────────────────────────────────────── */
  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Back Button ────────────────────────────────── */}
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={8}
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.pressed,
            Platform.OS === 'web' && ({ cursor: 'pointer' } as ViewStyle),
          ]}
        >
          <Text style={styles.backArrow}>{'\u2039'}</Text>
          <Text style={styles.backLabel}>Back</Text>
        </Pressable>

        {/* ── Screen Title ───────────────────────────────── */}
        <Text style={styles.screenTitle}>Security</Text>

        {/* ── 2FA Section ────────────────────────────────── */}
        <SectionHeader title="Two-Factor Authentication" />
        <AEGISCard style={styles.sectionCard}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleLabelGroup}>
              <Text style={styles.toggleLabel}>Two-Factor Auth</Text>
              <Text style={styles.toggleStatus}>
                {twoFactorEnabled ? 'Enabled' : 'Disabled'}
              </Text>
            </View>
            <Switch
              value={twoFactorEnabled}
              onValueChange={handleTwoFactorToggle}
              trackColor={{
                false: colors.darkGrey,
                true: colors.purple,
              }}
              thumbColor={colors.white}
              accessibilityLabel="Toggle two-factor authentication"
              style={styles.switchMinTap}
            />
          </View>
          {/* TODO: Agent 1 implements the actual 2FA flow */}
        </AEGISCard>

        {/* ── Biometric Section ──────────────────────────── */}
        <SectionHeader title="Biometric Login" />
        <AEGISCard style={styles.sectionCard}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleLabelGroup}>
              <Text style={styles.toggleLabel}>Biometric Unlock</Text>
              <Text style={styles.toggleStatus}>
                {biometricEnabled ? 'Enabled' : 'Disabled'}
              </Text>
            </View>
            <Switch
              value={biometricEnabled}
              onValueChange={handleBiometricToggle}
              trackColor={{
                false: colors.darkGrey,
                true: colors.purple,
              }}
              thumbColor={colors.white}
              accessibilityLabel="Toggle biometric login"
              style={styles.switchMinTap}
            />
          </View>
          {/* TODO: Agent 1 implements biometric enrollment logic */}
          <Text style={styles.biometricDescription}>
            Use Face ID or fingerprint to unlock AEGIS
          </Text>
        </AEGISCard>

        {/* ── Active Sessions Section ────────────────────── */}
        <SectionHeader title="Active Sessions" />

        {sessionsLoading && <LoadingState message="Loading sessions..." />}

        {sessionsError && (
          <ErrorState message={sessionsError} onRetry={fetchSessions} />
        )}

        {!sessionsLoading && !sessionsError && sessions.length === 0 && (
          <AEGISCard style={styles.sectionCard}>
            <Text style={styles.emptyText}>No active sessions found.</Text>
          </AEGISCard>
        )}

        {!sessionsLoading &&
          !sessionsError &&
          sessions.map((session) => (
            <AEGISCard key={session.id} style={styles.sessionCard}>
              <View style={styles.sessionRow}>
                <View style={styles.sessionInfo}>
                  <View style={styles.deviceRow}>
                    <Text style={styles.deviceName}>
                      {session.device_name}
                    </Text>
                    {session.is_current && (
                      <Text style={styles.currentBadge}>(This device)</Text>
                    )}
                  </View>
                  <Text style={styles.lastActive}>
                    Last active: {session.last_active}
                  </Text>
                </View>

                {!session.is_current && (
                  <View style={styles.revokeWrapper}>
                    <AEGISButton
                      variant="destructive"
                      label="Revoke"
                      onPress={() => revokeSession(session.id)}
                      loading={revokingId === session.id}
                    />
                  </View>
                )}
              </View>
            </AEGISCard>
          ))}
      </ScrollView>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

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

  /* Back navigation */
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: MIN_TAP_TARGET,
    minWidth: MIN_TAP_TARGET,
    marginBottom: spacing.sm,
    alignSelf: 'flex-start',
  },
  backArrow: {
    fontFamily: fonts.body,
    fontSize: fontSizes.hero,
    color: colors.purple,
    marginRight: spacing.xs,
    lineHeight: fontSizes.hero + 4,
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

  /* Section card spacing */
  sectionCard: {
    marginBottom: spacing.xl,
  },

  /* Toggle rows */
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: MIN_TAP_TARGET,
  },
  toggleLabelGroup: {
    flex: 1,
    marginRight: spacing.md,
  },
  toggleLabel: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.subtitle,
    color: colors.white,
    marginBottom: spacing.xs,
  },
  toggleStatus: {
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    color: colors.midGrey,
  },
  switchMinTap: {
    minWidth: MIN_TAP_TARGET,
    minHeight: MIN_TAP_TARGET,
  },

  /* Biometric description */
  biometricDescription: {
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    color: colors.midGrey,
    marginTop: spacing.md,
  },

  /* Sessions */
  sessionCard: {
    marginBottom: spacing.md,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: MIN_TAP_TARGET,
  },
  sessionInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  deviceName: {
    fontFamily: fonts.body,
    fontSize: fontSizes.subtitle,
    color: colors.white,
  },
  currentBadge: {
    fontFamily: fonts.body,
    fontSize: fontSizes.label,
    color: colors.successGreen,
  },
  lastActive: {
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    color: colors.midGrey,
    marginTop: spacing.xs,
  },
  revokeWrapper: {
    flexShrink: 0,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    color: colors.midGrey,
    textAlign: 'center',
  },
});
