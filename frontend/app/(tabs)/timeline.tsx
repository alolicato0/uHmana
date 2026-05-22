import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { buildInsightReport } from '../../src/services/insightEngine';
import { useRemindersStore } from '../../src/store/reminders';
import { useSymptomsStore } from '../../src/store/symptoms';
import { useTimelineStore } from '../../src/store/timeline';
import { colors, radii } from '../../src/theme';
import {
  eventTypeEmoji,
  eventTypeLabels,
  type TimelineEvent,
  type TimelineEventType,
} from '../../src/types';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const DAY = 86_400_000;

const TYPE_COLOR: Record<TimelineEventType, string> = {
  symptom: '#F59E0B',
  medication: '#0DB09E',
  visit: '#5B7CFA',
  exam: '#3B82F6',
  vaccine: '#22C55E',
  note: '#6B7280',
  photo: '#8B5CF6',
};

const CHIPS: { key: TimelineEventType | null; label: string }[] = [
  { key: null, label: 'Tutti' },
  { key: 'symptom', label: 'Sintomi' },
  { key: 'medication', label: 'Farmaci' },
  { key: 'visit', label: 'Visite' },
  { key: 'exam', label: 'Esami' },
  { key: 'vaccine', label: 'Vaccini' },
  { key: 'note', label: 'Note' },
];

const DAY_LABELS = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];

