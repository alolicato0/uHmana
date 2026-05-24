import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { toDataUrl } from '../services/openrouter';
import { useVetStore, type VetMessage } from '../store/vetStore';
import { colors, radii } from '../theme';
import type { ChatAttachment } from '../types';

const TEAL = '#10B981';

export function VetChatModal({
  visible,
  onClose,
  petName,
  prefill,
}: {
  visible: boolean;
  onClose: () => void;
  petName: string;
  prefill?: string;
}) {
  const { getToken } = useAuth();
  const vetMessages = useVetStore((s) => s.vetMessages);
  const vetSending = useVetStore((s) => s.vetSending);
  const sendVetMessage = useVetStore((s) => s.sendVetMessage);
  const clearVetChat = useVetStore((s) => s.clearVetChat);

  const [input, setInput] = useState('');
  const [pending, setPending] = useState<ChatAttachment[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const listRef = useRef<FlatList<VetMessage>>(null);
  const prefillSent = useRef<string | null>(null);

  // Auto-invio del prefill (dalla pagina sintomi) una sola volta per valore
  useEffect(() => {
    if (visible && prefill && prefillSent.current !== prefill) {
      prefillSent.current = prefill;
      void sendVetMessage(prefill, { getToken, petName });
    }
    if (!visible) prefillSent.current = null;
  }, [visible, prefill, getToken, petName, sendVetMessage]);

  useEffect(() => {
    if (visible) setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 120);
  }, [vetMessages.length, visible]);

  const handleSend = async () => {
    const msg = input.trim();
    if ((!msg && pending.length === 0) || vetSending) return;
    const attachments = pending;
    setInput('');
    setPending([]);
    await sendVetMessage(msg, { getToken, petName, attachments: attachments.length ? attachments : undefined });
  };

  async function pickFromLibrary() {
    setPickerOpen(false);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      quality: 0.7,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });
    if (res.canceled || !res.assets[0]) return;
    const asset = res.assets[0];
    const mime = asset.mimeType ?? 'image/jpeg';
    const dataUrl = await toDataUrl(asset.uri, mime);
    setPending((p) => [...p, { url: asset.uri, mimeType: mime, dataUrl }]);
  }

  async function pickFromCamera() {
    setPickerOpen(false);
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (res.canceled || !res.assets[0]) return;
    const asset = res.assets[0];
    const mime = asset.mimeType ?? 'image/jpeg';
    const dataUrl = await toDataUrl(asset.uri, mime);
    setPending((p) => [...p, { url: asset.uri, mimeType: mime, dataUrl }]);
  }

  const renderMessage = ({ item }: { item: VetMessage }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAI]}>
        {item.attachments?.map((a, i) => (
          <Image key={i} source={{ uri: a.url }} style={styles.bubbleImg} />
        ))}
        {item.text ? (
          <Text style={{ fontSize: 13, color: isUser ? '#fff' : colors.ink, lineHeight: 19 }}>{item.text}</Text>
        ) : null}
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay} />
      </TouchableWithoutFeedback>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={{ fontSize: 15 }}>🐾</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerText}>Assistente Vet</Text>
            <Text style={styles.headerSub}>Chat privata · {petName}</Text>
          </View>
          <Pressable onPress={clearVetChat} hitSlop={10} style={{ marginRight: 8 }}>
            <Ionicons name="trash-outline" size={18} color={colors.muted} />
          </Pressable>
          <Pressable onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={22} color={colors.muted} />
          </Pressable>
        </View>
        <FlatList
          ref={listRef}
          data={vetMessages}
          keyExtractor={(m) => m.id}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 12, gap: 10 }}
          renderItem={renderMessage}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        />
        {vetSending && (
          <View style={{ paddingHorizontal: 16, paddingBottom: 4 }}>
            <ActivityIndicator size="small" color={TEAL} />
          </View>
        )}
        {pending.length > 0 && (
          <View style={styles.attachStrip}>
            {pending.map((a, i) => (
              <View key={i} style={styles.attachThumbWrap}>
                <Image source={{ uri: a.url }} style={styles.attachThumb} />
                <Pressable
                  style={styles.attachRemove}
                  onPress={() => setPending((p) => p.filter((_, idx) => idx !== i))}
                  hitSlop={6}
                >
                  <Ionicons name="close" size={12} color="#fff" />
                </Pressable>
              </View>
            ))}
          </View>
        )}
        <View style={styles.inputRow}>
          <Pressable
            onPress={() => setPickerOpen(true)}
            style={styles.attachBtn}
            disabled={vetSending}
            hitSlop={6}
          >
            <Ionicons name="add" size={22} color={TEAL} />
          </Pressable>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Scrivi all'assistente vet..."
            placeholderTextColor={colors.muted}
            style={styles.input}
            onSubmitEditing={handleSend}
            returnKeyType="send"
          />
          <Pressable
            onPress={handleSend}
            style={[styles.sendBtn, ((!input.trim() && pending.length === 0) || vetSending) && { opacity: 0.4 }]}
            disabled={(!input.trim() && pending.length === 0) || vetSending}
          >
            <Ionicons name="send" size={18} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setPickerOpen(false)} />
        <View style={styles.pickerSheet}>
          <View style={styles.handle} />
          <Pressable style={styles.pickerItem} onPress={pickFromCamera}>
            <Ionicons name="camera-outline" size={22} color={colors.ink} />
            <Text style={styles.pickerItemTxt}>Scatta foto</Text>
          </Pressable>
          <Pressable style={styles.pickerItem} onPress={pickFromLibrary}>
            <Ionicons name="images-outline" size={22} color={colors.ink} />
            <Text style={styles.pickerItemTxt}>Scegli dalla galleria</Text>
          </Pressable>
          <Pressable style={[styles.pickerItem, { justifyContent: 'center' }]} onPress={() => setPickerOpen(false)}>
            <Text style={[styles.pickerItemTxt, { color: colors.muted }]}>Annulla</Text>
          </Pressable>
        </View>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '82%',
    minHeight: '62%',
  },
  handle: { width: 40, height: 4, backgroundColor: '#D1D5DB', borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 6 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center' },
  headerText: { fontSize: 16, fontWeight: '700', color: colors.ink },
  headerSub: { fontSize: 11, color: colors.muted, marginTop: 1 },
  bubble: { maxWidth: '85%', borderRadius: 16, padding: 12 },
  bubbleUser: { alignSelf: 'flex-end', backgroundColor: TEAL, borderBottomRightRadius: 4 },
  bubbleAI: { alignSelf: 'flex-start', backgroundColor: '#F3F4F6', borderBottomLeftRadius: 4 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.ink,
    backgroundColor: '#F9FAFB',
  },
  sendBtn: { borderRadius: 20, width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: TEAL },
  attachBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, backgroundColor: '#F9FAFB' },
  attachStrip: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 6, paddingBottom: 0 },
  attachThumbWrap: { position: 'relative' },
  attachThumb: { width: 56, height: 56, borderRadius: 10, backgroundColor: '#F3F4F6' },
  attachRemove: { position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: 9, backgroundColor: '#1F2937', alignItems: 'center', justifyContent: 'center' },
  bubbleImg: { width: 200, height: 200, borderRadius: 12, marginBottom: 6, backgroundColor: '#F3F4F6' },
  pickerSheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 28, paddingTop: 6 },
  pickerItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  pickerItemTxt: { fontSize: 15, fontWeight: '600', color: colors.ink },
});
