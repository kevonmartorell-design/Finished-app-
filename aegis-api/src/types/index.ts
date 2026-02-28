import type { Request } from 'express';

export type Plan = 'solo' | 'business';
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled';

/**
 * User object schema — shared across ALL agents. Do not change.
 */
export interface User {
  id: string;
  email: string;
  name: string;
  plan: Plan;
  stripe_customer_id: string;
  stripe_connect_account_id: string | null;
  stripe_subscription_id: string;
  subscription_status: SubscriptionStatus;
  walkthrough_completed: boolean;
  created_at: string;
}

/**
 * Internal profile row from the database (extends User with auth fields).
 */
export interface ProfileRow extends User {
  avatar_url: string | null;
  password_hash: string | null;
  google_sub: string | null;
  apple_sub: string | null;
  two_fa_enabled: boolean;
  failed_login_count: number;
  locked_at: string | null;
  updated_at: string;
}

export interface AuthenticatedUser {
  user_id: string;
  plan: string;
  subscription_status: string;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
}

export interface ErrorResponse {
  error: string;
  code: string;
  statusCode: number;
}

export interface DeviceInfo {
  ip: string | null;
  userAgent: string;
}
