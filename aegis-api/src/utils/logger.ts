/**
 * PII-safe structured logger.
 * Masks emails, phones, and sensitive fields before writing log output.
 */

export function maskEmail(email: string): string {
  if (!email || typeof email !== 'string') return '[email]';
  const [local, domain] = email.split('@');
  if (!domain) return '***@***.***';
  const domainParts = domain.split('.');
  return `${local[0]}***@${'***'}.${domainParts[domainParts.length - 1]}`;
}

export function maskPhone(phone: string): string {
  if (!phone || typeof phone !== 'string') return '[phone]';
  return phone.slice(0, 2) + '***' + phone.slice(-4);
}

const REDACTED_KEYS = new Set([
  'password', 'password_hash', 'newPassword', 'currentPassword',
  'token', 'access_token', 'refresh_token', 'secret', 'totp_secret',
  'stripe_secret', 'card_number', 'cvv', 'pin',
]);

function sanitize(obj: Record<string, unknown>): Record<string, unknown> {
  if (!obj || typeof obj !== 'object') return obj;

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (REDACTED_KEYS.has(key)) {
      result[key] = '[REDACTED]';
    } else if (key === 'email') {
      result[key] = maskEmail(value as string);
    } else if (key === 'phone') {
      result[key] = maskPhone(value as string);
    } else if (typeof value === 'object' && value !== null) {
      result[key] = sanitize(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result;
}

function formatMessage(level: string, message: string, meta?: Record<string, unknown>): string {
  const timestamp = new Date().toISOString();
  const safeMeta = meta ? sanitize(meta) : undefined;
  const metaStr = safeMeta ? ' ' + JSON.stringify(safeMeta) : '';
  return `[${timestamp}] [${level}] ${message}${metaStr}`;
}

const logger = {
  info: (message: string, meta?: Record<string, unknown>) => console.log(formatMessage('INFO', message, meta)),
  warn: (message: string, meta?: Record<string, unknown>) => console.warn(formatMessage('WARN', message, meta)),
  error: (message: string, meta?: Record<string, unknown>) => console.error(formatMessage('ERROR', message, meta)),
  debug: (message: string, meta?: Record<string, unknown>) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(formatMessage('DEBUG', message, meta));
    }
  },
  maskEmail,
  maskPhone,
};

export default logger;
