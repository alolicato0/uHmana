import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { type ReportDoc, type ReportValue, useReportsLocalStore } from '../src/store/reportsLocal';
import { colors, radii } from '../src/theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const CATEGORIES: { key: string; label: string; emoji: string }[] = [
  { key: 'Analisi del sangue', label: 'Analisi del sangue', emoji: '🩸' },
  { key: 'Radiologia', label: 'Radiologia', emoji: '🦴' },
  { key: 'Esami strumentali', label: 'Esami strumentali', emoji: '🔬' },
  { key: 'Visite specialistiche', label: 'Visite specialistiche', emoji: '🩺' },
];
const MAX_PER_CATEGORY = 10;

const MONTHS_IT = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  const months = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
  return `${parseInt(d, 10)} ${months[parseInt(m, 10) - 1]} ${y}`;
}

function groupByMonth(docs: ReportDoc[]): { monthKey: string; monthLabel: string; docs: ReportDoc[] }[] {
  const map = new Map<string, ReportDoc[]>();
  for (const doc of docs) {
    const [y, m] = doc.date.split('-');
    const key = `${y}-${m}`;
    const list = map.get(key) ?? [];
    list.push(doc);
    map.set(key, list);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, docs]) => {
      const [y, m] = key.split('-');
      return { monthKey: key, monthLabel: `${MONTHS_IT[parseInt(m, 10) - 1]} ${y}`, docs };
    });
}

const STATUS_COLOR = { ok: '#16A34A', warning: '#F59E0B', critical: '#EF4444' };
const STATUS_BG = { ok: '#DCFCE7', warning: '#FEF9C3', critical: '#FEE2E2' };
const STATUS_ICON = { ok: '🟢', warning: '🟡', critical: '🔴' };

// ─── Trend chart combinato ──────────────────────────────────────────────────

type ValuePoint = { date: string; value: number; unit: string; status: ReportValue['status'] };
type Series = { label: string; points: ValuePoint[] };

function buildDatasets(docs: ReportDoc[]): Series[] {
  const byLabel = new Map<string, ValuePoint[]>();
  const sorted = [...docs].sort((a, b) => a.date.localeCompare(b.date));
  for (const doc of sorted) {
    for (const v of doc.values) {
      const num = parseFloat(v.value);
      if (isNaN(num)) continue;
      const list = byLabel.get(v.label) ?? [];
      list.push({ date: doc.date, value: num, unit: v.unit, status: v.status });
      byLabel.set(v.label, list);
    }
  }
  return Array.from(byLabel.entries()).map(([label, points]) => ({ label, points }));
}

const STATUS_LABEL = { ok: 'Normale', warning: 'Attenzione', critical: 'Critico' };
const CH = 104;        // altezza plot (compatto)
const GRID_LINES = 4;
const PAD_V = 10;
const SERIES_PALETTE = ['#3B82F6', '#8B5CF6', '#EC4899', '#0DB09E', '#F97316', '#14B8A6'];

function shortDate(iso: string) {
  const [, m, d] = iso.split('-');
  return `${parseInt(d, 10)}/${parseInt(m, 10)}`;
}

// Colore serie: critico=rosso, attenzione=ambra, altrimenti palette per distinguere le linee
function seriesColor(s: Series, idx: number): string {
  const last = s.points[s.points.length - 1];
  if (last.status === 'critical') return STATUS_COLOR.critical;
  if (last.status === 'warning') return STATUS_COLOR.warning;
  return SERIES_PALETTE[idx % SERIES_PALETTE.length];
}

