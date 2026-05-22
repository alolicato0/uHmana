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

// ─── Trend chart ──────────────────────────────────────────────────────────────

type ValuePoint = { date: string; value: number; unit: string; status: ReportValue['status'] };

function buildDatasets(docs: ReportDoc[]): { label: string; points: ValuePoint[] }[] {
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
  return Array.from(byLabel.entries())
    .sort(([, a], [, b]) => {
      // prioritise labels with at least one warning/critical
      const aHasBad = a.some((p) => p.status !== 'ok') ? 1 : 0;
      const bHasBad = b.some((p) => p.status !== 'ok') ? 1 : 0;
      return bHasBad - aHasBad;
    })
    .slice(0, 5)
    .map(([label, points]) => ({ label, points }));
}

const STATUS_LABEL = { ok: 'Normale', warning: 'Attenzione', critical: 'Critico' };
const CHART_H = 60;
const Y_AXIS_W = 38;
const DATE_ROW_H = 16;

function TrendLine({
  points,
  color,
  chartW,
}: {
  points: ValuePoint[];
  color: string;
  chartW: number;
}) {
  const nums = points.map((p) => p.value);
  const minV = Math.min(...nums);
  const maxV = Math.max(...nums);
  const range = maxV - minV || 1;
  const n = points.length;
  const PAD = 6;

  const coords = points.map((p, i) => ({
    x: n === 1 ? chartW / 2 : (i / (n - 1)) * (chartW - PAD * 2) + PAD,
    y: PAD + (CHART_H - PAD * 2) - ((p.value - minV) / range) * (CHART_H - PAD * 2),
    p,
  }));

  return (
    <View style={{ width: chartW, height: CHART_H }}>
      {/* Baseline */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, backgroundColor: '#E5E7EB' }} />

      {/* Line segments */}
      {coords.slice(0, -1).map((c, i) => {
        const next = coords[i + 1];
        const dx = next.x - c.x;
        const dy = next.y - c.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        const mx = (c.x + next.x) / 2;
        const my = (c.y + next.y) / 2;
        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: mx - len / 2,
              top: my - 1.5,
              width: len,
              height: 3,
              borderRadius: 2,
              backgroundColor: color,
              transform: [{ rotateZ: `${angle}rad` }],
            }}
          />
        );
      })}

      {/* Dots */}
      {coords.map((c, i) => {
        const isLast = i === coords.length - 1;
        const isFirst = i === 0;
        const showLabel = isFirst || isLast || n <= 4;
        return (
          <View key={`d${i}`}>
            <View
              style={{
                position: 'absolute',
                left: c.x - (isLast ? 5 : 3.5),
                top: c.y - (isLast ? 5 : 3.5),
                width: isLast ? 10 : 7,
                height: isLast ? 10 : 7,
                borderRadius: isLast ? 5 : 3.5,
                backgroundColor: isLast ? color : '#fff',
                borderWidth: isLast ? 2 : 1.5,
                borderColor: color,
              }}
            />
            {showLabel && (
              <Text
                style={{
                  position: 'absolute',
                  left: isFirst ? c.x + 7 : c.x - 22,
                  top: c.y - (c.y > CHART_H / 2 ? 16 : -4),
                  fontSize: 10,
                  fontWeight: '700',
                  color,
                  minWidth: 20,
                  textAlign: isFirst ? 'left' : 'right',
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
}

function SparkCard({ label, points }: { label: string; points: ValuePoint[] }) {
  const [chartW, setChartW] = useState(240);
  const nums = points.map((p) => p.value);
  const minV = Math.min(...nums);
  const maxV = Math.max(...nums);
  const unit = points[0].unit;
  const last = points[points.length - 1];
  const first = points[0];
  const hasTrend = points.length > 1;
  const color = STATUS_COLOR[last.status];

  const trend = hasTrend
    ? last.value > first.value ? '↑' : last.value < first.value ? '↓' : '→'
    : null;

  const shortDate = (iso: string) => {
    const [, m, d] = iso.split('-');
    return `${parseInt(d, 10)}/${parseInt(m, 10)}`;
  };

  return (
    <View style={[styles.sparkCard, { borderLeftColor: color }]}>
      {/* Header */}
      <View style={styles.sparkHeader}>
        <Text style={styles.sparkLabel} numberOfLines={1}>{label}</Text>
        <View style={[styles.statusBadge, { backgroundColor: STATUS_BG[last.status] }]}>
          <Text style={[styles.statusBadgeTxt, { color }]}>{STATUS_LABEL[last.status]}</Text>
        </View>
      </View>

      {/* Big value */}
      <View style={styles.sparkValueRow}>
        <Text style={[styles.sparkBigValue, { color }]}>
          {last.value}
          <Text style={styles.sparkUnit}> {unit}</Text>
        </Text>
        {trend && (
          <Text style={[styles.sparkTrend, { color }]}>{trend}</Text>
        )}
      </View>

      {/* Chart (2+ points) */}
      {hasTrend ? (
        <View style={{ marginTop: 10 }}>
          {/* Chart row: y-axis + plot */}
          <View style={{ flexDirection: 'row', alignItems: 'stretch' }}>
            <View style={{ width: Y_AXIS_W, justifyContent: 'space-between', paddingVertical: 2, alignItems: 'flex-end', paddingRight: 6 }}>
              <Text style={styles.axisLabel}>{maxV}</Text>
              <Text style={styles.axisLabel}>{minV}</Text>
            </View>
            <View
              style={{ flex: 1, height: CHART_H }}
              onLayout={(e) => setChartW(e.nativeEvent.layout.width)}
            >
              <TrendLine points={points} color={color} chartW={chartW} />
            </View>
          </View>
          {/* X-axis dates */}
          <View style={{ flexDirection: 'row', paddingLeft: Y_AXIS_W, height: DATE_ROW_H, marginTop: 2 }}>
            {points.length <= 6 ? (
              points.map((p, i) => {
                const frac = points.length === 1 ? 0.5 : i / (points.length - 1);
                return (
                  <Text
                    key={i}
                    style={[styles.dateLabel, {
                      position: 'absolute',
                      left: Y_AXIS_W + frac * chartW - 12,
                    }]}
                  >
                    {shortDate(p.date)}
                  </Text>
                );
              })
            ) : (
              <>
                <Text style={styles.dateLabel}>{shortDate(first.date)}</Text>
                <Text style={[styles.dateLabel, { marginLeft: 'auto' }]}>{shortDate(last.date)}</Text>
              </>
            )}
          </View>
        </View>
      ) : (
        <Text style={styles.sparkNote}>
          {`Rilevamento del ${formatDate(last.date)} · Aggiungi altri referti per vedere l'evoluzione`}
        </Text>
      )}

      {/* Footer (multiple points) */}
      {hasTrend && (
        <Text style={styles.sparkNote}>
          {`${points.length} rilevamenti · ${formatDate(first.date)} → ${formatDate(last.date)}`}
        </Text>
      )}
    </View>
  );
}

function ValueTrendChart({ docs }: { docs: ReportDoc[] }) {
  const datasets = buildDatasets(docs);
  if (datasets.length === 0) return null;
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={styles.sectionTitle}>Andamento valori AI</Text>
      <View style={{ height: 8 }} />
      {datasets.map((ds) => (
        <SparkCard key={ds.label} label={ds.label} points={ds.points} />
      ))}
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

  // Mese più recente aperto di default, gli altri chiusi.
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(groups[0] ? [groups[0].monthKey] : []),
  );
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

  // Spark chart
  sparkCard: {
    backgroundColor: '#fff',
    borderRadius: radii.md,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
  },
  sparkHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  sparkLabel: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.ink },
  statusBadge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 99 },
  statusBadgeTxt: { fontSize: 11, fontWeight: '700' },
  sparkValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  sparkBigValue: { fontSize: 22, fontWeight: '900' },
  sparkUnit: { fontSize: 13, fontWeight: '500', color: colors.muted },
  sparkTrend: { fontSize: 20, fontWeight: '800' },
  axisLabel: { fontSize: 10, fontWeight: '600', color: '#B0B7C3' },
  dateLabel: { fontSize: 9, fontWeight: '600', color: '#B0B7C3' },
  sparkNote: { fontSize: 11, color: colors.muted, marginTop: 8, lineHeight: 15 },

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
