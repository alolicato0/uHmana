import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../src/components/PrimaryButton';
import { colors, radii } from '../src/theme';

export default function EmergencyScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.emergencySoft }}>
      <View style={{ flex: 1, padding: 24 }}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="close" size={28} color={colors.ink} />
        </Pressable>
        <View style={{ height: 16 }} />
        <Text style={styles.title}>È urgente?</Text>
        <Text style={styles.subtitle}>
          Rispondi a poche domande per capire{'\n'}se è il caso di preoccuparsi.
        </Text>

        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Pressable
            onPress={() => {
              router.back();
              router.push('/(tabs)/chat');
            }}
            style={styles.sos}
          >
            <Text style={{ color: '#fff', fontSize: 40, fontWeight: '800' }}>
              SOS
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>
              Avvia valutazione
            </Text>
          </Pressable>
        </View>

        <View style={styles.descBox}>
          <Text style={{ fontWeight: '600' }}>Oppure descrivi il problema</Text>
          <TextInput
            multiline
            placeholder="Ad esempio: forte dolore al petto, difficoltà respiratorie, sanguinamento..."
            placeholderTextColor={colors.mutedLight}
            style={styles.descInput}
          />
          <View style={{ height: 8 }} />
          <PrimaryButton
            label="Scrivi ora"
            onPress={() => {
              router.back();
              router.push('/(tabs)/chat');
            }}
          />
        </View>

        <Pressable
          onPress={() => Linking.openURL('tel:112')}
          style={styles.callRow}
        >
          <Ionicons name="call" size={20} color={colors.danger} />
          <Text style={{ marginLeft: 8, color: colors.danger, fontWeight: '700' }}>
            Chiama il 112
          </Text>
        </Pressable>

        <Text style={styles.disclaimer}>
          ⚠️ Questa funzione non sostituisce il parere di un medico. In caso reale chiama il 112.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 32, fontWeight: '800', color: colors.danger },
  subtitle: { color: colors.muted, marginTop: 8 },
  sos: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.danger,
    shadowOpacity: 0.4,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  descBox: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: radii.lg,
  },
  descInput: {
    backgroundColor: colors.bg,
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    minHeight: 72,
    textAlignVertical: 'top',
    fontSize: 13,
  },
  callRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginTop: 12,
  },
  disclaimer: {
    color: colors.muted,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
  },
});
