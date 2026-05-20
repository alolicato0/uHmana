import { create } from 'zustand';
import type { TimelineEvent } from '../types';
import { eventTypeLabels } from '../types';
import { createEvent, deleteEvent, fetchTimeline } from '../services/timeline';

type GetToken = () => Promise<string | null>;

interface TimelineState {
  events: TimelineEvent[];
  loading: boolean;
  load: (getToken: GetToken) => Promise<void>;
  add: (e: Omit<TimelineEvent, 'id'>, getToken: GetToken) => Promise<void>;
  remove: (id: string, getToken: GetToken) => Promise<void>;
  contextSummary: (max?: number) => string;
}

export const useTimelineStore = create<TimelineState>((set, get) => ({
  events: [],
  loading: false,

  load: async (getToken) => {
    set({ loading: true });
    try {
      const token = await getToken();
      const events = await fetchTimeline(token);
      set({ events, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  add: async (e, getToken) => {
    const token = await getToken();
    const created = await createEvent(e, token);
    set((s) => ({
      events: [created, ...s.events].sort((a, b) => b.date.localeCompare(a.date)),
    }));
  },

  remove: async (id, getToken) => {
    const token = await getToken();
    await deleteEvent(id, token);
    set((s) => ({ events: s.events.filter((e) => e.id !== id) }));
  },

  contextSummary: (max = 10) => {
    const items = get().events.slice(0, max);
    if (items.length === 0) return 'Nessun evento clinico registrato.';
    const lines = items.map(
      (e) =>
        `- ${e.date.slice(0, 10)} · ${eventTypeLabels[e.type]}: ${e.title}` +
        (e.description ? ` — ${e.description}` : ''),
    );
    return `Ultimi eventi salute dell'utente:\n${lines.join('\n')}`;
  },
}));
