import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/lib/auth-context';

export default function IndexRouteGuard() {
  const { user, isLoading, accessToken } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (!accessToken) {
      router.replace('/(auth)/splash');
      return;
    }

    // User is authenticated — route based on plan and status
    if (user?.subscription_status === 'past_due') {
      router.replace('/(shared)/settings/billing');
      return;
    }

    if (user?.plan === 'business') {
      router.replace('/(business)/');
      return;
    }

    // Default to solo plan
    router.replace('/(solo)/');
  }, [isLoading, accessToken, user]);

  // Show loading spinner while checking auth state
  return (
    <View style={{ flex: 1, backgroundColor: '#0D0D0D', alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color="#6000FF" />
    </View>
  );
}
