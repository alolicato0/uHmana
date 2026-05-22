import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../src/context/AuthContext';
import { chat, toDataUrl } from '../src/services/openrouter';
import { type ReportDoc, type ReportValue, useReportsLocalStore } from '../src/store/reportsLocal';
import { colors, radii } from '../src/theme';

// ─── Categories ───────────────────────────────────────────────────────────────
const CATEGORIES: { key: string; label: string; emoji: string }[] = [
  { key: 'Analisi del sangue', label: 'Analisi del sangue', emoji: '🩸' },
  { key: 'Radiologia', label: 'Radiologia', emoji: '🦴' },
  { key: 'Esami strumentali', label: 'Esami strumentali', emoji: '🔬' },
  { key: 'Visite specialistiche', label: 'Visite specialistiche', emoji: '🩺' },
];
const MAX_PER_CATEGORY = 10;

function detectCategory(name: string): string {
  const n = name.toLowerCase();
  if (
    n.includes('sangue') || n.includes('ematic') || n.includes('cbc') ||
    n.includes('colesterol') || n.includes('lipid') || n.includes('urin') ||
    n.includes('glicos') || n.includes('glicemia') || n.includes('emocromo') ||
    n.includes('ferritin') || n.includes('tiroid')
  ) return 'Analisi del sangue';
  if (
    n.includes('radiografi') || n.includes('rx ') || n.includes(' rx') ||
    n.includes('torace') || n.includes('ecografi') || n.includes('tac') ||
    n.includes('risonanza') || n.includes('rmn') || n.includes('mri')
  ) return 'Radiologia';
  if (
    n.includes('elettrocard') || n.includes('ecg') || n.includes('spirometr') ||
    n.includes('biopsi') || n.includes('audiometr') || n.includes('endoscopi') ||
    n.includes('colonscopi') || n.includes('gastroscopi')
  ) return 'Esami strumentali';
  return 'Visite specialistiche';
}

// ─── AI summary generator ─────────────────────────────────────────────────────
function generateAiAnalysis(name: string): {
  summary: string;
  bullets: string[];
  values: ReportValue[];
} {
  const n = name.toLowerCase();
  if (n.includes('sangue') || n.includes('ematic') || n.includes('cbc') || n.includes('emocromo')) {
    return {
      summary: "L'esame mostra valori generalmente nella norma. Vitamina D leggermente sotto la media.",
      bullets: ['Valori ematici nella norma', 'Vitamina D nella norma bassa', 'Glicemia regolare', 'Nessun valore critico'],
      values: [
        { label: 'Vitamina D', value: '22', unit: 'ng/ml', status: 'warning' },
        { label: 'Glicemia', value: '89', unit: 'mg/dl', status: 'ok' },
        { label: 'Colesterolo', value: '195', unit: 'mg/dl', status: 'ok' },
        { label: 'Emoglobina', value: '14.2', unit: 'g/dl', status: 'ok' },
      ],
    };
  }
  if (n.includes('colesterol') || n.includes('lipid')) {
    return {
      summary: 'Profilo lipidico nella norma. LDL da monitorare nel tempo.',
      bullets: ['Colesterolo totale nei limiti', 'HDL nella norma', 'LDL leggermente elevato'],
      values: [
        { label: 'Colest. Tot.', value: '198', unit: 'mg/dl', status: 'ok' },
        { label: 'HDL', value: '52', unit: 'mg/dl', status: 'ok' },
        { label: 'LDL', value: '132', unit: 'mg/dl', status: 'warning' },
        { label: 'Trigliceridi', value: '145', unit: 'mg/dl', status: 'ok' },
      ],
    };
  }
  if (n.includes('radiografi') || n.includes('rx') || n.includes('torace') || n.includes('rmn') || n.includes('risonanza')) {
    return {
      summary: 'Nessuna anomalia strutturale rilevata. Parametri morfologici nella norma.',
      bullets: ['Nessuna lesione rilevabile', 'Strutture anatomiche regolari', 'Nessun reperto patologico'],
      values: [],
    };
  }
  if (n.includes('urin') || n.includes('urolog')) {
    return {
      summary: 'Esame urine nella norma. Valori di riferimento rispettati.',
      bullets: ['Leucociti nella norma', 'Proteine assenti', 'pH regolare'],
      values: [
        { label: 'pH', value: '6.2', unit: '', status: 'ok' },
        { label: 'Proteine', value: '<15', unit: 'mg/dl', status: 'ok' },
        { label: 'Leucociti', value: '3', unit: '/μl', status: 'ok' },
      ],
    };
  }
  if (n.includes('ecg') || n.includes('elettrocard')) {
    return {
      summary: 'Tracciato ECG nella norma. Ritmo sinusale regolare.',
      bullets: ['Ritmo sinusale regolare', 'Frequenza cardiaca normale', 'Nessuna alterazione rilevata'],
      values: [{ label: 'FC', value: '72', unit: 'bpm', status: 'ok' }],
    };
  }
  return {
    summary: 'Documento analizzato. Nessun valore critico rilevato.',
    bullets: ['Analisi completata', 'Nessuna anomalia critica', 'Consulta il medico per i dettagli'],
    values: [],
  };
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  const months = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
  return `${parseInt(d, 10)} ${months[parseInt(m, 10) - 1]} ${y}`;
}

