import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radii } from '../src/theme';

const DOCS = [
  { name: 'Esame del sangue.pdf', icon: 'document-text-outline' },
  { name: 'Radiografia torace.png', icon: 'medkit-outline' },
  { name: 'Referto veterinario Luna.pdf', icon: 'paw-outline' },
] as const;

export default function ReportsScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 80 }}>
        {DOCS.map((d) => (
          <Pressable key={d.name} style={styles.row}>
            <Ionicons name={d.icon as any} size={22} color={colors.primary} />
            <Text style={{ flex: 1, marginLeft: 12, fontWeight: '500' }}>
              {d.name}
            </Text>
            <Ionicons name="ellipsis-vertical" size={18} color={colors.muted} />
          </Pressable>
        ))}
      </ScrollView>
      <Pressable style={styles.fab}>
        <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
        <Text style={{ color: '#fff', fontWeight: '600', marginLeft: 8 }}>
          Carica
        </Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
