import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { SymptomDuration, SymptomLog } from '../src/store/symptoms';
import { useSymptomsStore } from '../src/store/symptoms';
import { colors, radii } from '../src/theme';

// ─── Costanti ────────────────────────────────────────────────────────────────

const PRESET_SYMPTOMS = [
  { name: 'Mal di testa', emoji: '🤕' },
  { name: 'Tosse', emoji: '🤧' },
  { name: 'Febbre', emoji: '🤒' },
  { name: 'Stanchezza', emoji: '😴' },
  { name: 'Nausea', emoji: '🤢' },
  { name: 'Dolori muscolari', emoji: '💪' },
  { name: 'Raffreddore', emoji: '🌬️' },
  { name: 'Mal di stomaco', emoji: '🫃' },
  { name: 'Ansia', emoji: '😰' },
  { name: 'Insonnia', emoji: '🌙' },
  { name: 'Mal di gola', emoji: '🦠' },
  { name: 'Vertigini', emoji: '💫' },
];

const DURATION_LABELS: Record<SymptomDuration, string> = {
  today: 'Oggi',
  '3days': '3 giorni',
  week: '1 settimana',
  longer: 'Più di 1 settimana',
};

const DAYS_SHORT = ['Lu', 'Ma', 'Me', 'Gi', 'Ve', 'Sa', 'Do'];

function getScoreColor(score: number): string {
  if (score >= 75) return '#16A34A';
  if (score >= 50) return '#F59E0B';
  return '#DC2626';
}
function getScoreLabel(score: number): string {
  if (score >= 75) return 'Buono';
  if (score >= 50) return 'Attenzione';
  return 'Critico';
}

// ─── Schermata principale ─────────────────────────────────────────────────────

export default function SintomiScreen() {
  const [modalOpen, setModalOpen] = useState(false);
  const logs = useSymptomsStore((s) => s.logs);
  const wellness = useSymptomsStore((s) => s.wellness);
  const getHealthScore = useSymptomsStore((s) => s.getHealthScore);
  const getWeekTrend = useSymptomsStore((s) => s.getWeekTrend);
  const getRecentLogs = useSymptomsStore((s) => s.getRecentLogs);

  const score = getHealthScore();
  const trend = getWeekTrend();
  const recent = getRecentLogs(5);
  const scoreColor = getScoreColor(score);

  const todayLogs = logs.filter((l) =>
    l.date.startsWith(new Date().toISOString().slice(0, 10)),
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F0F9F8' }}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.ink} />
        </Pressable>
        <View>
          <Text style={styles.headerTitle}>Sintomi & Benessere</Text>
          <Text style={styles.headerSub}>Monitora il tuo stato giorno dopo giorno</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

        {/* 1 — HEALTH SCORE HERO */}
        <HealthScoreCard score={score} scoreColor={scoreColor} wellness={wellness} />

        <View style={{ height: 16 }} />

        {/* 2 — QUICK SYMPTOMS */}
        <SectionTitle title="Sintomi recenti" />
        <View style={{ height: 8 }} />
        <QuickSymptomsGrid todayLogs={todayLogs} />

        <View style={{ height: 16 }} />

        {/* 3 — ADD SYMPTOM */}
        <Pressable onPress={() => setModalOpen(true)} style={styles.addBtn}>
          <Ionicons name="add-circle" size={22} color="#fff" />
          <Text style={styles.addBtnText}>Registra sintomo</Text>
        </Pressable>

        <View style={{ height: 20 }} />

        {/* 4 — TREND 7 GIORNI */}
        <SectionTitle title="Andamento 7 giorni" subtitle="Media intensità sintomi" />
        <View style={{ height: 8 }} />
        <TrendChart data={trend} />

        <View style={{ height: 20 }} />

        {/* 5 — AI INSIGHTS */}
        <SectionTitle title="Insight AI" />
        <View style={{ height: 8 }} />
        <AiInsightsCard logs={recent} wellness={wellness} />

        <View style={{ height: 20 }} />

        {/* 6 — WELLNESS TRACKER */}
        <SectionTitle title="Benessere generale" subtitle="Aggiorna il tuo stato quotidiano" />
        <View style={{ height: 8 }} />
        <WellnessTracker wellness={wellness} />

        <View style={{ height: 20 }} />

        {/* 7 — STORICO RECENTE */}
        {recent.length > 0 && (
          <>
            <SectionTitle title="Storico recente" />
            <View style={{ height: 8 }} />
            {recent.map((l) => (
              <HistoryRow key={l.id} log={l} />
            ))}
          </>
        )}
      </ScrollView>

      {/* FAB — Chiedi all'AI */}
      <Pressable
        onPress={() => router.push('/(tabs)/chat')}
        style={styles.fab}
      >
        <Ionicons name="chatbubble-ellipses" size={20} color="#fff" />
        <Text style={styles.fabText}>Chiedi all'AI</Text>
      </Pressable>

      {/* Modal aggiunta sintomo */}
      <AddSymptomModal visible={modalOpen} onClose={() => setModalOpen(false)} />
    </SafeAreaView>
  );
}

