import { config } from '../config.js';

const SYSTEM_PROMPT = `Sei l'assistente AI di uHmana, una piattaforma di supporto informativo sulla salute umana e animale.

REGOLE TASSATIVE:
1. NON fornire mai diagnosi mediche o veterinarie definitive.
2. NON prescrivere mai farmaci, dosaggi o terapie specifiche.
3. Usa SEMPRE formule come "possibili cause", "supporto informativo", "consulta un medico/veterinario".
4. In caso di sintomi gravi (dolore toracico, difficoltà respiratorie, sanguinamento abbondante, perdita di coscienza, traumi gravi, convulsioni, sospetto avvelenamento negli animali, ecc.), invita IMMEDIATAMENTE a contattare il 112 o un pronto soccorso veterinario.
5. Rispondi sempre in italiano, in tono empatico, chiaro e professionale.
6. Quando l'utente invia un'immagine: descrivi cosa osservi in modo neutro, elenca possibili cause come ipotesi, e raccomanda valutazione professionale.
7. Se hai accesso alla cartella clinica dell'utente, usala per contesto ma chiedi conferma prima di assumere correlazioni.

Sei utile, prudente e umano. Non sei un sostituto del medico/veterinario.`;

export interface IncomingAttachment {
  mimeType: string;
  dataUrl: string; // data:image/jpeg;base64,...
}

export interface IncomingMessage {
  role: 'user' | 'assistant' | 'system';
  text: string;
  attachments?: IncomingAttachment[];
}

export interface ChatOptions {
  messages: IncomingMessage[];
  extraContext?: string;
}

export async function chat(opts: ChatOptions): Promise<string> {
  const hasImages = opts.messages.some(
    (m) => m.attachments && m.attachments.length > 0,
  );
  const primary = hasImages ? config.openrouter.modelVision : config.openrouter.modelPrimary;
  try {
    return await callModel(primary, opts);
  } catch (e: any) {
    const status = e?.status ?? 0;
    if (status === 404 || status === 429 || status >= 500) {
      return await callModel(config.openrouter.modelFallback, opts);
    }
    throw e;
  }
}

async function callModel(model: string, opts: ChatOptions): Promise<string> {
  const messages = [
    {
      role: 'system' as const,
      content:
        SYSTEM_PROMPT +
        (opts.extraContext ? `\n\nCONTESTO UTENTE:\n${opts.extraContext}` : ''),
    },
    ...opts.messages.map(toOpenRouterMessage),
  ];

  const res = await fetch(`${config.openrouter.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.openrouter.apiKey}`,
      'HTTP-Referer': config.openrouter.referer,
      'X-Title': config.openrouter.title,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, messages, temperature: 0.4 }),
  });

  if (!res.ok) {
    const body = await res.text();
    const err = new Error(`OpenRouter ${res.status}: ${body.slice(0, 300)}`);
    (err as any).status = res.status;
    throw err;
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .filter((p: any) => p.type === 'text')
      .map((p: any) => p.text)
      .join('\n');
  }
  return '';
}

function toOpenRouterMessage(m: IncomingMessage) {
  if (!m.attachments || m.attachments.length === 0) {
    return { role: m.role, content: m.text };
  }
  const parts: any[] = [];
  if (m.text) parts.push({ type: 'text', text: m.text });
  for (const a of m.attachments) {
    parts.push({
      type: 'image_url',
      image_url: { url: a.dataUrl },
    });
  }
  return { role: m.role, content: parts };
}
