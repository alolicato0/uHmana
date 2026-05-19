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
      <ScrollView contentContainerStyle={{ padding: 24, flexGrow: 1 }}>

        {/* Logo */}
        <View style={styles.logoArea}>
          <Image
            source={require('../assets/images/icon.png')}
            style={styles.logoIcon}
            resizeMode="contain"
          />
          <Text style={styles.wordmark}>
            u<Text style={{ color: colors.primary }}>H</Text>mana
          </Text>
          <Text style={styles.tagline}>IL TUO ASSISTENTE DI SALUTE,{'\n'}SEMPRE CON TE.</Text>
        </View>

        <View style={{ height: 32 }} />

        <ChoiceCard
          title="Sono qui per me"
          subtitle="Area Umano"
          emoji="👤"
          color="#E0F2F1"
          onPress={() => {
            setKind('human');
            router.push('/(auth)/sign-in');
          }}
        />
        <View style={{ height: 16 }} />
        <ChoiceCard
          title={'Sono qui per\nil mio animale'}
          subtitle="Area Animale"
          emoji="🐾"
          color="#FDF2E9"
          onPress={() => {
            setKind('pet');
            router.push('/(auth)/sign-in');
          }}
        />

        <View style={{ flex: 1, minHeight: 32 }} />
        <PrimaryButton
          label="Inizia"
          onPress={() => router.push('/(auth)/sign-in')}
        />
        <Text style={styles.legal}>
          uHmana è un servizio di supporto informativo. Non sostituisce il
          parere di un medico o veterinario.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function ChoiceCard({
  title,
  subtitle,
  emoji,
  color,
  onPress,
}: {
  title: string;
  subtitle: string;
  emoji: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.choice,
        { backgroundColor: color, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 18, fontWeight: '600', color: colors.ink }}>{title}</Text>
        <Text style={{ color: colors.muted, marginTop: 4 }}>{subtitle}</Text>
      </View>
      <Text style={{ fontSize: 48 }}>{emoji}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  logoArea: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 8,
  },
  logoIcon: {
    width: 88,
    height: 88,
    marginBottom: 12,
  },
  wordmark: {
    fontSize: 42,
    fontWeight: '800',
    color: colors.ink,
    letterSpacing: -1,
  },
  tagline: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
    textAlign: 'center',
    letterSpacing: 0.8,
  },
  legal: {
    marginTop: 16,
    fontSize: 11,
    color: colors.muted,
    textAlign: 'center',
  },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: radii.lg,
  },
});
