import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from '../src/context/AuthContext';
import { setupNotifications } from '../src/services/notifications';

export default function RootLayout() {
  useEffect(() => {
    void setupNotifications();
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
          <Stack.Screen name="reminders" options={{ headerShown: true, title: 'Promemoria' }} />
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