// Un unico grafico multi-linea: ogni serie è normalizzata sul proprio dominio
// (le scale/unità possono differire), quindi niente asse Y numerico condiviso.
function CombinedTrendChart({ series }: { series: Series[] }) {
  const [chartW, setChartW] = useState(260);
  const colorsBySeries = series.map((s, i) => seriesColor(s, i));

  const allDates = Array.from(new Set(series.flatMap((s) => s.points.map((p) => p.date)))).sort();
  const n = allDates.length;
  const getX = (date: string) => {
    const i = allDates.indexOf(date);
    return n <= 1 ? chartW / 2 : PAD_V + (i / (n - 1)) * (chartW - PAD_V * 2);
  };

  const gridRows = Array.from({ length: GRID_LINES + 1 }, (_, i) => ({
    y: PAD_V + (CH - PAD_V * 2) * (i / GRID_LINES),
  }));

  return (
    <View>
      <View style={{ height: CH }} onLayout={(e) => setChartW(e.nativeEvent.layout.width)}>
        {gridRows.map((g, i) => (
          <View
            key={`g${i}`}
            style={{
              position: 'absolute', left: 0, right: 0, top: g.y, height: 1,
              backgroundColor: i === 0 || i === GRID_LINES ? '#D1D5DB' : '#EEF1F5',
            }}
          />
        ))}
        {allDates.map((d, i) => (
          <View
            key={`vg${i}`}
            style={{ position: 'absolute', left: getX(d), top: PAD_V, width: 1, height: CH - PAD_V * 2, backgroundColor: '#F6F7F9' }}
          />
        ))}
        {series.map((s, si) => {
          const color = colorsBySeries[si];
          const nums = s.points.map((p) => p.value);
          const mn = Math.min(...nums);
          const mx = Math.max(...nums);
          const spread = mx - mn;
          const pad = spread > 0 ? spread * 0.18 : Math.max(mn * 0.15, 1);
          const dMin = mn - pad;
          const range = mx + pad - dMin;
          const getY = (v: number) => PAD_V + (CH - PAD_V * 2) * (1 - (v - dMin) / range);
          const coords = s.points.map((p) => ({ x: getX(p.date), y: getY(p.value), p }));
          return (
            <View key={s.label}>
              {coords.slice(0, -1).map((c, i) => {
                const nx = coords[i + 1];
                const dx = nx.x - c.x;
                const dy = nx.y - c.y;
                const len = Math.sqrt(dx * dx + dy * dy);
                const angle = Math.atan2(dy, dx);
                const mxp = (c.x + nx.x) / 2;
                const myp = (c.y + nx.y) / 2;
                return (
                  <View
                    key={i}
                    style={{
                      position: 'absolute', left: mxp - len / 2, top: myp - 1.25,
                      width: len, height: 2.5, borderRadius: 2, backgroundColor: color,
                      transform: [{ rotateZ: `${angle}rad` }],
                    }}
                  />
                );
              })}
              {coords.map((c, i) => {
                const isLast = i === coords.length - 1;
                const r = isLast ? 5 : 3.5;
                const above = c.y > CH / 2;
                return (
                  <View key={`d${i}`}>
                    <View
                      style={{
                        position: 'absolute', left: c.x - r, top: c.y - r,
                        width: r * 2, height: r * 2, borderRadius: r, backgroundColor: color,
                        borderWidth: isLast ? 2 : 0, borderColor: '#fff',
                      }}
                    />
                    {isLast && (
                      <Text
                        style={{
                          position: 'absolute', left: c.x - 22, top: above ? c.y - 17 : c.y + r + 1,
                          width: 44, textAlign: 'center', fontSize: 10, fontWeight: '800', color,
                        }}
                      >
                        {c.p.value}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          );
        })}
      </View>

      {/* Asse X date */}
      <View style={{ height: 14, marginTop: 2 }}>
        {allDates.map((d, i) => (
          <Text key={i} style={[styles.dateLabel, { position: 'absolute', left: getX(d) - 16, width: 32, textAlign: 'center' }]}>
            {shortDate(d)}
          </Text>
        ))}
      </View>

      {/* Legenda */}
      <View style={styles.legendWrap}>
        {series.map((s, si) => {
          const last = s.points[s.points.length - 1];
          return (
            <View key={s.label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colorsBySeries[si] }]} />
              <Text style={styles.legendLabel} numberOfLines={1}>{s.label}</Text>
              <Text style={[styles.legendVal, { color: colorsBySeries[si] }]}>
                {last.value}<Text style={styles.legendUnit}> {last.unit}</Text>
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: STATUS_BG[last.status] }]}>
                <Text style={[styles.statusBadgeTxt, { color: STATUS_COLOR[last.status] }]}>{STATUS_LABEL[last.status]}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function NormalRow({ s }: { s: Series }) {
  const last = s.points[s.points.length - 1];
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: STATUS_COLOR.ok }]} />
      <Text style={styles.legendLabel} numberOfLines={1}>{s.label}</Text>
      <Text style={[styles.legendVal, { color: colors.ink }]}>
        {last.value}<Text style={styles.legendUnit}> {last.unit}</Text>
      </Text>
      <View style={[styles.statusBadge, { backgroundColor: STATUS_BG.ok }]}>
        <Text style={[styles.statusBadgeTxt, { color: STATUS_COLOR.ok }]}>Normale</Text>
      </View>
    </View>
  );
}

function ValueTrendChart({ docs }: { docs: ReportDoc[] }) {
  const datasets = buildDatasets(docs);
  if (datasets.length === 0) return null;
  const attention = datasets.filter((s) => s.points.some((p) => p.status !== 'ok')).slice(0, 6);
  const normal = datasets.filter((s) => s.points.every((p) => p.status === 'ok'));

  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={styles.sectionTitle}>Andamento valori AI</Text>
      <View style={{ height: 8 }} />

      {attention.length > 0 ? (
        <View style={styles.combinedCard}>
          <Text style={styles.combinedTitle}>
            {attention.length === 1 ? 'Valore da monitorare' : `${attention.length} valori da monitorare`}
          </Text>
          <CombinedTrendChart series={attention} />
        </View>
      ) : (
        <View style={[styles.combinedCard, { paddingVertical: 16 }]}>
          <Text style={styles.allOkText}>🟢 Tutti i valori rilevati sono nella norma.</Text>
        </View>
      )}

      {normal.length > 0 && (
        <View style={styles.normalCard}>
          <Text style={styles.normalCardTitle}>Altri valori nella norma</Text>
          {normal.map((s) => (
            <NormalRow key={s.label} s={s} />
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ReportsCategoryScreen() {
  const { category } = useLocalSearchParams<{ category: string }>();
  const docs = useReportsLocalStore((s) => s.docs);
  const removeDoc = useReportsLocalStore((s) => s.remove);

  const [selectedDoc, setSelectedDoc] = useState<ReportDoc | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [imageViewer, setImageViewer] = useState<string | null>(null);

  const catInfo = CATEGORIES.find((c) => c.key === category);
  const catDocs = docs.filter((d) => d.category === category);
  const groups = groupByMonth(catDocs);

  // Tutti i mesi chiusi di default (anche i futuri).
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const toggleMonth = (key: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.ink} />
        </Pressable>
        <Text style={styles.headerEmoji}>{catInfo?.emoji ?? '📂'}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{category}</Text>
          <Text style={styles.headerCount}>{catDocs.length}/{MAX_PER_CATEGORY} documenti</Text>
        </View>
      </View>

      {catDocs.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={{ fontSize: 36 }}>📂</Text>
          <Text style={styles.emptyTitle}>Cartella vuota</Text>
          <Text style={styles.emptyText}>
            Carica un documento e l'AI lo classificherà automaticamente qui.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <ValueTrendChart docs={catDocs} />
          {groups.map((group) => {
            const open = expanded.has(group.monthKey);
            return (
              <View key={group.monthKey} style={{ marginBottom: 10 }}>
                <Pressable style={styles.monthHeader} onPress={() => toggleMonth(group.monthKey)}>
                  <Ionicons
                    name={open ? 'chevron-down' : 'chevron-forward'}
                    size={16}
                    color={colors.muted}
                  />
                  <Text style={styles.monthLabel}>{group.monthLabel}</Text>
                  <View style={styles.monthCountBadge}>
                    <Text style={styles.monthCountTxt}>{group.docs.length}</Text>
                  </View>
                </Pressable>
                {open &&
                  group.docs.map((doc) => (
                    <DocCard key={doc.id} doc={doc} onPress={() => setSelectedDoc(doc)} />
                  ))}
              </View>
            );
          })}
        </ScrollView>
      )}

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
        <Text style={styles.docDate}>{formatDate(doc.date)}</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: '#fff',
  },
  backBtn: { padding: 2 },
  headerEmoji: { fontSize: 26 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: colors.ink },
  headerCount: { fontSize: 11, color: colors.muted, marginTop: 1 },

  // Grafico combinato
  combinedCard: {
    backgroundColor: '#fff',
    borderRadius: radii.md,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  combinedTitle: { fontSize: 13, fontWeight: '700', color: colors.ink, marginBottom: 10 },
  allOkText: { fontSize: 13, fontWeight: '600', color: '#16A34A', textAlign: 'center' },
  statusBadge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 99 },
  statusBadgeTxt: { fontSize: 10, fontWeight: '700' },
  dateLabel: { fontSize: 9, fontWeight: '600', color: '#B0B7C3' },

  legendWrap: { marginTop: 12, gap: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 9, height: 9, borderRadius: 5 },
  legendLabel: { flex: 1, fontSize: 12, fontWeight: '600', color: colors.ink },
  legendVal: { fontSize: 13, fontWeight: '800' },
  legendUnit: { fontSize: 10, fontWeight: '500', color: colors.muted },

  normalCard: {
    backgroundColor: '#fff',
    borderRadius: radii.md,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  normalCardTitle: { fontSize: 12, fontWeight: '700', color: colors.muted, marginBottom: 2 },

  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    marginTop: 2,
  },
  monthLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  monthCountBadge: {
    minWidth: 20,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 9,
    backgroundColor: '#EEF1F5',
    alignItems: 'center',
  },
  monthCountTxt: { fontSize: 11, fontWeight: '700', color: colors.muted },

  emptyBox: {
    margin: 24,
    backgroundColor: '#fff',
    borderRadius: radii.lg,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
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
  docDate: { fontSize: 10, color: colors.muted, marginTop: 2 },
  docSummary: { fontSize: 11, color: colors.muted, marginTop: 2 },

  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.ink, marginBottom: 10 },

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

  viewerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center' },
  viewerImage: { width: '100%', height: '80%' },
  viewerClose: { position: 'absolute', top: 50, right: 20 },
});
