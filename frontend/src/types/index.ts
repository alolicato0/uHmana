export type ProfileKind = 'human' | 'pet';

export interface HealthProfile {
  id: string;
  name: string;
  kind: ProfileKind;
  birthDate?: string;
  bloodGroup?: string;
  species?: string;
  breed?: string;
  weightKg?: number;
  allergies: string[];
  conditions: string[];
  currentTherapies: string[];
  avatarUrl?: string;
}

export type TimelineEventType =
  | 'symptom'
  | 'medication'
  | 'visit'
  | 'exam'
  | 'vaccine'
  | 'note'
  | 'photo';

export interface TimelineEvent {
  id: string;
  profileId: string;
  type: TimelineEventType;
  title: string;
  description?: string;
  date: string; // ISO
  mediaUrls?: string[];
  memberId?: string;
}

export type ChatRole = 'user' | 'assistant' | 'system';

export interface ChatAttachment {
  /** file:// URI usato per mostrare il thumbnail */
  url: string;
  mimeType: string;
  /** data:mime;base64,... già pronto per il backend (opzionale, calcolato al pick) */
  dataUrl?: string;
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
  attachments?: ChatAttachment[];
  createdAt: string;
}

export const eventTypeLabels: Record<TimelineEventType, string> = {
  symptom: 'Sintomo',
  medication: 'Farmaco / Terapia',
  visit: 'Visita',
  exam: 'Esame / Referto',
  vaccine: 'Vaccinazione',
  note: 'Nota',
  photo: 'Foto',
};

export const eventTypeEmoji: Record<TimelineEventType, string> = {
  symptom: '🤒',
  medication: '💊',
  visit: '🩺',
  exam: '📄',
  vaccine: '💉',
  note: '📝',
  photo: '📷',
};

export const profileKindLabel: Record<ProfileKind, string> = {
  human: 'Umano',
  pet: 'Animale',
};

export type ReminderCategory = 'medication' | 'visit' | 'vaccine' | 'other';
export type ReminderKind = 'once' | 'daily' | 'weekly' | 'monthly';

export interface ReminderSchedule {
  kind: ReminderKind;
  time?: string;
  date?: string;
  daysOfWeek?: number[];
}

export interface Reminder {
  id: string;
  profileId?: string;
  memberId?: string;
  category: ReminderCategory;
  title: string;
  notes?: string;
  schedule: ReminderSchedule;
  enabled: boolean;
}
