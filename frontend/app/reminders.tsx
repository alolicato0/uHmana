import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../src/context/AuthContext';
import { useDoseStore } from '../src/store/doses';
import { useRemindersStore } from '../src/store/reminders';
import { colors, radii } from '../src/theme';
import type { Reminder } from '../src/types';

// ─── Drug interactions ────────────────────────────────────────────────────────
const KNOWN_INTERACTIONS: { drugs: string[]; msg: string }[] = [
  { drugs: ['ibuprofene', 'alcool'], msg: 'Ibuprofene + alcool aumenta il rischio di sanguinamento gastrico.' },
  { drugs: ['ibuprofene', 'aspirina'], msg: "Ibuprofene + Aspirina: possibile riduzione dell'efficacia antiaggregante." },
  { drugs: ['ibuprofene', 'warfarin'], msg: 'Ibuprofene + Warfarin: aumenta il rischio di sanguinamento.' },
  { drugs: ['cortisone', 'ibuprofene'], msg: 'Cortisone + Ibuprofene: doppio anti-infiammatorio, rischio gastrico elevato.' },
  { drugs: ['metformina', 'alcool'], msg: 'Metformina + alcool: rischio di ipoglicemia e acidosi lattica.' },
];

function detectInteractions(reminders: Reminder[]): string[] {
  const names = reminders
    .filter((r) => r.enabled && r.category === 'medication')
    .map((r) => r.title.toLowerCase());
  return KNOWN_INTERACTIONS.filter(({ drugs }) => drugs.every((d) => names.some((n) => n.includes(d)))).map(
    ({ msg }) => msg,
  );
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getSlot(time: string): 'morning' | 'afternoon' | 'evening' {
  const h = parseInt(time.split(':')[0], 10);
  return h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening';
}

function buildAIInsight(
  records: ReturnType<typeof useDoseStore.getState>['records'],
  medCount: number,
): string | null {
  if (medCount === 0) return null;
  const today = todayKey();
  const skippedToday = records.filter((r) => r.date === today && r.action === 'skipped').length;
  if (skippedToday > 0)
    return `Hai saltato ${skippedToday} ${skippedToday === 1 ? 'dose' : 'dosi'} oggi. Considera di aggiornare l'orario dei promemoria.`;
  const eveningSkips = records.filter(
    (r) => r.action === 'skipped' && parseInt(r.timeSlot.split(':')[0], 10) >= 18,
  ).length;
  if (eveningSkips >= 3) return "Negli ultimi giorni hai saltato spesso le dosi serali. Considera di aggiornare l'orario.";
  const takenToday = records.filter((r) => r.date === today && r.action === 'taken').length;
  if (takenToday > 0) return 'Ottimo! Stai seguendo le terapie con regolarità. Continua così.';
  return null;
}

const SLOT_LABELS = { morning: '🌅 Mattina', afternoon: '☀️ Pomeriggio', evening: '🌙 Sera' } as const;
const MED_COLORS = ['#0DB09E', '#8B5CF6', '#F59E0B', '#3B82F6', '#EC4899', '#EF4444'];

function CheckAnim({ onDone }: { onDone: () => void }) {
  const scale = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.3, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
    ]).start(onDone);
  }, [scale, onDone]);
  return (
    <Animated.View
      style={{
        position: 'absolute',
        zIndex: 99,
        alignSelf: 'center',
        top: '42%',
        transform: [{ scale }],
      }}
    >
      <Ionicons name="checkmark-circle" size={80} color="#16A34A" />
    </Animated.View>
  );
}

