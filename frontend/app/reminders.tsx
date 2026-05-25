import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Alert,
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
import { DateWheelModal } from '../src/components/DateWheelModal';
import { MemberPickerModal } from '../src/components/MemberPickerModal';
import { MemberSwitcher } from '../src/components/MemberSwitcher';
import { useAuth } from '../src/context/AuthContext';
import { useMemberPicker } from '../src/hooks/useMemberPicker';
import { useDoseStore } from '../src/store/doses';
import type { DoseAction } from '../src/store/doses';
import { useMembersStore } from '../src/store/members';
import { useRemindersStore } from '../src/store/reminders';
import { colors, radii } from '../src/theme';
import type { Reminder } from '../src/types';

// ─── Member filtering ─────────────────────────────────────────────────────────
function belongsTo(entryMemberId: string | undefined, activeId: string | null, isDefaultFn: (id: string | null) => boolean): boolean {
  if (!activeId) return true;
  if (entryMemberId && entryMemberId === activeId) return true;
  if (!entryMemberId && isDefaultFn(activeId)) return true;
  return false;
}

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

function calcTimes(firstTime: string, freq: '8h' | '12h' | '24h'): string[] {
  const [h, m] = firstTime.split(':').map(Number);
  const interval = freq === '8h' ? 8 : freq === '12h' ? 12 : 24;
  const count = 24 / interval;
  return Array.from({ length: count }, (_, i) => {
    const totalMins = (h * 60 + m + i * interval * 60) % (24 * 60);
    const th = Math.floor(totalMins / 60);
    const tm = totalMins % 60;
    return `${String(th).padStart(2, '0')}:${String(tm).padStart(2, '0')}`;
  });
}

const SLOT_LABELS = { morning: '🌅 Mattina', afternoon: '☀️ Pomeriggio', evening: '🌙 Sera' } as const;
const MED_COLORS = ['#0DB09E', '#8B5CF6', '#F59E0B', '#3B82F6', '#EC4899', '#EF4444'];

const ITEM_H = 52;
const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

