import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/requireAuth';
import { ModuleModel } from '../models/Module';

const router = Router();

const hexColour = /^#[0-9A-Fa-f]{6}$/;

const moduleSchema = z.object({
  name: z.string().min(1).max(50),
  fullName: z.string().max(100).optional(),
  colour: z.string().regex(hexColour, 'Invalid hex colour').optional(),
  language: z.string().max(10).optional(),
  university: z.string().max(120).optional(),
  topics: z.array(z.string()).optional(),
  weeklyTargetHours: z.number().min(0).max(40).optional(),
});

const updateSchema = moduleSchema.extend({
  name: z.string().min(1).max(50).optional(),
  notes: z.string().max(2000).nullable().optional(),
  archived: z.boolean().optional(),
  shareWithCommunity: z.boolean().optional(),
});

// GET /api/modules/community?university=X&code=Y
router.get('/community', requireAuth, async (req: Request, res: Response) => {
  const university = (req.query.university as string | undefined)?.trim();
  const code = (req.query.code as string | undefined)?.trim();
  if (!university || !code) {
    return res.status(400).json({ error: 'university and code are required' });
  }
  try {
    const matches = await ModuleModel.find({
      name: { $regex: new RegExp(`^${code}$`, 'i') },
      university: { $regex: new RegExp(`^${university}$`, 'i') },
      shareWithCommunity: true,
      userId: { $ne: req.user!._id },
    }).select('resources topics fullName').lean();

    const resources = matches.flatMap(m => m.resources);
    const topicSet = new Set<string>();
    for (const m of matches) for (const t of m.topics) topicSet.add(t);

    return res.json({
      contributorCount: matches.length,
      resources,
      topics: Array.from(topicSet),
      fullName: matches.find(m => m.fullName)?.fullName ?? '',
    });
  } catch (err) {
    console.error('Community modules error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/modules
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const modules = await ModuleModel.find({ userId: req.user!._id });
    modules.sort((a, b) => {
      const aNext = a.deadlines.filter(d => !d.completed).sort((x, y) => +x.date - +y.date)[0];
      const bNext = b.deadlines.filter(d => !d.completed).sort((x, y) => +x.date - +y.date)[0];
      if (!aNext && !bNext) return 0;
      if (!aNext) return 1;
      if (!bNext) return -1;
      return +aNext.date - +bNext.date;
    });
    return res.json({ modules });
  } catch (err) {
    console.error('Get modules error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/modules
router.post('/', requireAuth, async (req: Request, res: Response) => {
  const parsed = moduleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' });
  }

  try {
    const module = await ModuleModel.create({ userId: req.user!._id, ...parsed.data });
    return res.status(201).json({ module });
  } catch (err) {
    console.error('Create module error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/modules/:id
router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' });
  }

  try {
    const module = await ModuleModel.findOneAndUpdate(
      { _id: req.params.id, userId: req.user!._id },
      { $set: parsed.data },
      { returnDocument: 'after', runValidators: true }
    );
    if (!module) return res.status(404).json({ error: 'Module not found' });
    return res.json({ module });
  } catch (err) {
    console.error('Update module error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/modules/:id
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const module = await ModuleModel.findOneAndDelete({ _id: req.params.id, userId: req.user!._id });
    if (!module) return res.status(404).json({ error: 'Module not found' });
    return res.json({ deleted: true });
  } catch (err) {
    console.error('Delete module error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

const deadlineSchema = z.object({
  title: z.string().min(1),
  date: z.string().datetime(),
  type: z.enum(['exam', 'coursework', 'presentation', 'lab', 'other']),
  weight: z.number().min(0).max(100).optional(),
  format: z.string().optional(),
});

const deadlineUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  date: z.string().datetime().optional(),
  type: z.enum(['exam', 'coursework', 'presentation', 'lab', 'other']).optional(),
  weight: z.number().min(0).max(100).nullable().optional(),
  format: z.string().nullable().optional(),
  completed: z.boolean().optional(),
});

// POST /api/modules/:id/deadline
router.post('/:id/deadline', requireAuth, async (req: Request, res: Response) => {
  const parsed = deadlineSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' });
  }

  try {
    const module = await ModuleModel.findOne({ _id: req.params.id, userId: req.user!._id });
    if (!module) return res.status(404).json({ error: 'Module not found' });

    module.deadlines.push({
      title: parsed.data.title,
      date: new Date(parsed.data.date),
      type: parsed.data.type,
      weight: parsed.data.weight ?? null,
      format: parsed.data.format ?? null,
      completed: false,
    } as never);
    await module.save();
    return res.status(201).json({ module });
  } catch (err) {
    console.error('Add deadline error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/modules/:id/deadline/:deadlineId
router.put('/:id/deadline/:deadlineId', requireAuth, async (req: Request, res: Response) => {
  const parsed = deadlineUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' });
  }

  try {
    const module = await ModuleModel.findOne({ _id: req.params.id, userId: req.user!._id });
    if (!module) return res.status(404).json({ error: 'Module not found' });

    const deadline = module.deadlines.find(d => d._id.toString() === req.params.deadlineId);
    if (!deadline) return res.status(404).json({ error: 'Deadline not found' });

    const { date, ...rest } = parsed.data;
    Object.assign(deadline, rest);
    if (date) deadline.date = new Date(date);
    await module.save();
    return res.json({ module });
  } catch (err) {
    console.error('Update deadline error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/modules/:id/deadline/:deadlineId
router.delete('/:id/deadline/:deadlineId', requireAuth, async (req: Request, res: Response) => {
  try {
    const module = await ModuleModel.findOne({ _id: req.params.id, userId: req.user!._id });
    if (!module) return res.status(404).json({ error: 'Module not found' });

    const before = module.deadlines.length;
    module.deadlines = module.deadlines.filter(d => d._id.toString() !== req.params.deadlineId) as never;
    if (module.deadlines.length === before) return res.status(404).json({ error: 'Deadline not found' });

    await module.save();
    return res.json({ module });
  } catch (err) {
    console.error('Delete deadline error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

const topicProgressSchema = z.object({
  topic: z.string().min(1).max(100),
  confidence: z.enum(['not-started', 'in-progress', 'confident']),
});

// PATCH /api/modules/:id/topic-progress
router.patch('/:id/topic-progress', requireAuth, async (req: Request, res: Response) => {
  const parsed = topicProgressSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' });
  }

  try {
    const module = await ModuleModel.findOne({ _id: req.params.id, userId: req.user!._id });
    if (!module) return res.status(404).json({ error: 'Module not found' });

    module.topicProgress.set(parsed.data.topic, parsed.data.confidence);
    await module.save();
    return res.json({ module });
  } catch (err) {
    console.error('Topic progress error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

const resourceSchema = z.object({
  type: z.enum(['youtube', 'url', 'pdf', 'book', 'note']),
  title: z.string().min(1).max(200),
  url: z.string().url().max(2000),
});

// POST /api/modules/:id/resource
router.post('/:id/resource', requireAuth, async (req: Request, res: Response) => {
  const parsed = resourceSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' });
  }
  try {
    const module = await ModuleModel.findOne({ _id: req.params.id, userId: req.user!._id });
    if (!module) return res.status(404).json({ error: 'Module not found' });
    module.resources.push({ ...parsed.data, addedAt: new Date() } as never);
    await module.save();
    return res.status(201).json({ module });
  } catch (err) {
    console.error('Add resource error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/modules/:id/resource/:resourceId
router.delete('/:id/resource/:resourceId', requireAuth, async (req: Request, res: Response) => {
  try {
    const module = await ModuleModel.findOne({ _id: req.params.id, userId: req.user!._id });
    if (!module) return res.status(404).json({ error: 'Module not found' });
    const before = module.resources.length;
    module.resources = module.resources.filter(r => r._id.toString() !== req.params.resourceId) as never;
    if (module.resources.length === before) return res.status(404).json({ error: 'Resource not found' });
    await module.save();
    return res.json({ module });
  } catch (err) {
    console.error('Delete resource error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
