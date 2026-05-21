import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import {
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
import type { DailyWellness, SymptomDuration, SymptomLog } from '../src/store/symptoms';
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

const WELLNESS_ITEMS = [
  { key: 'sleep' as const, emoji: '😴', color: '#5B7CFA' },
  { key: 'hydration' as const, emoji: '💧', color: '#0DB09E' },
  { key: 'energy' as const, emoji: '⚡', color: '#F59E0B' },
  { key: 'mood' as const, emoji: '😊', color: '#EC4899' },
  { key: 'stress' as const, emoji: '🧠', color: '#DC2626', invert: true },
] as const;

function intensityColor(v: number): string {
  return v <= 3 ? '#16A34A' : v <= 6 ? '#F59E0B' : '#DC2626';
}
function intensityLabel(v: number): string {
  return v <= 3 ? 'Lieve' : v <= 6 ? 'Moderato' : 'Forte';
}
function scoreColor(s: number): string {
  return s >= 75 ? '#16A34A' : s >= 50 ? '#F59E0B' : '#DC2626';
}
function scoreLabel(s: number): string {
  return s >= 75 ? 'Buono' : s >= 50 ? 'Attenzione' : 'Critico';
}
function stressLabel(v: number) {
  return v <= 30 ? 'Basso' : v <= 60 ? 'Medio' : 'Alto';
}
function levelLabel(v: number) {
  return v >= 70 ? 'Alta' : v >= 40 ? 'Media' : 'Bassa';
}

// ─── Schermata principale (compatta, no-scroll) ───────────────────────────────

export default function SintomiScreen() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SymptomLog | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [wellnessOpen, setWellnessOpen] = useState(false);

  const logs = useSymptomsStore((s) => s.logs);
  const wellness = useSymptomsStore((s) => s.wellness);
  const removeLog = useSymptomsStore((s) => s.removeLog);
  const getHealthScore = useSymptomsStore((s) => s.getHealthScore);
  const getWeekTrend = useSymptomsStore((s) => s.getWeekTrend);

  const score = getHealthScore();
  const trend = getWeekTrend();
  const recent = logs.slice(0, 6);

  const openAdd = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (log: SymptomLog) => { setMenuFor(null); setEditing(log); setModalOpen(true); };
  const doRemove = (id: string) => { setMenuFor(null); removeLog(id); };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F0F9F8' }}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.ink} />
        </Pressable>
        <View>
          <Text style={styles.headerTitle}>Sintomi & Benessere</Text>
          <Text style={styles.headerSub}>Monitora il tuo stato</Text>
        </View>
      </View>

      <View style={styles.body}>
        {/* HERO compatto */}
        <HealthScoreCard score={score} wellness={wellness} />

        {/* SINTOMI + add */}
        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>Sintomi recenti</Text>
          <Pressable onPress={openAdd} style={styles.addInline}>
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={styles.addInlineText}>Registra</Text>
          </Pressable>
        </View>

        {recent.length === 0 ? (
          <Pressable onPress={openAdd} style={styles.emptyCard}>
            <Text style={{ fontSize: 26 }}>🩺</Text>
            <Text style={styles.emptyText}>Nessun sintomo registrato.{'\n'}Tocca per aggiungerne uno.</Text>
          </Pressable>
        ) : (
          <View style={styles.symGrid}>
            {recent.map((l) => (
              <SymptomCard key={l.id} log={l} onMenu={() => setMenuFor(l.id)} />
            ))}
          </View>
        )}

        {/* BENESSERE compatto */}
        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>Benessere</Text>
          <Pressable onPress={() => setWellnessOpen(true)}>
            <Text style={styles.linkText}>Aggiorna</Text>
          </Pressable>
        </View>
        <View style={styles.wellnessStrip}>
          {WELLNESS_ITEMS.map((it) => {
            const v = wellness ? wellness[it.key] : null;
            return (
              <View key={it.key} style={styles.wellnessPill}>
                <Text style={{ fontSize: 18 }}>{it.emoji}</Text>
                <Text style={styles.wellnessVal}>{v !== null ? `${v}%` : '—'}</Text>
              </View>
            );
          })}
        </View>

        {/* TREND + AI riga */}
        <View style={styles.bottomRow}>
          <View style={styles.trendBox}>
            <Text style={styles.miniTitle}>Andamento 7gg</Text>
            <View style={styles.chartBars}>
              {trend.map((v, i) => (
                <View key={i} style={styles.chartCol}>
                  <View
                    style={{
                      width: '70%',
                      height: Math.max(3, (v / 10) * 42),
                      borderRadius: 3,
                      backgroundColor: v === 0 ? '#E5E7EB' : intensityColor(v),
                    }}
                  />
                </View>
              ))}
            </View>
          </View>

          <Pressable onPress={() => router.push('/(tabs)/chat')} style={styles.aiBox}>
            <Ionicons name="sparkles" size={20} color="#3B82F6" />
            <Text style={styles.aiBoxTitle}>Insight AI</Text>
            <Text style={styles.aiBoxText} numberOfLines={2}>
              {buildInsight(recent, wellness)}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* FAB */}
      <Pressable onPress={() => router.push('/(tabs)/chat')} style={styles.fab}>
        <Ionicons name="chatbubble-ellipses" size={18} color="#fff" />
        <Text style={styles.fabText}>Chiedi all'AI</Text>
      </Pressable>

      {/* Menu 3 puntini */}
      <Modal visible={!!menuFor} transparent animationType="fade" onRequestClose={() => setMenuFor(null)}>
        <TouchableWithoutFeedback onPress={() => setMenuFor(null)}>
          <View style={styles.menuOverlay}>
            <View style={styles.menuSheet}>
              <Pressable
                style={styles.menuItem}
                onPress={() => {
                  const log = logs.find((l) => l.id === menuFor);
                  if (log) openEdit(log);
                }}
              >
                <Ionicons name="create-outline" size={20} color={colors.ink} />
                <Text style={styles.menuText}>Modifica</Text>
              </Pressable>
              <View style={styles.menuDivider} />
              <Pressable style={styles.menuItem} onPress={() => menuFor && doRemove(menuFor)}>
                <Ionicons name="trash-outline" size={20} color={colors.danger} />
                <Text style={[styles.menuText, { color: colors.danger }]}>Elimina</Text>
              </Pressable>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Modal aggiunta/modifica sintomo */}
      <SymptomModal
        visible={modalOpen}
        editing={editing}
        onClose={() => { setModalOpen(false); setEditing(null); }}
      />

      {/* Modal benessere */}
      <WellnessModal visible={wellnessOpen} wellness={wellness} onClose={() => setWellnessOpen(false)} />
    </SafeAreaView>
  );
}

