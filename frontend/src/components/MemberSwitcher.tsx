import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  HUMAN_EMOJI,
  SPECIES_EMOJI,
  memberEmoji,
  useMembersStore,
  type HumanMember,
  type MemberKind,
  type PetMember,
  type PetSpecies,
} from '../store/members';
import { colors, radii } from '../theme';

interface Props {
  kind: MemberKind;
  accent: string;
  variant?: 'compact' | 'header';
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function MemberSwitcher({ kind, accent, variant = 'compact' }: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const members = useMembersStore((s) => (kind === 'human' ? s.humans : s.pets));
  const activeId = useMembersStore((s) => (kind === 'human' ? s.activeHumanId : s.activePetId));
  const setActive = useMembersStore((s) => (kind === 'human' ? s.setActiveHuman : s.setActivePet));
  const active = (members.find((m) => m.id === activeId) ?? members[0]) as HumanMember | PetMember | undefined;

  const label = active
    ? `${memberEmoji(active)} ${active.name}`
    : kind === 'human'
    ? 'Aggiungi membro'
    : 'Aggiungi animale';

  const borderCol = hexToRgba(accent, 0.18);

  const openSheet = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!active) {
      setAddOpen(true);
    } else {
      setSheetOpen(true);
    }
  };

  const onPick = (id: string) => {
    void Haptics.selectionAsync();
    setActive(id);
    setSheetOpen(false);
  };

  const onAddedNew = () => {
    setAddOpen(false);
    setSheetOpen(false);
  };

  return (
    <>
      {variant === 'header' ? (
        <Pressable
          onPress={openSheet}
          style={[styles.headerRow, { borderColor: borderCol }]}
        >
          <Text style={styles.headerEmoji}>{active ? memberEmoji(active) : '➕'}</Text>
          <Text style={styles.headerName} numberOfLines={1}>
            {active ? active.name : label}
          </Text>
          <Ionicons name="chevron-down" size={18} color={colors.muted} />
        </Pressable>
      ) : (
        <Pressable
          onPress={openSheet}
          style={[styles.pill, { borderColor: borderCol }]}
        >
          <Text style={styles.pillTxt} numberOfLines={1}>{label}</Text>
          <Ionicons name="chevron-down" size={14} color={colors.muted} />
        </Pressable>
      )}

      <Modal visible={sheetOpen} transparent animationType="slide" onRequestClose={() => setSheetOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setSheetOpen(false)} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>
            {kind === 'human' ? 'Seleziona membro' : 'Seleziona animale'}
          </Text>
          {members.map((m) => {
            const isActive = m.id === activeId;
            return (
              <Pressable
                key={m.id}
                style={[styles.row, isActive && { backgroundColor: hexToRgba(accent, 0.08) }]}
                onPress={() => onPick(m.id)}
              >
                <Text style={styles.rowEmoji}>{memberEmoji(m)}</Text>
                <Text style={styles.rowName}>{m.name}</Text>
                {isActive && <Ionicons name="checkmark-circle" size={20} color={accent} />}
              </Pressable>
            );
          })}
          <Pressable
            style={[styles.addBtn, { backgroundColor: accent }]}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setAddOpen(true);
            }}
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.addBtnTxt}>
              {kind === 'human' ? 'Aggiungi membro' : 'Aggiungi animale'}
            </Text>
          </Pressable>
        </View>
      </Modal>

      <AddMemberModal
        visible={addOpen}
        kind={kind}
        accent={accent}
        onClose={() => setAddOpen(false)}
        onAdded={onAddedNew}
      />
    </>
  );
}

interface AddProps {
  visible: boolean;
  kind: MemberKind;
  accent: string;
  onClose: () => void;
  onAdded: () => void;
}

export function AddMemberModal({ visible, kind, accent, onClose, onAdded }: AddProps) {
  const [name, setName] = useState('');
  const [species, setSpecies] = useState<PetSpecies>('cane');
  const [err, setErr] = useState('');

  const addHuman = useMembersStore((s) => s.addHuman);
  const addPet = useMembersStore((s) => s.addPet);
  const setActiveHuman = useMembersStore((s) => s.setActiveHuman);
  const setActivePet = useMembersStore((s) => s.setActivePet);

  const reset = () => {
    setName('');
    setSpecies('cane');
    setErr('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const save = () => {
    if (!name.trim()) {
      setErr('Inserisci un nome');
      return;
    }
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    let id: string;
    if (kind === 'human') {
      id = addHuman(name.trim());
      setActiveHuman(id);
    } else {
      id = addPet(name.trim(), species);
      setActivePet(id);
    }
    reset();
    onAdded();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Pressable style={styles.overlay} onPress={handleClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>
            {kind === 'human' ? 'Aggiungi membro' : 'Aggiungi animale'}
          </Text>
          {err ? <Text style={styles.err}>{err}</Text> : null}
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Nome"
            placeholderTextColor={colors.muted}
            style={styles.input}
            autoFocus
          />
          {kind === 'pet' && (
            <View style={styles.speciesRow}>
              {(['cane', 'gatto'] as PetSpecies[]).map((s) => {
                const active = species === s;
                return (
                  <Pressable
                    key={s}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      setSpecies(s);
                    }}
                    style={[
                      styles.speciesChip,
                      active && { backgroundColor: accent, borderColor: accent },
                    ]}
                  >
                    <Text style={[styles.speciesTxt, active && { color: '#fff' }]}>
                      {SPECIES_EMOJI[s]} {s === 'cane' ? 'Cane' : 'Gatto'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
          <Pressable style={[styles.saveBtn, { backgroundColor: accent }]} onPress={save}>
            <Text style={styles.saveBtnTxt}>Salva</Text>
          </Pressable>
          <Pressable style={styles.cancelBtn} onPress={handleClose}>
            <Text style={styles.cancelBtnTxt}>Annulla</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: 'flex-start',
    maxWidth: 200,
  },
  pillTxt: { fontSize: 13, fontWeight: '600', color: colors.ink },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  headerEmoji: { fontSize: 18 },
  headerName: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.ink },

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
  sheetTitle: { fontSize: 18, fontWeight: '800', color: colors.ink, marginBottom: 14 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: radii.md,
  },
  rowEmoji: { fontSize: 22 },
  rowName: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.ink },

  addBtn: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 999,
  },
  addBtnTxt: { fontWeight: '700', color: '#fff', fontSize: 14 },

  input: {
    backgroundColor: '#F5F7FA',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: colors.ink,
  },
  speciesRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  speciesChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  speciesTxt: { fontSize: 13, fontWeight: '700', color: colors.ink },

  saveBtn: {
    marginTop: 16,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnTxt: { fontWeight: '700', fontSize: 15, color: '#fff' },
  cancelBtn: {
    marginTop: 8,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelBtnTxt: { fontWeight: '600', fontSize: 14, color: colors.ink },
  err: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
});
