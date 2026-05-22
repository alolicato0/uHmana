import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Alert,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useProfileStore } from '../src/store/profile';
import { useTimelineStore } from '../src/store/timeline';
import { getFrequentSymptoms, useVetStore } from '../src/store/vetStore';
import { radii } from '../src/theme';

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

const TEAL = '#10B981';
const BG = '#FDFBF5';
const INK = '#1A1A2E';
const MUTED = '#6B7280';
const BORDER = '#E8EAF0';

const BASE_CHIPS = [
  'Non mangia', 'Vomita', 'Zoppica', 'Si gratta',
  'È apatico', 'Ha diarrea', 'Tosse', 'Occhi rossi',
  'Beve troppo', 'Ha mangiato qualcosa di strano',
];

export default function VetAiScreen() {
  const scrollRef = useRef<ScrollView>(null);
  const [quickY, setQuickY] = useState(0);
  const [selectedChips, setSelectedChips] = useState<string[]>([]);
  const [addingMonitor, setAddingMonitor] = useState(false);
  const [newMonitorLabel, setNewMonitorLabel] = useState('');

  const profiles = useProfileStore((s) => s.profiles);
  const petProfile = profiles.find((p) => p.kind === 'pet');
  const petName = petProfile?.name ?? 'il tuo animale';

  const events = useTimelineStore((s) => s.events);
  const recentSymptoms = events
    .filter((e) => e.type === 'symptom')
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);
  const hasSymptoms = recentSymptoms.length > 0;
  const heroGrad: [string, string] = hasSymptoms ? ['#F59E0B', '#EF4444'] : ['#10B981', '#F59E0B'];
  const heroStatus = hasSymptoms ? 'Richiede attenzione' : 'Sembra stabile';

  const symptomHistory = useVetStore((s) => s.symptomHistory);
  const monitorItems = useVetStore((s) => s.monitorItems);
  const vetMessages = useVetStore((s) => s.vetMessages);
  const insightText = useVetStore((s) => s.insightText);
  const addMonitorItem = useVetStore((s) => s.addMonitorItem);
  const removeMonitorItem = useVetStore((s) => s.removeMonitorItem);

  // Merge frequent symptoms into chip list
  const frequent = getFrequentSymptoms(symptomHistory, 3);
  const chips = [...new Set([...BASE_CHIPS, ...frequent])];

  // Last 3 user messages from internal vet chat
  const lastConsultations = vetMessages
    .filter((m) => m.role === 'user' && m.text.length > 5)
    .slice(-5)
    .reverse()
    .slice(0, 3);

  const scrollToQuick = () => {
    scrollRef.current?.scrollTo({ y: quickY - 12, animated: true });
  };

  const toggleChip = (chip: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedChips((prev) =>
      prev.includes(chip) ? prev.filter((c) => c !== chip) : [...prev, chip],
    );
  };

  const pushSelectedToSintomo = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: '/sintomo-vet',
      params: { preselected: selectedChips.join(',') },
    } as never);
    setSelectedChips([]);
  };

  const handleAddMonitorItem = () => {
    const label = newMonitorLabel.trim();
    if (!label) return;
    addMonitorItem({ icon: '🔍', label });
    setNewMonitorLabel('');
    setAddingMonitor(false);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  };

  const handleRemoveMonitor = (id: string) => {
    Alert.alert('Rimuovi voce', 'Vuoi rimuovere questo elemento da monitorare?', [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Rimuovi',
        style: 'destructive',
        onPress: () => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          removeMonitorItem(id);
        },
      },
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
          onPress={() =>
            Alert.alert(
              'Info',
              'Questo assistente fornisce supporto informativo AI. Per diagnosi accurate consulta sempre un medico veterinario.',
            )
          }
        >
          <Ionicons name="information-circle-outline" size={22} color={MUTED} />
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Hero ── */}
        <LinearGradient
          colors={heroGrad}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroLabel}>
            <Text style={{ fontSize: 14 }}>🐾</Text>
            <Text style={styles.heroLabelTxt}>Stato veterinario AI</Text>
          </View>
          <Text style={styles.heroTitle}>{heroStatus}</Text>
          <View style={styles.heroBullets}>
            {hasSymptoms ? (
              recentSymptoms
                .slice(0, 3)
                .map((e) => (
                  <Text key={e.id} style={styles.heroBullet}>
                    • {e.title}
                  </Text>
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
        <View style={{ marginTop: 22 }} onLayout={(e) => setQuickY(e.nativeEvent.layout.y)}>
          <Text style={styles.sectionTitle}>Controllo rapido</Text>
          <View style={{ height: 10 }} />

          {/* Ha un sintomo → sintomo-vet page */}
          <Pressable
            style={styles.quickBtn}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/sintomo-vet' as never);
            }}
          >
            <LinearGradient colors={['#FEF9C3', '#FEF3C7']} style={styles.quickBtnIcon}>
              <Text style={{ fontSize: 24 }}>🤒</Text>
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={styles.quickBtnTitle}>Ha un sintomo</Text>
              <Text style={styles.quickBtnDesc}>
                Seleziona sintomi, aggiungi foto/video e invia all'assistente vet
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={MUTED} />
          </Pressable>

          {/* Fai una domanda → chat-vet */}
          <Pressable
            style={styles.quickBtn}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/chat-vet' as never);
            }}
          >
            <LinearGradient colors={['#F0FDF4', '#DCFCE7']} style={styles.quickBtnIcon}>
              <Text style={{ fontSize: 24 }}>❓</Text>
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={styles.quickBtnTitle}>Fai una domanda</Text>
              <Text style={styles.quickBtnDesc}>
                Comportamento, alimentazione, farmaci, prevenzione…
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={MUTED} />
          </Pressable>
        </View>

        {/* ── Sintomi comuni — multi-select ── */}
        <View style={{ marginTop: 22 }}>
          <View style={styles.sectionRow}>
            <View>
              <Text style={styles.sectionTitle}>Sintomi comuni</Text>
              <Text style={styles.sectionSub}>
                Seleziona uno o più sintomi, poi premi + per inserirli
              </Text>
            </View>
            {selectedChips.length > 0 && (
              <Pressable style={styles.addChipsBtn} onPress={pushSelectedToSintomo}>
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.addChipsBtnTxt}>{selectedChips.length}</Text>
              </Pressable>
            )}
          </View>
          <View style={[styles.chipsWrap, { marginTop: 10 }]}>
            {chips.map((chip) => {
              const active = selectedChips.includes(chip);
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
          {selectedChips.length > 0 && (
            <Pressable style={styles.openSintomoBar} onPress={pushSelectedToSintomo}>
              <Text style={styles.openSintomoTxt}>
                Apri pagina sintomi con {selectedChips.length} selezionati →
              </Text>
            </Pressable>
          )}
        </View>

        {/* ── Insight Vet ── */}
        <View style={[styles.insightCard, { marginTop: 22 }]}>
          <View style={styles.insightHeader}>
            <Text style={{ fontSize: 16 }}>🧠</Text>
            <Text style={styles.insightTitle}>Insight Vet</Text>
            <Pressable
              hitSlop={8}
              style={styles.insightChatBtn}
              onPress={() => router.push('/chat-vet' as never)}
            >
              <Text style={styles.insightChatBtnTxt}>Apri chat →</Text>
            </Pressable>
          </View>
          {insightText ? (
            <Text style={styles.insightText}>{insightText}</Text>
          ) : hasSymptoms ? (
            <Text style={styles.insightText}>
              Negli ultimi giorni hai registrato {recentSymptoms.length}{' '}
              {recentSymptoms.length === 1 ? 'evento' : 'eventi'} per {petName}.
              {recentSymptoms.length >= 3
                ? ' Potrebbe essere utile monitorare attentamente e consultare un veterinario.'
                : ' Continua a monitorare e registra eventuali cambiamenti.'}
            </Text>
          ) : (
            <Text style={styles.insightText}>
              Nessun evento critico registrato di recente. Usa la chat veterinaria per ricevere
              valutazioni personalizzate su {petName}.
            </Text>
          )}
        </View>

        {/* ── Da monitorare ── */}
        <View style={{ marginTop: 22 }}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Da monitorare</Text>
            <Pressable
              hitSlop={8}
              onPress={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setAddingMonitor((v) => !v);
              }}
            >
              <Ionicons name={addingMonitor ? 'close' : 'add-circle-outline'} size={22} color={TEAL} />
            </Pressable>
          </View>
          <View style={{ height: 10 }} />

          {addingMonitor && (
            <View style={styles.addMonitorRow}>
              <TextInput
                style={styles.addMonitorInput}
                placeholder="Nuova voce da monitorare…"
                placeholderTextColor={MUTED}
                value={newMonitorLabel}
                onChangeText={setNewMonitorLabel}
                returnKeyType="done"
                onSubmitEditing={handleAddMonitorItem}
                autoFocus
              />
              <Pressable
                style={[styles.addMonitorSave, !newMonitorLabel.trim() && { opacity: 0.4 }]}
                onPress={handleAddMonitorItem}
                disabled={!newMonitorLabel.trim()}
              >
                <Text style={styles.addMonitorSaveTxt}>Aggiungi</Text>
              </Pressable>
            </View>
          )}

          {monitorItems.length === 0 ? (
            <Text style={[styles.sectionSub, { marginTop: 4 }]}>
              Nessuna voce. Tocca + per aggiungerne una.
            </Text>
          ) : (
            monitorItems.map((item) => (
              <View key={item.id} style={styles.monitorRow}>
                <Text style={{ fontSize: 18, width: 28 }}>{item.icon}</Text>
                <Text style={styles.monitorLabel}>{item.label}</Text>
                <View style={styles.monitorActions}>
                  <Pressable
                    style={styles.monitorBtn}
                    onPress={() => router.push('/sintomo-vet' as never)}
                  >
                    <Text style={styles.monitorBtnTxt}>Registra</Text>
                  </Pressable>
                  <Pressable
                    style={styles.monitorBtn}
                    onPress={() =>
                      router.push({
                        pathname: '/chat-vet',
                        params: {
                          prefill: encodeURIComponent(
                            `${petName}: ${item.label.toLowerCase()}. Cosa devo fare?`,
                          ),
                        },
                      } as never)
                    }
                  >
                    <Text style={styles.monitorBtnTxt}>Chiedi AI</Text>
                  </Pressable>
                  <Pressable hitSlop={8} onPress={() => handleRemoveMonitor(item.id)}>
                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </View>

        {/* ── Ultime valutazioni (dal chat vet interno) ── */}
        {lastConsultations.length > 0 && (
          <View style={{ marginTop: 22 }}>
            <Text style={styles.sectionTitle}>Ultime domande al Vet</Text>
            <View style={{ height: 10 }} />
            {lastConsultations.map((m) => (
              <Pressable
                key={m.id}
                style={styles.consultRow}
                onPress={() => router.push('/chat-vet' as never)}
              >
                <View style={styles.consultIcon}>
                  <Ionicons name="chatbubble-ellipses-outline" size={16} color={TEAL} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.consultTxt} numberOfLines={1}>
                    "{m.text}"
                  </Text>
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
            <Pressable
              style={styles.actionPill}
              onPress={() => router.push('/sintomo-vet' as never)}
            >
              <Text style={{ fontSize: 16 }}>🤒</Text>
              <Text style={styles.actionPillTxt}>Sintomo</Text>
            </Pressable>
            <Pressable
              style={styles.actionPill}
              onPress={() => router.push('/add-event' as never)}
            >
              <Text style={{ fontSize: 16 }}>📝</Text>
              <Text style={styles.actionPillTxt}>Nota</Text>
            </Pressable>
            <Pressable
              style={styles.actionPill}
              onPress={() => router.push('/reminders' as never)}
            >
              <Text style={{ fontSize: 16 }}>💉</Text>
              <Text style={styles.actionPillTxt}>Vaccini</Text>
            </Pressable>
            <Pressable
              style={[styles.actionPill, { backgroundColor: TEAL }]}
              onPress={() => router.push('/chat-vet' as never)}
            >
              <Ionicons name="chatbubble-ellipses" size={16} color="#fff" />
              <Text style={[styles.actionPillTxt, { color: '#fff' }]}>Chat Vet</Text>
            </Pressable>
          </View>
        </View>

        {/* Disclaimer */}
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
  headerSub: { fontSize: 11, color: MUTED, marginTop: 1 },

  hero: { borderRadius: 22, padding: 20 },
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

  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
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
  quickBtnIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickBtnTitle: { fontSize: 15, fontWeight: '700', color: INK },
  quickBtnDesc: { fontSize: 12, color: MUTED, marginTop: 2, lineHeight: 16 },

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

  addChipsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TEAL,
    borderRadius: 99,
    paddingVertical: 6,
    paddingHorizontal: 14,
    gap: 4,
  },
  addChipsBtnTxt: { fontSize: 14, fontWeight: '800', color: '#fff' },

  openSintomoBar: {
    marginTop: 10,
    backgroundColor: '#F0FDF4',
    borderRadius: radii.md,
    padding: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    alignItems: 'center',
  },
  openSintomoTxt: { fontSize: 13, fontWeight: '700', color: '#16A34A' },

  insightCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: radii.md,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  insightHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  insightTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: '#16A34A' },
  insightChatBtn: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 99,
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  insightChatBtnTxt: { fontSize: 11, fontWeight: '700', color: '#16A34A' },
  insightText: { fontSize: 13, color: INK, lineHeight: 19 },

  addMonitorRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  addMonitorInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: INK,
  },
  addMonitorSave: {
    backgroundColor: TEAL,
    borderRadius: radii.md,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  addMonitorSaveTxt: { fontSize: 13, fontWeight: '800', color: '#fff' },

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
  monitorActions: { flexDirection: 'row', gap: 6, alignItems: 'center' },
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
