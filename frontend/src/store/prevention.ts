import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { rescheduleAllPrevention } from '../services/preventionNotifications';

export interface Vaccine {
  id: string;
  name: string;
  date: string;
  nextDate?: string;
  lot?: string;
  vet?: string;
  notes?: string;
  memberId?: string;
}

export interface Antiparasitic {
  id: string;
  name: string;
  type: 'pulci_zecche' | 'filaria' | 'vermi' | 'generico';
  dateApplied: string;
  nextDate: string;
  notes?: string;
  memberId?: string;
}

export interface PreventiveCheck {
  id: string;
  name: string;
  date: string;
  nextDate?: string;
  vet?: string;
  notes?: string;
  memberId?: string;
}

interface PreventionState {
  vaccines: Vaccine[];
  antiparasitics: Antiparasitic[];
  checks: PreventiveCheck[];
  addVaccine: (v: Omit<Vaccine, 'id'>) => void;
  updateVaccine: (id: string, v: Omit<Vaccine, 'id'>) => void;
  removeVaccine: (id: string) => void;
  addAntiparasitic: (a: Omit<Antiparasitic, 'id'>) => void;
  updateAntiparasitic: (id: string, a: Omit<Antiparasitic, 'id'>) => void;
  removeAntiparasitic: (id: string) => void;
  addCheck: (c: Omit<PreventiveCheck, 'id'>) => void;
  updateCheck: (id: string, c: Omit<PreventiveCheck, 'id'>) => void;
  removeCheck: (id: string) => void;
  updateVaccineNotes: (id: string, notes: string) => void;
  updateAntiparasiticNotes: (id: string, notes: string) => void;
  updateCheckNotes: (id: string, notes: string) => void;
  syncNotifications: () => Promise<void>;
}

const genId = () => Math.random().toString(36).slice(2);

async function syncFrom(state: Pick<PreventionState, 'vaccines' | 'antiparasitics' | 'checks'>) {
  try {
    await rescheduleAllPrevention(state.vaccines, state.antiparasitics, state.checks);
  } catch {
    // ignore notification failures
  }
}

export const usePreventionStore = create<PreventionState>()(
  persist(
    (set, get) => ({
      vaccines: [],
      antiparasitics: [],
      checks: [],

      addVaccine: (v) => {
        set((s) => ({ vaccines: [{ ...v, id: genId() }, ...s.vaccines] }));
        void syncFrom(get());
      },

      updateVaccine: (id, v) => {
        set((s) => ({ vaccines: s.vaccines.map((x) => (x.id === id ? { ...v, id } : x)) }));
        void syncFrom(get());
      },

      removeVaccine: (id) => {
        set((s) => ({ vaccines: s.vaccines.filter((v) => v.id !== id) }));
        void syncFrom(get());
      },

      addAntiparasitic: (a) => {
        set((s) => ({ antiparasitics: [{ ...a, id: genId() }, ...s.antiparasitics] }));
        void syncFrom(get());
      },

      updateAntiparasitic: (id, a) => {
        set((s) => ({ antiparasitics: s.antiparasitics.map((x) => (x.id === id ? { ...a, id } : x)) }));
        void syncFrom(get());
      },

      removeAntiparasitic: (id) => {
        set((s) => ({ antiparasitics: s.antiparasitics.filter((a) => a.id !== id) }));
        void syncFrom(get());
      },

      addCheck: (c) => {
        set((s) => ({ checks: [{ ...c, id: genId() }, ...s.checks] }));
        void syncFrom(get());
      },

      updateCheck: (id, c) => {
        set((s) => ({ checks: s.checks.map((x) => (x.id === id ? { ...c, id } : x)) }));
        void syncFrom(get());
      },

      removeCheck: (id) => {
        set((s) => ({ checks: s.checks.filter((c) => c.id !== id) }));
        void syncFrom(get());
      },

      updateVaccineNotes: (id, notes) => {
        set((s) => ({
          vaccines: s.vaccines.map((v) => (v.id === id ? { ...v, notes } : v)),
        }));
      },

      updateAntiparasiticNotes: (id, notes) => {
        set((s) => ({
          antiparasitics: s.antiparasitics.map((a) => (a.id === id ? { ...a, notes } : a)),
        }));
      },

      updateCheckNotes: (id, notes) => {
        set((s) => ({
          checks: s.checks.map((c) => (c.id === id ? { ...c, notes } : c)),
        }));
      },

      syncNotifications: async () => {
        await syncFrom(get());
      },
    }),
    {
      name: 'uhmana-prevention',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
