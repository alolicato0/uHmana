import { Ionicons } from '@expo/vector-icons';
import {
  GoogleSignin,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { Link, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { useAuth } from '../../src/context/AuthContext';
import { colors, radii } from '../../src/theme';
import { VERSION_STRING } from '../../src/version';

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';

export default function SignInScreen() {
  const { signIn, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (GOOGLE_WEB_CLIENT_ID) {
      GoogleSignin.configure({
        webClientId: GOOGLE_WEB_CLIENT_ID,
        offlineAccess: false,
        scopes: ['openid', 'profile', 'email'],
      });
    }
  }, []);

  const onSubmit = async () => {
    if (!email || !password) return;
    setLoading(true);
    setError(null);
    try {
      await signIn(email, password);
      router.replace('/');
    } catch (e: any) {
      setError(e?.message ?? 'Credenziali non valide');
    } finally {
      setLoading(false);
    }
  };

  const onGooglePress = async () => {
    if (!GOOGLE_WEB_CLIENT_ID) {
      setError('Google login non configurato');
      return;
    }
    setGoogleLoading(true);
    setError(null);
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      // Forza sempre la scelta dell'account invece di rientrare con l'ultimo usato.
      try {
        await GoogleSignin.signOut();
      } catch {
        // nessun account in cache — ok
      }
      const res = await GoogleSignin.signIn();
      const tokens = await GoogleSignin.getTokens();

      if (!tokens.accessToken) {
        throw new Error('Token Google non ricevuto');
      }

      await signInWithGoogle(tokens.accessToken);
      router.replace('/');
    } catch (e: any) {
      if (isErrorWithCode(e)) {
        if (e.code === statusCodes.SIGN_IN_CANCELLED) {
          // utente ha annullato — nessun errore
        } else if (e.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          setError('Google Play Services non disponibili');
        } else {
          setError(`Errore Google: ${e.code}`);
        }
      } else {
        setError(e?.message ?? 'Errore login Google');
      }
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
            source={require('../../assets/images/logo-full.png')}
            style={styles.logoFull}
            resizeMode="contain"
          />
        </View>

        <View style={{ height: 20 }} />

        <Pressable
          onPress={onGooglePress}
          disabled={googleLoading}
          style={({ pressed }) => [
            styles.social,
            pressed && { opacity: 0.85 },
            googleLoading && { opacity: 0.5 },
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

        <Text style={styles.version}>{VERSION_STRING}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  logoArea: { alignItems: 'center', marginBottom: 4 },
  logoFull: { width: 200, height: 120 },
  version: { marginTop: 20, fontSize: 11, color: colors.muted, textAlign: 'center', fontWeight: '600' },
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
