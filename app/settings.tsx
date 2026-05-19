import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radii } from '../src/theme';

const ITEMS = [
  { icon: 'notifications-outline', title: 'Notifiche', subtitle: 'Gestisci le notifiche' },
  { icon: 'lock-closed-outline', title: 'Privacy', subtitle: 'Impostazioni privacy' },
  { icon: 'language-outline', title: 'Lingua', subtitle: 'Italiano' },
  { icon: 'speedometer-outline', title: 'Unità di misura', subtitle: 'Metriche' },
  { icon: 'moon-outline', title: 'Tema', subtitle: 'Chiaro' },
  { icon: 'help-circle-outline', title: 'Assistenza', subtitle: 'Contattaci' },
  { icon: 'information-circle-outline', title: 'Informazioni', subtitle: 'Versione 0.1.0' },
] as const;

export default function SettingsScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {ITEMS.map((it) => (
          <Pressable key={it.title} style={styles.row}>
            <Ionicons name={it.icon as any} size={22} color={colors.primary} />
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
});
