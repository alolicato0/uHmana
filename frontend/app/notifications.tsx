import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { scheduleTestNotification } from '../src/services/preventionNotifications';
import { useNotifSeenStore } from '../src/store/notifSeen';
import { usePreventionStore } from '../src/store/prevention';
import { useProfileStore } from '../src/store/profile';
import { useRemindersStore } from '../src/store/reminders';
import { colors } from '../src/theme';

const ANTI_LABELS: Record<string, string> = {
  pulci_zecche: 'Pulci & Zecche',
  filaria: 'Filaria',
  vermi: 'Vermi',
  generico: 'Generico',
};

function daysUntil(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  const target = new Date(y, m - 1, d, 0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / 86400000);
}

function whenLabel(days: number): string {
  if (days < 0) return `Scaduto ${Math.abs(days)} giorni fa`;
  if (days === 0) return 'Oggi';
  if (days === 1) return 'Domani';
  return `Tra ${days} giorni`;
}

function whenColor(days: number): string {
  if (days < 0) return '#EF4444';
  if (days <= 7) return '#F59E0B';
  return '#10B981';
}

type NotifItem = {
  key: string;
  emoji: string;
  title: string;
  subtitle: string;
  iso: string;
};

export default function NotificationsScreen() {
  const activeKind = useProfileStore((s) => s.activeKind);
  const vaccines = usePreventionStore((s) => s.vaccines);
  const antis = usePreventionStore((s) => s.antiparasitics);
  const checks = usePreventionStore((s) => s.checks);
  const reminders = useRemindersStore((s) => s.reminders);
  const markSeen = useNotifSeenStore((s) => s.markSeen);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const isPet = activeKind === 'pet';
  const accent = isPet ? '#10B981' : colors.primary;
  const titleText = isPet ? 'Notifiche Animale' : 'Notifiche Umano';
  const subText = isPet ? 'Vaccini, antiparassitari e controlli' : 'Farmaci e promemoria salute';

  const items: NotifItem[] = useMemo(() => {
    if (isPet) {
      const out: NotifItem[] = [];
      vaccines.forEach((v) => {
        if (v.nextDate) out.push({ key: `v_${v.id}`, emoji: '💉', title: v.name, subtitle: 'Vaccino', iso: v.nextDate });
      });
      antis.forEach((a) => {
        out.push({ key: `a_${a.id}`, emoji: '🦟', title: a.name, subtitle: ANTI_LABELS[a.type] ?? 'Antiparassitario', iso: a.nextDate });
      });
      checks.forEach((c) => {
        if (c.nextDate) out.push({ key: `c_${c.id}`, emoji: '🩺', title: c.name, subtitle: 'Controllo', iso: c.nextDate });
      });
      return out.sort((x, y) => x.iso.localeCompare(y.iso));
    }
    return reminders
      .filter((r) => r.enabled)
      .map((r) => ({
        key: r.id,
        emoji: r.category === 'medication' ? '💊' : r.category === 'vaccine' ? '💉' : r.category === 'visit' ? '🩺' : '🔔',
        title: r.title,
        subtitle: r.schedule.time ? `Ore ${r.schedule.time}` : r.schedule.kind,
        iso: r.schedule.date ?? new Date().toISOString().slice(0, 10),
      }));
  }, [isPet, vaccines, antis, checks, reminders]);

  const visibleItems = useMemo(() => items.filter((it) => !dismissed.has(it.key)), [items, dismissed]);

  useEffect(() => {
    if (items.length > 0) markSeen(items.map((it) => it.key));
  }, [items, markSeen]);

  const dismissOne = (key: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDismissed((s) => {
      const next = new Set(s);
      next.add(key);
      return next;
    });
  };

  const openItem = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(isPet ? '/prevenzione' : '/reminders');
  };

  async function onTestNotification() {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await scheduleTestNotification();
    } catch {
      // ignore
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F4F6FB' }} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ padding: 2 }}>
          <Ionicons name="arrow-back" size={22} color="#1F2937" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{titleText}</Text>
          <Text style={styles.sub}>{subText}</Text>
        </View>
        <Ionicons name="notifications" size={22} color={accent} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        {visibleItems.length === 0 ? (
          <View style={styles.empty}>
            <Text style={{ fontSize: 44 }}>🔕</Text>
            <Text style={styles.emptyTitle}>Nessuna notifica</Text>
            <Text style={styles.emptyText}>
              {isPet
                ? `Non ci sono scadenze programmate per il tuo animale. Aggiungi vaccini, antiparassitari o controlli dalla sezione Prevenzione.`
                : `Non ci sono promemoria attivi. Aggiungi farmaci o visite dal Piano Salute.`}
            </Text>
            <Pressable
              style={[styles.cta, { backgroundColor: accent }]}
              onPress={() => router.push(isPet ? '/prevenzione' : '/reminders')}
            >
              <Text style={styles.ctaTxt}>{isPet ? 'Vai a Prevenzione' : 'Vai al Piano Salute'}</Text>
            </Pressable>
          </View>
        ) : (
          visibleItems.map((it) => {
            const days = daysUntil(it.iso);
            const col = whenColor(days);
            return (
              <Pressable key={it.key} style={styles.row} onPress={openItem}>
                <View style={[styles.iconWrap, { backgroundColor: col + '22' }]}>
                  <Text style={{ fontSize: 18 }}>{it.emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{it.title}</Text>
                  <Text style={styles.rowSub}>{it.subtitle}</Text>
                </View>
                <View style={[styles.pill, { backgroundColor: col + '22' }]}>
                  <Text style={[styles.pillTxt, { color: col }]}>{whenLabel(days)}</Text>
                </View>
                <Pressable hitSlop={10} onPress={() => dismissOne(it.key)} style={styles.dismissBtn}>
                  <Ionicons name="close" size={16} color="#9CA3AF" />
                </Pressable>
              </Pressable>
            );
          })
        )}

        <Pressable style={styles.testBtn} onPress={onTestNotification}>
          <Ionicons name="flash-outline" size={16} color="#6B7280" />
          <Text style={styles.testBtnTxt}>Invia notifica di test (10s)</Text>
        </Pressable>

        <View style={styles.tipBox}>
          <Text style={styles.tipTitle}>⚙️ Le notifiche arrivano in ritardo o non arrivano?</Text>
          <Text style={styles.tipText}>
            Android (specialmente Xiaomi/MIUI, Huawei, OPPO, Samsung) blocca le notifiche per risparmiare batteria.
            {'\n\n'}
            <Text style={styles.tipBold}>Per riceverle puntualmente:</Text>
            {'\n'}• Impostazioni → App → uHmana → <Text style={styles.tipBold}>Risparmio batteria</Text> → Nessuna restrizione
            {'\n'}• Impostazioni → App → uHmana → <Text style={styles.tipBold}>Avvio automatico</Text> → Attiva (solo MIUI/Xiaomi)
            {'\n'}• Impostazioni → App → uHmana → Notifiche → <Text style={styles.tipBold}>Importanza Alta</Text>
          </Text>
        </View>
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
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#F4F6FB',
  },
  title: { fontSize: 17, fontWeight: '800', color: '#1F2937' },
  sub: { fontSize: 11, color: '#6B7280', marginTop: 1 },

  empty: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 10,
  },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: '#1F2937', marginTop: 4 },
  emptyText: { fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 19 },
  cta: { marginTop: 12, paddingVertical: 11, paddingHorizontal: 22, borderRadius: 99 },
  ctaTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  iconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 14, fontWeight: '700', color: '#1F2937' },
  rowSub: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  pill: { borderRadius: 99, paddingVertical: 4, paddingHorizontal: 10 },
  pillTxt: { fontSize: 11, fontWeight: '700' },
  dismissBtn: { padding: 4, marginLeft: 4 },

  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  testBtnTxt: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  tipBox: {
    marginTop: 16,
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  tipTitle: { fontSize: 13, fontWeight: '800', color: '#92400E', marginBottom: 8 },
  tipText: { fontSize: 12, color: '#92400E', lineHeight: 18 },
  tipBold: { fontWeight: '800' },
});
