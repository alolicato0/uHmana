import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
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
import { VetChatModal } from '../src/components/VetChatModal';
import { PrimaryButton } from '../src/components/PrimaryButton';
import { useAuth } from '../src/context/AuthContext';
import { useProfileStore } from '../src/store/profile';
import { useTimelineStore } from '../src/store/timeline';
import { colors, radii } from '../src/theme';
import { eventTypeLabels, type TimelineEventType } from '../src/types';

type ActionItem = {
  title: string;
  desc: string;
  emoji: string;
  grad: [string, string];
  type?: TimelineEventType;
  route?: string;
  openVetChat?: boolean;
};

// ─── HUMAN MODE DATA ────────────────────────────────────────────────────────
const HUMAN_QUICK: { label: string; emoji: string; route: string }[] = [
  { label: 'Analizza immagine', emoji: '📷', route: '/image-analysis' },
  { label: "Chiedi all'AI", emoji: '💬', route: '/(tabs)/chat' },
];

const HUMAN_SECTIONS: { section: string; emoji: string; items: ActionItem[] }[] = [
  {
    section: 'Salute',
    emoji: '❤️',
    items: [
      { title: 'Registra sintomo', desc: 'Aggiungi sintomi o stato fisico', emoji: '🌡️', grad: ['#FB923C', '#F59E0B'], type: 'symptom' },
      { title: 'Cura attiva', desc: 'Farmaci e trattamenti', emoji: '💊', grad: ['#0DB09E', '#22C55E'], route: '/reminders' },
      { title: 'Benessere', desc: 'Sonno, stress, energia e umore', emoji: '😴', grad: ['#06B6D4', '#0DB09E'], route: '/sintomi' },
    ],
  },
  {
    section: 'Medico',
    emoji: '🩺',
    items: [
      { title: 'Nuova visita', desc: 'Controllo o appuntamento medico', emoji: '🩺', grad: ['#5B7CFA', '#3B82F6'], type: 'visit' },
      { title: 'Carica referto', desc: 'Analizza PDF, immagini o esami', emoji: '📄', grad: ['#60A5FA', '#3B82F6'], route: '/reports' },
      { title: 'Vaccinazione', desc: 'Registra un vaccino effettuato', emoji: '💉', grad: ['#34D399', '#10B981'], type: 'vaccine' },
    ],
  },
  {
    section: 'Personale',
    emoji: '📝',
    items: [
      { title: 'Nota personale', desc: 'Aggiungi un appunto personale', emoji: '📝', grad: ['#A78BFA', '#8B5CF6'], type: 'note' },
    ],
  },
];

// ─── PET MODE DATA ───────────────────────────────────────────────────────────
const PET_QUICK: { label: string; emoji: string; route?: string; openVetChat?: boolean }[] = [
  { label: 'Analizza foto', emoji: '📷', route: '/image-analysis' },
  { label: 'Assistente Vet', emoji: '💬', openVetChat: true },
];

const PET_SECTIONS: { section: string; emoji: string; items: ActionItem[] }[] = [
  {
    section: 'Benessere',
    emoji: '🐾',
    items: [
      { title: 'Registra sintomo', desc: 'Vomito, zoppia, tosse, prurito…', emoji: '🤒', grad: ['#FB923C', '#F59E0B'], route: '/vet-ai' },
      { title: 'Attività & umore', desc: 'Energia, sonno e comportamento', emoji: '🐕', grad: ['#EC4899', '#F472B6'], route: '/comportamento' },
      { title: 'Pasto & dieta', desc: 'Registra pasti, acqua e peso', emoji: '🍖', grad: ['#F59E0B', '#FBBF24'], route: '/nutrizione' },
    ],
  },
  {
    section: 'Veterinario',
    emoji: '🩺',
    items: [
      { title: 'Nuova visita vet', desc: 'Controlli o appuntamenti', emoji: '🩺', grad: ['#5B7CFA', '#3B82F6'], type: 'visit' },
      { title: 'Prevenzione', desc: 'Vaccini e antiparassitari', emoji: '💉', grad: ['#34D399', '#10B981'], route: '/prevenzione' },
      { title: 'Carica documento', desc: 'Libretti, esami o referti', emoji: '📄', grad: ['#60A5FA', '#3B82F6'], route: '/reports' },
    ],
  },
  {
    section: 'Quotidiano',
    emoji: '📝',
    items: [
      { title: 'Passeggiata', desc: 'Registra attività giornaliera', emoji: '🚶', grad: ['#10B981', '#34D399'], route: '/comportamento' },
      { title: 'Sessione gioco', desc: 'Monitora attività e movimento', emoji: '🎾', grad: ['#F97316', '#FB923C'], route: '/comportamento' },
      { title: 'Nota animale', desc: 'Cambiamenti o osservazioni', emoji: '📝', grad: ['#A78BFA', '#8B5CF6'], type: 'note' },
    ],
  },
];

