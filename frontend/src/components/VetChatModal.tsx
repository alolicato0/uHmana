import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
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
import { useVetStore, type VetMessage } from '../store/vetStore';
import { colors, radii } from '../theme';

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
    if (!msg || vetSending) return;
    setInput('');
    await sendVetMessage(msg, { getToken, petName });
  };

  const renderMessage = ({ item }: { item: VetMessage }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAI]}>
        <Text style={{ fontSize: 13, color: isUser ? '#fff' : colors.ink, lineHeight: 19 }}>{item.text}</Text>
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
        <View style={styles.inputRow}>
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
            style={[styles.sendBtn, (!input.trim() || vetSending) && { opacity: 0.4 }]}
            disabled={!input.trim() || vetSending}
          >
            <Ionicons name="send" size={18} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
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
});
