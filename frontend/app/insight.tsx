import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  buildInsightReport,
  type InsightCard as InsightCardData,
  type InsightStatus,
  type TrendItem,
} from '../src/services/insightEngine';
import { useRemindersStore } from '../src/store/reminders';
import { useSymptomsStore } from '../src/store/symptoms';
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
        {report.risks.length > 0 && (
          <Section title="Da monitorare">
            <View style={styles.riskBox}>
              {report.risks.map((r, i) => (
                <View key={i} style={styles.riskRow}>
                  <Ionicons name="ellipse" size={7} color={colors.warning} />
                  <Text style={styles.riskText}>{r}</Text>
                </View>
              ))}
            </View>
          </Section>
        )}

        {/* 5. TREND BENESSERE */}
        {report.trends.length > 0 && (
          <Section title="Trend benessere">
            <View style={styles.trendGrid}>
              {report.trends
                .filter((t) => !t.series)
                .map((t) => (
                  <TrendGauge key={t.label} item={t} />
                ))}
            </View>
            {report.trends
              .filter((t) => t.series)
              .map((t) => (
                <TrendBars key={t.label} item={t} />
              ))}
          </Section>
        )}

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

// Mini istogramma 7 giorni Apple Health style (serie 0-100)
function TrendBars({ item }: { item: TrendItem }) {
  const series = item.series ?? [];
  const max = Math.max(100, ...series);
  const labels = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];
  const arrow = item.direction === 'up' ? 'arrow-up' : item.direction === 'down' ? 'arrow-down' : 'remove';
  const arrowColor = item.good ? '#16A34A' : '#DC2626';

  // L'indice del giorno corrente nella serie (oggi è l'ultimo elemento)
  const todayIdx = series.length - 1;

  return (
    <View style={styles.barsCard}>
      <View style={styles.barsTop}>
        <Text style={{ fontSize: 16 }}>{item.emoji}</Text>
        <Text style={styles.gaugeLabel}>{item.label}</Text>
        <Ionicons name={arrow} size={14} color={arrowColor} />
      </View>
      <View style={styles.barsRow}>
        {series.map((v, i) => {
          const h = Math.max(4, (v / max) * 56);
          const isToday = i === todayIdx;
          const empty = v === 0;
          return (
            <View key={i} style={styles.barCol}>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      height: h,
                      backgroundColor: empty ? '#E5E7EB' : isToday ? '#0DB09E' : '#9FE0D6',
                    },
                  ]}
                />
              </View>
              <Text style={[styles.barLabel, isToday && styles.barLabelToday]}>{labels[i]}</Text>
            </View>
          );
        })}
      </View>
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

  riskBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: radii.md,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 8,
  },
  riskRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  riskText: { fontSize: 14, color: '#92400E', textTransform: 'capitalize' },

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
  barsTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  barsRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 76 },
  barCol: { flex: 1, alignItems: 'center', gap: 6 },
  barTrack: { height: 56, justifyContent: 'flex-end' },
  barFill: { width: 18, borderRadius: 5 },
  barLabel: { fontSize: 11, color: colors.muted, fontWeight: '600' },
  barLabelToday: { color: '#0DB09E', fontWeight: '800' },

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
