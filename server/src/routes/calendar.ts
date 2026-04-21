import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/requireAuth';
import { UserModel } from '../models/User';
import {
  getAuthUrl,
  handleCallback,
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent,
} from '../services/googleCalendar';

const router = Router();
router.use(requireAuth);

// GET /api/calendar/connect
router.get('/connect', (_req: Request, res: Response) => {
  return res.json({ url: getAuthUrl() });
});

// GET /api/calendar/callback — Google redirects here after consent
router.get('/callback', async (req: Request, res: Response) => {
  const { code } = req.query;
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Missing OAuth code' });
  }

  try {
    await handleCallback(code, req.user!._id.toString());
  } catch (err) {
    console.error('Google Calendar callback error:', err);
    const origin = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';
    return res.redirect(`${origin}/dashboard?calendar=error`);
  }

  const origin = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';
  return res.redirect(`${origin}/dashboard?calendar=connected`);
});

// POST /api/calendar/disconnect
router.post('/disconnect', async (req: Request, res: Response) => {
  await UserModel.findByIdAndUpdate(req.user!._id, {
    $set: {
      googleCalendarConnected: false,
      'googleTokens.accessToken': null,
      'googleTokens.refreshToken': null,
      'googleTokens.expiresAt': null,
    },
  });
  return res.json({ disconnected: true });
});

// GET /api/calendar/events?start=ISO&end=ISO
router.get('/events', async (req: Request, res: Response) => {
  const { start, end } = req.query;
  if (!start || !end || typeof start !== 'string' || typeof end !== 'string') {
    return res.status(400).json({ error: 'start and end query params are required' });
  }

  const user = await UserModel.findById(req.user!._id);
  if (!user?.googleCalendarConnected) {
    return res.status(400).json({ error: 'Google Calendar not connected' });
  }

  try {
    const events = await getEvents(req.user!._id.toString(), start, end);
    return res.json({ events });
  } catch (err) {
    const e = err as Error & { reconnectRequired?: boolean };
    if (e.reconnectRequired) {
      return res.status(401).json({ error: e.message, reconnectRequired: true });
    }
    console.error('getEvents error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

const eventSchema = z.object({
  title: z.string().min(1),
  start: z.string().datetime(),
  end: z.string().datetime(),
  description: z.string().optional(),
});

// POST /api/calendar/event
router.post('/event', async (req: Request, res: Response) => {
  const parsed = eventSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' });
  }

  try {
    const eventId = await createEvent(req.user!._id.toString(), parsed.data);
    return res.status(201).json({ eventId });
  } catch (err) {
    console.error('createEvent error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/calendar/event/:eventId
router.put('/event/:eventId', async (req: Request, res: Response) => {
  const updates = req.body as { title?: string; start?: string; end?: string };
  try {
    await updateEvent(req.user!._id.toString(), req.params['eventId']!, updates);
    return res.json({ updated: true });
  } catch (err) {
    console.error('updateEvent error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/calendar/event/:eventId
router.delete('/event/:eventId', async (req: Request, res: Response) => {
  try {
    await deleteEvent(req.user!._id.toString(), req.params['eventId']!);
    return res.json({ deleted: true });
  } catch (err) {
    console.error('deleteEvent error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
