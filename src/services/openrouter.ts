import * as FileSystem from 'expo-file-system/legacy';
import { Disclaimers } from '../constants/disclaimers';
import type { ChatMessage } from '../types';

/**
 * Client OpenRouter.
 *
 * In produzione il client NON deve mai parlare direttamente con OpenRouter:
 * deve passare per il backend Render (che custodisce la API key).
 *
 * In dev, per provare velocemente, puoi settare:
 *   EXPO_PUBLIC_DIRECT_OPENROUTER=true
 *   EXPO_PUBLIC_OPENROUTER_KEY=sk-or-...
 * e usare `chatDirect()`. Da NON pushare mai in produzione.
 */

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';
const DIRECT =
  process.env.EXPO_PUBLIC_DIRECT_OPENROUTER === 'true' &&
  !!process.env.EXPO_PUBLIC_OPENROUTER_KEY;

const OR_BASE = 'https://openrouter.ai/api/v1';
const MODEL_PRIMARY = 'google/gemini-2.0-flash-exp:free';
const MODEL_FALLBACK = 'meta-llama/llama-3.3-70b-instruct:free';
const MODEL_VISION = 'google/gemini-2.0-flash-exp:free';

export interface ChatRequest {
  history: ChatMessage[];
  extraContext?: string;
}

export async function chat(req: ChatRequest): Promise<string> {
  if (DIRECT) return chatDirect(req);
  return chatViaBackend(req);
}

// ---------------------------------------------------------------------------
// Modalità produzione: chiama il backend Render
// ---------------------------------------------------------------------------
async function chatViaBackend({ history, extraContext }: ChatRequest): Promise<string> {
  if (!API_URL) {
    throw new Error(
      "Backend non configurato. Setta EXPO_PUBLIC_API_URL o usa la modalità DIRECT.",
    );
  }
  // Serializza gli allegati locali in base64 prima di inviarli al backend.
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
  const res = await fetch(`${API_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: serialized, extraContext }),
  });
  if (!res.ok) {
    throw new Error(`Backend ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  return data.reply ?? '';
}

// ---------------------------------------------------------------------------
// Modalità dev: chiama OpenRouter direttamente (solo per testing rapido)
// ---------------------------------------------------------------------------
async function chatDirect({ history, extraContext }: ChatRequest): Promise<string> {
  const apiKey = process.env.EXPO_PUBLIC_OPENROUTER_KEY!;
  const hasImages = history.some((m) =>
    m.attachments?.some((a) => a.mimeType.startsWith('image/')),
  );
  const model = hasImages ? MODEL_VISION : MODEL_PRIMARY;

  const buildBody = async (modelId: string) => ({
    model: modelId,
    temperature: 0.4,
    messages: [
      {
        role: 'system',
        content:
          Disclaimers.aiSystemPrompt +
          (extraContext ? `\n\nCONTESTO UTENTE:\n${extraContext}` : ''),
      },
      ...(await Promise.all(history.map(toOpenRouterMessage))),
    ],
  });

  const post = async (modelId: string) => {
    const r = await fetch(`${OR_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://uhmana.app',
        'X-Title': 'uHmana',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(await buildBody(modelId)),
    });
    return r;
  };

  let resp = await post(model);
  if (resp.status === 429 || resp.status >= 500) {
    resp = await post(MODEL_FALLBACK);
  }
  if (!resp.ok) {
    throw new Error(`OpenRouter ${resp.status}: ${await resp.text()}`);
  }
  const data = await resp.json();
  const c = data.choices?.[0]?.message?.content;
  if (typeof c === 'string') return c;
  if (Array.isArray(c)) return c.map((p: any) => p.text ?? '').join('\n');
  return '';
}

async function toOpenRouterMessage(m: ChatMessage) {
  const images = (m.attachments ?? []).filter((a) =>
    a.mimeType.startsWith('image/'),
  );
  if (images.length === 0) {
    return { role: m.role, content: m.text };
  }
  const parts: any[] = [];
  if (m.text) parts.push({ type: 'text', text: m.text });
  for (const img of images) {
    parts.push({
      type: 'image_url',
      image_url: { url: await toDataUrl(img.url, img.mimeType) },
    });
  }
  return { role: m.role, content: parts };
}

async function toDataUrl(uri: string, mimeType: string): Promise<string> {
  if (uri.startsWith('http')) return uri;
  if (uri.startsWith('data:')) return uri;
  const b64 = await FileSystem.readAsStringAsync(uri, {
    encoding: 'base64',
  });
  return `data:${mimeType};base64,${b64}`;
}
