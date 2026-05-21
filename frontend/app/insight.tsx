import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  buildInsightReport,
  type InsightCard as InsightCardData,
  type InsightStatus,
  type TrendItem,
} from '../src/services/insightEngine';
import { useRemindersStore } from '../src/store/reminders';
import { useSymptomsStore, type SymptomLog } from '../src/store/symptoms';
import { colors, radii } from '../src/theme';

const STATUS_GRADIENT: Record<InsightStatus, [string, string]> = {
  stable: ['#0DB09E', '#22C55E'],
  warning: ['#F59E0B', '#F97316'],
  critical: ['#EF4444', '#DC2626'],
};

export default function InsightScreen() {
  const logs = useSymptomsStore((s) => s.logs);
  const wellness = useSymptomsStore((s) => s.wellness);
  const reminders = useRemindersStore((s) => s.reminders);

  const report = buildInsightReport(logs, wellness, reminders);

  // Animazione "respirazione" leggera per il badge AI dell'hero
  const breath = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(breath, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [breath]);

  const glowScale = breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] });
  const glowOpacity = breath.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.7] });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F4F8FB' }}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.ink} />
        </Pressable>
        <View>
          <Text style={styles.headerTitle}>Insight Salute</Text>
          <Text style={styles.headerSub}>Analisi intelligente del tuo benessere</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* 1. HERO AI CARD */}
        <LinearGradient
          colors={STATUS_GRADIENT[report.status]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroTopRow}>
            <View style={styles.heroBadge}>
              <Animated.View
                style={[styles.heroGlow, { transform: [{ scale: glowScale }], opacity: glowOpacity }]}
              />
              <Text style={{ fontSize: 18 }}>🧠</Text>
            </View>
            <Text style={styles.heroBadgeLabel}>Analisi AI</Text>
            <View style={styles.heroScorePill}>
              <Text style={styles.heroScoreText}>{report.score}/100</Text>
            </View>
          </View>

          <Text style={styles.heroTitle}>{report.statusTitle}</Text>
          <Text style={styles.heroPeriod}>Ultimi 7 giorni</Text>
          <View style={{ marginTop: 8, gap: 4 }}>
            {report.statusBullets.map((b, i) => (
              <View key={i} style={styles.heroBulletRow}>
                <View style={styles.heroBulletDot} />
                <Text style={styles.heroBulletText}>{b}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* Empty state */}
        {!report.hasData && (
          <View style={styles.emptyBox}>
            <Text style={{ fontSize: 30 }}>📊</Text>
            <Text style={styles.emptyTitle}>Nessun dato ancora</Text>
            <Text style={styles.emptyText}>
              Registra sintomi e benessere: più dati raccogli, più l'AI riesce a capire il tuo stato nel tempo.
            </Text>
          </View>
        )}

        {/* 2. CORRELAZIONI AI */}
        {report.correlations.length > 0 && (
          <Section title="Correlazioni AI">
            {report.correlations.map((c, i) => (
              <InsightCardView key={c.id} card={c} index={i} accent="#06B6D4" />
            ))}
          </Section>
        )}

        {/* 3. MEMORIA SANITARIA */}
        {report.memory && (
          <Section title="Memoria sanitaria">
            <InsightCardView card={report.memory} index={0} accent="#8B5CF6" />
          </Section>
        )}

        {/* 4. RISCHI DA MONITORARE */}
        <Section title="Da monitorare">
          <View style={styles.riskCard}>
            <View style={styles.riskHeader}>
              <Text style={{ fontSize: 15 }}>⚠️</Text>
              <Text style={styles.riskHeaderText}>
                {report.risks.length === 0 ? 'Nessun segnale rilevato' : 'Aspetti da tenere d\'occhio'}
              </Text>
            </View>
            {report.risks.length === 0 ? (
              <View style={styles.riskOkRow}>
                <Ionicons name="checkmark-circle-outline" size={16} color="#16A34A" />
                <Text style={styles.riskOkText}>Tutto nella norma</Text>
              </View>
            ) : (
              report.risks.map((r, i) => (
                <View key={i} style={[styles.riskRow, i > 0 && styles.riskRowBorder]}>
                  <View style={styles.riskDot} />
                  <Text style={styles.riskText}>{r}</Text>
                </View>
              ))
            )}
          </View>
        </Section>

        {/* 5. TREND BENESSERE */}
        <Section title="Trend benessere">
          {report.trends.length > 0 && (
            <View style={styles.trendGrid}>
              {report.trends.map((t) => (
                <TrendGauge key={t.label} item={t} />
              ))}
            </View>
          )}
          <SymptomCalendar logs={logs} />
        </Section>

        {/* 6. SUGGERIMENTI AI */}
        <Section title="Suggerimenti">
          <View style={styles.suggestBox}>
            {report.suggestions.map((s, i) => (
              <View key={i} style={[styles.suggestRow, i > 0 && styles.suggestRowBorder]}>
                <Text style={{ fontSize: 16 }}>✨</Text>
                <Text style={styles.suggestText}>{s}</Text>
              </View>
            ))}
          </View>
        </Section>

        {/* 7. QUICK ACTIONS */}
        <Section title="Azioni rapide">
          <View style={styles.actionsGrid}>
            <QuickAction icon="add-circle-outline" label="Registra sintomo" color="#0DB09E" onPress={() => router.push('/sintomi')} />
            <QuickAction icon="camera-outline" label="Analizza immagine" color="#5B7CFA" onPress={() => router.push('/image-analysis')} />
            <QuickAction icon="document-text-outline" label="Analizza referto" color="#22C55E" onPress={() => router.push('/reports')} />
            <QuickAction icon="chatbubble-ellipses-outline" label="Chiedi all'AI" color="#06B6D4" onPress={() => router.push('/(tabs)/chat')} />
          </View>
        </Section>

        <Text style={styles.disclaimer}>
          Insight informativi generati dai tuoi dati. Non sostituiscono il parere di un medico.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: 22 }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={{ height: 10 }} />
      {children}
    </View>
  );
}

