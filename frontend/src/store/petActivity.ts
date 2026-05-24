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
  memberId?: string;
}

export interface ActivityEntry {
  id: string;
  type: ActivityType;
  date: string; // ISO full datetime
  durationMin: number;
  note?: string;
  memberId?: string;
}

export interface MoodEntry {
  id: string;
  date: string; // YYYY-MM-DD
  level: MoodLevel;
  emoji: string;
  note?: string;
  memberId?: string;
}

export interface BehaviorFlag {
  id: string;
  label: string;
  flaggedAt: string;
  note?: string;
  memberId?: string;
}

interface PetActivityState {
  dailyStatuses: DailyStatus[];
  activityLog: ActivityEntry[];
  moodLog: MoodEntry[];
  behaviorFlags: BehaviorFlag[];
  aiInsight: string;

  setTodayStatus: (status: Omit<DailyStatus, 'date'>, memberId?: string) => void;
  addActivity: (entry: Omit<ActivityEntry, 'id'>) => void;
  addMood: (entry: Omit<MoodEntry, 'id'>) => void;
  addBehaviorFlag: (label: string, note?: string, memberId?: string) => void;
  removeBehaviorFlag: (id: string) => void;
  setAiInsight: (text: string) => void;
  getTodayStatus: (memberId?: string) => DailyStatus | undefined;
  getWeekActivity: (memberId?: string) => { date: string; totalMin: number }[];
  getRecentMoods: (n: number, memberId?: string) => MoodEntry[];
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

      setTodayStatus: (status, memberId) => {
        const today = todayStr();
        const mid = memberId ?? status.memberId;
        set((s) => {
          const exists = s.dailyStatuses.some(
            (d) => d.date === today && (d.memberId ?? null) === (mid ?? null),
          );
          if (exists) {
            return {
              dailyStatuses: s.dailyStatuses.map((d) =>
                d.date === today && (d.memberId ?? null) === (mid ?? null)
                  ? { ...status, date: today, memberId: mid }
                  : d,
              ),
            };
          }
          return {
            dailyStatuses: [...s.dailyStatuses, { ...status, date: today, memberId: mid }],
          };
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

      addBehaviorFlag: (label, note, memberId) =>
        set((s) => ({
          behaviorFlags: [
            {
              id: `flag-${Date.now()}-${Math.random().toString(36).slice(2)}`,
              label,
              flaggedAt: new Date().toISOString(),
              note,
              memberId,
            },
            ...s.behaviorFlags,
          ],
        })),

      removeBehaviorFlag: (id) =>
        set((s) => ({ behaviorFlags: s.behaviorFlags.filter((f) => f.id !== id) })),

      setAiInsight: (text) => set({ aiInsight: text }),

      getTodayStatus: (memberId) => {
        const today = todayStr();
        const list = get().dailyStatuses.filter((d) => d.date === today);
        if (memberId) {
          return list.find((d) => d.memberId === memberId) ?? list.find((d) => !d.memberId);
        }
        return list[0];
      },

      getWeekActivity: (memberId) => {
        const { activityLog } = get();
        const filtered = memberId
          ? activityLog.filter((a) => !a.memberId || a.memberId === memberId)
          : activityLog;
        return Array.from({ length: 7 }, (_, i) => {
          const ds = dateOfOffset(6 - i);
          const totalMin = filtered
            .filter((a) => a.date.startsWith(ds))
            .reduce((sum, a) => sum + a.durationMin, 0);
          return { date: ds, totalMin };
        });
      },

      getRecentMoods: (n, memberId) => {
        const list = memberId
          ? get().moodLog.filter((m) => !m.memberId || m.memberId === memberId)
          : get().moodLog;
        return [...list].sort((a, b) => b.date.localeCompare(a.date)).slice(0, n);
      },
    }),
    {
      name: 'pet-activity-store',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
