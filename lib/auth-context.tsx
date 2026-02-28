import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export interface User {
  id: string;
  email: string;
  name: string | null;
  plan: 'solo' | 'business';
  subscription_status: 'trialing' | 'active' | 'past_due' | 'canceled';
  avatar_url: string | null;
  walkthrough_completed: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  accessToken: string | null;
  login: (token: string, refreshToken: string, user: User) => void;
  logout: () => void;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  accessToken: null,
  login: () => {},
  logout: () => {},
  refreshSession: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // TODO: Agent 1 implements session restoration from secure storage
    setIsLoading(false);
  }, []);

  const login = (token: string, _refreshToken: string, userData: User) => {
    // TODO: Agent 1 implements full login logic with secure token storage
    setAccessToken(token);
    setUser(userData);
  };

  const logout = () => {
    // TODO: Agent 1 implements full logout logic with token cleanup
    setAccessToken(null);
    setUser(null);
  };

  const refreshSession = async () => {
    // TODO: Agent 1 implements token refresh using Supabase
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, accessToken, login, logout, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
