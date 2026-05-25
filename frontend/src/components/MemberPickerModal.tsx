import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  memberEmoji,
  useMembersStore,
  type HumanMember,
  type MemberKind,
  type PetMember,
} from '../store/members';
import { colors, radii } from '../theme';

interface Props {
  visible: boolean;
  kind: MemberKind;
  accent?: string;
  onPick: (memberId: string) => void;
  onClose: () => void;
  title?: string;
}

export function MemberPickerModal({
  visible,
  kind,
  accent = '#0DB09E',
  onPick,
  onClose,
  title = 'Per chi stai registrando?',
}: Props) {
  const members = useMembersStore((s) => (kind === 'human' ? s.humans : s.pets)) as
    | HumanMember[]
    | PetMember[];
  const activeId = useMembersStore((s) => (kind === 'human' ? s.activeHumanId : s.activePetId));

  const [selectedId, setSelectedId] = useState<string | null>(activeId);

  useEffect(() => {
    if (visible) setSelectedId(activeId);
  }, [visible, activeId]);

  const handleSelect = (id: string) => {
    void Haptics.selectionAsync();
    setSelectedId(id);
  };

  const handleConfirm = () => {
    if (!selectedId) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPick(selectedId);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.title}>{title}</Text>
        {(members as (HumanMember | PetMember)[]).map((m) => {
          const isSelected = m.id === selectedId;
          return (
            <Pressable
              key={m.id}
              onPress={() => handleSelect(m.id)}
              style={[
                styles.row,
                isSelected && { borderColor: accent, backgroundColor: accent + '14' },
              ]}
            >
              <Text style={styles.emoji}>{memberEmoji(m)}</Text>
              <Text style={styles.name}>{m.name}</Text>
              {isSelected && <Ionicons name="checkmark-circle" size={20} color={accent} />}
            </Pressable>
          );
        })}
        <Pressable
          style={[styles.confirm, { backgroundColor: accent }, !selectedId && { opacity: 0.4 }]}
          onPress={handleConfirm}
          disabled={!selectedId}
        >
          <Text style={styles.confirmTxt}>Salva</Text>
        </Pressable>
        <Pressable style={styles.cancel} onPress={onClose}>
          <Text style={styles.cancelTxt}>Annulla</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: '#fff',
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 40,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 17, fontWeight: '800', color: colors.ink, marginBottom: 14 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  emoji: { fontSize: 22 },
  name: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.ink },
  confirm: {
    marginTop: 8,
    paddingVertical: 13,
    borderRadius: 999,
    alignItems: 'center',
  },
  confirmTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },
  cancel: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  cancelTxt: { fontSize: 14, fontWeight: '600', color: colors.ink },
});
