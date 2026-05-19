import { Router } from 'express';
import { z } from 'zod';
import { requireUser, userId } from '../middleware/auth.js';
import { HealthProfile } from '../models/HealthProfile.js';

const router = Router();

const profileSchema = z.object({
  name: z.string().min(1),
  kind: z.enum(['human', 'pet']),
  birthDate: z.string().datetime().optional(),
  bloodGroup: z.string().optional(),
  species: z.string().optional(),
  breed: z.string().optional(),
  weightKg: z.number().positive().optional(),
  allergies: z.array(z.string()).default([]),
  conditions: z.array(z.string()).default([]),
  currentTherapies: z.array(z.string()).default([]),
  avatarUrl: z.string().url().optional(),
  notes: z.string().optional(),
});

router.get('/', requireUser, async (req, res, next) => {
  try {
    const items = await HealthProfile.find({ userId: userId(req) }).lean();
    res.json(items);
  } catch (e) {
    next(e);
  }
});

router.post('/', requireUser, async (req, res, next) => {
  try {
    const data = profileSchema.parse(req.body);
    const doc = await HealthProfile.create({ ...data, userId: userId(req) });
    res.status(201).json(doc);
  } catch (e) {
    next(e);
  }
});

router.put('/:id', requireUser, async (req, res, next) => {
  try {
    const data = profileSchema.partial().parse(req.body);
    const doc = await HealthProfile.findOneAndUpdate(
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
    const r = await HealthProfile.deleteOne({
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
