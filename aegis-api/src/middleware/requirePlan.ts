import type { Request, Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from './requireAuth';

type Plan = 'solo' | 'business';

/**
 * Plan-gate middleware factory.
 * Usage: router.get('/feature', requireAuth, requirePlan('business'), handler)
 *
 * Business plan users have access to all features (solo + business).
 * Returns 403 with required/current plan if access denied.
 */
export default function requirePlan(requiredPlan: Plan) {
  const VALID_PLANS: Plan[] = ['solo', 'business'];

  if (!VALID_PLANS.includes(requiredPlan)) {
    throw new Error(`[requirePlan] Invalid plan specified: "${requiredPlan}". Must be "solo" or "business".`);
  }

  return function planGate(req: Request, res: Response, next: NextFunction): void {
    const authReq = req as AuthenticatedRequest;

    if (!authReq.user) {
      res.status(401).json({
        error: 'Authentication required before plan check.',
        code: 'UNAUTHORIZED',
        statusCode: 401,
      });
      return;
    }

    const userPlan = authReq.user.plan;

    // Business plan users have access to all features
    if (requiredPlan === 'solo' && (userPlan === 'solo' || userPlan === 'business')) {
      return next();
    }

    if (requiredPlan === 'business' && userPlan === 'business') {
      return next();
    }

    res.status(403).json({
      error: `This feature requires the "${requiredPlan}" plan. Please upgrade your subscription.`,
      code: 'PLAN_REQUIRED',
      statusCode: 403,
      required_plan: requiredPlan,
      current_plan: userPlan,
    });
  };
}
