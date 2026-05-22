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
import { chat } from '../services/openrouter';
import { colors, radii } from '../theme';

type LocalMsg = { role: 'user' | 'assistant'; text: string };

export function SectionChatModal({
  visible,
  onClose,
  title,
  accent = colors.primary,
  welcome,
  buildContext,
  onAssistantReply,
  autoPrompt,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  accent?: string;
  welcome: string;
  buildContext: () => string;
  onAssistantReply?: (text: string) => void;
  autoPrompt?: string;
}) {
  const { getToken } = useAuth();
  const [messages, setMessages] = useState<LocalMsg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const flatRef = useRef<FlatList<LocalMsg>>(null);

  const doSend = async (text: string, base: LocalMsg[]) => {
    const updated: LocalMsg[] = [...base, { role: 'user', text }];
    setMessages(updated);
    setSending(true);
    try {
      const token = await getToken();
      const history = updated.map((m, i) => ({
        id: `m-${i}`,
        role: m.role,
        text: m.text,
        createdAt: new Date().toISOString(),
      }));
      const reply = await chat({ history, extraContext: buildContext(), token });
      setMessages((prev) => [...prev, { role: 'assistant', text: reply }]);
      onAssistantReply?.(reply);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', text: "Errore nel contattare l'AI. Riprova." }]);
    } finally {
      setSending(false);
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  // Reset (e auto-invio prompt) ad ogni apertura
  useEffect(() => {
    if (!visible) return;
    const welcomeMsg: LocalMsg = { role: 'assistant', text: welcome };
    setMessages([welcomeMsg]);
    setInput('');
    if (autoPrompt && autoPrompt.trim()) {
      void doSend(autoPrompt.trim(), [welcomeMsg]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, autoPrompt]);

  const send = () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;
    setInput('');
    void doSend(trimmed, messages);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay} />
      </TouchableWithoutFeedback>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <Ionicons name="sparkles" size={18} color={accent} />
          <Text style={styles.headerText}>{title}</Text>
          <Pressable onPress={onClose} hitSlop={10} style={{ marginLeft: 'auto' }}>
            <Ionicons name="close" size={22} color={colors.muted} />
          </Pressable>
        </View>
        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={(_, i) => String(i)}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 12, gap: 10 }}
          renderItem={({ item }) => (
            <View style={[styles.bubble, item.role === 'user' ? [styles.bubbleUser, { backgroundColor: accent }] : styles.bubbleAI]}>
              <Text style={{ fontSize: 13, color: item.role === 'user' ? '#fff' : colors.ink, lineHeight: 19 }}>
                {item.text}
              </Text>
            </View>
          )}
        />
        {sending && (
          <View style={{ paddingHorizontal: 16, paddingBottom: 4 }}>
            <ActivityIndicator size="small" color={accent} />
          </View>
        )}
        <View style={styles.inputRow}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Scrivi un messaggio..."
            placeholderTextColor={colors.muted}
            style={styles.input}
            onSubmitEditing={send}
            returnKeyType="send"
          />
          <Pressable
            onPress={send}
            disabled={!input.trim() || sending}
            style={[styles.sendBtn, { backgroundColor: accent }, (!input.trim() || sending) && { opacity: 0.4 }]}
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
    maxHeight: '80%',
    minHeight: '60%',
  },
  handle: { width: 40, height: 4, backgroundColor: '#D1D5DB', borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 6 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerText: { fontSize: 16, fontWeight: '700', color: colors.ink },
  bubble: { maxWidth: '85%', borderRadius: 16, padding: 12 },
  bubbleUser: { alignSelf: 'flex-end', borderBottomRightRadius: 4 },
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
  sendBtn: { borderRadius: 20, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});
