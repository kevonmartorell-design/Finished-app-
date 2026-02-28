import { OAuth2Client } from 'google-auth-library';
import appleSignin from 'apple-signin-auth';
import supabase from '../config/supabase';
import { AppError } from '../utils/errors';
import logger from '../utils/logger';
import env from '../config/env';

/**
 * Google and Apple OAuth verification.
 * Mobile apps handle the OAuth flow natively (Google Sign-In SDK, Apple Sign-In API),
 * then send the ID token here for server-side verification.
 */

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

const USER_SELECT_FIELDS = 'id, email, name, plan, stripe_customer_id, stripe_connect_account_id, stripe_subscription_id, subscription_status, walkthrough_completed, avatar_url, two_fa_enabled, created_at';

interface SocialUserData {
  email: string | null;
  name: string;
  provider_sub: string;
  email_verified: boolean;
}

/**
 * Verify a Google ID token and return normalized user data.
 */
export async function verifyGoogleToken(idToken: string): Promise<SocialUserData> {
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload()!;

    return {
      email: payload.email?.toLowerCase() || null,
      name: payload.name || '',
      provider_sub: payload.sub,
      email_verified: payload.email_verified || false,
    };
  } catch (err: unknown) {
    const error = err as Error;
    logger.warn('Google token verification failed', { error: error.message });
    throw new AppError('Google authentication failed. Please try again.', 'GOOGLE_AUTH_FAILED', 401);
  }
}

/**
 * Verify an Apple identity token and return normalized user data.
 */
export async function verifyAppleToken(idToken: string, nonce?: string): Promise<SocialUserData> {
  try {
    const appleUser = await appleSignin.verifyIdToken(idToken, {
      audience: env.APPLE_CLIENT_ID,
      nonce,
    });

    return {
      email: appleUser.email?.toLowerCase() || null,
      name: '',
      provider_sub: appleUser.sub,
      email_verified: true,
    };
  } catch (err: unknown) {
    const error = err as Error;
    logger.warn('Apple token verification failed', { error: error.message });
    throw new AppError('Apple authentication failed. Please try again.', 'APPLE_AUTH_FAILED', 401);
  }
}

/**
 * Find or create a user record for a social login.
 * On first login: creates a new user via Supabase Auth admin.
 * On subsequent logins: returns the existing user.
 */
export async function findOrCreateSocialUser({
  provider,
  provider_sub,
  email,
  name,
}: {
  provider: 'google' | 'apple';
  provider_sub: string;
  email: string | null;
  name: string;
}): Promise<{ user: Record<string, unknown>; isNew: boolean }> {
  const providerField = provider === 'google' ? 'google_sub' : 'apple_sub';

  // Look for existing user by provider sub first (most reliable)
  const { data: existingUser } = await supabase
    .from('profiles')
    .select(USER_SELECT_FIELDS)
    .eq(providerField, provider_sub)
    .single();

  if (existingUser) {
    return { user: existingUser, isNew: false };
  }

  // No match by sub — try to find by email
  if (email) {
    const { data: emailUser } = await supabase
      .from('profiles')
      .select(USER_SELECT_FIELDS)
      .eq('email', email)
      .single();

    if (emailUser) {
      // Link the provider sub to the existing account
      await supabase
        .from('profiles')
        .update({ [providerField]: provider_sub })
        .eq('id', emailUser.id);

      return { user: emailUser, isNew: false };
    }
  }

  // New user — create via Supabase Auth admin (triggers profiles row)
  if (!email) {
    throw new AppError('Email is required for account creation.', 'EMAIL_REQUIRED', 400);
  }

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    logger.error('Failed to create social user in auth', { error: authError?.message, provider });
    throw new AppError('Account creation failed.', 'REGISTRATION_FAILED', 500);
  }

  const userId = authData.user.id;

  // Update the auto-created profiles row
  await supabase
    .from('profiles')
    .update({
      name: name || '',
      plan: 'solo',
      subscription_status: 'trialing',
      password_hash: null,
      [providerField]: provider_sub,
      two_fa_enabled: false,
      failed_login_count: 0,
    })
    .eq('id', userId);

  const { data: newUser } = await supabase
    .from('profiles')
    .select(USER_SELECT_FIELDS)
    .eq('id', userId)
    .single();

  logger.info('Social user created', { user_id: userId, provider });
  return { user: newUser!, isNew: true };
}
