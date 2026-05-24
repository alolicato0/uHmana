import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type PetSpecies = 'cane' | 'gatto';

export interface HumanMember {
  id: string;
  name: string;
  createdAt: string;
}

export interface PetMember {
  id: string;
  name: string;
  species: PetSpecies;
  createdAt: string;
}

export type MemberKind = 'human' | 'pet';

interface MembersState {
  humans: HumanMember[];
  pets: PetMember[];
  activeHumanId: string | null;
  activePetId: string | null;

  addHuman: (name: string) => string;
  addPet: (name: string, species: PetSpecies) => string;
  removeHuman: (id: string) => void;
  removePet: (id: string) => void;
  renameHuman: (id: string, name: string) => void;
  renamePet: (id: string, name: string) => void;
  setActiveHuman: (id: string | null) => void;
  setActivePet: (id: string | null) => void;

  getActive: (kind: MemberKind) => HumanMember | PetMember | null;
  getMembers: (kind: MemberKind) => (HumanMember | PetMember)[];
  hasMultiple: (kind: MemberKind) => boolean;
}

export const useMembersStore = create<MembersState>()(
  persist(
    (set, get) => ({
      humans: [],
      pets: [],
      activeHumanId: null,
      activePetId: null,

      addHuman: (name) => {
        const id = `h-${Date.now()}`;
        const member: HumanMember = { id, name: name.trim(), createdAt: new Date().toISOString() };
        set((s) => ({
          humans: [...s.humans, member],
          activeHumanId: s.activeHumanId ?? id,
        }));
        return id;
      },

      addPet: (name, species) => {
        const id = `p-${Date.now()}`;
        const member: PetMember = { id, name: name.trim(), species, createdAt: new Date().toISOString() };
        set((s) => ({
          pets: [...s.pets, member],
          activePetId: s.activePetId ?? id,
        }));
        return id;
      },

      removeHuman: (id) => {
        set((s) => {
          const humans = s.humans.filter((h) => h.id !== id);
          const activeHumanId = s.activeHumanId === id ? (humans[0]?.id ?? null) : s.activeHumanId;
          return { humans, activeHumanId };
        });
      },

      removePet: (id) => {
        set((s) => {
          const pets = s.pets.filter((p) => p.id !== id);
          const activePetId = s.activePetId === id ? (pets[0]?.id ?? null) : s.activePetId;
          return { pets, activePetId };
        });
      },

      renameHuman: (id, name) =>
        set((s) => ({ humans: s.humans.map((h) => (h.id === id ? { ...h, name: name.trim() } : h)) })),
      renamePet: (id, name) =>
        set((s) => ({ pets: s.pets.map((p) => (p.id === id ? { ...p, name: name.trim() } : p)) })),

      setActiveHuman: (id) => set({ activeHumanId: id }),
      setActivePet: (id) => set({ activePetId: id }),

      getActive: (kind) => {
        const s = get();
        if (kind === 'human') {
          return s.humans.find((h) => h.id === s.activeHumanId) ?? s.humans[0] ?? null;
        }
        return s.pets.find((p) => p.id === s.activePetId) ?? s.pets[0] ?? null;
      },

      getMembers: (kind) => (kind === 'human' ? get().humans : get().pets),

      hasMultiple: (kind) => (kind === 'human' ? get().humans.length >= 2 : get().pets.length >= 2),
    }),
    {
      name: 'members-store',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

export const SPECIES_EMOJI: Record<PetSpecies, string> = {
  cane: '🐕',
  gatto: '🐈',
};

export const HUMAN_EMOJI = '👤';

export function memberEmoji(m: HumanMember | PetMember | null | undefined): string {
  if (!m) return HUMAN_EMOJI;
  if ('species' in m) return SPECIES_EMOJI[m.species];
  return HUMAN_EMOJI;
}
