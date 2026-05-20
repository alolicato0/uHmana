import { useAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Markdown from 'react-native-markdown-display';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Disclaimers } from '../../src/constants/disclaimers';
import { useChatStore } from '../../src/store/chat';
import { colors, radii } from '../../src/theme';
import type { ChatAttachment, ChatMessage } from '../../src/types';

export default function ChatScreen() {
  const { getToken } = useAuth();
  const { messages, sending, error, send, clear } = useChatStore();
  const [text, setText] = useState('');
  const [pending, setPending] = useState<ChatAttachment[]>([]);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const pickImage = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permesso negato', 'Concedi accesso alle foto nelle impostazioni del telefono.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
        base64: true,
      });
      if (res.canceled) return;
      const a = res.assets?.[0];
      if (!a?.uri) {
        Alert.alert('Errore', 'Nessuna immagine selezionata.');
        return;
      }
      const mime = a.mimeType ?? 'image/jpeg';
      setPending((p) => [
        ...p,
        {
          url: a.uri,
          mimeType: mime,
          dataUrl: a.base64 ? `data:${mime};base64,${a.base64}` : undefined,
        },
      ]);
    } catch (e: any) {
      Alert.alert('Errore galleria', e?.message ?? String(e));
    }
  };

  const takePhoto = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permesso negato', 'Concedi accesso alla fotocamera nelle impostazioni del telefono.');
        return;
      }
      const res = await ImagePicker.launchCameraAsync({
        quality: 0.7,
        base64: true,
      });
      if (res.canceled) return;
      const a = res.assets?.[0];
      if (!a?.uri) {
        Alert.alert('Errore', 'Foto non disponibile.');
        return;
      }
      const mime = a.mimeType ?? 'image/jpeg';
      setPending((p) => [
        ...p,
        {
          url: a.uri,
          mimeType: mime,
          dataUrl: a.base64 ? `data:${mime};base64,${a.base64}` : undefined,
        },
      ]);
    } catch (e: any) {
      Alert.alert('Errore fotocamera', e?.message ?? String(e));
    }
  };

  const onSend = async () => {
    if (!text.trim() && pending.length === 0) return;
    const t = text;
    const atts = pending;
    setText('');
    setPending([]);
    await send(t, { attachments: atts, getToken });
    requestAnimationFrame(() =>
      listRef.current?.scrollToEnd({ animated: true }),
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={{ fontWeight: '700', fontSize: 16 }}>Chat AI</Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>
            Assistente di salute
          </Text>
        </View>
        <Pressable onPress={clear}>
          <Ionicons name="refresh" size={22} color={colors.ink} />
        </Pressable>
      </View>

      <View style={styles.warning}>
        <Text style={styles.warningText}>{Disclaimers.aiShort}</Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={80}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
          renderItem={({ item }) => <Bubble msg={item} />}
          ListFooterComponent={sending ? <TypingDots /> : null}
          onContentSizeChange={() =>
            listRef.current?.scrollToEnd({ animated: true })
          }
        />

        {error && (
          <View style={styles.errorBar}>
            <Text style={{ color: colors.danger, fontSize: 12 }}>{error}</Text>
          </View>
        )}

        {pending.length > 0 && (
          <View style={styles.pendingRow}>
            {pending.map((a, i) => (
              <View key={`${a.url}-${i}`} style={{ marginRight: 8 }}>
                <Image source={{ uri: a.url }} style={styles.thumb} />
                <Pressable
                  onPress={() =>
                    setPending((p) => p.filter((_, idx) => idx !== i))
                  }
                  style={styles.removeBadge}
                >
                  <Ionicons name="close" size={12} color="#fff" />
                </Pressable>
              </View>
            ))}
          </View>
        )}

        <View style={styles.composer}>
          <Pressable onPress={takePhoto} hitSlop={8}>
            <Ionicons name="camera-outline" size={24} color={colors.muted} />
          </Pressable>
          <Pressable onPress={pickImage} hitSlop={8} style={{ marginLeft: 8 }}>
            <Ionicons name="image-outline" size={24} color={colors.muted} />
          </Pressable>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Scrivi un messaggio..."
            multiline
            style={styles.input}
            onSubmitEditing={onSend}
            returnKeyType="send"
            blurOnSubmit={false}
          />
          <Pressable onPress={onSend} disabled={sending} style={styles.sendBtn}>
            {sending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons name="send" size={18} color="#fff" />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Bubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user';
  return (
    <View
      style={[
        styles.bubble,
        isUser ? styles.bubbleUser : styles.bubbleBot,
      ]}
    >
      {msg.attachments?.map((a, i) =>
        a.mimeType.startsWith('image/') ? (
          <Image
            key={i}
            source={{ uri: a.url }}
            style={{
              width: 200,
              height: 200,
              borderRadius: 12,
              marginBottom: 6,
            }}
            resizeMode="cover"
          />
        ) : null,
      )}
      {isUser ? (
        <Text style={{ color: '#fff' }}>{msg.text}</Text>
      ) : (
        <Markdown
          style={{
            body: { color: colors.ink, fontSize: 14, lineHeight: 20 },
            strong: { fontWeight: '700' },
          }}
        >
          {msg.text}
        </Markdown>
      )}
    </View>
  );
}

function TypingDots() {
  return (
    <View
      style={[
        styles.bubble,
        styles.bubbleBot,
        { flexDirection: 'row', alignItems: 'center' },
      ]}
    >
      <ActivityIndicator size="small" color={colors.muted} />
      <Text style={{ marginLeft: 8, color: colors.muted }}>
        Analizzando...
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: '#fff',
  },
  warning: {
    backgroundColor: colors.warningSoft,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  warningText: {
    color: colors.warningText,
    fontSize: 11,
    textAlign: 'center',
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.lg,
    marginVertical: 4,
  },
  bubbleUser: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleBot: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 4,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    marginHorizontal: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.bg,
    borderRadius: radii.lg,
    maxHeight: 100,
    fontSize: 15,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBar: {
    backgroundColor: '#FEE2E2',
    padding: 8,
  },
  pendingRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  thumb: { width: 56, height: 56, borderRadius: 10 },
  removeBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
