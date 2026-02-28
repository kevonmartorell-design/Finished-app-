import 'dotenv/config';

interface Env {
  PORT: number;
  NODE_ENV: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  JWT_ACCESS_SECRET: string;
  JWT_REFRESH_SECRET: string;
  JWT_ACCESS_EXPIRY: string;
  JWT_REFRESH_EXPIRY: string;
  TOTP_ENCRYPTION_KEY: string;
  GOOGLE_CLIENT_ID: string;
  APPLE_CLIENT_ID: string;
  APPLE_TEAM_ID: string;
  APPLE_KEY_ID: string;
  INTERNAL_SERVICE_SECRET: string;
  NOTIFICATION_SERVICE_URL: string;
  ALLOWED_ORIGINS: string[];
  FRONTEND_URL: string;
  MAX_FAILED_LOGINS: number;
  PASSWORD_RESET_TOKEN_TTL_HOURS: number;
  UNLOCK_TOKEN_TTL_HOURS: number;
  REFRESH_TOKEN_INACTIVITY_DAYS: number;

  // Stripe (Agent 2 — Billing)
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  STRIPE_SOLO_PRICE_ID: string;
  STRIPE_BUSINESS_PRICE_ID: string;
}

const required = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'TOTP_ENCRYPTION_KEY',
  'GOOGLE_CLIENT_ID',
  'INTERNAL_SERVICE_SECRET',
] as const;

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`[AEGIS Auth] Missing required env var: ${key}`);
  }
}

const env: Env = Object.freeze({
  PORT: Number(process.env.PORT) || 3001,
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Supabase
  SUPABASE_URL: process.env.SUPABASE_URL!,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,

  // JWT
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET!,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET!,
  JWT_ACCESS_EXPIRY: process.env.JWT_ACCESS_EXPIRY || '15m',
  JWT_REFRESH_EXPIRY: process.env.JWT_REFRESH_EXPIRY || '30d',

  // 2FA
  TOTP_ENCRYPTION_KEY: process.env.TOTP_ENCRYPTION_KEY!,

  // OAuth
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID!,
  APPLE_CLIENT_ID: process.env.APPLE_CLIENT_ID || '',
  APPLE_TEAM_ID: process.env.APPLE_TEAM_ID || '',
  APPLE_KEY_ID: process.env.APPLE_KEY_ID || '',

  // Internal
  INTERNAL_SERVICE_SECRET: process.env.INTERNAL_SERVICE_SECRET!,
  NOTIFICATION_SERVICE_URL: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3006',
  ALLOWED_ORIGINS: (process.env.ALLOWED_ORIGINS || 'http://localhost:8081').split(','),
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:8081',

  // Stripe (Agent 2 — Billing)
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',
  STRIPE_SOLO_PRICE_ID: process.env.STRIPE_SOLO_PRICE_ID || '',
  STRIPE_BUSINESS_PRICE_ID: process.env.STRIPE_BUSINESS_PRICE_ID || '',

  // Security constants
  MAX_FAILED_LOGINS: 5,
  PASSWORD_RESET_TOKEN_TTL_HOURS: 1,
  UNLOCK_TOKEN_TTL_HOURS: 24,
  REFRESH_TOKEN_INACTIVITY_DAYS: 30,
});

export default env;