export default function PianoSaluteScreen() {
  const { getToken } = useAuth();
  const reminders = useRemindersStore((s) => s.reminders);
  const loadReminders = useRemindersStore((s) => s.load);
  const addReminder = useRemindersStore((s) => s.add);
  const records = useDoseStore((s) => s.records);
  const logDose = useDoseStore((s) => s.logDose);
  const getWeekAdherence = useDoseStore((s) => s.getWeekAdherence);

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ name: '', dose: '', time: '08:00', days: '7', notes: '' });
  const [intDismissed, setIntDismissed] = useState(false);
  const [showCheck, setShowCheck] = useState(false);
  const adherenceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    void loadReminders(getToken);
  }, []);

  const medications = reminders.filter((r) => r.category === 'medication' && r.enabled);
  const today = todayKey();
  const todayRecs = records.filter((r) => r.date === today);
  const adherence = getWeekAdherence(medications.length);
  const interactions = detectInteractions(reminders);
  const aiInsight = buildAIInsight(records, medications.length);

  useEffect(() => {
    Animated.timing(adherenceAnim, {
      toValue: adherence,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [adherence]);

  const adherenceWidth = adherenceAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });
  const adherenceColor = adherence >= 80 ? '#16A34A' : adherence >= 50 ? '#F59E0B' : '#EF4444';

  const nowTime = (() => {
    const n = new Date();
    return `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`;
  })();
  const upcoming =
    medications
      .filter((r) => r.schedule.time)
      .sort((a, b) => (a.schedule.time! > b.schedule.time! ? 1 : -1))
      .find((r) => r.schedule.time! >= nowTime) ?? medications[0];

  const slotGroups = {
    morning: medications.filter((r) => r.schedule.time && getSlot(r.schedule.time) === 'morning'),
    afternoon: medications.filter((r) => r.schedule.time && getSlot(r.schedule.time) === 'afternoon'),
    evening: medications.filter((r) => r.schedule.time && getSlot(r.schedule.time) === 'evening'),
  };

  const handleDose = (rid: string, action: 'taken' | 'skipped' | 'postponed', time: string) => {
    logDose({ reminderId: rid, date: today, timeSlot: time, action });
    if (action === 'taken') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowCheck(true);
    } else {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    await addReminder(
      {
        category: 'medication',
        title: `${form.name.trim()}${form.dose ? ' ' + form.dose.trim() : ''}`,
        notes: form.notes,
        schedule: { kind: 'daily', time: form.time },
        enabled: true,
      },
      getToken,
    );
    setAddOpen(false);
    setForm({ name: '', dose: '', time: '08:00', days: '7', notes: '' });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['bottom']}>
      {showCheck && <CheckAnim onDone={() => setShowCheck(false)} />}

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Drug interaction warning */}
        {interactions.length > 0 && !intDismissed && (
          <View style={styles.interactionBox}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Text style={{ fontSize: 16 }}>⚠️</Text>
              <Text style={styles.interactionTitle}>Possibile interazione</Text>
              <Pressable onPress={() => setIntDismissed(true)} style={{ marginLeft: 'auto' }} hitSlop={8}>
                <Ionicons name="close" size={18} color="#92400E" />
              </Pressable>
            </View>
            {interactions.map((msg, i) => (
              <Text key={i} style={styles.interactionText}>• {msg}</Text>
            ))}
          </View>
        )}

        {/* 1. Hero — prossima dose */}
        {upcoming ? (
          <LinearGradient colors={['#0DB09E', '#5B7CFA']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            <Text style={styles.heroLabel}>💊 Terapia in corso</Text>
            <Text style={styles.heroMed}>{upcoming.title}</Text>
            <View style={styles.heroInfoRow}>
              <View style={styles.heroInfoPill}>
                <Ionicons name="time-outline" size={13} color="rgba(255,255,255,0.9)" />
                <Text style={styles.heroInfoText}>Prossima dose: oggi {upcoming.schedule.time ?? '--:--'}</Text>
              </View>
            </View>
            <View style={styles.heroBtnRow}>
              <Pressable style={[styles.heroBtn, styles.heroBtnTaken]} onPress={() => handleDose(upcoming.id, 'taken', upcoming.schedule.time ?? '')}>
                <Ionicons name="checkmark" size={14} color="#0DB09E" />
                <Text style={[styles.heroBtnTxt, { color: '#0DB09E' }]}>Presa</Text>
              </Pressable>
              <Pressable style={[styles.heroBtn, styles.heroBtnOutline]} onPress={() => handleDose(upcoming.id, 'skipped', upcoming.schedule.time ?? '')}>
                <Ionicons name="close" size={14} color="rgba(255,255,255,0.9)" />
                <Text style={[styles.heroBtnTxt, { color: 'rgba(255,255,255,0.9)' }]}>Salta</Text>
              </Pressable>
              <Pressable style={[styles.heroBtn, styles.heroBtnOutline]} onPress={() => handleDose(upcoming.id, 'postponed', upcoming.schedule.time ?? '')}>
                <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.9)" />
                <Text style={[styles.heroBtnTxt, { color: 'rgba(255,255,255,0.9)' }]}>Rimanda</Text>
              </Pressable>
            </View>
          </LinearGradient>
        ) : (
          <View style={styles.heroEmpty}>
            <Text style={{ fontSize: 36 }}>✅</Text>
            <Text style={styles.heroEmptyTitle}>Nessuna dose in attesa</Text>
            <Text style={styles.heroEmptySubtitle}>Hai completato tutti i farmaci previsti.</Text>
          </View>
        )}

        {/* 4. Aderenza */}
        {medications.length > 0 && (
          <View style={styles.adherenceCard}>
            <View style={styles.adherenceTop}>
              <Text style={{ fontSize: 18 }}>📈</Text>
              <Text style={styles.adherenceLabel}>Aderenza</Text>
              <Text style={[styles.adherencePct, { color: adherenceColor }]}>{adherence}%</Text>
            </View>
            <Text style={styles.adherenceSub}>terapie seguite questa settimana</Text>
            <View style={styles.adherenceTrack}>
              <Animated.View style={[styles.adherenceFill, { width: adherenceWidth, backgroundColor: adherenceColor }]} />
            </View>
          </View>
        )}

        {/* 2. Farmaci attivi */}
        {medications.length > 0 && (
          <View style={{ marginTop: 22 }}>
            <Text style={styles.sectionTitle}>Farmaci attivi</Text>
            <View style={{ height: 10 }} />
            {medications.map((r, idx) => {
              const color = MED_COLORS[idx % MED_COLORS.length];
              const rec = todayRecs.find((x) => x.reminderId === r.id);
              return (
                <View key={r.id} style={styles.medCard}>
                  <View style={[styles.medDot, { backgroundColor: color }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.medName}>{r.title}</Text>
                    <Text style={styles.medMeta}>
                      {r.schedule.kind === 'daily' ? 'Ogni giorno' : r.schedule.kind}
                      {r.schedule.time ? ` · ${r.schedule.time}` : ''}
                    </Text>
                  </View>
                  {rec && (
                    <View style={[styles.medBadge, {
                      backgroundColor: rec.action === 'taken' ? '#DCFCE7' : rec.action === 'skipped' ? '#FEE2E2' : '#FEF9C3',
                    }]}>
                      <Text style={[styles.medBadgeTxt, {
                        color: rec.action === 'taken' ? '#16A34A' : rec.action === 'skipped' ? '#DC2626' : '#CA8A04',
                      }]}>
                        {rec.action === 'taken' ? 'Presa ✓' : rec.action === 'skipped' ? 'Saltata' : 'Rimandata'}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* 3. Timeline giornaliera */}
        {medications.length > 0 && (
          <View style={{ marginTop: 22 }}>
            <Text style={styles.sectionTitle}>Oggi</Text>
            <View style={styles.timelineCard}>
              {(['morning', 'afternoon', 'evening'] as const).map((slot) => {
                const meds = slotGroups[slot];
                if (meds.length === 0) return null;
                return (
                  <View key={slot} style={styles.timelineSlot}>
                    <Text style={styles.timelineSlotLabel}>{SLOT_LABELS[slot]}</Text>
                    {meds.map((r, i) => {
                      const rec = todayRecs.find((x) => x.reminderId === r.id);
                      return (
                        <View key={r.id} style={[styles.timelineRow, i < meds.length - 1 && styles.timelineRowBorder]}>
                          <Text style={styles.timelineTime}>{r.schedule.time}</Text>
                          <View style={styles.timelineDot} />
                          <Text style={styles.timelineName}>{r.title}</Text>
                          <Pressable onPress={() => !rec && handleDose(r.id, 'taken', r.schedule.time ?? '')} hitSlop={8}>
                            <Ionicons
                              name={!rec ? 'ellipse-outline' : rec.action === 'taken' ? 'checkmark-circle' : rec.action === 'skipped' ? 'close-circle' : 'time'}
                              size={24}
                              color={!rec ? '#D1D5DB' : rec.action === 'taken' ? '#16A34A' : rec.action === 'skipped' ? '#EF4444' : '#F59E0B'}
                            />
                          </Pressable>
                        </View>
                      );
                    })}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* 5. AI Insight */}
        {aiInsight && (
          <View style={{ marginTop: 22 }}>
            <Text style={styles.sectionTitle}>Insight AI</Text>
            <View style={{ height: 10 }} />
            <View style={styles.insightBox}>
              <Text style={{ fontSize: 22 }}>🧠</Text>
              <Text style={styles.insightText}>{aiInsight}</Text>
            </View>
          </View>
        )}

        {/* Empty state */}
        {medications.length === 0 && (
          <View style={styles.emptyBox}>
            <Text style={{ fontSize: 44 }}>💊</Text>
            <Text style={styles.emptyTitle}>Nessun farmaco attivo</Text>
            <Text style={styles.emptyText}>
              Aggiungi il tuo primo farmaco per iniziare a tracciare terapie e dosi quotidiane.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      <Pressable style={styles.fab} onPress={() => setAddOpen(true)}>
        <Ionicons name="add" size={22} color="#fff" />
        <Text style={styles.fabTxt}>Aggiungi farmaco</Text>
      </Pressable>

      {/* Add medication modal */}
      <Modal visible={addOpen} transparent animationType="slide" onRequestClose={() => setAddOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <Pressable style={styles.backdrop} onPress={() => setAddOpen(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Nuovo farmaco</Text>

            <Text style={styles.fieldLabel}>Nome farmaco *</Text>
            <TextInput style={styles.input} placeholder="Es: Ibuprofene" value={form.name}
              onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} />

            <Text style={styles.fieldLabel}>Dose</Text>
            <TextInput style={styles.input} placeholder="Es: 400mg" value={form.dose}
              onChangeText={(v) => setForm((f) => ({ ...f, dose: v }))} />

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Orario</Text>
                <TextInput style={styles.input} placeholder="08:00" value={form.time}
                  onChangeText={(v) => setForm((f) => ({ ...f, time: v }))} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Durata (giorni)</Text>
                <TextInput style={styles.input} placeholder="7" keyboardType="numeric" value={form.days}
                  onChangeText={(v) => setForm((f) => ({ ...f, days: v }))} />
              </View>
            </View>

            <Text style={styles.fieldLabel}>Note</Text>
            <TextInput style={[styles.input, { height: 72 }]} placeholder="Note aggiuntive..."
              multiline value={form.notes} onChangeText={(v) => setForm((f) => ({ ...f, notes: v }))} />

            <Pressable style={[styles.sheetBtn, !form.name.trim() && { opacity: 0.45 }]}
              onPress={handleAdd} disabled={!form.name.trim()}>
              <Text style={styles.sheetBtnTxt}>Salva farmaco</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  interactionBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: radii.md,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 12,
  },
  interactionTitle: { fontSize: 14, fontWeight: '700', color: '#92400E', flex: 1 },
  interactionText: { fontSize: 13, color: '#92400E', marginTop: 3, lineHeight: 18 },

  hero: {
    borderRadius: 22,
    padding: 20,
    shadowColor: '#0DB09E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 6,
  },
  heroLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600' },
  heroMed: { color: '#fff', fontSize: 24, fontWeight: '800', marginTop: 6 },
  heroInfoRow: { flexDirection: 'row', marginTop: 12 },
  heroInfoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  heroInfoText: { color: 'rgba(255,255,255,0.9)', fontSize: 12 },
  heroBtnRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  heroBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 14, gap: 5 },
  heroBtnTaken: { backgroundColor: '#fff' },
  heroBtnOutline: { backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  heroBtnTxt: { fontSize: 13, fontWeight: '700' },

  heroEmpty: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  heroEmptyTitle: { fontSize: 17, fontWeight: '700', color: colors.ink, marginTop: 4 },
  heroEmptySubtitle: { fontSize: 13, color: colors.muted, textAlign: 'center' },

  adherenceCard: {
    marginTop: 12,
    backgroundColor: '#fff',
    borderRadius: radii.md,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  adherenceTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  adherenceLabel: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.ink },
  adherencePct: { fontSize: 20, fontWeight: '800' },
  adherenceSub: { fontSize: 12, color: colors.muted, marginTop: 2, marginBottom: 10 },
  adherenceTrack: { height: 8, borderRadius: 4, backgroundColor: '#F3F4F6', overflow: 'hidden' },
  adherenceFill: { height: 8, borderRadius: 4 },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.ink },

  medCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: radii.md,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  medDot: { width: 10, height: 10, borderRadius: 5 },
  medName: { fontSize: 15, fontWeight: '700', color: colors.ink },
  medMeta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  medBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  medBadgeTxt: { fontSize: 12, fontWeight: '700' },

  timelineCard: {
    backgroundColor: '#fff',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginTop: 10,
  },
  timelineSlot: { paddingHorizontal: 14 },
  timelineSlotLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.muted,
    paddingTop: 12,
    paddingBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  timelineRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  timelineRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  timelineTime: { fontSize: 13, fontWeight: '700', color: colors.muted, width: 46 },
  timelineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary },
  timelineName: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.ink },

  insightBox: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: radii.md,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'flex-start',
  },
  insightText: { flex: 1, fontSize: 14, color: colors.ink, lineHeight: 20 },

  emptyBox: {
    marginTop: 24,
    backgroundColor: '#fff',
    borderRadius: radii.lg,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: colors.ink, marginTop: 4 },
  emptyText: { fontSize: 13, color: colors.muted, textAlign: 'center', lineHeight: 19 },

  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
    gap: 6,
  },
  fabTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
  },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', alignSelf: 'center', marginBottom: 18 },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: colors.ink, marginBottom: 18 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.muted, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: '#F5F7FA',
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.ink,
  },
  sheetBtn: {
    marginTop: 22,
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    paddingVertical: 15,
    alignItems: 'center',
  },
  sheetBtnTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
