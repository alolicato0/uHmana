import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
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
import { MemberPickerModal } from '../src/components/MemberPickerModal';
import { MemberSwitcher } from '../src/components/MemberSwitcher';
import { SectionChatModal } from '../src/components/SectionChatModal';
import { VetChatModal } from '../src/components/VetChatModal';
import { useMemberPicker } from '../src/hooks/useMemberPicker';
import { useMembersStore } from '../src/store/members';
import { useProfileStore } from '../src/store/profile';
import {
  usePetActivityStore,
  type AppetitoLevel,
  type AttivitaLevel,
  type EnergiaLevel,
  type IdratLevel,
  type MoodLevel,
  type SonnoLevel,
} from '../src/store/petActivity';
import { colors, radii } from '../src/theme';

// ─── Palette ─────────────────────────────────────────────────────────────────
const BG = '#FFF9F5';
const PINK = '#EC4899';
const EMERALD = '#10B981';
const AMBER = '#F59E0B';
const ORANGE = '#F97316';
const INK = '#1A1A2E';
const MUTED = '#6B7280';
const BORDER = '#E8EAF0';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const todayStr = () => new Date().toISOString().slice(0, 10);

const ITALIAN_DAYS = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];

function relativeDate(dateStr: string): string {
  const today = todayStr();
  if (dateStr === today) return 'oggi';
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (dateStr === yesterday.toISOString().slice(0, 10)) return 'ieri';
  const diff = Math.floor(
    (new Date(today).getTime() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24),
  );
  return `${diff} giorni fa`;
}

function statusColor(val: string): string {
  const positive = ['alta', 'ottimo', 'buono', 'ottima'];
  const neutral = ['media', 'regolare', 'normale', 'ok'];
  if (positive.includes(val)) return EMERALD;
  if (neutral.includes(val)) return AMBER;
  return ORANGE;
}

// ─── Modals ──────────────────────────────────────────────────────────────────

function ModalSheet({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={s.overlay} />
      </TouchableWithoutFeedback>
      <View style={s.sheet}>
        <View style={s.handle} />
        <View style={s.sheetHeader}>
          <Text style={s.sheetTitle}>{title}</Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={22} color={MUTED} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      </View>
    </Modal>
  );
}

