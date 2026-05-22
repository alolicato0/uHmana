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
};

const SECTIONS: { section: string; emoji: string; items: ActionItem[] }[] = [
  {
    section: 'Salute',
    emoji: '❤️',
    items: [
      { title: 'Registra sintomo', desc: 'Aggiungi un nuovo sintomo o stato fisico', emoji: '🤒', grad: ['#FB923C', '#F59E0B'], type: 'symptom' },
      { title: 'Nuova terapia', desc: 'Registra un farmaco o trattamento', emoji: '💊', grad: ['#0DB09E', '#22C55E'], type: 'medication' },
      { title: 'Vaccinazione', desc: 'Annota un vaccino effettuato', emoji: '💉', grad: ['#34D399', '#10B981'], type: 'vaccine' },
    ],
  },
  {
    section: 'Medico',
    emoji: '🩺',
    items: [
      { title: 'Visita medica', desc: 'Registra una visita o un controllo', emoji: '🩺', grad: ['#5B7CFA', '#3B82F6'], type: 'visit' },
      { title: 'Carica referto', desc: 'Analizza PDF, immagini o esami', emoji: '📄', grad: ['#60A5FA', '#3B82F6'], route: '/reports' },
    ],
  },
  {
    section: 'Personale',
    emoji: '📝',
    items: [
      { title: 'Nota', desc: 'Scrivi un appunto personale', emoji: '📝', grad: ['#A78BFA', '#8B5CF6'], type: 'note' },
    ],
  },
];

const QUICK: { label: string; emoji: string; route: string }[] = [
  { label: 'Analizza foto', emoji: '📷', route: '/image-analysis' },
  { label: "Chiedi all'AI", emoji: '💬', route: '/(tabs)/chat' },
];

export default function AddEventScreen() {
  const { getToken } = useAuth();
  const add = useTimelineStore((s) => s.add);
  const getActiveProfile = useProfileStore((s) => s.getActiveProfile);
  const [picked, setPicked] = useState<TimelineEventType | null>(null);
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);

  const handleItem = (item: ActionItem) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
    } catch (e: any) {
      Alert.alert('Errore', e?.message ?? 'Impossibile salvare evento.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>➕ Nuovo aggiornamento</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
        {/* Quick actions */}
        <Text style={styles.quickLabel}>⚡ Azioni rapide</Text>
        <View style={styles.quickRow}>
          {QUICK.map((q) => (
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
        {SECTIONS.map((sec) => (
          <View key={sec.section} style={{ marginTop: 22 }}>
            <Text style={styles.sectionTitle}>{sec.emoji} {sec.section}</Text>
            <View style={{ height: 8 }} />
            {sec.items.map((item) => (
              <Pressable
                key={item.title}
                onPress={() => handleItem(item)}
                style={({ pressed }) => [styles.actionCard, pressed && { transform: [{ scale: 0.98 }], opacity: 0.9 }]}
              >
                <LinearGradient colors={item.grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.actionIcon}>
                  <Text style={{ fontSize: 22 }}>{item.emoji}</Text>
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={styles.actionTitle}>{item.title}</Text>
                  <Text style={styles.actionDesc}>{item.desc}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.muted} />
              </Pressable>
            ))}
          </View>
        ))}
      </ScrollView>

      {/* Quick-add modal */}
      <Modal visible={!!picked} transparent animationType="slide" onRequestClose={closeModal}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <Pressable style={styles.modalOverlay} onPress={closeModal} />
          <View style={styles.modalSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.modalTitle}>Nuovo: {picked && eventTypeLabels[picked]}</Text>
            <Text style={styles.modalSub}>Aggiungi una breve descrizione dell'evento.</Text>
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
  actionIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
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
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', alignSelf: 'center', marginBottom: 16 },
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
