import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { router } from 'expo-router';
import { storeTokens, getTokens, clearTokens, getTokenExpiry } from '@/lib/auth-tokens';
import { useStore } from '@/store';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL;

// ─── User Interface (shared schema) ─────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string | null;
  plan: 'solo' | 'business';
  subscription_status: 'trialing' | 'active' | 'past_due' | 'canceled';
  avatar_url: string | null;
  walkthrough_completed: boolean;
  stripe_customer_id: string | null;
  stripe_connect_account_id: string | null;
  stripe_subscription_id: string | null;
  two_fa_enabled: boolean;
  created_at: string;
}

// ─── Context Type ────────────────────────────────────────────────

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  accessToken: string | null;
  login: (token: string, refreshToken: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  accessToken: null,
  login: async () => {},
  logout: async () => {},
  refreshSession: async () => {},
});

// ─── Provider ────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Schedule auto-refresh 2 minutes before access token expires
  const scheduleRefresh = useCallback((token: string) => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }

    const exp = getTokenExpiry(token);
    if (!exp) return;

    const msUntilRefresh = (exp * 1000) - Date.now() - (2 * 60 * 1000);
    if (msUntilRefresh <= 0) return;

    refreshTimerRef.current = setTimeout(async () => {
      try {
        await refreshSessionInternal();
      } catch {
        // Refresh failed — user will be prompted to log in on next API call
      }
    }, msUntilRefresh);
  }, []);

  // Fetch user profile using access token
  const fetchUser = useCallback(async (token: string): Promise<User | null> => {
    try {
      const res = await fetch(`${API_BASE}/user/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.user;
    } catch {
      return null;
    }
  }, []);

  // Internal refresh logic
  const refreshSessionInternal = useCallback(async (): Promise<{ token: string; user: User } | null> => {
    const tokens = await getTokens();
    if (!tokens?.refreshToken) return null;

    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: tokens.refreshToken }),
      });

      if (!res.ok) return null;

      const data = await res.json();
      const newAccessToken = data.access_token;
      const newRefreshToken = data.refresh_token;

      await storeTokens({ accessToken: newAccessToken, refreshToken: newRefreshToken });
      setAccessToken(newAccessToken);

      const userData = await fetchUser(newAccessToken);
      if (userData) {
        setUser(userData);
        useStore.getState().auth.setUser(userData);
        useStore.getState().auth.setAccessToken(newAccessToken);
        scheduleRefresh(newAccessToken);
        return { token: newAccessToken, user: userData };
      }
      return null;
    } catch {
      return null;
    }
  }, [fetchUser, scheduleRefresh]);

  // Session restoration on cold start
  useEffect(() => {
    async function restoreSession() {
      try {
        const tokens = await getTokens();
        if (!tokens) {
          setIsLoading(false);
          return;
        }

        // Try to validate the current access token
        const userData = await fetchUser(tokens.accessToken);
        if (userData) {
          setAccessToken(tokens.accessToken);
          setUser(userData);
          useStore.getState().auth.setUser(userData);
          useStore.getState().auth.setAccessToken(tokens.accessToken);
          scheduleRefresh(tokens.accessToken);
          setIsLoading(false);
          return;
        }

        // Access token invalid — try refresh
        const refreshResult = await refreshSessionInternal();
        if (!refreshResult) {
          await clearTokens();
        }
      } catch {
        await clearTokens();
      } finally {
        setIsLoading(false);
      }
    }

    restoreSession();

    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, [fetchUser, refreshSessionInternal, scheduleRefresh]);

  // ─── Public Methods ──────────────────────────────────────────

  const login = useCallback(async (token: string, refreshToken: string, userData: User) => {
    await storeTokens({ accessToken: token, refreshToken });
    setAccessToken(token);
    setUser(userData);
    useStore.getState().auth.setUser(userData);
    useStore.getState().auth.setAccessToken(token);
    scheduleRefresh(token);
  }, [scheduleRefresh]);

  const logout = useCallback(async () => {
    // Attempt to invalidate session on server (fire-and-forget)
    try {
      const tokens = await getTokens();
      if (tokens && accessToken) {
        fetch(`${API_BASE}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ refresh_token: tokens.refreshToken }),
        }).catch(() => {});
      }
    } catch {
      // Non-critical — continue with local cleanup
    }

    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }

    await clearTokens();
    setAccessToken(null);
    setUser(null);
    useStore.getState().auth.clearAuth();
    router.replace('/(auth)/login');
  }, [accessToken]);

  const refreshSession = useCallback(async () => {
    await refreshSessionInternal();
  }, [refreshSessionInternal]);

  return (
    <AuthContext.Provider value={{ user, isLoading, accessToken, login, logout, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
