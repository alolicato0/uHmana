import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/context/AuthContext';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useProfileStore } from '../src/store/profile';
import { useVetStore, type VetMessage } from '../src/store/vetStore';

const TEAL = '#10B981';
const BG = '#FDFBF5';
const INK = '#1A1A2E';
const MUTED = '#6B7280';
const BORDER = '#E8EAF0';

export default function ChatVetScreen() {
  const { prefill } = useLocalSearchParams<{ prefill?: string }>();
  const { getToken } = useAuth();

  const profiles = useProfileStore((s) => s.profiles);
  const petProfile = profiles.find((p) => p.kind === 'pet');
  const petName = petProfile?.name ?? 'il tuo animale';

  const vetMessages = useVetStore((s) => s.vetMessages);
  const vetSending = useVetStore((s) => s.vetSending);
  const sendVetMessage = useVetStore((s) => s.sendVetMessage);
  const clearVetChat = useVetStore((s) => s.clearVetChat);

  const [text, setText] = useState('');
  const listRef = useRef<FlatList<VetMessage>>(null);
  const prefillSent = useRef(false);

  // Auto-send prefill from sintomo-vet
  useEffect(() => {
    if (prefill && !prefillSent.current) {
      prefillSent.current = true;
      const decoded = decodeURIComponent(prefill);
      void sendVetMessage(decoded, { getToken, petName });
    }
  }, [prefill, petName, getToken, sendVetMessage]);

  useEffect(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 120);
  }, [vetMessages.length]);

  const handleSend = async () => {
    const msg = text.trim();
    if (!msg || vetSending) return;
    setText('');
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await sendVetMessage(msg, { getToken, petName });
  };

  const handleClear = () => {
    Alert.alert('Svuota chat', 'Vuoi cancellare tutta la conversazione?', [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Svuota',
        style: 'destructive',
        onPress: clearVetChat,
      },
    ]);
  };

  const renderMessage = ({ item }: { item: VetMessage }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.msgRow, isUser && styles.msgRowUser]}>
        {!isUser && (
          <View style={styles.avatarBot}>
            <Text style={{ fontSize: 15 }}>🐾</Text>
          </View>
        )}
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleBot]}>
          <Text style={[styles.bubbleTxt, isUser && styles.bubbleTxtUser]}>{item.text}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={INK} />
        </Pressable>
        <View style={styles.avatarBotSm}>
          <Text style={{ fontSize: 16 }}>🐾</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Assistente Vet</Text>
          <Text style={styles.headerSub}>Chat veterinaria · {petName}</Text>
        </View>
        <Pressable hitSlop={8} onPress={handleClear}>
          <Ionicons name="trash-outline" size={20} color={MUTED} />
        </Pressable>
      </View>

      {/* Messages */}
      <FlatList
        ref={listRef}
        data={vetMessages}
        keyExtractor={(m) => m.id}
        renderItem={renderMessage}
        contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() =>
          listRef.current?.scrollToEnd({ animated: false })
        }
      />

      {/* Typing indicator */}
      {vetSending && (
        <View style={styles.typingRow}>
          <View style={styles.avatarBotSm}>
            <Text style={{ fontSize: 13 }}>🐾</Text>
          </View>
          <View style={styles.typingBubble}>
            <Text style={styles.typingDots}>• • •</Text>
          </View>
        </View>
      )}

      {/* Input */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Scrivi all'assistente vet…"
            placeholderTextColor={MUTED}
            multiline
            maxLength={1000}
          />
          <Pressable
            style={[styles.sendBtn, (!text.trim() || vetSending) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!text.trim() || vetSending}
          >
            <Ionicons name="send" size={19} color="#fff" />
          </Pressable>
        </View>
        <Text style={styles.inputDisclaimer}>
          Chat privata · non condivisa con la chat principale
        </Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: BG,
  },
  backBtn: { padding: 2 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: INK },
  headerSub: { fontSize: 11, color: MUTED, marginTop: 1 },

  avatarBotSm: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  msgRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 12,
  },
  msgRowUser: { flexDirection: 'row-reverse' },

  bubble: { maxWidth: '78%', borderRadius: 18, padding: 12 },
  bubbleBot: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: BORDER,
    borderBottomLeftRadius: 4,
  },
  bubbleUser: { backgroundColor: TEAL, borderBottomRightRadius: 4 },
  bubbleTxt: { fontSize: 14, color: INK, lineHeight: 20 },
  bubbleTxtUser: { color: '#fff' },

  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  typingBubble: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    padding: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  typingDots: { fontSize: 14, color: MUTED, letterSpacing: 4 },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    backgroundColor: '#fff',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: INK,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: BORDER,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: TEAL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },

  inputDisclaimer: {
    fontSize: 10,
    color: MUTED,
    textAlign: 'center',
    paddingVertical: 4,
    backgroundColor: '#fff',
  },
});
