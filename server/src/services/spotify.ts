const SPOTIFY_ACCOUNTS = 'https://accounts.spotify.com';
const SPOTIFY_API = 'https://api.spotify.com/v1';
const SCOPES = 'user-read-currently-playing user-read-playback-state';

function credentials(): string {
  return Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
  ).toString('base64');
}

export function getSpotifyAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: process.env.SPOTIFY_CLIENT_ID ?? '',
    response_type: 'code',
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI ?? '',
    scope: SCOPES,
  });
  return `${SPOTIFY_ACCOUNTS}/authorize?${params}`;
}

export async function exchangeSpotifyCode(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}> {
  const res = await fetch(`${SPOTIFY_ACCOUNTS}/api/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials()}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.SPOTIFY_REDIRECT_URI ?? '',
    }).toString(),
  });
  if (!res.ok) throw new Error('Spotify token exchange failed');
  const d = await res.json() as { access_token: string; refresh_token: string; expires_in: number };
  return {
    accessToken: d.access_token,
    refreshToken: d.refresh_token,
    expiresAt: Date.now() + d.expires_in * 1000,
  };
}

export async function refreshSpotifyToken(refreshToken: string): Promise<{
  accessToken: string;
  expiresAt: number;
}> {
  const res = await fetch(`${SPOTIFY_ACCOUNTS}/api/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials()}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }).toString(),
  });
  if (!res.ok) throw new Error('Spotify token refresh failed');
  const d = await res.json() as { access_token: string; expires_in: number };
  return {
    accessToken: d.access_token,
    expiresAt: Date.now() + d.expires_in * 1000,
  };
}

export interface SpotifyTrack {
  isPlaying: boolean;
  trackName: string;
  artistName: string;
  albumArtUrl: string | null;
  trackUrl: string;
}

export async function getNowPlaying(accessToken: string): Promise<SpotifyTrack | null> {
  const res = await fetch(`${SPOTIFY_API}/me/player/currently-playing`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (res.status === 204 || res.status === 404) return null;
  if (!res.ok) throw new Error('Spotify now-playing request failed');

  const d = await res.json() as {
    is_playing: boolean;
    item: {
      name: string;
      artists: { name: string }[];
      album: { images: { url: string; width: number }[] };
      external_urls: { spotify: string };
    } | null;
  };

  if (!d.item) return null;

  const smallestImage = [...d.item.album.images]
    .sort((a, b) => a.width - b.width)
    .find(img => img.width >= 48) ?? d.item.album.images[0] ?? null;

  return {
    isPlaying: d.is_playing,
    trackName: d.item.name,
    artistName: d.item.artists.map(a => a.name).join(', '),
    albumArtUrl: smallestImage?.url ?? null,
    trackUrl: d.item.external_urls.spotify,
  };
}