// ─── Hero compatto ────────────────────────────────────────────────────────────

function HealthScoreCard({ score, wellness }: { score: number; wellness: DailyWellness | null }) {
  const gradient: [string, string] =
    score >= 75 ? ['#0DB09E', '#22C55E'] : score >= 50 ? ['#F59E0B', '#EF4444'] : ['#EF4444', '#DC2626'];
  return (
    <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="heart" size={14} color="#fff" />
          <Text style={styles.heroLabel}>Stato generale</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 4 }}>
          <Text style={styles.heroScore}>{score}</Text>
          <Text style={styles.heroMax}>/100</Text>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>{scoreLabel(score)}</Text>
          </View>
        </View>
      </View>
      <View style={styles.heroStats}>
        <HeroStat label="Stress" value={wellness ? stressLabel(wellness.stress) : '—'} />
        <HeroStat label="Energia" value={wellness ? levelLabel(wellness.energy) : '—'} />
        <HeroStat label="Sonno" value={wellness ? levelLabel(wellness.sleep) : '—'} />
      </View>
    </LinearGradient>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ alignItems: 'flex-end' }}>
      <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 10 }}>{label}</Text>
      <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{value}</Text>
    </View>
  );
}

// ─── Symptom card (con 3 puntini) ─────────────────────────────────────────────

function SymptomCard({ log, onMenu }: { log: SymptomLog; onMenu: () => void }) {
  return (
    <View style={styles.symCard}>
      <Text style={{ fontSize: 22 }}>{log.emoji}</Text>
      <View style={{ flex: 1, marginLeft: 8 }}>
        <Text style={styles.symName} numberOfLines={1}>{log.name}</Text>
        <Text style={[styles.symStatus, { color: intensityColor(log.intensity) }]}>
          {intensityLabel(log.intensity)}
        </Text>
      </View>
      <Pressable onPress={onMenu} hitSlop={8} style={styles.dots}>
        <Ionicons name="ellipsis-vertical" size={16} color={colors.muted} />
      </Pressable>
    </View>
  );
}