// ─── ACTION CARD ─────────────────────────────────────────────────────────────
function ActionCard({
  item,
  onPress,
  isPet,
}: {
  item: ActionItem;
  onPress: () => void;
  isPet: boolean;
}) {
  const cardRadius = isPet ? 18 : 14;
  const iconRadius = isPet ? 16 : 14;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionCard,
        isPet && styles.actionCardPet,
        { borderRadius: cardRadius },
        pressed && { transform: [{ scale: 0.98 }], opacity: 0.9 },
      ]}
    >
      <LinearGradient
        colors={item.grad}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.actionIcon, { borderRadius: iconRadius }]}
      >
        <Text style={{ fontSize: 22 }}>{item.emoji}</Text>
      </LinearGradient>
      <View style={{ flex: 1 }}>
        <Text style={styles.actionTitle}>{item.title}</Text>
        <Text style={styles.actionDesc}>{item.desc}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </Pressable>
  );
}

// ─── SCREEN ──────────────────────────────────────────────────────────────────
export default function AddEventScreen() {
  const { getToken } = useAuth();
  const add = useTimelineStore((s) => s.add);
  const activeKind = useProfileStore((s) => s.activeKind);
  const getActiveProfile = useProfileStore((s) => s.getActiveProfile);

  const petName = getActiveProfile()?.name ?? 'il tuo animale';
  const isPet = activeKind === 'pet';
  const ACCENT = isPet ? '#10B981' : '#0DB09E';
  const BG = isPet ? '#FFF9F5' : colors.bg;

  const [picked, setPicked] = useState<TimelineEventType | null>(null);
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [vetChatOpen, setVetChatOpen] = useState(false);

  const handleItem = (item: ActionItem) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (item.openVetChat) {
      setVetChatOpen(true);
      return;
    }
    if (item.route) {
      router.push(item.route as never);
      return;
    }
    if (item.type) setPicked(item.type);
  };

  const closeModal = () => {
    setPicked(null);
    setTitle('');
  };

  const confirm = async () => {
    if (!picked || !title.trim()) return;
    setSaving(true);
    try {
      const profile = getActiveProfile();
      await add(
        {
          profileId: profile?.id ?? '',
          type: picked,
          title: title.trim(),
          date: new Date().toISOString(),
        },
        getToken,
      );
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      closeModal();
      router.back();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Impossibile salvare evento.';
      Alert.alert('Errore', msg);
    } finally {
      setSaving(false);
    }
  };

  const sections = isPet ? PET_SECTIONS : HUMAN_SECTIONS;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.ink} />
        </Pressable>
        <View>
          <Text style={styles.headerTitle}>
            {isPet ? '🐾 Nuovo aggiornamento' : '➕ Nuovo aggiornamento'}
          </Text>
          <Text style={styles.headerSub}>
            {isPet ? `Aggiorna il benessere di ${petName}` : 'Aggiorna il tuo stato di salute'}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 30 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Quick actions */}
        <Text style={styles.quickLabel}>⚡ Azioni rapide</Text>
        <View style={styles.quickRow}>
          {isPet
            ? PET_QUICK.map((q) => (
                <Pressable
                  key={q.label}
                  style={[styles.quickCard, isPet && styles.quickCardPet]}
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    if (q.openVetChat) {
                      setVetChatOpen(true);
                    } else if (q.route) {
                      router.push(q.route as never);
                    }
                  }}
                >
                  <Text style={styles.quickEmoji}>{q.emoji}</Text>
                  <Text style={styles.quickTxt}>{q.label}</Text>
                </Pressable>
              ))
            : HUMAN_QUICK.map((q) => (
                <Pressable
                  key={q.label}
                  style={styles.quickCard}
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push(q.route as never);
                  }}
                >
                  <Text style={styles.quickEmoji}>{q.emoji}</Text>
                  <Text style={styles.quickTxt}>{q.label}</Text>
                </Pressable>
              ))}
        </View>

        {/* Categorized actions */}
        {sections.map((sec) => (
          <View key={sec.section} style={{ marginTop: 22 }}>
            <Text style={styles.sectionTitle}>
              {sec.emoji} {sec.section}
            </Text>
            <View style={{ height: 8 }} />
            {sec.items.map((item) => (
              <ActionCard
                key={item.title}
                item={item}
                isPet={isPet}
                onPress={() => handleItem(item)}
              />
            ))}
          </View>
        ))}
      </ScrollView>

      {/* Quick-add modal (timeline events) */}
      <Modal visible={!!picked} transparent animationType="slide" onRequestClose={closeModal}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <Pressable style={styles.modalOverlay} onPress={closeModal} />
          <View style={styles.modalSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.modalTitle}>
              Nuovo: {picked && eventTypeLabels[picked]}
            </Text>
            <Text style={styles.modalSub}>
              Aggiungi una breve descrizione dell'evento.
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Es: Mal di testa moderato"
              placeholderTextColor={colors.muted}
              autoFocus
              style={styles.input}
            />
            <View style={{ height: 14 }} />
            <PrimaryButton label={saving ? '' : 'Aggiungi alla timeline'} onPress={confirm} loading={saving} />
            <View style={{ height: 8 }} />
            <PrimaryButton label="Annulla" variant="outline" onPress={closeModal} />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Vet Chat Modal (pet mode) */}
      <VetChatModal
        visible={vetChatOpen}
        onClose={() => setVetChatOpen(false)}
        petName={petName}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backBtn: { padding: 2 },
  headerTitle: { fontSize: 19, fontWeight: '800', color: colors.ink },
  headerSub: { fontSize: 12, color: colors.muted, marginTop: 2 },

  quickLabel: { fontSize: 13, fontWeight: '700', color: colors.muted, marginBottom: 10 },
  quickRow: { flexDirection: 'row', gap: 10 },
  quickCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: radii.md,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickCardPet: {
    borderRadius: 18,
    backgroundColor: '#FFFBF7',
  },
  quickEmoji: { fontSize: 26 },
  quickTxt: { fontSize: 12, fontWeight: '700', color: colors.ink },

  sectionTitle: { fontSize: 15, fontWeight: '800', color: colors.ink },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#fff',
    borderRadius: radii.md,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  actionCardPet: {
    backgroundColor: '#FFFBF7',
  },
  actionIcon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  actionTitle: { fontSize: 15, fontWeight: '700', color: colors.ink },
  actionDesc: { fontSize: 12, color: colors.muted, marginTop: 2, lineHeight: 16 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    backgroundColor: '#fff',
    padding: 22,
    paddingBottom: 36,
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
  modalTitle: { fontWeight: '800', fontSize: 18, color: colors.ink },
  modalSub: { fontSize: 13, color: colors.muted, marginTop: 4, marginBottom: 14 },
  input: {
    backgroundColor: '#F5F7FA',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    padding: 14,
    fontSize: 15,
    color: colors.ink,
  },
});
