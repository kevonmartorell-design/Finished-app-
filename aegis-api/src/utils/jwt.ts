import jwt from 'jsonwebtoken';

const jwtConfig = {
  get ACCESS_SECRET(): string { return process.env.JWT_ACCESS_SECRET!; },
  get REFRESH_SECRET(): string { return process.env.JWT_REFRESH_SECRET!; },
  get ACCESS_EXPIRY(): string { return process.env.JWT_ACCESS_EXPIRY || '15m'; },
  get REFRESH_EXPIRY(): string { return process.env.JWT_REFRESH_EXPIRY || '30d'; },
};

export interface AccessTokenPayload {
  user_id: string;
  plan: string;
  subscription_status: string;
  type: 'access';
}

export interface RefreshTokenPayload {
  user_id: string;
  session_id: string;
  type: 'refresh';
}

/**
 * Sign a short-lived access token (15 minutes).
 * Payload: { user_id, plan, subscription_status }
 */
export function signAccessToken(payload: {
  user_id: string;
  plan: string;
  subscription_status: string;
}): string {
  return jwt.sign(
    {
      user_id: payload.user_id,
      plan: payload.plan,
      subscription_status: payload.subscription_status,
      type: 'access',
    },
    jwtConfig.ACCESS_SECRET,
    { expiresIn: jwtConfig.ACCESS_EXPIRY }
  );
}

/**
 * Sign a long-lived refresh token (30 days).
 * Payload: { user_id, session_id }
 */
export function signRefreshToken(payload: {
  user_id: string;
  session_id: string;
}): string {
  return jwt.sign(
    {
      user_id: payload.user_id,
      session_id: payload.session_id,
      type: 'refresh',
    },
    jwtConfig.REFRESH_SECRET,
    { expiresIn: jwtConfig.REFRESH_EXPIRY }
  );
}

/**
 * Verify a JWT token. Checks signature, expiry, and token type.
 */
export function verifyToken(token: string, type: 'access' | 'refresh'): AccessTokenPayload | RefreshTokenPayload {
  const secret = type === 'refresh' ? jwtConfig.REFRESH_SECRET : jwtConfig.ACCESS_SECRET;
  const decoded = jwt.verify(token, secret) as (AccessTokenPayload | RefreshTokenPayload) & jwt.JwtPayload;

  if (decoded.type !== type) {
    throw new Error(`Invalid token type: expected ${type}, got ${decoded.type}`);
  }

  return decoded;
}
