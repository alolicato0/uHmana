import { useSignIn } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { colors, radii } from '../../src/theme';

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    if (!isLoaded) return;
    setLoading(true);
    setError(null);
    try {
      const attempt = await signIn.create({ identifier: email, password });
      if (attempt.status === 'complete') {
        await setActive({ session: attempt.createdSessionId });
        router.replace('/(tabs)/home');
      } else {
        setError("Verifica richiesta. Controlla l'email.");
      }
    } catch (e: any) {
      setError(e?.errors?.[0]?.message ?? 'Credenziali non valide.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <Pressable onPress={() => router.back()} style={{ marginBottom: 8 }}>
          <Ionicons name="chevron-back" size={28} color={colors.ink} />
        </Pressable>

        {/* Logo */}
        <View style={styles.logoArea}>
          <Image
            source={require('../../assets/images/icon.png')}
            style={styles.logoIcon}
            resizeMode="contain"
          />
          <Text style={styles.wordmark}>
            u<Text style={{ color: colors.primary }}>H</Text>mana
          </Text>
          <Text style={styles.tagline}>IL TUO ASSISTENTE DI SALUTE,{'\n'}SEMPRE CON TE.</Text>
        </View>

        <View style={{ height: 20 }} />

        <SocialButton
          icon={<Ionicons name="logo-google" size={20} color={colors.ink} />}
          label="Continua con Google"
          onPress={() => {/* TODO: signIn.authenticateWithRedirect oauth_google */}}
        />
        <View style={{ height: 12 }} />
        <SocialButton
          icon={<Ionicons name="logo-apple" size={22} color={colors.ink} />}
          label="Continua con Apple"
          onPress={() => {/* TODO: oauth_apple */}}
        />

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

        <Pressable
          onPress={() => {}}
          style={{ alignSelf: 'flex-end', marginTop: 8 }}
        >
          <Text style={{ color: colors.primary, fontWeight: '500' }}>
            Password dimenticata?
          </Text>
        </Pressable>

        {error && (
          <Text style={{ color: colors.danger, marginTop: 12, fontSize: 13 }}>
            {error}
          </Text>
        )}

        <View style={{ height: 16 }} />
        <PrimaryButton label="Accedi" onPress={onSubmit} loading={loading} />

        <View
          style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 16 }}
        >
          <Text style={{ color: colors.muted }}>Non hai un account? </Text>
          <Link href="/(auth)/sign-up" style={{ color: colors.primary, fontWeight: '600' }}>
            Registrati
          </Link>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SocialButton({
  icon,
  label,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.social,
        pressed && { opacity: 0.85 },
      ]}
    >
      {icon}
      <Text style={{ marginLeft: 10, fontWeight: '600', color: colors.ink }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  logoArea: { alignItems: 'center', marginBottom: 4 },
  logoIcon: { width: 72, height: 72, marginBottom: 8 },
  wordmark: { fontSize: 36, fontWeight: '800', color: colors.ink, letterSpacing: -1 },
  tagline: { fontSize: 11, fontWeight: '600', color: colors.muted, textAlign: 'center', letterSpacing: 0.8, marginTop: 4 },
  title: { fontSize: 28, fontWeight: '800', color: colors.ink },
  subtitle: { color: colors.muted, marginTop: 4 },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
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