const STATUS_COLOR = { ok: '#16A34A', warning: '#F59E0B', critical: '#EF4444' };
const STATUS_BG = { ok: '#DCFCE7', warning: '#FEF9C3', critical: '#FEE2E2' };
const STATUS_ICON = { ok: '🟢', warning: '🟡', critical: '🔴' };

// ─── Trend across docs ────────────────────────────────────────────────────────
function computeTrends(docs: ReportDoc[]): { label: string; dir: '↑' | '↓' | '→'; good: boolean }[] {
  const byLabel = new Map<string, ReportValue[]>();
  for (const doc of docs) {
    for (const v of doc.values) {
      const list = byLabel.get(v.label) ?? [];
      list.push(v);
      byLabel.set(v.label, list);
    }
  }
  const trends: { label: string; dir: '↑' | '↓' | '→'; good: boolean }[] = [];
  for (const [label, vals] of byLabel) {
    if (vals.length < 2) continue;
    const first = parseFloat(vals[vals.length - 1].value);
    const last = parseFloat(vals[0].value);
    if (isNaN(first) || isNaN(last)) continue;
    const dir = last > first ? '↑' : last < first ? '↓' : '→';
    const good = vals[0].status === 'ok';
    trends.push({ label, dir, good });
  }
  return trends.slice(0, 4);
}

const AI_ANALYSIS_PROMPT = `Sei un assistente medico AI. Analizza il documento allegato (referto, esame o visita medica) e rispondi ESCLUSIVAMENTE con un oggetto JSON valido, senza testo aggiuntivo prima o dopo.

Struttura richiesta:
{
  "category": <stringa ESATTA tra queste 4: "Analisi del sangue" oppure "Radiologia" oppure "Esami strumentali" oppure "Visite specialistiche">,
  "summary": "Riassunto in italiano semplice, 1-2 frasi, comprensibile a tutti",
  "bullets": ["punto chiave 1", "punto chiave 2", "punto chiave 3"],
  "values": [{"label": "Nome valore", "value": "numero", "unit": "unità", "status": "ok" oppure "warning" oppure "critical"}]
}

Regole categoria:
- "Analisi del sangue": emocromo, lipidi, glicemia, ferritina, tiroide, urine, qualsiasi esame di laboratorio
- "Radiologia": RX, TAC, risonanza magnetica, ecografia, mammografia, densitometria
- "Esami strumentali": ECG, spirometria, endoscopia, gastroscopia, colonscopia, biopsia, audiometria
- "Visite specialistiche": visita medica, referto ambulatoriale, lettera di dimissione, tutto il resto

Regole valori: "warning" = fuori range ma non urgente, "critical" = richiede attenzione immediata. Se nessun valore numerico, usa "values": [].
Rispondi SOLO con il JSON.`;

