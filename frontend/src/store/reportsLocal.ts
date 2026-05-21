import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type ReportStatus = 'ok' | 'warning' | 'critical';

export interface ReportValue {
  label: string;
  value: string;
  unit: string;
  status: ReportStatus;
}

export interface ReportDoc {
  id: string;
  name: string;
  type: 'pdf' | 'image';
  category: string;
  date: string;       // YYYY-MM-DD
  aiSummary: string;
  aiBullets: string[];
  values: ReportValue[];
  fileUri?: string;
}

interface ReportsLocalState {
  docs: ReportDoc[];
  add: (d: Omit<ReportDoc, 'id'>) => void;
  remove: (id: string) => void;
}

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export const useReportsLocalStore = create<ReportsLocalState>()(
  persist(
    (set) => ({
      docs: [],
      add: (d) => set((s) => ({ docs: [{ ...d, id: uid() }, ...s.docs] })),
      remove: (id) => set((s) => ({ docs: s.docs.filter((x) => x.id !== id) })),
    }),
    { name: 'uhmana-reports-v1', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
