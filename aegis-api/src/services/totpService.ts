import crypto from 'crypto';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import supabase from '../config/supabase';
import { AppError } from '../utils/errors';
import logger from '../utils/logger';
import env from '../config/env';

/**
 * TOTP-based Two-Factor Authentication.
 * Uses RFC 6238 (TOTP) via speakeasy. Compatible with Google Authenticator,
 * Authy, and any standard TOTP app.
 * TOTP secret is stored AES-256 encrypted in the totp_secrets table.
 */

const ALGORITHM = 'aes-256-cbc';
const KEY = Buffer.from(env.TOTP_ENCRYPTION_KEY, 'utf8').subarray(0, 32);

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(encryptedText: string): string {
  const [ivHex, encryptedHex] = encryptedText.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

/**
 * Generate a TOTP secret and return QR code data URI.
 * Stores the encrypted secret in DB (unverified until first successful verify).
 */
export async function generateSecret(userId: string, email: string) {
  const { data: existing } = await supabase
    .from('totp_secrets')
    .select('user_id, verified')
    .eq('user_id', userId)
    .single();

  if (existing?.verified) {
    throw new AppError(
      '2FA is already enabled. Disable it first before setting up a new method.',
      '2FA_ALREADY_ENABLED',
      409
    );
  }

  const secret = speakeasy.generateSecret({
    name: `AEGIS:${email}`,
    issuer: 'AEGIS',
    length: 32,
  });

  const encryptedSecret = encrypt(secret.base32);

  await supabase.from('totp_secrets').upsert(
    {
      user_id: userId,
      encrypted_secret: encryptedSecret,
      verified: false,
      created_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );

  const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

  return {
    secret: secret.base32,
    qr_code_url: qrCodeUrl,
    otpauth_url: secret.otpauth_url,
  };
}

/**
 * Verify a TOTP code. On first success, marks the secret as verified
 * and enables 2FA on the user account.
 */
export async function verifyCode(userId: string, code: string) {
  const { data: record, error } = await supabase
    .from('totp_secrets')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !record) {
    throw new AppError('2FA not set up for this account.', '2FA_NOT_SETUP', 400);
  }

  const secret = decrypt(record.encrypted_secret);

  const isValid = speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token: code,
    window: 1,
  });

  if (!isValid) {
    throw new AppError('Invalid 2FA code. Please try again.', 'INVALID_2FA_CODE', 401);
  }

  if (!record.verified) {
    await supabase
      .from('totp_secrets')
      .update({ verified: true })
      .eq('user_id', userId);

    await supabase
      .from('profiles')
      .update({ two_fa_enabled: true })
      .eq('id', userId);

    logger.info('2FA enabled for user', { user_id: userId });
  }

  return { verified: true };
}

/**
 * Disable 2FA for a user account.
 */
export async function disable2FA(userId: string) {
  await supabase.from('totp_secrets').delete().eq('user_id', userId);
  await supabase
    .from('profiles')
    .update({ two_fa_enabled: false })
    .eq('id', userId);

  logger.info('2FA disabled for user', { user_id: userId });
  return { success: true };
}
