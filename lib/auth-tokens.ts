import { Platform } from 'react-native';

// TODO: Agent 1 implements full token management
// Uses expo-secure-store on mobile, AsyncStorage/cookie on web

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export async function storeTokens(tokens: TokenPair): Promise<void> {
  if (Platform.OS === 'web') {
    // TODO: Agent 1 implements web token storage
    return;
  }
  // TODO: Agent 1 implements native secure store
}

export async function getTokens(): Promise<TokenPair | null> {
  if (Platform.OS === 'web') {
    // TODO: Agent 1 implements web token retrieval
    return null;
  }
  // TODO: Agent 1 implements native secure store retrieval
  return null;
}

export async function clearTokens(): Promise<void> {
  if (Platform.OS === 'web') {
    // TODO: Agent 1 implements web token cleanup
    return;
  }
  // TODO: Agent 1 implements native secure store cleanup
}
