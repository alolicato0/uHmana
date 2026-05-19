import { create } from 'zustand';
import type { TimelineEvent } from '../types';
import { eventTypeLabels } from '../types';

interface TimelineState {
  events: TimelineEvent[];
  add: (e: TimelineEvent) => void;
  remove: (id: string) => void;
  contextSummary: (max?: number) => string;
}

const now = Date.now();
const iso = (offsetMs: number) => new Date(now - offsetMs).toISOString();

const seed: TimelineEvent[] = [
  {
    id: 't1',
    profileId: 'self',
    type: 'symptom',
    title: 'Eruzione cutanea',
    description: 'Comparsa sulla gamba destra, prurito lieve.',
    date: iso(1000 * 60 * 60 * 4),
  },
  {
    id: 't2',
    profileId: 'self',
    type: 'medication',
    title: 'Ibuprofene 400mg',
    description: 'Assunto al bisogno.',
    date: iso(1000 * 60 * 60 * 24),
  },
  {
    id: 't3',
    profileId: 'self',
    type: 'symptom',
    title: 'Mal di testa',
    date: iso(1000 * 60 * 60 * 24 * 3),
  },
  {
    id: 't4',
    profileId: 'self',
    type: 'visit',
    title: 'Visita di controllo',
    description: 'Dott. Rossi',
    date: iso(1000 * 60 * 60 * 24 * 19),
  },
];

export const useTimelineStore = create<TimelineState>((set, get) => ({
  events: seed,
  add: (e) =>
    set((s) => ({
      events: [e, ...s.events].sort((a, b) => b.date.localeCompare(a.date)),
    })),
  remove: (id) =>
    set((s) => ({ events: s.events.filter((e) => e.id !== id) })),
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
