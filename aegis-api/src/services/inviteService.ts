import supabase from '../config/supabase';
import { hashPassword, validatePasswordStrength } from '../utils/password';
import * as sessionService from './sessionService';
import { AppError } from '../utils/errors';
import logger from '../utils/logger';
import type { DeviceInfo } from '../types';

const USER_SELECT_FIELDS = 'id, email, name, plan, stripe_customer_id, stripe_connect_account_id, stripe_subscription_id, subscription_status, walkthrough_completed, avatar_url, two_fa_enabled, created_at';

/**
 * Accept an employee invitation.
 *
 * 1. Look up organization_members row where invite_token = token AND status = 'pending'.
 * 2. If no match → 404.
 * 3. If user with invite_email already exists → add them to org, return { requiresLogin: true }.
 * 4. If user does not exist → create user + profile, add to org, return tokens.
 * 5. Clear invite_token after acceptance.
 */
export async function acceptInvite(
  { invite_token, password }: { invite_token: string; password?: string },
  deviceInfo: DeviceInfo = { ip: null, userAgent: '' }
) {
  // Step 1: Find the pending invite
  const { data: member, error } = await supabase
    .from('organization_members')
    .select('*, invite_email')
    .eq('invite_token', invite_token)
    .eq('status', 'pending')
    .single();

  if (error || !member) {
    throw new AppError('Invalid or expired invitation.', 'INVALID_INVITE', 404);
  }

  const inviteEmail = member.invite_email?.toLowerCase().trim();
  if (!inviteEmail) {
    throw new AppError('Invitation is missing an email address.', 'INVALID_INVITE', 400);
  }

  // Step 3: Check if user already exists
  const { data: existingUser } = await supabase
    .from('profiles')
    .select(USER_SELECT_FIELDS)
    .eq('email', inviteEmail)
    .single();

  if (existingUser) {
    // User exists — link them to the org
    await supabase
      .from('organization_members')
      .update({
        user_id: existingUser.id,
        status: 'active',
        joined_at: new Date().toISOString(),
        invite_token: null,
      })
      .eq('id', member.id);

    logger.info('Existing user accepted invite', { user_id: existingUser.id });
    return { requiresLogin: true };
  }

  // Step 4: New user — create account
  if (!password) {
    throw new AppError('Password is required for new accounts.', 'MISSING_FIELDS', 400);
  }

  const strength = validatePasswordStrength(password);
  if (!strength.valid) {
    throw new AppError(strength.message!, 'WEAK_PASSWORD', 400);
  }

  // Create in Supabase Auth (triggers profiles row)
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: inviteEmail,
    password,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    logger.error('Failed to create invited user', { error: authError?.message });
    throw new AppError('Account creation failed.', 'REGISTRATION_FAILED', 500);
  }

  const userId = authData.user.id;
  const passwordHash = await hashPassword(password);

  // Update the auto-created profiles row
  await supabase
    .from('profiles')
    .update({
      password_hash: passwordHash,
      plan: 'business',
      subscription_status: 'active',
      two_fa_enabled: false,
      failed_login_count: 0,
    })
    .eq('id', userId);

  // Step 5: Link to org and clear invite token
  await supabase
    .from('organization_members')
    .update({
      user_id: userId,
      status: 'active',
      joined_at: new Date().toISOString(),
      invite_token: null,
    })
    .eq('id', member.id);

  const { data: user } = await supabase
    .from('profiles')
    .select(USER_SELECT_FIELDS)
    .eq('id', userId)
    .single();

  const { access_token, refresh_token } = await sessionService.createSession(userId, deviceInfo);

  logger.info('New user accepted invite', { user_id: userId });

  return { user, accessToken: access_token, refreshToken: refresh_token };
}
