import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  LayoutAnimation,
  Modal,
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
import { useAuth } from '../../src/context/AuthContext';
import { MemberSwitcher } from '../../src/components/MemberSwitcher';
import { buildInsightReport } from '../../src/services/insightEngine';
import { useRemindersStore } from '../../src/store/reminders';
import { useSymptomsStore } from '../../src/store/symptoms';
import { useTimelineStore } from '../../src/store/timeline';
import { usePetActivityStore } from '../../src/store/petActivity';
import { usePetNutritionStore } from '../../src/store/petNutrition';
import { useVetStore } from '../../src/store/vetStore';
import { usePreventionStore } from '../../src/store/prevention';
import { useMembersStore } from '../../src/store/members';
import { useProfileStore } from '../../src/store/profile';
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

// ── Human mode constants ──────────────────────────────────────────────────────

const TYPE_COLOR: Record<TimelineEventType, string> = {
  symptom: '#F59E0B',
  medication: '#0DB09E',
  visit: '#5B7CFA',
  exam: '#3B82F6',
  vaccine: '#22C55E',
  note: '#6B7280',
  photo: '#8B5CF6',
};

const HUMAN_ACCENT = '#0DB09E';
const PET_ACCENT = '#10B981';

const HUMAN_CHIPS: { key: TimelineEventType | null; label: string }[] = [
  { key: null, label: 'Tutti' },
  { key: 'symptom', label: 'Sintomi 🌡️' },
  { key: 'medication', label: 'Terapie 💊' },
  { key: 'visit', label: 'Visite 🩺' },
  { key: 'exam', label: 'Referti 📄' },
  { key: 'vaccine', label: 'Vaccini 💉' },
];

const DAY_LABELS = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];

// ── Pet mode constants ────────────────────────────────────────────────────────

type PetCategory = 'attivita' | 'pasto' | 'sintomo' | 'vet' | 'prevenzione' | 'umore';

interface PetTimelineEvent {
  id: string;
  category: PetCategory;
  title: string;
  subtitle?: string;
  emoji: string;
  date: string; // ISO or YYYY-MM-DD
  color: string;
  detail?: string;
  onDelete?: () => void;
  onEdit?: (newNote: string) => void;
}

