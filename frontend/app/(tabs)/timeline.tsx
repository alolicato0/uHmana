import { Ionicons } from '@expo/vector-icons';
import { useMemo, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTimelineStore } from '../../src/store/timeline';
import { colors, radii } from '../../src/theme';
import {
  eventTypeEmoji,
  eventTypeLabels,
  type TimelineEvent,
  type TimelineEventType,
} from '../../src/types';

const FILTER_TYPES: (TimelineEventType | null)[] = [
  null, 'symptom', 'visit', 'medication', 'exam', 'vaccine', 'note',
];

export default function TimelineScreen() {
  const events = useTimelineStore((s) => s.events);
  const [filter, setFilter] = useState<TimelineEventType | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const slideAnim = useRef(new Animated.Value(-280)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const openSidebar = () => {
    setSidebarOpen(true);
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, bounciness: 0 }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
  };

  const closeSidebar = () => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: -280, duration: 200, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => setSidebarOpen(false));
  };

  const selectFilter = (t: TimelineEventType | null) => {
    setFilter(t);
    closeSidebar();
  };

  const filtered = useMemo(
    () => (filter ? events.filter((e) => e.type === filter) : events),
    [events, filter],
  );

  const grouped = useMemo(() => {
    const map: Record<string, TimelineEvent[]> = {};
    for (const e of filtered) {
      const key = groupLabel(e.date);
      (map[key] ??= []).push(e);
    }
    return map;
  }, [filtered]);

  const activeLabel = filter ? eventTypeLabels[filter] : 'Tutti';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Timeline</Text>
        <Pressable onPress={openSidebar} style={styles.filterBtn}>
          <Ionicons name="options-outline" size={18} color={colors.ink} />
          <Text style={styles.filterBtnLabel}>{activeLabel}</Text>
          <Ionicons name="chevron-down" size={13} color={colors.muted} />
        </Pressable>
      </View>

      {/* Events list */}
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {Object.entries(grouped).map(([label, items]) => (
          <View key={label} style={{ marginBottom: 16 }}>
            <Text style={styles.groupTitle}>{label}</Text>
            {items.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </View>
        ))}
        {filtered.length === 0 && (
          <Text style={{ color: colors.muted, textAlign: 'center', padding: 40 }}>
            Nessun evento
          </Text>
        )}
      </ScrollView>

      {/* Sidebar overlay + drawer */}
      {sidebarOpen && (
        <>
          <TouchableWithoutFeedback onPress={closeSidebar}>
            <Animated.View style={[styles.overlay, { opacity: fadeAnim }]} />
          </TouchableWithoutFeedback>

          <Animated.View style={[styles.sidebar, { transform: [{ translateX: slideAnim }] }]}>
            <View style={styles.sidebarHeader}>
              <Text style={styles.sidebarTitle}>Filtra eventi</Text>
              <Pressable onPress={closeSidebar}>
                <Ionicons name="close" size={22} color={colors.ink} />
              </Pressable>
            </View>

            {FILTER_TYPES.map((t) => {
              const active = filter === t;
              return (
                <Pressable
                  key={t ?? 'all'}
                  onPress={() => selectFilter(t)}
                  style={[styles.sidebarItem, active && styles.sidebarItemActive]}
                >
                  <Text style={styles.sidebarEmoji}>
                    {t ? eventTypeEmoji[t] : '📋'}
                  </Text>
                  <Text style={[styles.sidebarItemText, active && { color: '#fff', fontWeight: '700' }]}>
                    {t ? eventTypeLabels[t] : 'Tutti gli eventi'}
                  </Text>
                  {active && (
                    <Ionicons name="checkmark" size={18} color="#fff" style={{ marginLeft: 'auto' }} />
                  )}
                </Pressable>
              );
            })}
          </Animated.View>
        </>
      )}
    </SafeAreaView>
  );
}

function EventCard({ event }: { event: TimelineEvent }) {
  const time = new Date(event.date).toLocaleTimeString('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return (
    <View style={styles.eventCard}>
      <Text style={{ fontSize: 22, marginRight: 12 }}>{eventTypeEmoji[event.type]}</Text>
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: '600' }}>{event.title}</Text>
        {event.description && (
          <Text style={{ color: colors.muted, fontSize: 12 }}>{event.description}</Text>
        )}
      </View>
      <Text style={{ color: colors.muted, fontSize: 12 }}>{time}</Text>
    </View>
  );
}

function groupLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  const same = (a: Date, b: Date) =>
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear();
  if (same(d, today)) return 'Oggi';
  if (same(d, yest)) return 'Ieri';
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' });
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.ink },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  filterBtnLabel: { fontSize: 13, fontWeight: '600', color: colors.ink },

  groupTitle: { color: colors.muted, fontWeight: '600', marginBottom: 8, fontSize: 13 },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#fff',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 10,
  },
  sidebar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 270,
    backgroundColor: '#fff',
    zIndex: 20,
    paddingTop: 56,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 12,
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 8,
  },
  sidebarTitle: { fontSize: 17, fontWeight: '700', color: colors.ink },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 13,
    marginHorizontal: 10,
    marginBottom: 2,
    borderRadius: radii.md,
  },
  sidebarItemActive: { backgroundColor: colors.primary },
  sidebarEmoji: { fontSize: 18, width: 28 },
  sidebarItemText: { fontSize: 15, fontWeight: '500', color: colors.ink, marginLeft: 10 },
});
