/**
 * Client API verso il backend uHmana su Render.
 *
 * L'autenticazione usa un JWT custom: chi chiama `apiFetch` deve passare
 * il token ottenuto via `getToken()` dal hook `useAuth()`.
 */

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

export interface ApiOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  token: string | null;
}

export async function apiFetch<T = unknown>(
  path: string,
  { body, token, headers, ...rest }: ApiOptions,
): Promise<T> {
  if (!API_URL) {
    throw new Error(
      "Backend non configurato: EXPO_PUBLIC_API_URL mancante.",
    );
  }
  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    let detail = text;
    try {
      detail = JSON.parse(text).error ?? text;
    } catch {
      // ignore
    }
    throw new Error(`API ${res.status}: ${detail}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
