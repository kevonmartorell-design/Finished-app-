import { v4 as uuidv4 } from 'uuid';
import supabase from '../config/supabase';
import { hashPassword, comparePassword, validatePasswordStrength } from '../utils/password';
import { signAccessToken } from '../utils/jwt';
import * as sessionService from './sessionService';
import * as notificationBus from './notificationBus';
import { AppError } from '../utils/errors';
import logger from '../utils/logger';
import env from '../config/env';
import type { DeviceInfo } from '../types';

/**
 * Core authentication business logic.
 * Handles: register, login (with lock logic), account lock/unlock.
 */

const USER_SELECT_FIELDS = 'id, email, name, plan, stripe_customer_id, stripe_connect_account_id, stripe_subscription_id, subscription_status, walkthrough_completed, avatar_url, two_fa_enabled, created_at';

/**
 * Register a new user with email + password.
 * Creates user in Supabase Auth (triggers profiles row), then updates profile.
 */
export async function register(
  { email, password, name = '' }: { email: string; password: string; name?: string },
  deviceInfo: DeviceInfo = { ip: null, userAgent: '' }
) {
  const strength = validatePasswordStrength(password);
  if (!strength.valid) {
    throw new AppError(strength.message!, 'WEAK_PASSWORD', 400);
  }

  const safeEmail = email.toLowerCase().trim();

  // Check if email is already registered
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', safeEmail)
    .single();

  if (existing) {
    throw new AppError('An account with this email already exists.', 'EMAIL_EXISTS', 409);
  }

  // Create user in Supabase Auth — triggers handle_new_user which creates profiles row
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: safeEmail,
    password,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    logger.error('Failed to create auth user', { error: authError?.message });
    throw new AppError('Registration failed. Please try again.', 'REGISTRATION_FAILED', 500);
  }

  const userId = authData.user.id;
  const passwordHash = await hashPassword(password);

  // Update the auto-created profiles row with auth fields
  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      name: name.trim(),
      password_hash: passwordHash,
      plan: 'solo',
      subscription_status: 'trialing',
      two_fa_enabled: false,
      failed_login_count: 0,
    })
    .eq('id', userId);

  if (updateError) {
    logger.error('Failed to update profile after registration', { error: updateError.message });
  }

  // Fetch the complete user
  const { data: user } = await supabase
    .from('profiles')
    .select(USER_SELECT_FIELDS)
    .eq('id', userId)
    .single();

  const { access_token, refresh_token } = await sessionService.createSession(userId, deviceInfo);

  logger.info('User registered', { user_id: userId });

  return { user, accessToken: access_token, refreshToken: refresh_token };
}

/**
 * Login with email and password.
 * Tracks failed attempts and locks account after MAX_FAILED_LOGINS.
 */
