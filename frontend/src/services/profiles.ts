import type { HealthProfile } from '../types';
import { apiFetch } from './api';

function fromApi(raw: any): HealthProfile {
  return {
    id: raw._id ?? raw.id,
    name: raw.name,
    kind: raw.kind,
    birthDate: raw.birthDate,
    bloodGroup: raw.bloodGroup,
    species: raw.species,
    breed: raw.breed,
    weightKg: raw.weightKg,
    allergies: raw.allergies ?? [],
    conditions: raw.conditions ?? [],
    currentTherapies: raw.currentTherapies ?? [],
    avatarUrl: raw.avatarUrl,
  };
}

export async function fetchProfiles(token: string | null): Promise<HealthProfile[]> {
  const data = await apiFetch<any[]>('/api/profiles', { token });
  return (data ?? []).map(fromApi);
}

export async function createProfile(
  profile: Omit<HealthProfile, 'id'>,
  token: string | null,
): Promise<HealthProfile> {
  const data = await apiFetch<any>('/api/profiles', {
    method: 'POST',
    body: profile,
    token,
  });
  return fromApi(data);
}

export async function updateProfile(
  id: string,
  profile: Partial<Omit<HealthProfile, 'id'>>,
  token: string | null,
): Promise<HealthProfile> {
  const data = await apiFetch<any>(`/api/profiles/${id}`, {
    method: 'PUT',
    body: profile,
    token,
  });
  return fromApi(data);
}

export async function deleteProfile(id: string, token: string | null): Promise<void> {
  await apiFetch(`/api/profiles/${id}`, { method: 'DELETE', token });
}
