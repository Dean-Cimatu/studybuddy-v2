import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { requireAuth } from '../middleware/requireAuth';
import { generateTasksFromDescription, chatWellbeing } from '../ai/claude';
import { TaskModel } from '../models/Task';

const descriptionSchema = z.object({
  description: z.string().min(1, 'Description is required').max(1000),
});

const chatSchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().min(1) }))
    .min(1)
    .max(20),
});

export function createAiRouter(maxRequestsPerHour?: number) {
  const limit = maxRequestsPerHour ?? parseInt(process.env.AI_RATE_LIMIT_MAX ?? '20', 10);

  const router = Router();
  router.use(requireAuth);

  router.use(
    rateLimit({
      windowMs: 60 * 60 * 1000,
      limit,
      keyGenerator: req => (req as Request).user!._id.toString(),
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      handler: (_req, res) => {
        res.status(429).json({ error: 'Too many AI requests. Please try again later.' });
      },
    })
  );

  // POST /api/ai/generate-tasks
  router.post('/generate-tasks', async (req: Request, res: Response) => {
    const parsed = descriptionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' });
    }

    try {
      const taskInputs = await generateTasksFromDescription(
        parsed.data.description,
        req.user!._id.toString()
      );
      const docs = await TaskModel.insertMany(
        taskInputs.map(t => ({ ...t, userId: req.user!._id.toString() }))
      );
      return res.status(201).json({ tasks: docs.map(d => d.toJSON()) });
    } catch (err) {
      console.error('Task generation error:', err);
      return res.status(500).json({ error: err instanceof Error ? err.message : 'AI generation failed' });
    }
  });

  // POST /api/ai/chat
  router.post('/chat', async (req: Request, res: Response) => {
    const parsed = chatSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' });
    }

    try {
      const result = await chatWellbeing(parsed.data.messages);
      return res.json(result);
    } catch (err) {
      console.error('Wellbeing chat error:', err);
      return res.status(500).json({ error: 'AI chat failed' });
    }
  });

  return router;
}

export default createAiRouter();
