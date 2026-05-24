import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

const ITEM_H = 52;

const MONTHS_IT = ['GEN', 'FEB', 'MAR', 'APR', 'MAG', 'GIU', 'LUG', 'AGO', 'SET', 'OTT', 'NOV', 'DIC'];

function daysInMonth(year: number, monthIdx: number): number {
  return new Date(year, monthIdx + 1, 0).getDate();
}

function Wheel({
  items,
  initialIndex,
  scrollRef,
  onIndexChange,
  width = 80,
}: {
  items: string[];
  initialIndex: number;
  scrollRef: React.RefObject<ScrollView | null>;
  onIndexChange: (i: number) => void;
  width?: number;
}) {
  const handleEnd = (e: { nativeEvent: { contentOffset: { y: number } } }) => {
    const i = Math.round(e.nativeEvent.contentOffset.y / ITEM_H);
    onIndexChange(Math.max(0, Math.min(items.length - 1, i)));
  };
  return (
    <View style={{ height: ITEM_H * 3, width, overflow: 'hidden' }}>
      <View style={styles.highlight} />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        nestedScrollEnabled
        contentContainerStyle={{ paddingVertical: ITEM_H }}
        onMomentumScrollEnd={handleEnd}
        onScrollEndDrag={handleEnd}
      >
        {items.map((item, i) => (
          <View key={i} style={{ height: ITEM_H, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={styles.item}>{item}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

export function DateWheelModal({
  visible,
  value,
  onConfirm,
  onClose,
  accent = colors.primary,
  title = 'Scegli data',
  minYear,
  maxYear,
}: {
  visible: boolean;
  /** ISO date YYYY-MM-DD; se vuoto parte da oggi */
  value: string;
  onConfirm: (isoDate: string) => void;
  onClose: () => void;
  accent?: string;
  title?: string;
  minYear?: number;
  maxYear?: number;
}) {
  const today = new Date();
  const yMin = minYear ?? today.getFullYear() - 25;
  const yMax = maxYear ?? today.getFullYear() + 10;
  const years = useMemo(
    () => Array.from({ length: yMax - yMin + 1 }, (_, i) => String(yMin + i)),
    [yMin, yMax],
  );

  const [day, setDay] = useState(today.getDate());
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());

  const dayRef = useRef<ScrollView>(null);
  const monthRef = useRef<ScrollView>(null);
  const yearRef = useRef<ScrollView>(null);

  const dayItems = useMemo(
    () => Array.from({ length: daysInMonth(year, month) }, (_, i) => String(i + 1).padStart(2, '0')),
    [year, month],
  );

  useEffect(() => {
    if (!visible) return;
    let d = today.getDate();
    let m = today.getMonth();
    let y = today.getFullYear();
    if (value) {
      const parsed = new Date(value);
      if (!isNaN(parsed.getTime())) {
        d = parsed.getDate();
        m = parsed.getMonth();
        y = parsed.getFullYear();
      }
    }
    y = Math.max(yMin, Math.min(yMax, y));
    setDay(d);
    setMonth(m);
    setYear(y);
    const t = setTimeout(() => {
      dayRef.current?.scrollTo({ y: (d - 1) * ITEM_H, animated: false });
      monthRef.current?.scrollTo({ y: m * ITEM_H, animated: false });
      yearRef.current?.scrollTo({ y: (y - yMin) * ITEM_H, animated: false });
    }, 60);
    return () => clearTimeout(t);
  }, [visible, value]);

  // Se il giorno selezionato eccede i giorni del mese/anno, clamp
  useEffect(() => {
    const max = daysInMonth(year, month);
    if (day > max) {
      setDay(max);
      setTimeout(() => dayRef.current?.scrollTo({ y: (max - 1) * ITEM_H, animated: true }), 30);
    }
  }, [year, month]);

  const confirm = () => {
    const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onConfirm(iso);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.row}>
            <Wheel
              items={dayItems}
              initialIndex={day - 1}
              scrollRef={dayRef}
              onIndexChange={(i) => setDay(i + 1)}
              width={72}
            />
            <Wheel
              items={MONTHS_IT}
              initialIndex={month}
              scrollRef={monthRef}
              onIndexChange={setMonth}
              width={90}
            />
            <Wheel
              items={years}
              initialIndex={year - yMin}
              scrollRef={yearRef}
              onIndexChange={(i) => setYear(yMin + i)}
              width={96}
            />
          </View>
          <Pressable style={[styles.btn, { backgroundColor: accent }]} onPress={confirm}>
            <Text style={styles.btnTxt}>Conferma</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  highlight: {
    position: 'absolute',
    top: ITEM_H,
    left: 4,
    right: 4,
    height: ITEM_H,
    backgroundColor: '#EEF2FF',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  item: { fontSize: 26, fontWeight: '800', color: colors.ink },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: { backgroundColor: '#fff', borderRadius: 24, padding: 22, width: '100%', alignItems: 'center' },
  title: { fontSize: 17, fontWeight: '800', color: colors.ink, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  btn: { marginTop: 16, borderRadius: 99, paddingVertical: 13, paddingHorizontal: 40, alignSelf: 'stretch', alignItems: 'center' },
  btnTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
