import { View, ActivityIndicator, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '@/lib/auth-context';

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Orbitron: require('@/assets/fonts/Orbitron-Bold.ttf'),
    Roboto: require('@/assets/fonts/Roboto-Regular.ttf'),
    'Roboto-Medium': require('@/assets/fonts/Roboto-Medium.ttf'),
  });

  if (!fontsLoaded && !fontError) {
    return (
      <View style={{ flex: 1, backgroundColor: '#6000FF', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  const content = (
    <AuthProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0D0D0D' } }} />
    </AuthProvider>
  );

  // On web, wrap in a max-width container
  if (Platform.OS === 'web') {
    return (
      <View style={{ flex: 1, backgroundColor: '#0D0D0D', alignItems: 'center' }}>
        <View style={{ flex: 1, width: '100%', maxWidth: 1200 }}>
          {content}
        </View>
      </View>
    );
  }

  return content;
}
