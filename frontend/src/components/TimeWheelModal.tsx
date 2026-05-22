import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

const ITEM_H = 52;
const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

function Wheel({
  items,
  scrollRef,
  onIndexChange,
}: {
  items: string[];
  scrollRef: React.RefObject<ScrollView | null>;
  onIndexChange: (i: number) => void;
}) {
  const handleEnd = (e: { nativeEvent: { contentOffset: { y: number } } }) => {
    const i = Math.round(e.nativeEvent.contentOffset.y / ITEM_H);
    onIndexChange(Math.max(0, Math.min(items.length - 1, i)));
  };
  return (
    <View style={{ height: ITEM_H * 3, width: 80, overflow: 'hidden' }}>
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

export function TimeWheelModal({
  visible,
  value,
  onConfirm,
  onClose,
  accent = colors.primary,
}: {
  visible: boolean;
  value: string; // HH:MM
  onConfirm: (time: string) => void;
  onClose: () => void;
  accent?: string;
}) {
  const [pickH, setPickH] = useState(8);
  const [pickM, setPickM] = useState(0);
  const hourRef = useRef<ScrollView>(null);
  const minRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!visible) return;
    const [h, m] = value.split(':').map(Number);
    const roundedM = m - (m % 5);
    setPickH(h);
    setPickM(roundedM);
    const t = setTimeout(() => {
      hourRef.current?.scrollTo({ y: h * ITEM_H, animated: false });
      minRef.current?.scrollTo({ y: (roundedM / 5) * ITEM_H, animated: false });
    }, 60);
    return () => clearTimeout(t);
  }, [visible, value]);

  const confirm = () => {
    onConfirm(`${String(pickH).padStart(2, '0')}:${String(pickM).padStart(2, '0')}`);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.card}>
          <Text style={styles.title}>Scegli orario</Text>
          <View style={styles.row}>
            <Wheel items={HOURS} scrollRef={hourRef} onIndexChange={setPickH} />
            <Text style={styles.colon}>:</Text>
            <Wheel items={MINUTES} scrollRef={minRef} onIndexChange={(i) => setPickM(i * 5)} />
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
    backgroundColor: '#E6FAF8',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  item: { fontSize: 34, fontWeight: '800', color: colors.ink },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: { backgroundColor: '#fff', borderRadius: 24, padding: 22, width: '100%', alignItems: 'center' },
  title: { fontSize: 17, fontWeight: '800', color: colors.ink, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  colon: { fontSize: 34, fontWeight: '800', color: colors.ink, marginHorizontal: 8 },
  btn: { marginTop: 16, borderRadius: 99, paddingVertical: 13, paddingHorizontal: 40, alignSelf: 'stretch', alignItems: 'center' },
  btnTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
