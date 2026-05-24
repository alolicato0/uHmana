import * as Updates from 'expo-updates';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from '../src/context/AuthContext';
import { setupNotifications } from '../src/services/notifications';
import { usePreventionStore } from '../src/store/prevention';

async function applyOtaIfAvailable() {
  if (__DEV__) return;
  try {
    const check = await Updates.checkForUpdateAsync();
    if (check.isAvailable) {
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    }
  } catch {
    // fail silently — app continua con il bundle corrente
  }
}

export default function RootLayout() {
  useEffect(() => {
    void (async () => {
      const granted = await setupNotifications();
      if (!granted) return;
      const sync = () => {
        void usePreventionStore.getState().syncNotifications();
      };
      if (usePreventionStore.persist.hasHydrated()) {
        sync();
      } else {
        const unsub = usePreventionStore.persist.onFinishHydration(() => {
          sync();
          unsub();
        });
      }
    })();
    void applyOtaIfAvailable();
  }, []);


  return (
    <AuthProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="welcome" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="emergency" options={{ presentation: 'modal' }} />
          <Stack.Screen name="image-analysis" options={{ headerShown: true, title: 'Analisi immagine' }} />
          <Stack.Screen name="medical-record" options={{ headerShown: true, title: 'I miei dati' }} />
          <Stack.Screen name="reports" options={{ headerShown: true, title: 'Referti' }} />
          <Stack.Screen name="reminders" options={{ headerShown: true, title: 'Piano Salute' }} />
          <Stack.Screen name="notifications" options={{ headerShown: false }} />
          <Stack.Screen name="sintomi" options={{ headerShown: false }} />
          <Stack.Screen name="insight" options={{ headerShown: false }} />
          <Stack.Screen name="settings" options={{ headerShown: true, title: 'Impostazioni' }} />
          <Stack.Screen
            name="add-event"
            options={{ headerShown: true, title: 'Aggiungi evento', presentation: 'modal' }}
          />
        </Stack>
      </GestureHandlerRootView>
    </AuthProvider>
  );
}
