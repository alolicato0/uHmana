import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { requireUser, userId } from '../middleware/auth.js';
import { chat } from '../services/openrouter.js';
import { TimelineEvent } from '../models/TimelineEvent.js';
import { eventTypeLabels } from '../utils/labels.js';

const router = Router();

// Anti-abuso: max 30 chat al minuto per IP
const limiter = rateLimit({
  windowMs: 60_000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

const attachmentSchema = z.object({
  mimeType: z.string(),
  dataUrl: z.string().startsWith('data:'),
});

const messageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  text: z.string().default(''),
  attachments: z.array(attachmentSchema).default([]),
});

const bodySchema = z.object({
  messages: z.array(messageSchema).min(1).max(50),
  extraContext: z.string().optional(),
  includeTimelineContext: z.boolean().default(true),
});

router.post('/', limiter, requireUser, async (req, res, next) => {
  try {
    const uid = userId(req);
    const body = bodySchema.parse(req.body);

    let context = body.extraContext;
    if (body.includeTimelineContext) {
      const timelineCtx = await buildTimelineContext(uid);
      context = [context, timelineCtx].filter(Boolean).join('\n\n');
    }

    const reply = await chat({
      messages: body.messages,
      extraContext: context,
    });

    res.json({ reply });
  } catch (e) {
    next(e);
  }
});

async function buildTimelineContext(uid: string, max = 10): Promise<string> {
  const events = await TimelineEvent.find({ userId: uid })
    .sort({ date: -1 })
    .limit(max)
    .lean();
  if (events.length === 0) return 'Nessun evento clinico registrato.';
  const lines = events.map(
    (e) =>
      `- ${e.date.toISOString().slice(0, 10)} · ${
        eventTypeLabels[e.type as keyof typeof eventTypeLabels]
      }: ${e.title}` +
      (e.description ? ` — ${e.description}` : ''),
  );
  return `Ultimi eventi salute dell'utente:\n${lines.join('\n')}`;
}

export default router;
