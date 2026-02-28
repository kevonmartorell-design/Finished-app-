import { Router, type Request, type Response } from 'express';
import * as authService from '../services/authService';
import * as sessionService from '../services/sessionService';
import * as totpService from '../services/totpService';
import * as passwordResetService from '../services/passwordResetService';
import * as socialAuthService from '../services/socialAuthService';
import * as inviteService from '../services/inviteService';
import requireAuth from '../middleware/requireAuth';
import type { AuthenticatedRequest } from '../middleware/requireAuth';
import { authLimiter } from '../middleware/rateLimit';
import { AppError } from '../utils/errors';
import logger from '../utils/logger';

const router = Router();

// ─── Helpers ─────────────────────────────────────────────────────

function getDeviceInfo(req: Request) {
  return {
    ip: req.ip || null,
    userAgent: req.headers['user-agent'] || '',
  };
}

function handleError(res: Response, err: unknown) {
  if (err instanceof AppError) {
    return res.status(err.status).json({
      error: err.message,
      code: err.code,
      statusCode: err.status,
    });
  }
  const error = err as Error;
  logger.error('Unhandled error', { error: error.message });
  return res.status(500).json({
    error: 'An internal error occurred.',
    code: 'INTERNAL_ERROR',
    statusCode: 500,
  });
}

// ─── POST /auth/register ─────────────────────────────────────────

router.post('/register', authLimiter, async (req: Request, res: Response) => {
  const { email, password, name } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: 'Email and password are required.',
      code: 'MISSING_FIELDS',
      statusCode: 400,
    });
  }

  try {
    const result = await authService.register({ email, password, name }, getDeviceInfo(req));
    return res.status(201).json(result);
  } catch (err) {
    return handleError(res, err);
  }
});

// ─── POST /auth/login ────────────────────────────────────────────

router.post('/login', authLimiter, async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: 'Email and password are required.',
      code: 'MISSING_FIELDS',
      statusCode: 400,
    });
  }

  try {
    const result = await authService.loginWithPassword({ email, password }, getDeviceInfo(req));
    return res.status(200).json(result);
  } catch (err) {
    return handleError(res, err);
  }
});

// ─── POST /auth/social/google ────────────────────────────────────

router.post('/social/google', async (req: Request, res: Response) => {
  const { id_token, name } = req.body;

  if (!id_token) {
    return res.status(400).json({
      error: 'id_token is required.',
      code: 'MISSING_FIELDS',
      statusCode: 400,
    });
  }

  try {
    const googleUser = await socialAuthService.verifyGoogleToken(id_token);
    const { user, isNew } = await socialAuthService.findOrCreateSocialUser({
      provider: 'google',
      provider_sub: googleUser.provider_sub,
      email: googleUser.email,
      name: name || googleUser.name,
    });

    const { access_token, refresh_token } = await sessionService.createSession(
      (user as { id: string }).id,
      getDeviceInfo(req)
    );

    return res.status(200).json({
      user,
      accessToken: access_token,
      refreshToken: refresh_token,
      is_new_user: isNew,
    });
  } catch (err) {
    return handleError(res, err);
  }
});

// ─── POST /auth/social/apple ─────────────────────────────────────

router.post('/social/apple', async (req: Request, res: Response) => {
  const { id_token, name, nonce } = req.body;

  if (!id_token) {
    return res.status(400).json({
      error: 'id_token is required.',
      code: 'MISSING_FIELDS',
      statusCode: 400,
    });
  }

  try {
    const appleUser = await socialAuthService.verifyAppleToken(id_token, nonce);
    const { user, isNew } = await socialAuthService.findOrCreateSocialUser({
      provider: 'apple',
      provider_sub: appleUser.provider_sub,
      email: appleUser.email,
      name: name || appleUser.name,
    });

    const { access_token, refresh_token } = await sessionService.createSession(
      (user as { id: string }).id,
      getDeviceInfo(req)
    );

    return res.status(200).json({
      user,
      accessToken: access_token,
      refreshToken: refresh_token,
      is_new_user: isNew,
    });
  } catch (err) {
    return handleError(res, err);
  }
});

// ─── POST /auth/refresh ──────────────────────────────────────────

router.post('/refresh', async (req: Request, res: Response) => {
  const { refresh_token } = req.body;

  if (!refresh_token) {
    return res.status(400).json({
      error: 'refresh_token is required.',
      code: 'MISSING_FIELDS',
      statusCode: 400,
    });
  }

  try {
    const tokens = await sessionService.rotateRefreshToken(refresh_token);
    return res.status(200).json(tokens);
  } catch (err) {
    return handleError(res, err);
  }
});

// ─── POST /auth/logout ───────────────────────────────────────────

