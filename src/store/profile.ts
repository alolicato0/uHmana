import { create } from 'zustand';
import type { HealthProfile, ProfileKind } from '../types';

interface ProfileState {
  profiles: HealthProfile[];
  activeKind: ProfileKind;
  setActiveKind: (k: ProfileKind) => void;
  upsert: (p: HealthProfile) => void;
  remove: (id: string) => void;
  getActiveProfile: () => HealthProfile | undefined;
}

const seed: HealthProfile[] = [
  {
    id: 'human-1',
    name: 'Martina Rossi',
    kind: 'human',
    bloodGroup: 'A+',
    allergies: ['Penicillina'],
    conditions: ['Asma lieve'],
    currentTherapies: ['Ibuprofene 400mg al bisogno'],
  },
  {
    id: 'pet-1',
    name: 'Luna',
    kind: 'pet',
    species: 'Cane',
    breed: 'Golden Retriever',
    weightKg: 28.5,
    allergies: [],
    conditions: [],
    currentTherapies: [],
  },
];

export const useProfileStore = create<ProfileState>((set, get) => ({
  profiles: seed,
  activeKind: 'human',
  setActiveKind: (k) => set({ activeKind: k }),
  upsert: (p) =>
    set((s) => {
      const i = s.profiles.findIndex((x) => x.id === p.id);
      const next = [...s.profiles];
      if (i === -1) next.push(p);
      else next[i] = p;
      return { profiles: next };
    }),
  remove: (id) =>
    set((s) => ({ profiles: s.profiles.filter((p) => p.id !== id) })),
  getActiveProfile: () => {
    const s = get();
    return s.profiles.find((p) => p.kind === s.activeKind) ?? s.profiles[0];
  },
}));
