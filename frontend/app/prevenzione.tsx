import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
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
import { SectionChatModal } from '../src/components/SectionChatModal';
import { useProfileStore } from '../src/store/profile';
import {
  type Antiparasitic,
  type PreventiveCheck,
  type Vaccine,
  usePreventionStore,
} from '../src/store/prevention';

const ACCENT = '#5B7CFA';
const ACCENT_LIGHT = '#EEF2FF';
const GREEN = '#10B981';
const GREEN_LIGHT = '#ECFDF5';
const ORANGE = '#F59E0B';
const ORANGE_LIGHT = '#FFFBEB';
const RED = '#EF4444';
const RED_LIGHT = '#FEF2F2';
const BG = '#F4F6FB';
const INK = '#1F2937';
const MUTED = '#6B7280';
const BORDER = '#E5E7EB';

type AntiparasiticType = Antiparasitic['type'];

const ANTIPARASITIC_TYPE_LABELS: Record<AntiparasiticType, string> = {
  pulci_zecche: 'Pulci & Zecche',
  filaria: 'Filaria',
  vermi: 'Vermi',
  generico: 'Generico',
};

function daysUntil(dateStr: string): number {
  const d = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - now.getTime()) / 86400000);
}

function statusFromDays(days: number): 'ok' | 'warning' | 'danger' | 'expired' {
  if (days < 0) return 'expired';
  if (days <= 7) return 'danger';
  if (days <= 30) return 'warning';
  return 'ok';
}

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function parseDateInput(input: string): string | null {
  const parts = input.split('/');
  if (parts.length !== 3) return null;
  const [d, m, y] = parts;
  if (!d || !m || !y || y.length !== 4) return null;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  if (isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function statusColor(status: 'ok' | 'warning' | 'danger' | 'expired'): string {
  if (status === 'ok') return GREEN;
  if (status === 'warning') return ORANGE;
  return RED;
}

export default function PrevenzioneScreen() {
  const profiles = useProfileStore((s) => s.profiles);
  const petProfile = profiles.find((p) => p.kind === 'pet');
  const petName = petProfile?.name ?? 'il tuo animale';

  const { vaccines, antiparasitics, checks, addVaccine, removeVaccine, addAntiparasitic, removeAntiparasitic, addCheck, removeCheck } =
    usePreventionStore();

  const scrollRef = useRef<ScrollView>(null);
  const vaccinesRef = useRef<View>(null);
  const antiparasiticsRef = useRef<View>(null);
  const checksRef = useRef<View>(null);
  const upcomingRef = useRef<View>(null);

  const [chatOpen, setChatOpen] = useState(false);
  const [expandedVaccine, setExpandedVaccine] = useState<string | null>(null);
  const [expandedCheck, setExpandedCheck] = useState<string | null>(null);
  const [sectionsOpen, setSectionsOpen] = useState<{ upcoming: boolean; vaccines: boolean; anti: boolean; checks: boolean }>({
    upcoming: false,
    vaccines: false,
    anti: false,
    checks: false,
  });
  const toggleSection = (key: 'upcoming' | 'vaccines' | 'anti' | 'checks') => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSectionsOpen((s) => ({ ...s, [key]: !s[key] }));
  };

  const [showVaccineModal, setShowVaccineModal] = useState(false);
  const [showAntiModal, setShowAntiModal] = useState(false);
  const [showCheckModal, setShowCheckModal] = useState(false);

  const [vName, setVName] = useState('');
  const [vDate, setVDate] = useState('');
  const [vNextDate, setVNextDate] = useState('');
  const [vLot, setVLot] = useState('');
  const [vVet, setVVet] = useState('');
  const [vNotes, setVNotes] = useState('');

  const [aName, setAName] = useState('');
  const [aType, setAType] = useState<AntiparasiticType>('pulci_zecche');
  const [aDateApplied, setADateApplied] = useState('');
  const [aNextDate, setANextDate] = useState('');
  const [aNotes, setANotes] = useState('');

  const [cName, setCName] = useState('');
  const [cDate, setCDate] = useState('');
  const [cNextDate, setCNextDate] = useState('');
  const [cVet, setCVet] = useState('');
  const [cNotes, setCNotes] = useState('');

  const allUpcoming: { name: string; nextDate: string; type: string }[] = [];
  vaccines.forEach((v) => {
    if (v.nextDate) allUpcoming.push({ name: v.name, nextDate: v.nextDate, type: 'Vaccino' });
  });
  antiparasitics.forEach((a) => {
    allUpcoming.push({ name: a.name, nextDate: a.nextDate, type: ANTIPARASITIC_TYPE_LABELS[a.type] });
  });
  checks.forEach((c) => {
    if (c.nextDate) allUpcoming.push({ name: c.name, nextDate: c.nextDate, type: 'Controllo' });
  });
  allUpcoming.sort((a, b) => a.nextDate.localeCompare(b.nextDate));

  const expiredItems = allUpcoming.filter((i) => daysUntil(i.nextDate) < 0);
  const soonItems = allUpcoming.filter((i) => {
    const d = daysUntil(i.nextDate);
    return d >= 0 && d <= 7;
  });

  let heroStatus: 'ok' | 'warning' | 'danger' = 'ok';
  if (expiredItems.length > 0) heroStatus = 'danger';
  else if (soonItems.length > 0) heroStatus = 'warning';

  const heroGradient: [string, string] =
    heroStatus === 'ok'
      ? ['#10B981', '#059669']
      : heroStatus === 'warning'
      ? ['#F59E0B', '#D97706']
      : ['#EF4444', '#DC2626'];

  const heroStatusText =
    heroStatus === 'ok'
      ? 'Tutto in regola'
      : heroStatus === 'warning'
      ? 'Richiamo imminente'
      : 'Attenzione richiesta';

  const nextItem = allUpcoming.find((i) => daysUntil(i.nextDate) >= 0);
  const nextDays = nextItem ? daysUntil(nextItem.nextDate) : null;

  const heroSummary = [
    vaccines.length > 0 ? `${vaccines.length} vaccin${vaccines.length === 1 ? 'o' : 'i'}` : null,
    antiparasitics.length > 0 ? `${antiparasitics.length} antiparassitar${antiparasitics.length === 1 ? 'io' : 'i'}` : null,
    nextItem && nextDays !== null ? `prossimo richiamo tra ${nextDays} giorni` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const insightText = (() => {
    if (vaccines.length === 0 && antiparasitics.length === 0 && checks.length === 0) {
      return `Aggiungi i vaccini e i trattamenti di ${petName} per tenere traccia della sua protezione.`;
    }
    if (expiredItems.length > 0) {
      return `Attenzione: ${expiredItems.map((i) => i.name).join(', ')} ${expiredItems.length === 1 ? 'risulta scaduto' : 'risultano scaduti'}. Pianifica subito un appuntamento.`;
    }
    if (soonItems.length > 0) {
      return `Il richiamo di ${soonItems[0].name} e' tra meno di 7 giorni. Contatta il veterinario per fissare un appuntamento.`;
    }
    if (nextItem && nextDays !== null) {
      return `${petName} e' in regola con la prevenzione. Il prossimo appuntamento previsto e' tra ${nextDays} giorni (${nextItem.name}).`;
    }
    return `${petName} ha ${vaccines.length} vaccin${vaccines.length === 1 ? 'o' : 'i'} registrat${vaccines.length === 1 ? 'o' : 'i'} e ${antiparasitics.length} trattament${antiparasitics.length === 1 ? 'o' : 'i'} antiparassitari. Continua ad aggiornare i dati per rimanere sempre protetto.`;
  })();

  function buildPreventionContext(): string {
    const parts: string[] = [`Animale: ${petName}.`];
    if (petProfile?.species) parts.push(`Specie: ${petProfile.species}.`);
    if (vaccines.length > 0) {
      parts.push(
        `Vaccini: ${vaccines.map((v) => `${v.name} (applicato ${v.date}${v.nextDate ? `, prossima dose ${v.nextDate}` : ''})`).join('; ')}.`,
      );
    } else {
      parts.push('Nessun vaccino registrato.');
    }
    if (antiparasitics.length > 0) {
      parts.push(
        `Antiparassitari: ${antiparasitics.map((a) => `${a.name} tipo ${ANTIPARASITIC_TYPE_LABELS[a.type]} (applicato ${a.dateApplied}, prossima dose ${a.nextDate})`).join('; ')}.`,
      );
    } else {
      parts.push('Nessun antiparassitario registrato.');
    }
    if (checks.length > 0) {
      parts.push(
        `Controlli preventivi: ${checks.map((c) => `${c.name} (${c.date}${c.nextDate ? `, prossimo ${c.nextDate}` : ''})`).join('; ')}.`,
      );
    } else {
      parts.push('Nessun controllo preventivo registrato.');
    }
    return parts.join(' ');
  }

  function scrollToRef(ref: React.RefObject<View | null>) {
    if (!ref.current || !scrollRef.current) return;
    ref.current.measureLayout(
      scrollRef.current as unknown as Parameters<View['measureLayout']>[0],
      (x, y) => {
        (scrollRef.current as ScrollView | null)?.scrollTo({ y: y - 16, animated: true });
      },
      () => {},
    );
  }

  function openAndScroll(key: 'upcoming' | 'vaccines' | 'anti' | 'checks', ref: React.RefObject<View | null>) {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSectionsOpen((s) => ({ ...s, [key]: true }));
    setTimeout(() => scrollToRef(ref), 60);
  }

  function saveVaccine() {
    if (!vName.trim() || !vDate.trim()) return;
    const date = parseDateInput(vDate);
    if (!date) {
      Alert.alert('Data non valida', 'Usa il formato GG/MM/AAAA');
      return;
    }
    const nextDate = vNextDate.trim() ? parseDateInput(vNextDate) ?? undefined : undefined;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addVaccine({ name: vName.trim(), date, nextDate, lot: vLot.trim() || undefined, vet: vVet.trim() || undefined, notes: vNotes.trim() || undefined });
    setVName(''); setVDate(''); setVNextDate(''); setVLot(''); setVVet(''); setVNotes('');
    setShowVaccineModal(false);
  }

  function saveAntiparasitic() {
    if (!aName.trim() || !aDateApplied.trim() || !aNextDate.trim()) return;
    const dateApplied = parseDateInput(aDateApplied);
    const nextDate = parseDateInput(aNextDate);
    if (!dateApplied || !nextDate) {
      Alert.alert('Data non valida', 'Usa il formato GG/MM/AAAA');
      return;
    }
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addAntiparasitic({ name: aName.trim(), type: aType, dateApplied, nextDate, notes: aNotes.trim() || undefined });
    setAName(''); setADateApplied(''); setANextDate(''); setANotes(''); setAType('pulci_zecche');
    setShowAntiModal(false);
  }

  function saveCheck() {
    if (!cName.trim() || !cDate.trim()) return;
    const date = parseDateInput(cDate);
    if (!date) {
      Alert.alert('Data non valida', 'Usa il formato GG/MM/AAAA');
      return;
    }
    const nextDate = cNextDate.trim() ? parseDateInput(cNextDate) ?? undefined : undefined;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addCheck({ name: cName.trim(), date, nextDate, vet: cVet.trim() || undefined, notes: cNotes.trim() || undefined });
    setCName(''); setCDate(''); setCNextDate(''); setCVet(''); setCNotes('');
    setShowCheckModal(false);
  }

  function confirmRemoveVaccine(id: string, name: string) {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Elimina vaccino', `Rimuovere "${name}" dallo storico?`, [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Elimina', style: 'destructive', onPress: () => removeVaccine(id) },
    ]);
  }

  function confirmRemoveAnti(id: string, name: string) {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Elimina trattamento', `Rimuovere "${name}"?`, [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Elimina', style: 'destructive', onPress: () => removeAntiparasitic(id) },
    ]);
  }

  function confirmRemoveCheck(id: string, name: string) {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Elimina controllo', `Rimuovere "${name}"?`, [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Elimina', style: 'destructive', onPress: () => removeCheck(id) },
    ]);
  }

  function antiProgress(a: Antiparasitic): number {
    const applied = new Date(a.dateApplied).getTime();
    const next = new Date(a.nextDate).getTime();
    const now = Date.now();
    const total = next - applied;
    if (total <= 0) return 0;
    const elapsed = now - applied;
    const ratio = elapsed / total;
    return Math.max(0, Math.min(1, ratio));
  }

  function progressColor(ratio: number): string {
    if (ratio < 0.5) return GREEN;
    if (ratio < 0.8) return ORANGE;
    return RED;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={INK} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Prevenzione</Text>
          <Text style={styles.headerSub}>{petName}</Text>
        </View>
        <Pressable
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setChatOpen(true);
          }}
          hitSlop={8}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={22} color={ACCENT} />
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient colors={heroGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <View style={styles.heroTop}>
            <Text style={styles.heroShield}>🛡️</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroStatusLabel}>Stato protezione</Text>
              <Text style={styles.heroStatusText}>{heroStatusText}</Text>
            </View>
          </View>
          {heroSummary ? (
            <Text style={styles.heroSummary}>{heroSummary}</Text>
          ) : (
            <Text style={styles.heroSummary}>Aggiungi vaccini e trattamenti per monitorare la protezione di {petName}</Text>
          )}
        </LinearGradient>

        <View style={styles.grid}>
          <Pressable style={styles.gridCell} onPress={() => openAndScroll('vaccines', vaccinesRef)}>
            <Text style={styles.gridEmoji}>💉</Text>
            <Text style={styles.gridCount}>{vaccines.length}</Text>
            <Text style={styles.gridLabel}>Vaccini</Text>
          </Pressable>
          <Pressable style={styles.gridCell} onPress={() => openAndScroll('anti', antiparasiticsRef)}>
            <Text style={styles.gridEmoji}>🦟</Text>
            <Text style={styles.gridCount}>{antiparasitics.length}</Text>
            <Text style={styles.gridLabel}>Antipar.</Text>
          </Pressable>
          <Pressable style={styles.gridCell} onPress={() => openAndScroll('checks', checksRef)}>
            <Text style={styles.gridEmoji}>🩺</Text>
            <Text style={styles.gridCount}>{checks.length}</Text>
            <Text style={styles.gridLabel}>Controlli</Text>
          </Pressable>
          <Pressable style={styles.gridCell} onPress={() => openAndScroll('upcoming', upcomingRef)}>
            <Text style={styles.gridEmoji}>📅</Text>
            <Text style={styles.gridCount}>{allUpcoming.length}</Text>
            <Text style={styles.gridLabel}>Scadenze</Text>
          </Pressable>
        </View>

        <View ref={upcomingRef} style={{ marginTop: 24 }}>
          <Pressable style={styles.accordionHeader} onPress={() => toggleSection('upcoming')}>
            <Text style={styles.sectionTitle}>In arrivo</Text>
            <View style={styles.accordionRight}>
              <Text style={styles.accordionCount}>{allUpcoming.length}</Text>
              <Ionicons name={sectionsOpen.upcoming ? 'chevron-up' : 'chevron-down'} size={18} color={MUTED} />
            </View>
          </Pressable>
          {sectionsOpen.upcoming && <View style={{ height: 10 }} />}
          {sectionsOpen.upcoming && (allUpcoming.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>Nessuna scadenza programmata</Text>
            </View>
          ) : (
            allUpcoming.map((item, idx) => {
              const days = daysUntil(item.nextDate);
              const status = statusFromDays(days);
              const col = statusColor(status);
              return (
                <View key={`${item.name}-${idx}`} style={styles.upcomingRow}>
                  <View style={[styles.upcomingDot, { backgroundColor: col }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.upcomingName}>{item.name}</Text>
                    <Text style={styles.upcomingType}>{item.type}</Text>
                  </View>
                  <Text style={[styles.upcomingDays, { color: col }]}>
                    {days < 0 ? `scaduto ${Math.abs(days)} gg fa` : days === 0 ? 'oggi' : `tra ${days} giorni`}
                  </Text>
                </View>
              );
            })
          ))}
        </View>

        <View ref={vaccinesRef} style={{ marginTop: 24 }}>
          <Pressable style={styles.accordionHeader} onPress={() => toggleSection('vaccines')}>
            <Text style={styles.sectionTitle}>Vaccini</Text>
            <View style={styles.accordionRight}>
              <Text style={styles.accordionCount}>{vaccines.length}</Text>
              <Pressable
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowVaccineModal(true);
                }}
                hitSlop={8}
              >
                <Ionicons name="add-circle-outline" size={22} color={ACCENT} />
              </Pressable>
              <Ionicons name={sectionsOpen.vaccines ? 'chevron-up' : 'chevron-down'} size={18} color={MUTED} />
            </View>
          </Pressable>
          {sectionsOpen.vaccines && <View style={{ height: 10 }} />}
          {sectionsOpen.vaccines && (vaccines.length === 0 ? (
            <Pressable style={styles.emptyCard} onPress={() => setShowVaccineModal(true)}>
              <Text style={styles.emptyText}>Nessun vaccino registrato</Text>
              <Text style={styles.emptyAction}>Tocca + per aggiungere</Text>
            </Pressable>
          ) : (
            vaccines.map((v) => {
              const expanded = expandedVaccine === v.id;
              const nextDays = v.nextDate ? daysUntil(v.nextDate) : null;
              const status = nextDays !== null ? statusFromDays(nextDays) : 'ok';
              const col = statusColor(status);
              return (
                <Pressable
                  key={v.id}
                  style={styles.card}
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setExpandedVaccine(expanded ? null : v.id);
                  }}
                  onLongPress={() => confirmRemoveVaccine(v.id, v.name)}
                >
                  <View style={styles.cardRow}>
                    <View style={[styles.cardIcon, { backgroundColor: ACCENT_LIGHT }]}>
                      <Text>💉</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle}>{v.name}</Text>
                      <Text style={styles.cardSub}>Applicato: {formatDate(v.date)}</Text>
                    </View>
                    {v.nextDate && (
                      <View style={[styles.statusPill, { backgroundColor: col + '22' }]}>
                        <Text style={[styles.statusPillTxt, { color: col }]}>
                          {nextDays !== null && nextDays < 0 ? 'Scaduto' : nextDays === 0 ? 'Oggi' : `${nextDays}gg`}
                        </Text>
                      </View>
                    )}
                    <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={MUTED} />
                  </View>
                  {expanded && (
                    <View style={styles.cardDetails}>
                      {v.nextDate && (
                        <Text style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Prossima dose: </Text>
                          {formatDate(v.nextDate)}
                        </Text>
                      )}
                      {v.lot && (
                        <Text style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Lotto: </Text>
                          {v.lot}
                        </Text>
                      )}
                      {v.vet && (
                        <Text style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Veterinario: </Text>
                          {v.vet}
                        </Text>
                      )}
                      {v.notes && (
                        <Text style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Note: </Text>
                          {v.notes}
                        </Text>
                      )}
                      <Pressable
                        style={styles.deleteBtn}
                        onPress={() => confirmRemoveVaccine(v.id, v.name)}
                      >
                        <Ionicons name="trash-outline" size={14} color={RED} />
                        <Text style={styles.deleteBtnTxt}>Elimina</Text>
                      </Pressable>
                    </View>
                  )}
                </Pressable>
              );
            })
          ))}
        </View>

        <View ref={antiparasiticsRef} style={{ marginTop: 24 }}>
          <Pressable style={styles.accordionHeader} onPress={() => toggleSection('anti')}>
            <Text style={styles.sectionTitle}>Protezione antiparassitaria</Text>
            <View style={styles.accordionRight}>
              <Text style={styles.accordionCount}>{antiparasitics.length}</Text>
              <Pressable
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowAntiModal(true);
                }}
                hitSlop={8}
              >
                <Ionicons name="add-circle-outline" size={22} color={ACCENT} />
              </Pressable>
              <Ionicons name={sectionsOpen.anti ? 'chevron-up' : 'chevron-down'} size={18} color={MUTED} />
            </View>
          </Pressable>
          {sectionsOpen.anti && <View style={{ height: 10 }} />}
          {sectionsOpen.anti && (antiparasitics.length === 0 ? (
            <Pressable style={styles.emptyCard} onPress={() => setShowAntiModal(true)}>
              <Text style={styles.emptyText}>Nessun trattamento registrato</Text>
              <Text style={styles.emptyAction}>Tocca + per aggiungere</Text>
            </Pressable>
          ) : (
            antiparasitics.map((a) => {
              const days = daysUntil(a.nextDate);
              const status = statusFromDays(days);
              const col = statusColor(status);
              const progress = antiProgress(a);
              const pCol = progressColor(progress);
              return (
                <Pressable
                  key={a.id}
                  style={styles.card}
                  onLongPress={() => confirmRemoveAnti(a.id, a.name)}
                >
                  <View style={styles.cardRow}>
                    <View style={[styles.cardIcon, { backgroundColor: GREEN_LIGHT }]}>
                      <Text>🦟</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle}>{a.name}</Text>
                      <Text style={styles.cardSub}>{ANTIPARASITIC_TYPE_LABELS[a.type]}</Text>
                    </View>
                    <View style={[styles.statusPill, { backgroundColor: col + '22' }]}>
                      <Text style={[styles.statusPillTxt, { color: col }]}>
                        {days < 0 ? 'Scaduto' : days === 0 ? 'Oggi' : `${days}gg`}
                      </Text>
                    </View>
                    <Pressable hitSlop={8} onPress={() => confirmRemoveAnti(a.id, a.name)}>
                      <Ionicons name="trash-outline" size={16} color="#D1D5DB" />
                    </Pressable>
                  </View>
                  <View style={styles.progressContainer}>
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width: `${(1 - progress) * 100}%`, backgroundColor: pCol }]} />
                    </View>
                    <Text style={[styles.progressLabel, { color: col }]}>
                      {days < 0 ? `Scaduto ${Math.abs(days)} giorni fa` : `Prossima dose: tra ${days} giorni`}
                    </Text>
                  </View>
                  <Text style={styles.appliedDate}>Applicato il {formatDate(a.dateApplied)}</Text>
                </Pressable>
              );
            })
          ))}
        </View>

        <View ref={checksRef} style={{ marginTop: 24 }}>
          <Pressable style={styles.accordionHeader} onPress={() => toggleSection('checks')}>
            <Text style={styles.sectionTitle}>Controlli preventivi</Text>
            <View style={styles.accordionRight}>
              <Text style={styles.accordionCount}>{checks.length}</Text>
              <Pressable
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowCheckModal(true);
                }}
                hitSlop={8}
              >
                <Ionicons name="add-circle-outline" size={22} color={ACCENT} />
              </Pressable>
              <Ionicons name={sectionsOpen.checks ? 'chevron-up' : 'chevron-down'} size={18} color={MUTED} />
            </View>
          </Pressable>
          {sectionsOpen.checks && <View style={{ height: 10 }} />}
          {sectionsOpen.checks && (checks.length === 0 ? (
            <Pressable style={styles.emptyCard} onPress={() => setShowCheckModal(true)}>
              <Text style={styles.emptyText}>Nessun controllo registrato</Text>
              <Text style={styles.emptyAction}>Tocca + per aggiungere</Text>
            </Pressable>
          ) : (
            checks.map((c) => {
              const expanded = expandedCheck === c.id;
              const nextDays = c.nextDate ? daysUntil(c.nextDate) : null;
              const status = nextDays !== null ? statusFromDays(nextDays) : 'ok';
              const col = statusColor(status);
              return (
                <Pressable
                  key={c.id}
                  style={styles.card}
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setExpandedCheck(expanded ? null : c.id);
                  }}
                  onLongPress={() => confirmRemoveCheck(c.id, c.name)}
                >
                  <View style={styles.cardRow}>
                    <View style={[styles.cardIcon, { backgroundColor: ORANGE_LIGHT }]}>
                      <Text>🩺</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle}>{c.name}</Text>
                      <Text style={styles.cardSub}>{formatDate(c.date)}</Text>
                    </View>
                    {c.nextDate && (
                      <View style={[styles.statusPill, { backgroundColor: col + '22' }]}>
                        <Text style={[styles.statusPillTxt, { color: col }]}>
                          {nextDays !== null && nextDays < 0 ? 'Scaduto' : nextDays === 0 ? 'Oggi' : `${nextDays}gg`}
                        </Text>
                      </View>
                    )}
                    <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={MUTED} />
                  </View>
                  {expanded && (
                    <View style={styles.cardDetails}>
                      {c.nextDate && (
                        <Text style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Prossima visita: </Text>
                          {formatDate(c.nextDate)}
                        </Text>
                      )}
                      {c.vet && (
                        <Text style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Veterinario: </Text>
                          {c.vet}
                        </Text>
                      )}
                      {c.notes && (
                        <Text style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Note: </Text>
                          {c.notes}
                        </Text>
                      )}
                      <Pressable
                        style={styles.deleteBtn}
                        onPress={() => confirmRemoveCheck(c.id, c.name)}
                      >
                        <Ionicons name="trash-outline" size={14} color={RED} />
                        <Text style={styles.deleteBtnTxt}>Elimina</Text>
                      </Pressable>
                    </View>
                  )}
                </Pressable>
              );
            })
          ))}
        </View>

        <View style={[styles.insightCard, { marginTop: 28 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Text style={{ fontSize: 16 }}>🧠</Text>
            <Text style={styles.insightTitle}>Insight Prevenzione</Text>
          </View>
          <Text style={styles.insightText}>{insightText}</Text>
          <Pressable
            style={styles.insightCta}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setChatOpen(true);
            }}
          >
            <Text style={styles.insightCtaTxt}>Chiedi all'assistente →</Text>
          </Pressable>
        </View>
      </ScrollView>

      <View style={styles.quickActions}>
        <Pressable
          style={styles.quickActionBtn}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowVaccineModal(true);
          }}
        >
          <Text style={styles.quickActionEmoji}>➕</Text>
          <Text style={styles.quickActionLabel}>Vaccino</Text>
        </Pressable>
        <Pressable
          style={styles.quickActionBtn}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowAntiModal(true);
          }}
        >
          <Text style={styles.quickActionEmoji}>🦟</Text>
          <Text style={styles.quickActionLabel}>Antiparassitario</Text>
        </Pressable>
        <Pressable
          style={styles.quickActionBtn}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowCheckModal(true);
          }}
        >
          <Text style={styles.quickActionEmoji}>🩺</Text>
          <Text style={styles.quickActionLabel}>Controllo</Text>
        </Pressable>
        <Pressable
          style={[styles.quickActionBtn, { backgroundColor: ACCENT }]}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setChatOpen(true);
          }}
        >
          <Text style={styles.quickActionEmoji}>💬</Text>
          <Text style={[styles.quickActionLabel, { color: '#fff' }]}>Chat</Text>
        </Pressable>
      </View>

      <Modal visible={showVaccineModal} transparent animationType="slide" onRequestClose={() => setShowVaccineModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <Pressable style={styles.modalOverlay} onPress={() => setShowVaccineModal(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.modalTitle}>Aggiungi vaccino</Text>
            <Text style={styles.modalSub}>Inserisci i dati del vaccino di {petName}</Text>

            <TextInput
              style={styles.modalInput}
              value={vName}
              onChangeText={setVName}
              placeholder="Nome vaccino (es. Trivalente)"
              placeholderTextColor={MUTED}
            />
            <TextInput
              style={[styles.modalInput, { marginTop: 10 }]}
              value={vDate}
              onChangeText={setVDate}
              placeholder="Data applicazione (GG/MM/AAAA)"
              placeholderTextColor={MUTED}
              keyboardType="numeric"
            />
            <TextInput
              style={[styles.modalInput, { marginTop: 10 }]}
              value={vNextDate}
              onChangeText={setVNextDate}
              placeholder="Prossima dose (GG/MM/AAAA) — opzionale"
              placeholderTextColor={MUTED}
              keyboardType="numeric"
            />
            <TextInput
              style={[styles.modalInput, { marginTop: 10 }]}
              value={vLot}
              onChangeText={setVLot}
              placeholder="Lotto — opzionale"
              placeholderTextColor={MUTED}
            />
            <TextInput
              style={[styles.modalInput, { marginTop: 10 }]}
              value={vVet}
              onChangeText={setVVet}
              placeholder="Veterinario — opzionale"
              placeholderTextColor={MUTED}
            />
            <TextInput
              style={[styles.modalInput, { marginTop: 10 }]}
              value={vNotes}
              onChangeText={setVNotes}
              placeholder="Note — opzionale"
              placeholderTextColor={MUTED}
            />
            <View style={{ height: 16 }} />
            <Pressable style={[styles.saveBtn, { backgroundColor: ACCENT }]} onPress={saveVaccine}>
              <Text style={styles.saveBtnTxt}>Salva vaccino</Text>
            </Pressable>
            <Pressable style={styles.cancelBtn} onPress={() => setShowVaccineModal(false)}>
              <Text style={styles.cancelBtnTxt}>Annulla</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showAntiModal} transparent animationType="slide" onRequestClose={() => setShowAntiModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <Pressable style={styles.modalOverlay} onPress={() => setShowAntiModal(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.modalTitle}>Aggiungi antiparassitario</Text>
            <Text style={styles.modalSub}>Trattamento per {petName}</Text>

            <TextInput
              style={styles.modalInput}
              value={aName}
              onChangeText={setAName}
              placeholder="Nome prodotto (es. Bravecto)"
              placeholderTextColor={MUTED}
            />

            <View style={styles.chipRow}>
              {(Object.keys(ANTIPARASITIC_TYPE_LABELS) as AntiparasiticType[]).map((t) => (
                <Pressable
                  key={t}
                  style={[styles.typeChip, aType === t && { backgroundColor: ACCENT, borderColor: ACCENT }]}
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setAType(t);
                  }}
                >
                  <Text style={[styles.typeChipTxt, aType === t && { color: '#fff' }]}>
                    {ANTIPARASITIC_TYPE_LABELS[t]}
                  </Text>
                </Pressable>
              ))}
            </View>

            <TextInput
              style={[styles.modalInput, { marginTop: 10 }]}
              value={aDateApplied}
              onChangeText={setADateApplied}
              placeholder="Data applicazione (GG/MM/AAAA)"
              placeholderTextColor={MUTED}
              keyboardType="numeric"
            />
            <TextInput
              style={[styles.modalInput, { marginTop: 10 }]}
              value={aNextDate}
              onChangeText={setANextDate}
              placeholder="Prossima dose (GG/MM/AAAA)"
              placeholderTextColor={MUTED}
              keyboardType="numeric"
            />
            <TextInput
              style={[styles.modalInput, { marginTop: 10 }]}
              value={aNotes}
              onChangeText={setANotes}
              placeholder="Note — opzionale"
              placeholderTextColor={MUTED}
            />
            <View style={{ height: 16 }} />
            <Pressable style={[styles.saveBtn, { backgroundColor: ACCENT }]} onPress={saveAntiparasitic}>
              <Text style={styles.saveBtnTxt}>Salva trattamento</Text>
            </Pressable>
            <Pressable style={styles.cancelBtn} onPress={() => setShowAntiModal(false)}>
              <Text style={styles.cancelBtnTxt}>Annulla</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showCheckModal} transparent animationType="slide" onRequestClose={() => setShowCheckModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <Pressable style={styles.modalOverlay} onPress={() => setShowCheckModal(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.modalTitle}>Aggiungi controllo</Text>
            <Text style={styles.modalSub}>Visita o esame preventivo</Text>

            <TextInput
              style={styles.modalInput}
              value={cName}
              onChangeText={setCName}
              placeholder="Tipo visita (es. Visita annuale)"
              placeholderTextColor={MUTED}
            />
            <TextInput
              style={[styles.modalInput, { marginTop: 10 }]}
              value={cDate}
              onChangeText={setCDate}
              placeholder="Data visita (GG/MM/AAAA)"
              placeholderTextColor={MUTED}
              keyboardType="numeric"
            />
            <TextInput
              style={[styles.modalInput, { marginTop: 10 }]}
              value={cNextDate}
              onChangeText={setCNextDate}
              placeholder="Prossima visita (GG/MM/AAAA) — opzionale"
              placeholderTextColor={MUTED}
              keyboardType="numeric"
            />
            <TextInput
              style={[styles.modalInput, { marginTop: 10 }]}
              value={cVet}
              onChangeText={setCVet}
              placeholder="Veterinario — opzionale"
              placeholderTextColor={MUTED}
            />
            <TextInput
              style={[styles.modalInput, { marginTop: 10 }]}
              value={cNotes}
              onChangeText={setCNotes}
              placeholder="Note — opzionale"
              placeholderTextColor={MUTED}
            />
            <View style={{ height: 16 }} />
            <Pressable style={[styles.saveBtn, { backgroundColor: ACCENT }]} onPress={saveCheck}>
              <Text style={styles.saveBtnTxt}>Salva controllo</Text>
            </Pressable>
            <Pressable style={styles.cancelBtn} onPress={() => setShowCheckModal(false)}>
              <Text style={styles.cancelBtnTxt}>Annulla</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <SectionChatModal
        visible={chatOpen}
        onClose={() => setChatOpen(false)}
        title="Assistente Prevenzione"
        accent={ACCENT}
        welcome={`Ciao! Sono il tuo assistente per la prevenzione di ${petName}.\nPosso aiutarti su vaccini, antiparassitari e controlli preventivi.`}
        buildContext={buildPreventionContext}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: BG,
  },
  backBtn: { padding: 2 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: INK },
  headerSub: { fontSize: 11, color: MUTED, marginTop: 1 },

  hero: { borderRadius: 22, padding: 20 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroShield: { fontSize: 32 },
  heroStatusLabel: { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },
  heroStatusText: { fontSize: 20, fontWeight: '900', color: '#fff', marginTop: 2 },
  heroSummary: { fontSize: 13, color: 'rgba(255,255,255,0.9)', marginTop: 12, lineHeight: 19 },

  grid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  gridCell: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    gap: 2,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  gridEmoji: { fontSize: 18 },
  gridCount: { fontSize: 18, fontWeight: '900', color: INK },
  gridLabel: { fontSize: 10, color: MUTED, textAlign: 'center' },

  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: INK },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },
  accordionRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  accordionCount: {
    fontSize: 12,
    fontWeight: '700',
    color: MUTED,
    backgroundColor: '#F4F6FB',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 99,
    minWidth: 24,
    textAlign: 'center',
  },

  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: BORDER,
  },
  emptyText: { fontSize: 13, color: MUTED },
  emptyAction: { fontSize: 11, color: ACCENT, marginTop: 2 },

  upcomingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: BORDER,
  },
  upcomingDot: { width: 10, height: 10, borderRadius: 5 },
  upcomingName: { fontSize: 13, fontWeight: '700', color: INK },
  upcomingType: { fontSize: 11, color: MUTED, marginTop: 1 },
  upcomingDays: { fontSize: 12, fontWeight: '700' },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: INK },
  cardSub: { fontSize: 11, color: MUTED, marginTop: 2 },
  statusPill: {
    borderRadius: 99,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  statusPillTxt: { fontSize: 11, fontWeight: '700' },
  cardDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    gap: 4,
  },
  detailRow: { fontSize: 13, color: INK, lineHeight: 19 },
  detailLabel: { fontWeight: '700' },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  deleteBtnTxt: { fontSize: 12, fontWeight: '600', color: RED },

  progressContainer: { marginTop: 10 },
  progressTrack: {
    height: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 99,
    overflow: 'hidden',
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  progressFill: { height: '100%', borderRadius: 99 },
  progressLabel: { fontSize: 11, fontWeight: '600', marginTop: 4 },
  appliedDate: { fontSize: 10, color: MUTED, marginTop: 2 },

  insightCard: {
    backgroundColor: GREEN_LIGHT,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  insightTitle: { fontSize: 14, fontWeight: '700', color: GREEN },
  insightText: { fontSize: 13, color: INK, lineHeight: 19 },
  insightCta: { marginTop: 10 },
  insightCtaTxt: { fontSize: 12, fontWeight: '600', color: GREEN },

  quickActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingHorizontal: 12,
    paddingVertical: 10,
    paddingBottom: 24,
    gap: 8,
  },
  quickActionBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#F4F6FB',
    gap: 3,
  },
  quickActionEmoji: { fontSize: 18 },
  quickActionLabel: { fontSize: 9, fontWeight: '700', color: INK },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    backgroundColor: '#fff',
    padding: 22,
    paddingBottom: 40,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: INK, marginBottom: 2 },
  modalSub: { fontSize: 12, color: MUTED, marginBottom: 14 },
  modalInput: {
    backgroundColor: '#F5F7FA',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: INK,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  typeChip: {
    borderRadius: 99,
    paddingVertical: 7,
    paddingHorizontal: 14,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: BORDER,
  },
  typeChipTxt: { fontSize: 12, fontWeight: '600', color: INK },
  saveBtn: {
    borderRadius: 99,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnTxt: { fontWeight: '700', fontSize: 15, color: '#fff' },
  cancelBtn: {
    marginTop: 8,
    borderRadius: 99,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER,
  },
  cancelBtnTxt: { fontWeight: '600', fontSize: 14, color: INK },
});
