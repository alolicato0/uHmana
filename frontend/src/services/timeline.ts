import type { TimelineEvent } from '../types';
import { apiFetch } from './api';

function fromApi(raw: any): TimelineEvent {
  return {
    id: raw._id ?? raw.id,
    profileId: raw.profileId ?? '',
    type: raw.type,
    title: raw.title,
    description: raw.description,
    date: typeof raw.date === 'string' ? raw.date : new Date(raw.date).toISOString(),
    mediaUrls: raw.mediaUrls,
  };
}

export async function fetchTimeline(
  token: string | null,
  profileId?: string,
): Promise<TimelineEvent[]> {
  const qs = profileId ? `?profileId=${profileId}` : '';
  const data = await apiFetch<any[]>(`/api/timeline${qs}`, { token });
  return (data ?? []).map(fromApi);
}

export async function createEvent(
  event: Omit<TimelineEvent, 'id'>,
  token: string | null,
): Promise<TimelineEvent> {
  const data = await apiFetch<any>('/api/timeline', {
    method: 'POST',
    body: event,
    token,
  });
  return fromApi(data);
}

export async function deleteEvent(id: string, token: string | null): Promise<void> {
  await apiFetch(`/api/timeline/${id}`, { method: 'DELETE', token });
}
