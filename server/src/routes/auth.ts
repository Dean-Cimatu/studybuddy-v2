import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { UserModel } from '../models/User';
import { requireAuth } from '../middleware/requireAuth';

const router = Router();

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  displayName: z.string().min(1, 'Display name is required'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET env var is not set');
  return secret;
}

function setAuthCookie(res: Response, token: string): void {
  res.cookie('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 1000, // 1 hour in ms
    path: '/',
  });
}

function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, getJwtSecret(), { expiresIn: '1h' });
}

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' });
  }

  const { email, password, displayName } = parsed.data;

  try {
    const existing = await UserModel.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await UserModel.create({ email, displayName, passwordHash });

    setAuthCookie(res, signToken(user.id as string));
    return res.status(201).json({ user: user.toJSON() });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' });
  }

  const { email, password } = parsed.data;

  try {
    const user = await UserModel.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    setAuthCookie(res, signToken(user.id as string));
    return res.json({ user: user.toJSON() });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/logout
router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie('auth_token', { path: '/' });
  return res.sendStatus(204);
});

// GET /api/auth/me
router.get('/me', async (req: Request, res: Response) => {
  const token = (req.cookies as Record<string, string | undefined>)['auth_token'];
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const payload = jwt.verify(token, getJwtSecret()) as { sub: string };
    const user = await UserModel.findById(payload.sub);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    return res.json({ user: user.toJSON() });
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
});

const profileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  studyGoalHours: z.number().min(1).max(80).optional(),
  discipline: z.string().max(100).optional(),
  university: z.string().max(150).optional(),
  yearOfStudy: z.string().max(20).optional(),
  bio: z.string().max(300).optional(),
  linkedinUrl: z.string().url().max(200).optional().or(z.literal('')),
  githubUrl: z.string().url().max(200).optional().or(z.literal('')),
  studyLanguage: z.string().max(10).optional(),
  preferredSessionLength: z.union([z.literal(25), z.literal(50), z.literal(90)]).optional(),
  preferredStudyTime: z.enum(['morning', 'afternoon', 'evening', 'no-preference']).optional(),
  themeAccent: z.enum(['blue', 'green', 'purple', 'amber']).optional(),
});

// PUT /api/auth/profile
router.put('/profile', requireAuth, async (req: Request, res: Response) => {
  const parsed = profileSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' });
  }

  const { name, ...profileFields } = parsed.data;
  const updates: Record<string, unknown> = { ...profileFields };
  if (name) updates['displayName'] = name;

  try {
    const user = await UserModel.findByIdAndUpdate(
      req.user!._id,
      { $set: updates },
      { returnDocument: 'after', runValidators: true }
    );
    return res.json({ user: user!.toJSON() });
  } catch (err) {
    console.error('Profile update error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
