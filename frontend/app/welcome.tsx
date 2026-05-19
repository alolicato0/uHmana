import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
          <Text style={styles.smallHeader}>Benvenuto in</Text>
          <Text style={styles.wordmark}>
            u<Text style={{ color: colors.primary }}>H</Text>mana
          </Text>
          <Text style={styles.subtitle}>
            Il tuo assistente di salute{'\n'}per te e per i tuoi animali.
          </Text>
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
          <View style={[styles.cardImage, { backgroundColor: '#5BBFB5' }]}>
            <Text style={styles.cardEmoji}>👩</Text>
            <Text style={[styles.cardEmoji, styles.cardEmojiBack]}>👨</Text>
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
          <View style={[styles.cardImage, { backgroundColor: '#E8C97A' }]}>
            <Text style={styles.cardEmoji}>🐈</Text>
            <Text style={[styles.cardEmoji, styles.cardEmojiBack]}>🐕</Text>
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
    paddingTop: 8,
  },
  smallHeader: {
    fontSize: 20,
    fontWeight: '500',
    color: colors.muted,
  },
  wordmark: {
    fontSize: 44,
    fontWeight: '800',
    color: colors.ink,
    letterSpacing: -1,
    marginTop: 2,
  },
  subtitle: {
    marginTop: 8,
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
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
    width: 110,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cardEmoji: {
    fontSize: 52,
    position: 'absolute',
    right: 8,
    bottom: 8,
  },
  cardEmojiBack: {
    fontSize: 44,
    right: 44,
    bottom: 20,
    opacity: 0.85,
  },
  legal: {
    marginTop: 16,
    fontSize: 11,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 16,
  },
});
