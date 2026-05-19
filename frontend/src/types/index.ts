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
}

export type ChatRole = 'user' | 'assistant' | 'system';

export interface ChatAttachment {
  url: string;
  mimeType: string;
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
