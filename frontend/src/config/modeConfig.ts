import type { Ionicons } from '@expo/vector-icons';
import type { ProfileKind } from '../types';

type IconName = keyof typeof Ionicons.glyphMap;

export interface FeatureTileConfig {
  icon: IconName;
  title: string;
  subtitle: string;
  color: string;
  route: string;
}

export interface ModeConfig {
  // Palette
  primary: string;
  secondary: string;
  heroGradient: [string, string];
  bg: string;
  cardRadius: number;

  // Copy
  greeting: (name: string) => string;
  subtitle: string;
  heroLabel: string;
  heroTitle: string;
  heroSubtitle: string;
  upcomingSectionTitle: string;
  emptyUpcoming: string;

  // Feature tiles
  tiles: FeatureTileConfig[];
}

// Mode UMANO — clinico, tech, teal/cyan
const human: ModeConfig = {
  primary: '#0DB09E',
  secondary: '#22C55E',
  heroGradient: ['#0DB09E', '#22C55E'],
  bg: '#F5F7FA',
  cardRadius: 18,

  greeting: (name) => `Ciao, ${name} 👋`,
  subtitle: 'Prenditi cura della tua salute\ne di chi ami.',
  heroLabel: 'Stato salute',
  heroTitle: 'Tutto sotto controllo',
  heroSubtitle: 'Ultimo aggiornamento: oggi, 08:30',
  upcomingSectionTitle: 'Prossime terapie',
  emptyUpcoming: 'Nessuna terapia attiva',

  tiles: [
    {
      icon: 'sparkles-outline',
      title: 'Insight Salute',
      subtitle: 'Analisi AI del tuo stato',
      color: '#06B6D4',
      route: '/insight',
    },
    {
      icon: 'medical-outline',
      title: 'Piano Salute',
      subtitle: 'Farmaci e terapie',
      color: '#5B7CFA',
      route: '/reminders',
    },
    {
      icon: 'thermometer-outline',
      title: 'Sintomi',
      subtitle: 'Tracking benessere',
      color: '#F59E0B',
      route: '/sintomi',
    },
    {
      icon: 'document-text-outline',
      title: 'Referti',
      subtitle: 'Esami e analisi',
      color: '#22C55E',
      route: '/reports',
    },
  ],
};

// Mode ANIMALE — caldo, pet-care, emerald/warm
const pet: ModeConfig = {
  primary: '#10B981',
  secondary: '#F59E0B',
  heroGradient: ['#10B981', '#F59E0B'],
  bg: '#FDFBF5',
  cardRadius: 22,

  greeting: (name) => `Ciao, ${name} 🐾`,
  subtitle: 'Prenditi cura del tuo\ncompagno a quattro zampe.',
  heroLabel: 'Stato animale',
  heroTitle: 'Molto attivo oggi',
  heroSubtitle: 'Ultima passeggiata: 3h fa',
  upcomingSectionTitle: 'Prossimi vaccini',
  emptyUpcoming: 'Nessun vaccino in scadenza',

  tiles: [
    {
      icon: 'paw-outline',
      title: 'Assistente Vet',
      subtitle: 'Analisi e supporto veterinario AI',
      color: '#10B981',
      route: '/vet-ai',
    },
    {
      icon: 'restaurant-outline',
      title: 'Alimentazione',
      subtitle: 'Pasti, dieta, cibi tossici',
      color: '#F59E0B',
      route: '/reminders',
    },
    {
      icon: 'shield-checkmark-outline',
      title: 'Vaccini',
      subtitle: 'Scadenze e richiami',
      color: '#5B7CFA',
      route: '/reminders',
    },
    {
      icon: 'happy-outline',
      title: 'Comportamento',
      subtitle: 'Umore e attività',
      color: '#EC4899',
      route: '/(tabs)/timeline',
    },
  ],
};

export const modeConfigs: Record<ProfileKind, ModeConfig> = { human, pet };

export function getMode(kind: ProfileKind): ModeConfig {
  return modeConfigs[kind];
}
