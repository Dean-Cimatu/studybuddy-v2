import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/requireAuth';
import { StudySessionModel } from '../models/StudySession';
import { logStudyActivity } from '../utils/studyStats';

const router = Router();

const sessionSchema = z.object({
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  durationMinutes: z.number().int().min(1).max(480),
  type: z.enum(['pomodoro', 'free']),
  moduleTag: z.string().max(50).optional(),
  moduleName: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
});

// POST /api/stats/session
router.post('/session', requireAuth, async (req: Request, res: Response) => {
  const parsed = sessionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' });
  }

  const userId = req.user!._id.toString();

  try {
    const session = await StudySessionModel.create({
      userId: req.user!._id,
      ...parsed.data,
      moduleTag: parsed.data.moduleTag ?? null,
      moduleName: parsed.data.moduleName ?? null,
      notes: parsed.data.notes ?? null,
    });

    await logStudyActivity(userId, parsed.data.durationMinutes);

    return res.status(201).json({ session });
  } catch (err) {
    console.error('Create session error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
