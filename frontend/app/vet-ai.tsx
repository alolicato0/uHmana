import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useProfileStore } from '../src/store/profile';
import { useTimelineStore } from '../src/store/timeline';
import { useChatStore } from '../src/store/chat';
import { radii } from '../src/theme';

const TEAL = '#10B981';
const AMBER = '#F59E0B';
const BG = '#FDFBF5';
const INK = '#1A1A2E';
const MUTED = '#6B7280';
const BORDER = '#E8EAF0';

const CHIPS = [
  'Non mangia', 'Vomita', 'Zoppica', 'Si gratta',
  'È apatico', 'Ha diarrea', 'Tosse', 'Occhi rossi',
  'Beve troppo', 'Ha mangiato qualcosa di strano',
];

const MONITOR_ITEMS = [
  { icon: '🍽️', label: 'Appetito ridotto', key: 'appetite' },
  { icon: '🦿', label: 'Zoppia persistente', key: 'limp' },
  { icon: '🤢', label: 'Vomito ricorrente', key: 'vomit' },
  { icon: '😶', label: 'Cambiamento comportamento', key: 'behavior' },
];

function goToChat(q: string) {
  router.push({ pathname: '/(tabs)/chat', params: { q } } as never);
}

export default function VetAiScreen() {
  const scrollRef = useRef<ScrollView>(null);
  const [quickY, setQuickY] = useState(0);

  const profiles = useProfileStore((s) => s.profiles);
  const petProfile = profiles.find((p) => p.kind === 'pet');
  const petName = petProfile?.name ?? 'il tuo animale';
  const petSpecies = petProfile?.species ?? '';

  const events = useTimelineStore((s) => s.events);
  const recentSymptoms = events
    .filter((e) => e.type === 'symptom')
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  const messages = useChatStore((s) => s.messages);
  const lastConsultations = messages
    .filter((m) => m.role === 'user' && m.text.length > 5)
    .slice(-5)
    .reverse()
    .slice(0, 3);

  const hasSymptoms = recentSymptoms.length > 0;
  const heroStatus = hasSymptoms ? 'Richiede attenzione' : 'Sembra stabile';
  const heroGrad: [string, string] = hasSymptoms ? ['#F59E0B', '#EF4444'] : ['#10B981', '#F59E0B'];

  const scrollToQuick = () => {
    scrollRef.current?.scrollTo({ y: quickY - 12, animated: true });
  };

  const handlePhoto = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert('Analizza foto/video', 'Come vuoi aggiungere il contenuto?', [
      {
        text: 'Scatta foto',
        onPress: async () => {
          const perm = await ImagePicker.requestCameraPermissionsAsync();
          if (!perm.granted) return;
          const res = await ImagePicker.launchCameraAsync({ quality: 0.8, base64: true });
          if (!res.canceled) goToChat(`Analizza questa foto di ${petName}: [foto allegata]`);
        },
      },
      {
        text: 'Galleria',
        onPress: () => goToChat(`Ho una foto di ${petName} che vorrei analizzare`),
      },
      { text: 'Annulla', style: 'cancel' },
    ]);
  };

  const formatRelative = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'oggi';
    if (days === 1) return 'ieri';
    return `${days} giorni fa`;
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={INK} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>🐾 Assistente Vet</Text>
          <Text style={styles.headerSub}>
            Analisi e supporto veterinario AI{petProfile ? ` per ${petName}` : ''}
          </Text>
        </View>
        <Pressable
          hitSlop={8}
          onPress={() => Alert.alert('Info', 'Questo assistente fornisce supporto informativo AI. Per diagnosi accurate consulta sempre un medico veterinario.')}
        >
          <Ionicons name="information-circle-outline" size={22} color={MUTED} />
        </Pressable>
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {/* ── Hero ── */}
        <LinearGradient colors={heroGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <View style={styles.heroLabel}>
            <Text style={{ fontSize: 14 }}>🐾</Text>
            <Text style={styles.heroLabelTxt}>Stato veterinario AI</Text>
          </View>
          <Text style={styles.heroTitle}>{heroStatus}</Text>
          <View style={styles.heroBullets}>
            {hasSymptoms ? (
              recentSymptoms.slice(0, 3).map((e) => (
                <Text key={e.id} style={styles.heroBullet}>• {e.title}</Text>
              ))
            ) : (
              <>
                <Text style={styles.heroBullet}>• Attività regolare</Text>
                <Text style={styles.heroBullet}>• Nessun sintomo recente</Text>
                <Text style={styles.heroBullet}>• Stato comportamentale ok</Text>
              </>
            )}
          </View>
          <Pressable style={styles.heroCta} onPress={scrollToQuick}>
            <Text style={styles.heroCtaTxt}>Avvia controllo rapido →</Text>
          </Pressable>
        </LinearGradient>

        {/* ── Controllo rapido ── */}
        <View
          style={{ marginTop: 22 }}
          onLayout={(e) => setQuickY(e.nativeEvent.layout.y)}
        >
          <Text style={styles.sectionTitle}>Controllo rapido</Text>
          <View style={{ height: 10 }} />

          <Pressable
            style={styles.quickBtn}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              goToChat(`${petName} ha un sintomo. Vorrei descriverlo.`);
            }}
          >
            <LinearGradient colors={['#FEF9C3', '#FEF3C7']} style={styles.quickBtnIcon}>
              <Text style={{ fontSize: 24 }}>🤒</Text>
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={styles.quickBtnTitle}>Ha un sintomo</Text>
              <Text style={styles.quickBtnDesc}>Zoppia, vomito, diarrea, tosse, prurito, apatia…</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={MUTED} />
          </Pressable>

          <Pressable style={styles.quickBtn} onPress={handlePhoto}>
            <LinearGradient colors={['#EFF6FF', '#DBEAFE']} style={styles.quickBtnIcon}>
              <Text style={{ fontSize: 24 }}>📷</Text>
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={styles.quickBtnTitle}>Analizza foto/video</Text>
              <Text style={styles.quickBtnDesc}>Pelle, occhi, ferite, orecchie, movimento…</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={MUTED} />
          </Pressable>

          <Pressable
            style={styles.quickBtn}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              goToChat(`Ho una domanda su ${petName}:`);
            }}
          >
            <LinearGradient colors={['#F0FDF4', '#DCFCE7']} style={styles.quickBtnIcon}>
              <Text style={{ fontSize: 24 }}>❓</Text>
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={styles.quickBtnTitle}>Fai una domanda</Text>
              <Text style={styles.quickBtnDesc}>Comportamento, alimentazione, farmaci, prevenzione…</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={MUTED} />
          </Pressable>
        </View>

        {/* ── Sintomi comuni ── */}
        <View style={{ marginTop: 22 }}>
          <Text style={styles.sectionTitle}>Sintomi comuni</Text>
          <Text style={styles.sectionSub}>Tocca per avviare una valutazione guidata</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }} contentContainerStyle={{ gap: 8 }}>
            {CHIPS.map((chip) => (
              <Pressable
                key={chip}
                style={styles.chip}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  goToChat(`${petName} ${chip.toLowerCase()}. Cosa potrebbe essere?`);
                }}
              >
                <Text style={styles.chipTxt}>{chip}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* ── Insight Vet ── */}
        <View style={[styles.insightCard, { marginTop: 22 }]}>
          <View style={styles.insightHeader}>
            <Text style={{ fontSize: 16 }}>🧠</Text>
            <Text style={styles.insightTitle}>Insight Vet</Text>
          </View>
          {hasSymptoms ? (
            <Text style={styles.insightText}>
              Negli ultimi giorni hai registrato {recentSymptoms.length}{' '}
              {recentSymptoms.length === 1 ? 'evento' : 'eventi'} per {petName}.
              {recentSymptoms.length >= 3
                ? ' Potrebbe essere utile monitorare attentamente e consultare un veterinario.'
                : ' Continua a monitorare e registra eventuali cambiamenti.'}
            </Text>
          ) : (
            <Text style={styles.insightText}>
              Nessun evento critico registrato di recente per {petName}.
              Continua a registrare sintomi e attività per costruire un profilo salute accurato.
            </Text>
          )}
        </View>

        {/* ── Da monitorare ── */}
        <View style={{ marginTop: 22 }}>
          <Text style={styles.sectionTitle}>Da monitorare</Text>
          <View style={{ height: 10 }} />
          {MONITOR_ITEMS.map((item) => (
            <View key={item.key} style={styles.monitorRow}>
              <Text style={{ fontSize: 18, width: 28 }}>{item.icon}</Text>
              <Text style={styles.monitorLabel}>{item.label}</Text>
              <View style={styles.monitorActions}>
                <Pressable
                  style={styles.monitorBtn}
                  onPress={() => router.push('/add-event' as never)}
                >
                  <Text style={styles.monitorBtnTxt}>Registra</Text>
                </Pressable>
                <Pressable
                  style={styles.monitorBtn}
                  onPress={() => goToChat(`${petName}: ${item.label.toLowerCase()}. Cosa devo fare?`)}
                >
                  <Text style={styles.monitorBtnTxt}>Chiedi AI</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>

        {/* ── Ultime valutazioni ── */}
        {lastConsultations.length > 0 && (
          <View style={{ marginTop: 22 }}>
            <Text style={styles.sectionTitle}>Ultime valutazioni</Text>
            <View style={{ height: 10 }} />
            {lastConsultations.map((m) => (
              <Pressable
                key={m.id}
                style={styles.consultRow}
                onPress={() => router.push('/(tabs)/chat' as never)}
              >
                <View style={styles.consultIcon}>
                  <Ionicons name="chatbubble-ellipses-outline" size={16} color={TEAL} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.consultTxt} numberOfLines={1}>"{m.text}"</Text>
                  <Text style={styles.consultDate}>{formatRelative(m.createdAt)}</Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color={MUTED} />
              </Pressable>
            ))}
          </View>
        )}

        {/* ── Azioni rapide ── */}
        <View style={{ marginTop: 24 }}>
          <Text style={styles.sectionTitle}>Azioni rapide</Text>
          <View style={[styles.actionsRow, { marginTop: 10 }]}>
            <Pressable style={styles.actionPill} onPress={() => router.push('/add-event' as never)}>
              <Text style={{ fontSize: 16 }}>🤒</Text>
              <Text style={styles.actionPillTxt}>Sintomo</Text>
            </Pressable>
            <Pressable style={styles.actionPill} onPress={handlePhoto}>
              <Text style={{ fontSize: 16 }}>📷</Text>
              <Text style={styles.actionPillTxt}>Foto</Text>
            </Pressable>
            <Pressable style={styles.actionPill} onPress={() => router.push('/add-event' as never)}>
              <Text style={{ fontSize: 16 }}>📝</Text>
              <Text style={styles.actionPillTxt}>Nota</Text>
            </Pressable>
            <Pressable style={[styles.actionPill, { backgroundColor: TEAL }]} onPress={() => router.push('/(tabs)/chat' as never)}>
              <Ionicons name="chatbubble-ellipses" size={16} color="#fff" />
              <Text style={[styles.actionPillTxt, { color: '#fff' }]}>Chat Vet</Text>
            </Pressable>
          </View>
        </View>

        {/* Disclaimer */}
        <Text style={styles.disclaimer}>
          ⚠️ Le valutazioni AI sono a scopo informativo. Per diagnosi accurate consulta sempre un medico veterinario.
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
  headerSub: { fontSize: 11, color: MUTED, marginTop: 1 },

  hero: {
    borderRadius: 22,
    padding: 20,
  },
  heroLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroLabelTxt: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },
  heroTitle: { fontSize: 24, fontWeight: '900', color: '#fff', marginTop: 8, marginBottom: 10 },
  heroBullets: { gap: 3 },
  heroBullet: { fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 19 },
  heroCta: {
    marginTop: 16,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 99,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignSelf: 'flex-start',
  },
  heroCtaTxt: { fontWeight: '700', color: '#fff', fontSize: 14 },

  sectionTitle: { fontSize: 15, fontWeight: '800', color: INK },
  sectionSub: { fontSize: 11, color: MUTED, marginTop: 2 },

  quickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#fff',
    borderRadius: radii.md,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  quickBtnIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  quickBtnTitle: { fontSize: 15, fontWeight: '700', color: INK },
  quickBtnDesc: { fontSize: 12, color: MUTED, marginTop: 2, lineHeight: 16 },

  chip: {
    backgroundColor: '#fff',
    borderRadius: 99,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  chipTxt: { fontSize: 13, fontWeight: '600', color: INK },

  insightCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: radii.md,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  insightHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  insightTitle: { fontSize: 14, fontWeight: '700', color: '#16A34A' },
  insightText: { fontSize: 13, color: INK, lineHeight: 19 },

  monitorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: radii.md,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: BORDER,
    gap: 10,
  },
  monitorLabel: { flex: 1, fontSize: 13, fontWeight: '600', color: INK },
  monitorActions: { flexDirection: 'row', gap: 6 },
  monitorBtn: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 99,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  monitorBtnTxt: { fontSize: 11, fontWeight: '700', color: '#16A34A' },

  consultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: radii.md,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: BORDER,
  },
  consultIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  consultTxt: { fontSize: 13, fontWeight: '600', color: INK, fontStyle: 'italic' },
  consultDate: { fontSize: 11, color: MUTED, marginTop: 2 },

  actionsRow: { flexDirection: 'row', gap: 8 },
  actionPill: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: BORDER,
  },
  actionPillTxt: { fontSize: 11, fontWeight: '700', color: INK },

  disclaimer: {
    fontSize: 11,
    color: MUTED,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 24,
    paddingHorizontal: 8,
  },
});
