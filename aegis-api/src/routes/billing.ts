import { Router, type Request, type Response } from 'express';
import Stripe from 'stripe';
import supabase from '../config/supabase';
import requireAuth from '../middleware/requireAuth';
import type { AuthenticatedRequest } from '../middleware/requireAuth';
import env from '../config/env';
import logger from '../utils/logger';
import { AppError } from '../utils/errors';
import { emit } from '../services/notificationBus';

const router = Router();
const stripe = new Stripe(env.STRIPE_SECRET_KEY);

function handleError(res: Response, err: unknown) {
  if (err instanceof AppError) {
    return res.status(err.status).json({
      error: err.message,
      code: err.code,
      statusCode: err.status,
    });
  }
  const error = err as Error;
  logger.error('Billing route error', { error: error.message });
  return res.status(500).json({
    error: 'An internal error occurred.',
    code: 'INTERNAL_ERROR',
    statusCode: 500,
  });
}

// ─── POST /billing/create-subscription ──────────────────────────

router.post('/create-subscription', requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.user.user_id;
  const { priceId } = req.body;

  if (!priceId) {
    return res.status(400).json({
      error: 'priceId is required.',
      code: 'MISSING_FIELDS',
      statusCode: 400,
    });
  }

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, stripe_customer_id')
      .eq('id', userId)
      .single();

    if (!profile) {
      return res.status(404).json({
        error: 'User not found.',
        code: 'USER_NOT_FOUND',
        statusCode: 404,
      });
    }

    // Reuse existing Stripe customer or create new
    let customerId = profile.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile.email,
        metadata: { user_id: userId },
      });
      customerId = customer.id;
    }

    // Create subscription with 14-day trial
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      trial_period_days: 14,
      payment_settings: {
        save_default_payment_method: 'on_subscription',
      },
      expand: ['pending_setup_intent'],
    });

    const setupIntent = subscription.pending_setup_intent as Stripe.SetupIntent | null;
    const clientSecret = setupIntent?.client_secret ?? null;

    // Determine plan from priceId
    const plan = priceId === env.STRIPE_BUSINESS_PRICE_ID ? 'business' : 'solo';

    // Store Stripe IDs on profile
    await supabase
      .from('profiles')
      .update({
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
        subscription_status: 'trialing',
        plan,
      })
      .eq('id', userId);

    return res.status(201).json({ clientSecret, subscriptionId: subscription.id });
  } catch (err) {
    return handleError(res, err);
  }
});

// ─── GET /billing/status ────────────────────────────────────────

router.get('/status', requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.user.user_id;

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan, subscription_status, stripe_subscription_id, stripe_customer_id')
      .eq('id', userId)
      .single();

    if (!profile || !profile.stripe_subscription_id) {
      return res.status(200).json({
        status: profile?.subscription_status ?? null,
        plan: profile?.plan ?? null,
        trialDaysRemaining: null,
        nextChargeDate: null,
        paymentMethod: null,
        amount: null,
        cancelAtPeriodEnd: false,
      });
    }

    const subscription = await stripe.subscriptions.retrieve(
      profile.stripe_subscription_id,
      { expand: ['default_payment_method'] },
    );

    // Trial days remaining
    let trialDaysRemaining: number | null = null;
    if (subscription.status === 'trialing' && subscription.trial_end) {
      trialDaysRemaining = Math.max(
        0,
        Math.ceil((subscription.trial_end * 1000 - Date.now()) / (1000 * 60 * 60 * 24)),
      );
    }

    // Next charge date
    const nextChargeDate = subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null;

    // Payment method
    let paymentMethod: { brand: string; last4: string } | null = null;
    const pm = subscription.default_payment_method;
    if (pm && typeof pm !== 'string' && pm.card) {
      paymentMethod = {
        brand: pm.card.brand,
        last4: pm.card.last4,
      };
    }

    // Amount
    const amount = subscription.items.data[0]?.price?.unit_amount
      ? subscription.items.data[0].price.unit_amount / 100
      : null;

    return res.status(200).json({
      status:
        subscription.status === 'trialing' ? 'trialing'
        : subscription.status === 'active' ? 'active'
        : subscription.status === 'past_due' ? 'past_due'
        : 'canceled',
      plan: profile.plan,
      trialDaysRemaining,
      nextChargeDate,
      paymentMethod,
      amount,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    });
  } catch (err) {
    return handleError(res, err);
  }
});

// ─── POST /billing/upgrade ──────────────────────────────────────

router.post('/upgrade', requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.user.user_id;

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_subscription_id')
      .eq('id', userId)
      .single();

    if (!profile?.stripe_subscription_id) {
      return res.status(400).json({
        error: 'No active subscription found.',
        code: 'NO_SUBSCRIPTION',
        statusCode: 400,
      });
    }

    const subscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
    const itemId = subscription.items.data[0].id;

    // Immediate switch to Business price with proration
    await stripe.subscriptions.update(profile.stripe_subscription_id, {
      items: [{ id: itemId, price: env.STRIPE_BUSINESS_PRICE_ID }],
      proration_behavior: 'create_prorations',
    });

    // Update profile
    await supabase
      .from('profiles')
      .update({ plan: 'business' })
      .eq('id', userId);

    await emit('plan_changed', userId, { from: 'solo', to: 'business' });

    return res.status(200).json({ success: true, plan: 'business' });
  } catch (err) {
    return handleError(res, err);
  }
});

