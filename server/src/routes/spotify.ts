import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { UserModel } from '../models/User';
import { getSpotifyAuthUrl, exchangeSpotifyCode, refreshSpotifyToken, getNowPlaying } from '../services/spotify';

const router = Router();
router.use(requireAuth);

const CLIENT = () => process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';

// GET /api/spotify/connect
router.get('/connect', (_req: Request, res: Response) => {
  return res.redirect(getSpotifyAuthUrl());
});

// GET /api/spotify/callback
router.get('/callback', async (req: Request, res: Response) => {
  const { code, error } = req.query as { code?: string; error?: string };

  if (error || !code) {
    return res.redirect(`${CLIENT()}/settings?spotify=denied`);
  }

  try {
    const tokens = await exchangeSpotifyCode(code);
    await UserModel.findByIdAndUpdate(req.user!._id, {
      spotifyConnected: true,
      'spotifyTokens.accessToken': tokens.accessToken,
      'spotifyTokens.refreshToken': tokens.refreshToken,
      'spotifyTokens.expiresAt': tokens.expiresAt,
    });
    return res.redirect(`${CLIENT()}/settings?spotify=connected`);
  } catch {
    return res.redirect(`${CLIENT()}/settings?spotify=error`);
  }
});

// GET /api/spotify/now-playing
router.get('/now-playing', async (req: Request, res: Response) => {
  const user = req.user!;
  if (!user.spotifyConnected || !user.spotifyTokens.refreshToken) {
    return res.json({ nowPlaying: null });
  }

  try {
    const { expiresAt } = user.spotifyTokens;
    let { accessToken } = user.spotifyTokens;
    if (!accessToken || (expiresAt && Date.now() > expiresAt - 60_000)) {
      const refreshed = await refreshSpotifyToken(user.spotifyTokens.refreshToken!);
      accessToken = refreshed.accessToken;
      await UserModel.findByIdAndUpdate(user._id, {
        'spotifyTokens.accessToken': refreshed.accessToken,
        'spotifyTokens.expiresAt': refreshed.expiresAt,
      });
    }
    const nowPlaying = await getNowPlaying(accessToken!);
    return res.json({ nowPlaying });
  } catch {
    return res.json({ nowPlaying: null });
  }
});

// DELETE /api/spotify/disconnect
router.delete('/disconnect', async (req: Request, res: Response) => {
  await UserModel.findByIdAndUpdate(req.user!._id, {
    spotifyConnected: false,
    'spotifyTokens.accessToken': null,
    'spotifyTokens.refreshToken': null,
    'spotifyTokens.expiresAt': null,
  });
  return res.json({ disconnected: true });
});

export default router;
