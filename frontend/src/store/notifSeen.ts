import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface NotifSeenState {
  seenIds: string[];
  markSeen: (ids: string[]) => void;
  reset: () => void;
}

export const useNotifSeenStore = create<NotifSeenState>()(
  persist(
    (set, get) => ({
      seenIds: [],
      markSeen: (ids) => {
        const current = new Set(get().seenIds);
        for (const id of ids) current.add(id);
        set({ seenIds: Array.from(current) });
      },
      reset: () => set({ seenIds: [] }),
    }),
    { name: 'uhmana-notif-seen', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