function PillRow<T extends string>({
  options,
  selected,
  onSelect,
  accent = PINK,
}: {
  options: { value: T; label: string }[];
  selected: T;
  onSelect: (v: T) => void;
  accent?: string;
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
      {options.map((o) => (
        <Pressable
          key={o.value}
          onPress={() => {
            void Haptics.selectionAsync();
            onSelect(o.value);
          }}
          style={[
            s.pill,
            selected === o.value && { backgroundColor: accent, borderColor: accent },
          ]}
        >
          <Text
            style={[s.pillText, selected === o.value && { color: '#fff', fontWeight: '700' }]}
          >
            {o.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function StatusModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const activePetId = useMembersStore((s) => s.activePetId);
  const getTodayStatus = usePetActivityStore((s) => s.getTodayStatus);
  const setTodayStatus = usePetActivityStore((s) => s.setTodayStatus);
  const current = getTodayStatus(activePetId ?? undefined);
  const { pickMember, modalProps: pickerProps } = useMemberPicker('pet');

  const [energia, setEnergia] = useState<EnergiaLevel>(current?.energia ?? 'media');
  const [sonno, setSonno] = useState<SonnoLevel>(current?.sonno ?? 'regolare');
  const [appetito, setAppetito] = useState<AppetitoLevel>(current?.appetito ?? 'normale');
  const [attivita, setAttivita] = useState<AttivitaLevel>(current?.attivita ?? 'media');
  const [idratazione, setIdratazione] = useState<IdratLevel>(current?.idratazione ?? 'ok');

  const save = async () => {
    const picked = await pickMember();
    if (picked.prompted && picked.id === null) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTodayStatus({ energia, sonno, appetito, attivita, idratazione }, picked.id ?? undefined);
    onClose();
  };

  return (
    <ModalSheet visible={visible} onClose={onClose} title="Aggiorna stato">
      <Text style={s.rowLabel}>🐾 Energia</Text>
      <PillRow
        options={[
          { value: 'bassa' as EnergiaLevel, label: 'Bassa' },
          { value: 'media' as EnergiaLevel, label: 'Media' },
          { value: 'alta' as EnergiaLevel, label: 'Alta' },
        ]}
        selected={energia}
        onSelect={setEnergia}
        accent={EMERALD}
      />
      <Text style={[s.rowLabel, { marginTop: 16 }]}>😴 Sonno</Text>
      <PillRow
        options={[
          { value: 'scarso' as SonnoLevel, label: 'Scarso' },
          { value: 'regolare' as SonnoLevel, label: 'Regolare' },
          { value: 'ottimo' as SonnoLevel, label: 'Ottimo' },
        ]}
        selected={sonno}
        onSelect={setSonno}
        accent={EMERALD}
      />
      <Text style={[s.rowLabel, { marginTop: 16 }]}>🍖 Appetito</Text>
      <PillRow
        options={[
          { value: 'ridotto' as AppetitoLevel, label: 'Ridotto' },
          { value: 'normale' as AppetitoLevel, label: 'Normale' },
          { value: 'buono' as AppetitoLevel, label: 'Buono' },
        ]}
        selected={appetito}
        onSelect={setAppetito}
        accent={EMERALD}
      />
      <Text style={[s.rowLabel, { marginTop: 16 }]}>🎾 Attività</Text>
      <PillRow
        options={[
          { value: 'bassa' as AttivitaLevel, label: 'Bassa' },
          { value: 'media' as AttivitaLevel, label: 'Media' },
          { value: 'alta' as AttivitaLevel, label: 'Alta' },
        ]}
        selected={attivita}
        onSelect={setAttivita}
        accent={EMERALD}
      />
      <Text style={[s.rowLabel, { marginTop: 16 }]}>💧 Idratazione</Text>
      <PillRow
        options={[
          { value: 'scarsa' as IdratLevel, label: 'Scarsa' },
          { value: 'ok' as IdratLevel, label: 'Ok' },
          { value: 'ottima' as IdratLevel, label: 'Ottima' },
        ]}
        selected={idratazione}
        onSelect={setIdratazione}
        accent={EMERALD}
      />
      <Pressable style={[s.saveBtn, { backgroundColor: EMERALD, marginTop: 24 }]} onPress={save}>
        <Text style={s.saveBtnText}>Salva stato</Text>
      </Pressable>
      <MemberPickerModal {...pickerProps} accent={EMERALD} />
    </ModalSheet>
  );
}

function WalkModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const addActivity = usePetActivityStore((s) => s.addActivity);
  const activePetId = useMembersStore((s) => s.activePetId);
  const [duration, setDuration] = useState(30);
  const [note, setNote] = useState('');

  const durations = [15, 30, 45, 60, 90];

  const save = () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addActivity({
      type: 'passeggiata',
      date: new Date().toISOString(),
      durationMin: duration,
      note: note.trim() || undefined,
      memberId: activePetId ?? undefined,
    });
    setNote('');
    onClose();
  };

  return (
    <ModalSheet visible={visible} onClose={onClose} title="🚶 Passeggiata">
      <Text style={s.rowLabel}>Durata</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
        {durations.map((d) => (
          <Pressable
            key={d}
            onPress={() => setDuration(d)}
            style={[s.pill, duration === d && { backgroundColor: EMERALD, borderColor: EMERALD }]}
          >
            <Text style={[s.pillText, duration === d && { color: '#fff', fontWeight: '700' }]}>
              {d} min
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={[s.rowLabel, { marginTop: 16 }]}>Note (opzionale)</Text>
      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder="Dove siete andati? Come è andata?"
        placeholderTextColor={MUTED}
        style={s.textInput}
        multiline
        numberOfLines={3}
      />
      <Pressable style={[s.saveBtn, { backgroundColor: EMERALD, marginTop: 20 }]} onPress={save}>
        <Text style={s.saveBtnText}>Salva</Text>
      </Pressable>
    </ModalSheet>
  );
}

function SleepModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const addActivity = usePetActivityStore((s) => s.addActivity);
  const addMood = usePetActivityStore((s) => s.addMood);
  const activePetId = useMembersStore((s) => s.activePetId);
  const [hours, setHours] = useState(8);
  const [quality, setQuality] = useState<SonnoLevel>('regolare');
  const hourOptions = [4, 6, 8, 10, 12];

  const save = () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addActivity({
      type: 'altro',
      date: new Date().toISOString(),
      durationMin: hours * 60,
      note: `Sonno ${quality}`,
      memberId: activePetId ?? undefined,
    });
    const moodMap: Record<SonnoLevel, { level: MoodLevel; emoji: string }> = {
      scarso: { level: 'triste', emoji: '😢' },
      regolare: { level: 'normale', emoji: '😊' },
      ottimo: { level: 'felice', emoji: '😄' },
    };
    const m = moodMap[quality];
    addMood({
      level: m.level,
      emoji: m.emoji,
      date: todayStr(),
      note: `Dopo ${hours}h di sonno`,
      memberId: activePetId ?? undefined,
    });
    onClose();
  };

  return (
    <ModalSheet visible={visible} onClose={onClose} title="😴 Sonno">
      <Text style={s.rowLabel}>Ore di sonno</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
        {hourOptions.map((h) => (
          <Pressable
            key={h}
            onPress={() => setHours(h)}
            style={[s.pill, hours === h && { backgroundColor: AMBER, borderColor: AMBER }]}
          >
            <Text style={[s.pillText, hours === h && { color: '#fff', fontWeight: '700' }]}>
              {h}h
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={[s.rowLabel, { marginTop: 16 }]}>Qualità</Text>
      <PillRow
        options={[
          { value: 'scarso' as SonnoLevel, label: 'Scarso' },
          { value: 'regolare' as SonnoLevel, label: 'Regolare' },
          { value: 'ottimo' as SonnoLevel, label: 'Ottimo' },
        ]}
        selected={quality}
        onSelect={setQuality}
        accent={AMBER}
      />
      <Pressable style={[s.saveBtn, { backgroundColor: AMBER, marginTop: 24 }]} onPress={save}>
        <Text style={s.saveBtnText}>Salva</Text>
      </Pressable>
    </ModalSheet>
  );
}

function PlayModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const addActivity = usePetActivityStore((s) => s.addActivity);
  const activePetId = useMembersStore((s) => s.activePetId);
  const [duration, setDuration] = useState(20);
  const [note, setNote] = useState('');
  const durations = [10, 20, 30, 45, 60];

  const save = () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addActivity({
      type: 'gioco',
      date: new Date().toISOString(),
      durationMin: duration,
      note: note.trim() || undefined,
      memberId: activePetId ?? undefined,
    });
    setNote('');
    onClose();
  };

  return (
    <ModalSheet visible={visible} onClose={onClose} title="🎾 Gioco">
      <Text style={s.rowLabel}>Durata</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
        {durations.map((d) => (
          <Pressable
            key={d}
            onPress={() => setDuration(d)}
            style={[s.pill, duration === d && { backgroundColor: PINK, borderColor: PINK }]}
          >
            <Text style={[s.pillText, duration === d && { color: '#fff', fontWeight: '700' }]}>
              {d} min
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={[s.rowLabel, { marginTop: 16 }]}>Note (opzionale)</Text>
      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder="A cosa ha giocato?"
        placeholderTextColor={MUTED}
        style={s.textInput}
        multiline
        numberOfLines={3}
      />
      <Pressable style={[s.saveBtn, { backgroundColor: PINK, marginTop: 20 }]} onPress={save}>
        <Text style={s.saveBtnText}>Salva</Text>
      </Pressable>
    </ModalSheet>
  );
}

function BehaviorNoteModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const addMood = usePetActivityStore((s) => s.addMood);
  const activePetId = useMembersStore((s) => s.activePetId);
  const [note, setNote] = useState('');
  const [level, setLevel] = useState<MoodLevel>('normale');

  const moodOptions: { value: MoodLevel; label: string; emoji: string }[] = [
    { value: 'triste', label: 'Triste', emoji: '😢' },
    { value: 'normale', label: 'Normale', emoji: '😊' },
    { value: 'felice', label: 'Felice', emoji: '😄' },
    { value: 'eccitato', label: 'Eccitato', emoji: '🤩' },
  ];

  const save = () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const selected = moodOptions.find((m) => m.value === level)!;
    addMood({
      level,
      emoji: selected.emoji,
      date: todayStr(),
      note: note.trim() || undefined,
      memberId: activePetId ?? undefined,
    });
    setNote('');
    onClose();
  };

  return (
    <ModalSheet visible={visible} onClose={onClose} title="📝 Nota comportamento">
      <Text style={s.rowLabel}>Umore</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
        {moodOptions.map((m) => (
          <Pressable
            key={m.value}
            onPress={() => setLevel(m.value)}
            style={[s.pill, level === m.value && { backgroundColor: PINK, borderColor: PINK }]}
          >
            <Text style={[s.pillText, level === m.value && { color: '#fff', fontWeight: '700' }]}>
              {m.emoji} {m.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={[s.rowLabel, { marginTop: 16 }]}>Nota</Text>
      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder="Descrivi il comportamento osservato..."
        placeholderTextColor={MUTED}
        style={s.textInput}
        multiline
        numberOfLines={3}
      />
      <Pressable style={[s.saveBtn, { backgroundColor: PINK, marginTop: 20 }]} onPress={save}>
        <Text style={s.saveBtnText}>Salva</Text>
      </Pressable>
    </ModalSheet>
  );
}

function BehaviorFlagModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const addBehaviorFlag = usePetActivityStore((s) => s.addBehaviorFlag);
  const activePetId = useMembersStore((s) => s.activePetId);
  const [label, setLabel] = useState('');
  const [note, setNote] = useState('');

  const save = () => {
    if (!label.trim()) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addBehaviorFlag(label.trim(), note.trim() || undefined, activePetId ?? undefined);
    setLabel('');
    setNote('');
    onClose();
  };

  return (
    <ModalSheet visible={visible} onClose={onClose} title="Aggiungi segnalazione">
      <Text style={s.rowLabel}>Comportamento</Text>
      <TextInput
        value={label}
        onChangeText={setLabel}
        placeholder="Es. Non mangia, agitazione..."
        placeholderTextColor={MUTED}
        style={s.textInput}
      />
      <Text style={[s.rowLabel, { marginTop: 16 }]}>Note (opzionale)</Text>
      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder="Dettagli aggiuntivi..."
        placeholderTextColor={MUTED}
        style={s.textInput}
        multiline
        numberOfLines={3}
      />
      <Pressable
        style={[s.saveBtn, { backgroundColor: ORANGE, marginTop: 20, opacity: label.trim() ? 1 : 0.4 }]}
        onPress={save}
        disabled={!label.trim()}
      >
        <Text style={s.saveBtnText}>Aggiungi segnalazione</Text>
      </Pressable>
    </ModalSheet>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function ComportamentoScreen() {
  const getActiveProfile = useProfileStore((s) => s.getActiveProfile);
  const petName = getActiveProfile()?.name ?? 'il tuo animale';

  const getTodayStatus = usePetActivityStore((s) => s.getTodayStatus);
  const getWeekActivity = usePetActivityStore((s) => s.getWeekActivity);
  const getRecentMoods = usePetActivityStore((s) => s.getRecentMoods);
  const behaviorFlags = usePetActivityStore((s) => s.behaviorFlags);
  const aiInsight = usePetActivityStore((s) => s.aiInsight);
  const removeBehaviorFlag = usePetActivityStore((s) => s.removeBehaviorFlag);
  const setAiInsight = usePetActivityStore((s) => s.setAiInsight);

  const activePetId = useMembersStore((s) => s.activePetId);
  const todayStatus = getTodayStatus(activePetId ?? undefined);
  const weekActivity = getWeekActivity(activePetId ?? undefined);
  const recentMoods = getRecentMoods(5, activePetId ?? undefined);

  const [statusModal, setStatusModal] = useState(false);
  const [walkModal, setWalkModal] = useState(false);
  const [sleepModal, setSleepModal] = useState(false);
  const [playModal, setPlayModal] = useState(false);
  const [behaviorNoteModal, setBehaviorNoteModal] = useState(false);
  const [behaviorFlagModal, setBehaviorFlagModal] = useState(false);
  const [insightChat, setInsightChat] = useState(false);
  const [vetChat, setVetChat] = useState(false);

  // Hero card config
  type HeroConfig = {
    gradient: [string, string];
    icon: string;
    title: string;
    subtitle: string;
  };

  const heroConfig: HeroConfig = (() => {
    if (!todayStatus) {
      return {
        gradient: [PINK, '#F472B6'] as [string, string],
        icon: '🐾',
        title: `Come sta ${petName} oggi?`,
        subtitle: 'Registra il suo stato quotidiano',
      };
    }
    if (todayStatus.energia === 'alta' && todayStatus.appetito !== 'ridotto') {
      return {
        gradient: [EMERALD, '#34D399'] as [string, string],
        icon: '🐾',
        title: `${petName} è molto attiva oggi`,
        subtitle: 'Energia alta · Umore positivo',
      };
    }
    if (todayStatus.energia === 'media') {
      return {
        gradient: [AMBER, '#FBBF24'] as [string, string],
        icon: '😊',
        title: 'Energia nella norma',
        subtitle: 'Tutto regolare per oggi',
      };
    }
    return {
      gradient: [ORANGE, '#EF4444'] as [string, string],
      icon: '⚠️',
      title: 'Energia ridotta',
      subtitle: 'Meno attiva rispetto alla norma',
    };
  })();

  const maxActivityMin = Math.max(...weekActivity.map((d) => d.totalMin), 1);
  const MAX_BAR_HEIGHT = 60;

  const buildContext = () => {
    const lines: string[] = [`Animale: ${petName}`];
    if (todayStatus) {
      lines.push(
        `Stato oggi: Energia=${todayStatus.energia}, Sonno=${todayStatus.sonno}, Appetito=${todayStatus.appetito}, Attività=${todayStatus.attivita}, Idratazione=${todayStatus.idratazione}`,
      );
    }
    lines.push(
      `Attività settimana: ${weekActivity.map((d) => `${d.date}=${d.totalMin}min`).join(', ')}`,
    );
    const moods = getRecentMoods(10, activePetId ?? undefined);
    if (moods.length > 0) {
      lines.push(`Umore recente: ${moods.map((m) => `${m.date} ${m.emoji} ${m.level}${m.note ? ' - ' + m.note : ''}`).join('; ')}`);
    }
    if (behaviorFlags.length > 0) {
      lines.push(`Segnalazioni comportamento: ${behaviorFlags.map((f) => f.label).join(', ')}`);
    }
    return lines.join('\n');
  };

  const PRESET_BEHAVIORS = [
    'Apatia persistente',
    'Agitazione o irritabilità',
    'Isolamento',
    'Sonno eccessivo',
    'Perdita appetito',
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={s.header}>
          <Pressable onPress={() => router.back()} hitSlop={10} style={s.backBtn}>
            <Ionicons name="arrow-back" size={22} color={INK} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>🐕 Attività & Umore</Text>
            <Text style={s.headerSub}>
              Energia, comportamento e benessere di {petName}
            </Text>
          </View>
          <MemberSwitcher kind="pet" accent={EMERALD} variant="compact" />
        </View>

        <View style={{ paddingHorizontal: 16, gap: 20 }}>
          {/* ── Hero Card ── */}
          <LinearGradient
            colors={heroConfig.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.heroCard}
          >
            <View style={s.heroTop}>
              <View style={s.heroIconCircle}>
                <Text style={{ fontSize: 32 }}>{heroConfig.icon}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={s.heroTitle}>{heroConfig.title}</Text>
                <Text style={s.heroSub}>{heroConfig.subtitle}</Text>
              </View>
            </View>
            <View style={s.heroBtns}>
              <Pressable
                style={s.heroBtn}
                onPress={() => {
                  void Haptics.selectionAsync();
                  setStatusModal(true);
                }}
              >
                <Text style={s.heroBtnText}>Aggiorna stato</Text>
              </Pressable>
              <Pressable
                style={[s.heroBtn, { backgroundColor: 'rgba(255,255,255,0.15)' }]}
                onPress={() => {
                  void Haptics.selectionAsync();
                  setInsightChat(true);
                }}
              >
                <Text style={s.heroBtnText}>🧠 Insight AI</Text>
              </Pressable>
            </View>
            {todayStatus && (
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                {[
                  { label: `⚡ ${todayStatus.energia}` },
                  { label: `🍖 ${todayStatus.appetito}` },
                  { label: `🎾 ${todayStatus.attivita}` },
                ].map((chip) => (
                  <View key={chip.label} style={s.heroChip}>
                    <Text style={s.heroChipText}>{chip.label}</Text>
                  </View>
                ))}
              </View>
            )}
          </LinearGradient>

          {/* ── Stato Oggi ── */}
          <View>
            <Text style={s.sectionTitle}>Stato di oggi</Text>
            <Pressable style={s.card} onPress={() => setStatusModal(true)}>
              {[
                { icon: '🐾', label: 'Energia', val: todayStatus?.energia },
                { icon: '😴', label: 'Sonno', val: todayStatus?.sonno },
                { icon: '🍖', label: 'Appetito', val: todayStatus?.appetito },
                { icon: '🎾', label: 'Attività', val: todayStatus?.attivita },
                { icon: '💧', label: 'Idratazione', val: todayStatus?.idratazione },
              ].map((row, i) => (
                <View
                  key={row.label}
                  style={[
                    s.statusRow,
                    i < 4 && { borderBottomWidth: 1, borderBottomColor: BORDER },
                  ]}
                >
                  <Text style={s.statusIcon}>{row.icon}</Text>
                  <Text style={s.statusLabel}>{row.label}</Text>
                  <Text
                    style={[
                      s.statusVal,
                      { color: row.val ? statusColor(row.val) : MUTED },
                    ]}
                  >
                    {row.val ?? '—'}
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color={MUTED} />
                </View>
              ))}
            </Pressable>
          </View>

          {/* ── Quick Actions ── */}
          <View>
            <Text style={s.sectionTitle}>Registra</Text>
            <View style={s.grid}>
              {[
                {
                  icon: '🚶',
                  title: 'Passeggiata',
                  sub: 'Durata e attività',
                  color: EMERALD,
                  bg: '#DCFCE7',
                  onPress: () => setWalkModal(true),
                },
                {
                  icon: '😴',
                  title: 'Sonno',
                  sub: 'Qualità del riposo',
                  color: AMBER,
                  bg: '#FEF3C7',
                  onPress: () => setSleepModal(true),
                },
                {
                  icon: '🎾',
                  title: 'Gioco',
                  sub: 'Sessione di gioco',
                  color: PINK,
                  bg: '#FCE7F3',
                  onPress: () => setPlayModal(true),
                },
                {
                  icon: '📝',
                  title: 'Comportamento',
                  sub: 'Note e osservazioni',
                  color: ORANGE,
                  bg: '#FFEDD5',
                  onPress: () => setBehaviorNoteModal(true),
                },
              ].map((item) => (
                <Pressable
                  key={item.title}
                  style={s.gridCard}
                  onPress={() => {
                    void Haptics.selectionAsync();
                    item.onPress();
                  }}
                >
                  <View style={[s.gridIconCircle, { backgroundColor: item.bg }]}>
                    <Text style={{ fontSize: 22 }}>{item.icon}</Text>
                  </View>
                  <Text style={s.gridTitle}>{item.title}</Text>
                  <Text style={s.gridSub}>{item.sub}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* ── AI Insight ── */}
          <View>
            <Text style={s.sectionTitle}>🧠 Insight AI</Text>
            <View style={s.card}>
              <Text style={{ fontSize: 14, color: aiInsight ? INK : MUTED, lineHeight: 21 }}>
                {aiInsight ||
                  `Registra le attività di ${petName} per ottenere insight personalizzati dall'AI`}
              </Text>
              <Pressable
                style={[s.saveBtn, { backgroundColor: PINK, marginTop: 14 }]}
                onPress={() => {
                  void Haptics.selectionAsync();
                  setInsightChat(true);
                }}
              >
                <Text style={s.saveBtnText}>Aggiorna insight</Text>
              </Pressable>
            </View>
          </View>

          {/* ── Attività Settimanale ── */}
          <View>
            <Text style={s.sectionTitle}>Attività settimanale</Text>
            <View style={s.card}>
              {weekActivity.every((d) => d.totalMin === 0) ? (
                <Text style={{ fontSize: 14, color: MUTED, textAlign: 'center', paddingVertical: 12 }}>
                  Nessuna attività registrata questa settimana
                </Text>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 80 }}>
                  {weekActivity.map((day) => {
                    const barH =
                      day.totalMin > 0
                        ? Math.max(4, (day.totalMin / maxActivityMin) * MAX_BAR_HEIGHT)
                        : 4;
                    const barColor =
                      day.totalMin > 30 ? EMERALD : day.totalMin > 0 ? AMBER : '#E5E7EB';
                    const dayOfWeek = new Date(day.date + 'T12:00:00').getDay();
                    return (
                      <View
                        key={day.date}
                        style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}
                      >
                        <View
                          style={{
                            width: '70%',
                            height: barH,
                            backgroundColor: barColor,
                            borderRadius: 4,
                          }}
                        />
                        <Text
                          style={{ fontSize: 10, color: MUTED, marginTop: 4, fontWeight: '500' }}
                        >
                          {ITALIAN_DAYS[dayOfWeek]}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </View>

          {/* ── Storico Umore ── */}
          <View>
            <Text style={s.sectionTitle}>Storico umore</Text>
            <View style={s.card}>
              {recentMoods.length === 0 ? (
                <Text style={{ fontSize: 14, color: MUTED }}>Nessun dato umore registrato</Text>
              ) : (
                recentMoods.map((m) => (
                  <View key={m.id} style={[s.moodRow]}>
                    <Text style={{ fontSize: 22 }}>{m.emoji}</Text>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: INK, textTransform: 'capitalize' }}>
                        {m.level}
                      </Text>
                      {m.note && (
                        <Text style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{m.note}</Text>
                      )}
                    </View>
                    <Text style={{ fontSize: 12, color: MUTED }}>{relativeDate(m.date)}</Text>
                  </View>
                ))
              )}
            </View>
          </View>

          {/* ── Comportamenti da monitorare ── */}
          <View>
            <Text style={s.sectionTitle}>⚠️ Da monitorare</Text>
            <View style={s.card}>
              <Text style={{ fontSize: 13, color: MUTED, marginBottom: 10 }}>
                Segnali da tenere d'occhio:
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {PRESET_BEHAVIORS.map((b) => (
                  <View key={b} style={s.presetChip}>
                    <Text style={s.presetChipText}>{b}</Text>
                  </View>
                ))}
              </View>
              {behaviorFlags.length > 0 && (
                <View style={{ marginTop: 16, gap: 8 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: ORANGE }}>
                    Segnalazioni attive
                  </Text>
                  {behaviorFlags.map((f) => (
                    <View key={f.id} style={s.flagRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: INK }}>
                          {f.label}
                        </Text>
                        <Text style={{ fontSize: 12, color: MUTED }}>
                          {new Date(f.flaggedAt).toLocaleDateString('it-IT')}
                          {f.note ? ` · ${f.note}` : ''}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => {
                          void Haptics.selectionAsync();
                          removeBehaviorFlag(f.id);
                        }}
                        hitSlop={10}
                        style={s.flagRemove}
                      >
                        <Ionicons name="close" size={16} color={MUTED} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
              <Pressable
                style={[s.saveBtn, { backgroundColor: ORANGE, marginTop: 16 }]}
                onPress={() => {
                  void Haptics.selectionAsync();
                  setBehaviorFlagModal(true);
                }}
              >
                <Text style={s.saveBtnText}>Aggiungi segnalazione</Text>
              </Pressable>
            </View>
          </View>

          {/* ── Bottom CTA ── */}
          <Pressable
            style={[s.saveBtn, { backgroundColor: EMERALD, marginTop: 4 }]}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setVetChat(true);
            }}
          >
            <Text style={s.saveBtnText}>💬 Chat Vet</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* ── Modals ── */}
      <StatusModal visible={statusModal} onClose={() => setStatusModal(false)} />
      <WalkModal visible={walkModal} onClose={() => setWalkModal(false)} />
      <SleepModal visible={sleepModal} onClose={() => setSleepModal(false)} />
      <PlayModal visible={playModal} onClose={() => setPlayModal(false)} />
      <BehaviorNoteModal visible={behaviorNoteModal} onClose={() => setBehaviorNoteModal(false)} />
      <BehaviorFlagModal visible={behaviorFlagModal} onClose={() => setBehaviorFlagModal(false)} />

      <SectionChatModal
        visible={insightChat}
        onClose={() => setInsightChat(false)}
        title="🧠 Insight AI Comportamento"
        accent={PINK}
        welcome={`Sono qui per aiutarti a capire il comportamento e il benessere di ${petName}. Puoi chiedermi analisi sui pattern di attività, sonno, umore e comportamento.`}
        buildContext={buildContext}
        onAssistantReply={(text) => setAiInsight(text)}
      />

      <VetChatModal
        visible={vetChat}
        onClose={() => setVetChat(false)}
        petName={petName}
      />
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BORDER,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: INK },
  headerSub: { fontSize: 12, color: MUTED, marginTop: 2 },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: INK, marginBottom: 10 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
  },

  heroCard: { borderRadius: 24, padding: 20 },
  heroTop: { flexDirection: 'row', alignItems: 'center' },
  heroIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 3 },
  heroBtns: { flexDirection: 'row', gap: 10, marginTop: 16 },
  heroBtn: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  heroBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  heroChip: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  heroChipText: { fontSize: 12, color: '#fff', fontWeight: '600' },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 10,
  },
  statusIcon: { fontSize: 18, width: 26, textAlign: 'center' },
  statusLabel: { flex: 1, fontSize: 14, color: INK },
  statusVal: { fontSize: 14, fontWeight: '600', textTransform: 'capitalize', marginRight: 6 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridCard: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    alignItems: 'flex-start',
  },
  gridIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  gridTitle: { fontSize: 14, fontWeight: '700', color: INK },
  gridSub: { fontSize: 12, color: MUTED, marginTop: 2 },

  moodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },

  presetChip: {
    backgroundColor: '#FEF3C7',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  presetChipText: { fontSize: 12, color: AMBER, fontWeight: '600' },

  flagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  flagRemove: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },

  // Modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '85%',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: INK },

  rowLabel: { fontSize: 14, fontWeight: '600', color: INK },

  pill: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  pillText: { fontSize: 13, color: MUTED },

  textInput: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: INK,
    backgroundColor: '#F9FAFB',
    textAlignVertical: 'top',
  },

  saveBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
