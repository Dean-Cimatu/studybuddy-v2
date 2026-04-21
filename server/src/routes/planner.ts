import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/requireAuth';
import { StudyPlanModel } from '../models/StudyPlan';
import { generateWeeklyPlan, getWeekStartDate } from '../services/studyPlanner';
import { updateEvent, deleteEvent } from '../services/googleCalendar';

const router = Router();
router.use(requireAuth);

// POST /api/planner/generate
router.post('/generate', async (req: Request, res: Response) => {
  const { pushToGoogleCalendar = false } = req.body as { pushToGoogleCalendar?: boolean };
  try {
    const plan = await generateWeeklyPlan(req.user!._id.toString(), pushToGoogleCalendar);
    return res.status(201).json({ plan });
  } catch (err) {
    console.error('Plan generation error:', err);
    return res.status(500).json({ error: 'Failed to generate study plan. Please try again.' });
  }
});

// GET /api/planner/current
router.get('/current', async (req: Request, res: Response) => {
  const weekStartDate = getWeekStartDate();
  const plan = await StudyPlanModel.findOne({ userId: req.user!._id.toString(), weekStartDate });
  return res.json({ plan: plan ? plan.toJSON() : null });
});

const sessionUpdateSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  startHour: z.number().int().min(0).max(23).optional(),
  durationMinutes: z.number().int().positive().optional(),
  moduleName: z.string().min(1).optional(),
  topic: z.string().min(1).optional(),
});

// PUT /api/planner/session/:index
router.put('/session/:index', async (req: Request, res: Response) => {
  const idx = parseInt(req.params['index']!, 10);
  const parsed = sessionUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' });
  }

  const weekStartDate = getWeekStartDate();
  const plan = await StudyPlanModel.findOne({ userId: req.user!._id.toString(), weekStartDate });
  if (!plan) return res.status(404).json({ error: 'No plan for this week' });
  if (idx < 0 || idx >= plan.sessions.length) {
    return res.status(400).json({ error: 'Invalid session index' });
  }

  const session = plan.sessions[idx];
  Object.assign(session, parsed.data);

  if (session.googleEventId) {
    try {
      const weekStart = new Date(`${weekStartDate}T00:00:00Z`);
      const sessionDate = new Date(weekStart);
      sessionDate.setUTCDate(sessionDate.getUTCDate() + session.dayOfWeek);
      const dateStr = sessionDate.toISOString().slice(0, 10);
      const startISO = `${dateStr}T${String(session.startHour).padStart(2, '0')}:00:00Z`;
      const endISO = new Date(new Date(startISO).getTime() + session.durationMinutes * 60000).toISOString();
      await updateEvent(req.user!._id.toString(), session.googleEventId, {
        title: `Study: ${session.moduleName} — ${session.topic}`,
        start: startISO,
        end: endISO,
      });
    } catch {
      // GCal update failure is non-fatal
    }
  }

  plan.markModified('sessions');
  await plan.save();
  return res.json({ plan: plan.toJSON() });
});

// DELETE /api/planner/session/:index
router.delete('/session/:index', async (req: Request, res: Response) => {
  const idx = parseInt(req.params['index']!, 10);

  const weekStartDate = getWeekStartDate();
  const plan = await StudyPlanModel.findOne({ userId: req.user!._id.toString(), weekStartDate });
  if (!plan) return res.status(404).json({ error: 'No plan for this week' });
  if (idx < 0 || idx >= plan.sessions.length) {
    return res.status(400).json({ error: 'Invalid session index' });
  }

  const session = plan.sessions[idx];
  if (session.googleEventId) {
    try {
      await deleteEvent(req.user!._id.toString(), session.googleEventId);
    } catch {
      // GCal delete failure is non-fatal
    }
  }

  plan.sessions.splice(idx, 1);
  plan.totalPlannedMinutes = plan.sessions.reduce((s, r) => s + r.durationMinutes, 0);
  plan.markModified('sessions');
  await plan.save();
  return res.json({ plan: plan.toJSON() });
});

export default router;
