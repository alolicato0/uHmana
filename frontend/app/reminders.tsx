import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radii } from '../src/theme';

interface Rem {
  id: string;
  title: string;
  when: string;
  enabled: boolean;
}

const SEED: Rem[] = [
  { id: '1', title: 'Ibuprofene 400mg', when: 'Oggi, 14:00', enabled: true },
  { id: '2', title: 'Omeprazolo 20mg', when: 'Ogni giorno, 08:00', enabled: true },
  { id: '3', title: 'Vitamina D', when: 'Ogni giorno, 21:00', enabled: false },
  { id: '4', title: 'Promemoria visita', when: '12 Maggio, 10:30', enabled: true },
];

const TABS = ['Farmaci', 'Visite', 'Altro'] as const;

export default function RemindersScreen() {
  const [tab, setTab] = useState<typeof TABS[number]>('Farmaci');
  const [items, setItems] = useState<Rem[]>(SEED);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['bottom']}>
      <View style={{ padding: 16 }}>
        <View style={styles.tabs}>
          {TABS.map((t) => (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              style={[
                styles.tab,
                tab === t && { backgroundColor: colors.primary },
              ]}
            >
              <Text
                style={{
                  color: tab === t ? '#fff' : colors.ink,
                  fontWeight: '600',
                }}
              >
                {t}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 80 }}>
        {items.map((r) => (
          <View key={r.id} style={styles.row}>
            <Ionicons name="medkit-outline" size={22} color={colors.primary} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ fontWeight: '600' }}>{r.title}</Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>{r.when}</Text>
            </View>
            <Switch
              value={r.enabled}
              onValueChange={(v) =>
                setItems((s) =>
                  s.map((x) => (x.id === r.id ? { ...x, enabled: v } : x)),
                )
              }
              trackColor={{ true: colors.primary, false: '#D1D5DB' }}
            />
          </View>
        ))}
      </ScrollView>

      <Pressable style={styles.fab}>
        <Ionicons name="add" size={20} color="#fff" />
        <Text style={{ color: '#fff', fontWeight: '600', marginLeft: 6 }}>
          Nuovo promemoria
        </Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: radii.pill,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
  },
  tab: {
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
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});