// ─── Insight breve ────────────────────────────────────────────────────────────

function buildInsight(logs: SymptomLog[], wellness: DailyWellness | null): string {
  if (logs.length === 0) return 'Registra sintomi per ricevere insight personalizzati.';
  const long = logs.find((l) => l.duration === 'week' || l.duration === 'longer');
  if (long) return `"${long.name}" dura da tempo: valuta un consulto medico.`;
  if (wellness && wellness.sleep < 40 && wellness.energy < 40)
    return 'Sonno ed energia bassi: possibile correlazione con i sintomi.';
  if (logs.filter((l) => l.intensity >= 7).length >= 2)
    return 'Sintomi intensi recenti: tieni monitorato il quadro.';
  return 'Tocca per analizzare i tuoi sintomi con l\'AI.';
}

// ─── Modal sintomo (add/edit) ─────────────────────────────────────────────────

function SymptomModal({
  visible,
  editing,
  onClose,
}: {
  visible: boolean;
  editing: SymptomLog | null;
  onClose: () => void;
}) {
  const addLog = useSymptomsStore((s) => s.addLog);
  const updateLog = useSymptomsStore((s) => s.updateLog);

  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<{ name: string; emoji: string } | null>(null);
  const [intensity, setIntensity] = useState(5);
  const [duration, setDuration] = useState<SymptomDuration>('today');
  const [notes, setNotes] = useState('');
  const [search, setSearch] = useState('');

  // Sincronizza quando si apre in modalità modifica
  const [lastVisible, setLastVisible] = useState(false);
  if (visible !== lastVisible) {
    setLastVisible(visible);
    if (visible) {
      if (editing) {
        setSelected({ name: editing.name, emoji: editing.emoji });
        setIntensity(editing.intensity);
        setDuration(editing.duration);
        setNotes(editing.notes);
        setStep(1);
      } else {
        setSelected(null); setIntensity(5); setDuration('today'); setNotes(''); setStep(0);
      }
      setSearch('');
    }
  }

  const filtered = PRESET_SYMPTOMS.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()));

  const save = () => {
    if (!selected) return;
    if (editing) {
      updateLog(editing.id, { name: selected.name, emoji: selected.emoji, intensity, duration, notes });
    } else {
      addLog({ name: selected.name, emoji: selected.emoji, intensity, duration, notes });
    }
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay} />
      </TouchableWithoutFeedback>
      <View style={styles.sheet}>
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
            <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
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
            <Text style={styles.sheetTitle}>{selected.emoji} {selected.name}</Text>
            <Text style={styles.sheetLabel}>Intensità: {intensity}/10</Text>
            <View style={styles.intensityRow}>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <Pressable
                  key={n}
                  onPress={() => setIntensity(n)}
                  style={[
                    styles.intensityDot,
                    {
                      backgroundColor: n <= intensity ? intensityColor(n) : '#E5E7EB',
                      transform: [{ scale: n === intensity ? 1.25 : 1 }],
                    },
                  ]}
                />
              ))}
            </View>

            <Text style={[styles.sheetLabel, { marginTop: 14 }]}>Durata</Text>
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

            <Text style={[styles.sheetLabel, { marginTop: 14 }]}>Note (opzionale)</Text>
            <TextInput
              placeholder="Aggiungi una nota..."
              placeholderTextColor={colors.muted}
              value={notes}
              onChangeText={setNotes}
              multiline
              style={[styles.searchInput, { height: 64, textAlignVertical: 'top' }]}
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              {!editing && (
                <Pressable onPress={() => setStep(0)} style={styles.backBtnSheet}>
                  <Text style={{ color: colors.ink, fontWeight: '600' }}>Indietro</Text>
                </Pressable>
              )}
              <Pressable onPress={save} style={[styles.saveBtnSheet, { flex: 2 }]}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>
                  {editing ? 'Salva modifiche' : 'Salva'}
                </Text>
              </Pressable>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

// ─── Modal benessere ──────────────────────────────────────────────────────────

