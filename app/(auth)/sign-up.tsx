import { useSignUp } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { colors, radii } from '../../src/theme';

export default function SignUpScreen() {
  const { signUp, setActive, isLoaded } = useSignUp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSignUpPress = async () => {
    if (!isLoaded) return;
    setLoading(true);
    setError(null);
    try {
      await signUp.create({ emailAddress: email, password });
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setPendingVerification(true);
    } catch (e: any) {
      setError(e?.errors?.[0]?.message ?? 'Errore durante la registrazione');
    } finally {
      setLoading(false);
    }
  };

  const onVerifyPress = async () => {
    if (!isLoaded) return;
    setLoading(true);
    setError(null);
    try {
      const attempt = await signUp.attemptEmailAddressVerification({ code });
      if (attempt.status === 'complete') {
        await setActive({ session: attempt.createdSessionId });
        router.replace('/(tabs)/home');
      } else {
        setError('Codice non valido');
      }
    } catch (e: any) {
      setError(e?.errors?.[0]?.message ?? 'Codice non valido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <Pressable onPress={() => router.back()} style={{ marginBottom: 12 }}>
          <Ionicons name="chevron-back" size={28} color={colors.ink} />
        </Pressable>
        <Text style={styles.title}>
          {pendingVerification ? 'Verifica email' : 'Crea il tuo account'}
        </Text>
        <Text style={styles.subtitle}>
          {pendingVerification
            ? 'Ti abbiamo inviato un codice via email'
            : 'È gratis e veloce'}
        </Text>

        <View style={{ height: 24 }} />

        {!pendingVerification ? (
          <>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
            />
            <View style={{ height: 12 }} />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password (min 8 caratteri)"
              secureTextEntry
              style={styles.input}
            />
            {error && (
              <Text style={{ color: colors.danger, marginTop: 12 }}>{error}</Text>
            )}
            <View style={{ height: 16 }} />
            <PrimaryButton label="Crea account" onPress={onSignUpPress} loading={loading} />
          </>
        ) : (
          <>
            <TextInput
              value={code}
              onChangeText={setCode}
              placeholder="Codice di verifica"
              keyboardType="number-pad"
              style={styles.input}
            />
            {error && (
              <Text style={{ color: colors.danger, marginTop: 12 }}>{error}</Text>
            )}
            <View style={{ height: 16 }} />
            <PrimaryButton label="Verifica" onPress={onVerifyPress} loading={loading} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '800', color: colors.ink },
  subtitle: { color: colors.muted, marginTop: 4 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
});
