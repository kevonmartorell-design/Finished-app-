import type { Request, Response } from 'express';
import Stripe from 'stripe';
import supabase from '../config/supabase';
import env from '../config/env';
import logger from '../utils/logger';
import { emit } from '../services/notificationBus';

const stripe = new Stripe(env.STRIPE_SECRET_KEY);

// ─── Helpers ────────────────────────────────────────────────────

async function getUserIdByCustomer(customerId: string): Promise<string | null> {
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();
  return data?.id ?? null;
}

function mapStripeStatus(
  stripeStatus: Stripe.Subscription.Status,
): 'trialing' | 'active' | 'past_due' | 'canceled' {
  switch (stripeStatus) {
    case 'trialing':
      return 'trialing';
    case 'active':
      return 'active';
    case 'past_due':
      return 'past_due';
    case 'canceled':
    case 'unpaid':
    case 'incomplete_expired':
      return 'canceled';
    default:
      return 'active';
  }
}

// ─── Webhook Handler ────────────────────────────────────────────

export default async function stripeWebhookHandler(req: Request, res: Response) {
  const sig = req.headers['stripe-signature'] as string | undefined;

  if (!sig) {
    return res.status(400).json({ error: 'Missing stripe-signature header.' });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    logger.warn('Stripe webhook signature verification failed', {
      error: (err as Error).message,
    });
    return res.status(400).json({ error: 'Invalid signature.' });
  }

  try {
    switch (event.type) {
      // ── Trial ending soon ──────────────────────────────────────
      case 'customer.subscription.trial_will_end': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const userId = await getUserIdByCustomer(customerId);
        if (userId) {
          const trialEnd = subscription.trial_end;
          const daysRemaining = trialEnd
            ? Math.ceil((trialEnd * 1000 - Date.now()) / (1000 * 60 * 60 * 24))
            : 0;
          await emit('trial_will_end', userId, { daysRemaining });
        }
        break;
      }

      // ── Subscription updated (plan/status sync) ───────────────
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const userId = await getUserIdByCustomer(customerId);
        if (userId) {
          const priceId = subscription.items.data[0]?.price?.id;
          const plan = priceId === env.STRIPE_BUSINESS_PRICE_ID ? 'business' : 'solo';
          const status = mapStripeStatus(subscription.status);

          await supabase
            .from('profiles')
            .update({
              plan,
              subscription_status: status,
              stripe_subscription_id: subscription.id,
            })
            .eq('id', userId);
        }
        break;
      }

      // ── Subscription deleted (lock account) ───────────────────
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const userId = await getUserIdByCustomer(customerId);
        if (userId) {
          await supabase
            .from('profiles')
            .update({ subscription_status: 'canceled' })
            .eq('id', userId);
          await emit('account_locked', userId, {});
        }
        break;
      }

      // ── Payment failed → past_due ─────────────────────────────
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        const userId = await getUserIdByCustomer(customerId);
        if (userId) {
          await supabase
            .from('profiles')
            .update({ subscription_status: 'past_due' })
            .eq('id', userId);
          await emit('payment_failed', userId, {
            amount: invoice.amount_due,
            invoiceId: invoice.id,
          });
        }
        break;
      }

      // ── Payment succeeded → active ────────────────────────────
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        const userId = await getUserIdByCustomer(customerId);
        if (userId) {
          await supabase
            .from('profiles')
            .update({ subscription_status: 'active' })
            .eq('id', userId);
          await emit('payment_succeeded', userId, {
            amount: invoice.amount_paid,
            invoiceId: invoice.id,
          });
        }
        break;
      }

      // ── Connect onboarding completed ──────────────────────────
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.metadata?.connect_user_id) {
          await supabase
            .from('profiles')
            .update({
              stripe_connect_account_id: session.metadata.connect_account_id,
            })
            .eq('id', session.metadata.connect_user_id);
        }
        break;
      }

      // ── Connect account updated ───────────────────────────────
      case 'account.updated': {
        const account = event.data.object as Stripe.Account;
        if (account.metadata?.user_id) {
          await supabase
            .from('profiles')
            .update({ stripe_connect_account_id: account.id })
            .eq('id', account.metadata.user_id);
        }
        break;
      }

      default:
        logger.info('Unhandled Stripe event type', { type: event.type });
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    logger.error('Error processing Stripe webhook', {
      error: (err as Error).message,
      type: event.type,
    });
    return res.status(500).json({ error: 'Webhook handler error.' });
  }
}