function WellnessModal({
  visible,
  wellness,
  onClose,
}: {
  visible: boolean;
  wellness: DailyWellness | null;
  onClose: () => void;
}) {
  const setWellness = useSymptomsStore((s) => s.setWellness);
  const [draft, setDraft] = useState({
    sleep: wellness?.sleep ?? 60,
    hydration: wellness?.hydration ?? 50,
    energy: wellness?.energy ?? 70,
    mood: wellness?.mood ?? 65,
    stress: wellness?.stress ?? 40,
  });
  const labels: Record<string, string> = {
    sleep: 'Sonno', hydration: 'Idratazione', energy: 'Energia', mood: 'Umore', stress: 'Stress',
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay} />
      </TouchableWithoutFeedback>
      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>Aggiorna benessere</Text>
        {WELLNESS_ITEMS.map((it) => (
          <View key={it.key} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={{ fontWeight: '600', fontSize: 13 }}>{it.emoji} {labels[it.key]}</Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>{draft[it.key]}%</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {[20, 40, 60, 80, 100].map((v) => (
                <Pressable
                  key={v}
                  onPress={() => setDraft((d) => ({ ...d, [it.key]: v }))}
                  style={[styles.wellnessChip, draft[it.key] === v && { backgroundColor: it.color }]}
                >
                  <Text style={{ fontSize: 12, color: draft[it.key] === v ? '#fff' : colors.muted }}>{v}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ))}
        <Pressable
          onPress={() => { setWellness(draft); onClose(); }}
          style={[styles.saveBtnSheet, { marginTop: 4 }]}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Salva</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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

  body: { flex: 1, paddingHorizontal: 16, paddingTop: 4 },

  hero: { flexDirection: 'row', alignItems: 'center', borderRadius: 18, padding: 16 },
  heroLabel: { color: '#fff', marginLeft: 5, fontSize: 12, fontWeight: '600' },
  heroScore: { fontSize: 40, fontWeight: '800', color: '#fff', lineHeight: 44 },
  heroMax: { fontSize: 16, fontWeight: '600', color: 'rgba(255,255,255,0.75)', marginBottom: 5 },
  heroBadge: {
    marginLeft: 10,
    marginBottom: 6,
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 16,
  },
  heroBadgeText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  heroStats: { gap: 6 },

  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.ink },
  linkText: { color: '#0DB09E', fontWeight: '600', fontSize: 13 },

  addInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#0DB09E',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  addInlineText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  emptyCard: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: radii.lg,
    paddingVertical: 24,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  emptyText: { color: colors.muted, fontSize: 13, textAlign: 'center', marginTop: 8 },

  symGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  symCard: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48.5%',
    backgroundColor: '#fff',
    borderRadius: radii.md,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  symName: { fontWeight: '600', fontSize: 13 },
  symStatus: { fontSize: 11, fontWeight: '600', marginTop: 1 },
  dots: { padding: 2 },

  wellnessStrip: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  wellnessPill: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: radii.md,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  wellnessVal: { fontSize: 12, fontWeight: '700', color: colors.ink, marginTop: 2 },

  bottomRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  trendBox: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: radii.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  miniTitle: { fontSize: 12, fontWeight: '700', color: colors.ink, marginBottom: 8 },
  chartBars: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 46 },
  chartCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' },

  aiBox: {
    flex: 1,
    backgroundColor: '#EFF6FF',
    borderRadius: radii.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  aiBoxTitle: { fontSize: 13, fontWeight: '700', color: '#1D4ED8', marginTop: 4 },
  aiBoxText: { fontSize: 11, color: '#3B5BA5', marginTop: 4, lineHeight: 15 },

  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0DB09E',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 26,
    gap: 6,
    shadowColor: '#0DB09E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  fabText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  // Menu 3 puntini
  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center' },
  menuSheet: { backgroundColor: '#fff', borderRadius: radii.lg, width: 220, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 18 },
  menuText: { fontSize: 15, fontWeight: '500', color: colors.ink },
  menuDivider: { height: 1, backgroundColor: colors.border },

  // Bottom sheet
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
    maxHeight: '85%',
  },
  sheetHandle: { width: 40, height: 4, backgroundColor: '#D1D5DB', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
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
  intensityRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  intensityDot: { width: 24, height: 24, borderRadius: 12 },
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
  wellnessChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
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
