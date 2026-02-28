import type { Request, Response, NextFunction } from 'express';
import { verifyToken, type AccessTokenPayload } from '../utils/jwt';
import logger from '../utils/logger';

export interface AuthenticatedRequest extends Request {
  user: {
    user_id: string;
    plan: string;
    subscription_status: string;
  };
}

/**
 * JWT access token validation middleware.
 * Reads Authorization: Bearer <token> header.
 * Attaches { user_id, plan, subscription_status } to req.user.
 * Returns 401 if token is missing, expired, or invalid.
 */
export default function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Authorization header missing or malformed.',
      code: 'UNAUTHORIZED',
      statusCode: 401,
    });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const decoded = verifyToken(token, 'access') as AccessTokenPayload;
    (req as AuthenticatedRequest).user = {
      user_id: decoded.user_id,
      plan: decoded.plan,
      subscription_status: decoded.subscription_status,
    };
    next();
  } catch (err: unknown) {
    const error = err as Error & { name?: string };
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({
        error: 'Access token has expired. Please refresh your token.',
        code: 'TOKEN_EXPIRED',
        statusCode: 401,
      });
      return;
    }

    logger.warn('Invalid token presented', { error: error.message });
    res.status(401).json({
      error: 'Invalid access token.',
      code: 'INVALID_TOKEN',
      statusCode: 401,
    });
  }
}
