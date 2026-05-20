import { Ionicons } from '@expo/vector-icons';
import * as AuthSession from 'expo-auth-session';
import { Link, router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { useAuth } from '../../src/context/AuthContext';
import { colors, radii } from '../../src/theme';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? '';

const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
};

export default function SignInScreen() {
  const { signIn, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirectUri = AuthSession.makeRedirectUri({ scheme: 'uhmana', path: 'auth/callback' });

  const [request, , promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: GOOGLE_CLIENT_ID,
      scopes: ['openid', 'profile', 'email'],
      redirectUri,
    },
    discovery,
  );

  const onSubmit = async () => {
    if (!email || !password) return;
    setLoading(true);
    setError(null);
    try {
      await signIn(email, password);
      router.replace('/(tabs)/home');
    } catch (e: any) {
      setError(e?.message ?? 'Credenziali non valide');
    } finally {
      setLoading(false);
    }
  };

  const onGooglePress = async () => {
    if (!GOOGLE_CLIENT_ID) {
      setError('Google login non configurato (EXPO_PUBLIC_GOOGLE_CLIENT_ID mancante)');
      return;
    }
    setGoogleLoading(true);
    setError(null);
    try {
      const result = await promptAsync();
      if (result?.type !== 'success') return;

      const tokenRes = await AuthSession.exchangeCodeAsync(
        {
          clientId: GOOGLE_CLIENT_ID,
          redirectUri,
          code: result.params.code,
          extraParams: { code_verifier: request?.codeVerifier ?? '' },
        },
        discovery,
      );

      await signInWithGoogle(tokenRes.accessToken);
      router.replace('/(tabs)/home');
    } catch (e: any) {
      setError(e?.message ?? 'Errore login Google');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <Pressable onPress={() => router.back()} style={{ marginBottom: 8 }}>
          <Ionicons name="chevron-back" size={28} color={colors.ink} />
        </Pressable>

        <View style={styles.logoArea}>
          <Image
            source={require('../../assets/images/icon.png')}
            style={styles.logoIcon}
            resizeMode="contain"
          />
          <Text style={styles.wordmark}>
            <Text style={{ color: '#00B5A6' }}>u</Text>
            <Text style={{ color: '#0F172A' }}>Hmana</Text>
          </Text>
          <Text style={styles.tagline}>IL TUO ASSISTENTE DI SALUTE,{'\n'}SEMPRE CON TE.</Text>
        </View>

        <View style={{ height: 20 }} />

        <Pressable
          onPress={onGooglePress}
          disabled={googleLoading || !request}
          style={({ pressed }) => [
            styles.social,
            pressed && { opacity: 0.85 },
            (googleLoading || !request) && { opacity: 0.5 },
          ]}
        >
          <Ionicons name="logo-google" size={20} color={colors.ink} />
          <Text style={{ marginLeft: 10, fontWeight: '600', color: colors.ink }}>
            {googleLoading ? 'Apertura...' : 'Continua con Google'}
          </Text>
        </Pressable>

        <View style={styles.divider}>
          <View style={styles.line} />
          <Text style={{ color: colors.muted, marginHorizontal: 8 }}>oppure</Text>
          <View style={styles.line} />
        </View>

        <Text style={styles.label}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Inserisci la tua email"
          keyboardType="email-address"
          autoCapitalize="none"
          style={styles.input}
        />

        <Text style={[styles.label, { marginTop: 12 }]}>Password</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Inserisci la password"
          secureTextEntry
          style={styles.input}
        />

        {error && (
          <Text style={{ color: colors.danger, marginTop: 12, fontSize: 13 }}>{error}</Text>
        )}

        <View style={{ height: 16 }} />
        <PrimaryButton label="Accedi" onPress={onSubmit} loading={loading} />

        <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 16 }}>
          <Text style={{ color: colors.muted }}>Non hai un account? </Text>
          <Link href="/(auth)/sign-up" style={{ color: colors.primary, fontWeight: '600' }}>
            Registrati
          </Link>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  logoArea: { alignItems: 'center', marginBottom: 4 },
  logoIcon: { width: 72, height: 72, marginBottom: 8 },
  wordmark: { fontSize: 36, fontWeight: '800', color: colors.ink, letterSpacing: -1 },
  tagline: { fontSize: 11, fontWeight: '600', color: colors.muted, textAlign: 'center', letterSpacing: 0.8, marginTop: 4 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  label: { fontWeight: '600', color: colors.ink, marginBottom: 6 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  social: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
  },
});