const PET_CHIPS: { key: PetCategory | null; label: string }[] = [
  { key: null, label: 'Tutti' },
  { key: 'attivita', label: 'Attività 🚶' },
  { key: 'pasto', label: 'Pasti 🍖' },
  { key: 'sintomo', label: 'Sintomi 🤒' },
  { key: 'vet', label: 'Vet 🩺' },
  { key: 'prevenzione', label: 'Prevenzione 💉' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function isIsoWithTime(s: string): boolean {
  return s.length > 10 && s.includes('T');
}

function withinDays(dateStr: string, days: number): boolean {
  return Date.now() - new Date(dateStr).getTime() <= days * DAY;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function HeroStat({ n, label }: { n: number; label: string }) {
  return (
    <View style={styles.heroStat}>
      <Text style={styles.heroStatNum}>{n}</Text>
      <Text style={styles.heroStatLabel}>{label}</Text>
    </View>
  );
}

function HumanEventRow({
  event,
  expanded,
  onToggle,
  onEdit,
  onDelete,
  isLast,
}: {
  event: TimelineEvent;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isLast: boolean;
}) {
  const d = new Date(event.date);
  const time = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  const fullDate = d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
  const color = TYPE_COLOR[event.type];
  const hasMore = !!event.description || (event.mediaUrls?.length ?? 0) > 0;

  return (
    <View style={[styles.innerEventRow, !isLast && styles.innerEventRowSep]}>
      <View style={[styles.leftBar, { backgroundColor: color }]} />
      <Pressable style={styles.innerEventInner} onPress={onToggle}>
        <View style={styles.eventRow}>
          <View style={[styles.eventIcon, { backgroundColor: color + '1A' }]}>
            <Text style={{ fontSize: 18 }}>{eventTypeEmoji[event.type]}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.eventTitle}>{event.title}</Text>
            <Text style={[styles.eventType, { color }]}>{eventTypeLabels[event.type]}</Text>
          </View>
          <View style={styles.actionsCol}>
            <View style={styles.actionsRow}>
              <Pressable onPress={onEdit} hitSlop={8} style={styles.actionBtn}>
                <Ionicons name="create-outline" size={18} color={colors.muted} />
              </Pressable>
              <Pressable onPress={onDelete} hitSlop={8} style={styles.actionBtn}>
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
              </Pressable>
            </View>
            <View style={styles.timeRow}>
              <Text style={styles.eventTime}>{time}</Text>
              {hasMore && (
                <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={colors.muted} />
              )}
            </View>
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
    </View>
  );
}

function PetEventRow({
  event,
  expanded,
  onToggle,
  onEdit,
  onDelete,
  isLast,
}: {
  event: PetTimelineEvent;
  expanded: boolean;
  onToggle: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  isLast: boolean;
}) {
  const withTime = isIsoWithTime(event.date);
  const d = new Date(event.date);
  const timeStr = withTime
    ? `ore ${d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`
    : groupLabel(event.date);
  const fullDateStr = withTime
    ? d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }) +
      ' · ore ' +
      d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <View style={[styles.innerEventRow, !isLast && styles.innerEventRowSep]}>
      <View style={[styles.leftBar, { backgroundColor: event.color }]} />
      <Pressable style={styles.innerEventInner} onPress={onToggle}>
        <View style={styles.eventRow}>
          <View style={[styles.petEventIcon, { backgroundColor: event.color + '20' }]}>
            <Text style={{ fontSize: 20 }}>{event.emoji}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.eventTitle}>{event.title}</Text>
            {event.subtitle ? <Text style={[styles.eventType, { color: event.color }]}>{event.subtitle}</Text> : null}
          </View>
          <View style={styles.actionsCol}>
            <View style={styles.actionsRow}>
              {onEdit && (
                <Pressable onPress={onEdit} hitSlop={8} style={styles.actionBtn}>
                  <Ionicons name="create-outline" size={18} color={colors.muted} />
                </Pressable>
              )}
              {onDelete && (
                <Pressable onPress={onDelete} hitSlop={8} style={styles.actionBtn}>
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                </Pressable>
              )}
            </View>
            <View style={styles.timeRow}>
              <Text style={styles.eventTime}>{timeStr}</Text>
              {(event.detail || event.subtitle) && (
                <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={colors.muted} />
              )}
            </View>
          </View>
        </View>

        {expanded && (
          <View style={styles.eventDetail}>
            <Text style={styles.eventDetailDate}>{fullDateStr}</Text>
            {event.detail ? <Text style={styles.eventDesc}>{event.detail}</Text> : null}
          </View>
        )}
      </Pressable>
    </View>
  );
}

