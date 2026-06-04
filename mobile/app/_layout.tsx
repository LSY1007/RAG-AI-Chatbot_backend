import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useAuthStore } from '../src/authStore';
import { View, ActivityIndicator } from 'react-native';

function AuthGate({ children }: { children: React.ReactNode }) {
  const { token, isInitialized } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (!isInitialized) return;

    const inAuthGroup = segments[0] === '(tabs)';

    if (token && !inAuthGroup) {
      router.replace('/(tabs)');
    } else if (!token && inAuthGroup) {
      router.replace('/login');
    } else if (!token && segments[0] !== 'login') {
      router.replace('/login');
    }
  }, [token, isInitialized]);

  if (!isInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  const { initialize } = useAuthStore();

  useEffect(() => { initialize(); }, []);

  return (
    <AuthGate>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="index" />
      </Stack>
    </AuthGate>
  );
}
