import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import supabase from '../config/supabase';
import { signAccessToken, signRefreshToken, verifyToken, type RefreshTokenPayload } from '../utils/jwt';
import { AppError } from '../utils/errors';
import logger from '../utils/logger';
import type { DeviceInfo, TokenPair } from '../types';

/**
 * Session & refresh token management.
 * Each login creates a "session" row in the refresh_tokens table.
 * Tokens are rotated on every refresh (old token invalidated immediately).
 * Replay detection: if a used token is replayed, ALL sessions are revoked.
 */

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Create a new session for a user. Returns access + refresh token pair.
 */
export async function createSession(
  userId: string,
  deviceInfo: DeviceInfo = { ip: null, userAgent: '' }
): Promise<TokenPair & { session_id: string }> {
  const { data: user, error } = await supabase
    .from('profiles')
    .select('plan, subscription_status')
    .eq('id', userId)
    .single();

  if (error || !user) {
    throw new AppError('User not found when creating session.', 'USER_NOT_FOUND', 404);
  }

  const sessionId = uuidv4();
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const access_token = signAccessToken({
    user_id: userId,
    plan: user.plan,
    subscription_status: user.subscription_status,
  });
  const refresh_token = signRefreshToken({ user_id: userId, session_id: sessionId });

  const { error: insertError } = await supabase.from('refresh_tokens').insert({
    id: sessionId,
    user_id: userId,
    token_hash: hashToken(refresh_token),
    device_ip: deviceInfo.ip || null,
    device_user_agent: (deviceInfo.userAgent || '').slice(0, 500),
    expires_at: expiresAt,
    last_active_at: now,
    created_at: now,
  });

  if (insertError) {
    logger.error('Failed to store session', { error: insertError.message });
    throw new AppError('Session creation failed.', 'SESSION_ERROR', 500);
  }

  return { access_token, refresh_token, session_id: sessionId };
}

/**
 * Rotate a refresh token. Invalidates old token, issues new pair.
 * If a token is replayed (hash mismatch), ALL user sessions are revoked.
 */
export async function rotateRefreshToken(oldRefreshToken: string): Promise<TokenPair> {
  let decoded: RefreshTokenPayload;
  try {
    decoded = verifyToken(oldRefreshToken, 'refresh') as RefreshTokenPayload;
  } catch {
    throw new AppError('Invalid or expired refresh token.', 'INVALID_REFRESH_TOKEN', 401);
  }

  const { user_id, session_id } = decoded;

  const { data: session, error } = await supabase
    .from('refresh_tokens')
    .select('*')
    .eq('id', session_id)
    .eq('user_id', user_id)
    .single();

  if (error || !session) {
    logger.warn('Refresh token reuse detected — revoking all sessions', { user_id });
    await revokeAllSessions(user_id);
    throw new AppError('Session expired. Please log in again.', 'SESSION_REVOKED', 401);
  }

  if (session.token_hash !== hashToken(oldRefreshToken)) {
    logger.warn('Refresh token hash mismatch — possible replay attack', { user_id });
    await revokeAllSessions(user_id);
    throw new AppError('Session expired. Please log in again.', 'SESSION_REVOKED', 401);
  }

  // Delete old session and create new one
  await supabase.from('refresh_tokens').delete().eq('id', session_id);

  const { data: user } = await supabase
    .from('profiles')
    .select('plan, subscription_status')
    .eq('id', user_id)
    .single();

  const newSessionId = uuidv4();
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const access_token = signAccessToken({
    user_id,
    plan: user?.plan || 'solo',
    subscription_status: user?.subscription_status || 'trialing',
  });
  const refresh_token = signRefreshToken({ user_id, session_id: newSessionId });

  await supabase.from('refresh_tokens').insert({
    id: newSessionId,
    user_id,
    token_hash: hashToken(refresh_token),
    device_ip: session.device_ip,
    device_user_agent: session.device_user_agent,
    expires_at: expiresAt,
    last_active_at: now,
    created_at: now,
  });

  return { access_token, refresh_token };
}

/**
 * Revoke a specific session (single device logout).
 */
export async function revokeSession(sessionId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('refresh_tokens')
    .delete()
    .eq('id', sessionId)
    .eq('user_id', userId);

  if (error) {
    throw new AppError('Failed to revoke session.', 'SESSION_ERROR', 500);
  }
}

/**
 * Revoke all sessions for a user (used on password reset or token theft detection).
 */
export async function revokeAllSessions(userId: string): Promise<void> {
  await supabase.from('refresh_tokens').delete().eq('user_id', userId);
  logger.info('All sessions revoked', { user_id: userId });
}

/**
 * List all active sessions for a user.
 */
export async function listSessions(userId: string) {
  const { data, error } = await supabase
    .from('refresh_tokens')
    .select('id, device_ip, device_user_agent, created_at, last_active_at, expires_at')
    .eq('user_id', userId)
    .order('last_active_at', { ascending: false });

  if (error) throw new AppError('Failed to fetch sessions.', 'SESSION_ERROR', 500);
  return data || [];
}
