import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'aegis_access_token';
const REFRESH_TOKEN_KEY = 'aegis_refresh_token';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * Store tokens securely.
 * Native (iOS/Android): expo-secure-store (Keychain / Keystore).
 * Web: localStorage (expo-secure-store doesn't support web).
 */
export async function storeTokens(tokens: TokenPair): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
    return;
  }
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.accessToken);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken);
}

/**
 * Retrieve stored tokens.
 */
export async function getTokens(): Promise<TokenPair | null> {
  if (Platform.OS === 'web') {
    const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!accessToken || !refreshToken) return null;
    return { accessToken, refreshToken };
  }
  const accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
}

/**
 * Clear all stored tokens (on logout).
 */
export async function clearTokens(): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}

/**
 * Decode a JWT's expiry timestamp without verification.
 * Used for scheduling auto-refresh (2 minutes before expiry).
 * Returns the `exp` claim in seconds, or null if decode fails.
 */
export function getTokenExpiry(token: string): number | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return payload.exp ?? null;
  } catch {
    return null;
  }
}
