import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MemberPickerModal } from '../src/components/MemberPickerModal';
import { MemberSwitcher } from '../src/components/MemberSwitcher';
import { useAuth } from '../src/context/AuthContext';
import { useMemberPicker } from '../src/hooks/useMemberPicker';
import { chat, toDataUrl } from '../src/services/openrouter';
import { computeHealthScore, effectiveEndedAt, formatDurationFromMs } from '../src/store/symptoms';
import type { DailyWellness, SymptomDuration, SymptomLog } from '../src/store/symptoms';
import { useSymptomsStore } from '../src/store/symptoms';
import { useMembersStore } from '../src/store/members';
import { colors, radii } from '../src/theme';
import type { ChatAttachment } from '../src/types';

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

// 'stress' rappresenta ora il livello di Relax/Calma: più alto = meglio.
const WELLNESS_ITEMS = [
  { key: 'sleep' as const, emoji: '😴', color: '#5B7CFA' },
  { key: 'hydration' as const, emoji: '💧', color: '#0DB09E' },
  { key: 'energy' as const, emoji: '⚡', color: '#F59E0B' },
  { key: 'mood' as const, emoji: '😊', color: '#EC4899' },
  { key: 'stress' as const, emoji: '😌', color: '#8B5CF6' },
] as const;

// ─── Helper puri (usabili anche fuori da React) ───────────────────────────────

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
function levelLabel(v: number) {
  return v >= 70 ? 'Alta' : v >= 40 ? 'Media' : 'Bassa';
}

function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const MONTHS_IT = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
function formatLogDate(iso: string, todayMode: boolean): string {
  const d = new Date(iso);
  if (todayMode) {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  return `${d.getDate()} ${MONTHS_IT[d.getMonth()]}`;
}

function computeWeekTrend(logs: SymptomLog[]): { value: number; dayLabel: string; isToday: boolean }[] {
  // Settimana fissa Lunedì → Domenica; oggi cade nella sua posizione reale.
  const FIXED_LABELS = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];
  const now = new Date();
  const todayKey = localDateKey(now);
  const todayMonBased = (now.getDay() + 6) % 7; // Lun=0 ... Dom=6
  const monday = new Date(now);
  monday.setDate(now.getDate() - todayMonBased);

  const result: { value: number; dayLabel: string; isToday: boolean }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const key = localDateKey(d);
    const dayLogs = logs.filter((l) => localDateKey(new Date(l.date)) === key);
    const avg = dayLogs.length
      ? dayLogs.reduce((a, l) => a + l.intensity, 0) / dayLogs.length
      : 0;
    result.push({ value: avg, dayLabel: FIXED_LABELS[i], isToday: key === todayKey });
  }
  return result;
}

function buildInsight(logs: SymptomLog[], wellness: DailyWellness | null): string {
  if (logs.length === 0) return 'Registra sintomi per ricevere insight personalizzati.';
  const long = logs.find((l) => l.duration === 'week' || l.duration === 'longer');
  if (long) return `"${long.name}" dura da tempo: valuta un consulto medico.`;
  if (wellness && wellness.sleep < 40 && wellness.energy < 40)
    return 'Sonno ed energia bassi: possibile correlazione con i sintomi.';
  if (logs.filter((l) => l.intensity >= 7).length >= 2)
    return 'Sintomi intensi recenti: tieni monitorato il quadro.';
  return "Tocca per analizzare i tuoi sintomi con l'AI.";
}

// ─── Member filtering ─────────────────────────────────────────────────────────

function belongsTo(
  entryMemberId: string | undefined,
  activeId: string | null,
  isDefaultFn: (id: string | null) => boolean,
): boolean {
  if (!activeId) return true;
  if (entryMemberId && entryMemberId === activeId) return true;
  if (!entryMemberId && isDefaultFn(activeId)) return true;
  return false;
}

// ─── Schermata principale ────────────────────────────────────────────────────