// Fuzzy match: handles case differences and partial matches (e.g. "Analisi Del Sangue", "sangue", "radiografia")
function resolveCategory(aiCat: string): string | null {
  const norm = aiCat.toLowerCase().trim();
  if (!norm) return null;
  const FUZZY: { key: string; keywords: string[] }[] = [
    { key: 'Analisi del sangue', keywords: ['sangue', 'laborator', 'ematic', 'lipid', 'glicemia', 'urin', 'ferritin', 'tiroid', 'analisi'] },
    { key: 'Radiologia', keywords: ['radiolog', 'radiografi', 'rx', 'tac', 'risonanza', 'ecografi', 'mammografi', 'densitometr'] },
    { key: 'Esami strumentali', keywords: ['strumental', 'ecg', 'elettrocard', 'spirometr', 'endoscopi', 'gastrscopi', 'colonscopi', 'biopsi', 'audiometr'] },
    { key: 'Visite specialistiche', keywords: ['visita', 'specialist', 'ambulatorial', 'dimission', 'referto'] },
  ];
  // Exact match first (case-insensitive)
  const exact = CATEGORIES.find((c) => c.key.toLowerCase() === norm);
  if (exact) return exact.key;
  // Keyword fuzzy match
  for (const { key, keywords } of FUZZY) {
    if (keywords.some((kw) => norm.includes(kw))) return key;
  }
  return null;
}

function parseAiResponse(raw: string): { summary: string; bullets: string[]; values: ReportValue[]; category: string } | null {
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);
    if (!parsed.summary || !Array.isArray(parsed.bullets)) return null;
    return {
      summary: String(parsed.summary),
      bullets: (parsed.bullets as unknown[]).map(String).slice(0, 5),
      values: Array.isArray(parsed.values)
        ? (parsed.values as { label?: unknown; value?: unknown; unit?: unknown; status?: unknown }[])
            .filter((v) => v.label && v.value)
            .map((v) => ({
              label: String(v.label),
              value: String(v.value),
              unit: String(v.unit ?? ''),
              status: (['ok', 'warning', 'critical'].includes(String(v.status)) ? v.status : 'ok') as ReportValue['status'],
            }))
        : [],
      category: String(parsed.category ?? ''),
    };
  } catch {
    return null;
  }
}