export async function loginWithPassword(
  { email, password }: { email: string; password: string },
  deviceInfo: DeviceInfo = { ip: null, userAgent: '' }
) {
  const { data: user, error } = await supabase
    .from('profiles')
    .select('*, password_hash, failed_login_count, locked_at, two_fa_enabled')
    .eq('email', email.toLowerCase().trim())
    .single();

  if (error || !user) {
    throw new AppError('Invalid email or password.', 'INVALID_CREDENTIALS', 401);
  }

  // Check if account is locked
  if (user.locked_at) {
    throw new AppError(
      'Account is locked due to too many failed login attempts. Check your email for an unlock link.',
      'ACCOUNT_LOCKED',
      423
    );
  }

  // Social-only users can't login with password
  if (!user.password_hash) {
    throw new AppError(
      'This account uses social login. Please sign in with Google or Apple.',
      'SOCIAL_AUTH_REQUIRED',
      400
    );
  }

  const passwordMatch = await comparePassword(password, user.password_hash);

  if (!passwordMatch) {
    await recordFailedLogin(user);

    // Check if account was just locked
    const { data: updatedUser } = await supabase
      .from('profiles')
      .select('failed_login_count, locked_at')
      .eq('id', user.id)
      .single();

    if (updatedUser?.locked_at) {
      throw new AppError(
        'Account locked after too many failed attempts. Check your email for an unlock link.',
        'ACCOUNT_LOCKED',
        423
      );
    }

    const remaining = env.MAX_FAILED_LOGINS - (updatedUser?.failed_login_count || 0);
    throw new AppError(
      `Invalid email or password. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining before account lock.`,
      'INVALID_CREDENTIALS',
      401
    );
  }

  // Successful login — reset failed login counter
  await supabase
    .from('profiles')
    .update({ failed_login_count: 0 })
    .eq('id', user.id);

  // If 2FA is enabled, return a partial response
  if (user.two_fa_enabled) {
    return {
      requires_2fa: true,
      user_id: user.id,
      pre_auth_token: signAccessToken({
        user_id: user.id,
        plan: '__pre_auth__',
        subscription_status: user.subscription_status,
      }),
    };
  }

  const { access_token, refresh_token } = await sessionService.createSession(user.id, deviceInfo);

  const publicUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    plan: user.plan,
    stripe_customer_id: user.stripe_customer_id,
    stripe_connect_account_id: user.stripe_connect_account_id,
    stripe_subscription_id: user.stripe_subscription_id,
    subscription_status: user.subscription_status,
    walkthrough_completed: user.walkthrough_completed,
    avatar_url: user.avatar_url,
    two_fa_enabled: user.two_fa_enabled,
    created_at: user.created_at,
  };

  logger.info('User logged in', { user_id: user.id });

  return { user: publicUser, accessToken: access_token, refreshToken: refresh_token };
}

/**
 * Record a failed login attempt and lock the account if threshold is reached.
 */
async function recordFailedLogin(user: { id: string; email: string; failed_login_count: number }) {
  const newCount = (user.failed_login_count || 0) + 1;
  const updates: Record<string, unknown> = { failed_login_count: newCount };

  if (newCount >= env.MAX_FAILED_LOGINS) {
    updates.locked_at = new Date().toISOString();
    await supabase.from('profiles').update(updates).eq('id', user.id);
    await lockAccount(user.id, user.email);
  } else {
    await supabase.from('profiles').update(updates).eq('id', user.id);
  }
}

/**
 * Lock a user account and emit notification bus event.
 */
async function lockAccount(userId: string, email: string) {
  const token = uuidv4() + '-' + Date.now();
  const expiresAt = new Date(Date.now() + env.UNLOCK_TOKEN_TTL_HOURS * 60 * 60 * 1000).toISOString();

  await supabase.from('unlock_tokens').insert({
    id: uuidv4(),
    user_id: userId,
    token,
    expires_at: expiresAt,
    created_at: new Date().toISOString(),
  });

  await notificationBus.emit(notificationBus.EVENTS.ACCOUNT_LOCKED, userId, {
    email_masked: logger.maskEmail(email),
    unlock_token: token,
  });

  logger.warn('Account locked', { user_id: userId });
}

/**
 * Unlock an account using the token from the unlock email.
 */
export async function unlockAccount(token: string) {
  const { data: unlockRecord, error } = await supabase
    .from('unlock_tokens')
    .select('*')
    .eq('token', token)
    .single();

  if (error || !unlockRecord) {
    throw new AppError('Invalid or expired unlock token.', 'INVALID_TOKEN', 400);
  }

  if (new Date(unlockRecord.expires_at) < new Date()) {
    throw new AppError(
      'Unlock token has expired. Please contact support or try logging in again to receive a new link.',
      'TOKEN_EXPIRED',
      400
    );
  }

  await supabase
    .from('profiles')
    .update({ locked_at: null, failed_login_count: 0 })
    .eq('id', unlockRecord.user_id);

  await supabase.from('unlock_tokens').delete().eq('id', unlockRecord.id);

  logger.info('Account unlocked', { user_id: unlockRecord.user_id });
  return { success: true };
}
