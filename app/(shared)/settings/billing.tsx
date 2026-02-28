import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
  Linking,
  type ViewStyle,
} from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { useBillingStore } from '@/store';
import {
  AEGISButton,
  AEGISCard,
  AEGISModal,
  PlanBadge,
  StatusBadge,
  LoadingState,
  ErrorState,
  SectionHeader,
  TrialBanner,
} from '@/components';
import { colors, fonts, fontSizes, spacing } from '@/lib/tokens';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL;

// Map subscription status → StatusBadge variant
const STATUS_MAP: Record<string, 'active' | 'pending' | 'late' | 'inactive'> = {
  trialing: 'pending',
  active: 'active',
  past_due: 'late',
  canceled: 'inactive',
};

interface BillingStatusData {
  status: 'trialing' | 'active' | 'past_due' | 'canceled';
  plan: 'solo' | 'business';
  trialDaysRemaining: number | null;
  nextChargeDate: string | null;
  paymentMethod: { brand: string; last4: string } | null;
  amount: number | null;
  cancelAtPeriodEnd: boolean;
}

interface Invoice {
  id: string;
  date: string | null;
  amount: number;
  status: string | null;
  pdfUrl: string | null;
}

export default function BillingSettingsScreen() {
  const { accessToken } = useAuth();
  const billing = useBillingStore();

  const [billingStatus, setBillingStatus] = useState<BillingStatusData | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Modal state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showDowngradeModal, setShowDowngradeModal] = useState(false);

  // ─── Data Fetching ─────────────────────────────────────────────

  const fetchBillingStatus = useCallback(async () => {
    if (!accessToken) return;
    try {
      setError(null);
      const res = await fetch(`${API_BASE}/billing/status`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error('Failed to fetch billing status');
      const data = await res.json();
      setBillingStatus(data);
      billing.setStatus(data.status);
      billing.setPlan(data.plan);
      billing.setTrialDaysRemaining(data.trialDaysRemaining);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [accessToken]);

  const fetchInvoices = useCallback(async () => {
    if (!accessToken) return;
    try {
      const res = await fetch(`${API_BASE}/billing/invoices`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setInvoices(data.invoices ?? []);
    } catch {
      // Non-critical — invoices just won't show
    }
  }, [accessToken]);

  const loadData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchBillingStatus(), fetchInvoices()]);
    setLoading(false);
  }, [fetchBillingStatus, fetchInvoices]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ─── Actions ───────────────────────────────────────────────────

  const handleUpgrade = async () => {
    setActionLoading('upgrade');
    try {
      const res = await fetch(`${API_BASE}/billing/upgrade`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) throw new Error('Upgrade failed');
      await fetchBillingStatus();
    } catch {
      setError('Failed to upgrade. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDowngrade = async () => {
    setShowDowngradeModal(false);
    setActionLoading('downgrade');
    try {
      const res = await fetch(`${API_BASE}/billing/downgrade`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) throw new Error('Downgrade failed');
      await fetchBillingStatus();
    } catch {
      setError('Failed to downgrade. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async () => {
    setShowCancelModal(false);
    setActionLoading('cancel');
    try {
      const res = await fetch(`${API_BASE}/billing/cancel`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) throw new Error('Cancellation failed');
      await fetchBillingStatus();
    } catch {
      setError('Failed to cancel. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdatePayment = async () => {
    setActionLoading('payment');
    try {
      const res = await fetch(`${API_BASE}/billing/update-payment-method`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) throw new Error('Failed to get payment update URL');
      const data = await res.json();
      if (data.url) {
        await Linking.openURL(data.url);
      }
    } catch {
      setError('Failed to open payment update page.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDownloadInvoice = async (pdfUrl: string | null) => {
    if (!pdfUrl) return;
    await Linking.openURL(pdfUrl);
  };

  // ─── Loading / Error States ────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.screen}>
        <LoadingState message="Loading billing..." />
      </View>
    );
  }

  if (error && !billingStatus) {
    return (
      <View style={styles.screen}>
        <ErrorState message={error} onRetry={loadData} />
      </View>
    );
  }

  const status = billingStatus?.status ?? 'canceled';
  const plan = billingStatus?.plan ?? 'solo';
  const badgeStatus = STATUS_MAP[status] ?? 'inactive';

  // ─── Render ────────────────────────────────────────────────────

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Past Due Banner */}
      {status === 'past_due' && (
        <AEGISCard glowColor="orange" style={styles.pastDueBanner}>
          <Text style={styles.pastDueTitle}>Payment Failed</Text>
          <Text style={styles.pastDueBody}>
            Your payment failed. Update your card to keep access.
          </Text>
          <AEGISButton
            variant="primary"
            label="UPDATE CARD"
            onPress={handleUpdatePayment}
            loading={actionLoading === 'payment'}
          />
        </AEGISCard>
      )}

      {/* Trial Banner */}
      {status === 'trialing' && billingStatus?.trialDaysRemaining != null && (
        <TrialBanner
          daysRemaining={billingStatus.trialDaysRemaining}
          onUpgrade={plan === 'solo' ? handleUpgrade : undefined}
        />
      )}

      {/* Plan & Status */}
      <SectionHeader title="YOUR PLAN" />
      <AEGISCard style={styles.card}>
        <View style={styles.planRow}>
          <View style={styles.planInfo}>
            <Text style={styles.planLabel}>
              AEGIS {plan === 'business' ? 'Business' : 'Solo'}
            </Text>
            <View style={styles.badges}>
              <PlanBadge plan={plan as 'solo' | 'business'} />
              <StatusBadge status={badgeStatus} />
            </View>
          </View>
        </View>

        {billingStatus?.cancelAtPeriodEnd && (
          <Text style={styles.cancelNotice}>
            Cancels at end of billing period
          </Text>
        )}
      </AEGISCard>

      {/* Next Charge */}
      {billingStatus?.nextChargeDate && status !== 'canceled' && (
        <>
          <SectionHeader title="NEXT CHARGE" />
          <AEGISCard style={styles.card}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Amount</Text>
              <Text style={styles.detailValue}>
                ${billingStatus.amount?.toFixed(2) ?? '—'}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Date</Text>
              <Text style={styles.detailValue}>
                {new Date(billingStatus.nextChargeDate).toLocaleDateString()}
              </Text>
            </View>
          </AEGISCard>
        </>
      )}

      {/* Payment Method */}
      <SectionHeader title="PAYMENT METHOD" />
      <AEGISCard style={styles.card}>
        {billingStatus?.paymentMethod ? (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Card</Text>
            <Text style={styles.detailValue}>
              {billingStatus.paymentMethod.brand.toUpperCase()} ••••{' '}
              {billingStatus.paymentMethod.last4}
            </Text>
          </View>
        ) : (
          <Text style={styles.detailLabel}>No payment method on file</Text>
        )}
        <View style={styles.buttonSpacer} />
        <AEGISButton
          variant="secondary"
          label="UPDATE PAYMENT METHOD"
          onPress={handleUpdatePayment}
          loading={actionLoading === 'payment'}
        />
      </AEGISCard>

      {/* Invoice History */}
      <SectionHeader title="INVOICES" />
      {invoices.length > 0 ? (
        invoices.map((inv) => (
          <AEGISCard key={inv.id} style={styles.invoiceCard}>
            <View style={styles.invoiceRow}>
              <View>
                <Text style={styles.invoiceDate}>
                  {inv.date ? new Date(inv.date).toLocaleDateString() : '—'}
                </Text>
                <Text style={styles.invoiceAmount}>
                  ${inv.amount.toFixed(2)}
                </Text>
              </View>
              <View style={styles.invoiceActions}>
                <StatusBadge
                  status={
                    inv.status === 'paid' ? 'active'
                    : inv.status === 'open' ? 'pending'
                    : 'error'
                  }
                />
                {inv.pdfUrl && (
                  <Pressable
                    onPress={() => handleDownloadInvoice(inv.pdfUrl)}
                    style={({ pressed }) => [
                      styles.pdfLink,
                      pressed && { opacity: 0.6 },
                      Platform.OS === 'web' && ({ cursor: 'pointer' } as ViewStyle),
                    ]}
                  >
                    <Text style={styles.pdfLinkText}>PDF</Text>
                  </Pressable>
                )}
              </View>
            </View>
          </AEGISCard>
        ))
      ) : (
        <AEGISCard style={styles.card}>
          <Text style={styles.detailLabel}>No invoices yet</Text>
        </AEGISCard>
      )}

      {/* Plan Actions */}
      <SectionHeader title="MANAGE PLAN" />
      <View style={styles.actionsSection}>
        {plan === 'solo' && status !== 'canceled' && (
          <AEGISButton
            variant="primary"
            label="UPGRADE TO BUSINESS"
            onPress={handleUpgrade}
            loading={actionLoading === 'upgrade'}
          />
        )}

        {plan === 'business' && status !== 'canceled' && (
          <AEGISButton
            variant="secondary"
            label="DOWNGRADE TO SOLO"
            onPress={() => setShowDowngradeModal(true)}
            loading={actionLoading === 'downgrade'}
          />
        )}

        {status !== 'canceled' && !billingStatus?.cancelAtPeriodEnd && (
          <AEGISButton
            variant="destructive"
            label="CANCEL SUBSCRIPTION"
            onPress={() => setShowCancelModal(true)}
            loading={actionLoading === 'cancel'}
          />
        )}
      </View>

      {/* Downgrade Confirmation Modal */}
      <AEGISModal
        visible={showDowngradeModal}
        title="Downgrade to Solo?"
        onClose={() => setShowDowngradeModal(false)}
        actions={
          <>
            <AEGISButton
              variant="secondary"
              label="KEEP BUSINESS"
              onPress={() => setShowDowngradeModal(false)}
            />
            <AEGISButton
              variant="destructive"
              label="DOWNGRADE"
              onPress={handleDowngrade}
            />
          </>
        }
      >
        <Text style={styles.modalBody}>
          You will lose access to the following features at the end of your
          billing period:
        </Text>
        <Text style={styles.modalList}>
          {'\u2022'} Team management{'\n'}
          {'\u2022'} Payroll processing{'\n'}
          {'\u2022'} Department management{'\n'}
          {'\u2022'} Audit logs{'\n'}
          {'\u2022'} Advanced reports
        </Text>
      </AEGISModal>

      {/* Cancel Confirmation Modal */}
      <AEGISModal
        visible={showCancelModal}
        title="Cancel Subscription?"
        onClose={() => setShowCancelModal(false)}
        actions={
          <>
            <AEGISButton
              variant="secondary"
              label="KEEP PLAN"
              onPress={() => setShowCancelModal(false)}
            />
            <AEGISButton
              variant="destructive"
              label="CANCEL"
              onPress={handleCancel}
            />
          </>
        }
      >
        <Text style={styles.modalBody}>
          Your subscription will remain active until the end of your current
          billing period. After that, you will lose access to all features.
        </Text>
      </AEGISModal>
    </ScrollView>
  );
}

// ─── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.appBg,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2,
    gap: spacing.md,
  },
  card: {
    marginBottom: spacing.sm,
  },

  // Plan section
  planRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planInfo: {
    gap: spacing.sm,
  },
  planLabel: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.screenTitle,
    color: colors.white,
  },
  badges: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cancelNotice: {
    fontFamily: fonts.body,
    fontSize: fontSizes.label,
    color: colors.warningAmber,
    marginTop: spacing.sm,
  },

  // Detail rows
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  detailLabel: {
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    color: colors.midGrey,
  },
  detailValue: {
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    color: colors.white,
    fontWeight: '500',
  },
  buttonSpacer: {
    height: spacing.md,
  },

  // Invoices
  invoiceCard: {
    marginBottom: spacing.sm,
  },
  invoiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  invoiceDate: {
    fontFamily: fonts.body,
    fontSize: fontSizes.label,
    color: colors.midGrey,
  },
  invoiceAmount: {
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    color: colors.white,
    fontWeight: '500',
  },
  invoiceActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pdfLink: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  pdfLinkText: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.label,
    color: colors.orange,
    letterSpacing: 1,
  },

  // Past due banner
  pastDueBanner: {
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  pastDueTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.subtitle,
    color: colors.orange,
  },
  pastDueBody: {
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    color: colors.white,
  },

  // Actions
  actionsSection: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },

  // Modal content
  modalBody: {
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    color: colors.white,
    marginBottom: spacing.md,
  },
  modalList: {
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    color: colors.midGrey,
    lineHeight: 22,
  },
});
