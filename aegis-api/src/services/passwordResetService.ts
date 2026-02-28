import { v4 as uuidv4 } from 'uuid';
import supabase from '../config/supabase';
import { hashPassword, validatePasswordStrength } from '../utils/password';
import * as sessionService from './sessionService';
import * as notificationBus from './notificationBus';
import { AppError } from '../utils/errors';
import logger from '../utils/logger';
import env from '../config/env';

/**
 * Forgot/reset password flows.
 * Always returns the same response whether the email exists or not
 * to prevent email enumeration attacks.
 */

/**
 * Begin the password reset flow.
 * Emits password_reset_requested event to notification bus.
 */
export async function requestReset(email: string) {
  const safeEmail = email.toLowerCase().trim();

  const { data: user } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('email', safeEmail)
    .single();

  // Always return success — do not reveal whether email exists
  if (!user) {
    logger.info('Password reset requested for unknown email', { email_masked: logger.maskEmail(safeEmail) });
    return { message: 'If an account with that email exists, a reset link has been sent.' };
  }

  // Invalidate any existing reset tokens for this user
  await supabase.from('password_reset_tokens').delete().eq('user_id', user.id);

  const token = uuidv4() + '-' + uuidv4();
  const expiresAt = new Date(Date.now() + env.PASSWORD_RESET_TOKEN_TTL_HOURS * 60 * 60 * 1000).toISOString();

  await supabase.from('password_reset_tokens').insert({
    id: uuidv4(),
    user_id: user.id,
    token,
    expires_at: expiresAt,
    created_at: new Date().toISOString(),
  });

  await notificationBus.emit(notificationBus.EVENTS.PASSWORD_RESET_REQUESTED, user.id, {
    email_masked: logger.maskEmail(user.email),
    reset_token: token,
  });

  logger.info('Password reset token issued', { user_id: user.id });
  return { message: 'If an account with that email exists, a reset link has been sent.' };
}

/**
 * Complete the password reset.
 * Validates token, hashes new password, revokes all sessions.
 */
export async function resetPassword(token: string, newPassword: string) {
  const { data: record, error } = await supabase
    .from('password_reset_tokens')
    .select('*')
    .eq('token', token)
    .single();

  if (error || !record) {
    throw new AppError('Invalid or expired password reset link.', 'INVALID_TOKEN', 400);
  }

  if (new Date(record.expires_at) < new Date()) {
    await supabase.from('password_reset_tokens').delete().eq('id', record.id);
    throw new AppError('This password reset link has expired.', 'TOKEN_EXPIRED', 400);
  }

  const strength = validatePasswordStrength(newPassword);
  if (!strength.valid) {
    throw new AppError(strength.message!, 'WEAK_PASSWORD', 400);
  }

  const passwordHash = await hashPassword(newPassword);

  // Update password in profiles
  await supabase
    .from('profiles')
    .update({
      password_hash: passwordHash,
      failed_login_count: 0,
      locked_at: null,
    })
    .eq('id', record.user_id);

  // Also update in Supabase Auth to keep both in sync
  await supabase.auth.admin.updateUserById(record.user_id, { password: newPassword });

  // Invalidate all active sessions — forces re-login on all devices
  await sessionService.revokeAllSessions(record.user_id);

  // Delete the used reset token
  await supabase.from('password_reset_tokens').delete().eq('id', record.id);

  logger.info('Password reset complete', { user_id: record.user_id });
  return { success: true };
}
