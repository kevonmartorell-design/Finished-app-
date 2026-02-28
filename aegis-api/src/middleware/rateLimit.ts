import rateLimit from 'express-rate-limit';

/**
 * Auth endpoint rate limiter — 5 requests per 15 minutes per IP.
 * Applied to: /auth/login, /auth/register, /auth/password/forgot,
 *             /auth/invite/accept, /auth/2fa/verify
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests. Please try again in 15 minutes.',
    code: 'RATE_LIMITED',
    statusCode: 429,
  },
  skip: () => process.env.NODE_ENV === 'test',
});

/**
 * General rate limiter — 100 requests per 15 minutes per IP.
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests. Please slow down.',
    code: 'RATE_LIMITED',
    statusCode: 429,
  },
  skip: () => process.env.NODE_ENV === 'test',
});