// ─── Health Score ─────────────────────────────────────────────────────────────

function HealthScoreCard({
  score,
  scoreColor,
  wellness,
}: {
  score: number;
  scoreColor: string;
  wellness: ReturnType<typeof useSymptomsStore.getState>['wellness'];
}) {
  const gradient: [string, string] =
    score >= 75 ? ['#0DB09E', '#22C55E'] : score >= 50 ? ['#F59E0B', '#EF4444'] : ['#EF4444', '#DC2626'];

  return (
    <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Ionicons name="heart" size={16} color="#fff" />
        <Text style={styles.heroLabel}>Stato generale</Text>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 12 }}>
        <Text style={styles.heroScore}>{score}</Text>
        <Text style={styles.heroScoreMax}>/100</Text>
        <View style={styles.heroStatusBadge}>
          <Text style={styles.heroStatusText}>{getScoreLabel(score)}</Text>
        </View>
      </View>

      <View style={styles.heroStats}>
        <HeroStat label="Stress" value={wellness ? stressLabel(wellness.stress) : '—'} />
        <HeroStat label="Energia" value={wellness ? levelLabel(wellness.energy) : '—'} />
        <HeroStat label="Sonno" value={wellness ? levelLabel(wellness.sleep) : '—'} />
      </View>

      <Text style={styles.heroUpdate}>
        Ultimo aggiornamento: {new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </LinearGradient>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11 }}>{label}</Text>
      <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600', marginTop: 2 }}>{value}</Text>
    </View>
  );
}

function stressLabel(v: number): string {
  if (v <= 30) return 'Basso';
  if (v <= 60) return 'Medio';
  return 'Alto';
}
function levelLabel(v: number): string {
  if (v >= 70) return 'Alta';
  if (v >= 40) return 'Media';
  return 'Bassa';
}

// ─── Quick Symptoms ──────────────────────────────────────────────────────────

const QUICK_SYMPTOMS = [
  { name: 'Mal di testa', emoji: '🤕' },
  { name: 'Tosse', emoji: '🤧' },
  { name: 'Febbre', emoji: '🤒' },
  { name: 'Stanchezza', emoji: '😴' },
];

function QuickSymptomsGrid({ todayLogs }: { todayLogs: SymptomLog[] }) {
  return (
    <View style={styles.grid2}>
      {QUICK_SYMPTOMS.map((s) => {
        const match = todayLogs.find((l) => l.name === s.name);
        return (
          <View key={s.name} style={styles.quickCard}>
            <Text style={{ fontSize: 24 }}>{s.emoji}</Text>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={{ fontWeight: '600', fontSize: 13 }}>{s.name}</Text>
              <Text style={{ color: match ? getScoreColor(100 - match.intensity * 10) : colors.muted, fontSize: 12, marginTop: 2 }}>
                {match ? intensityLabel(match.intensity) : 'Assente'}
              </Text>
            </View>
            <View
              style={[
                styles.quickDot,
                { backgroundColor: match ? getScoreColor(100 - match.intensity * 10) : '#E5E7EB' },
              ]}
            />
          </View>
        );
      })}
    </View>
  );
}

