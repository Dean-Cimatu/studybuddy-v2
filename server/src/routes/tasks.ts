import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { TaskModel } from '../models/Task';
import { requireAuth } from '../middleware/requireAuth';

const router = Router();
router.use(requireAuth);

const createSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  estimatedMinutes: z.number().int().positive().optional(),
  priority: z.enum(['low', 'med', 'high']).optional(),
  status: z.enum(['todo', 'doing', 'done']).optional(),
});

const updateSchema = createSchema.partial();

// GET /api/tasks
router.get('/', async (req: Request, res: Response) => {
  const filter: Record<string, unknown> = { userId: req.user!._id.toString() };
  if (req.query['status']) filter['status'] = req.query['status'];

  try {
    const tasks = await TaskModel.find(filter).sort({ createdAt: -1 });
    return res.json({ tasks: tasks.map(t => t.toJSON()) });
  } catch (err) {
    console.error('List tasks error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/tasks
router.post('/', async (req: Request, res: Response) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' });
  }

  try {
    const task = await TaskModel.create({ ...parsed.data, userId: req.user!._id.toString() });
    return res.status(201).json({ task: task.toJSON() });
  } catch (err) {
    console.error('Create task error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/tasks/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const task = await TaskModel.findOne({ _id: req.params['id'], userId: req.user!._id.toString() });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    return res.json({ task: task.toJSON() });
  } catch {
    return res.status(404).json({ error: 'Task not found' });
  }
});

// PATCH /api/tasks/:id
router.patch('/:id', async (req: Request, res: Response) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' });
  }

  try {
    const task = await TaskModel.findOneAndUpdate(
      { _id: req.params['id'], userId: req.user!._id.toString() },
      { $set: parsed.data },
      { returnDocument: 'after' }
    );
    if (!task) return res.status(404).json({ error: 'Task not found' });
    return res.json({ task: task.toJSON() });
  } catch {
    return res.status(404).json({ error: 'Task not found' });
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const task = await TaskModel.findOneAndDelete({ _id: req.params['id'], userId: req.user!._id.toString() });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    return res.sendStatus(204);
  } catch {
    return res.status(404).json({ error: 'Task not found' });
  }
});

export default router;
