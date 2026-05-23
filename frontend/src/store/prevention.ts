import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface Vaccine {
  id: string;
  name: string;
  date: string;
  nextDate?: string;
  lot?: string;
  vet?: string;
  notes?: string;
}

export interface Antiparasitic {
  id: string;
  name: string;
  type: 'pulci_zecche' | 'filaria' | 'vermi' | 'generico';
  dateApplied: string;
  nextDate: string;
  notes?: string;
}

export interface PreventiveCheck {
  id: string;
  name: string;
  date: string;
  nextDate?: string;
  vet?: string;
  notes?: string;
}

interface PreventionState {
  vaccines: Vaccine[];
  antiparasitics: Antiparasitic[];
  checks: PreventiveCheck[];
  addVaccine: (v: Omit<Vaccine, 'id'>) => void;
  removeVaccine: (id: string) => void;
  addAntiparasitic: (a: Omit<Antiparasitic, 'id'>) => void;
  removeAntiparasitic: (id: string) => void;
  addCheck: (c: Omit<PreventiveCheck, 'id'>) => void;
  removeCheck: (id: string) => void;
}

const genId = () => Math.random().toString(36).slice(2);

export const usePreventionStore = create<PreventionState>()(
  persist(
    (set) => ({
      vaccines: [],
      antiparasitics: [],
      checks: [],

      addVaccine: (v) =>
        set((s) => ({ vaccines: [{ ...v, id: genId() }, ...s.vaccines] })),

      removeVaccine: (id) =>
        set((s) => ({ vaccines: s.vaccines.filter((v) => v.id !== id) })),

      addAntiparasitic: (a) =>
        set((s) => ({ antiparasitics: [{ ...a, id: genId() }, ...s.antiparasitics] })),

      removeAntiparasitic: (id) =>
        set((s) => ({ antiparasitics: s.antiparasitics.filter((a) => a.id !== id) })),

      addCheck: (c) =>
        set((s) => ({ checks: [{ ...c, id: genId() }, ...s.checks] })),

      removeCheck: (id) =>
        set((s) => ({ checks: s.checks.filter((c) => c.id !== id) })),
    }),
    {
      name: 'uhmana-prevention',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
