import * as FileSystem from 'expo-file-system/legacy';
import type { ChatMessage } from '../types';
import { apiFetch } from './api';

/**
 * Inoltra la chat al backend Render.
 * La API key OpenRouter NON sta mai sul telefono.
 */
export interface ChatRequest {
  history: ChatMessage[];
  extraContext?: string;
  /** JWT Clerk ottenuto via useAuth().getToken() */
  token: string | null;
}

export async function chat({ history, extraContext, token }: ChatRequest): Promise<string> {
  const serialized = await Promise.all(
    history.map(async (m) => ({
      role: m.role,
      text: m.text,
      attachments: m.attachments
        ? await Promise.all(
            m.attachments.map(async (a) => ({
              mimeType: a.mimeType,
              dataUrl: await toDataUrl(a.url, a.mimeType),
            })),
          )
        : [],
    })),
  );

  const data = await apiFetch<{ reply: string }>('/api/chat', {
    method: 'POST',
    body: { messages: serialized, extraContext },
    token,
  });
  return data.reply ?? '';
}

async function toDataUrl(uri: string, mimeType: string): Promise<string> {
  if (uri.startsWith('http') || uri.startsWith('data:')) return uri;
  const b64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
  return `data:${mimeType};base64,${b64}`;
}
