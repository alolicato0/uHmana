import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type DoseAction = 'taken' | 'skipped' | 'postponed';

export interface DoseRecord {
  reminderId: string;
  date: string;     // YYYY-MM-DD
  timeSlot: string; // HH:MM
  action: DoseAction;
  at: string;       // ISO timestamp
}

interface DoseState {
  records: DoseRecord[];
  logDose: (r: Omit<DoseRecord, 'at'>) => void;
  getWeekAdherence: (dailyMedCount: number) => number;
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const useDoseStore = create<DoseState>()(
  persist(
    (set, get) => ({
      records: [],
      logDose: (r) => {
        set((s) => {
          const others = s.records.filter(
            (x) => !(x.reminderId === r.reminderId && x.date === r.date && x.timeSlot === r.timeSlot),
          );
          return { records: [...others, { ...r, at: new Date().toISOString() }] };
        });
      },
      getWeekAdherence: (dailyMedCount) => {
        if (dailyMedCount === 0) return 100;
        const now = new Date();
        let total = 0;
        let taken = 0;
        for (let i = 0; i < 7; i++) {
          const d = new Date(now);
          d.setDate(now.getDate() - i);
          const key = dateKey(d);
          const dayRecs = get().records.filter((r) => r.date === key);
          total += dailyMedCount;
          taken += dayRecs.filter((r) => r.action === 'taken').length;
        }
        return Math.round((taken / total) * 100);
      },
    }),
    { name: 'uhmana-doses-v1', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
