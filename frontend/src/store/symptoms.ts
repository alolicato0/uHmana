import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type SymptomDuration = 'today' | '3days' | 'week' | 'longer';

export interface SymptomLog {
  id: string;
  name: string;
  emoji: string;
  intensity: number; // 1-10
  duration: SymptomDuration;
  date: string; // ISO
  notes: string;
}

export interface DailyWellness {
  date: string; // YYYY-MM-DD
  sleep: number;     // 0-100
  hydration: number; // 0-100
  energy: number;    // 0-100
  mood: number;      // 0-100
  stress: number;    // 0-100 (100 = massimo stress)
}

interface SymptomsState {
  logs: SymptomLog[];
  wellness: DailyWellness | null;
  addLog: (log: Omit<SymptomLog, 'id' | 'date'>) => void;
  updateLog: (id: string, patch: Partial<Omit<SymptomLog, 'id' | 'date'>>) => void;
  removeLog: (id: string) => void;
  setWellness: (entry: Omit<DailyWellness, 'date'>) => void;
  getHealthScore: () => number;
  getTodayLogs: () => SymptomLog[];
  getRecentLogs: (n?: number) => SymptomLog[];
  getWeekTrend: () => number[]; // 7 valori 0-10 (media intensità per giorno)
}

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export const useSymptomsStore = create<SymptomsState>()(
  persist(
    (set, get) => ({
      logs: [],
      wellness: null,

      addLog: (log) => {
        set((s) => ({
          logs: [{ ...log, id: uid(), date: new Date().toISOString() }, ...s.logs],
        }));
      },

      updateLog: (id, patch) => {
        set((s) => ({
          logs: s.logs.map((l) => (l.id === id ? { ...l, ...patch } : l)),
        }));
      },

      removeLog: (id) => {
        set((s) => ({ logs: s.logs.filter((l) => l.id !== id) }));
      },

      setWellness: (entry) => {
        set({ wellness: { ...entry, date: today() } });
      },

      getTodayLogs: () => {
        const t = today();
        return get().logs.filter((l) => l.date.startsWith(t));
      },

      getRecentLogs: (n = 10) => get().logs.slice(0, n),

      getWeekTrend: () => {
        const days: number[] = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const key = d.toISOString().slice(0, 10);
          const dayLogs = get().logs.filter((l) => l.date.startsWith(key));
          const avg = dayLogs.length
            ? dayLogs.reduce((a, l) => a + l.intensity, 0) / dayLogs.length
            : 0;
          days.push(avg);
        }
        return days;
      },

      getHealthScore: () => {
        const { logs, wellness } = get();
        let score = 82;

        const recent = logs.filter((l) => {
          const daysAgo = (Date.now() - new Date(l.date).getTime()) / 86_400_000;
          return daysAgo <= 3;
        });
        if (recent.length) {
          const avg = recent.reduce((a, l) => a + l.intensity, 0) / recent.length;
          score -= avg * 4;
        }

        if (wellness) {
          const w =
            (wellness.sleep + wellness.hydration + wellness.energy + wellness.mood + (100 - wellness.stress)) /
            5;
          score = score * 0.55 + w * 0.45;
        }

        return Math.max(10, Math.min(100, Math.round(score)));
      },
    }),
    {
      name: 'uhmana-symptoms-v1',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
