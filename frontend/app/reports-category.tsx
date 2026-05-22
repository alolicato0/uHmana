import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { type ReportDoc, type ReportValue, useReportsLocalStore } from '../src/store/reportsLocal';
import { colors, radii } from '../src/theme';

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
          {groups.map((group) => (
            <View key={group.monthKey} style={{ marginBottom: 16 }}>
              <Text style={styles.monthLabel}>{group.monthLabel}</Text>
              {group.docs.map((doc) => (
                <DocCard key={doc.id} doc={doc} onPress={() => setSelectedDoc(doc)} />
              ))}
            </View>
          ))}
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

  monthLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 4,
  },

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