function WheelPicker({
  items,
  scrollRef,
  onIndexChange,
}: {
  items: string[];
  scrollRef: { current: ScrollView | null };
  onIndexChange: (i: number) => void;
}) {
  const handleEnd = (e: { nativeEvent: { contentOffset: { y: number } } }) => {
    const i = Math.round(e.nativeEvent.contentOffset.y / ITEM_H);
    onIndexChange(Math.max(0, Math.min(items.length - 1, i)));
  };
  return (
    <View style={{ height: ITEM_H * 3, width: 80, overflow: 'hidden' }}>
      <View style={wheelStyles.highlight} />
      <ScrollView
        ref={scrollRef as React.RefObject<ScrollView>}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        nestedScrollEnabled
        contentContainerStyle={{ paddingVertical: ITEM_H }}
        onMomentumScrollEnd={handleEnd}
        onScrollEndDrag={handleEnd}
      >
        {items.map((item, i) => (
          <View key={i} style={{ height: ITEM_H, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={wheelStyles.item}>{item}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const wheelStyles = StyleSheet.create({
  highlight: {
    position: 'absolute',
    top: ITEM_H,
    left: 4,
    right: 4,
    height: ITEM_H,
    backgroundColor: '#E6FAF8',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  item: { fontSize: 34, fontWeight: '800', color: colors.ink },
});
const FREQ_OPTIONS: { value: '8h' | '12h' | '24h'; label: string; sublabel: string }[] = [
  { value: '24h', label: '1x/giorno', sublabel: 'ogni 24h' },
  { value: '12h', label: '2x/giorno', sublabel: 'ogni 12h' },
  { value: '8h', label: '3x/giorno', sublabel: 'ogni 8h' },
];

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

type FormState = {
  name: string;
  dose: string;
  time: string;
  frequency: '8h' | '12h' | '24h';
  days: string;
  notes: string;
  startDate: string;
};

export default function PianoSaluteScreen() {
  const { getToken } = useAuth();
  const reminders = useRemindersStore((s) => s.reminders);
  const loadReminders = useRemindersStore((s) => s.load);
  const addReminder = useRemindersStore((s) => s.add);
  const removeReminder = useRemindersStore((s) => s.remove);
  const updateReminder = useRemindersStore((s) => s.update);
  const activeHumanId = useMembersStore((s) => s.activeHumanId);
  const isDefault = useMembersStore((s) => s.isDefault);
  const isDefaultHuman = (id: string | null) => isDefault('human', id);
  const { pickMember, modalProps: memberPickerProps } = useMemberPicker('human');
  const records = useDoseStore((s) => s.records);
  const logDose = useDoseStore((s) => s.logDose);
  const getWeekAdherence = useDoseStore((s) => s.getWeekAdherence);

  const [addOpen, setAddOpen] = useState(false);
  const [oggiExpanded, setOggiExpanded] = useState(true);
  const [selectedReminderId, setSelectedReminderId] = useState<string | null>(null);
  const [postponeOpen, setPostponeOpen] = useState(false);
  const [postponeId, setPostponeId] = useState<string | null>(null);
  const [postponeDate, setPostponeDate] = useState('');
  const [form, setForm] = useState<FormState>({ name: '', dose: '', time: '08:00', frequency: '24h', days: '7', notes: '', startDate: new Date().toISOString().slice(0,10) });
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [pickH, setPickH] = useState(8);
  const [pickM, setPickM] = useState(0);
  const [intDismissed, setIntDismissed] = useState(false);
  const hourRef = useRef<ScrollView>(null);
  const minRef = useRef<ScrollView>(null);
  const initH = useRef(8);
  const initM = useRef(0);
  const [showCheck, setShowCheck] = useState(false);
  const adherenceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    void loadReminders(getToken);
  }, []);

  const filteredReminders = reminders.filter((r) => belongsTo(r.memberId, activeHumanId, isDefaultHuman));
  const medications = filteredReminders.filter((r) => r.category === 'medication' && r.enabled);
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

  // Group medications by unique title for the "Farmaci attivi" card
  const uniqueTitles = [...new Set(medications.map((r) => r.title))];
  const medGroups = uniqueTitles.map((title) => ({
    title,
    times: medications
      .filter((r) => r.title === title && r.schedule.time)
      .map((r) => r.schedule.time!)
      .sort(),
    reminders: medications.filter((r) => r.title === title),
  }));

  const slotGroups = {
    morning: medications.filter((r) => r.schedule.time && getSlot(r.schedule.time) === 'morning'),
    afternoon: medications.filter((r) => r.schedule.time && getSlot(r.schedule.time) === 'afternoon'),
    evening: medications.filter((r) => r.schedule.time && getSlot(r.schedule.time) === 'evening'),
  };

  const handleDose = (rid: string, action: DoseAction, time: string) => {
    logDose({ reminderId: rid, date: today, timeSlot: time, action });
    if (action === 'taken') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowCheck(true);
    } else {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };


  useEffect(() => {
    if (!showTimePicker) return;
    const timer = setTimeout(() => {
      hourRef.current?.scrollTo({ y: initH.current * ITEM_H, animated: false });
      minRef.current?.scrollTo({ y: Math.floor(initM.current / 5) * ITEM_H, animated: false });
    }, 80);
    return () => clearTimeout(timer);
  }, [showTimePicker]);

  const openTimePicker = () => {
    const [h, m] = form.time.split(':').map(Number);
    const roundedM = m - (m % 5);
    initH.current = h;
    initM.current = roundedM;
    setPickH(h);
    setPickM(roundedM);
    setShowTimePicker(true);
  };

  const confirmTimePicker = () => {
    const t = `${String(pickH).padStart(2, '0')}:${String(pickM).padStart(2, '0')}`;
    setForm((f) => ({ ...f, time: t }));
    setShowTimePicker(false);
  };

  const previewTimes = calcTimes(form.time, form.frequency);

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    const picked = await pickMember();
    if (picked.prompted && picked.id === null) return;
    const title = `${form.name.trim()}${form.dose ? ' ' + form.dose.trim() : ''}`;
    const freqLabel = form.frequency === '8h' ? 'ogni 8h' : form.frequency === '12h' ? 'ogni 12h' : 'ogni 24h';
    const times = calcTimes(form.time, form.frequency);
    const today = new Date().toISOString().slice(0, 10);
    const startDate = form.startDate || today;
    for (const t of times) {
      await addReminder(
        {
          category: 'medication',
          title,
          notes: `${freqLabel}${form.notes ? '\n' + form.notes : ''}`,
          schedule: { kind: 'daily', time: t, date: startDate },
          enabled: true,
          memberId: picked.id ?? undefined,
        },
        getToken,
      );
    }
    setAddOpen(false);
    setForm({ name: '', dose: '', time: '08:00', frequency: '24h', days: '7', notes: '', startDate: new Date().toISOString().slice(0,10) });
  };

  const handleDeleteMed = (title: string, ids: string[]) => {
    Alert.alert('Elimina farmaco', `Vuoi eliminare "${title}" dal Piano Salute?`, [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Elimina',
        style: 'destructive',
        onPress: async () => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          for (const id of ids) {
            await removeReminder(id, getToken);
          }
        },
      },
    ]);
  };

  const confirmPostpone = async (date: string) => {
    if (!postponeId) return;
    await updateReminder(postponeId, { status: 'postponed', postponedUntil: date }, getToken);
    setPostponeOpen(false);
    setPostponeId(null);
  };

  const heroMed = selectedReminderId ? medications.find((r) => r.id === selectedReminderId) ?? upcoming : upcoming;
  const upcomingRec = heroMed ? todayRecs.find((x) => x.reminderId === heroMed.id) : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['bottom']}>
      {showCheck && <CheckAnim onDone={() => setShowCheck(false)} />}

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 90 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 10 }}>
          <MemberSwitcher kind="human" accent={colors.primary} variant="compact" />
        </View>
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
        {heroMed ? (
          <LinearGradient colors={['#0DB09E', '#5B7CFA']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            {upcomingRec && (
              <View style={styles.heroStateBadge}>
                <Text style={styles.heroStateTxt}>
                  {upcomingRec.action === 'taken' ? '✓ Presa' : upcomingRec.action === 'skipped' ? '✗ Saltata' : '⏱ Rimandata'}
                </Text>
              </View>
            )}
            <Text style={styles.heroLabel}>💊 Terapia in corso</Text>
            <Text style={styles.heroMed}>{heroMed.title}</Text>
            <View style={styles.heroInfoRow}>
              <View style={styles.heroInfoPill}>
                <Ionicons name="time-outline" size={13} color="rgba(255,255,255,0.9)" />
                <Text style={styles.heroInfoText}>Prossima dose: {heroMed.schedule.time ?? '--:--'}</Text>
              </View>
            </View>
            <View style={styles.heroBtnRow}>
              {(() => {
                const taken = upcomingRec?.action === 'taken';
                const skipped = upcomingRec?.action === 'skipped';
                const postponed = upcomingRec?.action === 'postponed';
                return (
                  <>
                    <Pressable
                      style={[styles.heroBtn, taken ? styles.heroBtnTakenActive : styles.heroBtnTaken]}
                      onPress={() => handleDose(heroMed.id, 'taken', heroMed.schedule.time ?? '')}
                    >
                      <Ionicons name="checkmark" size={14} color={taken ? '#fff' : '#0DB09E'} />
                      <Text style={[styles.heroBtnTxt, { color: taken ? '#fff' : '#0DB09E' }]}>Presa</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.heroBtn, skipped ? styles.heroBtnSkippedActive : styles.heroBtnOutline]}
                      onPress={() => handleDose(heroMed.id, 'skipped', heroMed.schedule.time ?? '')}
                    >
                      <Ionicons name="close" size={14} color="#fff" />
                      <Text style={[styles.heroBtnTxt, { color: '#fff' }]}>{skipped ? 'Saltata' : 'Salta'}</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.heroBtn, postponed ? styles.heroBtnPostponedActive : styles.heroBtnOutline]}
                      onPress={() => handleDose(heroMed.id, 'postponed', heroMed.schedule.time ?? '')}
                    >
                      <Ionicons name="time-outline" size={14} color="#fff" />
                      <Text style={[styles.heroBtnTxt, { color: '#fff' }]}>{postponed ? 'Rimandata' : 'Rimanda'}</Text>
                    </Pressable>
                  </>
                );
              })()}
            </View>
          </LinearGradient>
        ) : (
          <View style={styles.heroEmpty}>
            <Text style={{ fontSize: 32 }}>✅</Text>
            <Text style={styles.heroEmptyTitle}>Nessuna dose in attesa</Text>
            <Text style={styles.heroEmptySubtitle}>Hai completato tutti i farmaci previsti.</Text>
          </View>
        )}

        {/* Adherence */}
        {medications.length > 0 && (
          <View style={styles.adherenceCard}>
            <View style={styles.adherenceTop}>
              <Text style={{ fontSize: 16 }}>📈</Text>
              <Text style={styles.adherenceLabel}>Aderenza settimanale</Text>
              <Text style={[styles.adherencePct, { color: adherenceColor }]}>{adherence}%</Text>
            </View>
            <View style={styles.adherenceTrack}>
              <Animated.View style={[styles.adherenceFill, { width: adherenceWidth, backgroundColor: adherenceColor }]} />
            </View>
          </View>
        )}

        {/* Farmaci attivi */}
        {medGroups.length > 0 && (
          <View style={{ marginTop: 14 }}>
            <Text style={styles.sectionTitle}>Farmaci attivi</Text>
            <View style={{ height: 8 }} />
            {medGroups.map((group, idx) => {
              const color = MED_COLORS[idx % MED_COLORS.length];
              const todayRecForGroup = todayRecs.find((x) => group.reminders.some((r) => r.id === x.reminderId));
              return (
                <View key={group.title} style={{ marginBottom: 6 }}>
                  <View style={[styles.medCard, { marginBottom: 0 }]}>
                    <View style={[styles.medDot, { backgroundColor: color }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.medName}>{group.title}</Text>
                      <Text style={styles.medMeta}>
                        {group.times.length > 1 ? `${group.times.length}x/giorno · ` : 'Ogni giorno · '}
                        {group.times.join(', ')}
                      </Text>
                    </View>
                    {todayRecForGroup && (
                      <View style={[styles.medBadge, {
                        backgroundColor: todayRecForGroup.action === 'taken' ? '#DCFCE7' : todayRecForGroup.action === 'skipped' ? '#FEE2E2' : '#FEF9C3',
                      }]}>
                        <Text style={[styles.medBadgeTxt, {
                          color: todayRecForGroup.action === 'taken' ? '#16A34A' : todayRecForGroup.action === 'skipped' ? '#DC2626' : '#CA8A04',
                        }]}>
                          {todayRecForGroup.action === 'taken' ? 'Presa ✓' : todayRecForGroup.action === 'skipped' ? 'Saltata' : 'Rimandata'}
                        </Text>
                      </View>
                    )}
                    <Pressable
                      onPress={() => handleDeleteMed(group.title, group.reminders.map((r) => r.id))}
                      hitSlop={8}
                      style={styles.medDelete}
                    >
                      <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Timeline giornaliera */}
        {medications.length > 0 && (
          <View style={{ marginTop: 14 }}>
            <Pressable onPress={() => setOggiExpanded(v => !v)} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <Text style={styles.sectionTitle}>Oggi</Text>
              <Ionicons name={oggiExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} style={{ marginLeft: 8 }} />
            </Pressable>
            {oggiExpanded && (
              <View style={styles.timelineCard}>
                {(['morning', 'afternoon', 'evening'] as const).map((slot) => {
                  const meds = slotGroups[slot];
                  if (meds.length === 0) return null;
                  return (
                    <View key={slot} style={styles.timelineSlot}>
                      <Text style={styles.timelineSlotLabel}>{SLOT_LABELS[slot]}</Text>
                      {meds.map((r, i) => {
                        return (
                          <View key={r.id} style={[styles.timelineRow, i < meds.length - 1 && styles.timelineRowBorder]}>
                            <Text style={styles.timelineTime}>{r.schedule.time}</Text>
                            <View style={styles.timelineDot} />
                            <Text style={styles.timelineName}>{r.title}</Text>
                            <Pressable
                              onPress={() => { void Haptics.selectionAsync(); setSelectedReminderId(r.id); }}
                              hitSlop={8}
                            >
                              <View style={{
                                width: 24, height: 24, borderRadius: 12,
                                borderWidth: 2,
                                borderColor: selectedReminderId === r.id ? '#0DB09E' : '#D1D5DB',
                                backgroundColor: selectedReminderId === r.id ? '#0DB09E' : 'transparent',
                                alignItems: 'center', justifyContent: 'center',
                              }}>
                                {selectedReminderId === r.id && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' }} />}
                              </View>
                            </Pressable>
                          </View>
                        );
                      })}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* AI Insight */}
        {aiInsight && (
          <View style={styles.insightBox}>
            <Text style={{ fontSize: 20 }}>🧠</Text>
            <Text style={styles.insightText}>{aiInsight}</Text>
          </View>
        )}

        {/* Empty state */}
        {medications.length === 0 && (
          <View style={styles.emptyBox}>
            <Text style={{ fontSize: 40 }}>💊</Text>
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

      {/* Time picker modal */}
      <Modal visible={showTimePicker} transparent animationType="fade" onRequestClose={() => setShowTimePicker(false)}>
        <View style={styles.timePickerBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowTimePicker(false)} />
          <View style={styles.timePickerCard}>
            <Text style={styles.timePickerTitle}>Scegli orario</Text>
            <View style={styles.timePickerRow}>
              <WheelPicker
                items={HOURS}
                scrollRef={hourRef}
                onIndexChange={setPickH}
              />
              <Text style={styles.timePickerColon}>:</Text>
              <WheelPicker
                items={MINUTES}
                scrollRef={minRef}
                onIndexChange={(i) => setPickM(i * 5)}
              />
            </View>
            <Pressable style={styles.timePickerBtn} onPress={confirmTimePicker}>
              <Text style={styles.timePickerBtnTxt}>Conferma</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

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

            {/* Frequenza */}
            <Text style={styles.fieldLabel}>Frequenza</Text>
            <View style={styles.freqRow}>
              {FREQ_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  style={[styles.freqChip, form.frequency === opt.value && styles.freqChipActive]}
                  onPress={() => setForm((f) => ({ ...f, frequency: opt.value }))}
                >
                  <Text style={[styles.freqChipLabel, form.frequency === opt.value && styles.freqChipLabelActive]}>
                    {opt.label}
                  </Text>
                  <Text style={[styles.freqChipSub, form.frequency === opt.value && styles.freqChipSubActive]}>
                    {opt.sublabel}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Data inizio */}
            <Text style={styles.fieldLabel}>Data inizio</Text>
            <Pressable style={styles.timeBtn} onPress={() => setShowStartDatePicker(true)}>
              <Ionicons name="calendar-outline" size={18} color={colors.primary} />
              <Text style={styles.timeBtnTxt}>{(() => {
                const [y, m, d] = form.startDate.split('-');
                const months = ['GEN','FEB','MAR','APR','MAG','GIU','LUG','AGO','SET','OTT','NOV','DIC'];
                return `${d} ${months[Number(m)-1]} ${y}`;
              })()}</Text>
              <Ionicons name="chevron-down" size={16} color={colors.muted} style={{ marginLeft: 'auto' }} />
            </Pressable>

            {/* Orario — clock popup */}
            <Text style={styles.fieldLabel}>Primo orario</Text>
            <Pressable style={styles.timeBtn} onPress={openTimePicker}>
              <Ionicons name="time-outline" size={18} color={colors.primary} />
              <Text style={styles.timeBtnTxt}>{form.time}</Text>
              <Ionicons name="chevron-down" size={16} color={colors.muted} style={{ marginLeft: 'auto' }} />
            </Pressable>

            {/* Preview times */}
            {previewTimes.length > 1 && (
              <View style={styles.previewBox}>
                <Text style={styles.previewLabel}>Orari calcolati automaticamente:</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                  {previewTimes.map((t) => (
                    <View key={t} style={styles.previewPill}>
                      <Text style={styles.previewPillTxt}>{t}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <Text style={styles.fieldLabel}>Note</Text>
            <TextInput style={[styles.input, { height: 64 }]} placeholder="Note aggiuntive..."
              multiline value={form.notes} onChangeText={(v) => setForm((f) => ({ ...f, notes: v }))} />

            <Pressable style={[styles.sheetBtn, !form.name.trim() && { opacity: 0.45 }]}
              onPress={handleAdd} disabled={!form.name.trim()}>
              <Text style={styles.sheetBtnTxt}>Salva farmaco</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <DateWheelModal
        visible={showStartDatePicker}
        value={form.startDate}
        onConfirm={(date) => { setForm((f) => ({ ...f, startDate: date })); setShowStartDatePicker(false); }}
        onClose={() => setShowStartDatePicker(false)}
        accent={colors.primary}
        title="Data inizio terapia"
      />

      <DateWheelModal
        visible={postponeOpen}
        value={postponeDate}
        onConfirm={(date) => { setPostponeDate(date); void confirmPostpone(date); }}
        onClose={() => setPostponeOpen(false)}
        accent="#F59E0B"
        title="Riprogramma appuntamento"
      />

      <MemberPickerModal {...memberPickerProps} accent={colors.primary} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  interactionBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: radii.md,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 10,
  },
  interactionTitle: { fontSize: 13, fontWeight: '700', color: '#92400E', flex: 1 },
  interactionText: { fontSize: 12, color: '#92400E', marginTop: 3, lineHeight: 17 },

  hero: {
    borderRadius: 20,
    padding: 16,
    shadowColor: '#0DB09E',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },
  heroStateBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 8,
  },
  heroStateTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },
  heroLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '600' },
  heroMed: { color: '#fff', fontSize: 20, fontWeight: '800', marginTop: 4 },
  heroInfoRow: { flexDirection: 'row', marginTop: 8 },
  heroInfoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  heroInfoText: { color: 'rgba(255,255,255,0.9)', fontSize: 12 },
  heroBtnRow: { flexDirection: 'row', gap: 6, marginTop: 12 },
  heroBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 9, borderRadius: 12, gap: 4 },
  heroBtnTaken: { backgroundColor: '#fff' },
  heroBtnTakenActive: { backgroundColor: '#16A34A' },
  heroBtnOutline: { backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)' },
  heroBtnSkippedActive: { backgroundColor: '#EF4444' },
  heroBtnPostponedActive: { backgroundColor: '#F59E0B' },
  heroBtnTxt: { fontSize: 12, fontWeight: '700' },

  heroEmpty: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  heroEmptyTitle: { fontSize: 16, fontWeight: '700', color: colors.ink, marginTop: 4 },
  heroEmptySubtitle: { fontSize: 12, color: colors.muted, textAlign: 'center' },

  adherenceCard: {
    marginTop: 8,
    backgroundColor: '#fff',
    borderRadius: radii.md,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  adherenceTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  adherenceLabel: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.ink },
  adherencePct: { fontSize: 18, fontWeight: '800' },
  adherenceTrack: { height: 7, borderRadius: 4, backgroundColor: '#F3F4F6', overflow: 'hidden' },
  adherenceFill: { height: 7, borderRadius: 4 },

  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.ink },

  medCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: radii.md,
    padding: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  medDot: { width: 9, height: 9, borderRadius: 5 },
  medName: { fontSize: 14, fontWeight: '700', color: colors.ink },
  medMeta: { fontSize: 11, color: colors.muted, marginTop: 2 },
  medBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20 },
  medBadgeTxt: { fontSize: 11, fontWeight: '700' },
  medDelete: { padding: 2 },

  timelineCard: {
    backgroundColor: '#fff',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginTop: 8,
  },
  timelineSlot: { paddingHorizontal: 12 },
  timelineSlotLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.muted,
    paddingTop: 10,
    paddingBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  timelineRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 },
  timelineRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  timelineTime: { fontSize: 12, fontWeight: '700', color: colors.muted, width: 42 },
  timelineDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.primary },
  timelineName: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.ink },

  insightBox: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: radii.md,
    padding: 13,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'flex-start',
    marginTop: 12,
  },
  insightText: { flex: 1, fontSize: 13, color: colors.ink, lineHeight: 19 },

  emptyBox: {
    marginTop: 20,
    backgroundColor: '#fff',
    borderRadius: radii.lg,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.ink, marginTop: 4 },
  emptyText: { fontSize: 13, color: colors.muted, textAlign: 'center', lineHeight: 19 },

  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
    gap: 6,
  },
  fabTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // Time picker
  timePickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  timePickerCard: {
    backgroundColor: '#fff',
    borderRadius: radii.lg,
    padding: 28,
    width: '100%',
    alignItems: 'center',
  },
  timePickerTitle: { fontSize: 18, fontWeight: '800', color: colors.ink, marginBottom: 24 },
  timePickerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timePickerColon: { fontSize: 40, fontWeight: '800', color: colors.muted },
  timePickerBtn: {
    marginTop: 28,
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    paddingVertical: 13,
    paddingHorizontal: 40,
  },
  timePickerBtnTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },

  // Add form
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 22,
    paddingBottom: 36,
  },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 19, fontWeight: '800', color: colors.ink, marginBottom: 14 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: colors.muted, marginBottom: 5, marginTop: 10 },
  input: {
    backgroundColor: '#F5F7FA',
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 13,
    paddingVertical: 11,
    fontSize: 14,
    color: colors.ink,
  },

  freqRow: { flexDirection: 'row', gap: 8 },
  freqChip: {
    flex: 1,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: '#F5F7FA',
    paddingVertical: 10,
    alignItems: 'center',
  },
  freqChipActive: { borderColor: colors.primary, backgroundColor: '#E6FAF8' },
  freqChipLabel: { fontSize: 13, fontWeight: '700', color: colors.muted },
  freqChipLabelActive: { color: colors.primary },
  freqChipSub: { fontSize: 10, color: colors.muted, marginTop: 2 },
  freqChipSubActive: { color: colors.primary },

  timeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F5F7FA',
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  timeBtnTxt: { fontSize: 18, fontWeight: '800', color: colors.ink },

  previewBox: {
    marginTop: 8,
    backgroundColor: '#F0FDF4',
    borderRadius: radii.sm,
    padding: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  previewLabel: { fontSize: 11, fontWeight: '600', color: '#16A34A' },
  previewPill: { backgroundColor: '#DCFCE7', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  previewPillTxt: { fontSize: 13, fontWeight: '700', color: '#16A34A' },

  sheetBtn: {
    marginTop: 18,
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    paddingVertical: 14,
    alignItems: 'center',
  },
  sheetBtnTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },

  statusRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    borderBottomLeftRadius: radii.md,
    borderBottomRightRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    marginTop: -1,
  },
  statusPill: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  statusPillTxt: { fontSize: 11, fontWeight: '700' },
  postponedUntilTxt: {
    fontSize: 11,
    color: colors.muted,
    paddingHorizontal: 12,
    paddingBottom: 4,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: colors.border,
    borderBottomLeftRadius: radii.md,
    borderBottomRightRadius: radii.md,
    marginTop: -1,
    paddingTop: 4,
  },
});
