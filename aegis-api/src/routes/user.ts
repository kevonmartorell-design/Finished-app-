import { Router, type Request, type Response } from 'express';
import supabase from '../config/supabase';
import requireAuth from '../middleware/requireAuth';
import type { AuthenticatedRequest } from '../middleware/requireAuth';
import * as sessionService from '../services/sessionService';
import { AppError } from '../utils/errors';
import env from '../config/env';
import logger from '../utils/logger';

const router = Router();

const USER_SELECT_FIELDS = 'id, email, name, plan, stripe_customer_id, stripe_connect_account_id, stripe_subscription_id, subscription_status, walkthrough_completed, avatar_url, two_fa_enabled, created_at';

function handleError(res: Response, err: unknown) {
  if (err instanceof AppError) {
    return res.status(err.status).json({
      error: err.message,
      code: err.code,
      statusCode: err.status,
    });
  }
  const error = err as Error;
  logger.error('User route error', { error: error.message });
  return res.status(500).json({
    error: 'An internal error occurred.',
    code: 'INTERNAL_ERROR',
    statusCode: 500,
  });
}

// ─── GET /user/me ────────────────────────────────────────────────

router.get('/me', requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;

  try {
    const { data: user, error } = await supabase
      .from('profiles')
      .select(USER_SELECT_FIELDS)
      .eq('id', authReq.user.user_id)
      .single();

    if (error || !user) {
      return res.status(404).json({
        error: 'User not found.',
        code: 'USER_NOT_FOUND',
        statusCode: 404,
      });
    }

    return res.status(200).json({ user });
  } catch (err) {
    return handleError(res, err);
  }
});

// ─── PUT /user/me ────────────────────────────────────────────────

router.put('/me', requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const { name, avatar_url, walkthrough_completed } = req.body;

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (avatar_url !== undefined) updates.avatar_url = avatar_url;
  if (walkthrough_completed !== undefined) updates.walkthrough_completed = walkthrough_completed;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({
      error: 'No fields to update.',
      code: 'MISSING_FIELDS',
      statusCode: 400,
    });
  }

  try {
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', authReq.user.user_id);

    if (error) {
      logger.error('Failed to update profile', { error: error.message });
      return res.status(500).json({
        error: 'Failed to update profile.',
        code: 'UPDATE_FAILED',
        statusCode: 500,
      });
    }

    const { data: user } = await supabase
      .from('profiles')
      .select(USER_SELECT_FIELDS)
      .eq('id', authReq.user.user_id)
      .single();

    return res.status(200).json({ user });
  } catch (err) {
    return handleError(res, err);
  }
});

// ─── DELETE /user/me (GDPR) ──────────────────────────────────────

router.delete('/me', requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.user.user_id;

  try {
    // Anonymize PII
    await supabase
      .from('profiles')
      .update({
        name: 'Deleted User',
        email: `deleted_${userId}@aegis.invalid`,
        avatar_url: null,
        password_hash: null,
        google_sub: null,
        apple_sub: null,
        two_fa_enabled: false,
      })
      .eq('id', userId);

    // Purge device tokens
    await supabase.from('device_tokens').delete().eq('user_id', userId);

    // Purge all sessions
    await sessionService.revokeAllSessions(userId);

    // Delete TOTP secrets
    await supabase.from('totp_secrets').delete().eq('user_id', userId);

    // Delete unlock and reset tokens
    await supabase.from('unlock_tokens').delete().eq('user_id', userId);
    await supabase.from('password_reset_tokens').delete().eq('user_id', userId);

    // TODO: Agent 2 handles Stripe subscription cancellation via webhook or direct call

    logger.info('User data anonymized (GDPR)', { user_id: userId });
    return res.status(200).json({ success: true, message: 'Account data has been anonymized.' });
  } catch (err) {
    return handleError(res, err);
  }
});

// ─── PUT /user/stripe-customer ───────────────────────────────────
// Service-to-service endpoint called by Agent 2 (Billing)

router.put('/stripe-customer', async (req: Request, res: Response) => {
  const serviceSecret = req.headers['x-internal-service-secret'];
  if (!serviceSecret || serviceSecret !== env.INTERNAL_SERVICE_SECRET) {
    logger.warn('Unauthorized attempt to write stripe-customer', { ip: req.ip });
    return res.status(403).json({
      error: 'Internal service secret required.',
      code: 'FORBIDDEN',
      statusCode: 403,
    });
  }

  const { user_id, stripe_customer_id, stripe_subscription_id, subscription_status } = req.body;

  if (!user_id || !stripe_customer_id) {
    return res.status(400).json({
      error: 'user_id and stripe_customer_id are required.',
      code: 'MISSING_FIELDS',
      statusCode: 400,
    });
  }

  try {
    const updates: Record<string, unknown> = { stripe_customer_id };
    if (stripe_subscription_id) updates.stripe_subscription_id = stripe_subscription_id;
    if (subscription_status) updates.subscription_status = subscription_status;

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user_id);

    if (error) {
      logger.error('Failed to update stripe_customer_id', { error: error.message });
      return res.status(500).json({
        error: 'Failed to update user record.',
        code: 'UPDATE_FAILED',
        statusCode: 500,
      });
    }

    logger.info('stripe_customer_id written', { user_id });
    return res.status(200).json({ success: true });
  } catch (err) {
    return handleError(res, err);
  }
});

export default router;
