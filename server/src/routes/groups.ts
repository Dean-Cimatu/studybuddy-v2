import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { requireAuth } from '../middleware/requireAuth';
import { StudyGroupModel } from '../models/StudyGroup';
import { FeedItemModel } from '../models/FeedItem';
import { UserModel } from '../models/User';
import { StudySessionModel } from '../models/StudySession';
import { getWeekStartUTC } from '../utils/studyStats';
import { awardAchievement } from '../utils/achievements';
import { refreshSpotifyToken, getNowPlaying, type SpotifyTrack } from '../services/spotify';

const router = Router();
router.use(requireAuth);

// GET /api/groups
router.get('/', async (req: Request, res: Response) => {
  const userId = req.user!._id;
  const groups = await StudyGroupModel.find({ 'members.userId': userId });
  return res.json({ groups: groups.map(g => g.toJSON()) });
});

// POST /api/groups
router.post('/', async (req: Request, res: Response) => {
  const { name } = req.body as { name?: string };
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Name is required' });
  }
  if (name.trim().length > 100) {
    return res.status(400).json({ error: 'Name too long' });
  }

  const userId = req.user!._id;
  const existing = await StudyGroupModel.countDocuments({ 'members.userId': userId });
  if (existing >= 5) {
    return res.status(400).json({ error: 'You can be in at most 5 groups' });
  }

  const group = await StudyGroupModel.create({
    name: name.trim(),
    createdBy: userId,
    members: [{ userId, name: req.user!.displayName, joinedAt: new Date() }],
  });

  return res.status(201).json({ group: group.toJSON() });
});

// GET /api/groups/:id
router.get('/:id', async (req: Request, res: Response) => {
  const userId = req.user!._id;
  let group;
  try {
    group = await StudyGroupModel.findById(req.params['id']);
  } catch {
    return res.status(404).json({ error: 'Group not found' });
  }
  if (!group) return res.status(404).json({ error: 'Group not found' });

  const isMember = group.members.some(m => m.userId.toString() === userId.toString());
  if (!isMember) return res.status(403).json({ error: 'Not a member of this group' });

  const memberUserIds = group.members.map(m => m.userId);
  const weekStart = getWeekStartUTC();
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

  const [weekSessions, recentSessions, users] = await Promise.all([
    StudySessionModel.find({ userId: { $in: memberUserIds }, startTime: { $gte: weekStart } }),
    StudySessionModel.find({ userId: { $in: memberUserIds }, startTime: { $gte: twoHoursAgo } }).sort({ startTime: -1 }),
    UserModel.find({ _id: { $in: memberUserIds } }, { streak: 1, spotifyConnected: 1, spotifyTokens: 1 }),
  ]);

  const minutesByUser: Record<string, number> = {};
  for (const s of weekSessions) {
    const uid = s.userId.toString();
    minutesByUser[uid] = (minutesByUser[uid] ?? 0) + s.durationMinutes;
  }

  const recentByUser = new Set(recentSessions.map(s => s.userId.toString()));
  const recentModuleByUser: Record<string, string | null> = {};
  for (const s of recentSessions) {
    const uid = s.userId.toString();
    if (!recentModuleByUser[uid]) {
      recentModuleByUser[uid] = s.moduleName ?? null;
    }
  }

  // Fetch Spotify now-playing for connected members in parallel
  const nowPlayingMap: Record<string, SpotifyTrack | null> = {};
  await Promise.allSettled(
    users
      .filter(u => u.spotifyConnected && u.spotifyTokens.refreshToken)
      .map(async u => {
        const uid = u._id.toString();
        try {
          const { expiresAt } = u.spotifyTokens;
          let { accessToken } = u.spotifyTokens;
          if (!accessToken || (expiresAt && Date.now() > expiresAt - 60_000)) {
            const refreshed = await refreshSpotifyToken(u.spotifyTokens.refreshToken!);
            await UserModel.findByIdAndUpdate(uid, {
              'spotifyTokens.accessToken': refreshed.accessToken,
              'spotifyTokens.expiresAt': refreshed.expiresAt,
            });
            accessToken = refreshed.accessToken;
          }
          nowPlayingMap[uid] = await getNowPlaying(accessToken!);
        } catch {
          nowPlayingMap[uid] = null;
        }
      })
  );

  const memberStats: Record<string, {
    hoursThisWeek: number;
    streak: number;
    recentlyStudied: boolean;
    currentModule: string | null;
    nowPlaying: SpotifyTrack | null;
  }> = {};

  for (const m of group.members) {
    const uid = m.userId.toString();
    const user = users.find(u => u._id.toString() === uid);
    memberStats[uid] = {
      hoursThisWeek: Math.round(((minutesByUser[uid] ?? 0) / 60) * 10) / 10,
      streak: user?.streak ?? 0,
      recentlyStudied: recentByUser.has(uid),
      currentModule: recentModuleByUser[uid] ?? null,
      nowPlaying: nowPlayingMap[uid] ?? null,
    };
  }

  return res.json({ group: group.toJSON(), memberStats });
});