// ─── POST /billing/downgrade ────────────────────────────────────

router.post('/downgrade', requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.user.user_id;

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_subscription_id')
      .eq('id', userId)
      .single();

    if (!profile?.stripe_subscription_id) {
      return res.status(400).json({
        error: 'No active subscription found.',
        code: 'NO_SUBSCRIPTION',
        statusCode: 400,
      });
    }

    const subscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
    const itemId = subscription.items.data[0].id;

    // Switch price with no proration — new price effective next billing cycle
    await stripe.subscriptions.update(profile.stripe_subscription_id, {
      cancel_at_period_end: false,
      items: [{ id: itemId, price: env.STRIPE_SOLO_PRICE_ID }],
      proration_behavior: 'none',
    });

    // Update profile plan
    await supabase
      .from('profiles')
      .update({ plan: 'solo' })
      .eq('id', userId);

    await emit('plan_changed', userId, { from: 'business', to: 'solo' });

    return res.status(200).json({ success: true, plan: 'solo' });
  } catch (err) {
    return handleError(res, err);
  }
});

// ─── POST /billing/cancel ───────────────────────────────────────

router.post('/cancel', requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.user.user_id;

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_subscription_id')
      .eq('id', userId)
      .single();

    if (!profile?.stripe_subscription_id) {
      return res.status(400).json({
        error: 'No active subscription found.',
        code: 'NO_SUBSCRIPTION',
        statusCode: 400,
      });
    }

    await stripe.subscriptions.update(profile.stripe_subscription_id, {
      cancel_at_period_end: true,
    });

    return res.status(200).json({
      success: true,
      message: 'Subscription will cancel at end of billing period.',
    });
  } catch (err) {
    return handleError(res, err);
  }
});

// ─── POST /billing/update-payment-method ────────────────────────

router.post('/update-payment-method', requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.user.user_id;

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    if (!profile?.stripe_customer_id) {
      return res.status(400).json({
        error: 'No Stripe customer found.',
        code: 'NO_CUSTOMER',
        statusCode: 400,
      });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${env.FRONTEND_URL}/settings/billing`,
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    return handleError(res, err);
  }
});

// ─── GET /billing/invoices ──────────────────────────────────────

router.get('/invoices', requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.user.user_id;
  const limit = Math.min(Number(req.query.limit) || 10, 100);
  const startingAfter = req.query.starting_after as string | undefined;

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    if (!profile?.stripe_customer_id) {
      return res.status(200).json({ invoices: [], hasMore: false });
    }

    const params: Stripe.InvoiceListParams = {
      customer: profile.stripe_customer_id,
      limit,
    };
    if (startingAfter) params.starting_after = startingAfter;

    const invoices = await stripe.invoices.list(params);

    const items = invoices.data.map((inv) => ({
      id: inv.id,
      date: inv.created ? new Date(inv.created * 1000).toISOString() : null,
      amount: inv.amount_paid != null ? inv.amount_paid / 100 : 0,
      status: inv.status,
      pdfUrl: inv.invoice_pdf,
    }));

    return res.status(200).json({ invoices: items, hasMore: invoices.has_more });
  } catch (err) {
    return handleError(res, err);
  }
});

// ─── POST /billing/connect/onboard ──────────────────────────────

router.post('/connect/onboard', requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.user.user_id;

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_connect_account_id, email')
      .eq('id', userId)
      .single();

    if (!profile) {
      return res.status(404).json({
        error: 'User not found.',
        code: 'USER_NOT_FOUND',
        statusCode: 404,
      });
    }

    // Create or reuse Express account
    let accountId = profile.stripe_connect_account_id;
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: profile.email,
        metadata: { user_id: userId },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });
      accountId = account.id;

      // Store the Connect account ID
      await supabase
        .from('profiles')
        .update({ stripe_connect_account_id: accountId })
        .eq('id', userId);
    }

    // Create Account Link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${env.FRONTEND_URL}/settings/billing?connect_refresh=true`,
      return_url: `${env.FRONTEND_URL}/settings/billing?connect_complete=true`,
      type: 'account_onboarding',
    });

    return res.status(200).json({ onboardingUrl: accountLink.url });
  } catch (err) {
    return handleError(res, err);
  }
});

// ─── GET /billing/connect/status ────────────────────────────────

router.get('/connect/status', requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.user.user_id;

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_connect_account_id')
      .eq('id', userId)
      .single();

    if (!profile?.stripe_connect_account_id) {
      return res.status(200).json({ isConnected: false, payoutsEnabled: false });
    }

    const account = await stripe.accounts.retrieve(profile.stripe_connect_account_id);

    return res.status(200).json({
      isConnected: true,
      payoutsEnabled: account.payouts_enabled ?? false,
    });
  } catch (err) {
    return handleError(res, err);
  }
});

export default router;
