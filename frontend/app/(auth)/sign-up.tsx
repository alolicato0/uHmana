import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { useAuth } from '../../src/context/AuthContext';
import { colors, radii } from '../../src/theme';

export default function SignUpScreen() {
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSignUp = async () => {
    if (!email || !password) return;
    setLoading(true);
    setError(null);
    try {
      await signUp(email, password, name);
      router.replace('/(tabs)/home');
    } catch (e: any) {
      setError(e?.message ?? 'Errore durante la registrazione');
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
        <Text style={styles.title}>Crea il tuo account</Text>
        <Text style={styles.subtitle}>È gratis e veloce</Text>

        <View style={{ height: 20 }} />

        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Nome (opzionale)"
          autoCapitalize="words"
          style={styles.input}
        />
        <View style={{ height: 12 }} />
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
        <PrimaryButton label="Crea account" onPress={onSignUp} loading={loading} />

        <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 16 }}>
          <Text style={{ color: colors.muted }}>Hai già un account? </Text>
          <Pressable onPress={() => router.back()}>
            <Text style={{ color: colors.primary, fontWeight: '600' }}>Accedi</Text>
          </Pressable>
        </View>
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
