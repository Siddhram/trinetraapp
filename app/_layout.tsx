import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useColorScheme } from '@/hooks/useColorScheme';

// This layout can be used to show different screens based on auth state
function RootLayoutNav() {
  const router = useRouter();
  const segments = useSegments();
  const colorScheme = useColorScheme();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      const currentRoute = segments[0];
      const isAuthRoute = currentRoute === 'LoginScreen' || currentRoute === 'RegisterScreen';
      
      if (user) {
        // User is signed in, redirect to main app if on auth screen
        if (isAuthRoute) {
          router.replace('/(tabs)');
        }
      } else {
        // User is not signed in, redirect to login if not already there
        if (!isAuthRoute) {
          router.replace('/LoginScreen');
        }
      }
    });

    return () => unsubscribe();
  }, [segments, router]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(adminTabs)" />
        <Stack.Screen name="LoginScreen" />
        <Stack.Screen name="RegisterScreen" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) {
    // Only render the app when fonts are loaded
    return null;
  }

  return <RootLayoutNav />;
}
