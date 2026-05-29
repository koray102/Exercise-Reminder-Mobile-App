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
  scheduleAllNotifications,
  setupNotificationListeners,
} from '../services/notificationService';
import { checkAndResetDailyStreak } from '../services/streakService';

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
    // Initialize notifications and schedule reminders
    async function initNotifications() {
      try {
        const granted = await requestNotificationPermissions();
        await setupNotificationCategories();
        if (granted) {
          await scheduleAllNotifications();
        }
      } catch (e) {
        console.warn('Notification setup skipped (Expo Go limitation):', e);
      }
    }
    initNotifications();

    // Set up notification listeners (received + response handlers)
    let cleanup: (() => void) | undefined;
    try {
      cleanup = setupNotificationListeners();
    } catch (e) {
      console.warn('Notification listener setup skipped:', e);
    }

    // Check and reset daily streak
    checkAndResetDailyStreak().catch(e =>
      console.warn('Daily streak check failed:', e)
    );

    return () => {
      cleanup?.();
    };
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
            title: 'New Category',
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="category/[id]/edit"
          options={{
            title: 'Edit Category',
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="exercise/[categoryId]"
          options={{
            title: 'Exercise',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="settings"
          options={{
            title: 'Settings',
          }}
        />
      </Stack>
    </AppProvider>
    </GestureHandlerRootView>
  );
}
