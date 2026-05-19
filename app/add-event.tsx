import { router } from 'expo-router';
import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../src/components/PrimaryButton';
import { useTimelineStore } from '../src/store/timeline';
import { colors, radii } from '../src/theme';
import {
  eventTypeEmoji,
  eventTypeLabels,
  type TimelineEventType,
} from '../src/types';

const TYPES: TimelineEventType[] = [
  'symptom',
  'medication',
  'visit',
  'exam',
  'vaccine',
  'note',
];

export default function AddEventScreen() {
  const add = useTimelineStore((s) => s.add);
  const [picked, setPicked] = useState<TimelineEventType | null>(null);
  const [title, setTitle] = useState('');

  const confirm = () => {
    if (!picked || !title.trim()) return;
    add({
      id: `t-${Date.now()}`,
      profileId: 'self',
      type: picked,
      title: title.trim(),
      date: new Date().toISOString(),
    });
    router.back();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={styles.title}>Che tipo di evento vuoi aggiungere?</Text>
        {TYPES.map((t) => (
          <Pressable
            key={t}
            onPress={() => setPicked(t)}
            style={[styles.row, picked === t && { borderColor: colors.primary, borderWidth: 2 }]}
          >
            <Text style={{ fontSize: 24, marginRight: 12 }}>
              {eventTypeEmoji[t]}
            </Text>
            <Text style={{ fontWeight: '600' }}>{eventTypeLabels[t]}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <Modal visible={!!picked} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={{ fontWeight: '700', fontSize: 18 }}>
              Nuovo {picked && eventTypeLabels[picked]}
            </Text>
            <View style={{ height: 12 }} />
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Descrizione breve"
              autoFocus
              style={styles.input}
            />
            <View style={{ height: 12 }} />
            <PrimaryButton label="Aggiungi" onPress={confirm} />
            <View style={{ height: 8 }} />
            <PrimaryButton
              label="Annulla"
              variant="outline"
              onPress={() => {
                setPicked(null);
                setTitle('');
              }}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.muted, marginBottom: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: 14,
    fontSize: 15,
  },
});
