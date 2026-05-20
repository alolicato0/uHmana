import type { Reminder } from '../types';
import { apiFetch } from './api';

function fromApi(raw: any): Reminder {
  return {
    id: raw._id ?? raw.id,
    profileId: raw.profileId,
    category: raw.category ?? 'medication',
    title: raw.title,
    notes: raw.notes,
    schedule: raw.schedule ?? { kind: 'daily' },
    enabled: raw.enabled ?? true,
  };
}

export async function fetchReminders(token: string | null): Promise<Reminder[]> {
  const data = await apiFetch<any[]>('/api/reminders', { token });
  return (data ?? []).map(fromApi);
}

export async function createReminder(
  reminder: Omit<Reminder, 'id'>,
  token: string | null,
): Promise<Reminder> {
  const data = await apiFetch<any>('/api/reminders', {
    method: 'POST',
    body: reminder,
    token,
  });
  return fromApi(data);
}

export async function updateReminder(
  id: string,
  reminder: Partial<Omit<Reminder, 'id'>>,
  token: string | null,
): Promise<Reminder> {
  const data = await apiFetch<any>(`/api/reminders/${id}`, {
    method: 'PUT',
    body: reminder,
    token,
  });
  return fromApi(data);
}

export async function deleteReminder(id: string, token: string | null): Promise<void> {
  await apiFetch(`/api/reminders/${id}`, { method: 'DELETE', token });
}