function intensityLabel(v: number): string {
  if (v <= 3) return 'Lieve';
  if (v <= 6) return 'Moderato';
  return 'Forte';
}

// ─── Trend Chart ─────────────────────────────────────────────────────────────

function TrendChart({ data }: { data: number[] }) {
  const max = Math.max(...data, 1);
  const today = new Date().getDay(); // 0=Dom
  const dayIdx = today === 0 ? 6 : today - 1;

  return (
    <View style={styles.card}>
      <View style={styles.chartBars}>
        {data.map((v, i) => {
          const height = Math.max(4, (v / 10) * 80);
          const isToday = i === 6;
          const barColor = v === 0 ? '#E5E7EB' : v <= 3 ? '#16A34A' : v <= 6 ? '#F59E0B' : '#DC2626';
          return (
            <View key={i} style={styles.chartBarCol}>
              <View style={[styles.chartBarBg]}>
                <View style={[styles.chartBar, { height, backgroundColor: barColor }]} />
              </View>
              <Text style={[styles.chartLabel, isToday && { color: '#0DB09E', fontWeight: '700' }]}>
                {DAYS_SHORT[(new Date().getDay() + i - 6 + 7) % 7]}
              </Text>
            </View>
          );
        })}
      </View>
      <View style={styles.chartLegend}>
        <LegendDot color="#16A34A" label="Lieve" />
        <LegendDot color="#F59E0B" label="Moderato" />
        <LegendDot color="#DC2626" label="Forte" />
      </View>
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
      <Text style={{ fontSize: 11, color: colors.muted }}>{label}</Text>
    </View>
  );
}

// ─── AI Insights ─────────────────────────────────────────────────────────────

