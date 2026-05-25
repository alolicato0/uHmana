import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { rescheduleAll } from '../services/notifications';
import {
  createReminder,
  deleteReminder,
  fetchReminders,
  updateReminder,
} from '../services/reminders';
import type { Reminder } from '../types';

type GetToken = () => Promise<string | null>;

interface RemindersState {
  reminders: Reminder[];
  loading: boolean;
  load: (getToken: GetToken) => Promise<void>;
  add: (r: Omit<Reminder, 'id'>, getToken: GetToken) => Promise<void>;
  update: (id: string, r: Partial<Omit<Reminder, 'id'>>, getToken: GetToken) => Promise<void>;
  remove: (id: string, getToken: GetToken) => Promise<void>;
  setLocalStatus: (id: string, status: 'done' | 'not_done' | 'postponed', postponedUntil?: string) => void;
}

async function syncNotifications(reminders: Reminder[]) {
  try {
    await rescheduleAll(reminders);
  } catch {
    // ignore notification failures
  }
}

const LOCAL_PREFIX = 'local_';
const genLocalId = () => `${LOCAL_PREFIX}${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export const useRemindersStore = create<RemindersState>()(
  persist(
    (set, get) => ({
      reminders: [],
      loading: false,

      load: async (getToken) => {
        set({ loading: true });
        try {
          const token = await getToken();
          const remote = await fetchReminders(token);
          // Keep local-only reminders (created while offline) and merge with remote
          const localOnly = get().reminders.filter((r) => r.id.startsWith(LOCAL_PREFIX));
          const reminders = [...localOnly, ...remote];
          set({ reminders, loading: false });
          await syncNotifications(reminders);
        } catch {
          // Backend unreachable: keep current (persisted) reminders
          set({ loading: false });
          await syncNotifications(get().reminders);
        }
      },

      add: async (r, getToken) => {
        let created: Reminder;
        try {
          const token = await getToken();
          created = await createReminder(r, token);
        } catch {
          // Offline / backend unreachable → create local-only
          created = { ...r, id: genLocalId() };
        }
        const reminders = [created, ...get().reminders];
        set({ reminders });
        await syncNotifications(reminders);
      },

      update: async (id, r, getToken) => {
        if (id.startsWith(LOCAL_PREFIX)) {
          const reminders = get().reminders.map((x) => (x.id === id ? { ...x, ...r } : x));
          set({ reminders });
          await syncNotifications(reminders);
          return;
        }
        try {
          const token = await getToken();
          const updated = await updateReminder(id, r, token);
          const reminders = get().reminders.map((x) => (x.id === id ? updated : x));
          set({ reminders });
          await syncNotifications(reminders);
        } catch {
          // Offline → update locally
          const reminders = get().reminders.map((x) => (x.id === id ? { ...x, ...r } : x));
          set({ reminders });
          await syncNotifications(reminders);
        }
      },

      remove: async (id, getToken) => {
        if (!id.startsWith(LOCAL_PREFIX)) {
          try {
            const token = await getToken();
            await deleteReminder(id, token);
          } catch {
            // ignore — remove locally anyway
          }
        }
        const reminders = get().reminders.filter((r) => r.id !== id);
        set({ reminders });
        await syncNotifications(reminders);
      },

      setLocalStatus: (id, status, postponedUntil) => {
        set((s) => ({
          reminders: s.reminders.map((r) => r.id === id ? { ...r, status, postponedUntil } : r),
        }));
      },
    }),
    {
      name: 'uhmana-reminders',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ reminders: s.reminders }),
    },
  ),
);
