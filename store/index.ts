import { create } from 'zustand';
import type { User } from '@/lib/auth-context';

// ── Types ──────────────────────────────────────────────────────────

interface AuthSlice {
  user: User | null;
  accessToken: string | null;
  setUser: (user: User | null) => void;
  setAccessToken: (token: string | null) => void;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
}

interface BillingSlice {
  status: string | null;
  plan: string | null;
  trialDaysRemaining: number | null;
  setStatus: (status: string | null) => void;
  setPlan: (plan: string | null) => void;
  setTrialDaysRemaining: (days: number | null) => void;
}

interface NotificationsSlice {
  unreadCount: number;
  setUnreadCount: (count: number) => void;
  incrementUnread: () => void;
  clearUnread: () => void;
}

interface MessagesSlice {
  unreadCount: number;
  setUnreadCount: (count: number) => void;
  incrementUnread: () => void;
  clearUnread: () => void;
}

interface StoreState {
  auth: AuthSlice;
  billing: BillingSlice;
  notifications: NotificationsSlice;
  messages: MessagesSlice;
}

// ── Store ──────────────────────────────────────────────────────────

export const useStore = create<StoreState>((set) => ({
  auth: {
    user: null,
    accessToken: null,
    setUser: (user) =>
      set((state) => ({ auth: { ...state.auth, user } })),
    setAccessToken: (token) =>
      set((state) => ({ auth: { ...state.auth, accessToken: token } })),
    setAuth: (user, token) =>
      set((state) => ({ auth: { ...state.auth, user, accessToken: token } })),
    clearAuth: () =>
      set((state) => ({ auth: { ...state.auth, user: null, accessToken: null } })),
  },
  billing: {
    status: null,
    plan: null,
    trialDaysRemaining: null,
    setStatus: (status) =>
      set((state) => ({ billing: { ...state.billing, status } })),
    setPlan: (plan) =>
      set((state) => ({ billing: { ...state.billing, plan } })),
    setTrialDaysRemaining: (days) =>
      set((state) => ({ billing: { ...state.billing, trialDaysRemaining: days } })),
  },
  notifications: {
    unreadCount: 0,
    setUnreadCount: (count) =>
      set((state) => ({ notifications: { ...state.notifications, unreadCount: count } })),
    incrementUnread: () =>
      set((state) => ({ notifications: { ...state.notifications, unreadCount: state.notifications.unreadCount + 1 } })),
    clearUnread: () =>
      set((state) => ({ notifications: { ...state.notifications, unreadCount: 0 } })),
  },
  messages: {
    unreadCount: 0,
    setUnreadCount: (count) =>
      set((state) => ({ messages: { ...state.messages, unreadCount: count } })),
    incrementUnread: () =>
      set((state) => ({ messages: { ...state.messages, unreadCount: state.messages.unreadCount + 1 } })),
    clearUnread: () =>
      set((state) => ({ messages: { ...state.messages, unreadCount: 0 } })),
  },
}));

// ── Selector Hooks ─────────────────────────────────────────────────

export const useAuthStore = () => useStore((state) => state.auth);
export const useBillingStore = () => useStore((state) => state.billing);
export const useNotifStore = () => useStore((state) => state.notifications);
export const useMessagesStore = () => useStore((state) => state.messages);