export default function TimelineScreen() {
  const events = useTimelineStore((s) => s.events);
  const logs = useSymptomsStore((s) => s.logs);
  const wellness = useSymptomsStore((s) => s.wellness);
  const getWeekTrend = useSymptomsStore((s) => s.getWeekTrend);
  const reminders = useRemindersStore((s) => s.reminders);

  const [filter, setFilter] = useState<TimelineEventType | null>(null);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const now = Date.now();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return events.filter((e) => {
      if (filter && e.type !== filter) return false;
      if (q && !(e.title.toLowerCase().includes(q) || (e.description ?? '').toLowerCase().includes(q))) return false;
      return true;
    });
  }, [events, filter, search]);

  const grouped = useMemo(() => {
    const map: { label: string; items: TimelineEvent[] }[] = [];
    for (const e of filtered) {
      const key = groupLabel(e.date);
      const last = map[map.length - 1];
      if (last && last.label === key) last.items.push(e);
      else map.push({ label: key, items: [e] });
    }
    return map;
  }, [filtered]);

  // ── Hero summary (ultimi 30 giorni) ──
  const last30 = events.filter((e) => now - new Date(e.date).getTime() <= 30 * DAY);
  const countType = (t: TimelineEventType) => last30.filter((e) => e.type === t).length;
  const symptomCount = countType('symptom');
  const visitCount = countType('visit');
  const examCount = countType('exam');
  const activeTherapies = [
    ...new Set(reminders.filter((r) => r.enabled && r.category === 'medication').map((r) => r.title)),
  ].length;

  const report = buildInsightReport(logs, wellness, reminders);
  const statusText =
    report.score >= 75 ? 'stabile' : report.score >= 50 ? 'da monitorare' : 'richiede attenzione';
  const highlight = report.correlations[0] ?? report.memory ?? null;

  const weekTrend = getWeekTrend();
  const trendMax = Math.max(1, ...weekTrend);
  const hasTrendData = weekTrend.some((v) => v > 0);

  const toggleExpand = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    void Haptics.selectionAsync();
    setExpandedId((cur) => (cur === id ? null : id));
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📈 Timeline Salute</Text>
        <Text style={styles.headerSub}>Tutta la tua storia sanitaria in ordine cronologico</Text>
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color={colors.muted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Cerca nella timeline…"
          placeholderTextColor={colors.muted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={colors.muted} />
          </Pressable>
        )}
      </View>

      {/* Filter chips */}
      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {CHIPS.map((c) => {
            const active = filter === c.key;
            return (
              <Pressable
                key={c.key ?? 'all'}
                onPress={() => setFilter(c.key)}
                style={[styles.chip, active && styles.chipActive]}
              >
                {c.key && <Text style={styles.chipEmoji}>{eventTypeEmoji[c.key]}</Text>}
                <Text style={[styles.chipTxt, active && styles.chipTxtActive]}>{c.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
        {/* Hero summary */}
        {!search && !filter && events.length > 0 && (
          <LinearGradient colors={['#0DB09E', '#5B7CFA']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            <Text style={styles.heroLabel}>📅 Ultimi 30 giorni</Text>
            <View style={styles.heroStatsRow}>
              <HeroStat n={symptomCount} label={symptomCount === 1 ? 'sintomo' : 'sintomi'} />
              <HeroStat n={visitCount} label={visitCount === 1 ? 'visita' : 'visite'} />
              <HeroStat n={examCount} label={examCount === 1 ? 'esame' : 'esami'} />
              <HeroStat n={activeTherapies} label={activeTherapies === 1 ? 'terapia' : 'terapie'} />
            </View>
            <View style={styles.heroStatusPill}>
              <View style={styles.heroStatusDot} />
              <Text style={styles.heroStatusTxt}>Stato generale: {statusText}</Text>
            </View>
          </LinearGradient>
        )}

        {/* AI highlight */}
        {!search && !filter && highlight && (
          <Pressable style={styles.aiCard} onPress={() => router.push('/insight')}>
            <View style={styles.aiHeaderRow}>
              <Text style={{ fontSize: 16 }}>🧠</Text>
              <Text style={styles.aiHeaderTxt}>Insight Timeline</Text>
              <Ionicons name="chevron-forward" size={15} color={colors.muted} style={{ marginLeft: 'auto' }} />
            </View>
            <Text style={styles.aiBody}>{highlight.body}</Text>
          </Pressable>
        )}

        {/* Mini trend */}
        {!search && !filter && hasTrendData && (
          <View style={styles.trendCard}>
            <Text style={styles.trendTitle}>📈 Andamento sintomi · ultimi 7 giorni</Text>
            <View style={styles.trendBars}>
              {weekTrend.map((v, i) => {
                const h = Math.max(4, (v / trendMax) * 50);
                return (
                  <View key={i} style={styles.trendCol}>
                    <View style={styles.trendTrack}>
                      <View style={[styles.trendFill, { height: h, backgroundColor: v === 0 ? '#E5E7EB' : '#0DB09E' }]} />
                    </View>
                    <Text style={styles.trendDay}>{DAY_LABELS[i]}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Chronological events */}
        {grouped.map((group) => (
          <View key={group.label} style={{ marginBottom: 8 }}>
            <Text style={styles.groupTitle}>{group.label}</Text>
            {group.items.map((e) => (
              <EventCard
                key={e.id}
                event={e}
                expanded={expandedId === e.id}
                onToggle={() => toggleExpand(e.id)}
              />
            ))}
          </View>
        ))}

        {filtered.length === 0 && (
          <View style={styles.emptyBox}>
            <Text style={{ fontSize: 34 }}>{search || filter ? '🔍' : '🗓️'}</Text>
            <Text style={styles.emptyTitle}>
              {search || filter ? 'Nessun evento trovato' : 'La tua storia inizia qui'}
            </Text>
            <Text style={styles.emptyText}>
              {search || filter
                ? 'Prova a cambiare filtro o termine di ricerca.'
                : 'Tocca il + in basso per registrare sintomi, terapie, visite e referti.'}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function HeroStat({ n, label }: { n: number; label: string }) {
  return (
    <View style={styles.heroStat}>
      <Text style={styles.heroStatNum}>{n}</Text>
      <Text style={styles.heroStatLabel}>{label}</Text>
    </View>
  );
}

function EventCard({
  event,
  expanded,
  onToggle,
}: {
  event: TimelineEvent;
  expanded: boolean;
  onToggle: () => void;
}) {
  const d = new Date(event.date);
  const time = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  const fullDate = d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
  const color = TYPE_COLOR[event.type];
  const hasMore = !!event.description || (event.mediaUrls?.length ?? 0) > 0;

  return (
    <Pressable style={[styles.eventCard, { borderLeftColor: color }]} onPress={onToggle}>
      <View style={styles.eventRow}>
        <View style={[styles.eventIcon, { backgroundColor: color + '1A' }]}>
          <Text style={{ fontSize: 18 }}>{eventTypeEmoji[event.type]}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.eventTitle}>{event.title}</Text>
          <Text style={[styles.eventType, { color }]}>{eventTypeLabels[event.type]}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Text style={styles.eventTime}>{time}</Text>
          {hasMore && (
            <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={15} color={colors.muted} />
          )}
        </View>
      </View>

      {expanded && (
        <View style={styles.eventDetail}>
          <Text style={styles.eventDetailDate}>{fullDate} · {time}</Text>
          {event.description ? <Text style={styles.eventDesc}>{event.description}</Text> : null}
          {(event.mediaUrls?.length ?? 0) > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {event.mediaUrls!.map((uri, i) => (
                  <Image key={i} source={{ uri }} style={styles.eventMedia} contentFit="cover" />
                ))}
              </View>
            </ScrollView>
          )}
        </View>
      )}
    </Pressable>
  );
}

function groupLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  const same = (a: Date, b: Date) =>
    a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
  if (same(d, today)) return 'Oggi';
  if (same(d, yest)) return 'Ieri';
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' });
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 8 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: colors.ink },
  headerSub: { fontSize: 12, color: colors.muted, marginTop: 2 },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 10,
    marginHorizontal: 16,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.ink },

  chipRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipEmoji: { fontSize: 13 },
  chipTxt: { fontSize: 13, fontWeight: '600', color: colors.ink },
  chipTxtActive: { color: '#fff', fontWeight: '700' },

  hero: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#0DB09E',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 5,
  },
  heroLabel: { color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: '700' },
  heroStatsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
  heroStat: { alignItems: 'center', flex: 1 },
  heroStatNum: { color: '#fff', fontSize: 26, fontWeight: '800' },
  heroStatLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 2 },
  heroStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginTop: 16,
    alignSelf: 'flex-start',
  },
  heroStatusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },
  heroStatusTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },

  aiCard: {
    backgroundColor: '#fff',
    borderRadius: radii.md,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#C7E9FF',
    borderLeftWidth: 4,
    borderLeftColor: '#06B6D4',
  },
  aiHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  aiHeaderTxt: { fontSize: 13, fontWeight: '700', color: '#0891B2' },
  aiBody: { fontSize: 14, color: colors.ink, marginTop: 6, lineHeight: 20 },

  trendCard: {
    backgroundColor: '#fff',
    borderRadius: radii.md,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  trendTitle: { fontSize: 13, fontWeight: '700', color: colors.ink, marginBottom: 12 },
  trendBars: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  trendCol: { flex: 1, alignItems: 'center', gap: 5 },
  trendTrack: { height: 50, justifyContent: 'flex-end' },
  trendFill: { width: 16, borderRadius: 5 },
  trendDay: { fontSize: 11, color: colors.muted, fontWeight: '600' },

  groupTitle: { color: colors.muted, fontWeight: '700', marginBottom: 8, marginTop: 6, fontSize: 13 },
  eventCard: {
    backgroundColor: '#fff',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  eventIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  eventTitle: { fontSize: 14, fontWeight: '700', color: colors.ink },
  eventType: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  eventTime: { color: colors.muted, fontSize: 12, fontWeight: '600' },

  eventDetail: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  eventDetailDate: { fontSize: 11, color: colors.muted, textTransform: 'capitalize', marginBottom: 6 },
  eventDesc: { fontSize: 13, color: colors.ink, lineHeight: 19 },
  eventMedia: { width: 84, height: 84, borderRadius: 12, backgroundColor: '#F3F4F6' },

  emptyBox: {
    backgroundColor: '#fff',
    borderRadius: radii.lg,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
    marginTop: 20,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.ink, marginTop: 4 },
  emptyText: { fontSize: 13, color: colors.muted, textAlign: 'center', lineHeight: 19 },
});
