import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTimelineStore } from '../../src/store/timeline';
import { colors, radii } from '../../src/theme';
import {
  eventTypeEmoji,
  eventTypeLabels,
  type TimelineEvent,
  type TimelineEventType,
} from '../../src/types';

export default function TimelineScreen() {
  const events = useTimelineStore((s) => s.events);
  const [filter, setFilter] = useState<TimelineEventType | null>(null);

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

  const types: (TimelineEventType | null)[] = [
    null,
    'symptom',
    'visit',
    'medication',
    'exam',
    'vaccine',
    'note',
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.header}>
        <Text style={{ fontSize: 18, fontWeight: '700' }}>Timeline</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8 }}
      >
        {types.map((t) => {
          const active = filter === t;
          return (
            <Pressable
              key={t ?? 'all'}
              onPress={() => setFilter(t)}
              style={[
                styles.chip,
                active && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
            >
              <Text
                style={{
                  color: active ? '#fff' : colors.ink,
                  fontWeight: '500',
                }}
              >
                {t ? eventTypeLabels[t] : 'Tutti'}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

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
      <Text style={{ fontSize: 22, marginRight: 12 }}>
        {eventTypeEmoji[event.type]}
      </Text>
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: '600' }}>{event.title}</Text>
        {event.description && (
          <Text style={{ color: colors.muted, fontSize: 12 }}>
            {event.description}
          </Text>
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
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: 4,
  },
  groupTitle: {
    color: colors.muted,
    fontWeight: '600',
    marginBottom: 8,
  },
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
});
