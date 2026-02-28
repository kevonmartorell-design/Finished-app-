// Re-export useAuth and User type from auth context for convenience
// Other agents can import from either '@/hooks/useAuth' or '@/lib/auth-context'
export { useAuth, type User } from '@/lib/auth-context';
