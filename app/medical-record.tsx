import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useProfileStore } from '../src/store/profile';
import { colors, radii } from '../src/theme';
import type { ProfileKind } from '../src/types';

export default function MedicalRecordScreen() {
  const kind = useProfileStore((s) => s.activeKind);
  const setKind = useProfileStore((s) => s.setActiveKind);
  const profile = useProfileStore((s) => s.getActiveProfile());

  const human = [
    { icon: 'person-outline', title: 'Informazioni personali', subtitle: 'Modifica i tuoi dati' },
    { icon: 'medical-outline', title: 'Patologie', subtitle: `${profile?.conditions.length ?? 0} condizioni registrate` },
    { icon: 'medkit-outline', title: 'Terapie in corso', subtitle: `${profile?.currentTherapies.length ?? 0} farmaci` },
    { icon: 'warning-outline', title: 'Allergie', subtitle: `${profile?.allergies.length ?? 0} allergie registrate` },
    { icon: 'document-text-outline', title: 'Esami e referti', subtitle: '0 documenti' },
    { icon: 'fitness-outline', title: 'Vaccinazioni', subtitle: 'Ultima: --' },
  ] as const;

  const pet = [
    { icon: 'paw-outline', title: 'Informazioni animale', subtitle: profile?.breed ?? '' },
    { icon: 'medical-outline', title: 'Patologie', subtitle: `${profile?.conditions.length ?? 0} condizioni` },
    { icon: 'medkit-outline', title: 'Terapie', subtitle: `${profile?.currentTherapies.length ?? 0} farmaci` },
    { icon: 'fitness-outline', title: 'Vaccinazioni', subtitle: 'Ultima: --' },
    { icon: 'bug-outline', title: 'Antiparassitari', subtitle: 'Ultimo: --' },
    { icon: 'scale-outline', title: 'Peso', subtitle: profile?.weightKg ? `${profile.weightKg} kg` : '--' },
  ] as const;

  const items = kind === 'human' ? human : pet;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Segmented active={kind} onChange={setKind} />
        <View style={{ height: 16 }} />
        {items.map((it) => (
          <Pressable key={it.title} style={styles.row}>
            <View style={styles.iconBox}>
              <Ionicons name={it.icon as any} size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ fontWeight: '600' }}>{it.title}</Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>
                {it.subtitle}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.muted} />
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function Segmented({
  active,
  onChange,
}: {
  active: ProfileKind;
  onChange: (k: ProfileKind) => void;
}) {
  return (
    <View style={styles.segment}>
      {(['human', 'pet'] as ProfileKind[]).map((k) => (
        <Pressable
          key={k}
          onPress={() => onChange(k)}
          style={[styles.segBtn, active === k && { backgroundColor: colors.primary }]}
        >
          <Text
            style={{
              fontWeight: '600',
              color: active === k ? '#fff' : colors.ink,
            }}
          >
            {k === 'human' ? 'Umano' : 'Animale'}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  segment: {
    flexDirection: 'row',
    padding: 4,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
  },
  segBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radii.pill,
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#fff',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
