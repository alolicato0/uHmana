import { useAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../src/components/PrimaryButton';
import { Disclaimers } from '../src/constants/disclaimers';
import { chat } from '../src/services/openrouter';
import { colors, radii } from '../src/theme';

export default function ImageAnalysisScreen() {
  const { getToken } = useAuth();
  const [uri, setUri] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const pick = async (source: 'camera' | 'gallery') => {
    let res;
    if (source === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return;
      res = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    } else {
      res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });
    }
    if (!res.canceled && res.assets[0]) {
      setUri(res.assets[0].uri);
      setResult(null);
    }
  };

  const analyze = async () => {
    if (!uri) return;
    setLoading(true);
    setResult(null);
    try {
      const reply = await chat({
        token: await getToken(),
        history: [
          {
            id: 'analyze-1',
            role: 'user',
            text:
              "Analizza questa immagine. Descrivi cosa osservi, elenca possibili cause come ipotesi e suggerimenti generali. Non fornire diagnosi.",
            attachments: [{ url: uri, mimeType: 'image/jpeg' }],
            createdAt: new Date().toISOString(),
          },
        ],
      });
      setResult(reply);
    } catch (e: any) {
      setResult(`Errore: ${e?.message ?? e}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {uri ? (
          <Image source={{ uri }} style={styles.preview} resizeMode="cover" />
        ) : (
          <View style={styles.empty}>
            <Ionicons name="image-outline" size={48} color={colors.muted} />
            <Text style={{ color: colors.muted, marginTop: 8 }}>
              Carica o scatta una foto
            </Text>
          </View>
        )}
        <View style={{ height: 12 }} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable
            onPress={() => pick('camera')}
            style={[styles.btn, { flex: 1 }]}
          >
            <Ionicons name="camera-outline" size={20} color={colors.ink} />
            <Text style={styles.btnLabel}>Fotocamera</Text>
          </Pressable>
          <Pressable
            onPress={() => pick('gallery')}
            style={[styles.btn, { flex: 1 }]}
          >
            <Ionicons name="images-outline" size={20} color={colors.ink} />
            <Text style={styles.btnLabel}>Galleria</Text>
          </Pressable>
        </View>
        <View style={{ height: 12 }} />
        <PrimaryButton
          label="Analizza"
          onPress={analyze}
          disabled={!uri}
          loading={loading}
        />
        <View style={{ height: 16 }} />
        {loading && (
          <View style={{ alignItems: 'center', padding: 12 }}>
            <ActivityIndicator color={colors.primary} />
          </View>
        )}
        {result && (
          <View style={styles.result}>
            <Text>{result}</Text>
          </View>
        )}
        <Text style={styles.disclaimer}>{Disclaimers.aiShort}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  preview: {
    width: '100%',
    height: 280,
    borderRadius: radii.lg,
  },
  empty: {
    height: 200,
    backgroundColor: '#fff',
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
  },
  btnLabel: { marginLeft: 8, fontWeight: '600' },
  result: {
    padding: 14,
    backgroundColor: '#fff',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  disclaimer: {
    fontSize: 11,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 12,
  },
});
