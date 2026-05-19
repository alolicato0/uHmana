import { router } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../src/components/PrimaryButton';
import { useProfileStore } from '../src/store/profile';
import { colors, radii } from '../src/theme';

export default function WelcomeScreen() {
  const setKind = useProfileStore((s) => s.setActiveKind);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView contentContainerStyle={styles.container}>

        {/* Header */}
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

        <View style={{ height: 28 }} />

        {/* Card Umano */}
        <Pressable
          onPress={() => { setKind('human'); router.push('/(auth)/sign-in'); }}
          style={({ pressed }) => [styles.card, styles.cardHuman, pressed && { opacity: 0.9 }]}
        >
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>Sono qui per me</Text>
            <Text style={styles.cardSub}>Area Umano</Text>
          </View>
          <View style={[styles.cardImage, { backgroundColor: '#4DB6AC' }]}>
            <Text style={{ fontSize: 38 }}>👩</Text>
            <Text style={{ fontSize: 38, marginTop: -8 }}>👨</Text>
          </View>
        </Pressable>

        <View style={{ height: 16 }} />

        {/* Card Animale */}
        <Pressable
          onPress={() => { setKind('pet'); router.push('/(auth)/sign-in'); }}
          style={({ pressed }) => [styles.card, styles.cardPet, pressed && { opacity: 0.9 }]}
        >
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>Sono qui per{'\n'}il mio animale</Text>
            <Text style={styles.cardSub}>Area Animale</Text>
          </View>
          <View style={[styles.cardImage, { backgroundColor: '#FFCC80' }]}>
            <Text style={{ fontSize: 38 }}>🐈</Text>
            <Text style={{ fontSize: 38, marginTop: -8 }}>🐕</Text>
          </View>
        </Pressable>

        <View style={{ flex: 1, minHeight: 32 }} />

        <PrimaryButton
          label="Inizia"
          onPress={() => router.push('/(auth)/sign-in')}
        />
        <Text style={styles.legal}>
          uHmana è un servizio di supporto informativo.{'\n'}Non sostituisce il parere di un medico o veterinario.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    flexGrow: 1,
  },
  header: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 4,
  },
  logoIcon: {
    width: 80,
    height: 80,
    marginBottom: 12,
  },
  wordmark: {
    fontSize: 44,
    fontWeight: '800',
    letterSpacing: -1,
  },
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
    minHeight: 110,
  },
  cardHuman: {
    backgroundColor: '#E6F7F5',
  },
  cardPet: {
    backgroundColor: '#FDF3E3',
  },
  cardText: {
    flex: 1,
    padding: 20,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.ink,
    lineHeight: 24,
  },
  cardSub: {
    marginTop: 4,
    fontSize: 13,
    color: colors.muted,
    fontWeight: '500',
  },
  cardImage: {
    width: 100,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  legal: {
    marginTop: 16,
    fontSize: 11,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 16,
  },
});
