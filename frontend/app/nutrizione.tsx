import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../src/context/AuthContext';
import { chat } from '../src/services/openrouter';
import { useProfileStore } from '../src/store/profile';
import {
  MEAL_EMOJI,
  MEAL_LABEL,
  type MealType,
  type WaterLevel,
  usePetNutritionStore,
} from '../src/store/petNutrition';
import { useMembersStore } from '../src/store/members';
import { MemberPickerModal } from '../src/components/MemberPickerModal';
import { MemberSwitcher } from '../src/components/MemberSwitcher';
import { SectionChatModal } from '../src/components/SectionChatModal';
import { TimeWheelModal } from '../src/components/TimeWheelModal';
import { useMemberPicker } from '../src/hooks/useMemberPicker';
import { radii } from '../src/theme';

// ─── Palette ──────────────────────────────────────────────────────────────────
const BG = '#FDFBF5';
const INK = '#1A1A2E';
const MUTED = '#6B7280';
const BORDER = '#E8EAF0';
const GREEN = '#16A34A';
const AMBER = '#F59E0B';
const TEAL = '#0DB09E';

const MEAL_TYPES: MealType[] = ['colazione', 'pranzo', 'cena', 'snack', 'integratore'];

const WATER_CONFIG: Record<WaterLevel, { label: string; emoji: string; color: string; bg: string }> = {
  low:  { label: 'Scarsa',   emoji: '💧',     color: '#EF4444', bg: '#FEE2E2' },
  ok:   { label: 'Normale',  emoji: '💧💧',   color: GREEN,     bg: '#DCFCE7' },
  high: { label: 'Abbondante', emoji: '💧💧💧', color: '#3B82F6', bg: '#DBEAFE' },
};

const today = () => new Date().toISOString().slice(0, 10);
const nowTime = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function relativeTime(time: string) {
  const [h, m] = time.split(':').map(Number);
  const now = new Date();
  const diff = now.getHours() * 60 + now.getMinutes() - (h * 60 + m);
  if (diff < 1) return 'adesso';
  if (diff < 60) return `${diff}min fa`;
  return `${Math.floor(diff / 60)}h fa`;
}

// ─── Controllo alimenti (AI) ────────────────────────────────────────────────
type ToxicLevel = 'danger' | 'warning' | 'ok';
type ToxicResult = { level: ToxicLevel; msg: string };

// ─── Member filtering ─────────────────────────────────────────────────────────

