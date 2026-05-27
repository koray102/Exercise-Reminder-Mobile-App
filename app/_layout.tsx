import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AppProvider } from '../contexts/AppContext';
import { Colors } from '../constants/Colors';
import {
  requestNotificationPermissions,
  setupNotificationCategories,
} from '../services/notificationService';

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'index',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();



export default function RootLayout() {
  const [fontsLoaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    // Initialize notifications
    async function initNotifications() {
      try {
        await requestNotificationPermissions();
        await setupNotificationCategories();
      } catch (e) {
        console.warn('Notification setup skipped (Expo Go limitation):', e);
      }
    }
    initNotifications();
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: Colors.background }}>
    <AppProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.textPrimary,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: Colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: 'Flexify',
            headerTitleStyle: {
              fontWeight: '800',
              fontSize: 22,
              color: Colors.accent,
            },
          }}
        />
        <Stack.Screen
          name="category/add"
          options={{
            title: 'Yeni Kategori',
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="category/[id]/edit"
          options={{
            title: 'Kategori Düzenle',
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="exercise/[categoryId]"
          options={{
            title: 'Egzersiz',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="settings"
          options={{
            title: 'Ayarlar',
          }}
        />
      </Stack>
    </AppProvider>
    </GestureHandlerRootView>
  );
}
