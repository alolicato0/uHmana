import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useVetStore } from '../src/store/vetStore';
import { radii } from '../src/theme';

const TEAL = '#10B981';
const BG = '#FDFBF5';
const INK = '#1A1A2E';
const MUTED = '#6B7280';
const BORDER = '#E8EAF0';

const BASE_CHIPS = [
  'Non mangia', 'Vomita', 'Zoppica', 'Si gratta',
  'È apatico', 'Ha diarrea', 'Tosse', 'Occhi rossi',
  'Beve troppo', 'Ha mangiato qualcosa di strano',
  'Respira male', 'Perde peso', 'Starnuti', 'Gonfiore',
];

export default function SintomoVetScreen() {
  const { preselected } = useLocalSearchParams<{ preselected?: string }>();
  const init = preselected ? preselected.split(',').filter(Boolean) : [];

  const [selected, setSelected] = useState<string[]>(init);
  const [description, setDescription] = useState('');
  const [photoUri, setPhotoUri] = useState<string | undefined>();

  const symptomHistory = useVetStore((s) => s.symptomHistory);
  const addSymptomEntry = useVetStore((s) => s.addSymptomEntry);

  // Merge frequent symptoms from history
  const counts: Record<string, number> = {};
  for (const entry of symptomHistory) {
    for (const s of entry.symptoms) counts[s] = (counts[s] ?? 0) + 1;
  }
  const frequent = Object.entries(counts)
    .filter(([, c]) => c >= 3)
    .map(([s]) => s);
  const chips = [...new Set([...BASE_CHIPS, ...frequent])];

  const toggleChip = (chip: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected((prev) =>
      prev.includes(chip) ? prev.filter((c) => c !== chip) : [...prev, chip],
    );
  };

  const handlePhoto = () => {
    Alert.alert('Aggiungi foto/video', 'Scegli sorgente', [
      {
        text: 'Scatta foto',
        onPress: async () => {
          const perm = await ImagePicker.requestCameraPermissionsAsync();
          if (!perm.granted) return;
          const res = await ImagePicker.launchCameraAsync({ quality: 0.8 });
          if (!res.canceled) setPhotoUri(res.assets[0].uri);
        },
      },
      {
        text: 'Galleria',
        onPress: async () => {
          const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.8, mediaTypes: ImagePicker.MediaTypeOptions.All });
          if (!res.canceled) setPhotoUri(res.assets[0].uri);
        },
      },
      { text: 'Annulla', style: 'cancel' },
    ]);
  };

  const handleSubmit = () => {
    if (selected.length === 0 && !description.trim()) {
      Alert.alert('Aggiungi almeno un sintomo o una descrizione');
      return;
    }
    addSymptomEntry({ symptoms: selected, description: description.trim(), photoUri });

    const parts = [selected.join(', '), description.trim()].filter(Boolean);
    const prefill = parts.join('. ');
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Torna ad Assistente Vet e apri la chat (pop-up) con il prefill
    router.replace({
      pathname: '/vet-ai',
      params: { openChat: '1', prefill: encodeURIComponent(prefill) },
    } as never);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={INK} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>🤒 Ha un sintomo</Text>
          <Text style={styles.headerSub}>Seleziona o descrivi i sintomi osservati</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Chips */}
        <Text style={styles.sectionTitle}>Sintomi presenti</Text>
        <Text style={styles.sectionSub}>Tocca per selezionare uno o più sintomi</Text>
        <View style={[styles.chipsWrap, { marginTop: 10 }]}>
          {chips.map((chip) => {
            const active = selected.includes(chip);
            return (
              <Pressable
                key={chip}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => toggleChip(chip)}
              >
                {active && (
                  <Ionicons name="checkmark" size={13} color="#fff" style={{ marginRight: 4 }} />
                )}
                <Text style={[styles.chipTxt, active && styles.chipTxtActive]}>{chip}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Description */}
        <Text style={[styles.sectionTitle, { marginTop: 22 }]}>Descrizione libera</Text>
        <Text style={styles.sectionSub}>Quando è iniziato, con quale frequenza, altri dettagli…</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Es: Zoppica dalla zampa anteriore sinistra dal ieri sera, non appoggia il peso…"
          placeholderTextColor={MUTED}
          multiline
          numberOfLines={4}
          value={description}
          onChangeText={setDescription}
          textAlignVertical="top"
        />

        {/* Photo */}
        <Text style={[styles.sectionTitle, { marginTop: 22 }]}>Foto o video (opzionale)</Text>
        <Pressable style={styles.photoBtn} onPress={handlePhoto}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.photoPreview} resizeMode="cover" />
          ) : (
            <>
              <Ionicons name="camera-outline" size={28} color={TEAL} />
              <Text style={styles.photoBtnTxt}>Scatta o scegli dalla galleria</Text>
              <Text style={[styles.sectionSub, { textAlign: 'center' }]}>
                Pelle, occhi, ferite, orecchie, movimento…
              </Text>
            </>
          )}
        </Pressable>
        {photoUri && (
          <Pressable onPress={() => setPhotoUri(undefined)} style={styles.removePhoto}>
            <Ionicons name="trash-outline" size={14} color="#EF4444" />
            <Text style={styles.removePhotoTxt}>Rimuovi</Text>
          </Pressable>
        )}

        {/* Selected summary */}
        {selected.length > 0 && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Sintomi selezionati ({selected.length})</Text>
            <Text style={styles.summaryText}>{selected.join(' · ')}</Text>
          </View>
        )}

        {/* Submit */}
        <Pressable
          style={[
            styles.submitBtn,
            selected.length === 0 && !description.trim() && styles.submitBtnDisabled,
          ]}
          onPress={handleSubmit}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={18} color="#fff" />
          <Text style={styles.submitBtnTxt}>Invia all'Assistente Vet →</Text>
        </Pressable>

        <Text style={styles.disclaimer}>
          ⚠️ Le valutazioni AI sono a scopo informativo. Per diagnosi accurate consulta sempre un
          medico veterinario.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: BG,
  },
  backBtn: { padding: 2 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: INK },
  headerSub: { fontSize: 11, color: MUTED, marginTop: 2 },

  sectionTitle: { fontSize: 14, fontWeight: '800', color: INK },
  sectionSub: { fontSize: 11, color: MUTED, marginTop: 2 },

  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 99,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },
  chipActive: { backgroundColor: TEAL, borderColor: TEAL },
  chipTxt: { fontSize: 13, fontWeight: '600', color: INK },
  chipTxtActive: { color: '#fff' },

  textInput: {
    marginTop: 8,
    backgroundColor: '#fff',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    fontSize: 14,
    color: INK,
    minHeight: 100,
  },

  photoBtn: {
    marginTop: 8,
    backgroundColor: '#fff',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: BORDER,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
    gap: 6,
    padding: 16,
  },
  photoBtnTxt: { fontSize: 14, color: TEAL, fontWeight: '700' },
  photoPreview: { width: '100%', height: 180, borderRadius: radii.md },
  removePhoto: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    alignSelf: 'flex-end',
  },
  removePhotoTxt: { fontSize: 12, color: '#EF4444', fontWeight: '600' },

  summaryCard: {
    marginTop: 16,
    backgroundColor: '#F0FDF4',
    borderRadius: radii.md,
    padding: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  summaryTitle: { fontSize: 12, fontWeight: '700', color: '#16A34A', marginBottom: 4 },
  summaryText: { fontSize: 13, color: INK, lineHeight: 18 },

  submitBtn: {
    marginTop: 24,
    backgroundColor: TEAL,
    borderRadius: radii.md,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  submitBtnDisabled: { opacity: 0.45 },
  submitBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },

  disclaimer: {
    fontSize: 11,
    color: MUTED,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 20,
    paddingHorizontal: 8,
  },
});
