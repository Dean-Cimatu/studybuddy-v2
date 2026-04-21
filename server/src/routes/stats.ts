import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/requireAuth';
import { StudySessionModel } from '../models/StudySession';
import { TaskModel } from '../models/Task';
import { UserModel } from '../models/User';
import { logStudyActivity, getWeekStartUTC } from '../utils/studyStats';
import { postFeedItem } from '../utils/feed';

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
    await postFeedItem(userId, req.user!.displayName, 'session-complete', {
      durationMinutes: parsed.data.durationMinutes,
      moduleTag: parsed.data.moduleTag ?? null,
    }).catch(() => {});

    return res.status(201).json({ session });
  } catch (err) {
    console.error('Create session error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/stats/dashboard
router.get('/dashboard', requireAuth, async (req: Request, res: Response) => {
  const userId = req.user!._id;
  const userIdStr = userId.toString();

  try {
    const now = new Date();
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const weekStart = getWeekStartUTC();

    const [todaySessions, weekSessions, user, todayTasks, weekTasks] = await Promise.all([
      StudySessionModel.find({ userId, startTime: { $gte: todayStart } }),
      StudySessionModel.find({ userId, startTime: { $gte: weekStart } }),
      UserModel.findById(userId),
      TaskModel.find({ userId: userIdStr, status: 'done', updatedAt: { $gte: todayStart } }),
      TaskModel.find({ userId: userIdStr, status: 'done', updatedAt: { $gte: weekStart } }),
    ]);

    const studyMinutesToday = todaySessions.reduce((s, x) => s + x.durationMinutes, 0);
    const studyMinutesThisWeek = weekSessions.reduce((s, x) => s + x.durationMinutes, 0);
    const weeklyGoalHours = user?.studyGoalHours ?? 15;
    const weeklyGoalProgress = Math.min(100, Math.round((studyMinutesThisWeek / (weeklyGoalHours * 60)) * 100));

    return res.json({
      studyMinutesToday,
      studyMinutesThisWeek,
      totalStudyMinutes: user?.totalStudyMinutes ?? 0,
      tasksCompletedToday: todayTasks.length,
      tasksCompletedThisWeek: weekTasks.length,
      currentStreak: user?.streak ?? 0,
      longestStreak: user?.longestStreak ?? 0,
      weeklyGoalHours,
      weeklyGoalProgress,
      studyScoreThisWeek: weeklyGoalProgress,
    });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

const historyQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
});

// GET /api/stats/history
router.get('/history', requireAuth, async (req: Request, res: Response) => {
  const parsed = historyQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid query' });
  }

  const { days } = parsed.data;
  const userId = req.user!._id;

  try {
    const rangeStart = new Date();
    rangeStart.setUTCDate(rangeStart.getUTCDate() - (days - 1));
    rangeStart.setUTCHours(0, 0, 0, 0);

    const sessions = await StudySessionModel.find({ userId, startTime: { $gte: rangeStart } });

    const minutesByDate: Record<string, number> = {};
    for (const session of sessions) {
      const date = session.startTime.toISOString().slice(0, 10);
      minutesByDate[date] = (minutesByDate[date] ?? 0) + session.durationMinutes;
    }

    const result: { date: string; minutes: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - i);
      d.setUTCHours(0, 0, 0, 0);
      const dateStr = d.toISOString().slice(0, 10);
      result.push({ date: dateStr, minutes: minutesByDate[dateStr] ?? 0 });
    }

    return res.json({ history: result });
  } catch (err) {
    console.error('History stats error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