router.post('/logout', requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const { refresh_token } = req.body;

  try {
    if (refresh_token) {
      const { verifyToken } = await import('../utils/jwt');
      try {
        const decoded = verifyToken(refresh_token, 'refresh');
        if ('session_id' in decoded) {
          await sessionService.revokeSession(decoded.session_id, authReq.user.user_id);
        }
      } catch {
        // Token already expired/invalid — still return success (idempotent logout)
      }
    }
    return res.status(200).json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    return handleError(res, err);
  }
});

// ─── POST /auth/2fa/setup ────────────────────────────────────────

router.post('/2fa/setup', requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;

  try {
    const result = await totpService.generateSecret(authReq.user.user_id, '');
    return res.status(200).json(result);
  } catch (err) {
    return handleError(res, err);
  }
});

// ─── POST /auth/2fa/verify ───────────────────────────────────────

router.post('/2fa/verify', authLimiter, requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const { code, user_id } = req.body;
  const targetUserId = user_id || authReq.user.user_id;

  if (!code) {
    return res.status(400).json({
      error: 'code is required.',
      code: 'MISSING_FIELDS',
      statusCode: 400,
    });
  }

  try {
    const result = await totpService.verifyCode(targetUserId, code);

    // If this was a login verification (pre_auth_token flow), issue real session tokens
    if (authReq.user.plan === '__pre_auth__') {
      const { access_token, refresh_token } = await sessionService.createSession(
        targetUserId,
        getDeviceInfo(req)
      );

      const supabase = (await import('../config/supabase')).default;
      const { data: user } = await supabase
        .from('profiles')
        .select('id, email, name, plan, stripe_customer_id, stripe_connect_account_id, stripe_subscription_id, subscription_status, walkthrough_completed, avatar_url, two_fa_enabled, created_at')
        .eq('id', targetUserId)
        .single();

      return res.status(200).json({ user, accessToken: access_token, refreshToken: refresh_token });
    }

    return res.status(200).json(result);
  } catch (err) {
    return handleError(res, err);
  }
});

// ─── POST /auth/2fa/disable ─────────────────────────────────────

router.post('/2fa/disable', requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;

  try {
    const result = await totpService.disable2FA(authReq.user.user_id);
    return res.status(200).json(result);
  } catch (err) {
    return handleError(res, err);
  }
});

// ─── POST /auth/password/forgot ──────────────────────────────────

router.post('/password/forgot', authLimiter, async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      error: 'Email is required.',
      code: 'MISSING_FIELDS',
      statusCode: 400,
    });
  }

  try {
    const result = await passwordResetService.requestReset(email);
    return res.status(200).json(result);
  } catch (err) {
    return handleError(res, err);
  }
});

// ─── POST /auth/password/reset ───────────────────────────────────

router.post('/password/reset', async (req: Request, res: Response) => {
  const { token, new_password } = req.body;

  if (!token || !new_password) {
    return res.status(400).json({
      error: 'token and new_password are required.',
      code: 'MISSING_FIELDS',
      statusCode: 400,
    });
  }

  try {
    const result = await passwordResetService.resetPassword(token, new_password);
    return res.status(200).json(result);
  } catch (err) {
    return handleError(res, err);
  }
});

// ─── POST /auth/unlock ───────────────────────────────────────────

router.post('/unlock', async (req: Request, res: Response) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({
      error: 'token is required.',
      code: 'MISSING_FIELDS',
      statusCode: 400,
    });
  }

  try {
    const result = await authService.unlockAccount(token);
    return res.status(200).json(result);
  } catch (err) {
    return handleError(res, err);
  }
});

// ─── GET /auth/sessions ──────────────────────────────────────────

router.get('/sessions', requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;

  try {
    const sessions = await sessionService.listSessions(authReq.user.user_id);
    return res.status(200).json({ sessions });
  } catch (err) {
    return handleError(res, err);
  }
});

// ─── DELETE /auth/sessions/:id ───────────────────────────────────

router.delete('/sessions/:id', requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const { id } = req.params;

  try {
    await sessionService.revokeSession(id, authReq.user.user_id);
    return res.status(200).json({ success: true });
  } catch (err) {
    return handleError(res, err);
  }
});

// ─── POST /auth/invite/accept ────────────────────────────────────

router.post('/invite/accept', authLimiter, async (req: Request, res: Response) => {
  const { invite_token, password } = req.body;

  if (!invite_token) {
    return res.status(400).json({
      error: 'invite_token is required.',
      code: 'MISSING_FIELDS',
      statusCode: 400,
    });
  }

  try {
    const result = await inviteService.acceptInvite(
      { invite_token, password },
      getDeviceInfo(req)
    );
    return res.status(200).json(result);
  } catch (err) {
    return handleError(res, err);
  }
});

export default router;
