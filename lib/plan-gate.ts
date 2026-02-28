import { useAuth } from '@/lib/auth-context';

type Plan = 'solo' | 'business';

interface PlanGateOptions {
  requiredPlan: Plan;
  userPlan: Plan;
}

/**
 * Check if the user's plan permits access to a feature.
 * Returns true if access is allowed.
 */
export function canAccess({ requiredPlan, userPlan }: PlanGateOptions): boolean {
  if (requiredPlan === 'solo') return true; // Solo features available to all
  return userPlan === 'business'; // Business features require business plan
}

/**
 * Features gated behind the business plan.
 */
export const BUSINESS_ONLY_FEATURES = [
  'team-management',
  'shifts',
  'timesheets',
  'payroll',
  'tasks',
  'departments',
  'audit-log',
  'reports',
] as const;

/**
 * UI-level plan gate hook.
 * Returns true if the current user has access to the required plan.
 * Note: UI gating is UX only — server enforces the real gate.
 */
export function usePlanGate(requiredPlan: Plan): boolean {
  const { user } = useAuth();
  if (!user) return false;
  return canAccess({ requiredPlan, userPlan: user.plan });
}
