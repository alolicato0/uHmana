import { create } from 'zustand';
import type { Reminder } from '../types';
import {
  createReminder,
  deleteReminder,
  fetchReminders,
  updateReminder,
} from '../services/reminders';

type GetToken = () => Promise<string | null>;

interface RemindersState {
  reminders: Reminder[];
  loading: boolean;
  load: (getToken: GetToken) => Promise<void>;
  add: (r: Omit<Reminder, 'id'>, getToken: GetToken) => Promise<void>;
  update: (id: string, r: Partial<Omit<Reminder, 'id'>>, getToken: GetToken) => Promise<void>;
  remove: (id: string, getToken: GetToken) => Promise<void>;
}

export const useRemindersStore = create<RemindersState>((set) => ({
  reminders: [],
  loading: false,

  load: async (getToken) => {
    set({ loading: true });
    try {
      const token = await getToken();
      const reminders = await fetchReminders(token);
      set({ reminders, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  add: async (r, getToken) => {
    const token = await getToken();
    const created = await createReminder(r, token);
    set((s) => ({ reminders: [created, ...s.reminders] }));
  },

  update: async (id, r, getToken) => {
    const token = await getToken();
    const updated = await updateReminder(id, r, token);
    set((s) => ({
      reminders: s.reminders.map((x) => (x.id === id ? updated : x)),
    }));
  },

  remove: async (id, getToken) => {
    const token = await getToken();
    await deleteReminder(id, token);
    set((s) => ({ reminders: s.reminders.filter((r) => r.id !== id) }));
  },
}));
