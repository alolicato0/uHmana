import { Router } from 'express';
import { z } from 'zod';
import { requireUser, userId } from '../middleware/auth.js';
import { TimelineEvent } from '../models/TimelineEvent.js';

const router = Router();

const eventSchema = z.object({
  profileId: z.string().optional(),
  type: z.enum(['symptom', 'medication', 'visit', 'exam', 'vaccine', 'note', 'photo']),
  title: z.string().min(1),
  description: z.string().optional(),
  date: z.string().datetime(),
  mediaUrls: z.array(z.string().url()).default([]),
  extra: z.record(z.unknown()).optional(),
});

router.get('/', requireUser, async (req, res, next) => {
  try {
    const profileId =
      typeof req.query.profileId === 'string' ? req.query.profileId : undefined;
    const filter: Record<string, unknown> = { userId: userId(req) };
    if (profileId) filter.profileId = profileId;
    const items = await TimelineEvent.find(filter).sort({ date: -1 }).limit(200).lean();
    res.json(items);
  } catch (e) {
    next(e);
  }
});

router.post('/', requireUser, async (req, res, next) => {
  try {
    const data = eventSchema.parse(req.body);
    const doc = await TimelineEvent.create({ ...data, userId: userId(req) });
    res.status(201).json(doc);
  } catch (e) {
    next(e);
  }
});

router.put('/:id', requireUser, async (req, res, next) => {
  try {
    const data = eventSchema.partial().parse(req.body);
    const doc = await TimelineEvent.findOneAndUpdate(
      { _id: req.params.id, userId: userId(req) },
      data,
      { new: true },
    );
    if (!doc) return res.status(404).json({ error: 'Not found' });
    res.json(doc);
  } catch (e) {
    next(e);
  }
});

router.delete('/:id', requireUser, async (req, res, next) => {
  try {
    const r = await TimelineEvent.deleteOne({
      _id: req.params.id,
      userId: userId(req),
    });
    if (r.deletedCount === 0) return res.status(404).json({ error: 'Not found' });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

export default router;
