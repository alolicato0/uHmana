import { create } from 'zustand';
import type { HealthProfile, ProfileKind } from '../types';
import {
  createProfile,
  deleteProfile,
  fetchProfiles,
  updateProfile,
} from '../services/profiles';

type GetToken = () => Promise<string | null>;

interface ProfileState {
  profiles: HealthProfile[];
  loading: boolean;
  activeKind: ProfileKind;
  setActiveKind: (k: ProfileKind) => void;
  load: (getToken: GetToken) => Promise<void>;
  upsert: (p: HealthProfile, getToken: GetToken) => Promise<void>;
  remove: (id: string, getToken: GetToken) => Promise<void>;
  getActiveProfile: () => HealthProfile | undefined;
}

const isMongoId = (id: string) => /^[a-f\d]{24}$/i.test(id);

export const useProfileStore = create<ProfileState>((set, get) => ({
  profiles: [],
  loading: false,
  activeKind: 'human',

  setActiveKind: (k) => set({ activeKind: k }),

  load: async (getToken) => {
    set({ loading: true });
    try {
      const token = await getToken();
      const profiles = await fetchProfiles(token);
      set({ profiles, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  upsert: async (p, getToken) => {
    const token = await getToken();
    if (isMongoId(p.id)) {
      const { id, ...rest } = p;
      const updated = await updateProfile(id, rest, token);
      set((s) => ({
        profiles: s.profiles.map((x) => (x.id === id ? updated : x)),
      }));
    } else {
      const { id: _ignored, ...rest } = p;
      const created = await createProfile(rest, token);
      set((s) => ({ profiles: [...s.profiles, created] }));
    }
  },

  remove: async (id, getToken) => {
    const token = await getToken();
    await deleteProfile(id, token);
    set((s) => ({ profiles: s.profiles.filter((p) => p.id !== id) }));
  },

  getActiveProfile: () => {
    const s = get();
    return s.profiles.find((p) => p.kind === s.activeKind) ?? s.profiles[0];
  },
}));