export default function SintomiScreen() {
  const { getToken } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SymptomLog | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [endedInfo, setEndedInfo] = useState<{ name: string; emoji: string; duration: string } | null>(null);
  const [wellnessOpen, setWellnessOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [expandedToday, setExpandedToday] = useState(true);
  const [expandedRecent, setExpandedRecent] = useState(false);

  // Selectors reattivi: si ri-renderizza quando logs o wellness cambiano
  const allLogs = useSymptomsStore((s) => s.logs);
  const allWellness = useSymptomsStore((s) => s.wellness);
  const removeLog = useSymptomsStore((s) => s.removeLog);
  const terminateLog = useSymptomsStore((s) => s.terminateLog);

  const activeHumanId = useMembersStore((s) => s.activeHumanId);
  const isDefaultHuman = useMembersStore((s) => s.isDefault);

  const logs = allLogs.filter((l) => belongsTo(l.memberId, activeHumanId, (id) => isDefaultHuman('human', id)));
  const wellness = allWellness && belongsTo(allWellness.memberId, activeHumanId, (id) => isDefaultHuman('human', id)) ? allWellness : null;

  const score = computeHealthScore(logs, wellness);
  const trend = computeWeekTrend(logs);
  const recent = logs.slice(0, 6);

  const todayKey = localDateKey(new Date());
  const todayLogs = logs.filter((l) => localDateKey(new Date(l.date)) === todayKey);
  const recentLogs = logs.filter((l) => localDateKey(new Date(l.date)) !== todayKey).slice(0, 30);

  const openAdd = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (log: SymptomLog) => { setMenuFor(null); setEditing(log); setModalOpen(true); };
  const doRemove = (id: string) => { setMenuFor(null); removeLog(id); };
  const doTerminate = (id: string) => {
    const log = logs.find((l) => l.id === id);
    if (!log) { setMenuFor(null); return; }
    if (log.endedAt) { setMenuFor(null); return; }
    const endedAt = terminateLog(id);
    const dur = formatDurationFromMs(new Date(endedAt).getTime() - new Date(log.date).getTime());
    setMenuFor(null);
    setEndedInfo({ name: log.name, emoji: log.emoji, duration: dur });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F0F9F8' }}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.ink} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Sintomi & Benessere</Text>
          <Text style={styles.headerSub}>Monitora il tuo stato</Text>
        </View>
        <MemberSwitcher kind="human" accent={colors.primary} variant="compact" />
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={{ paddingBottom: 90 }}
        showsVerticalScrollIndicator={false}
      >
        {/* HERO compatto */}
        <HealthScoreCard score={score} wellness={wellness} />

        {/* SINTOMI ODIERNI */}
        <View style={styles.rowBetween}>
          <Pressable onPress={() => setExpandedToday((v) => !v)} style={styles.sectionToggle} hitSlop={6}>
            <Text style={styles.sectionTitle}>Sintomi odierni</Text>
            {todayLogs.length > 0 && (
              <View style={styles.countBadge}><Text style={styles.countBadgeTxt}>{todayLogs.length}</Text></View>
            )}
            <Ionicons name={expandedToday ? 'chevron-up' : 'chevron-down'} size={16} color={colors.muted} />
          </Pressable>
          <Pressable onPress={openAdd} style={styles.addInline}>
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={styles.addInlineText}>Registra</Text>
          </Pressable>
        </View>

        {expandedToday && (
          todayLogs.length === 0 ? (
            <Pressable onPress={openAdd} style={styles.emptyCard}>
              <Text style={{ fontSize: 22 }}>🩺</Text>
              <Text style={styles.emptyText}>Nessun sintomo oggi.{'\n'}Tocca per aggiungerne uno.</Text>
            </Pressable>
          ) : (
            <View style={styles.symGrid}>
              {todayLogs.map((l) => (
                <SymptomCard key={l.id} log={l} todayMode onMenu={() => setMenuFor(l.id)} />
              ))}
            </View>
          )
        )}

        {/* SINTOMI RECENTI (giorni precedenti) */}
        <Pressable onPress={() => setExpandedRecent((v) => !v)} style={[styles.sectionToggle, { marginTop: 16, marginBottom: 8 }]} hitSlop={6}>
          <Text style={styles.sectionTitle}>Sintomi recenti</Text>
          {recentLogs.length > 0 && (
            <View style={styles.countBadge}><Text style={styles.countBadgeTxt}>{recentLogs.length}</Text></View>
          )}
          <Ionicons name={expandedRecent ? 'chevron-up' : 'chevron-down'} size={16} color={colors.muted} />
        </Pressable>

        {expandedRecent && (
          recentLogs.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>Nessun sintomo dei giorni precedenti.</Text>
            </View>
          ) : (
            <View style={styles.symGrid}>
              {recentLogs.map((l) => (
                <SymptomCard key={l.id} log={l} todayMode={false} onMenu={() => setMenuFor(l.id)} />
              ))}
            </View>
          )
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
              {trend.map((item, i) => (
                <View key={i} style={styles.chartCol}>
                  <View
                    style={{
                      width: '70%',
                      height: Math.max(3, (item.value / 10) * 42),
                      borderRadius: 3,
                      backgroundColor:
                        item.value === 0
                          ? '#E5E7EB'
                          : item.isToday
                          ? '#0DB09E'
                          : intensityColor(item.value),
                    }}
                  />
                  <Text
                    style={[
                      styles.chartDayLabel,
                      item.isToday && { color: '#0DB09E', fontWeight: '700' },
                    ]}
                  >
                    {item.dayLabel}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <Pressable onPress={() => setChatOpen(true)} style={styles.aiBox}>
            <Ionicons name="sparkles" size={20} color="#3B82F6" />
            <Text style={styles.aiBoxTitle}>Insight AI</Text>
            <Text style={styles.aiBoxText} numberOfLines={2}>
              {buildInsight(recent, wellness)}
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* FAB — apre modal chat inline */}
      <Pressable onPress={() => setChatOpen(true)} style={styles.fab}>
        <Ionicons name="chatbubble-ellipses" size={18} color="#fff" />
        <Text style={styles.fabText}>Chat Med</Text>
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
              {(() => {
                const log = logs.find((l) => l.id === menuFor);
                const alreadyEnded = !!log && !!effectiveEndedAt(log);
                return (
                  <Pressable
                    style={[styles.menuItem, alreadyEnded && { opacity: 0.4 }]}
                    onPress={() => !alreadyEnded && menuFor && doTerminate(menuFor)}
                    disabled={alreadyEnded}
                  >
                    <Ionicons name="checkmark-done-outline" size={20} color="#16A34A" />
                    <Text style={[styles.menuText, { color: '#16A34A' }]}>
                      {alreadyEnded ? 'Già terminato' : 'Terminato'}
                    </Text>
                  </Pressable>
                );
              })()}
              <View style={styles.menuDivider} />
              <Pressable style={styles.menuItem} onPress={() => menuFor && doRemove(menuFor)}>
                <Ionicons name="trash-outline" size={20} color={colors.danger} />
                <Text style={[styles.menuText, { color: colors.danger }]}>Elimina</Text>
              </Pressable>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Popup durata terminato */}
      <Modal visible={!!endedInfo} transparent animationType="fade" onRequestClose={() => setEndedInfo(null)}>
        <View style={styles.endedBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setEndedInfo(null)} />
          <View style={styles.endedCard}>
            <View style={styles.endedIcon}>
              <Ionicons name="checkmark-circle" size={32} color="#16A34A" />
            </View>
            <Text style={styles.endedTitle}>Sintomo terminato</Text>
            <Text style={styles.endedSymptom}>
              {endedInfo?.emoji} {endedInfo?.name}
            </Text>
            <Text style={styles.endedDurLabel}>Durata totale</Text>
            <Text style={styles.endedDurVal}>{endedInfo?.duration}</Text>
            <Pressable style={styles.endedBtn} onPress={() => setEndedInfo(null)}>
              <Text style={styles.endedBtnTxt}>Ok</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Modal aggiunta/modifica sintomo */}
      <SymptomModal
        visible={modalOpen}
        editing={editing}
        onClose={() => { setModalOpen(false); setEditing(null); }}
      />

      {/* Modal benessere */}
      <WellnessModal visible={wellnessOpen} wellness={wellness} onClose={() => setWellnessOpen(false)} />

      {/* Modal chat AI inline */}
      <SintomiChatModal
        visible={chatOpen}
        logs={recent}
        wellness={wellness}
        getToken={getToken}
        onClose={() => setChatOpen(false)}
      />
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
        <HeroStat label="Relax" value={wellness ? levelLabel(wellness.stress) : '—'} />
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

// ─── Symptom card ─────────────────────────────────────────────────────────────

function SymptomCard({ log, onMenu, todayMode }: { log: SymptomLog; onMenu: () => void; todayMode: boolean }) {
  const endedAt = effectiveEndedAt(log);
  const duration = endedAt
    ? formatDurationFromMs(new Date(endedAt).getTime() - new Date(log.date).getTime())
    : null;
  return (
    <View style={[styles.symCard, !!endedAt && { opacity: 0.7 }]}>
      <Text style={{ fontSize: 22 }}>{log.emoji}</Text>
      <View style={{ flex: 1, marginLeft: 8 }}>
        <Text style={styles.symName} numberOfLines={1}>{log.name}</Text>
        <Text style={[styles.symStatus, { color: endedAt ? colors.muted : intensityColor(log.intensity) }]}>
          {endedAt ? `✓ Terminato · ${duration}` : `${intensityLabel(log.intensity)} · ${formatLogDate(log.date, todayMode)}`}
        </Text>
      </View>
      <Pressable onPress={onMenu} hitSlop={8} style={styles.dots}>
        <Ionicons name="ellipsis-vertical" size={16} color={colors.muted} />
      </Pressable>
    </View>
  );
}

// ─── Slider intensità ─────────────────────────────────────────────────────────

function IntensitySlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const trackRef = useRef<View>(null);
  const trackInfo = useRef({ x: 0, width: 0 });

  const applyPageX = (pageX: number) => {
    const { x, width } = trackInfo.current;
    if (width === 0) return;
    const fraction = Math.max(0, Math.min(1, (pageX - x) / width));
    onChange(Math.round(fraction * 9) + 1);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => applyPageX(e.nativeEvent.pageX),
      onPanResponderMove: (e) => applyPageX(e.nativeEvent.pageX),
    }),
  ).current;

  const fillFraction = (value - 1) / 9;
  const color = intensityColor(value);

  return (
    <View
      ref={trackRef}
      {...panResponder.panHandlers}
      onLayout={() => {
        trackRef.current?.measure((_x, _y, w, _h, pageX) => {
          trackInfo.current = { x: pageX, width: w };
        });
      }}
      style={styles.sliderWrapper}
    >
      {/* Track */}
      <View style={styles.sliderTrack}>
        <View
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: `${fillFraction * 100}%` as unknown as number,
            backgroundColor: color,
            borderRadius: 4,
          }}
        />
      </View>
      {/* Thumb: posizionato al percentile corretto */}
      <View
        style={{
          position: 'absolute',
          left: `${fillFraction * 100}%` as unknown as number,
          top: 0,
          bottom: 0,
          width: 0,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: color,
            borderWidth: 2,
            borderColor: '#fff',
            elevation: 4,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3,
          }}
        />
      </View>
    </View>
  );
}

