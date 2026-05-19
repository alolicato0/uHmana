import { ClerkLoaded, ClerkProvider } from '@clerk/clerk-expo';
import { tokenCache } from '@clerk/clerk-expo/token-cache';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

export default function RootLayout() {
  if (!publishableKey) {
    // eslint-disable-next-line no-console
    console.warn(
      'EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY mancante. Setta la variabile in .env',
    );
  }

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <ClerkLoaded>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="welcome" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="emergency"
              options={{ presentation: 'modal' }}
            />
            <Stack.Screen
              name="image-analysis"
              options={{ headerShown: true, title: 'Analisi immagine' }}
            />
            <Stack.Screen
              name="medical-record"
              options={{ headerShown: true, title: 'I miei dati' }}
            />
            <Stack.Screen
              name="reports"
              options={{ headerShown: true, title: 'Referti' }}
            />
            <Stack.Screen
              name="reminders"
              options={{ headerShown: true, title: 'Promemoria' }}
            />
            <Stack.Screen
              name="settings"
              options={{ headerShown: true, title: 'Impostazioni' }}
            />
            <Stack.Screen
              name="add-event"
              options={{
                headerShown: true,
                title: 'Aggiungi evento',
                presentation: 'modal',
              }}
            />
          </Stack>
        </GestureHandlerRootView>
      </ClerkLoaded>
    </ClerkProvider>
  );
}
