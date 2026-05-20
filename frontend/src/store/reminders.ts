import { create } from 'zustand';
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
}

async function syncNotifications(reminders: Reminder[]) {
  try {
    await rescheduleAll(reminders);
  } catch {
    // ignore notification failures
  }
}

export const useRemindersStore = create<RemindersState>((set, get) => ({
  reminders: [],
  loading: false,

  load: async (getToken) => {
    set({ loading: true });
    try {
      const token = await getToken();
      const reminders = await fetchReminders(token);
      set({ reminders, loading: false });
      await syncNotifications(reminders);
    } catch {
      set({ loading: false });
    }
  },

  add: async (r, getToken) => {
    const token = await getToken();
    const created = await createReminder(r, token);
    const reminders = [created, ...get().reminders];
    set({ reminders });
    await syncNotifications(reminders);
  },

  update: async (id, r, getToken) => {
    const token = await getToken();
    const updated = await updateReminder(id, r, token);
    const reminders = get().reminders.map((x) => (x.id === id ? updated : x));
    set({ reminders });
    await syncNotifications(reminders);
  },

  remove: async (id, getToken) => {
    const token = await getToken();
    await deleteReminder(id, token);
    const reminders = get().reminders.filter((r) => r.id !== id);
    set({ reminders });
    await syncNotifications(reminders);
  },
}));
