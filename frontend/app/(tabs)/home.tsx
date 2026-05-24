import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getMode, type FeatureTileConfig, type ModeConfig } from '../../src/config/modeConfig';
import { useAuth } from '../../src/context/AuthContext';
import { usePreventionStore } from '../../src/store/prevention';
import { useProfileStore } from '../../src/store/profile';
import { useRemindersStore } from '../../src/store/reminders';
import { computeHealthScore, useSymptomsStore } from '../../src/store/symptoms';
import { colors, radii } from '../../src/theme';
import type { ProfileKind } from '../../src/types';

export default function HomeScreen() {
  const { user } = useAuth();
  const activeKind = useProfileStore((s) => s.activeKind);
  const setKind = useProfileStore((s) => s.setActiveKind);
  const getProfile = useProfileStore((s) => s.getActiveProfile);
  const profile = getProfile();
  const mode = getMode(activeKind);

  const reminders = useRemindersStore((s) => s.reminders);
  const vaccines = usePreventionStore((s) => s.vaccines);
  const antis = usePreventionStore((s) => s.antiparasitics);
  const checks = usePreventionStore((s) => s.checks);

  const upcoming: { id: string; title: string; time: string }[] =
    activeKind === 'pet'
      ? (() => {
          const out: { id: string; title: string; iso: string; type: string }[] = [];
          vaccines.forEach((v) => v.nextDate && out.push({ id: `v_${v.id}`, title: v.name, iso: v.nextDate, type: 'Vaccino' }));
          antis.forEach((a) => out.push({ id: `a_${a.id}`, title: a.name, iso: a.nextDate, type: 'Antiparassitario' }));
          checks.forEach((c) => c.nextDate && out.push({ id: `c_${c.id}`, title: c.name, iso: c.nextDate, type: 'Controllo' }));
          return out
            .sort((x, y) => x.iso.localeCompare(y.iso))
            .slice(0, 3)
            .map((it) => {
              const [y, m, d] = it.iso.split('-').map(Number);
              const target = new Date(y, m - 1, d);
              const now = new Date();
              now.setHours(0, 0, 0, 0);
              const days = Math.round((target.getTime() - now.getTime()) / 86400000);
              const when = days < 0 ? `scaduto ${Math.abs(days)}gg fa` : days === 0 ? 'oggi' : days === 1 ? 'domani' : `tra ${days}gg`;
              return { id: it.id, title: `${it.title} · ${it.type}`, time: when };
            });
        })()
      : reminders
          .filter((r) => r.enabled)
          .slice(0, 3)
          .map((r) => ({ id: r.id, title: r.title, time: r.schedule.time ?? r.schedule.kind }));

  const notifCount: number =
    activeKind === 'pet'
      ? vaccines.filter((v) => !!v.nextDate).length + antis.length + checks.filter((c) => !!c.nextDate).length
      : reminders.filter((r) => r.enabled).length;

  const firstName = user?.name?.split(' ')[0] ?? profile?.name?.split(' ')[0] ?? '';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: mode.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 32 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>{mode.greeting(firstName)}</Text>
            <Text style={styles.subtitle}>{mode.subtitle}</Text>
          </View>
          <Pressable onPress={() => router.push('/notifications')} hitSlop={8} style={{ padding: 4 }}>
            <Ionicons name="notifications-outline" size={26} color={colors.ink} />
            {notifCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeTxt}>{notifCount > 9 ? '9+' : String(notifCount)}</Text>
              </View>
            )}
          </Pressable>
        </View>

        <View style={{ height: 20 }} />
        <KindToggle kind={activeKind} onChange={setKind} accent={mode.primary} />

        <View style={{ height: 20 }} />
        <HeroCard mode={mode} kind={activeKind} />

        <View style={{ height: 20 }} />
        <View style={styles.grid}>
          {mode.tiles.map((t) => (
            <FeatureTile key={t.title} tile={t} radius={mode.cardRadius} />
          ))}
        </View>

        <View style={{ height: 16 }} />
        <EmergencyCta onPress={() => router.push('/emergency')} />

        <View style={{ height: 24 }} />
        <Text style={styles.sectionTitle}>{mode.upcomingSectionTitle}</Text>
        <View style={{ height: 8 }} />
        {upcoming.length === 0 ? (
          <Text style={styles.emptyText}>{mode.emptyUpcoming}</Text>
        ) : (
          upcoming.map((r) => (
            <ReminderRow key={r.id} title={r.title} time={r.time} />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function KindToggle({
  kind,
  onChange,
  accent,
}: {
  kind: ProfileKind;
  onChange: (k: ProfileKind) => void;
  accent: string;
}) {
  const Btn = ({ k, label }: { k: ProfileKind; label: string }) => {
    const active = kind === k;
    return (
      <Pressable
        onPress={() => onChange(k)}
        style={[styles.toggleBtn, active && { backgroundColor: accent }]}
      >
        <Text style={{ color: active ? '#fff' : colors.ink, fontWeight: '600' }}>{label}</Text>
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

function HeroCard({ mode, kind }: { mode: ModeConfig; kind: ProfileKind }) {
  const logs = useSymptomsStore((s) => s.logs);
  const wellness = useSymptomsStore((s) => s.wellness);

  let gradient: [string, string] = mode.heroGradient;
  let title = mode.heroTitle;
  let subtitle = mode.heroSubtitle;

  if (kind === 'human') {
    const score = computeHealthScore(logs, wellness);

    if (score >= 75) {
      gradient = ['#0DB09E', '#22C55E'];
      title = 'Tutto sotto controllo';
    } else if (score >= 50) {
      gradient = ['#F59E0B', '#EF4444'];
      title = 'Attenzione alla salute';
    } else {
      gradient = ['#EF4444', '#DC2626'];
      title = 'Necessita attenzione';
    }

    // Calcola "ultimo aggiornamento"
    const times: Date[] = [];
    if (logs.length > 0) times.push(new Date(logs[0].date));
    if (wellness?.date) times.push(new Date(wellness.date + 'T12:00:00'));

    if (times.length > 0) {
      const recent = times.sort((a, b) => b.getTime() - a.getTime())[0];
      const diffMin = Math.floor((Date.now() - recent.getTime()) / 60000);
      if (diffMin < 2) subtitle = 'Aggiornato adesso';
      else if (diffMin < 60) subtitle = `Aggiornato ${diffMin}min fa`;
      else if (diffMin < 1440) subtitle = `Aggiornato ${Math.floor(diffMin / 60)}h fa`;
      else subtitle = `Aggiornato ${Math.floor(diffMin / 1440)}gg fa`;
    } else {
      subtitle = 'Aggiungi sintomi per monitorare';
    }
  }

  return (
    <LinearGradient
      colors={gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.overview, { borderRadius: mode.cardRadius }]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Ionicons name="heart" size={18} color="#fff" />
        <Text style={{ color: '#fff', marginLeft: 8, fontWeight: '600' }}>{mode.heroLabel}</Text>
      </View>
      <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 12 }}>
        {title}
      </Text>
      <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 4 }}>
        {subtitle}
      </Text>
    </LinearGradient>
  );
}

function FeatureTile({ tile, radius }: { tile: FeatureTileConfig; radius: number }) {
  return (
    <Pressable
      onPress={() => router.push(tile.route as never)}
      style={[styles.tile, { borderRadius: radius }]}
    >
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 11,
          backgroundColor: tile.color + '22',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={tile.icon} size={20} color={tile.color} />
      </View>
      <View style={{ marginTop: 12 }}>
        <Text style={{ fontWeight: '700', fontSize: 14 }}>{tile.title}</Text>
        <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>{tile.subtitle}</Text>
      </View>
    </Pressable>
  );
}

function EmergencyCta({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.emergency}>
      <Ionicons name="alert-circle" size={22} color={colors.danger} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={{ fontWeight: '700', color: colors.danger }}>È urgente?</Text>
        <Text style={{ color: colors.muted, fontSize: 12 }}>Avvia una valutazione rapida AI</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.danger} />
    </Pressable>
  );
}

function ReminderRow({ title, time }: { title: string; time: string }) {
  return (
    <View style={styles.reminderRow}>
      <Ionicons name="time-outline" size={18} color={colors.muted} />
      <Text style={{ flex: 1, marginLeft: 10, fontWeight: '500' }}>{title}</Text>
      <Text style={{ color: colors.muted }}>{time}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -2,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#fff',
  },
  badgeTxt: { color: '#fff', fontSize: 10, fontWeight: '800' },
  greeting: { fontSize: 22, fontWeight: '700', color: colors.ink },
  subtitle: { color: colors.muted, marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: colors.ink },
  emptyText: {
    color: colors.muted,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 12,
  },
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
  overview: { padding: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: {
    flexGrow: 1,
    flexBasis: '47%',
    backgroundColor: '#fff',
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