function AiInsightsCard({
  logs,
  wellness,
}: {
  logs: SymptomLog[];
  wellness: ReturnType<typeof useSymptomsStore.getState>['wellness'];
}) {
  const insights = buildInsights(logs, wellness);
  return (
    <View style={[styles.card, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
        <Ionicons name="sparkles" size={16} color="#3B82F6" />
        <Text style={{ fontWeight: '700', fontSize: 14, color: '#1D4ED8', marginLeft: 6 }}>Insight AI</Text>
      </View>
      {insights.length === 0 ? (
        <Text style={{ color: colors.muted, fontSize: 13 }}>
          Registra qualche sintomo per ricevere i tuoi insight personalizzati.
        </Text>
      ) : (
        insights.map((ins, i) => (
          <Text key={i} style={styles.insightText}>
            {ins}
          </Text>
        ))
      )}
      <Pressable onPress={() => router.push('/(tabs)/chat')} style={styles.insightBtn}>
        <Text style={{ color: '#3B82F6', fontWeight: '600', fontSize: 13 }}>Approfondisci con l'AI →</Text>
      </Pressable>
    </View>
  );
}

function buildInsights(logs: SymptomLog[], wellness: DailyWellness | null): string[] {
  const out: string[] = [];
  if (logs.length === 0) return out;

  const names = logs.map((l) => l.name);
  const freq: Record<string, number> = {};
  for (const n of names) freq[n] = (freq[n] ?? 0) + 1;
  const top = Object.entries(freq).sort((a, b) => b[1] - a[1])[0];
  if (top && top[1] >= 2) out.push(`"${top[0]}" compare frequentemente nei tuoi log recenti.`);

  const highIntensity = logs.filter((l) => l.intensity >= 7);
  if (highIntensity.length >= 2) out.push('Hai registrato sintomi ad alta intensità di recente. Considera una visita medica.');

  if (wellness && wellness.sleep < 40 && wellness.energy < 40)
    out.push('Sonno insufficiente ed energia bassa: possibile correlazione con i sintomi riportati.');

  if (wellness && wellness.stress > 70)
    out.push('Livello di stress elevato: può amplificare la percezione del dolore e abbassare le difese.');

  const longDuration = logs.filter((l) => l.duration === 'week' || l.duration === 'longer');
  if (longDuration.length > 0)
    out.push(`"${longDuration[0].name}" dura da oltre una settimana: potrebbe essere utile un consulto medico.`);

  return out.slice(0, 3);
}

import type { DailyWellness } from '../src/store/symptoms';

// ─── Wellness Tracker ─────────────────────────────────────────────────────────

const WELLNESS_ITEMS = [
  { key: 'sleep' as const, label: 'Sonno', emoji: '😴', color: '#5B7CFA' },
  { key: 'hydration' as const, label: 'Idratazione', emoji: '💧', color: '#0DB09E' },
  { key: 'energy' as const, label: 'Energia', emoji: '⚡', color: '#F59E0B' },
  { key: 'mood' as const, label: 'Umore', emoji: '😊', color: '#EC4899' },
  { key: 'stress' as const, label: 'Stress', emoji: '🧠', color: '#DC2626', invert: true },
] as const;

function WellnessTracker({ wellness }: { wellness: DailyWellness | null }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    sleep: wellness?.sleep ?? 60,
    hydration: wellness?.hydration ?? 50,
    energy: wellness?.energy ?? 70,
    mood: wellness?.mood ?? 65,
    stress: wellness?.stress ?? 40,
  });
  const setWellness = useSymptomsStore((s) => s.setWellness);

  return (
    <View style={styles.card}>
      {WELLNESS_ITEMS.map((item) => {
        const raw = wellness ? wellness[item.key] : null;
        const val = editing ? draft[item.key] : (raw ?? null);
        return (
          <View key={item.key} style={styles.wellnessRow}>
            <Text style={{ fontSize: 20, width: 28 }}>{item.emoji}</Text>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontWeight: '600', fontSize: 13 }}>{item.label}</Text>
                <Text style={{ fontSize: 12, color: colors.muted }}>{val !== null ? `${val}%` : '—'}</Text>
              </View>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${val ?? 0}%`,
                      backgroundColor: item.invert && val !== null && val > 60 ? '#DC2626' : item.color,
                    },
                  ]}
                />
              </View>
            </View>
          </View>
        );
      })}

      {editing ? (
        <View style={{ marginTop: 12, gap: 8 }}>
          {WELLNESS_ITEMS.map((item) => (
            <View key={item.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ width: 80, fontSize: 12, color: colors.muted }}>{item.label}</Text>
              <View style={{ flex: 1, flexDirection: 'row', gap: 4, flexWrap: 'wrap' }}>
                {[20, 40, 60, 80, 100].map((v) => (
                  <Pressable
                    key={v}
                    onPress={() => setDraft((d) => ({ ...d, [item.key]: v }))}
                    style={[
                      styles.wellnessChip,
                      draft[item.key] === v && { backgroundColor: item.color },
                    ]}
                  >
                    <Text style={{ fontSize: 11, color: draft[item.key] === v ? '#fff' : colors.muted }}>
                      {v}%
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ))}
          <Pressable
            onPress={() => { setWellness(draft); setEditing(false); }}
            style={styles.saveBtnSmall}
          >
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>Salva</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable onPress={() => setEditing(true)} style={styles.editWellnessBtn}>
          <Ionicons name="create-outline" size={14} color="#0DB09E" />
          <Text style={{ color: '#0DB09E', fontSize: 13, fontWeight: '600', marginLeft: 4 }}>
            Aggiorna benessere
          </Text>
        </Pressable>
      )}
    </View>
  );
}

// ─── History Row ──────────────────────────────────────────────────────────────

function HistoryRow({ log }: { log: SymptomLog }) {
  const d = new Date(log.date);
  const dateStr = d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
  const timeStr = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  return (
    <View style={styles.historyRow}>
      <Text style={{ fontSize: 22, marginRight: 10 }}>{log.emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: '600', fontSize: 13 }}>{log.name}</Text>
        <Text style={{ color: colors.muted, fontSize: 12 }}>
          {intensityLabel(log.intensity)} · {DURATION_LABELS[log.duration]}
        </Text>
      </View>
      <Text style={{ color: colors.muted, fontSize: 11 }}>
        {dateStr} {timeStr}
      </Text>
    </View>
  );
}

// ─── Helpers UI ───────────────────────────────────────────────────────────────

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle && <Text style={styles.sectionSub}>{subtitle}</Text>}
    </View>
  );
}

// ─── Add Symptom Modal ───────────────────────────────────────────────────────

function AddSymptomModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const addLog = useSymptomsStore((s) => s.addLog);
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<{ name: string; emoji: string } | null>(null);
  const [intensity, setIntensity] = useState(5);
  const [duration, setDuration] = useState<SymptomDuration>('today');
  const [notes, setNotes] = useState('');
  const [search, setSearch] = useState('');

  const filtered = PRESET_SYMPTOMS.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()),
  );

  const reset = () => {
    setStep(0); setSelected(null); setIntensity(5);
    setDuration('today'); setNotes(''); setSearch('');
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSave = () => {
    if (!selected) return;
    addLog({ name: selected.name, emoji: selected.emoji, intensity, duration, notes });
    handleClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.modalOverlay} />
      </TouchableWithoutFeedback>

      <View style={styles.bottomSheet}>
        {/* Handle */}
        <View style={styles.sheetHandle} />

        {step === 0 && (
          <>
            <Text style={styles.sheetTitle}>Quale sintomo?</Text>
            <TextInput
              placeholder="Cerca sintomo..."
              placeholderTextColor={colors.muted}
              value={search}
              onChangeText={setSearch}
              style={styles.searchInput}
            />
            <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={false}>
              {filtered.map((s) => (
                <Pressable
                  key={s.name}
                  onPress={() => { setSelected(s); setStep(1); }}
                  style={styles.symptomOption}
                >
                  <Text style={{ fontSize: 22 }}>{s.emoji}</Text>
                  <Text style={{ marginLeft: 12, fontSize: 15, fontWeight: '500' }}>{s.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </>
        )}

        {step === 1 && selected && (
          <>
            <Text style={styles.sheetTitle}>
              {selected.emoji} {selected.name}
            </Text>
            <Text style={styles.sheetLabel}>Intensità: {intensity}/10</Text>
            <IntensitySlider value={intensity} onChange={setIntensity} />

            <Text style={[styles.sheetLabel, { marginTop: 16 }]}>Durata</Text>
            <View style={styles.durationRow}>
              {(['today', '3days', 'week', 'longer'] as SymptomDuration[]).map((d) => (
                <Pressable
                  key={d}
                  onPress={() => setDuration(d)}
                  style={[styles.durationChip, duration === d && styles.durationChipActive]}
                >
                  <Text style={[styles.durationText, duration === d && { color: '#fff' }]}>
                    {DURATION_LABELS[d]}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.sheetLabel, { marginTop: 16 }]}>Note (opzionale)</Text>
            <TextInput
              placeholder="Aggiungi una nota..."
              placeholderTextColor={colors.muted}
              value={notes}
              onChangeText={setNotes}
              multiline
              style={[styles.searchInput, { height: 72, textAlignVertical: 'top' }]}
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <Pressable onPress={() => setStep(0)} style={styles.backBtnSheet}>
                <Text style={{ color: colors.ink, fontWeight: '600' }}>Indietro</Text>
              </Pressable>
              <Pressable onPress={handleSave} style={[styles.saveBtnSheet, { flex: 2 }]}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Salva</Text>
              </Pressable>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

function IntensitySlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <View>
      <View style={styles.intensityRow}>
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <Pressable
            key={n}
            onPress={() => onChange(n)}
            style={[
              styles.intensityDot,
              {
                backgroundColor:
                  n <= value
                    ? n <= 3 ? '#16A34A' : n <= 6 ? '#F59E0B' : '#DC2626'
                    : '#E5E7EB',
                transform: [{ scale: n === value ? 1.3 : 1 }],
              },
            ]}
          />
        ))}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 11, color: colors.muted }}>Lieve</Text>
        <Text style={{ fontSize: 11, color: colors.muted }}>Forte</Text>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.ink },
  headerSub: { fontSize: 12, color: colors.muted, marginTop: 1 },

  heroCard: { borderRadius: 20, padding: 20 },
  heroLabel: { color: '#fff', marginLeft: 6, fontSize: 13, fontWeight: '600' },
  heroScore: { fontSize: 56, fontWeight: '800', color: '#fff', lineHeight: 64 },
  heroScoreMax: { fontSize: 20, fontWeight: '600', color: 'rgba(255,255,255,0.75)', alignSelf: 'flex-end', marginBottom: 8 },
  heroStatusBadge: {
    marginLeft: 12,
    marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-end',
  },
  heroStatusText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  heroStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  heroUpdate: { color: 'rgba(255,255,255,0.65)', fontSize: 11, marginTop: 10, textAlign: 'right' },

  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.ink },
  sectionSub: { fontSize: 12, color: colors.muted, marginTop: 2 },

  grid2: { gap: 8 },
  quickCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: radii.md,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickDot: { width: 10, height: 10, borderRadius: 5 },

  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0DB09E',
    borderRadius: radii.pill,
    paddingVertical: 14,
    gap: 8,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  card: {
    backgroundColor: '#fff',
    borderRadius: radii.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },

  chartBars: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 100 },
  chartBarCol: { flex: 1, alignItems: 'center' },
  chartBarBg: { flex: 1, width: '100%', justifyContent: 'flex-end', alignItems: 'center' },
  chartBar: { width: '70%', borderRadius: 4 },
  chartLabel: { marginTop: 6, fontSize: 10, color: colors.muted },
  chartLegend: { flexDirection: 'row', gap: 12, marginTop: 10, justifyContent: 'center' },

  insightText: { fontSize: 13, color: colors.ink, lineHeight: 20, marginBottom: 6 },
  insightBtn: { marginTop: 8 },

  wellnessRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  progressTrack: {
    height: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    marginTop: 6,
    overflow: 'hidden',
  },
  progressFill: { height: 8, borderRadius: 4 },
  wellnessChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  saveBtnSmall: {
    backgroundColor: '#0DB09E',
    borderRadius: radii.md,
    padding: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  editWellnessBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: radii.md,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },

  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0DB09E',
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderRadius: 28,
    gap: 7,
    shadowColor: '#0DB09E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  fabText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Modal / Bottom sheet
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  bottomSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
    maxHeight: '85%',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: { fontSize: 20, fontWeight: '700', color: colors.ink, marginBottom: 12 },
  sheetLabel: { fontSize: 13, fontWeight: '600', color: colors.muted, marginBottom: 8 },
  searchInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.ink,
    marginBottom: 12,
    backgroundColor: '#F9FAFB',
  },
  symptomOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  intensityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingVertical: 8,
  },
  intensityDot: { width: 26, height: 26, borderRadius: 13 },
  durationRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  durationChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#F9FAFB',
  },
  durationChipActive: { backgroundColor: '#0DB09E', borderColor: '#0DB09E' },
  durationText: { fontSize: 13, fontWeight: '500', color: colors.ink },
  backBtnSheet: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  saveBtnSheet: {
    backgroundColor: '#0DB09E',
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
});
