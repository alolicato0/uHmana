import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { type ReportDoc, type ReportValue, useReportsLocalStore } from '../src/store/reportsLocal';
import { colors, radii } from '../src/theme';

// ─── AI summary generator (client-side heuristics until backend) ──────────────
function generateAiAnalysis(name: string): {
  summary: string;
  bullets: string[];
  values: ReportValue[];
} {
  const n = name.toLowerCase();
  if (n.includes('sangue') || n.includes('ematic') || n.includes('cbc')) {
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
  if (n.includes('radiografi') || n.includes('rx') || n.includes('torace')) {
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

export default function ReportsScreen() {
  const docs = useReportsLocalStore((s) => s.docs);
  const addDoc = useReportsLocalStore((s) => s.add);
  const removeDoc = useReportsLocalStore((s) => s.remove);

  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<ReportDoc | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const filtered = docs.filter(
    (d) =>
      !search ||
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.aiSummary.toLowerCase().includes(search.toLowerCase()) ||
      d.values.some((v) => v.label.toLowerCase().includes(search.toLowerCase())),
  );

  const latest = docs[0] ?? null;
  const trends = computeTrends(docs);

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

  const runAiAnalysis = async (name: string, type: 'pdf' | 'image', uri: string) => {
    setUploading(true);
    // Simulate AI reading delay
    await new Promise((res) => setTimeout(res, 2200));
    const analysis = generateAiAnalysis(name);
    addDoc({
      name,
      type,
      category: detectCategory(name),
      date: todayKey(),
      aiSummary: analysis.summary,
      aiBullets: analysis.bullets,
      values: analysis.values,
      fileUri: uri,
    });
    setUploading(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['bottom']}>
      {/* AI analysis loading overlay */}
      {uploading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingTitle}>🧠 Analisi AI in corso…</Text>
            <Text style={styles.loadingSubtitle}>Sto leggendo e riassumendo il documento</Text>
          </View>
        </View>
      )}

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
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

        {/* 1. Hero AI — ultimo referto analizzato */}
        {latest && !search && (
          <Pressable style={styles.heroCard} onPress={() => setSelectedDoc(latest)}>
            <View style={styles.heroTop}>
              <Text style={{ fontSize: 18 }}>🧠</Text>
              <Text style={styles.heroTopLabel}>Ultimo referto analizzato</Text>
            </View>
            <Text style={styles.heroDocName}>{latest.name}</Text>
            <Text style={styles.heroDate}>{formatDate(latest.date)}</Text>
            <View style={{ height: 10 }} />
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

        {/* 5. Trend analisi */}
        {trends.length > 0 && !search && (
          <View style={{ marginTop: 20 }}>
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

        {/* 2. Documenti recenti */}
        <View style={{ marginTop: 20 }}>
          <Text style={styles.sectionTitle}>{search ? `Risultati (${filtered.length})` : 'Documenti recenti'}</Text>
          <View style={{ height: 10 }} />
          {filtered.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={{ fontSize: 36 }}>📄</Text>
              <Text style={styles.emptyTitle}>{search ? 'Nessun risultato' : 'Nessun referto ancora'}</Text>
              <Text style={styles.emptyText}>
                {search ? 'Prova con un termine diverso.' : 'Carica il tuo primo documento per ricevere un riassunto AI automatico.'}
              </Text>
            </View>
          ) : (
            filtered.map((doc) => (
              <Pressable key={doc.id} style={styles.docCard} onPress={() => setSelectedDoc(doc)}>
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
                  {doc.values.some((v) => v.status === 'warning') && (
                    <Text style={{ fontSize: 12 }}>🟡</Text>
                  )}
                </View>
              </Pressable>
            ))
          )}
        </View>
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
                <Text style={styles.fabMenuLabel}>Foto / Immagine</Text>
                <Text style={styles.fabMenuSub}>Scansioni, radiografie, ricette</Text>
              </View>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Document detail modal */}
      <Modal visible={selectedDoc !== null} transparent animationType="slide" onRequestClose={() => setSelectedDoc(null)}>
        <View style={styles.detailBackdrop}>
          <View style={styles.detailSheet}>
            <View style={styles.sheetHandle} />
            {selectedDoc && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.detailHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailName}>{selectedDoc.name}</Text>
                    <Text style={styles.detailMeta}>{selectedDoc.category} · {formatDate(selectedDoc.date)}</Text>
                  </View>
                  <Pressable onPress={() => setSelectedDoc(null)} hitSlop={8} style={styles.detailClose}>
                    <Ionicons name="close" size={20} color={colors.ink} />
                  </Pressable>
                </View>

                {/* AI Summary */}
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

                {/* Values */}
                {selectedDoc.values.length > 0 && (
                  <View style={{ marginTop: 18 }}>
                    <Text style={styles.sectionTitle}>Valori importanti</Text>
                    <View style={{ height: 10 }} />
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

                {/* Delete */}
                <Pressable
                  style={styles.deleteBtn}
                  onPress={() => setDeleteConfirm(selectedDoc.id)}
                >
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
    </SafeAreaView>
  );
}

function detectCategory(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('sangue') || n.includes('ematic')) return 'Esame del sangue';
  if (n.includes('urin')) return 'Esame urine';
  if (n.includes('radiografi') || n.includes('rx')) return 'Radiografia';
  if (n.includes('colesterol') || n.includes('lipid')) return 'Profilo lipidico';
  if (n.includes('ecografi')) return 'Ecografia';
  return 'Referto';
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  const months = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
  return `${parseInt(d, 10)} ${months[parseInt(m, 10) - 1]} ${y}`;
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
    padding: 32,
    alignItems: 'center',
    gap: 14,
    width: 260,
  },
  loadingTitle: { fontSize: 17, fontWeight: '700', color: colors.ink },
  loadingSubtitle: { fontSize: 13, color: colors.muted, textAlign: 'center' },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 10,
    marginBottom: 16,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.ink },

  heroCard: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroTopLabel: { fontSize: 13, fontWeight: '700', color: colors.muted },
  heroDocName: { fontSize: 18, fontWeight: '800', color: colors.ink, marginTop: 10 },
  heroDate: { fontSize: 12, color: colors.muted, marginTop: 2 },
  heroBulletRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  heroBulletDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.primary },
  heroBulletText: { fontSize: 13, color: colors.ink },
  heroFooter: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  heroFooterLink: { fontSize: 13, fontWeight: '700', color: colors.primary },

  trendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  trendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    borderRadius: radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  trendDir: { fontSize: 16, fontWeight: '800' },
  trendLabel: { fontSize: 13, fontWeight: '600', color: colors.ink },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.ink },

  emptyBox: {
    backgroundColor: '#fff',
    borderRadius: radii.lg,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: colors.ink, marginTop: 4 },
  emptyText: { fontSize: 13, color: colors.muted, textAlign: 'center', lineHeight: 19 },

  docCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: radii.md,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  docIconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  docName: { fontSize: 14, fontWeight: '700', color: colors.ink },
  docMeta: { fontSize: 11, color: colors.muted, marginTop: 2 },
  docSummary: { fontSize: 12, color: colors.muted, marginTop: 3 },

  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
    gap: 6,
  },
  fabTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end', padding: 16 },
  fabMenu: {
    backgroundColor: '#fff',
    borderRadius: radii.lg,
    padding: 20,
    gap: 4,
  },
  fabMenuTitle: { fontSize: 13, fontWeight: '700', color: colors.muted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  fabMenuItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 },
  fabMenuIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  fabMenuLabel: { fontSize: 15, fontWeight: '700', color: colors.ink },
  fabMenuSub: { fontSize: 12, color: colors.muted, marginTop: 1 },

  detailBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  detailSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '88%',
  },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', alignSelf: 'center', marginBottom: 18 },
  detailHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
  detailName: { fontSize: 18, fontWeight: '800', color: colors.ink },
  detailMeta: { fontSize: 12, color: colors.muted, marginTop: 3 },
  detailClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  aiSummaryBox: {
    backgroundColor: '#F0FDF4',
    borderRadius: radii.md,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  aiSummaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  aiSummaryTitle: { fontSize: 14, fontWeight: '700', color: '#16A34A' },
  aiSummaryText: { fontSize: 14, color: colors.ink, lineHeight: 20 },
  bulletRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bulletDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#16A34A' },
  bulletText: { fontSize: 13, color: colors.ink },

  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: radii.sm,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  valueLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.ink },
  valueNum: { fontSize: 15, fontWeight: '800' },
  valueUnit: { fontSize: 11, fontWeight: '400' },
  valueBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  valueBadgeTxt: { fontSize: 11, fontWeight: '700' },

  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
    paddingVertical: 12,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FFF5F5',
  },
  deleteBtnTxt: { fontSize: 14, fontWeight: '700', color: '#EF4444' },

  confirmBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 28 },
  confirmCard: { backgroundColor: '#fff', borderRadius: radii.lg, padding: 24 },
  confirmTitle: { fontSize: 18, fontWeight: '800', color: colors.ink, marginBottom: 8 },
  confirmText: { fontSize: 14, color: colors.muted, lineHeight: 20, marginBottom: 20 },
  confirmBtns: { flexDirection: 'row', gap: 12 },
  confirmCancel: { flex: 1, paddingVertical: 13, borderRadius: radii.pill, backgroundColor: '#F3F4F6', alignItems: 'center' },
  confirmDelete: { flex: 1, paddingVertical: 13, borderRadius: radii.pill, backgroundColor: '#EF4444', alignItems: 'center' },
});
