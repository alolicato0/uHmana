import { router } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../src/components/PrimaryButton';
import { useAuth } from '../src/context/AuthContext';
import { useProfileStore } from '../src/store/profile';
import { colors, radii } from '../src/theme';
import type { ProfileKind } from '../src/types';

export default function WelcomeScreen() {
  const setKind = useProfileStore((s) => s.setActiveKind);
  const { setOnboarded } = useAuth();
  const [selected, setSelected] = useState<ProfileKind | null>(null);

  const onContinue = async () => {
    if (!selected) return;
    setKind(selected);
    await setOnboarded();
    router.replace('/(tabs)/home');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Image
            source={require('../assets/images/icon.png')}
            style={styles.logoIcon}
            resizeMode="contain"
          />
          <Text style={styles.wordmark}>
            <Text style={{ color: '#00B5A6' }}>u</Text>
            <Text style={{ color: '#0F172A' }}>Hmana</Text>
          </Text>
          <Text style={styles.tagline}>IL TUO ASSISTENTE DI SALUTE,{'\n'}SEMPRE CON TE.</Text>
        </View>

        <View style={{ height: 24 }} />

        <Pressable
          onPress={() => setSelected('human')}
          style={({ pressed }) => [
            styles.card,
            styles.cardHuman,
            selected === 'human' && styles.cardSelected,
            pressed && { opacity: 0.92 },
          ]}
        >
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>Sono qui per me</Text>
            <Text style={styles.cardSub}>Salute, sintomi, terapie</Text>
          </View>
          <View style={[styles.cardImage, { backgroundColor: '#4DB6AC' }]}>
            <View style={styles.emojiRow}>
              <Text style={styles.emojiLg}>👩</Text>
              <Text style={styles.emojiLg}>👨</Text>
            </View>
          </View>
        </Pressable>

        <View style={{ height: 16 }} />

        <Pressable
          onPress={() => setSelected('pet')}
          style={({ pressed }) => [
            styles.card,
            styles.cardPet,
            selected === 'pet' && styles.cardSelectedPet,
            pressed && { opacity: 0.92 },
          ]}
        >
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>Sono qui per il mio animale</Text>
            <Text style={styles.cardSub}>Vaccini, dieta, comportamento</Text>
          </View>
          <View style={[styles.cardImage, { backgroundColor: '#FFCC80' }]}>
            <View style={styles.emojiRow}>
              <Text style={styles.emojiLg}>🐈</Text>
              <Text style={styles.emojiLg}>🐕</Text>
            </View>
          </View>
        </Pressable>

        <View style={{ flex: 1, minHeight: 32 }} />

        <PrimaryButton label="Inizia" onPress={onContinue} disabled={!selected} />
        <Text style={styles.legal}>
          uHmana è un servizio di supporto informativo.{'\n'}Non sostituisce il parere di un medico o veterinario.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, flexGrow: 1 },
  header: { alignItems: 'center', paddingTop: 16, paddingBottom: 4 },
  logoIcon: { width: 80, height: 80, marginBottom: 12 },
  wordmark: { fontSize: 44, fontWeight: '800', letterSpacing: -1 },
  tagline: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
    letterSpacing: 0.8,
    lineHeight: 18,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.lg,
    overflow: 'hidden',
    minHeight: 150,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardHuman: { backgroundColor: '#E6F7F5' },
  cardPet: { backgroundColor: '#FDF3E3' },
  cardSelected: { borderColor: '#0DB09E' },
  cardSelectedPet: { borderColor: '#F59E0B' },
  cardText: { flex: 1, padding: 22 },
  cardTitle: { fontSize: 19, fontWeight: '700', color: colors.ink, lineHeight: 26 },
  cardSub: { marginTop: 6, fontSize: 13, color: colors.muted, fontWeight: '500' },
  cardImage: {
    width: 130,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  emojiLg: { fontSize: 52, marginHorizontal: -6 },
  legal: {
    marginTop: 16,
    fontSize: 11,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 16,
  },
});