// ─── Chat AI inline ───────────────────────────────────────────────────────────

type LocalMsg = { role: 'user' | 'assistant'; text: string; attachments?: ChatAttachment[] };

function SintomiChatModal({
  visible,
  logs,
  wellness,
  getToken,
  onClose,
}: {
  visible: boolean;
  logs: SymptomLog[];
  wellness: DailyWellness | null;
  getToken: () => Promise<string | null>;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<LocalMsg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [pending, setPending] = useState<ChatAttachment[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const flatRef = useRef<FlatList<LocalMsg>>(null);

  async function pickFromLibrary() {
    setPickerOpen(false);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      quality: 0.7,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });
    if (res.canceled || !res.assets[0]) return;
    const asset = res.assets[0];
    const mime = asset.mimeType ?? 'image/jpeg';
    const dataUrl = await toDataUrl(asset.uri, mime);
    setPending((p) => [...p, { url: asset.uri, mimeType: mime, dataUrl }]);
  }

  async function pickFromCamera() {
    setPickerOpen(false);
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (res.canceled || !res.assets[0]) return;
    const asset = res.assets[0];
    const mime = asset.mimeType ?? 'image/jpeg';
    const dataUrl = await toDataUrl(asset.uri, mime);
    setPending((p) => [...p, { url: asset.uri, mimeType: mime, dataUrl }]);
  }

  // Reset su ogni apertura
  const [wasVisible, setWasVisible] = useState(false);
  if (visible && !wasVisible) {
    setWasVisible(true);
    const welcome = `Ciao! Ho visto i tuoi dati.\n${logs.length > 0 ? `Hai registrato: ${logs.map((l) => `${l.emoji} ${l.name} (${intensityLabel(l.intensity)})`).join(', ')}.` : 'Nessun sintomo registrato.'}\n\nCome posso aiutarti?`;
    setMessages([{ role: 'assistant', text: welcome }]);
    setInput('');
  }
  if (!visible && wasVisible) {
    setWasVisible(false);
  }

  const buildContext = () => {
    const parts: string[] = [];
    if (logs.length > 0) {
      parts.push(`Sintomi: ${logs.map((l) => `${l.name} (intensità ${l.intensity}/10, durata: ${l.duration})`).join(', ')}.`);
    }
    if (wellness) {
      parts.push(`Benessere: sonno ${wellness.sleep}%, idratazione ${wellness.hydration}%, energia ${wellness.energy}%, umore ${wellness.mood}%, stress ${wellness.stress}%.`);
    }
    return parts.join(' ');
  };

  const send = async () => {
    const trimmed = input.trim();
    if ((!trimmed && pending.length === 0) || sending) return;
    const attachments = pending;
    setInput('');
    setPending([]);
    const updated: LocalMsg[] = [...messages, { role: 'user', text: trimmed, attachments: attachments.length ? attachments : undefined }];
    setMessages(updated);
    setSending(true);
    try {
      const token = await getToken();
      const history = updated.map((m, i) => ({
        id: `m-${i}`,
        role: m.role,
        text: m.text,
        attachments: m.attachments,
        createdAt: new Date().toISOString(),
      }));
      const reply = await chat({ history, extraContext: buildContext(), token });
      setMessages((prev) => [...prev, { role: 'assistant', text: reply }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', text: "Errore nel contattare l'AI. Riprova." }]);
    } finally {
      setSending(false);
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay} />
      </TouchableWithoutFeedback>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.chatSheet}>
        <View style={styles.sheetHandle} />
        <View style={styles.chatHeader}>
          <Ionicons name="sparkles" size={18} color="#3B82F6" />
          <Text style={styles.chatHeaderText}>Chat Med</Text>
          <Pressable onPress={onClose} hitSlop={10} style={{ marginLeft: 'auto' }}>
            <Ionicons name="close" size={22} color={colors.muted} />
          </Pressable>
        </View>
        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={(_, i) => String(i)}
          style={styles.chatList}
          contentContainerStyle={{ padding: 12, gap: 10 }}
          renderItem={({ item }) => (
            <View
              style={[
                styles.chatBubble,
                item.role === 'user' ? styles.chatBubbleUser : styles.chatBubbleAI,
              ]}
            >
              {item.attachments?.map((a, i) => (
                <Image key={i} source={{ uri: a.url }} style={styles.chatBubbleImg} />
              ))}
              {item.text ? (
                <Text
                  style={{
                    fontSize: 13,
                    color: item.role === 'user' ? '#fff' : colors.ink,
                    lineHeight: 19,
                  }}
                >
                  {item.text}
                </Text>
              ) : null}
            </View>
          )}
        />
        {sending && (
          <View style={{ paddingHorizontal: 16, paddingBottom: 4 }}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        )}
        {pending.length > 0 && (
          <View style={styles.chatAttachStrip}>
            {pending.map((a, i) => (
              <View key={i} style={styles.chatAttachThumbWrap}>
                <Image source={{ uri: a.url }} style={styles.chatAttachThumb} />
                <Pressable
                  style={styles.chatAttachRemove}
                  onPress={() => setPending((p) => p.filter((_, idx) => idx !== i))}
                  hitSlop={6}
                >
                  <Ionicons name="close" size={12} color="#fff" />
                </Pressable>
              </View>
            ))}
          </View>
        )}
        <View style={styles.chatInputRow}>
          <Pressable
            onPress={() => setPickerOpen(true)}
            style={styles.chatAttachBtn}
            disabled={sending}
            hitSlop={6}
          >
            <Ionicons name="add" size={22} color={colors.primary} />
          </Pressable>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Scrivi un messaggio..."
            placeholderTextColor={colors.muted}
            style={styles.chatInput}
            onSubmitEditing={send}
            returnKeyType="send"
          />
          <Pressable
            onPress={send}
            disabled={(!input.trim() && pending.length === 0) || sending}
            style={[styles.chatSendBtn, ((!input.trim() && pending.length === 0) || sending) && { opacity: 0.4 }]}
          >
            <Ionicons name="send" size={18} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setPickerOpen(false)} />
        <View style={styles.chatPickerSheet}>
          <View style={styles.sheetHandle} />
          <Pressable style={styles.chatPickerItem} onPress={pickFromCamera}>
            <Ionicons name="camera-outline" size={22} color={colors.ink} />
            <Text style={styles.chatPickerItemTxt}>Scatta foto</Text>
          </Pressable>
          <Pressable style={styles.chatPickerItem} onPress={pickFromLibrary}>
            <Ionicons name="images-outline" size={22} color={colors.ink} />
            <Text style={styles.chatPickerItemTxt}>Scegli dalla galleria</Text>
          </Pressable>
          <Pressable style={[styles.chatPickerItem, { justifyContent: 'center' }]} onPress={() => setPickerOpen(false)}>
            <Text style={[styles.chatPickerItemTxt, { color: colors.muted }]}>Annulla</Text>
          </Pressable>
        </View>
      </Modal>
    </Modal>
  );
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
  const { pickMember, modalProps: pickerProps } = useMemberPicker('human');

  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<{ name: string; emoji: string } | null>(null);
  const [intensity, setIntensity] = useState(5);
  const [duration, setDuration] = useState<SymptomDuration>('today');
  const [notes, setNotes] = useState('');
  const [search, setSearch] = useState('');

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

  const save = async () => {
    if (!selected) return;
    if (editing) {
      updateLog(editing.id, { name: selected.name, emoji: selected.emoji, intensity, duration, notes });
      onClose();
      return;
    }
    const picked = await pickMember();
    if (picked.prompted && picked.id === null) return;
    addLog({
      name: selected.name,
      emoji: selected.emoji,
      intensity,
      duration,
      notes,
      memberId: picked.id ?? undefined,
    });
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
              {/* Opzione sintomo personalizzato: compare quando il testo non è nella lista */}
              {search.trim().length > 0 && !filtered.some((s) => s.name.toLowerCase() === search.trim().toLowerCase()) && (
                <Pressable
                  onPress={() => { setSelected({ name: search.trim(), emoji: '🩺' }); setStep(1); }}
                  style={[styles.symptomOption, styles.symptomOptionCustom]}
                >
                  <Text style={{ fontSize: 22 }}>🩺</Text>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: colors.primary }}>
                      Aggiungi "{search.trim()}"
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.muted }}>Sintomo personalizzato</Text>
                  </View>
                  <Ionicons name="add-circle" size={20} color={colors.primary} />
                </Pressable>
              )}
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
            <IntensitySlider value={intensity} onChange={setIntensity} />

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
      <MemberPickerModal {...pickerProps} accent={colors.primary} />
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
  const { pickMember, modalProps: pickerProps } = useMemberPicker('human');
  const [draft, setDraft] = useState({
    sleep: wellness?.sleep ?? 60,
    hydration: wellness?.hydration ?? 50,
    energy: wellness?.energy ?? 70,
    mood: wellness?.mood ?? 65,
    stress: wellness?.stress ?? 60,
  });
  const labels: Record<string, string> = {
    sleep: 'Sonno', hydration: 'Idratazione', energy: 'Energia', mood: 'Umore', stress: 'Relax',
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
          onPress={async () => {
            const picked = await pickMember();
            if (picked.prompted && picked.id === null) return;
            setWellness({ ...draft, memberId: picked.id ?? undefined });
            onClose();
          }}
          style={[styles.saveBtnSheet, { marginTop: 4 }]}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Salva</Text>
        </Pressable>
      </View>
      <MemberPickerModal {...pickerProps} accent={colors.primary} />
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
  sectionToggle: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  countBadge: {
    minWidth: 20,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    backgroundColor: '#E6FAF8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeTxt: { fontSize: 11, fontWeight: '700', color: '#0DB09E' },

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
  chartBars: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 54 },
  chartCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' },
  chartDayLabel: { fontSize: 9, color: colors.muted, marginTop: 3, fontWeight: '600' },

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
  endedBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 32 },
  endedCard: { backgroundColor: '#fff', borderRadius: radii.lg, padding: 24, width: '100%', alignItems: 'center' },
  endedIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  endedTitle: { fontSize: 18, fontWeight: '800', color: colors.ink, marginBottom: 8 },
  endedSymptom: { fontSize: 15, fontWeight: '600', color: colors.ink, marginBottom: 14 },
  endedDurLabel: { fontSize: 12, color: colors.muted, marginBottom: 4 },
  endedDurVal: { fontSize: 26, fontWeight: '800', color: '#16A34A', marginBottom: 20 },
  endedBtn: { backgroundColor: colors.primary, borderRadius: radii.pill, paddingVertical: 12, paddingHorizontal: 48 },
  endedBtnTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },
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
  symptomOptionCustom: {
    backgroundColor: '#F0FDF9',
    borderRadius: 10,
    paddingHorizontal: 8,
    marginBottom: 4,
    borderBottomWidth: 0,
    borderWidth: 1,
    borderColor: '#99E6DA',
  },

  // Slider intensità
  sliderWrapper: {
    paddingVertical: 16,
    marginBottom: 4,
  },
  sliderTrack: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
  },

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

  // Chat modal
  chatSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    minHeight: '60%',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  chatHeaderText: { fontSize: 16, fontWeight: '700', color: colors.ink },
  chatList: { flex: 1 },
  chatBubble: {
    maxWidth: '85%',
    borderRadius: 16,
    padding: 12,
  },
  chatBubbleUser: {
    alignSelf: 'flex-end',
    backgroundColor: '#0DB09E',
    borderBottomRightRadius: 4,
  },
  chatBubbleAI: {
    alignSelf: 'flex-start',
    backgroundColor: '#F3F4F6',
    borderBottomLeftRadius: 4,
  },
  chatInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  chatInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.ink,
    backgroundColor: '#F9FAFB',
  },
  chatSendBtn: {
    backgroundColor: '#0DB09E',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatAttachBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#F9FAFB',
  },
  chatAttachStrip: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 6 },
  chatAttachThumbWrap: { position: 'relative' },
  chatAttachThumb: { width: 56, height: 56, borderRadius: 10, backgroundColor: '#F3F4F6' },
  chatAttachRemove: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatBubbleImg: { width: 200, height: 200, borderRadius: 12, marginBottom: 6, backgroundColor: '#F3F4F6' },
  chatPickerSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 28,
    paddingTop: 6,
  },
  chatPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  chatPickerItemTxt: { fontSize: 15, fontWeight: '600', color: colors.ink },
});
