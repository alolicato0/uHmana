import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AddMemberModal, MemberSwitcher } from '../../src/components/MemberSwitcher';
import { getMode, type FeatureTileConfig, type ModeConfig } from '../../src/config/modeConfig';
import { useAuth } from '../../src/context/AuthContext';
import {
  memberEmoji,
  useMembersStore,
  type HumanMember,
  type MemberKind,
  type PetMember,
} from '../../src/store/members';
import { useNotifSeenStore } from '../../src/store/notifSeen';
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

  const seenIds = useNotifSeenStore((s) => s.seenIds);
  const notifIds: string[] =
    activeKind === 'pet'
      ? [
          ...vaccines.filter((v) => !!v.nextDate).map((v) => `v_${v.id}`),
          ...antis.map((a) => `a_${a.id}`),
          ...checks.filter((c) => !!c.nextDate).map((c) => `c_${c.id}`),
        ]
      : reminders.filter((r) => r.enabled).map((r) => r.id);
  const seenSet = useMemo(() => new Set(seenIds), [seenIds]);
  const notifCount = notifIds.filter((id) => !seenSet.has(id)).length;

  const firstName = user?.name?.split(' ')[0] ?? profile?.name?.split(' ')[0] ?? '';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: mode.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', paddingTop: 8 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>{mode.greeting(firstName)}</Text>
            <Text style={styles.subtitle} numberOfLines={2}>{mode.subtitle}</Text>
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

        <View style={{ height: 12 }} />
        <KindToggle kind={activeKind} onChange={setKind} accent={mode.primary} />

        <View style={{ height: 10 }} />
        <MemberSwitcher kind={activeKind} accent={mode.primary} variant="header" />

        <View style={{ height: 12 }} />
        <HeroCard mode={mode} kind={activeKind} />

        <View style={{ height: 12 }} />
        <FamilySection kind={activeKind} accent={mode.primary} />

        <View style={{ height: 12 }} />
        <View style={styles.grid}>
          {mode.tiles.map((t) => (
            <FeatureTile key={t.title} tile={t} radius={mode.cardRadius} />
          ))}
        </View>

        <View style={{ height: 10 }} />
        <EmergencyCta onPress={() => router.push('/emergency')} />

        <View style={{ height: 12 }} />
        <UpcomingSection
          title={mode.upcomingSectionTitle}
          items={upcoming}
          emptyText={mode.emptyUpcoming}
          accent={mode.primary}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function FamilySection({ kind, accent }: { kind: MemberKind; accent: string }) {
  const members = useMembersStore((s) => (kind === 'human' ? s.humans : s.pets)) as
    | HumanMember[]
    | PetMember[];
  const activeId = useMembersStore((s) => (kind === 'human' ? s.activeHumanId : s.activePetId));
  const setActive = useMembersStore((s) =>
    kind === 'human' ? s.setActiveHuman : s.setActivePet,
  );
  const [addOpen, setAddOpen] = useState(false);

  const sectionTitle = kind === 'human' ? '👨‍👩‍👧 Famiglia' : '🐾 I miei animali';

  return (
    <View>
      <View style={styles.familyHeader}>
        <Text style={styles.sectionTitle}>{sectionTitle}</Text>
        <Pressable hitSlop={8} onPress={() => setAddOpen(true)}>
          <Text style={[styles.addLink, { color: accent }]}>+ Aggiungi</Text>
        </Pressable>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginTop: 6 }}
        contentContainerStyle={{ gap: 8, paddingRight: 8 }}
      >
        {(members as (HumanMember | PetMember)[]).map((m) => {
          const isActive = m.id === activeId;
          return (
            <Pressable
              key={m.id}
              onPress={() => {
                void Haptics.selectionAsync();
                setActive(m.id);
              }}
              style={[
                styles.memberChip,
                isActive && { backgroundColor: accent, borderColor: accent },
              ]}
            >
              <Text style={styles.memberChipEmoji}>{memberEmoji(m)}</Text>
              <Text
                style={[styles.memberChipName, isActive && { color: '#fff' }]}
                numberOfLines={1}
              >
                {m.name}
              </Text>
            </Pressable>
          );
        })}
        <Pressable
          onPress={() => setAddOpen(true)}
          style={[styles.memberChip, { borderStyle: 'dashed' }]}
        >
          <Ionicons name="add" size={18} color={accent} />
        </Pressable>
      </ScrollView>
      <AddMemberModal
        visible={addOpen}
        kind={kind}
        accent={accent}
        onClose={() => setAddOpen(false)}
        onAdded={() => setAddOpen(false)}
      />
    </View>
  );
}

function UpcomingSection({
  title,
  items,
  emptyText,
  accent,
}: {
  title: string;
  items: { id: string; title: string; time: string }[];
  emptyText: string;
  accent: string;
}) {
  const [expanded, setExpanded] = useState(false);

  if (items.length === 0) {
    return (
      <View>
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={{ height: 8 }} />
        <Text style={styles.emptyText}>{emptyText}</Text>
      </View>
    );
  }

  return (
    <View style={styles.upcomingCard}>
      <Pressable
        onPress={() => {
          void Haptics.selectionAsync();
          setExpanded((v) => !v);
        }}
        style={styles.upcomingHeader}
      >
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={[styles.countBadge, { backgroundColor: accent + '22' }]}>
          <Text style={[styles.countBadgeTxt, { color: accent }]}>{items.length}</Text>
        </View>
        <View style={{ flex: 1 }} />
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={colors.muted}
        />
      </Pressable>
      {expanded && (
        <View style={{ marginTop: 12 }}>
          {items.map((r) => (
            <ReminderRow key={r.id} title={r.title} time={r.time} />
          ))}
        </View>
      )}
    </View>
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
        <Text style={{ color: '#fff', marginLeft: 6, fontWeight: '600' }}>{mode.heroLabel}</Text>
      </View>
      <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', marginTop: 8 }}>
        {title}
      </Text>
      <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 2 }}>
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
          width: 34,
          height: 34,
          borderRadius: 10,
          backgroundColor: tile.color + '22',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={tile.icon} size={18} color={tile.color} />
      </View>
      <View style={{ marginTop: 8 }}>
        <Text style={{ fontWeight: '700', fontSize: 13 }}>{tile.title}</Text>
        <Text style={{ color: colors.muted, fontSize: 11, marginTop: 2 }}>{tile.subtitle}</Text>
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
        <Text style={{ color: colors.muted, fontSize: 11 }}>Avvia una valutazione rapida AI</Text>
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
  greeting: { fontSize: 20, fontWeight: '700', color: colors.ink },
  subtitle: { color: colors.muted, marginTop: 2, fontSize: 13 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: colors.ink },
  emptyText: {
    color: colors.muted,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 12,
  },
  toggle: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: radii.pill,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radii.pill,
    alignItems: 'center',
  },
  overview: { padding: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: {
    flexGrow: 1,
    flexBasis: '47%',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  emergency: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 11,
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
  familyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addLink: { fontSize: 13, fontWeight: '700' },
  memberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#fff',
    minWidth: 44,
    justifyContent: 'center',
  },
  memberChipEmoji: { fontSize: 16 },
  memberChipName: { fontSize: 13, fontWeight: '700', color: colors.ink, maxWidth: 110 },
  upcomingCard: {
    backgroundColor: '#fff',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 8,
  },
  upcomingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  countBadge: {
    minWidth: 24,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  countBadgeTxt: { fontSize: 12, fontWeight: '800' },
});
