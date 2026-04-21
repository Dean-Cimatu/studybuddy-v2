import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { TaskModel } from '../models/Task';
import { ModuleModel } from '../models/Module';
import { requireAuth } from '../middleware/requireAuth';
import { breakdownGoal } from '../ai/claude';
import { postFeedItem } from '../utils/feed';

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
      const json = t.toJSON() as unknown as Record<string, unknown>;
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

    if (task.parentId && parsed.data.status === 'done') {
      const parentId = task.parentId;
      const [total, done] = await Promise.all([
        TaskModel.countDocuments({ parentId }),
        TaskModel.countDocuments({ parentId, status: 'done' }),
      ]);
      if (total > 0 && done === total) {
        const goal = await TaskModel.findById(parentId);
        if (goal) {
          await postFeedItem(req.user!._id.toString(), req.user!.displayName, 'goal-progress', {
            goalTitle: goal.title,
            percentage: 100,
          }).catch(() => {});
        }
      }
    }

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

// ── POST /api/tasks/breakdown ─────────────────────────────────────────────────

const breakdownSchema = z.object({
  title: z.string().min(1).max(200),
  moduleId: z.string().optional(),
  deadline: z.string().datetime().optional(),
});

router.post('/breakdown', async (req: Request, res: Response) => {
  const parsed = breakdownSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' });
  }

  const { title, moduleId, deadline } = parsed.data;
  const userId = req.user!._id.toString();

  let topics: string[] | undefined;
  let language: string | undefined;
  let moduleTag: string | undefined;

  if (moduleId) {
    const mod = await ModuleModel.findOne({ _id: moduleId, userId }).catch(() => null);
    if (mod) {
      topics = mod.topics.length ? mod.topics : undefined;
      language = mod.language;
      moduleTag = mod.name;
    }
  }

  let items;
  try {
    items = await breakdownGoal({ title, topics, deadline, language });
  } catch {
    return res.status(422).json({ error: 'AI could not generate a valid breakdown. Please try again.' });
  }

  const now = new Date();

  const goal = await TaskModel.create({
    userId,
    title,
    isGoal: true,
    moduleId: moduleId ?? null,
    moduleTag: moduleTag ?? null,
    dueDate: deadline ? deadline.slice(0, 10) : undefined,
    order: 0,
  });

  const subtasks = await TaskModel.insertMany(
    items.map((item, i) => {
      const due = new Date(now);
      due.setDate(due.getDate() + (item.weekNumber - 1) * 7);
      return {
        userId,
        title: item.title,
        estimatedMinutes: item.estimatedMinutes,
        parentId: goal._id,
        moduleId: moduleId ?? null,
        moduleTag: moduleTag ?? null,
        order: i,
        dueDate: due.toISOString().slice(0, 10),
        isGoal: false,
      };
    })
  );

  return res.status(201).json({
    goal: goal.toJSON(),
    subtasks: subtasks.map(t => t.toJSON()),
    count: subtasks.length,
  });
});

export default router;