function InsightCardView({ card, index, accent }: { card: InsightCardData; index: number; accent: string }) {
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: 400,
      delay: index * 90,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [fade, index]);

  const translateY = fade.interpolate({ inputRange: [0, 1], outputRange: [12, 0] });

  return (
    <Animated.View style={[styles.insightCard, { borderLeftColor: accent, opacity: fade, transform: [{ translateY }] }]}>
      <View style={styles.insightHeaderRow}>
        <Text style={{ fontSize: 16 }}>{card.emoji}</Text>
        <Text style={[styles.insightTitle, { color: accent }]}>{card.title}</Text>
      </View>
      <Text style={styles.insightBody}>{card.body}</Text>
    </Animated.View>
  );
}

// Gauge a barra Apple Health style per le metriche di benessere (valore 0-100)
function TrendGauge({ item }: { item: TrendItem }) {
  const arrow = item.direction === 'up' ? 'arrow-up' : item.direction === 'down' ? 'arrow-down' : 'remove';
  const fillColor = item.good ? '#16A34A' : '#F59E0B';
  const arrowColor = item.good ? '#16A34A' : '#DC2626';

  const fill = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fill, {
      toValue: Math.max(0, Math.min(100, item.value)),
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [fill, item.value]);

  const width = fill.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });

  return (
    <View style={styles.gaugeCard}>
      <View style={styles.gaugeTop}>
        <Text style={{ fontSize: 16 }}>{item.emoji}</Text>
        <Text style={styles.gaugeLabel}>{item.label}</Text>
        <Ionicons name={arrow} size={14} color={arrowColor} />
      </View>
      <Text style={styles.gaugeValue}>{Math.round(item.value)}</Text>
      <View style={styles.gaugeTrack}>
        <Animated.View style={[styles.gaugeFill, { width, backgroundColor: fillColor }]} />
      </View>
    </View>
  );
}

function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const DAY_LABELS = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];
const DUR_LABEL: Record<SymptomLog['duration'], string> = {
  today: 'oggi',
  '3days': 'qualche giorno',
  week: 'circa una settimana',
  longer: 'più di una settimana',
};

