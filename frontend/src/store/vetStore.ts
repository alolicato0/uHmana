import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { chat } from '../services/openrouter';
import type { ChatMessage } from '../types';

export interface MonitorItem {
  id: string;
  icon: string;
  label: string;
  createdAt: string;
}

export interface SymptomEntry {
  id: string;
  symptoms: string[];
  description: string;
  photoUri?: string;
  createdAt: string;
}

export interface VetMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: string;
}

const DEFAULT_MONITOR: MonitorItem[] = [
  { id: 'appetite', icon: '🍽️', label: 'Appetito ridotto', createdAt: '' },
  { id: 'limp', icon: '🦿', label: 'Zoppia persistente', createdAt: '' },
  { id: 'vomit', icon: '🤢', label: 'Vomito ricorrente', createdAt: '' },
  { id: 'behavior', icon: '😶', label: 'Cambiamento comportamento', createdAt: '' },
];

const VET_WELCOME: VetMessage = {
  id: 'vet-welcome',
  role: 'assistant',
  text: 'Ciao! Sono il tuo assistente veterinario AI 🐾\nDescrivi i sintomi del tuo animale o fai una domanda. Se rilevo qualcosa da tenere sott\'occhio lo aggiungo automaticamente alla lista "Da monitorare".',
  createdAt: new Date().toISOString(),
};

interface VetState {
  monitorItems: MonitorItem[];
  symptomHistory: SymptomEntry[];
  vetMessages: VetMessage[];
  vetSending: boolean;
  insightText: string;

  addMonitorItem: (item: Omit<MonitorItem, 'id' | 'createdAt'>) => void;
  removeMonitorItem: (id: string) => void;
  addSymptomEntry: (entry: Omit<SymptomEntry, 'id' | 'createdAt'>) => void;
  sendVetMessage: (
    text: string,
    opts: { getToken: () => Promise<string | null>; petName?: string },
  ) => Promise<void>;
  clearVetChat: () => void;
}

export const useVetStore = create<VetState>()(
  persist(
    (set, get) => ({
      monitorItems: DEFAULT_MONITOR,
      symptomHistory: [],
      vetMessages: [VET_WELCOME],
      vetSending: false,
      insightText: '',

      addMonitorItem: (item) =>
        set((s) => ({
          monitorItems: [
            ...s.monitorItems,
            { ...item, id: Date.now().toString(), createdAt: new Date().toISOString() },
          ],
        })),

      removeMonitorItem: (id) =>
        set((s) => ({ monitorItems: s.monitorItems.filter((m) => m.id !== id) })),

      addSymptomEntry: (entry) =>
        set((s) => ({
          symptomHistory: [
            { ...entry, id: Date.now().toString(), createdAt: new Date().toISOString() },
            ...s.symptomHistory,
          ],
        })),

      sendVetMessage: async (text, { getToken, petName = 'il tuo animale' }) => {
        const trimmed = text.trim();
        if (!trimmed) return;

        const userMsg: VetMessage = {
          id: `vu-${Date.now()}`,
          role: 'user',
          text: trimmed,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ vetMessages: [...s.vetMessages, userMsg], vetSending: true }));

        try {
          const token = await getToken();
          const history: ChatMessage[] = [...get().vetMessages, userMsg].map((m) => ({
            id: m.id,
            role: m.role,
            text: m.text,
            createdAt: m.createdAt,
          }));

          const reply = await chat({
            history,
            extraContext: `Sei un assistente veterinario AI specializzato. Parli del pet chiamato "${petName}". Rispondi sempre in italiano. Se rilevi una condizione che merita monitoraggio continuativo, inizia la risposta con il tag [MONITORA: <nome breve>] seguito dal testo normale.`,
            token,
          });

          const monitorMatch = reply.match(/\[MONITORA:\s*([^\]]+)\]/i);
          const cleanText = reply.replace(/\[MONITORA:[^\]]*\]\s*/gi, '').trim();

          const botMsg: VetMessage = {
            id: `va-${Date.now()}`,
            role: 'assistant',
            text: cleanText,
            createdAt: new Date().toISOString(),
          };

          const newMonitorItems = [...get().monitorItems];
          if (monitorMatch) {
            const label = monitorMatch[1].trim();
            const exists = newMonitorItems.some(
              (m) => m.label.toLowerCase() === label.toLowerCase(),
            );
            if (!exists) {
              newMonitorItems.push({
                id: `m-${Date.now()}`,
                icon: '🔍',
                label,
                createdAt: new Date().toISOString(),
              });
            }
          }

          set({
            vetMessages: [...get().vetMessages, botMsg],
            vetSending: false,
            insightText: cleanText.slice(0, 240),
            monitorItems: newMonitorItems,
          });
        } catch {
          set((s) => ({
            vetSending: false,
            vetMessages: [
              ...s.vetMessages,
              {
                id: `ve-${Date.now()}`,
                role: 'assistant',
                text: 'Errore di connessione. Riprova tra poco.',
                createdAt: new Date().toISOString(),
              },
            ],
          }));
        }
      },

      clearVetChat: () => set({ vetMessages: [VET_WELCOME], insightText: '' }),
    }),
    {
      name: 'vet-store',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

export function getFrequentSymptoms(history: SymptomEntry[], minCount = 3): string[] {
  const counts: Record<string, number> = {};
  for (const entry of history) {
    for (const s of entry.symptoms) {
      counts[s] = (counts[s] ?? 0) + 1;
    }
  }
  return Object.entries(counts)
    .filter(([, count]) => count >= minCount)
    .map(([s]) => s);
}