function belongsTo(
  entryMemberId: string | undefined,
  activeId: string | null,
  isDefaultFn: (id: string | null) => boolean,
): boolean {
  if (!activeId) return true;
  if (entryMemberId && entryMemberId === activeId) return true;
  if (!entryMemberId && isDefaultFn(activeId)) return true;
  return false;
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function NutrizioneScreen() {
  const profiles = useProfileStore((s) => s.profiles);
  const petProfile = profiles.find((p) => p.kind === 'pet');
  const petName = petProfile?.name ?? 'il tuo animale';
  const { getToken } = useAuth();

  const { meals: allMeals, weightLog: allWeightLog, waterLevel, addMeal, removeMeal, addWeight, setWater } =
    usePetNutritionStore();

  const activePetId = useMembersStore((s) => s.activePetId);
  const isDefaultPet = useMembersStore((s) => s.isDefault);

  const meals = allMeals.filter((m) => belongsTo(m.memberId, activePetId, (id) => isDefaultPet('pet', id)));
  const weightLog = allWeightLog.filter((w) => belongsTo(w.memberId, activePetId, (id) => isDefaultPet('pet', id)));

  const { pickMember, modalProps: memberPickerProps } = useMemberPicker('pet');

  // ── Modal state ──
  const [showAddMeal, setShowAddMeal] = useState(false);
  const [mealType, setMealType] = useState<MealType>('colazione');
  const [mealFood, setMealFood] = useState('');
  const [mealGrams, setMealGrams] = useState('');
  const [mealTime, setMealTime] = useState(nowTime());

  const [toxicInput, setToxicInput] = useState('');
  const [toxicResult, setToxicResult] = useState<ToxicResult | null>(null);
  const [toxicLoading, setToxicLoading] = useState(false);

  const [showWeightModal, setShowWeightModal] = useState(false);
  const [weightInput, setWeightInput] = useState('');

  const [showWaterModal, setShowWaterModal] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [chatOpen, setChatOpen] = useState(false);

  // ── Derived ──
  const todayMeals = meals
    .filter((m) => m.date === today())
    .sort((a, b) => a.time.localeCompare(b.time));

  const lastMeal = todayMeals[todayMeals.length - 1];
  const lastWeight = weightLog[0] ?? (petProfile?.weightKg ? { id: '0', date: today(), kg: petProfile.weightKg } : null);
  const prevWeight = weightLog[1] ?? null;
  const weightDelta = lastWeight && prevWeight ? (lastWeight.kg - prevWeight.kg) : null;

  // Hero status
  const heroOk = todayMeals.length > 0;
  const heroGrad: [string, string] = heroOk ? ['#10B981', '#F59E0B'] : ['#F59E0B', '#FB923C'];
  const heroTitle = heroOk ? 'Alimentazione regolare' : 'Nessun pasto registrato oggi';
  const heroSub = lastMeal ? `Ultimo pasto: ${relativeTime(lastMeal.time)}` : `Registra il primo pasto di ${petName}`;

  // ── Handlers ──
  const saveMeal = async () => {
    if (!mealFood.trim()) return;
    const picked = await pickMember();
    if (picked.prompted && picked.id === null) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addMeal({
      date: today(),
      time: mealTime,
      type: mealType,
      food: mealFood.trim(),
      grams: mealGrams ? parseInt(mealGrams, 10) : undefined,
      memberId: picked.id ?? undefined,
    });
    setMealFood(''); setMealGrams(''); setMealTime(nowTime()); setMealType('colazione');
    setShowAddMeal(false);
  };

  const saveWeight = async () => {
    const kg = parseFloat(weightInput.replace(',', '.'));
    if (isNaN(kg) || kg <= 0) return;
    const picked = await pickMember();
    if (picked.prompted && picked.id === null) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addWeight({ date: today(), kg, memberId: picked.id ?? undefined });
    setWeightInput('');
    setShowWeightModal(false);
  };

  // Verifica alimento direttamente con l'AI (specie-specifica)
  const runToxicCheck = async (foodArg?: string) => {
    const food = (foodArg ?? toxicInput).trim();
    if (!food || toxicLoading) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setToxicResult(null);
    setToxicLoading(true);
    try {
      const species = petProfile?.species ?? 'cane o gatto';
      const prompt =
        `Sei un veterinario esperto. L'alimento "${food}" è sicuro da far mangiare a un ${species}? ` +
        `Rispondi OBBLIGATORIAMENTE iniziando con UNA sola parola in maiuscolo tra PERICOLOSO, ATTENZIONE o SICURO, ` +
        `seguita da due punti e una spiegazione breve (max 2 frasi).`;
      const reply = await chat({
        history: [{ id: 'tox', role: 'user', text: prompt, createdAt: new Date().toISOString() }],
        token: await getToken(),
      });
      const upper = reply.trim().toUpperCase();
      let level: ToxicLevel = 'warning';
      if (upper.startsWith('PERICOLOSO')) level = 'danger';
      else if (upper.startsWith('SICURO')) level = 'ok';
      const msg = reply.replace(/^\s*(PERICOLOSO|ATTENZIONE|SICURO)\s*:?\s*/i, '').trim() || reply.trim();
      setToxicResult({ level, msg });
    } catch {
      setToxicResult({ level: 'warning', msg: "Impossibile contattare l'AI. Riprova o consulta il veterinario." });
    } finally {
      setToxicLoading(false);
    }
  };

  // Apre la chat interna alla sezione Nutrizione (pop-up dal basso, vuota)
  const goToChat = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setChatOpen(true);
  };

  // Contesto inviato all'AI: riassume i dati della sezione nutrizione
  const buildNutriContext = () => {
    const parts: string[] = [`Animale: ${petName}.`];
    if (petProfile?.species) parts.push(`Specie: ${petProfile.species}.`);
    if (lastWeight) parts.push(`Peso attuale: ${lastWeight.kg} kg.`);
    if (todayMeals.length > 0) {
      parts.push(
        `Pasti di oggi: ${todayMeals.map((m) => `${m.time} ${MEAL_LABEL[m.type]} ${m.food}${m.grams ? ` (${m.grams}g)` : ''}`).join('; ')}.`,
      );
    } else {
      parts.push('Nessun pasto registrato oggi.');
    }
    parts.push(`Idratazione: ${WATER_CONFIG[waterLevel].label}.`);
    if (toxicResult && toxicInput) {
      parts.push(`Ultimo controllo alimento: "${toxicInput}" → ${toxicResult.level}.`);
    }
    return parts.join(' ');
  };

  const deleteMeal = (id: string) => {
    Alert.alert('Elimina pasto', 'Rimuovere questo pasto?', [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Elimina',
        style: 'destructive',
        onPress: () => { removeMeal(id); void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); },
      },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={INK} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>🍖 Nutrizione</Text>
          <Text style={styles.headerSub}>Alimentazione e benessere quotidiano{petProfile ? ` di ${petName}` : ''}</Text>
        </View>
        <View style={{ marginRight: 8 }}>
          <MemberSwitcher kind="pet" accent={TEAL} variant="compact" />
        </View>
        <Pressable onPress={() => goToChat()} hitSlop={8}>
          <Ionicons name="chatbubble-ellipses-outline" size={22} color={TEAL} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {/* ── Hero ── */}
        <LinearGradient colors={heroGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <View style={styles.heroLabel}>
            <Text style={{ fontSize: 14 }}>🥣</Text>
            <Text style={styles.heroLabelTxt}>Stato alimentazione</Text>
          </View>
          <Text style={styles.heroTitle}>{heroTitle}</Text>
          <Text style={styles.heroSub}>{heroSub}</Text>
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatVal}>{todayMeals.length}</Text>
              <Text style={styles.heroStatLbl}>pasti oggi</Text>
            </View>
            <View style={styles.heroStatDiv} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatVal}>{WATER_CONFIG[waterLevel].emoji}</Text>
              <Text style={styles.heroStatLbl}>acqua</Text>
            </View>
            {lastWeight && (
              <>
                <View style={styles.heroStatDiv} />
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatVal}>{lastWeight.kg} kg</Text>
                  <Text style={styles.heroStatLbl}>peso</Text>
                </View>
              </>
            )}
          </View>
          <Pressable style={styles.heroCta} onPress={() => setShowAddMeal(true)}>
            <Text style={styles.heroCtaTxt}>➕ Registra pasto</Text>
          </Pressable>
        </LinearGradient>

        {/* ── Quick actions ── */}
        <View style={{ marginTop: 22 }}>
          <Text style={styles.sectionTitle}>Azioni rapide</Text>
          <View style={[styles.quickGrid, { marginTop: 10 }]}>
            <Pressable style={styles.quickCard} onPress={() => setShowAddMeal(true)}>
              <Text style={styles.quickEmoji}>🍖</Text>
              <Text style={styles.quickCardTitle}>Pasto</Text>
              <Text style={styles.quickCardSub}>Registra</Text>
            </Pressable>
            <Pressable style={styles.quickCard} onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowWaterModal(true);
            }}>
              <Text style={styles.quickEmoji}>💧</Text>
              <Text style={styles.quickCardTitle}>Acqua</Text>
              <Text style={styles.quickCardSub}>{WATER_CONFIG[waterLevel].label}</Text>
            </Pressable>
            <Pressable style={styles.quickCard} onPress={() => setShowWeightModal(true)}>
              <Text style={styles.quickEmoji}>⚖️</Text>
              <Text style={styles.quickCardTitle}>Peso</Text>
              <Text style={styles.quickCardSub}>{lastWeight ? `${lastWeight.kg} kg` : 'Aggiungi'}</Text>
            </Pressable>
            <Pressable style={styles.quickCard} onPress={() => goToChat()}>
              <Text style={styles.quickEmoji}>🧠</Text>
              <Text style={styles.quickCardTitle}>Insight AI</Text>
              <Text style={styles.quickCardSub}>Consigli</Text>
            </Pressable>
          </View>
        </View>

        {/* ── Pasti di oggi ── */}
        <View style={{ marginTop: 22 }}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Pasti di oggi</Text>
            <Pressable onPress={() => setShowAddMeal(true)}>
              <Text style={styles.sectionAction}>+ Aggiungi</Text>
            </Pressable>
          </View>
          <View style={{ height: 10 }} />
          {todayMeals.length === 0 ? (
            <View style={styles.emptyMeals}>
              <Text style={{ fontSize: 28 }}>🥣</Text>
              <Text style={styles.emptyMealsText}>Nessun pasto registrato oggi</Text>
            </View>
          ) : (
            todayMeals.map((m) => (
              <Pressable
                key={m.id}
                style={styles.mealRow}
                onLongPress={() => deleteMeal(m.id)}
              >
                <View style={styles.mealTimeCol}>
                  <Text style={styles.mealTime}>{m.time}</Text>
                  <Text style={styles.mealAgo}>{relativeTime(m.time)}</Text>
                </View>
                <View style={styles.mealDot} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 16 }}>{MEAL_EMOJI[m.type]}</Text>
                    <Text style={styles.mealType}>{MEAL_LABEL[m.type]}</Text>
                  </View>
                  <Text style={styles.mealFood}>{m.food}{m.grams ? ` · ${m.grams}g` : ''}</Text>
                </View>
                <Pressable hitSlop={8} onPress={() => deleteMeal(m.id)}>
                  <Ionicons name="trash-outline" size={14} color="#D1D5DB" />
                </Pressable>
              </Pressable>
            ))
          )}
          {todayMeals.length > 0 && (
            <Text style={{ fontSize: 10, color: MUTED, textAlign: 'center', marginTop: 4 }}>
              Tieni premuto a lungo per eliminare
            </Text>
          )}
        </View>

        {/* ── Idratazione ── */}
        <View style={{ marginTop: 22 }}>
          <Text style={styles.sectionTitle}>Acqua & Idratazione</Text>
          <View style={[styles.waterCard, { borderColor: WATER_CONFIG[waterLevel].color + '55' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ fontSize: 28 }}>{WATER_CONFIG[waterLevel].emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.waterLevel, { color: WATER_CONFIG[waterLevel].color }]}>
                  {WATER_CONFIG[waterLevel].label}
                </Text>
                <Text style={styles.waterSub}>
                  {waterLevel === 'high' ? `${petName} beve più del solito. Potrebbe essere utile monitorare.` :
                   waterLevel === 'low'  ? `${petName} ha bevuto poco. Assicurati che abbia acqua fresca disponibile.` :
                   `Idratazione nella norma. Ottimo!`}
                </Text>
              </View>
            </View>
            <View style={styles.waterBtns}>
              {(['low', 'ok', 'high'] as WaterLevel[]).map((lvl) => {
                const active = waterLevel === lvl;
                return (
                  <Pressable
                    key={lvl}
                    style={[styles.waterBtn, active && { backgroundColor: WATER_CONFIG[lvl].color, borderColor: WATER_CONFIG[lvl].color }]}
                    onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setWater(lvl); }}
                  >
                    <Text style={styles.waterBtnEmoji}>{WATER_CONFIG[lvl].emoji}</Text>
                    <Text style={[styles.waterBtnTxt, active && { color: '#fff' }]} numberOfLines={1}>
                      {WATER_CONFIG[lvl].label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        {/* ── Peso ── */}
        {lastWeight && (
          <View style={{ marginTop: 22 }}>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Peso</Text>
              <Pressable onPress={() => setShowWeightModal(true)}>
                <Text style={styles.sectionAction}>Aggiorna</Text>
              </Pressable>
            </View>
            <View style={[styles.weightCard, { marginTop: 10 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <View style={styles.weightIconBox}>
                  <Text style={{ fontSize: 24 }}>⚖️</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.weightVal}>{lastWeight.kg} <Text style={styles.weightUnit}>kg</Text></Text>
                  {weightDelta !== null && (
                    <Text style={[styles.weightDelta, { color: weightDelta === 0 ? GREEN : Math.abs(weightDelta) < 0.5 ? GREEN : AMBER }]}>
                      {weightDelta > 0 ? '↑' : weightDelta < 0 ? '↓' : '→'} {Math.abs(weightDelta).toFixed(1)} kg rispetto al precedente
                    </Text>
                  )}
                  {weightDelta === null && <Text style={styles.weightDelta}>Primo rilevamento registrato</Text>}
                </View>
              </View>
              {weightLog.length > 1 && (
                <View style={styles.weightHistory}>
                  {weightLog.slice(0, 5).reverse().map((w, i) => (
                    <View key={w.id} style={styles.weightHistRow}>
                      <Text style={styles.weightHistDate}>{w.date.slice(5).replace('-', '/')}</Text>
                      <Text style={styles.weightHistVal}>{w.kg} kg</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}

        {/* ── Cibo tossico ── */}
        <View style={{ marginTop: 22 }}>
          <Text style={styles.sectionTitle}>⚠️ Controllo alimenti</Text>
          <Text style={styles.sectionSubtitle}>Chiedi all'AI se un alimento è sicuro per {petName}</Text>
          <View style={styles.toxicBox}>
            <View style={styles.toxicInputRow}>
              <TextInput
                style={styles.toxicInput}
                value={toxicInput}
                onChangeText={setToxicInput}
                placeholder="Es. salame, cioccolato, uva…"
                placeholderTextColor={MUTED}
                returnKeyType="search"
                onSubmitEditing={() => void runToxicCheck()}
                editable={!toxicLoading}
              />
              <Pressable style={[styles.toxicBtn, toxicLoading && { opacity: 0.7 }]} onPress={() => void runToxicCheck()} disabled={toxicLoading}>
                {toxicLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.toxicBtnTxt}>Verifica</Text>}
              </Pressable>
            </View>
            {toxicResult && (
              <View style={[styles.toxicResult, {
                backgroundColor: toxicResult.level === 'danger' ? '#FEE2E2' : toxicResult.level === 'warning' ? '#FEF9C3' : '#DCFCE7',
                borderColor: toxicResult.level === 'danger' ? '#FECACA' : toxicResult.level === 'warning' ? '#FDE68A' : '#BBF7D0',
              }]}>
                <Text style={styles.toxicResultIcon}>
                  {toxicResult.level === 'danger' ? '🔴' : toxicResult.level === 'warning' ? '🟡' : '🟢'}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.toxicResultTitle, {
                    color: toxicResult.level === 'danger' ? '#DC2626' : toxicResult.level === 'warning' ? '#B45309' : GREEN,
                  }]}>
                    {toxicResult.level === 'danger' ? 'Attenzione: potenzialmente pericoloso' : toxicResult.level === 'warning' ? 'Da monitorare' : 'Sembra sicuro'}
                  </Text>
                  <Text style={styles.toxicResultMsg}>{toxicResult.msg}</Text>
                  {toxicResult.level !== 'ok' && (
                    <Pressable style={styles.toxicAiBtn} onPress={() => goToChat()}>
                      <Text style={styles.toxicAiBtnTxt}>Apri la chat per maggiori dettagli →</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            )}
            <View style={styles.toxicExamples}>
              {['cioccolato', 'uva', 'cipolla', 'avocado'].map((ex) => (
                <Pressable key={ex} style={styles.toxicChip} onPress={() => { setToxicInput(ex); void runToxicCheck(ex); }}>
                  <Text style={styles.toxicChipTxt}>{ex}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {/* ── Insight AI ── */}
        <View style={[styles.insightCard, { marginTop: 22 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Text style={{ fontSize: 16 }}>🧠</Text>
            <Text style={styles.insightTitle}>Insight Nutrizione AI</Text>
          </View>
          <Text style={styles.insightText}>
            {meals.length === 0
              ? `Inizia a registrare i pasti di ${petName} per ricevere insight personalizzati sulla sua alimentazione.`
              : todayMeals.length >= 2
              ? `${petName} ha già mangiato ${todayMeals.length} volte oggi. Buona abitudine di alimentazione regolare!`
              : `Hai registrato ${meals.length} pasto${meals.length === 1 ? '' : 'i'} in totale. Continua a registrare per ottenere insight sull'andamento.`}
          </Text>
          <Pressable style={styles.insightCta} onPress={() => goToChat()}>
            <Text style={styles.insightCtaTxt}>Chiedi un'analisi all'AI →</Text>
          </Pressable>
        </View>

        {/* ── Bottom actions ── */}
        <View style={{ marginTop: 22 }}>
          <Text style={styles.sectionTitle}>Azioni rapide</Text>
          <View style={[styles.actionsRow, { marginTop: 10 }]}>
            <Pressable style={styles.actionPill} onPress={() => setShowAddMeal(true)}>
              <Text style={{ fontSize: 15 }}>➕</Text>
              <Text style={styles.actionPillTxt}>Nuovo pasto</Text>
            </Pressable>
            <Pressable style={styles.actionPill} onPress={() => goToChat()}>
              <Text style={{ fontSize: 15 }}>📷</Text>
              <Text style={styles.actionPillTxt}>Foto</Text>
            </Pressable>
            <Pressable style={styles.actionPill} onPress={() => setShowWeightModal(true)}>
              <Text style={{ fontSize: 15 }}>⚖️</Text>
              <Text style={styles.actionPillTxt}>Peso</Text>
            </Pressable>
            <Pressable style={[styles.actionPill, { backgroundColor: TEAL }]} onPress={() => goToChat()}>
              <Ionicons name="chatbubble-ellipses" size={15} color="#fff" />
              <Text style={[styles.actionPillTxt, { color: '#fff' }]}>AI Chat</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* ── Aggiungi pasto modal ── */}
      <Modal visible={showAddMeal} transparent animationType="slide" onRequestClose={() => setShowAddMeal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <Pressable style={styles.modalOverlay} onPress={() => setShowAddMeal(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.modalTitle}>🍖 Registra pasto</Text>

            {/* Tipo pasto */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 12 }} contentContainerStyle={{ gap: 8 }}>
              {MEAL_TYPES.map((t) => (
                <Pressable
                  key={t}
                  style={[styles.typeChip, mealType === t && styles.typeChipActive]}
                  onPress={() => setMealType(t)}
                >
                  <Text style={{ fontSize: 14 }}>{MEAL_EMOJI[t]}</Text>
                  <Text style={[styles.typeChipTxt, mealType === t && { color: '#fff' }]}>{MEAL_LABEL[t]}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <TextInput
              style={styles.modalInput}
              value={mealFood}
              onChangeText={setMealFood}
              placeholder="Cosa ha mangiato? (es. Crocchette Royal Canin)"
              placeholderTextColor={MUTED}
              autoFocus
            />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
              <TextInput
                style={[styles.modalInput, { flex: 1 }]}
                value={mealGrams}
                onChangeText={setMealGrams}
                placeholder="Grammi (opz.)"
                placeholderTextColor={MUTED}
                keyboardType="numeric"
              />
              <Pressable style={[styles.modalInput, styles.timeBtn, { flex: 1 }]} onPress={() => setShowTimePicker(true)}>
                <Ionicons name="time-outline" size={18} color={TEAL} />
                <Text style={styles.timeBtnTxt}>{mealTime}</Text>
                <Ionicons name="chevron-down" size={16} color={MUTED} style={{ marginLeft: 'auto' }} />
              </Pressable>
            </View>
            <View style={{ height: 14 }} />
            <Pressable style={styles.saveBtn} onPress={saveMeal}>
              <Text style={styles.saveBtnTxt}>Salva pasto</Text>
            </Pressable>
            <Pressable style={styles.cancelBtn} onPress={() => setShowAddMeal(false)}>
              <Text style={styles.cancelBtnTxt}>Annulla</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Peso modal ── */}
      <Modal visible={showWeightModal} transparent animationType="fade" onRequestClose={() => setShowWeightModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <Pressable style={styles.modalOverlay} onPress={() => setShowWeightModal(false)} />
          <View style={[styles.modalSheet, { paddingBottom: 40 }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.modalTitle}>⚖️ Aggiorna peso</Text>
            <Text style={{ fontSize: 13, color: MUTED, marginBottom: 14 }}>Inserisci il peso attuale di {petName} in kg</Text>
            <TextInput
              style={styles.modalInput}
              value={weightInput}
              onChangeText={setWeightInput}
              placeholder="Es. 24.6"
              placeholderTextColor={MUTED}
              keyboardType="decimal-pad"
              autoFocus
            />
            <View style={{ height: 14 }} />
            <Pressable style={styles.saveBtn} onPress={saveWeight}>
              <Text style={styles.saveBtnTxt}>Salva peso</Text>
            </Pressable>
            <Pressable style={styles.cancelBtn} onPress={() => setShowWeightModal(false)}>
              <Text style={styles.cancelBtnTxt}>Annulla</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Acqua modal (bottom sheet) ── */}
      <Modal visible={showWaterModal} transparent animationType="slide" onRequestClose={() => setShowWaterModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowWaterModal(false)} />
        <View style={[styles.modalSheet, { paddingBottom: 36 }]}>
          <View style={styles.sheetHandle} />
          <Text style={styles.modalTitle}>💧 Acqua & Idratazione</Text>
          <Text style={{ fontSize: 13, color: MUTED, marginBottom: 14 }}>
            Com'è l'idratazione di {petName} oggi?
          </Text>
          {(['high', 'ok', 'low'] as WaterLevel[]).map((lvl) => {
            const active = waterLevel === lvl;
            return (
              <Pressable
                key={lvl}
                style={[styles.waterOption, active && { borderColor: WATER_CONFIG[lvl].color, backgroundColor: WATER_CONFIG[lvl].bg }]}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setWater(lvl);
                  setShowWaterModal(false);
                }}
              >
                <Text style={{ fontSize: 22 }}>{WATER_CONFIG[lvl].emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.waterOptionTitle, active && { color: WATER_CONFIG[lvl].color }]}>
                    {WATER_CONFIG[lvl].label}
                  </Text>
                  <Text style={styles.waterOptionSub}>
                    {lvl === 'high' ? 'Beve più del solito' : lvl === 'ok' ? 'Nella norma' : 'Ha bevuto poco'}
                  </Text>
                </View>
                {active && <Ionicons name="checkmark-circle" size={20} color={WATER_CONFIG[lvl].color} />}
              </Pressable>
            );
          })}
          <Pressable style={styles.cancelBtn} onPress={() => setShowWaterModal(false)}>
            <Text style={styles.cancelBtnTxt}>Annulla</Text>
          </Pressable>
        </View>
      </Modal>

      {/* ── Time picker (ruota) ── */}
      <TimeWheelModal
        visible={showTimePicker}
        value={mealTime}
        accent={TEAL}
        onConfirm={(t) => { setMealTime(t); setShowTimePicker(false); }}
        onClose={() => setShowTimePicker(false)}
      />

      {/* ── Chat interna Nutrizione ── */}
      <SectionChatModal
        visible={chatOpen}
        onClose={() => setChatOpen(false)}
        title="Nutrizione AI"
        accent={TEAL}
        welcome={`Ciao! Sono l'assistente nutrizione di ${petName} 🍖\nPosso aiutarti su pasti, dieta, peso, idratazione e alimenti sicuri.`}
        buildContext={buildNutriContext}
      />

      <MemberPickerModal {...memberPickerProps} accent={TEAL} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10, gap: 12,
    borderBottomWidth: 1, borderBottomColor: BORDER, backgroundColor: BG,
  },
  backBtn: { padding: 2 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: INK },
  headerSub: { fontSize: 11, color: MUTED, marginTop: 1 },

  hero: { borderRadius: 22, padding: 20 },
  heroLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroLabelTxt: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },
  heroTitle: { fontSize: 22, fontWeight: '900', color: '#fff', marginTop: 8 },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 4 },
  heroStats: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 14 },
  heroStat: { alignItems: 'center' },
  heroStatVal: { fontSize: 18, fontWeight: '800', color: '#fff' },
  heroStatLbl: { fontSize: 10, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  heroStatDiv: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.3)' },
  heroCta: {
    marginTop: 16, backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 99, paddingVertical: 10, paddingHorizontal: 20, alignSelf: 'flex-start',
  },
  heroCtaTxt: { fontWeight: '700', color: '#fff', fontSize: 14 },

  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: INK },
  sectionSubtitle: { fontSize: 11, color: MUTED, marginTop: 2, marginBottom: 10 },
  sectionAction: { fontSize: 13, fontWeight: '600', color: TEAL },

  quickGrid: { flexDirection: 'row', gap: 10 },
  quickCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 16, paddingVertical: 14,
    alignItems: 'center', gap: 4, borderWidth: 1, borderColor: BORDER,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  quickEmoji: { fontSize: 22 },
  quickCardTitle: { fontSize: 12, fontWeight: '700', color: INK },
  quickCardSub: { fontSize: 10, color: MUTED },

  emptyMeals: {
    backgroundColor: '#fff', borderRadius: 16, padding: 24,
    alignItems: 'center', gap: 6, borderWidth: 1, borderColor: BORDER,
  },
  emptyMealsText: { fontSize: 13, color: MUTED },

  mealRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 14, padding: 12,
    marginBottom: 8, borderWidth: 1, borderColor: BORDER,
  },
  mealTimeCol: { width: 44, alignItems: 'center' },
  mealTime: { fontSize: 13, fontWeight: '700', color: INK },
  mealAgo: { fontSize: 9, color: MUTED, marginTop: 1 },
  mealDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: TEAL },
  mealType: { fontSize: 11, fontWeight: '600', color: MUTED },
  mealFood: { fontSize: 13, fontWeight: '600', color: INK, marginTop: 2 },

  waterCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    borderWidth: 1.5, marginTop: 10,
  },
  waterLevel: { fontSize: 16, fontWeight: '800' },
  waterSub: { fontSize: 12, color: MUTED, marginTop: 3, lineHeight: 17 },
  waterBtns: { flexDirection: 'row', gap: 8, marginTop: 12 },
  waterBtn: {
    flex: 1, paddingVertical: 9, paddingHorizontal: 6, borderRadius: 14,
    backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center',
    gap: 3, borderWidth: 1, borderColor: BORDER, minHeight: 56,
  },
  waterBtnEmoji: { fontSize: 14, lineHeight: 18 },
  waterBtnTxt: { fontSize: 11, fontWeight: '700', color: INK, textAlign: 'center' },

  weightCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: BORDER,
  },
  weightIconBox: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: '#F0FDF4', alignItems: 'center', justifyContent: 'center',
  },
  weightVal: { fontSize: 28, fontWeight: '900', color: INK },
  weightUnit: { fontSize: 16, fontWeight: '500', color: MUTED },
  weightDelta: { fontSize: 12, marginTop: 3 },
  weightHistory: { marginTop: 12, gap: 4 },
  weightHistRow: { flexDirection: 'row', justifyContent: 'space-between' },
  weightHistDate: { fontSize: 11, color: MUTED },
  weightHistVal: { fontSize: 11, fontWeight: '600', color: INK },

  toxicBox: {
    backgroundColor: '#fff', borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: BORDER,
  },
  toxicInputRow: { flexDirection: 'row', gap: 8 },
  toxicInput: {
    flex: 1, backgroundColor: '#F5F7FA', borderRadius: 12, padding: 12,
    fontSize: 14, color: INK, borderWidth: 1, borderColor: BORDER,
  },
  toxicBtn: {
    backgroundColor: TEAL, borderRadius: 12, paddingHorizontal: 16,
    justifyContent: 'center',
  },
  toxicBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },
  toxicResult: {
    flexDirection: 'row', gap: 10, borderRadius: 12, padding: 12,
    borderWidth: 1, marginTop: 10,
  },
  toxicResultIcon: { fontSize: 18 },
  toxicResultTitle: { fontSize: 13, fontWeight: '700' },
  toxicResultMsg: { fontSize: 12, color: INK, marginTop: 4, lineHeight: 17 },
  toxicAiBtn: { marginTop: 8 },
  toxicAiBtnTxt: { fontSize: 12, fontWeight: '600', color: TEAL },
  toxicExamples: { flexDirection: 'row', gap: 6, marginTop: 10, flexWrap: 'wrap' },
  toxicChip: {
    backgroundColor: '#F5F7FA', borderRadius: 99, paddingVertical: 5,
    paddingHorizontal: 12, borderWidth: 1, borderColor: BORDER,
  },
  toxicChipTxt: { fontSize: 12, fontWeight: '600', color: MUTED },

  insightCard: {
    backgroundColor: '#F0FDF4', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#BBF7D0',
  },
  insightTitle: { fontSize: 14, fontWeight: '700', color: GREEN },
  insightText: { fontSize: 13, color: INK, lineHeight: 19 },
  insightCta: { marginTop: 10 },
  insightCtaTxt: { fontSize: 12, fontWeight: '600', color: GREEN },

  actionsRow: { flexDirection: 'row', gap: 8 },
  actionPill: {
    flex: 1, backgroundColor: '#fff', borderRadius: 14,
    paddingVertical: 12, alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: BORDER,
  },
  actionPillTxt: { fontSize: 10, fontWeight: '700', color: INK },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    backgroundColor: '#fff', padding: 22, paddingBottom: 36,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
  },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: INK, marginBottom: 4 },
  typeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F3F4F6', borderRadius: 99,
    paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1, borderColor: BORDER,
  },
  typeChipActive: { backgroundColor: TEAL, borderColor: TEAL },
  typeChipTxt: { fontSize: 12, fontWeight: '600', color: INK },
  modalInput: {
    backgroundColor: '#F5F7FA', borderWidth: 1, borderColor: BORDER,
    borderRadius: 12, padding: 14, fontSize: 15, color: INK,
  },
  timeBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 13 },
  timeBtnTxt: { fontSize: 15, fontWeight: '700', color: INK },
  waterOption: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#F5F7FA', borderRadius: 14, padding: 14,
    marginBottom: 10, borderWidth: 1.5, borderColor: BORDER,
  },
  waterOptionTitle: { fontSize: 15, fontWeight: '700', color: INK },
  waterOptionSub: { fontSize: 11, color: MUTED, marginTop: 1 },
  saveBtn: {
    backgroundColor: TEAL, borderRadius: 99, paddingVertical: 14, alignItems: 'center',
  },
  saveBtnTxt: { fontWeight: '700', fontSize: 15, color: '#fff' },
  cancelBtn: {
    marginTop: 8, borderRadius: 99, paddingVertical: 12, alignItems: 'center',
    borderWidth: 1, borderColor: BORDER,
  },
  cancelBtnTxt: { fontWeight: '600', fontSize: 14, color: INK },
});
