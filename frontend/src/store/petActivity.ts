import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type EnergiaLevel = 'bassa' | 'media' | 'alta';
export type SonnoLevel = 'scarso' | 'regolare' | 'ottimo';
export type AppetitoLevel = 'ridotto' | 'normale' | 'buono';
export type AttivitaLevel = 'bassa' | 'media' | 'alta';
export type IdratLevel = 'scarsa' | 'ok' | 'ottima';
export type MoodLevel = 'triste' | 'normale' | 'felice' | 'eccitato';
export type ActivityType = 'passeggiata' | 'gioco' | 'altro';

export interface DailyStatus {
  date: string; // YYYY-MM-DD
  energia: EnergiaLevel;
  sonno: SonnoLevel;
  appetito: AppetitoLevel;
  attivita: AttivitaLevel;
  idratazione: IdratLevel;
}

export interface ActivityEntry {
  id: string;
  type: ActivityType;
  date: string; // ISO full datetime
  durationMin: number;
  note?: string;
}

export interface MoodEntry {
  id: string;
  date: string; // YYYY-MM-DD
  level: MoodLevel;
  emoji: string;
  note?: string;
}

export interface BehaviorFlag {
  id: string;
  label: string;
  flaggedAt: string;
  note?: string;
}

interface PetActivityState {
  dailyStatuses: DailyStatus[];
  activityLog: ActivityEntry[];
  moodLog: MoodEntry[];
  behaviorFlags: BehaviorFlag[];
  aiInsight: string;

  setTodayStatus: (status: Omit<DailyStatus, 'date'>) => void;
  addActivity: (entry: Omit<ActivityEntry, 'id'>) => void;
  addMood: (entry: Omit<MoodEntry, 'id'>) => void;
  addBehaviorFlag: (label: string, note?: string) => void;
  removeBehaviorFlag: (id: string) => void;
  setAiInsight: (text: string) => void;
  getTodayStatus: () => DailyStatus | undefined;
  getWeekActivity: () => { date: string; totalMin: number }[];
  getRecentMoods: (n: number) => MoodEntry[];
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function dateOfOffset(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  return d.toISOString().slice(0, 10);
}

export const usePetActivityStore = create<PetActivityState>()(
  persist(
    (set, get) => ({
      dailyStatuses: [],
      activityLog: [],
      moodLog: [],
      behaviorFlags: [],
      aiInsight: '',

      setTodayStatus: (status) => {
        const today = todayStr();
        set((s) => {
          const exists = s.dailyStatuses.some((d) => d.date === today);
          if (exists) {
            return {
              dailyStatuses: s.dailyStatuses.map((d) =>
                d.date === today ? { ...status, date: today } : d,
              ),
            };
          }
          return { dailyStatuses: [...s.dailyStatuses, { ...status, date: today }] };
        });
      },

      addActivity: (entry) =>
        set((s) => ({
          activityLog: [
            { ...entry, id: `act-${Date.now()}-${Math.random().toString(36).slice(2)}` },
            ...s.activityLog,
          ],
        })),

      addMood: (entry) =>
        set((s) => ({
          moodLog: [
            { ...entry, id: `mood-${Date.now()}-${Math.random().toString(36).slice(2)}` },
            ...s.moodLog,
          ],
        })),

      addBehaviorFlag: (label, note) =>
        set((s) => ({
          behaviorFlags: [
            {
              id: `flag-${Date.now()}-${Math.random().toString(36).slice(2)}`,
              label,
              flaggedAt: new Date().toISOString(),
              note,
            },
            ...s.behaviorFlags,
          ],
        })),

      removeBehaviorFlag: (id) =>
        set((s) => ({ behaviorFlags: s.behaviorFlags.filter((f) => f.id !== id) })),

      setAiInsight: (text) => set({ aiInsight: text }),

      getTodayStatus: () => {
        const today = todayStr();
        return get().dailyStatuses.find((d) => d.date === today);
      },

      getWeekActivity: () => {
        const { activityLog } = get();
        return Array.from({ length: 7 }, (_, i) => {
          const ds = dateOfOffset(6 - i);
          const totalMin = activityLog
            .filter((a) => a.date.startsWith(ds))
            .reduce((sum, a) => sum + a.durationMin, 0);
          return { date: ds, totalMin };
        });
      },

      getRecentMoods: (n) => {
        return [...get().moodLog]
          .sort((a, b) => b.date.localeCompare(a.date))
          .slice(0, n);
      },
    }),
    {
      name: 'pet-activity-store',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