// Calendario sintomi navigabile per settimana, con istogramma e popup giornaliero
function SymptomCalendar({ logs }: { logs: SymptomLog[] }) {
  const [weekOffset, setWeekOffset] = useState(0); // 0 = settimana corrente
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const now = new Date();
  const todayKey = localDateKey(now);
  const todayMonBased = (now.getDay() + 6) % 7; // Lun=0 .. Dom=6

  // Lunedì della settimana visualizzata
  const monday = new Date(now);
  monday.setDate(now.getDate() - todayMonBased + weekOffset * 7);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const key = localDateKey(d);
    const dayLogs = logs.filter((l) => l.date.startsWith(key));
    const avg = dayLogs.length ? dayLogs.reduce((a, l) => a + l.intensity, 0) / dayLogs.length : 0;
    return { date: d, key, dayLogs, value: Math.round(avg * 10) };
  });

  const sunday = days[6].date;
  const max = Math.max(100, ...days.map((d) => d.value));

  // Etichetta periodo (mese/i della settimana)
  const monthFmt = (d: Date) => d.toLocaleDateString('it-IT', { month: 'long' });
  const rangeLabel =
    monday.getMonth() === sunday.getMonth()
      ? `${monthFmt(monday)} ${monday.getFullYear()}`
      : `${monthFmt(monday)} – ${monthFmt(sunday)}`;

  const selected = days.find((d) => d.key === selectedKey) ?? null;
  const dateFmt = (d: Date) => d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <View style={styles.barsCard}>
      {/* Navigazione settimana */}
      <View style={styles.calNav}>
        <Pressable onPress={() => setWeekOffset((w) => w - 1)} style={styles.calNavBtn} hitSlop={8}>
          <Ionicons name="chevron-back" size={18} color={colors.ink} />
        </Pressable>
        <View style={{ alignItems: 'center', flex: 1 }}>
          <Text style={styles.calTitle}>{rangeLabel}</Text>
          {weekOffset !== 0 && (
            <Pressable onPress={() => setWeekOffset(0)} hitSlop={6}>
              <Text style={styles.calToday}>Torna a oggi</Text>
            </Pressable>
          )}
        </View>
        <Pressable
          onPress={() => setWeekOffset((w) => Math.min(0, w + 1))}
          style={[styles.calNavBtn, weekOffset >= 0 && styles.calNavBtnDisabled]}
          hitSlop={8}
          disabled={weekOffset >= 0}
        >
          <Ionicons name="chevron-forward" size={18} color={weekOffset >= 0 ? '#D1D5DB' : colors.ink} />
        </Pressable>
      </View>

      {/* Istogramma settimanale */}
      <View style={styles.barsRow}>
        {days.map((d, i) => {
          const h = Math.max(4, (d.value / max) * 56);
          const isToday = d.key === todayKey;
          const empty = d.value === 0;
          return (
            <Pressable key={d.key} style={styles.barCol} onPress={() => setSelectedKey(d.key)} hitSlop={4}>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    { height: h, backgroundColor: empty ? '#E5E7EB' : isToday ? '#0DB09E' : '#9FE0D6' },
                  ]}
                />
              </View>
              <Text style={[styles.barLabel, isToday && styles.barLabelToday]}>{DAY_LABELS[i]}</Text>
              <Text style={styles.barDayNum}>{d.date.getDate()}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Popup dettaglio giorno */}
      <Modal visible={selected !== null} transparent animationType="fade" onRequestClose={() => setSelectedKey(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setSelectedKey(null)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            {selected && (
              <>
                <Text style={styles.modalTitle}>{dateFmt(selected.date)}</Text>
                {selected.dayLogs.length === 0 ? (
                  <View style={styles.modalEmpty}>
                    <Text style={{ fontSize: 26 }}>🌿</Text>
                    <Text style={styles.modalEmptyText}>Nessun sintomo registrato</Text>
                  </View>
                ) : (
                  selected.dayLogs.map((l) => (
                    <View key={l.id} style={styles.modalRow}>
                      <Text style={{ fontSize: 20 }}>{l.emoji}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.modalRowName}>{l.name}</Text>
                        <Text style={styles.modalRowMeta}>
                          Intensità {l.intensity}/10 · {DUR_LABEL[l.duration]}
                        </Text>
                        {l.notes ? <Text style={styles.modalRowNotes}>{l.notes}</Text> : null}
                      </View>
                    </View>
                  ))
                )}
                <Pressable style={styles.modalClose} onPress={() => setSelectedKey(null)}>
                  <Text style={styles.modalCloseText}>Chiudi</Text>
                </Pressable>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function QuickAction({
  icon,
  label,
  color,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.actionCard, pressed && { opacity: 0.7 }]}>
      <View style={[styles.actionIcon, { backgroundColor: color + '1A' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.ink },
  headerSub: { fontSize: 12, color: colors.muted, marginTop: 1 },

  hero: {
    borderRadius: 22,
    padding: 20,
    shadowColor: '#0DB09E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 6,
  },
  heroTopRow: { flexDirection: 'row', alignItems: 'center' },
  heroBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroGlow: {
    position: 'absolute',
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  heroBadgeLabel: { color: '#fff', fontWeight: '700', fontSize: 14, marginLeft: 10, flex: 1 },
  heroScorePill: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  heroScoreText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  heroTitle: { color: '#fff', fontSize: 24, fontWeight: '800', marginTop: 16 },
  heroPeriod: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },
  heroBulletRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroBulletDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.85)' },
  heroBulletText: { color: 'rgba(255,255,255,0.92)', fontSize: 13 },

  emptyBox: {
    marginTop: 18,
    backgroundColor: '#fff',
    borderRadius: radii.lg,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.ink, marginTop: 10 },
  emptyText: { fontSize: 13, color: colors.muted, textAlign: 'center', marginTop: 6, lineHeight: 19 },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.ink },

  insightCard: {
    backgroundColor: '#fff',
    borderRadius: radii.md,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  insightHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  insightTitle: { fontSize: 13, fontWeight: '700' },
  insightBody: { fontSize: 14, color: colors.ink, marginTop: 6, lineHeight: 20 },

  riskCard: {
    backgroundColor: '#fff',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  riskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  riskHeaderText: { fontSize: 13, fontWeight: '700', color: colors.ink },
  riskOkRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 14 },
  riskOkText: { fontSize: 14, color: '#16A34A', fontWeight: '600' },
  riskRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 13 },
  riskRowBorder: { borderTopWidth: 1, borderTopColor: '#F9FAFB' },
  riskDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#D1D5DB' },
  riskText: { fontSize: 14, color: colors.ink, textTransform: 'capitalize', flex: 1 },

  trendGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  gaugeCard: {
    width: '48.5%',
    backgroundColor: '#fff',
    borderRadius: radii.md,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  gaugeTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  gaugeLabel: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.ink },
  gaugeValue: { fontSize: 22, fontWeight: '800', color: colors.ink, marginTop: 8 },
  gaugeTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F3F4F6',
    marginTop: 8,
    overflow: 'hidden',
  },
  gaugeFill: { height: 6, borderRadius: 3 },

  barsCard: {
    marginTop: 8,
    backgroundColor: '#fff',
    borderRadius: radii.md,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  calNav: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  calNavBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calNavBtnDisabled: { backgroundColor: '#F9FAFB' },
  calTitle: { fontSize: 14, fontWeight: '700', color: colors.ink, textTransform: 'capitalize' },
  calToday: { fontSize: 11, color: '#0DB09E', fontWeight: '700', marginTop: 2 },
  barsRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  barCol: { flex: 1, alignItems: 'center', gap: 5 },
  barTrack: { height: 56, justifyContent: 'flex-end' },
  barFill: { width: 18, borderRadius: 5 },
  barLabel: { fontSize: 11, color: colors.muted, fontWeight: '600' },
  barLabelToday: { color: '#0DB09E', fontWeight: '800' },
  barDayNum: { fontSize: 10, color: '#B0B7C3' },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 28,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: radii.lg,
    padding: 20,
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: colors.ink, textTransform: 'capitalize', marginBottom: 14 },
  modalEmpty: { alignItems: 'center', paddingVertical: 16, gap: 8 },
  modalEmptyText: { fontSize: 14, color: colors.muted },
  modalRow: { flexDirection: 'row', gap: 12, paddingVertical: 10, alignItems: 'flex-start' },
  modalRowName: { fontSize: 15, fontWeight: '700', color: colors.ink },
  modalRowMeta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  modalRowNotes: { fontSize: 13, color: colors.ink, marginTop: 4, fontStyle: 'italic' },
  modalClose: {
    marginTop: 16,
    backgroundColor: '#0DB09E',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCloseText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  suggestBox: {
    backgroundColor: '#fff',
    borderRadius: radii.md,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  suggestRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14 },
  suggestRowBorder: { borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  suggestText: { flex: 1, fontSize: 14, color: colors.ink, lineHeight: 19 },

  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionCard: {
    width: '48.5%',
    backgroundColor: '#fff',
    borderRadius: radii.md,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: { fontSize: 13, fontWeight: '600', color: colors.ink },

  disclaimer: {
    marginTop: 24,
    fontSize: 11,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 16,
  },
});
