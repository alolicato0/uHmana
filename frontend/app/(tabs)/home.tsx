import { useAuth } from '../../src/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useProfileStore } from '../../src/store/profile';
import { useRemindersStore } from '../../src/store/reminders';
import { colors, radii } from '../../src/theme';
import type { ProfileKind } from '../../src/types';

export default function HomeScreen() {
  const { user } = useAuth();
  const activeKind = useProfileStore((s) => s.activeKind);
  const setKind = useProfileStore((s) => s.setActiveKind);
  const getProfile = useProfileStore((s) => s.getActiveProfile);
  const profile = getProfile();

  const reminders = useRemindersStore((s) => s.reminders);
  const upcomingReminders = reminders.filter((r) => r.enabled).slice(0, 3);

  const firstName = user?.name?.split(' ')[0] ?? profile?.name?.split(' ')[0] ?? '';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 32 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>Ciao, {firstName} 👋</Text>
            <Text style={styles.subtitle}>
              Prenditi cura della tua salute{'\n'}e di chi ami.
            </Text>
          </View>
          <Pressable onPress={() => router.push('/reminders')}>
            <Ionicons name="notifications-outline" size={26} color={colors.ink} />
          </Pressable>
        </View>

        <View style={{ height: 20 }} />
        <KindToggle kind={activeKind} onChange={setKind} />

        <View style={{ height: 20 }} />
        <OverviewCard />

        <View style={{ height: 20 }} />
        <View style={styles.grid}>
          <FeatureTile
            icon="chatbubble-ellipses-outline"
            title="Chat AI"
            subtitle="Fai una domanda"
            color={colors.primary}
            onPress={() => router.push('/(tabs)/chat')}
          />
          <FeatureTile
            icon="folder-open-outline"
            title="I miei dati"
            subtitle="Cartella clinica"
            color={colors.secondary}
            onPress={() => router.push('/medical-record')}
          />
          <FeatureTile
            icon="pulse-outline"
            title="Timeline"
            subtitle="Storico eventi"
            color={colors.accent}
            onPress={() => router.push('/(tabs)/timeline')}
          />
          <FeatureTile
            icon="medkit-outline"
            title="Promemoria"
            subtitle="Farmaci e visite"
            color={colors.warning}
            onPress={() => router.push('/reminders')}
          />
        </View>

        <View style={{ height: 16 }} />
        <EmergencyCta onPress={() => router.push('/emergency')} />

        <View style={{ height: 24 }} />
        <Text style={styles.sectionTitle}>Prossimi promemoria</Text>
        <View style={{ height: 8 }} />
        {upcomingReminders.length === 0 ? (
          <Text style={{ color: colors.muted, fontSize: 13, textAlign: 'center', paddingVertical: 12 }}>
            Nessun promemoria attivo
          </Text>
        ) : (
          upcomingReminders.map((r) => (
            <ReminderRow key={r.id} title={r.title} time={r.schedule.time ?? r.schedule.kind} />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function KindToggle({
  kind,
  onChange,
}: {
  kind: ProfileKind;
  onChange: (k: ProfileKind) => void;
}) {
  const Btn = ({ k, label }: { k: ProfileKind; label: string }) => {
    const active = kind === k;
    return (
      <Pressable
        onPress={() => onChange(k)}
        style={[
          styles.toggleBtn,
          active && { backgroundColor: colors.primary },
        ]}
      >
        <Text
          style={{
            color: active ? '#fff' : colors.ink,
            fontWeight: '600',
          }}
        >
          {label}
        </Text>
      </Pressable>
    );
  };
  return (
    <View style={styles.toggle}>
      <Btn k="human" label="Umano" />
      <Btn k="pet" label="Animale" />
    </View>
  );
}

function OverviewCard() {
  return (
    <LinearGradient
      colors={[colors.primary, colors.secondary]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.overview}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Ionicons name="heart" size={18} color="#fff" />
        <Text
          style={{ color: '#fff', marginLeft: 8, fontWeight: '600' }}
        >
          Panoramica salute
        </Text>
      </View>
      <Text
        style={{
          color: '#fff',
          fontSize: 18,
          fontWeight: '700',
          marginTop: 12,
        }}
      >
        Tutto sembra in ordine
      </Text>
      <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
        Ultimo aggiornamento: oggi, 08:30
      </Text>
    </LinearGradient>
  );
}

function FeatureTile({
  icon,
  title,
  subtitle,
  color,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.tile}>
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: color + '20',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View style={{ marginTop: 12 }}>
        <Text style={{ fontWeight: '600' }}>{title}</Text>
        <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>
          {subtitle}
        </Text>
      </View>
    </Pressable>
  );
}

function EmergencyCta({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.emergency}>
      <Ionicons name="alert-circle" size={22} color={colors.danger} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={{ fontWeight: '700', color: colors.danger }}>
          È urgente?
        </Text>
        <Text style={{ color: colors.muted, fontSize: 12 }}>
          Avvia una valutazione rapida AI
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.danger} />
    </Pressable>
  );
}

function ReminderRow({ title, time }: { title: string; time: string }) {
  return (
    <View style={styles.reminderRow}>
      <Ionicons name="time-outline" size={18} color={colors.muted} />
      <Text style={{ flex: 1, marginLeft: 10, fontWeight: '500' }}>
        {title}
      </Text>
      <Text style={{ color: colors.muted }}>{time}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  greeting: { fontSize: 22, fontWeight: '700', color: colors.ink },
  subtitle: { color: colors.muted, marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: colors.ink },
  toggle: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: radii.pill,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radii.pill,
    alignItems: 'center',
  },
  overview: {
    padding: 16,
    borderRadius: radii.lg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  tile: {
    flexGrow: 1,
    flexBasis: '47%',
    backgroundColor: '#fff',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  emergency: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: radii.lg,
    backgroundColor: colors.emergencySoft,
    borderWidth: 1,
    borderColor: colors.emergencyBorder,
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radii.md,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
});
