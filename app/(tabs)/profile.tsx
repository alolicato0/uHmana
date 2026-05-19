import { useAuth, useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useProfileStore } from '../../src/store/profile';
import { colors, radii } from '../../src/theme';

export default function ProfileScreen() {
  const { user } = useUser();
  const { signOut } = useAuth();
  const profile = useProfileStore((s) => s.getActiveProfile());

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        <LinearGradient
          colors={[colors.primary, colors.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.avatar}>
            <Ionicons name="person" size={42} color={colors.primary} />
          </View>
          <Text style={styles.name}>
            {user?.fullName ?? profile?.name ?? 'Utente'}
          </Text>
          <Text style={styles.email}>
            {user?.primaryEmailAddress?.emailAddress ?? ''}
          </Text>
          <View style={styles.premiumBadge}>
            <Ionicons name="star" size={12} color="#FBBF24" />
            <Text style={{ color: '#fff', fontSize: 12, marginLeft: 4 }}>
              Free
            </Text>
          </View>
        </LinearGradient>

        <View style={{ height: 16 }} />

        <Row
          icon="paw-outline"
          title="I miei animali"
          subtitle="1 animale registrato"
          onPress={() => router.push('/medical-record')}
        />
        <Row
          icon="folder-open-outline"
          title="Archivio documenti"
          subtitle="I tuoi referti salvati"
          onPress={() => router.push('/reports')}
        />
        <Row
          icon="download-outline"
          title="Esporta i miei dati"
          subtitle="Scarica i tuoi dati"
        />
        <Row
          icon="star-outline"
          title="Passa a Premium"
          subtitle="Chat illimitata, backup cloud, e altro"
        />
        <Row
          icon="settings-outline"
          title="Impostazioni"
          subtitle="Privacy, notifiche, lingua"
          onPress={() => router.push('/settings')}
        />
        <Row
          icon="log-out-outline"
          title="Esci"
          subtitle=""
          onPress={() => signOut()}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        pressed && { opacity: 0.7 },
      ]}
    >
      <Ionicons name={icon} size={22} color={colors.primary} />
      <View style={{ flex: 1, marginLeft: 14 }}>
        <Text style={{ fontWeight: '600' }}>{title}</Text>
        {!!subtitle && (
          <Text style={{ color: colors.muted, fontSize: 12 }}>{subtitle}</Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: {
    padding: 24,
    alignItems: 'center',
    borderRadius: radii.lg,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 12,
  },
  email: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: radii.md,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
});
