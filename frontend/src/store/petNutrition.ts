import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type MealType = 'colazione' | 'pranzo' | 'cena' | 'snack' | 'integratore';
export type WaterLevel = 'low' | 'ok' | 'high';

export interface Meal {
  id: string;
  date: string;   // YYYY-MM-DD
  time: string;   // HH:MM
  type: MealType;
  food: string;
  grams?: number;
  memberId?: string;
  note?: string;
}

export interface WeightEntry {
  id: string;
  date: string;   // YYYY-MM-DD
  kg: number;
  memberId?: string;
  note?: string;
}

interface PetNutritionState {
  meals: Meal[];
  weightLog: WeightEntry[];
  waterLevel: WaterLevel;
  waterDate: string;  // YYYY-MM-DD of last water update
  addMeal: (m: Omit<Meal, 'id'>) => void;
  removeMeal: (id: string) => void;
  updateMealNote: (id: string, note: string) => void;
  addWeight: (e: Omit<WeightEntry, 'id'>) => void;
  removeWeight: (id: string) => void;
  updateWeightNote: (id: string, note: string) => void;
  setWater: (level: WaterLevel) => void;
}

const today = () => new Date().toISOString().slice(0, 10);

export const usePetNutritionStore = create<PetNutritionState>()(
  persist(
    (set) => ({
      meals: [],
      weightLog: [],
      waterLevel: 'ok',
      waterDate: today(),

      addMeal: (m) =>
        set((s) => ({
          meals: [{ ...m, id: Date.now().toString() }, ...s.meals],
        })),

      removeMeal: (id) =>
        set((s) => ({ meals: s.meals.filter((m) => m.id !== id) })),

      updateMealNote: (id, note) =>
        set((s) => ({
          meals: s.meals.map((m) => (m.id === id ? { ...m, note } : m)),
        })),

      addWeight: (e) =>
        set((s) => ({
          weightLog: [{ ...e, id: Date.now().toString() }, ...s.weightLog],
        })),

      removeWeight: (id) =>
        set((s) => ({ weightLog: s.weightLog.filter((w) => w.id !== id) })),

      updateWeightNote: (id, note) =>
        set((s) => ({
          weightLog: s.weightLog.map((w) => (w.id === id ? { ...w, note } : w)),
        })),

      setWater: (level) => set({ waterLevel: level, waterDate: today() }),
    }),
    {
      name: 'pet-nutrition-store',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

export const MEAL_EMOJI: Record<MealType, string> = {
  colazione: '🥣',
  pranzo: '🍗',
  cena: '🍖',
  snack: '🦴',
  integratore: '🧴',
};

export const MEAL_LABEL: Record<MealType, string> = {
  colazione: 'Colazione',
  pranzo: 'Pranzo',
  cena: 'Cena',
  snack: 'Snack',
  integratore: 'Integratore',
};