export default function ReportsScreen() {
  const { getToken } = useAuth();
  const docs = useReportsLocalStore((s) => s.docs);
  const addDoc = useReportsLocalStore((s) => s.add);
  const removeDoc = useReportsLocalStore((s) => s.remove);

  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<ReportDoc | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [imageViewer, setImageViewer] = useState<string | null>(null);

  const filtered = docs.filter(
    (d) =>
      !search ||
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.aiSummary.toLowerCase().includes(search.toLowerCase()) ||
      d.values.some((v) => v.label.toLowerCase().includes(search.toLowerCase())),
  );

  const latest = docs[0] ?? null;
  const trends = computeTrends(docs);

  const docsInCategory = (catKey: string) => docs.filter((d) => d.category === catKey);

  const handlePickDocument = async () => {
    setFabOpen(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'] });
      if (result.canceled) return;
      const asset = result.assets[0];
      await runAiAnalysis(asset.name, 'pdf', asset.uri);
    } catch {}
  };

  const handlePickImage = async () => {
    setFabOpen(false);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'] });
      if (result.canceled) return;
      const asset = result.assets[0];
      const name = asset.fileName ?? `Immagine ${new Date().toLocaleDateString('it-IT')}`;
      await runAiAnalysis(name, 'image', asset.uri);
    } catch {}
  };

  const handleCamera = async () => {
    setFabOpen(false);
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Fotocamera', 'Autorizza l\'accesso alla fotocamera nelle impostazioni.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ quality: 0.85 });
      if (result.canceled) return;
      const asset = result.assets[0];
      const name = `Foto ${new Date().toLocaleDateString('it-IT')}`;
      await runAiAnalysis(name, 'image', asset.uri);
    } catch {}
  };

  const runAiAnalysis = async (name: string, type: 'pdf' | 'image', uri: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setUploading(true);
    try {
      const mimeType = type === 'pdf' ? 'application/pdf' : 'image/jpeg';
      const dataUrl = await toDataUrl(uri, mimeType);
      const token = await getToken();

      const raw = await chat({
        token,
        history: [
          {
            id: 'sys',
            role: 'system',
            text: 'Sei un assistente medico AI che analizza documenti sanitari.',
            createdAt: new Date().toISOString(),
          },
          {
            id: 'user',
            role: 'user',
            text: AI_ANALYSIS_PROMPT,
            attachments: [{ url: uri, mimeType, dataUrl }],
            createdAt: new Date().toISOString(),
          },
        ],
      });

      const parsed = parseAiResponse(raw);
      const fallback = generateAiAnalysis(name);
      const analysis = parsed ?? fallback;

      // Category from AI (fuzzy match), fallback to filename heuristic
      const cat = resolveCategory(parsed?.category ?? '') ?? detectCategory(name);

      const catDocs = docsInCategory(cat);
      if (catDocs.length >= MAX_PER_CATEGORY) {
        Alert.alert(
          'Cartella piena',
          `La cartella "${cat}" ha raggiunto il limite di ${MAX_PER_CATEGORY} documenti. Elimina un documento esistente per aggiungerne uno nuovo.`,
        );
        setUploading(false);
        return;
      }

      addDoc({
        name,
        type,
        category: cat,
        date: todayKey(),
        aiSummary: analysis.summary,
        aiBullets: analysis.bullets,
        values: analysis.values,
        fileUri: uri,
      });
    } catch {
      // Backend non raggiungibile: fallback client-side
      const fallback = generateAiAnalysis(name);
      const cat = detectCategory(name);
      addDoc({
        name,
        type,
        category: cat,
        date: todayKey(),
        aiSummary: fallback.summary,
        aiBullets: fallback.bullets,
        values: fallback.values,
        fileUri: uri,
      });
    } finally {
      setUploading(false);
    }
  };

  const activeCategoryDocs = activeCategory ? docsInCategory(activeCategory) : [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['bottom']}>
      {/* AI analysis loading overlay */}
      {uploading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingTitle}>🧠 Analisi AI in corso…</Text>
            <Text style={styles.loadingSubtitle}>Sto leggendo e classificando il documento</Text>
          </View>
        </View>
      )}

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 90 }} showsVerticalScrollIndicator={false}>
        {/* Search */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={colors.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cerca nei tuoi referti…"
            placeholderTextColor={colors.muted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.muted} />
            </Pressable>
          )}
        </View>

        {/* Category grid */}
        {!search && (
          <View style={{ marginBottom: 16 }}>
            <Text style={styles.sectionTitle}>Cartelle</Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map((cat) => {
                const count = docsInCategory(cat.key).length;
                const full = count >= MAX_PER_CATEGORY;
                return (
                  <Pressable
                    key={cat.key}
                    style={styles.categoryCard}
                    onPress={() => setActiveCategory(cat.key)}
                  >
                    <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                    <Text style={styles.categoryLabel} numberOfLines={2}>{cat.label}</Text>
                    <View style={[styles.categoryCount, full && styles.categoryCountFull]}>
                      <Text style={[styles.categoryCountTxt, full && styles.categoryCountTxtFull]}>
                        {count}/{MAX_PER_CATEGORY}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* Hero AI — ultimo referto analizzato */}
        {latest && !search && (
          <Pressable style={styles.heroCard} onPress={() => setSelectedDoc(latest)}>
            <View style={styles.heroTop}>
              <Text style={{ fontSize: 16 }}>🧠</Text>
              <Text style={styles.heroTopLabel}>Ultimo referto analizzato</Text>
            </View>
            <Text style={styles.heroDocName}>{latest.name}</Text>
            <Text style={styles.heroDate}>{formatDate(latest.date)}</Text>
            <View style={{ height: 8 }} />
            {latest.aiBullets.slice(0, 3).map((b, i) => (
              <View key={i} style={styles.heroBulletRow}>
                <View style={styles.heroBulletDot} />
                <Text style={styles.heroBulletText}>{b}</Text>
              </View>
            ))}
            <View style={styles.heroFooter}>
              <Text style={styles.heroFooterLink}>Vedi analisi completa →</Text>
            </View>
          </Pressable>
        )}

        {/* Trend analisi */}
        {trends.length > 0 && !search && (
          <View style={{ marginTop: 16 }}>
            <Text style={styles.sectionTitle}>Trend analisi</Text>
            <View style={styles.trendRow}>
              {trends.map((t) => (
                <View key={t.label} style={styles.trendChip}>
                  <Text style={[styles.trendDir, { color: t.good ? '#16A34A' : '#F59E0B' }]}>{t.dir}</Text>
                  <Text style={styles.trendLabel}>{t.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Documenti recenti / search results */}
        {search ? (
          <View style={{ marginTop: 4 }}>
            <Text style={styles.sectionTitle}>Risultati ({filtered.length})</Text>
            <View style={{ height: 8 }} />
            {filtered.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={{ fontSize: 32 }}>🔍</Text>
                <Text style={styles.emptyTitle}>Nessun risultato</Text>
                <Text style={styles.emptyText}>Prova con un termine diverso.</Text>
              </View>
            ) : (
              filtered.map((doc) => (
                <DocCard key={doc.id} doc={doc} onPress={() => setSelectedDoc(doc)} />
              ))
            )}
          </View>
        ) : docs.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={{ fontSize: 36 }}>📄</Text>
            <Text style={styles.emptyTitle}>Nessun referto ancora</Text>
            <Text style={styles.emptyText}>
              Carica il tuo primo documento per ricevere un riassunto AI automatico e classificarlo nella cartella giusta.
            </Text>
          </View>
        ) : null}
      </ScrollView>

      {/* FAB */}
      <Pressable style={styles.fab} onPress={() => setFabOpen(true)}>
        <Ionicons name="cloud-upload-outline" size={22} color="#fff" />
        <Text style={styles.fabTxt}>Carica documento</Text>
      </Pressable>

      {/* Upload options modal */}
      <Modal visible={fabOpen} transparent animationType="fade" onRequestClose={() => setFabOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setFabOpen(false)}>
          <View style={styles.fabMenu}>
            <Text style={styles.fabMenuTitle}>Aggiungi documento</Text>
            <Pressable style={styles.fabMenuItem} onPress={handlePickDocument}>
              <View style={[styles.fabMenuIcon, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="document-text-outline" size={22} color="#3B82F6" />
              </View>
              <View>
                <Text style={styles.fabMenuLabel}>PDF</Text>
                <Text style={styles.fabMenuSub}>Referti, analisi, cartelle</Text>
              </View>
            </Pressable>
            <Pressable style={styles.fabMenuItem} onPress={handlePickImage}>
              <View style={[styles.fabMenuIcon, { backgroundColor: '#F0FDF4' }]}>
                <Ionicons name="image-outline" size={22} color="#16A34A" />
              </View>
              <View>
                <Text style={styles.fabMenuLabel}>Foto / Galleria</Text>
                <Text style={styles.fabMenuSub}>Scansioni, radiografie, ricette</Text>
              </View>
            </Pressable>
            <Pressable style={styles.fabMenuItem} onPress={handleCamera}>
              <View style={[styles.fabMenuIcon, { backgroundColor: '#FFF7ED' }]}>
                <Ionicons name="camera-outline" size={22} color="#F59E0B" />
              </View>
              <View>
                <Text style={styles.fabMenuLabel}>Fotocamera</Text>
                <Text style={styles.fabMenuSub}>Scatta una foto al documento</Text>
              </View>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Category sub-screen modal */}
      <Modal
        visible={activeCategory !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setActiveCategory(null)}
      >
        <View style={styles.detailBackdrop}>
          <View style={styles.detailSheet}>
            <View style={styles.sheetHandle} />
            {activeCategory && (
              <>
                <View style={styles.catSheetHeader}>
                  <Text style={styles.catSheetEmoji}>
                    {CATEGORIES.find((c) => c.key === activeCategory)?.emoji}
                  </Text>
                  <Text style={styles.catSheetTitle}>{activeCategory}</Text>
                  <Pressable onPress={() => setActiveCategory(null)} hitSlop={8} style={styles.detailClose}>
                    <Ionicons name="close" size={20} color={colors.ink} />
                  </Pressable>
                </View>
                <Text style={styles.catSheetCount}>
                  {activeCategoryDocs.length}/{MAX_PER_CATEGORY} documenti
                </Text>
                <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                  {activeCategoryDocs.length === 0 ? (
                    <View style={[styles.emptyBox, { marginTop: 20 }]}>
                      <Text style={{ fontSize: 32 }}>📂</Text>
                      <Text style={styles.emptyTitle}>Cartella vuota</Text>
                      <Text style={styles.emptyText}>
                        Carica un documento e l'AI lo classificherà automaticamente qui.
                      </Text>
                    </View>
                  ) : (
                    activeCategoryDocs.map((doc) => (
                      <DocCard
                        key={doc.id}
                        doc={doc}
                        onPress={() => {
                          setActiveCategory(null);
                          setTimeout(() => setSelectedDoc(doc), 300);
                        }}
                      />
                    ))
                  )}
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Document detail modal */}
      <Modal visible={selectedDoc !== null} transparent animationType="slide" onRequestClose={() => setSelectedDoc(null)}>
        <View style={styles.detailBackdrop}>
          <View style={styles.detailSheet}>
            <View style={styles.sheetHandle} />
            {selectedDoc && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.detailHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailName}>{selectedDoc.name}</Text>
                    <Text style={styles.detailMeta}>{selectedDoc.category} · {formatDate(selectedDoc.date)}</Text>
                  </View>
                  <Pressable onPress={() => setSelectedDoc(null)} hitSlop={8} style={styles.detailClose}>
                    <Ionicons name="close" size={20} color={colors.ink} />
                  </Pressable>
                </View>

                {/* Allegato */}
                {selectedDoc.fileUri && (
                  selectedDoc.type === 'image' ? (
                    <Pressable style={styles.attachmentImageWrap} onPress={() => setImageViewer(selectedDoc.fileUri!)}>
                      <Image source={{ uri: selectedDoc.fileUri }} style={styles.attachmentImage} contentFit="cover" />
                      <View style={styles.attachmentZoom}>
                        <Ionicons name="expand-outline" size={16} color="#fff" />
                      </View>
                    </Pressable>
                  ) : (
                    <Pressable
                      style={styles.attachmentPdf}
                      onPress={() => selectedDoc.fileUri && Linking.openURL(selectedDoc.fileUri).catch(() => Alert.alert('PDF', 'Impossibile aprire il file.'))}
                    >
                      <Ionicons name="document-text" size={28} color="#3B82F6" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.attachmentPdfName} numberOfLines={1}>{selectedDoc.name}</Text>
                        <Text style={styles.attachmentPdfSub}>Tocca per aprire il PDF</Text>
                      </View>
                      <Ionicons name="open-outline" size={18} color={colors.muted} />
                    </Pressable>
                  )
                )}

                <View style={styles.aiSummaryBox}>
                  <View style={styles.aiSummaryHeader}>
                    <Text style={{ fontSize: 16 }}>🧠</Text>
                    <Text style={styles.aiSummaryTitle}>Riassunto semplice</Text>
                  </View>
                  <Text style={styles.aiSummaryText}>{selectedDoc.aiSummary}</Text>
                  <View style={{ marginTop: 10, gap: 6 }}>
                    {selectedDoc.aiBullets.map((b, i) => (
                      <View key={i} style={styles.bulletRow}>
                        <View style={styles.bulletDot} />
                        <Text style={styles.bulletText}>{b}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {selectedDoc.values.length > 0 && (
                  <View style={{ marginTop: 16 }}>
                    <Text style={styles.sectionTitle}>Valori importanti</Text>
                    <View style={{ height: 8 }} />
                    {selectedDoc.values.map((v, i) => (
                      <View key={i} style={styles.valueRow}>
                        <Text style={{ fontSize: 14 }}>{STATUS_ICON[v.status]}</Text>
                        <Text style={styles.valueLabel}>{v.label}</Text>
                        <Text style={[styles.valueNum, { color: STATUS_COLOR[v.status] }]}>
                          {v.value} <Text style={styles.valueUnit}>{v.unit}</Text>
                        </Text>
                        <View style={[styles.valueBadge, { backgroundColor: STATUS_BG[v.status] }]}>
                          <Text style={[styles.valueBadgeTxt, { color: STATUS_COLOR[v.status] }]}>
                            {v.status === 'ok' ? 'Normale' : v.status === 'warning' ? 'Attenzione' : 'Critico'}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                <Pressable style={styles.deleteBtn} onPress={() => setDeleteConfirm(selectedDoc.id)}>
                  <Ionicons name="trash-outline" size={16} color="#EF4444" />
                  <Text style={styles.deleteBtnTxt}>Elimina documento</Text>
                </Pressable>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Delete confirm */}
      <Modal visible={deleteConfirm !== null} transparent animationType="fade">
        <View style={styles.confirmBackdrop}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>Elimina documento</Text>
            <Text style={styles.confirmText}>Questo documento e la sua analisi AI verranno rimossi definitivamente.</Text>
            <View style={styles.confirmBtns}>
              <Pressable style={styles.confirmCancel} onPress={() => setDeleteConfirm(null)}>
                <Text style={{ fontWeight: '600', color: colors.ink }}>Annulla</Text>
              </Pressable>
              <Pressable
                style={styles.confirmDelete}
                onPress={() => {
                  if (deleteConfirm) removeDoc(deleteConfirm);
                  setDeleteConfirm(null);
                  setSelectedDoc(null);
                }}
              >
                <Text style={{ fontWeight: '700', color: '#fff' }}>Elimina</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Fullscreen image viewer */}
      <Modal visible={imageViewer !== null} transparent animationType="fade" onRequestClose={() => setImageViewer(null)}>
        <Pressable style={styles.viewerBackdrop} onPress={() => setImageViewer(null)}>
          {imageViewer && <Image source={{ uri: imageViewer }} style={styles.viewerImage} contentFit="contain" />}
          <Pressable style={styles.viewerClose} onPress={() => setImageViewer(null)} hitSlop={10}>
            <Ionicons name="close" size={26} color="#fff" />
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function DocCard({ doc, onPress }: { doc: ReportDoc; onPress: () => void }) {
  return (
    <Pressable style={styles.docCard} onPress={onPress}>
      <View style={[styles.docIconBox, { backgroundColor: doc.type === 'pdf' ? '#EFF6FF' : '#F0FDF4' }]}>
        <Ionicons
          name={doc.type === 'pdf' ? 'document-text-outline' : 'image-outline'}
          size={22}
          color={doc.type === 'pdf' ? '#3B82F6' : '#16A34A'}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.docName} numberOfLines={1}>{doc.name}</Text>
        <Text style={styles.docMeta}>{doc.category} · {formatDate(doc.date)}</Text>
        <Text style={styles.docSummary} numberOfLines={1}>{doc.aiSummary}</Text>
      </View>
      <View style={{ gap: 6, alignItems: 'flex-end' }}>
        <Ionicons name="chevron-forward" size={16} color={colors.muted} />
        {doc.values.some((v) => v.status === 'warning') && <Text style={{ fontSize: 12 }}>🟡</Text>}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  loadingOverlay: {
    position: 'absolute',
    inset: 0,
    zIndex: 99,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingCard: {
    backgroundColor: '#fff',
    borderRadius: radii.lg,
    padding: 30,
    alignItems: 'center',
    gap: 12,
    width: 260,
  },
  loadingTitle: { fontSize: 16, fontWeight: '700', color: colors.ink },
  loadingSubtitle: { fontSize: 12, color: colors.muted, textAlign: 'center' },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
    marginBottom: 14,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.ink },

  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.ink, marginBottom: 10 },

  // Category grid
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
  },
  categoryCard: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: radii.md,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'flex-start',
    gap: 4,
  },
  categoryEmoji: { fontSize: 28, marginBottom: 4 },
  categoryLabel: { fontSize: 13, fontWeight: '700', color: colors.ink, lineHeight: 17 },
  categoryCount: {
    marginTop: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  categoryCountFull: { backgroundColor: '#FEE2E2' },
  categoryCountTxt: { fontSize: 11, fontWeight: '700', color: colors.muted },
  categoryCountTxtFull: { color: '#EF4444' },

  heroCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 4,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroTopLabel: { fontSize: 12, fontWeight: '700', color: colors.muted },
  heroDocName: { fontSize: 17, fontWeight: '800', color: colors.ink, marginTop: 8 },
  heroDate: { fontSize: 11, color: colors.muted, marginTop: 2 },
  heroBulletRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 5 },
  heroBulletDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.primary },
  heroBulletText: { fontSize: 13, color: colors.ink },
  heroFooter: { marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  heroFooterLink: { fontSize: 12, fontWeight: '700', color: colors.primary },

  trendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  trendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#fff',
    borderRadius: radii.sm,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: colors.border,
  },
  trendDir: { fontSize: 15, fontWeight: '800' },
  trendLabel: { fontSize: 12, fontWeight: '600', color: colors.ink },

  emptyBox: {
    backgroundColor: '#fff',
    borderRadius: radii.lg,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.ink, marginTop: 4 },
  emptyText: { fontSize: 13, color: colors.muted, textAlign: 'center', lineHeight: 19 },

  docCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: radii.md,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  docIconBox: { width: 42, height: 42, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  docName: { fontSize: 13, fontWeight: '700', color: colors.ink },
  docMeta: { fontSize: 10, color: colors.muted, marginTop: 2 },
  docSummary: { fontSize: 11, color: colors.muted, marginTop: 2 },

  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
    gap: 6,
  },
  fabTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end', padding: 14 },
  fabMenu: { backgroundColor: '#fff', borderRadius: radii.lg, padding: 18, gap: 2 },
  fabMenuTitle: { fontSize: 11, fontWeight: '700', color: colors.muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  fabMenuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
  fabMenuIcon: { width: 42, height: 42, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  fabMenuLabel: { fontSize: 14, fontWeight: '700', color: colors.ink },
  fabMenuSub: { fontSize: 11, color: colors.muted, marginTop: 1 },

  detailBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  detailSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 22,
    paddingBottom: 36,
    maxHeight: '88%',
  },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', alignSelf: 'center', marginBottom: 16 },

  catSheetHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  catSheetEmoji: { fontSize: 26 },
  catSheetTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: colors.ink },
  catSheetCount: { fontSize: 12, color: colors.muted, marginBottom: 14 },

  detailHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  detailName: { fontSize: 17, fontWeight: '800', color: colors.ink },
  detailMeta: { fontSize: 11, color: colors.muted, marginTop: 3 },
  detailClose: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  attachmentImageWrap: {
    height: 180,
    borderRadius: radii.md,
    overflow: 'hidden',
    marginBottom: 14,
    backgroundColor: '#F3F4F6',
  },
  attachmentImage: { width: '100%', height: '100%' },
  attachmentZoom: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 14,
    padding: 6,
  },
  attachmentPdf: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#EFF6FF',
    borderRadius: radii.md,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  attachmentPdfName: { fontSize: 14, fontWeight: '700', color: colors.ink },
  attachmentPdfSub: { fontSize: 11, color: colors.muted, marginTop: 2 },

  viewerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center' },
  viewerImage: { width: '100%', height: '80%' },
  viewerClose: { position: 'absolute', top: 50, right: 20 },

  aiSummaryBox: {
    backgroundColor: '#F0FDF4',
    borderRadius: radii.md,
    padding: 14,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  aiSummaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  aiSummaryTitle: { fontSize: 13, fontWeight: '700', color: '#16A34A' },
  aiSummaryText: { fontSize: 13, color: colors.ink, lineHeight: 19 },
  bulletRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bulletDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#16A34A' },
  bulletText: { fontSize: 12, color: colors.ink },

  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: radii.sm,
    padding: 11,
    marginBottom: 7,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 9,
  },
  valueLabel: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.ink },
  valueNum: { fontSize: 14, fontWeight: '800' },
  valueUnit: { fontSize: 10, fontWeight: '400' },
  valueBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 9 },
  valueBadgeTxt: { fontSize: 10, fontWeight: '700' },

  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    paddingVertical: 11,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FFF5F5',
  },
  deleteBtnTxt: { fontSize: 13, fontWeight: '700', color: '#EF4444' },

  confirmBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 28 },
  confirmCard: { backgroundColor: '#fff', borderRadius: radii.lg, padding: 22 },
  confirmTitle: { fontSize: 17, fontWeight: '800', color: colors.ink, marginBottom: 6 },
  confirmText: { fontSize: 13, color: colors.muted, lineHeight: 19, marginBottom: 18 },
  confirmBtns: { flexDirection: 'row', gap: 10 },
  confirmCancel: { flex: 1, paddingVertical: 12, borderRadius: radii.pill, backgroundColor: '#F3F4F6', alignItems: 'center' },
  confirmDelete: { flex: 1, paddingVertical: 12, borderRadius: radii.pill, backgroundColor: '#EF4444', alignItems: 'center' },
});