// POST /api/groups/join
router.post('/join', async (req: Request, res: Response) => {
  const { inviteCode } = req.body as { inviteCode?: string };
  if (!inviteCode || typeof inviteCode !== 'string') {
    return res.status(400).json({ error: 'inviteCode is required' });
  }

  const group = await StudyGroupModel.findOne({ inviteCode: inviteCode.trim() });
  if (!group) return res.status(404).json({ error: 'Invalid invite code' });

  const userId = req.user!._id;
  const alreadyMember = group.members.some(m => m.userId.toString() === userId.toString());
  if (alreadyMember) return res.status(400).json({ error: 'Already a member' });

  if (group.members.length >= 20) {
    return res.status(400).json({ error: 'Group is full (max 20 members)' });
  }

  group.members.push({ userId, name: req.user!.displayName, joinedAt: new Date() });
  await group.save();
  await awardAchievement(userId.toString(), 'social-join').catch(() => {});

  return res.json({ group: group.toJSON() });
});

// POST /api/groups/:id/leave
router.post('/:id/leave', async (req: Request, res: Response) => {
  const userId = req.user!._id;
  let group;
  try {
    group = await StudyGroupModel.findById(req.params['id']);
  } catch {
    return res.status(404).json({ error: 'Group not found' });
  }
  if (!group) return res.status(404).json({ error: 'Group not found' });

  const memberIdx = group.members.findIndex(m => m.userId.toString() === userId.toString());
  if (memberIdx === -1) return res.status(400).json({ error: 'Not a member' });

  group.members.splice(memberIdx, 1);

  if (group.members.length === 0) {
    await group.deleteOne();
  } else {
    group.markModified('members');
    await group.save();
  }

  return res.json({ left: true });
});

// DELETE /api/groups/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const userId = req.user!._id;
  let group;
  try {
    group = await StudyGroupModel.findById(req.params['id']);
  } catch {
    return res.status(404).json({ error: 'Group not found' });
  }
  if (!group) return res.status(404).json({ error: 'Group not found' });

  if (group.createdBy.toString() !== userId.toString()) {
    return res.status(403).json({ error: 'Only the creator can delete this group' });
  }

  await group.deleteOne();
  return res.json({ deleted: true });
});

// GET /api/groups/:id/feed
router.get('/:id/feed', async (req: Request, res: Response) => {
  const userId = req.user!._id;
  let group;
  try {
    group = await StudyGroupModel.findById(req.params['id']);
  } catch {
    return res.status(404).json({ error: 'Group not found' });
  }
  if (!group) return res.status(404).json({ error: 'Group not found' });

  const isMember = group.members.some(m => m.userId.toString() === userId.toString());
  if (!isMember) return res.status(403).json({ error: 'Not a member of this group' });

  const memberUserIds = group.members.map(m => m.userId);
  const items = await FeedItemModel.find({ userId: { $in: memberUserIds } })
    .sort({ createdAt: -1 })
    .limit(50);

  return res.json({ items: items.map(i => i.toJSON()) });
});

// POST /api/groups/:id/feed/:itemId/react
router.post('/:id/feed/:itemId/react', async (req: Request, res: Response) => {
  const userId = req.user!._id;
  let group;
  try {
    group = await StudyGroupModel.findById(req.params['id']);
  } catch {
    return res.status(404).json({ error: 'Group not found' });
  }
  if (!group) return res.status(404).json({ error: 'Group not found' });

  const isMember = group.members.some(m => m.userId.toString() === userId.toString());
  if (!isMember) return res.status(403).json({ error: 'Not a member of this group' });

  let item;
  try {
    item = await FeedItemModel.findById(req.params['itemId']);
  } catch {
    return res.status(404).json({ error: 'Feed item not found' });
  }
  if (!item) return res.status(404).json({ error: 'Feed item not found' });

  const existingIdx = item.reactions.findIndex(r => r.userId.toString() === userId.toString());
  if (existingIdx !== -1) {
    item.reactions.splice(existingIdx, 1);
  } else {
    item.reactions.push({ userId: new mongoose.Types.ObjectId(userId.toString()), createdAt: new Date() });
  }

  item.markModified('reactions');
  await item.save();

  return res.json({ reactionCount: item.reactions.length });
});

export default router;