function DateCard({
  label,
  count,
  expanded,
  onToggle,
  children,
}: {
  label: string;
  count: number;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.dateCard}>
      <Pressable style={styles.dateCardHeader} onPress={onToggle}>
        <Ionicons
          name={expanded ? 'chevron-down' : 'chevron-forward'}
          size={18}
          color={colors.muted}
        />
        <Text style={styles.dateCardLabel}>{label}</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeTxt}>{count}</Text>
        </View>
        <View style={{ flex: 1 }} />
      </Pressable>
      {expanded && <View style={styles.dateCardBody}>{children}</View>}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function TimelineScreen() {
  const { getToken } = useAuth();
  const activeKind = useProfileStore((s) => s.activeKind);
  const getActiveProfile = useProfileStore((s) => s.getActiveProfile);
  const petName = getActiveProfile()?.name ?? 'il tuo animale';

  // Human stores
  const events = useTimelineStore((s) => s.events);
  const removeTimeline = useTimelineStore((s) => s.remove);
  const updateTimeline = useTimelineStore((s) => s.update);
  const logs = useSymptomsStore((s) => s.logs);
  const wellness = useSymptomsStore((s) => s.wellness);
  const getWeekTrend = useSymptomsStore((s) => s.getWeekTrend);
  const reminders = useRemindersStore((s) => s.reminders);

  // Pet stores
  const activityLog = usePetActivityStore((s) => s.activityLog);
  const moodLog = usePetActivityStore((s) => s.moodLog);
  const dailyStatuses = usePetActivityStore((s) => s.dailyStatuses);
  const removeActivity = usePetActivityStore((s) => s.removeActivity);
  const updateActivityNote = usePetActivityStore((s) => s.updateActivityNote);
  const removeMood = usePetActivityStore((s) => s.removeMood);
  const updateMoodNote = usePetActivityStore((s) => s.updateMoodNote);

  const meals = usePetNutritionStore((s) => s.meals);
  const weightLog = usePetNutritionStore((s) => s.weightLog);
  const removeMeal = usePetNutritionStore((s) => s.removeMeal);
  const updateMealNote = usePetNutritionStore((s) => s.updateMealNote);
  const removeWeight = usePetNutritionStore((s) => s.removeWeight);
  const updateWeightNote = usePetNutritionStore((s) => s.updateWeightNote);

  const symptomHistory = useVetStore((s) => s.symptomHistory);
  const insightText = useVetStore((s) => s.insightText);
  const removeSymptomEntry = useVetStore((s) => s.removeSymptomEntry);
  const updateSymptomDescription = useVetStore((s) => s.updateSymptomDescription);

  const vaccines = usePreventionStore((s) => s.vaccines);
  const antiparasitics = usePreventionStore((s) => s.antiparasitics);
  const checks = usePreventionStore((s) => s.checks);
  const removeVaccine = usePreventionStore((s) => s.removeVaccine);
  const removeAntiparasitic = usePreventionStore((s) => s.removeAntiparasitic);
  const removeCheck = usePreventionStore((s) => s.removeCheck);
  const updateVaccineNotes = usePreventionStore((s) => s.updateVaccineNotes);
  const updateAntiparasiticNotes = usePreventionStore((s) => s.updateAntiparasiticNotes);
  const updateCheckNotes = usePreventionStore((s) => s.updateCheckNotes);

  const activePetId = useMembersStore((s) => s.activePetId);
  const activeHumanId = useMembersStore((s) => s.activeHumanId);
  const isDefault = useMembersStore((s) => s.isDefault);

  function belongsTo(
    entryMemberId: string | undefined | null,
    activeId: string | null,
    kind: 'human' | 'pet',
  ) {
    if (!activeId) return true;
    if (entryMemberId && entryMemberId === activeId) return true;
    if (!entryMemberId && isDefault(kind, activeId)) return true;
    return false;
  }

  const [humanFilter, setHumanFilter] = useState<TimelineEventType | null>(null);
  const [petFilter, setPetFilter] = useState<PetCategory | null>(null);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [initializedDatesKey, setInitializedDatesKey] = useState<string | null>(null);

  // Confirmation / edit modals
  const [confirmDel, setConfirmDel] = useState<
    | { kind: 'human'; id: string; name: string }
    | { kind: 'pet'; id: string; name: string; onDelete: () => void }
    | null
  >(null);

  const [editTarget, setEditTarget] = useState<
    | { kind: 'human'; id: string; title: string; description: string }
    | { kind: 'pet'; id: string; note: string; onEdit: (n: string) => void }
    | null
  >(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const now = Date.now();

  const toggleExpand = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    void Haptics.selectionAsync();
    setExpandedId((cur) => (cur === id ? null : id));
  };

  const toggleDateExpand = (label: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    void Haptics.selectionAsync();
    setExpandedDates((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  // ── Human mode data ──
  const humanFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return events.filter((e) => {
      if (humanFilter && e.type !== humanFilter) return false;
      if (!belongsTo(e.memberId, activeHumanId, 'human')) return false;
      if (q && !(e.title.toLowerCase().includes(q) || (e.description ?? '').toLowerCase().includes(q))) return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, humanFilter, search, activeHumanId, isDefault]);

  const humanGrouped = useMemo(() => {
    const map: { label: string; items: TimelineEvent[] }[] = [];
    for (const e of humanFiltered) {
      const key = groupLabel(e.date);
      const last = map[map.length - 1];
      if (last && last.label === key) last.items.push(e);
      else map.push({ label: key, items: [e] });
    }
    return map;
  }, [humanFiltered]);

  const last30 = events.filter(
    (e) =>
      now - new Date(e.date).getTime() <= 30 * DAY &&
      belongsTo(e.memberId, activeHumanId, 'human'),
  );
  const countType = (t: TimelineEventType) => last30.filter((e) => e.type === t).length;
  const symptomCount = countType('symptom');
  const visitCount = countType('visit');
  const examCount = countType('exam');
  const activeTherapies = [
    ...new Set(
      reminders
        .filter(
          (r) =>
            r.enabled &&
            r.category === 'medication' &&
            belongsTo(r.memberId, activeHumanId, 'human'),
        )
        .map((r) => r.title),
    ),
  ].length;

  const report = buildInsightReport(logs, wellness, reminders);
  const statusText =
    report.score >= 75 ? 'stabile' : report.score >= 50 ? 'da monitorare' : 'richiede attenzione';
  const highlight = report.correlations[0] ?? report.memory ?? null;

  const weekTrend = getWeekTrend();
  const trendMax = Math.max(1, ...weekTrend);
  const hasTrendData = weekTrend.some((v) => v > 0);

  // ── Pet mode data ──
  const petEvents = useMemo<PetTimelineEvent[]>(() => {
    const inMember = (memberId?: string) => belongsTo(memberId, activePetId, 'pet');

    const list: PetTimelineEvent[] = [];

    // Activity
    for (const a of activityLog) {
      if (!inMember(a.memberId)) continue;
      const emoji = a.type === 'passeggiata' ? '🚶' : a.type === 'gioco' ? '🎾' : '🏃';
      list.push({
        id: `act-${a.id}`,
        category: 'attivita',
        title: `${a.type} · ${a.durationMin} min`,
        subtitle: a.note,
        emoji,
        date: a.date,
        color: '#10B981',
        detail: a.note,
        onDelete: () => removeActivity(a.id),
        onEdit: (note: string) => updateActivityNote(a.id, note),
      });
    }

    // Mood
    for (const m of moodLog) {
      if (!inMember(m.memberId)) continue;
      list.push({
        id: `mood-${m.id}`,
        category: 'umore',
        title: `Umore ${m.level}`,
        subtitle: m.note,
        emoji: m.emoji,
        date: m.date,
        color: '#EC4899',
        detail: m.note,
        onDelete: () => removeMood(m.id),
        onEdit: (note: string) => updateMoodNote(m.id, note),
      });
    }

    // Meals
    for (const meal of meals) {
      if (!inMember(meal.memberId)) continue;
      list.push({
        id: `meal-${meal.id}`,
        category: 'pasto',
        title: `Pasto · ${meal.food}`,
        subtitle: meal.type,
        emoji: '🍖',
        date: meal.date,
        color: '#F59E0B',
        onDelete: () => removeMeal(meal.id),
        onEdit: (note: string) => updateMealNote(meal.id, note),
      });
    }

    // Weight
    for (const w of weightLog) {
      if (!inMember(w.memberId)) continue;
      list.push({
        id: `weight-${w.id}`,
        category: 'pasto',
        title: `Peso · ${w.kg}kg`,
        emoji: '⚖️',
        date: w.date,
        color: '#F97316',
        onDelete: () => removeWeight(w.id),
        onEdit: (note: string) => updateWeightNote(w.id, note),
      });
    }

    // Symptoms
    for (const s of symptomHistory) {
      if (!inMember((s as { memberId?: string }).memberId)) continue;
      list.push({
        id: `sym-${s.id}`,
        category: 'sintomo',
        title: s.symptoms.join(', '),
        subtitle: s.description,
        emoji: '🤒',
        date: s.createdAt,
        color: '#EF4444',
        detail: s.description,
        onDelete: () => removeSymptomEntry(s.id),
        onEdit: (note: string) => updateSymptomDescription(s.id, note),
      });
    }

    // Vaccines
    for (const v of vaccines) {
      if (!inMember(v.memberId)) continue;
      if (!v.date) continue;
      list.push({
        id: `vac-${v.id}`,
        category: 'prevenzione',
        title: `Vaccino ${v.name}`,
        emoji: '💉',
        date: v.date,
        color: '#5B7CFA',
        detail: v.notes,
        onDelete: () => removeVaccine(v.id),
        onEdit: (note: string) => updateVaccineNotes(v.id, note),
      });
    }

    // Antiparasitics
    for (const a of antiparasitics) {
      if (!inMember(a.memberId)) continue;
      if (!a.dateApplied) continue;
      list.push({
        id: `anti-${a.id}`,
        category: 'prevenzione',
        title: `Antiparassitario ${a.name}`,
        emoji: '🛡️',
        date: a.dateApplied,
        color: '#5B7CFA',
        detail: a.notes,
        onDelete: () => removeAntiparasitic(a.id),
        onEdit: (note: string) => updateAntiparasiticNotes(a.id, note),
      });
    }

    // Checks
    for (const c of checks) {
      if (!inMember(c.memberId)) continue;
      if (!c.date) continue;
      list.push({
        id: `chk-${c.id}`,
        category: 'vet',
        title: `Controllo ${c.name}`,
        emoji: '🩺',
        date: c.date,
        color: '#3B82F6',
        detail: c.notes,
        onDelete: () => removeCheck(c.id),
        onEdit: (note: string) => updateCheckNotes(c.id, note),
      });
    }

    list.sort((a, b) => b.date.localeCompare(a.date));
    return list;
  }, [
    activityLog,
    moodLog,
    meals,
    weightLog,
    symptomHistory,
    vaccines,
    antiparasitics,
    checks,
    activePetId,
    removeActivity,
    updateActivityNote,
    removeMood,
    updateMoodNote,
    removeMeal,
    updateMealNote,
    removeWeight,
    updateWeightNote,
    removeSymptomEntry,
    updateSymptomDescription,
    removeVaccine,
    updateVaccineNotes,
    removeAntiparasitic,
    updateAntiparasiticNotes,
    removeCheck,
    updateCheckNotes,
  ]);

  const petFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return petEvents.filter((e) => {
      if (petFilter && e.category !== petFilter) return false;
      if (q && !(e.title.toLowerCase().includes(q) || (e.subtitle ?? '').toLowerCase().includes(q))) return false;
      return true;
    });
  }, [petEvents, petFilter, search]);

  const petGrouped = useMemo(() => {
    const map: { label: string; items: PetTimelineEvent[] }[] = [];
    for (const e of petFiltered) {
      const key = groupLabel(e.date);
      const last = map[map.length - 1];
      if (last && last.label === key) last.items.push(e);
      else map.push({ label: key, items: [e] });
    }
    return map;
  }, [petFiltered]);

  // Initialize expandedDates with the first group expanded whenever group set changes
  const groupedForMode = activeKind === 'human' ? humanGrouped : petGrouped;
  const datesKey = groupedForMode.map((g) => g.label).join('|');
  if (datesKey !== initializedDatesKey) {
    // Render-phase state init pattern: schedule the update.
    // Using setState directly during render is OK if we guard the condition.
    setTimeout(() => {
      const first = groupedForMode[0]?.label;
      setExpandedDates(first ? new Set([first]) : new Set());
      setInitializedDatesKey(datesKey);
    }, 0);
  }

  // Pet hero stats (last 7 days)
  const last7activ = activityLog.filter((a) => withinDays(a.date, 7) && belongsTo(a.memberId, activePetId, 'pet')).length;
  const last7meals = meals.filter((m) => withinDays(m.date, 7) && belongsTo(m.memberId, activePetId, 'pet')).length;
  const last7vetVisits = (
    symptomHistory.filter((s) => withinDays(s.createdAt, 7) && belongsTo((s as { memberId?: string }).memberId, activePetId, 'pet')).length +
    checks.filter((c) => withinDays(c.date, 7) && belongsTo(c.memberId, activePetId, 'pet')).length
  );

  const latestStatus = [...dailyStatuses]
    .filter((d) => belongsTo(d.memberId, activePetId, 'pet'))
    .sort((a, b) => b.date.localeCompare(a.date))[0];

  const petStatusPill =
    latestStatus?.energia === 'alta'
      ? '🟢 In forma'
      : latestStatus?.energia === 'media'
      ? '🟡 Nella norma'
      : latestStatus?.energia === 'bassa'
      ? '🔴 Energia ridotta'
      : '🐾 Nessun dato';

  const latestAppetitoLabel =
    latestStatus?.appetito === 'ridotto'
      ? 'appetito ridotto'
      : latestStatus?.appetito === 'buono'
      ? 'appetito buono'
      : 'appetito stabile';

  // ── Edit/Delete handlers ──
  function openEditHuman(ev: TimelineEvent) {
    setEditTarget({ kind: 'human', id: ev.id, title: ev.title, description: ev.description ?? '' });
    setEditTitle(ev.title);
    setEditDesc(ev.description ?? '');
  }
  function openEditPet(ev: PetTimelineEvent) {
    if (!ev.onEdit) return;
    const initial = ev.detail ?? ev.subtitle ?? '';
    setEditTarget({ kind: 'pet', id: ev.id, note: initial, onEdit: ev.onEdit });
    setEditTitle('');
    setEditDesc(initial);
  }
  function confirmSaveEdit() {
    if (!editTarget) return;
    void Haptics.selectionAsync();
    if (editTarget.kind === 'human') {
      updateTimeline(editTarget.id, { title: editTitle.trim() || editTarget.title, description: editDesc });
    } else {
      editTarget.onEdit(editDesc);
    }
    setEditTarget(null);
  }

  function openDeleteHuman(ev: TimelineEvent) {
    setConfirmDel({ kind: 'human', id: ev.id, name: ev.title });
  }
  function openDeletePet(ev: PetTimelineEvent) {
    if (!ev.onDelete) return;
    setConfirmDel({ kind: 'pet', id: ev.id, name: ev.title, onDelete: ev.onDelete });
  }
  async function executeDelete() {
    if (!confirmDel) return;
    void Haptics.selectionAsync();
    if (confirmDel.kind === 'human') {
      try {
        await removeTimeline(confirmDel.id, getToken);
      } catch {
        // ignore
      }
    } else {
      confirmDel.onDelete();
    }
    setConfirmDel(null);
  }

  // ── Render human mode ─────────────────────────────────────────────────────

  if (activeKind === 'human') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'bottom']}>
        {/* Header with member switcher */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>📈 Timeline Salute</Text>
            <Text style={styles.headerSub}>Tutta la tua storia sanitaria in ordine cronologico</Text>
          </View>
          <MemberSwitcher kind="human" accent={HUMAN_ACCENT} variant="compact" />
        </View>

        {/* Search */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={colors.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cerca sintomi, referti o terapie…"
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
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {HUMAN_CHIPS.map((c) => {
            const active = humanFilter === c.key;
            return (
              <Pressable
                key={c.key ?? 'all'}
                onPress={() => {
                  void Haptics.selectionAsync();
                  setHumanFilter(c.key);
                }}
                style={[
                  styles.chip,
                  active && { backgroundColor: HUMAN_ACCENT, borderColor: HUMAN_ACCENT },
                ]}
              >
                <Text style={[styles.chipTxt, active && styles.chipTxtActive]}>{c.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
          {/* Hero summary */}
          {!search && !humanFilter && events.length > 0 && (
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
          {!search && !humanFilter && highlight && (
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
          {!search && !humanFilter && hasTrendData && (
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

          {/* Date cards */}
          {humanGrouped.map((group) => {
            const expanded = expandedDates.has(group.label);
            return (
              <DateCard
                key={group.label}
                label={group.label}
                count={group.items.length}
                expanded={expanded}
                onToggle={() => toggleDateExpand(group.label)}
              >
                {group.items.map((e, idx) => (
                  <HumanEventRow
                    key={e.id}
                    event={e}
                    expanded={expandedId === e.id}
                    onToggle={() => toggleExpand(e.id)}
                    onEdit={() => openEditHuman(e)}
                    onDelete={() => openDeleteHuman(e)}
                    isLast={idx === group.items.length - 1}
                  />
                ))}
              </DateCard>
            );
          })}

          {humanFiltered.length === 0 && (
            <View style={styles.emptyBox}>
              <Text style={{ fontSize: 34 }}>{search || humanFilter ? '🔍' : '📅'}</Text>
              <Text style={styles.emptyTitle}>
                {search || humanFilter ? 'Nessun evento trovato' : 'La tua storia inizia qui'}
              </Text>
              <Text style={styles.emptyText}>
                {search || humanFilter
                  ? 'Prova a cambiare filtro o termine di ricerca.'
                  : 'Registra sintomi, terapie, visite e referti e lascia che l\'AI analizzi la tua salute nel tempo.'}
              </Text>
              {!search && !humanFilter && (
                <Pressable
                  style={styles.humanCtaBtn}
                  onPress={() => router.push('/add-event')}
                >
                  <Text style={styles.ctaBtnTxt}>➕ Nuovo aggiornamento</Text>
                </Pressable>
              )}
            </View>
          )}
        </ScrollView>

        {renderConfirmDelete()}
        {renderEditModal()}
      </SafeAreaView>
    );
  }

  // ── Render pet mode ───────────────────────────────────────────────────────

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFF9F5' }} edges={['top', 'bottom']}>
      {/* Header with member switcher */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>🐾 Diario Benessere</Text>
          <Text style={styles.headerSub}>Attività, pasti, sintomi e visite in ordine cronologico</Text>
        </View>
        <MemberSwitcher kind="pet" accent={PET_ACCENT} variant="compact" />
      </View>

      {/* Search */}
      <View style={[styles.searchBar, { borderColor: '#D1FAE5' }]}>
        <Ionicons name="search-outline" size={18} color={colors.muted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Cerca attività, pasti o sintomi…"
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

      {/* Pet filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {PET_CHIPS.map((c) => {
          const active = petFilter === c.key;
          return (
            <Pressable
              key={c.key ?? 'all'}
              onPress={() => {
                void Haptics.selectionAsync();
                setPetFilter(c.key);
              }}
              style={[
                styles.chip,
                active && { backgroundColor: PET_ACCENT, borderColor: PET_ACCENT },
              ]}
            >
              <Text style={[styles.chipTxt, active && styles.chipTxtActive]}>{c.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
        {/* Pet hero summary */}
        {!search && !petFilter && petEvents.length > 0 && (
          <LinearGradient colors={['#10B981', '#F59E0B']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            <Text style={styles.heroLabel}>🐾 Ultimi 7 giorni</Text>
            <View style={styles.heroStatsRow}>
              <HeroStat n={last7activ} label={last7activ === 1 ? 'attività' : 'attività'} />
              <HeroStat n={last7meals} label={last7meals === 1 ? 'pasto' : 'pasti'} />
              <HeroStat n={last7vetVisits} label={last7vetVisits === 1 ? 'visita' : 'visite'} />
              <HeroStat n={0} label={latestAppetitoLabel} />
            </View>
            <View style={styles.heroStatusPill}>
              <Text style={styles.heroStatusTxt}>{petStatusPill}</Text>
            </View>
          </LinearGradient>
        )}

        {/* Pet AI insight */}
        {!search && !petFilter && insightText ? (
          <View style={styles.petAiCard}>
            <View style={styles.aiHeaderRow}>
              <Text style={{ fontSize: 16 }}>🧠</Text>
              <Text style={[styles.aiHeaderTxt, { color: '#059669' }]}>Insight Vet</Text>
            </View>
            <Text style={styles.aiBody}>{insightText}</Text>
          </View>
        ) : null}

        {/* Pet date cards */}
        {petGrouped.map((group) => {
          const expanded = expandedDates.has(group.label);
          return (
            <DateCard
              key={group.label}
              label={group.label}
              count={group.items.length}
              expanded={expanded}
              onToggle={() => toggleDateExpand(group.label)}
            >
              {group.items.map((e, idx) => (
                <PetEventRow
                  key={e.id}
                  event={e}
                  expanded={expandedId === e.id}
                  onToggle={() => toggleExpand(e.id)}
                  onEdit={e.onEdit ? () => openEditPet(e) : undefined}
                  onDelete={e.onDelete ? () => openDeletePet(e) : undefined}
                  isLast={idx === group.items.length - 1}
                />
              ))}
            </DateCard>
          );
        })}

        {petFiltered.length === 0 && (
          <View style={styles.emptyBox}>
            <Text style={{ fontSize: 34 }}>{search || petFilter ? '🔍' : '🐾'}</Text>
            <Text style={styles.emptyTitle}>
              {search || petFilter ? 'Nessun evento trovato' : `Inizia il diario di ${petName}`}
            </Text>
            <Text style={styles.emptyText}>
              {search || petFilter
                ? 'Prova a cambiare filtro o termine di ricerca.'
                : 'Registra attività, pasti, sintomi e visite e lascia che l\'AI impari le sue abitudini.'}
            </Text>
            {!search && !petFilter && (
              <Pressable
                style={styles.petCtaBtn}
                onPress={() => router.push('/add-event')}
              >
                <Text style={styles.ctaBtnTxt}>➕ Nuovo aggiornamento</Text>
              </Pressable>
            )}
          </View>
        )}
      </ScrollView>

      {renderConfirmDelete()}
      {renderEditModal()}
    </SafeAreaView>
  );

  // ── Modal renderers ─────────────────────────────────────────────────────
  function renderConfirmDelete() {
    const accent = activeKind === 'human' ? HUMAN_ACCENT : PET_ACCENT;
    return (
      <Modal visible={confirmDel !== null} transparent animationType="slide" onRequestClose={() => setConfirmDel(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setConfirmDel(null)} />
        <View style={styles.modalSheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.modalTitle}>Conferma eliminazione</Text>
          <Text style={styles.modalSub}>
            Rimuovere <Text style={{ fontWeight: '700', color: colors.ink }}>{confirmDel?.name}</Text>?{'\n'}
            Questa operazione non può essere annullata.
          </Text>
          <View style={{ height: 16 }} />
          <Pressable style={[styles.saveBtn, { backgroundColor: '#EF4444' }]} onPress={executeDelete}>
            <Text style={styles.saveBtnTxt}>Elimina</Text>
          </Pressable>
          <Pressable style={styles.cancelBtn} onPress={() => setConfirmDel(null)}>
            <Text style={[styles.cancelBtnTxt, { color: accent }]}>Annulla</Text>
          </Pressable>
        </View>
      </Modal>
    );
  }

  function renderEditModal() {
    const accent = activeKind === 'human' ? HUMAN_ACCENT : PET_ACCENT;
    const isHuman = editTarget?.kind === 'human';
    return (
      <Modal visible={editTarget !== null} transparent animationType="slide" onRequestClose={() => setEditTarget(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setEditTarget(null)} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalSheet}
        >
          <View style={styles.sheetHandle} />
          <Text style={styles.modalTitle}>Modifica evento</Text>
          {isHuman && (
            <>
              <Text style={styles.fieldLabel}>Titolo</Text>
              <TextInput
                style={styles.fieldInput}
                value={editTitle}
                onChangeText={setEditTitle}
                placeholder="Titolo evento"
                placeholderTextColor={colors.muted}
              />
            </>
          )}
          <Text style={styles.fieldLabel}>{isHuman ? 'Descrizione' : 'Nota'}</Text>
          <TextInput
            style={[styles.fieldInput, { minHeight: 80, textAlignVertical: 'top' }]}
            value={editDesc}
            onChangeText={setEditDesc}
            placeholder={isHuman ? 'Descrizione' : 'Aggiungi una nota'}
            placeholderTextColor={colors.muted}
            multiline
            numberOfLines={3}
          />
          <View style={{ height: 12 }} />
          <Pressable style={[styles.saveBtn, { backgroundColor: accent }]} onPress={confirmSaveEdit}>
            <Text style={styles.saveBtnTxt}>Salva</Text>
          </Pressable>
          <Pressable style={styles.cancelBtn} onPress={() => setEditTarget(null)}>
            <Text style={[styles.cancelBtnTxt, { color: accent }]}>Annulla</Text>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    );
  }
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 8,
    gap: 12,
  },
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
    gap: 6,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    height: 36,
  },
  chipTxt: { fontSize: 13, fontWeight: '600', color: colors.ink },
  chipTxtActive: { color: '#fff', fontWeight: '700' },
  chipEmoji: { fontSize: 13 },

  hero: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.12,
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
    borderRadius: 999,
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
  petAiCard: {
    backgroundColor: '#fff',
    borderRadius: radii.md,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#DCFCE7',
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
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

  // Date card (expandable group)
  dateCard: {
    backgroundColor: '#fff',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
    overflow: 'hidden',
  },
  dateCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 10,
  },
  dateCardLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
    textTransform: 'capitalize',
  },
  countBadge: {
    backgroundColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  countBadgeTxt: { fontSize: 11, fontWeight: '700', color: colors.muted },
  dateCardBody: {
    paddingHorizontal: 10,
    paddingBottom: 10,
  },

  // Inner event row (inside date card)
  innerEventRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingVertical: 10,
  },
  innerEventRowSep: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  leftBar: {
    width: 4,
    borderRadius: 2,
    marginRight: 10,
  },
  innerEventInner: {
    flex: 1,
  },

  eventRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  eventIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  petEventIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  eventTitle: { fontSize: 14, fontWeight: '700', color: colors.ink },
  eventType: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  eventTime: { color: colors.muted, fontSize: 12, fontWeight: '600' },

  actionsCol: { alignItems: 'flex-end', gap: 4 },
  actionsRow: { flexDirection: 'row', gap: 8 },
  actionBtn: { padding: 2 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },

  eventDetail: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
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

  humanCtaBtn: {
    backgroundColor: '#0DB09E',
    borderRadius: 14,
    padding: 14,
    width: '100%',
    alignItems: 'center',
    marginTop: 16,
  },
  petCtaBtn: {
    backgroundColor: '#10B981',
    borderRadius: 14,
    padding: 14,
    width: '100%',
    alignItems: 'center',
    marginTop: 16,
  },
  ctaBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // Modals (bottom-sheet)
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 32,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: 12,
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: colors.ink, marginBottom: 6 },
  modalSub: { fontSize: 13, color: colors.muted, lineHeight: 19 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: colors.muted, marginTop: 12, marginBottom: 6 },
  fieldInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.ink,
    backgroundColor: '#fff',
  },
  saveBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  saveBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
  cancelBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  cancelBtnTxt: { fontWeight: '700', fontSize: 14 },
});
