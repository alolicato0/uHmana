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
  stress: number;    // 0-100 — livello di Relax/Calma (100 = massimo relax)
}

interface SymptomsState {
  logs: SymptomLog[];
  wellness: DailyWellness | null;
  ownerId: string | null;
  addLog: (log: Omit<SymptomLog, 'id' | 'date'>) => void;
  updateLog: (id: string, patch: Partial<Omit<SymptomLog, 'id' | 'date'>>) => void;
  removeLog: (id: string) => void;
  clearAll: () => void;
  setOwner: (id: string) => void;
  setWellness: (entry: Omit<DailyWellness, 'date'>) => void;
  getHealthScore: () => number;
  getTodayLogs: () => SymptomLog[];
  getRecentLogs: (n?: number) => SymptomLog[];
  getWeekTrend: () => number[];
}

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// Funzione pura esportata — usabile fuori dallo store (home, sintomi, ecc.)
export function computeHealthScore(logs: SymptomLog[], wellness: DailyWellness | null): number {
  let base = 75;
  if (wellness) {
    base = (wellness.sleep + wellness.hydration + wellness.energy + wellness.mood + wellness.stress) / 5;
  }
  const recent = logs.filter((l) => (Date.now() - new Date(l.date).getTime()) / 86_400_000 <= 3);
  let penalty = 0;
  if (recent.length) {
    penalty = (recent.reduce((a, l) => a + l.intensity, 0) / recent.length) * 2.5;
  }
  return Math.max(0, Math.min(100, Math.round(base - penalty)));
}

export const useSymptomsStore = create<SymptomsState>()(
  persist(
    (set, get) => ({
      logs: [],
      wellness: null,
      ownerId: null,

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

      clearAll: () => {
        set({ logs: [], wellness: null, ownerId: null });
      },

      setOwner: (id) => set({ ownerId: id }),

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
        return computeHealthScore(logs, wellness);
      },
    }),
    {
      name: 'uhmana-symptoms-v1',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
