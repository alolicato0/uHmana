import { Router } from 'express';
import { z } from 'zod';
import { requireUser, userId } from '../middleware/auth.js';
import { Reminder } from '../models/Reminder.js';

const router = Router();

const reminderSchema = z.object({
  profileId: z.string().optional(),
  category: z.enum(['medication', 'visit', 'vaccine', 'other']).default('medication'),
  title: z.string().min(1),
  notes: z.string().optional(),
  schedule: z
    .object({
      kind: z.enum(['once', 'daily', 'weekly', 'monthly']).default('once'),
      time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
      date: z.string().datetime().optional(),
      daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
    })
    .default({ kind: 'once' }),
  enabled: z.boolean().default(true),
  expoPushToken: z.string().optional(),
});

router.get('/', requireUser, async (req, res, next) => {
  try {
    const items = await Reminder.find({ userId: userId(req) })
      .sort({ createdAt: -1 })
      .lean();
    res.json(items);
  } catch (e) {
    next(e);
  }
});

router.post('/', requireUser, async (req, res, next) => {
  try {
    const data = reminderSchema.parse(req.body);
    const doc = await Reminder.create({ ...data, userId: userId(req) });
    res.status(201).json(doc);
  } catch (e) {
    next(e);
  }
});

router.put('/:id', requireUser, async (req, res, next) => {
  try {
    const data = reminderSchema.partial().parse(req.body);
    const doc = await Reminder.findOneAndUpdate(
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
    const r = await Reminder.deleteOne({
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
