// TODO: Agent 1/2 implements plan gating logic
// This module checks if a user's plan allows access to specific features.

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
