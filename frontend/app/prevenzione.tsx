import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import {
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
import { SectionChatModal } from '../src/components/SectionChatModal';
import { TimeWheelModal } from '../src/components/TimeWheelModal';
import { useMemberPicker } from '../src/hooks/useMemberPicker';
import { useMembersStore } from '../src/store/members';
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

const MONTHS_ABBR = ['GEN', 'FEB', 'MAR', 'APR', 'MAG', 'GIU', 'LUG', 'AGO', 'SET', 'OTT', 'NOV', 'DIC'];

function formatDateShort(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS_ABBR[d.getMonth()]} ${d.getFullYear()}`;
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

function belongsTo(entryMemberId: string | undefined, activeId: string | null, isDefaultFn: (id: string | null) => boolean): boolean {
  if (!activeId) return true;
  if (entryMemberId && entryMemberId === activeId) return true;
  if (!entryMemberId && isDefaultFn(activeId)) return true;
  return false;
}

export default function PrevenzioneScreen() {
  const profiles = useProfileStore((s) => s.profiles);
  const petProfile = profiles.find((p) => p.kind === 'pet');
  const petName = petProfile?.name ?? 'il tuo animale';

  const { vaccines, antiparasitics, checks, therapies, addVaccine, updateVaccine, removeVaccine, addAntiparasitic, updateAntiparasitic, removeAntiparasitic, addCheck, updateCheck, removeCheck, addTherapy, removeTherapy, setVaccineStatus, setAntiparasiticStatus, setCheckStatus } =
    usePreventionStore();

  const activePetId = useMembersStore((s) => s.activePetId);
  const isDefault = useMembersStore((s) => s.isDefault);
  const isDefaultPet = (id: string | null) => isDefault('pet', id);

  const { pickMember, modalProps: pickerProps } = useMemberPicker('pet');

  const scrollRef = useRef<ScrollView>(null);
  const vaccinesRef = useRef<View>(null);
  const antiparasiticsRef = useRef<View>(null);
  const checksRef = useRef<View>(null);
  const upcomingRef = useRef<View>(null);
  const therapyRef = useRef<View>(null);

  const [chatOpen, setChatOpen] = useState(false);
  const [expandedVaccine, setExpandedVaccine] = useState<string | null>(null);
  const [expandedCheck, setExpandedCheck] = useState<string | null>(null);
  const [sectionsOpen, setSectionsOpen] = useState<{ upcoming: boolean; vaccines: boolean; anti: boolean; checks: boolean; therapy: boolean; completed: boolean }>({
    upcoming: false,
    vaccines: false,
    anti: false,
    checks: false,
    therapy: false,
    completed: false,
  });
  const toggleSection = (key: 'upcoming' | 'vaccines' | 'anti' | 'checks' | 'therapy' | 'completed') => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSectionsOpen((s) => ({ ...s, [key]: !s[key] }));
  };

  const [showVaccineModal, setShowVaccineModal] = useState(false);
  const [showAntiModal, setShowAntiModal] = useState(false);
  const [showCheckModal, setShowCheckModal] = useState(false);

  const [editingVaccineId, setEditingVaccineId] = useState<string | null>(null);
  const [editingAntiId, setEditingAntiId] = useState<string | null>(null);
  const [editingCheckId, setEditingCheckId] = useState<string | null>(null);

  const [vErr, setVErr] = useState('');
  const [aErr, setAErr] = useState('');
  const [cErr, setCErr] = useState('');

  const [confirmDel, setConfirmDel] = useState<{ kind: 'vaccine' | 'anti' | 'check'; id: string; name: string } | null>(null);

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

  const [showTherapyModal, setShowTherapyModal] = useState(false);
  const [tName, setTName] = useState('');
  const [tDose, setTDose] = useState('');
  const [tFrequency, setTFrequency] = useState<'8h' | '12h' | '24h'>('24h');
  const [tTime, setTTime] = useState('08:00');
  const [tStartDate, setTStartDate] = useState('');
  const [tEndDate, setTEndDate] = useState('');
  const [tNotes, setTNotes] = useState('');
  const [tErr, setTErr] = useState('');
  const [showTherapyTimePicker, setShowTherapyTimePicker] = useState(false);
  const [tPickerOpen, setTPickerOpen] = useState<null | 'tStart' | 'tEnd'>(null);

  const [postponeModal, setPostponeModal] = useState<{ kind: 'vaccine' | 'anti' | 'check'; id: string } | null>(null);
  const [postponeDate, setPostponeDate] = useState('');

  const [pickerOpen, setPickerOpen] = useState<null | 'vDate' | 'vNext' | 'aApplied' | 'aNext' | 'cDate' | 'cNext'>(null);
  const pickerValue =
    pickerOpen === 'vDate' ? vDate :
    pickerOpen === 'vNext' ? vNextDate :
    pickerOpen === 'aApplied' ? aDateApplied :
    pickerOpen === 'aNext' ? aNextDate :
    pickerOpen === 'cDate' ? cDate :
    pickerOpen === 'cNext' ? cNextDate : '';
  const pickerTitle =
    pickerOpen === 'vDate' ? 'Data applicazione' :
    pickerOpen === 'vNext' ? 'Prossima dose' :
    pickerOpen === 'aApplied' ? 'Data applicazione' :
    pickerOpen === 'aNext' ? 'Prossima dose' :
    pickerOpen === 'cDate' ? 'Data visita' :
    pickerOpen === 'cNext' ? 'Prossima visita' : 'Scegli data';
  function setPickedDate(iso: string) {
    if (pickerOpen === 'vDate') setVDate(iso);
    else if (pickerOpen === 'vNext') setVNextDate(iso);
    else if (pickerOpen === 'aApplied') setADateApplied(iso);
    else if (pickerOpen === 'aNext') setANextDate(iso);
    else if (pickerOpen === 'cDate') setCDate(iso);
    else if (pickerOpen === 'cNext') setCNextDate(iso);
    setPickerOpen(null);
  }

  const allVaccinesMember = useMemo(
    () => vaccines.filter((v) => belongsTo(v.memberId, activePetId, isDefaultPet)),
    [vaccines, activePetId, isDefaultPet],
  );
  const allAntiparasiticsMember = useMemo(
    () => antiparasitics.filter((a) => belongsTo(a.memberId, activePetId, isDefaultPet)),
    [antiparasitics, activePetId, isDefaultPet],
  );
  const allChecksMember = useMemo(
    () => checks.filter((c) => belongsTo(c.memberId, activePetId, isDefaultPet)),
    [checks, activePetId, isDefaultPet],
  );
  const filteredVaccines = useMemo(() => allVaccinesMember.filter((v) => v.status !== 'done'), [allVaccinesMember]);
  const filteredAntiparasitics = useMemo(() => allAntiparasiticsMember.filter((a) => a.status !== 'done'), [allAntiparasiticsMember]);
  const filteredChecks = useMemo(() => allChecksMember.filter((c) => c.status !== 'done'), [allChecksMember]);
  const completedItems = useMemo(() => {
    type Done = { id: string; kind: 'v' | 'a' | 'c'; name: string; date: string; type: string };
    const out: Done[] = [];
    allVaccinesMember.filter((v) => v.status === 'done').forEach((v) => out.push({ id: v.id, kind: 'v', name: v.name, date: v.date, type: 'Vaccino' }));
    allAntiparasiticsMember.filter((a) => a.status === 'done').forEach((a) => out.push({ id: a.id, kind: 'a', name: a.name, date: a.dateApplied, type: 'Antiparassitario' }));
    allChecksMember.filter((c) => c.status === 'done').forEach((c) => out.push({ id: c.id, kind: 'c', name: c.name, date: c.date, type: 'Controllo' }));
    return out.sort((x, y) => y.date.localeCompare(x.date));
  }, [allVaccinesMember, allAntiparasiticsMember, allChecksMember]);
  const filteredTherapies = useMemo(
    () => therapies.filter((t) => belongsTo(t.memberId, activePetId, isDefaultPet)),
    [therapies, activePetId, isDefaultPet],
  );

  const allUpcoming: { name: string; nextDate: string; type: string }[] = [];
  filteredVaccines.forEach((v) => {
    if (v.nextDate) allUpcoming.push({ name: v.name, nextDate: v.nextDate, type: 'Vaccino' });
  });
  filteredAntiparasitics.forEach((a) => {
    allUpcoming.push({ name: a.name, nextDate: a.nextDate, type: ANTIPARASITIC_TYPE_LABELS[a.type] });
  });
  filteredChecks.forEach((c) => {
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
    filteredVaccines.length > 0 ? `${filteredVaccines.length} vaccin${filteredVaccines.length === 1 ? 'o' : 'i'}` : null,
    filteredAntiparasitics.length > 0 ? `${filteredAntiparasitics.length} antiparassitar${filteredAntiparasitics.length === 1 ? 'io' : 'i'}` : null,
    nextItem && nextDays !== null ? `prossimo richiamo tra ${nextDays} giorni` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const insightText = (() => {
    if (filteredVaccines.length === 0 && filteredAntiparasitics.length === 0 && filteredChecks.length === 0) {
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
    return `${petName} ha ${filteredVaccines.length} vaccin${filteredVaccines.length === 1 ? 'o' : 'i'} registrat${filteredVaccines.length === 1 ? 'o' : 'i'} e ${filteredAntiparasitics.length} trattament${filteredAntiparasitics.length === 1 ? 'o' : 'i'} antiparassitari. Continua ad aggiornare i dati per rimanere sempre protetto.`;
  })();

  function buildPreventionContext(): string {
    const parts: string[] = [`Animale: ${petName}.`];
    if (petProfile?.species) parts.push(`Specie: ${petProfile.species}.`);
    if (filteredVaccines.length > 0) {
      parts.push(
        `Vaccini: ${filteredVaccines.map((v) => `${v.name} (applicato ${v.date}${v.nextDate ? `, prossima dose ${v.nextDate}` : ''})`).join('; ')}.`,
      );
    } else {
      parts.push('Nessun vaccino registrato.');
    }
    if (filteredAntiparasitics.length > 0) {
      parts.push(
        `Antiparassitari: ${filteredAntiparasitics.map((a) => `${a.name} tipo ${ANTIPARASITIC_TYPE_LABELS[a.type]} (applicato ${a.dateApplied}, prossima dose ${a.nextDate})`).join('; ')}.`,
      );
    } else {
      parts.push('Nessun antiparassitario registrato.');
    }
    if (filteredChecks.length > 0) {
      parts.push(
        `Controlli preventivi: ${filteredChecks.map((c) => `${c.name} (${c.date}${c.nextDate ? `, prossimo ${c.nextDate}` : ''})`).join('; ')}.`,
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

  function openAndScroll(key: 'upcoming' | 'vaccines' | 'anti' | 'checks' | 'therapy' | 'completed', ref: React.RefObject<View | null>) {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSectionsOpen((s) => ({ ...s, [key]: true }));
    setTimeout(() => scrollToRef(ref), 60);
  }

  function openEditVaccine(v: Vaccine) {
    setEditingVaccineId(v.id);
    setVName(v.name);
    setVDate(v.date);
    setVNextDate(v.nextDate ?? '');
    setVLot(v.lot ?? '');
    setVVet(v.vet ?? '');
    setVNotes(v.notes ?? '');
    setVErr('');
    setShowVaccineModal(true);
  }

  function openEditAnti(a: Antiparasitic) {
    setEditingAntiId(a.id);
    setAName(a.name);
    setAType(a.type);
    setADateApplied(a.dateApplied);
    setANextDate(a.nextDate);
    setANotes(a.notes ?? '');
    setAErr('');
    setShowAntiModal(true);
  }

  function openEditCheck(c: PreventiveCheck) {
    setEditingCheckId(c.id);
    setCName(c.name);
    setCDate(c.date);
    setCNextDate(c.nextDate ?? '');
    setCVet(c.vet ?? '');
    setCNotes(c.notes ?? '');
    setCErr('');
    setShowCheckModal(true);
  }

  async function saveVaccine() {
    if (!vName.trim() || !vDate) {
      setVErr('Inserisci nome e data applicazione');
      return;
    }
    const data = { name: vName.trim(), date: vDate, nextDate: vNextDate || undefined, lot: vLot.trim() || undefined, vet: vVet.trim() || undefined, notes: vNotes.trim() || undefined };
    if (editingVaccineId) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      updateVaccine(editingVaccineId, data);
      setEditingVaccineId(null);
    } else {
      const picked = await pickMember();
      if (picked.prompted && picked.id === null) return; // user cancelled multi-pick
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      addVaccine({ ...data, memberId: picked.id ?? undefined });
    }
    setVName(''); setVDate(''); setVNextDate(''); setVLot(''); setVVet(''); setVNotes(''); setVErr('');
    setShowVaccineModal(false);
  }

  async function saveAntiparasitic() {
    if (!aName.trim() || !aDateApplied || !aNextDate) {
      setAErr('Inserisci nome, data applicazione e prossima dose');
      return;
    }
    const data = { name: aName.trim(), type: aType, dateApplied: aDateApplied, nextDate: aNextDate, notes: aNotes.trim() || undefined };
    if (editingAntiId) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      updateAntiparasitic(editingAntiId, data);
      setEditingAntiId(null);
    } else {
      const picked = await pickMember();
      if (picked.prompted && picked.id === null) return; // user cancelled multi-pick
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      addAntiparasitic({ ...data, memberId: picked.id ?? undefined });
    }
    setAName(''); setADateApplied(''); setANextDate(''); setANotes(''); setAType('pulci_zecche'); setAErr('');
    setShowAntiModal(false);
  }

  async function saveCheck() {
    if (!cName.trim() || !cDate) {
      setCErr('Inserisci tipo visita e data');
      return;
    }
    const data = { name: cName.trim(), date: cDate, nextDate: cNextDate || undefined, vet: cVet.trim() || undefined, notes: cNotes.trim() || undefined };
    if (editingCheckId) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      updateCheck(editingCheckId, data);
      setEditingCheckId(null);
    } else {
      const picked = await pickMember();
      if (picked.prompted && picked.id === null) return; // user cancelled multi-pick
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      addCheck({ ...data, memberId: picked.id ?? undefined });
    }
    setCName(''); setCDate(''); setCNextDate(''); setCVet(''); setCNotes(''); setCErr('');
    setShowCheckModal(false);
  }

  function confirmRemoveVaccine(id: string, name: string) {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setConfirmDel({ kind: 'vaccine', id, name });
  }

  function confirmRemoveAnti(id: string, name: string) {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setConfirmDel({ kind: 'anti', id, name });
  }

  function confirmRemoveCheck(id: string, name: string) {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setConfirmDel({ kind: 'check', id, name });
  }

  function executeDelete() {
    if (!confirmDel) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    if (confirmDel.kind === 'vaccine') removeVaccine(confirmDel.id);
    else if (confirmDel.kind === 'anti') removeAntiparasitic(confirmDel.id);
    else removeCheck(confirmDel.id);
    setConfirmDel(null);
  }

  function calcTimesLocal(firstTime: string, freq: '8h' | '12h' | '24h'): string[] {
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

  async function saveTherapy() {
    if (!tName.trim() || !tStartDate) { setTErr('Inserisci nome e data inizio'); return; }
    const picked = await pickMember();
    if (picked.prompted && picked.id === null) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addTherapy({
      name: tName.trim(),
      dose: tDose.trim() || undefined,
      frequency: tFrequency,
      time: tTime,
      startDate: tStartDate,
      endDate: tEndDate || undefined,
      notes: tNotes.trim() || undefined,
      memberId: picked.id ?? undefined,
    });
    setTName(''); setTDose(''); setTFrequency('24h'); setTTime('08:00'); setTStartDate(''); setTEndDate(''); setTNotes(''); setTErr('');
    setShowTherapyModal(false);
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
        <View style={{ marginRight: 8 }}>
          <MemberSwitcher kind="pet" accent={ACCENT} variant="compact" />
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
            <Text style={styles.gridCount}>{filteredVaccines.length}</Text>
            <Text style={styles.gridLabel}>Vaccini</Text>
          </Pressable>
          <Pressable style={styles.gridCell} onPress={() => openAndScroll('anti', antiparasiticsRef)}>
            <Text style={styles.gridEmoji}>🦟</Text>
            <Text style={styles.gridCount}>{filteredAntiparasitics.length}</Text>
            <Text style={styles.gridLabel}>Antipar.</Text>
          </Pressable>
          <Pressable style={styles.gridCell} onPress={() => openAndScroll('checks', checksRef)}>
            <Text style={styles.gridEmoji}>🩺</Text>
            <Text style={styles.gridCount}>{filteredChecks.length}</Text>
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
              <Text style={styles.accordionCount}>{filteredVaccines.length}</Text>
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
          {sectionsOpen.vaccines && (filteredVaccines.length === 0 ? (
            <Pressable style={styles.emptyCard} onPress={() => setShowVaccineModal(true)}>
              <Text style={styles.emptyText}>Nessun vaccino registrato</Text>
              <Text style={styles.emptyAction}>Tocca + per aggiungere</Text>
            </Pressable>
          ) : (
            filteredVaccines.map((v) => {
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
                  <View style={styles.statusBtnRow}>
                    <Pressable
                      style={[styles.statusBtn, v.status === 'done' && { backgroundColor: GREEN }]}
                      onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setVaccineStatus(v.id, 'done'); }}
                    >
                      <Text style={[styles.statusBtnTxt, v.status === 'done' && { color: '#fff' }]}>✅ Fatto</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.statusBtn, v.status === 'not_done' && { backgroundColor: RED }]}
                      onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setVaccineStatus(v.id, 'not_done'); }}
                    >
                      <Text style={[styles.statusBtnTxt, v.status === 'not_done' && { color: '#fff' }]}>❌ Non fatto</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.statusBtn, v.status === 'postponed' && { backgroundColor: ORANGE }]}
                      onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setPostponeModal({ kind: 'vaccine', id: v.id }); setPostponeDate(''); }}
                    >
                      <Text style={[styles.statusBtnTxt, v.status === 'postponed' && { color: '#fff' }]}>⏰ Rimandato</Text>
                    </Pressable>
                  </View>
                  {v.status === 'postponed' && v.postponedUntil && (
                    <Text style={styles.postponedLabel}>Rinviato al: {v.postponedUntil}</Text>
                  )}
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
                      <View style={styles.cardActions}>
                        <Pressable
                          style={styles.editBtn}
                          onPress={() => openEditVaccine(v)}
                        >
                          <Ionicons name="pencil-outline" size={14} color={ACCENT} />
                          <Text style={styles.editBtnTxt}>Modifica</Text>
                        </Pressable>
                        <Pressable
                          style={styles.deleteBtn}
                          onPress={() => confirmRemoveVaccine(v.id, v.name)}
                        >
                          <Ionicons name="trash-outline" size={14} color={RED} />
                          <Text style={styles.deleteBtnTxt}>Elimina</Text>
                        </Pressable>
                      </View>
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
              <Text style={styles.accordionCount}>{filteredAntiparasitics.length}</Text>
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
          {sectionsOpen.anti && (filteredAntiparasitics.length === 0 ? (
            <Pressable style={styles.emptyCard} onPress={() => setShowAntiModal(true)}>
              <Text style={styles.emptyText}>Nessun trattamento registrato</Text>
              <Text style={styles.emptyAction}>Tocca + per aggiungere</Text>
            </Pressable>
          ) : (
            filteredAntiparasitics.map((a) => {
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
                    <Pressable hitSlop={8} onPress={() => openEditAnti(a)}>
                      <Ionicons name="pencil-outline" size={16} color={ACCENT} />
                    </Pressable>
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
                  <View style={styles.statusBtnRow}>
                    <Pressable
                      style={[styles.statusBtn, a.status === 'done' && { backgroundColor: GREEN }]}
                      onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setAntiparasiticStatus(a.id, 'done'); }}
                    >
                      <Text style={[styles.statusBtnTxt, a.status === 'done' && { color: '#fff' }]}>✅ Fatto</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.statusBtn, a.status === 'not_done' && { backgroundColor: RED }]}
                      onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setAntiparasiticStatus(a.id, 'not_done'); }}
                    >
                      <Text style={[styles.statusBtnTxt, a.status === 'not_done' && { color: '#fff' }]}>❌ Non fatto</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.statusBtn, a.status === 'postponed' && { backgroundColor: ORANGE }]}
                      onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setPostponeModal({ kind: 'anti', id: a.id }); setPostponeDate(''); }}
                    >
                      <Text style={[styles.statusBtnTxt, a.status === 'postponed' && { color: '#fff' }]}>⏰ Rimandato</Text>
                    </Pressable>
                  </View>
                  {a.status === 'postponed' && a.postponedUntil && (
                    <Text style={styles.postponedLabel}>Rinviato al: {a.postponedUntil}</Text>
                  )}
                </Pressable>
              );
            })
          ))}
        </View>

        <View ref={checksRef} style={{ marginTop: 24 }}>
          <Pressable style={styles.accordionHeader} onPress={() => toggleSection('checks')}>
            <Text style={styles.sectionTitle}>Controlli preventivi</Text>
            <View style={styles.accordionRight}>
              <Text style={styles.accordionCount}>{filteredChecks.length}</Text>
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
          {sectionsOpen.checks && (filteredChecks.length === 0 ? (
            <Pressable style={styles.emptyCard} onPress={() => setShowCheckModal(true)}>
              <Text style={styles.emptyText}>Nessun controllo registrato</Text>
              <Text style={styles.emptyAction}>Tocca + per aggiungere</Text>
            </Pressable>
          ) : (
            filteredChecks.map((c) => {
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
                  <View style={styles.statusBtnRow}>
                    <Pressable
                      style={[styles.statusBtn, c.status === 'done' && { backgroundColor: GREEN }]}
                      onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setCheckStatus(c.id, 'done'); }}
                    >
                      <Text style={[styles.statusBtnTxt, c.status === 'done' && { color: '#fff' }]}>✅ Fatto</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.statusBtn, c.status === 'not_done' && { backgroundColor: RED }]}
                      onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setCheckStatus(c.id, 'not_done'); }}
                    >
                      <Text style={[styles.statusBtnTxt, c.status === 'not_done' && { color: '#fff' }]}>❌ Non fatto</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.statusBtn, c.status === 'postponed' && { backgroundColor: ORANGE }]}
                      onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setPostponeModal({ kind: 'check', id: c.id }); setPostponeDate(''); }}
                    >
                      <Text style={[styles.statusBtnTxt, c.status === 'postponed' && { color: '#fff' }]}>⏰ Rimandato</Text>
                    </Pressable>
                  </View>
                  {c.status === 'postponed' && c.postponedUntil && (
                    <Text style={styles.postponedLabel}>Rinviato al: {c.postponedUntil}</Text>
                  )}
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
                      <View style={styles.cardActions}>
                        <Pressable
                          style={styles.editBtn}
                          onPress={() => openEditCheck(c)}
                        >
                          <Ionicons name="pencil-outline" size={14} color={ACCENT} />
                          <Text style={styles.editBtnTxt}>Modifica</Text>
                        </Pressable>
                        <Pressable
                          style={styles.deleteBtn}
                          onPress={() => confirmRemoveCheck(c.id, c.name)}
                        >
                          <Ionicons name="trash-outline" size={14} color={RED} />
                          <Text style={styles.deleteBtnTxt}>Elimina</Text>
                        </Pressable>
                      </View>
                    </View>
                  )}
                </Pressable>
              );
            })
          ))}
        </View>

        <View ref={therapyRef} style={{ marginTop: 24 }}>
          <Pressable style={styles.accordionHeader} onPress={() => toggleSection('therapy')}>
            <Text style={styles.sectionTitle}>Terapia 💊</Text>
            <View style={styles.accordionRight}>
              <Text style={styles.accordionCount}>{filteredTherapies.length}</Text>
              <Pressable onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowTherapyModal(true); }} hitSlop={8}>
                <Ionicons name="add-circle-outline" size={22} color={ACCENT} />
              </Pressable>
              <Ionicons name={sectionsOpen.therapy ? 'chevron-up' : 'chevron-down'} size={18} color={MUTED} />
            </View>
          </Pressable>
          {sectionsOpen.therapy && <View style={{ height: 10 }} />}
          {sectionsOpen.therapy && (filteredTherapies.length === 0 ? (
            <Pressable style={styles.emptyCard} onPress={() => setShowTherapyModal(true)}>
              <Text style={styles.emptyText}>Nessuna terapia attiva</Text>
              <Text style={styles.emptyAction}>Tocca + per aggiungere</Text>
            </Pressable>
          ) : (
            filteredTherapies.map((t) => {
              const freqLabel = t.frequency === '8h' ? '3x/giorno' : t.frequency === '12h' ? '2x/giorno' : '1x/giorno';
              const times = calcTimesLocal(t.time, t.frequency);
              return (
                <View key={t.id} style={styles.card}>
                  <View style={styles.cardRow}>
                    <View style={[styles.cardIcon, { backgroundColor: '#EDE9FE' }]}>
                      <Text>💊</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle}>{t.name}{t.dose ? ` ${t.dose}` : ''}</Text>
                      <Text style={styles.cardSub}>{freqLabel} · {times.join(', ')}</Text>
                      {t.endDate ? (
                        <Text style={[styles.cardSub, { marginTop: 2 }]}>{formatDateShort(t.startDate)} → {formatDateShort(t.endDate)}</Text>
                      ) : (
                        <Text style={[styles.cardSub, { marginTop: 2 }]}>Dal {formatDateShort(t.startDate)}</Text>
                      )}
                    </View>
                    <Pressable hitSlop={8} onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); removeTherapy(t.id); }}>
                      <Ionicons name="trash-outline" size={16} color={RED} />
                    </Pressable>
                  </View>
                </View>
              );
            })
          ))}
        </View>

        {/* CONCLUSI */}
        <View style={{ marginTop: 24 }}>
          <Pressable style={styles.accordionHeader} onPress={() => toggleSection('completed')}>
            <Text style={styles.sectionTitle}>✅ Conclusi</Text>
            <View style={styles.accordionRight}>
              <Text style={styles.accordionCount}>{completedItems.length}</Text>
              <Ionicons name={sectionsOpen.completed ? 'chevron-up' : 'chevron-down'} size={18} color={MUTED} />
            </View>
          </Pressable>
          {sectionsOpen.completed && <View style={{ height: 10 }} />}
          {sectionsOpen.completed && (completedItems.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>Niente concluso al momento</Text>
            </View>
          ) : (
            completedItems.map((it) => (
              <View key={`${it.kind}_${it.id}`} style={styles.card}>
                <View style={styles.cardRow}>
                  <View style={[styles.cardIcon, { backgroundColor: '#DCFCE7' }]}>
                    <Text>{it.kind === 'v' ? '💉' : it.kind === 'a' ? '🦟' : '🩺'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{it.name}</Text>
                    <Text style={styles.cardSub}>{it.type} · effettuato {formatDateShort(it.date)}</Text>
                  </View>
                  <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: '#DCFCE7' }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#16A34A' }}>Fatto ✓</Text>
                  </View>
                </View>
              </View>
            ))
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
          style={styles.quickActionBtn}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowTherapyModal(true);
          }}
        >
          <Text style={styles.quickActionEmoji}>💊</Text>
          <Text style={styles.quickActionLabel}>Terapia</Text>
        </Pressable>
        <Pressable
          style={styles.quickActionBtn}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowTherapyModal(true);
          }}
        >
          <Text style={styles.quickActionEmoji}>💊</Text>
          <Text style={styles.quickActionLabel}>Terapia</Text>
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

      <Modal visible={showVaccineModal} transparent animationType="slide" onRequestClose={() => { setShowVaccineModal(false); setEditingVaccineId(null); setVErr(''); }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <Pressable style={styles.modalOverlay} onPress={() => { setShowVaccineModal(false); setEditingVaccineId(null); setVErr(''); }} />
          <View style={styles.modalSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.modalTitle}>{editingVaccineId ? 'Modifica vaccino' : 'Aggiungi vaccino'}</Text>
            <Text style={styles.modalSub}>Inserisci i dati del vaccino di {petName}</Text>
            {vErr ? <Text style={styles.modalErr}>{vErr}</Text> : null}

            <TextInput
              style={styles.modalInput}
              value={vName}
              onChangeText={setVName}
              placeholder="Nome vaccino (es. Trivalente)"
              placeholderTextColor={MUTED}
            />
            <Pressable style={[styles.modalInput, { marginTop: 10 }]} onPress={() => setPickerOpen('vDate')}>
              <Text style={vDate ? styles.modalInputTxt : styles.modalInputPh}>
                {vDate ? `Applicazione: ${formatDateShort(vDate)}` : 'Data applicazione'}
              </Text>
            </Pressable>
            <Pressable style={[styles.modalInput, { marginTop: 10 }]} onPress={() => setPickerOpen('vNext')}>
              <Text style={vNextDate ? styles.modalInputTxt : styles.modalInputPh}>
                {vNextDate ? `Prossima dose: ${formatDateShort(vNextDate)}` : 'Prossima dose — opzionale'}
              </Text>
            </Pressable>
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
              <Text style={styles.saveBtnTxt}>{editingVaccineId ? 'Aggiorna vaccino' : 'Salva vaccino'}</Text>
            </Pressable>
            <Pressable style={styles.cancelBtn} onPress={() => { setShowVaccineModal(false); setEditingVaccineId(null); setVErr(''); }}>
              <Text style={styles.cancelBtnTxt}>Annulla</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showAntiModal} transparent animationType="slide" onRequestClose={() => { setShowAntiModal(false); setEditingAntiId(null); setAErr(''); }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <Pressable style={styles.modalOverlay} onPress={() => { setShowAntiModal(false); setEditingAntiId(null); setAErr(''); }} />
          <View style={styles.modalSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.modalTitle}>{editingAntiId ? 'Modifica antiparassitario' : 'Aggiungi antiparassitario'}</Text>
            <Text style={styles.modalSub}>Trattamento per {petName}</Text>
            {aErr ? <Text style={styles.modalErr}>{aErr}</Text> : null}

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

            <Pressable style={[styles.modalInput, { marginTop: 10 }]} onPress={() => setPickerOpen('aApplied')}>
              <Text style={aDateApplied ? styles.modalInputTxt : styles.modalInputPh}>
                {aDateApplied ? `Applicazione: ${formatDateShort(aDateApplied)}` : 'Data applicazione'}
              </Text>
            </Pressable>
            <Pressable style={[styles.modalInput, { marginTop: 10 }]} onPress={() => setPickerOpen('aNext')}>
              <Text style={aNextDate ? styles.modalInputTxt : styles.modalInputPh}>
                {aNextDate ? `Prossima dose: ${formatDateShort(aNextDate)}` : 'Prossima dose'}
              </Text>
            </Pressable>
            <TextInput
              style={[styles.modalInput, { marginTop: 10 }]}
              value={aNotes}
              onChangeText={setANotes}
              placeholder="Note — opzionale"
              placeholderTextColor={MUTED}
            />
            <View style={{ height: 16 }} />
            <Pressable style={[styles.saveBtn, { backgroundColor: ACCENT }]} onPress={saveAntiparasitic}>
              <Text style={styles.saveBtnTxt}>{editingAntiId ? 'Aggiorna trattamento' : 'Salva trattamento'}</Text>
            </Pressable>
            <Pressable style={styles.cancelBtn} onPress={() => { setShowAntiModal(false); setEditingAntiId(null); setAErr(''); }}>
              <Text style={styles.cancelBtnTxt}>Annulla</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showCheckModal} transparent animationType="slide" onRequestClose={() => { setShowCheckModal(false); setEditingCheckId(null); setCErr(''); }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <Pressable style={styles.modalOverlay} onPress={() => { setShowCheckModal(false); setEditingCheckId(null); setCErr(''); }} />
          <View style={styles.modalSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.modalTitle}>{editingCheckId ? 'Modifica controllo' : 'Aggiungi controllo'}</Text>
            <Text style={styles.modalSub}>Visita o esame preventivo</Text>
            {cErr ? <Text style={styles.modalErr}>{cErr}</Text> : null}

            <TextInput
              style={styles.modalInput}
              value={cName}
              onChangeText={setCName}
              placeholder="Tipo visita (es. Visita annuale)"
              placeholderTextColor={MUTED}
            />
            <Pressable style={[styles.modalInput, { marginTop: 10 }]} onPress={() => setPickerOpen('cDate')}>
              <Text style={cDate ? styles.modalInputTxt : styles.modalInputPh}>
                {cDate ? `Visita: ${formatDateShort(cDate)}` : 'Data visita'}
              </Text>
            </Pressable>
            <Pressable style={[styles.modalInput, { marginTop: 10 }]} onPress={() => setPickerOpen('cNext')}>
              <Text style={cNextDate ? styles.modalInputTxt : styles.modalInputPh}>
                {cNextDate ? `Prossima visita: ${formatDateShort(cNextDate)}` : 'Prossima visita — opzionale'}
              </Text>
            </Pressable>
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
              <Text style={styles.saveBtnTxt}>{editingCheckId ? 'Aggiorna controllo' : 'Salva controllo'}</Text>
            </Pressable>
            <Pressable style={styles.cancelBtn} onPress={() => { setShowCheckModal(false); setEditingCheckId(null); setCErr(''); }}>
              <Text style={styles.cancelBtnTxt}>Annulla</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showTherapyModal} transparent animationType="slide" onRequestClose={() => { setShowTherapyModal(false); setTErr(''); }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <Pressable style={styles.modalOverlay} onPress={() => { setShowTherapyModal(false); setTErr(''); }} />
          <ScrollView style={styles.modalSheet} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
            <View style={styles.sheetHandle} />
            <Text style={styles.modalTitle}>Nuova terapia</Text>
            <Text style={styles.modalSub}>Farmaco o cura per {petName}</Text>
            {tErr ? <Text style={styles.modalErr}>{tErr}</Text> : null}

            <TextInput style={styles.modalInput} value={tName} onChangeText={setTName} placeholder="Nome farmaco (es. Antibiotico)" placeholderTextColor={MUTED} />
            <TextInput style={[styles.modalInput, { marginTop: 10 }]} value={tDose} onChangeText={setTDose} placeholder="Dose — opzionale (es. 250mg)" placeholderTextColor={MUTED} />

            <View style={[styles.chipRow, { marginTop: 10 }]}>
              {([{ value: '24h', label: '1x/giorno' }, { value: '12h', label: '2x/giorno' }, { value: '8h', label: '3x/giorno' }] as const).map((opt) => (
                <Pressable key={opt.value} style={[styles.typeChip, tFrequency === opt.value && { backgroundColor: ACCENT, borderColor: ACCENT }]}
                  onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setTFrequency(opt.value); }}>
                  <Text style={[styles.typeChipTxt, tFrequency === opt.value && { color: '#fff' }]}>{opt.label}</Text>
                </Pressable>
              ))}
            </View>

            <Pressable style={[styles.modalInput, { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }]} onPress={() => setShowTherapyTimePicker(true)}>
              <Ionicons name="time-outline" size={18} color={ACCENT} />
              <Text style={styles.modalInputTxt}>Primo orario: {tTime}</Text>
            </Pressable>

            <Pressable style={[styles.modalInput, { marginTop: 10 }]} onPress={() => setTPickerOpen('tStart')}>
              <Text style={tStartDate ? styles.modalInputTxt : styles.modalInputPh}>
                {tStartDate ? `Inizio: ${formatDateShort(tStartDate)}` : 'Data inizio terapia *'}
              </Text>
            </Pressable>
            <Pressable style={[styles.modalInput, { marginTop: 10 }]} onPress={() => setTPickerOpen('tEnd')}>
              <Text style={tEndDate ? styles.modalInputTxt : styles.modalInputPh}>
                {tEndDate ? `Fine: ${formatDateShort(tEndDate)}` : 'Data fine terapia — opzionale'}
              </Text>
            </Pressable>
            {tEndDate ? (
              <Pressable onPress={() => setTEndDate('')} style={{ alignSelf: 'flex-end', marginTop: 4 }}>
                <Text style={{ fontSize: 11, color: MUTED }}>Rimuovi data fine ✕</Text>
              </Pressable>
            ) : null}

            <TextInput style={[styles.modalInput, { marginTop: 10 }]} value={tNotes} onChangeText={setTNotes} placeholder="Note — opzionale" placeholderTextColor={MUTED} />
            <View style={{ height: 16 }} />
            <Pressable style={[styles.saveBtn, { backgroundColor: ACCENT }]} onPress={saveTherapy}>
              <Text style={styles.saveBtnTxt}>Salva terapia</Text>
            </Pressable>
            <Pressable style={styles.cancelBtn} onPress={() => { setShowTherapyModal(false); setTErr(''); }}>
              <Text style={styles.cancelBtnTxt}>Annulla</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={confirmDel !== null} transparent animationType="slide" onRequestClose={() => setConfirmDel(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setConfirmDel(null)} />
        <View style={styles.modalSheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.modalTitle}>Conferma eliminazione</Text>
          <Text style={[styles.modalSub, { marginBottom: 0 }]}>
            Rimuovere <Text style={{ fontWeight: '700', color: INK }}>{confirmDel?.name}</Text>?{'\n'}
            Questa operazione non può essere annullata.
          </Text>
          <View style={{ height: 20 }} />
          <Pressable style={[styles.saveBtn, { backgroundColor: RED }]} onPress={executeDelete}>
            <Text style={styles.saveBtnTxt}>Elimina</Text>
          </Pressable>
          <Pressable style={styles.cancelBtn} onPress={() => setConfirmDel(null)}>
            <Text style={styles.cancelBtnTxt}>Annulla</Text>
          </Pressable>
        </View>
      </Modal>

      <Modal visible={showTherapyModal} transparent animationType="slide" onRequestClose={() => { setShowTherapyModal(false); setTErr(''); }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <Pressable style={styles.modalOverlay} onPress={() => { setShowTherapyModal(false); setTErr(''); }} />
          <ScrollView style={styles.modalSheet} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
            <View style={styles.sheetHandle} />
            <Text style={styles.modalTitle}>Nuova terapia</Text>
            <Text style={styles.modalSub}>Farmaco o cura per {petName}</Text>
            {tErr ? <Text style={styles.modalErr}>{tErr}</Text> : null}

            <TextInput style={styles.modalInput} value={tName} onChangeText={setTName} placeholder="Nome farmaco (es. Antibiotico)" placeholderTextColor={MUTED} />
            <TextInput style={[styles.modalInput, { marginTop: 10 }]} value={tDose} onChangeText={setTDose} placeholder="Dose — opzionale (es. 250mg)" placeholderTextColor={MUTED} />

            <View style={[styles.chipRow, { marginTop: 10 }]}>
              {([{ value: '24h', label: '1x/giorno' }, { value: '12h', label: '2x/giorno' }, { value: '8h', label: '3x/giorno' }] as const).map((opt) => (
                <Pressable key={opt.value} style={[styles.typeChip, tFrequency === opt.value && { backgroundColor: ACCENT, borderColor: ACCENT }]}
                  onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setTFrequency(opt.value); }}>
                  <Text style={[styles.typeChipTxt, tFrequency === opt.value && { color: '#fff' }]}>{opt.label}</Text>
                </Pressable>
              ))}
            </View>

            <Pressable style={[styles.modalInput, { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }]} onPress={() => setShowTherapyTimePicker(true)}>
              <Ionicons name="time-outline" size={18} color={ACCENT} />
              <Text style={styles.modalInputTxt}>Primo orario: {tTime}</Text>
            </Pressable>

            <Pressable style={[styles.modalInput, { marginTop: 10 }]} onPress={() => setTPickerOpen('tStart')}>
              <Text style={tStartDate ? styles.modalInputTxt : styles.modalInputPh}>
                {tStartDate ? `Inizio: ${formatDateShort(tStartDate)}` : 'Data inizio terapia *'}
              </Text>
            </Pressable>
            <Pressable style={[styles.modalInput, { marginTop: 10 }]} onPress={() => setTPickerOpen('tEnd')}>
              <Text style={tEndDate ? styles.modalInputTxt : styles.modalInputPh}>
                {tEndDate ? `Fine: ${formatDateShort(tEndDate)}` : 'Data fine terapia — opzionale'}
              </Text>
            </Pressable>
            {tEndDate ? (
              <Pressable onPress={() => setTEndDate('')} style={{ alignSelf: 'flex-end', marginTop: 4 }}>
                <Text style={{ fontSize: 11, color: MUTED }}>Rimuovi data fine ✕</Text>
              </Pressable>
            ) : null}

            <TextInput style={[styles.modalInput, { marginTop: 10 }]} value={tNotes} onChangeText={setTNotes} placeholder="Note — opzionale" placeholderTextColor={MUTED} />
            <View style={{ height: 16 }} />
            <Pressable style={[styles.saveBtn, { backgroundColor: ACCENT }]} onPress={saveTherapy}>
              <Text style={styles.saveBtnTxt}>Salva terapia</Text>
            </Pressable>
            <Pressable style={styles.cancelBtn} onPress={() => { setShowTherapyModal(false); setTErr(''); }}>
              <Text style={styles.cancelBtnTxt}>Annulla</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <DateWheelModal
        visible={tPickerOpen !== null}
        value={tPickerOpen === 'tStart' ? (tStartDate || new Date().toISOString().slice(0, 10)) : (tEndDate || tStartDate || new Date().toISOString().slice(0, 10))}
        title={tPickerOpen === 'tStart' ? 'Data inizio terapia' : 'Data fine terapia'}
        accent={ACCENT}
        onConfirm={(date) => { if (tPickerOpen === 'tStart') setTStartDate(date); else setTEndDate(date); setTPickerOpen(null); }}
        onClose={() => setTPickerOpen(null)}
      />

      <TimeWheelModal
        visible={showTherapyTimePicker}
        value={tTime}
        onConfirm={(t) => { setTTime(t); setShowTherapyTimePicker(false); }}
        onClose={() => setShowTherapyTimePicker(false)}
        accent={ACCENT}
      />

      <DateWheelModal
        visible={postponeModal !== null}
        value={postponeDate}
        onConfirm={(date) => {
          if (!postponeModal) return;
          setPostponeDate(date);
          if (postponeModal.kind === 'vaccine') setVaccineStatus(postponeModal.id, 'postponed', date);
          else if (postponeModal.kind === 'anti') setAntiparasiticStatus(postponeModal.id, 'postponed', date);
          else setCheckStatus(postponeModal.id, 'postponed', date);
          setPostponeModal(null);
        }}
        onClose={() => setPostponeModal(null)}
        accent="#F59E0B"
        title="Riprogramma appuntamento"
      />

      <SectionChatModal
        visible={chatOpen}
        onClose={() => setChatOpen(false)}
        title="Assistente Prevenzione"
        accent={ACCENT}
        welcome={`Ciao! Sono il tuo assistente per la prevenzione di ${petName}.\nPosso aiutarti su vaccini, antiparassitari e controlli preventivi.`}
        buildContext={buildPreventionContext}
      />

      <DateWheelModal
        visible={pickerOpen !== null}
        value={pickerValue}
        title={pickerTitle}
        accent={ACCENT}
        onConfirm={setPickedDate}
        onClose={() => setPickerOpen(null)}
      />

      <DateWheelModal
        visible={tPickerOpen !== null}
        value={tPickerOpen === 'tStart' ? (tStartDate || new Date().toISOString().slice(0, 10)) : (tEndDate || tStartDate || new Date().toISOString().slice(0, 10))}
        title={tPickerOpen === 'tStart' ? 'Data inizio terapia' : 'Data fine terapia'}
        accent={ACCENT}
        onConfirm={(date) => { if (tPickerOpen === 'tStart') setTStartDate(date); else setTEndDate(date); setTPickerOpen(null); }}
        onClose={() => setTPickerOpen(null)}
      />

      <TimeWheelModal
        visible={showTherapyTimePicker}
        value={tTime}
        onConfirm={(t) => { setTTime(t); setShowTherapyTimePicker(false); }}
        onClose={() => setShowTherapyTimePicker(false)}
        accent={ACCENT}
      />

      <MemberPickerModal {...pickerProps} accent={ACCENT} />
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
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editBtnTxt: { fontSize: 12, fontWeight: '600', color: ACCENT },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deleteBtnTxt: { fontSize: 12, fontWeight: '600', color: RED },
  modalErr: {
    fontSize: 12,
    fontWeight: '600',
    color: RED,
    backgroundColor: RED_LIGHT,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },

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
  modalInputTxt: { fontSize: 15, color: INK, fontWeight: '600' },
  modalInputPh: { fontSize: 15, color: MUTED },
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

  statusBtnRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
  },
  statusBtn: {
    borderRadius: 99,
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: BORDER,
  },
  statusBtnTxt: {
    fontSize: 11,
    fontWeight: '600',
    color: INK,
  },
  postponedLabel: {
    fontSize: 11,
    color: ORANGE,
    fontWeight: '600',
    marginTop: 4,
  },
});
