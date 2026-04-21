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
  const userId = req.user!._id.toString();
  const filter: Record<string, unknown> = { userId };
  if (req.query['status']) filter['status'] = req.query['status'];

  try {
    const tasks = await TaskModel.find(filter).sort({ order: 1, createdAt: -1 });
    const goalIds = tasks.filter(t => t.isGoal).map(t => t._id);

    let subtaskCounts: Map<string, { total: number; completed: number }> = new Map();
    if (goalIds.length > 0) {
      const counts = await TaskModel.aggregate([
        { $match: { userId, parentId: { $in: goalIds } } },
        {
          $group: {
            _id: '$parentId',
            total: { $sum: 1 },
            completed: { $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] } },
          },
        },
      ]);
      subtaskCounts = new Map(counts.map(c => [c._id.toString(), { total: c.total, completed: c.completed }]));
    }

    const result = tasks.map(t => {
      const json = t.toJSON() as Record<string, unknown>;
      if (t.isGoal) {
        const counts = subtaskCounts.get(t._id.toString()) ?? { total: 0, completed: 0 };
        json['subtaskCount'] = counts.total;
        json['completedSubtaskCount'] = counts.completed;
      }
      return json;
    });

    return res.json({ tasks: result });
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
