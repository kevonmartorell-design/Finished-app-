import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts, fontSizes, spacing, radius } from '@/lib/tokens';
import { AEGISCard } from './aegis-card';
import { StatusBadge } from './status-badge';

type ShiftStatus = 'active' | 'pending' | 'late' | 'inactive' | 'error';

interface ShiftCardProps {
  name: string;
  role: string;
  time: string;
  status: ShiftStatus;
  dept?: string;
}

export function ShiftCard({ name, role, time, status, dept }: ShiftCardProps) {
  return (
    <AEGISCard>
      {/* Row 1 — Name + Status */}
      <View style={styles.topRow}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <StatusBadge status={status} />
      </View>

      {/* Row 2 — Role */}
      <Text style={styles.role} numberOfLines={1}>
        {role}
      </Text>

      {/* Row 3 — Time with clock icon */}
      <View style={styles.timeRow}>
        <Text style={styles.clockIcon} accessibilityLabel="Clock">
          🕐
        </Text>
        <Text style={styles.time} numberOfLines={1}>
          {time}
        </Text>
      </View>

      {/* Optional department badge */}
      {dept ? (
        <View style={styles.deptContainer}>
          <View style={styles.deptBadge}>
            <Text style={styles.deptText}>{dept}</Text>
          </View>
        </View>
      ) : null}
    </AEGISCard>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  /* ---- Row 1 ---- */
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.subtitle,
    color: colors.white,
    flexShrink: 1,
    marginRight: spacing.sm,
  },

  /* ---- Row 2 ---- */
  role: {
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    color: colors.midGrey,
    marginTop: spacing.sm,
  },

  /* ---- Row 3 ---- */
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  clockIcon: {
    fontSize: fontSizes.body,
    marginRight: spacing.xs,
  },
  time: {
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    color: colors.midGrey,
  },

  /* ---- Department badge ---- */
  deptContainer: {
    flexDirection: 'row',
    marginTop: spacing.sm,
  },
  deptBadge: {
    backgroundColor: `${colors.purple}26`, // purple at ~15% opacity
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  deptText: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.label,
    color: colors.purple,
  },
});
