import { google, calendar_v3 } from 'googleapis';
import { UserModel } from '../models/User';

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  source: 'google';
}

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
];

export function getAuthUrl(): string {
  return getOAuth2Client().generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
    state: 'gcal-connect',
  });
}

export async function handleCallback(code: string, userId: string): Promise<void> {
  const client = getOAuth2Client();
  const { tokens } = await client.getToken(code);
  await UserModel.findByIdAndUpdate(userId, {
    $set: {
      googleCalendarConnected: true,
      'googleTokens.accessToken': tokens.access_token ?? null,
      'googleTokens.refreshToken': tokens.refresh_token ?? null,
      'googleTokens.expiresAt': tokens.expiry_date ?? null,
    },
  });
}

async function buildClient(userId: string): Promise<calendar_v3.Calendar> {
  const user = await UserModel.findById(userId);
  if (!user?.googleCalendarConnected || !user.googleTokens?.accessToken) {
    throw new Error('Google Calendar not connected');
  }

  const client = getOAuth2Client();
  client.setCredentials({
    access_token: user.googleTokens.accessToken,
    refresh_token: user.googleTokens.refreshToken ?? undefined,
    expiry_date: user.googleTokens.expiresAt ?? undefined,
  });

  const expiresAt = user.googleTokens.expiresAt;
  if (expiresAt && Date.now() > expiresAt - 60_000) {
    try {
      const { credentials } = await client.refreshAccessToken();
      await UserModel.findByIdAndUpdate(userId, {
        $set: {
          'googleTokens.accessToken': credentials.access_token ?? null,
          'googleTokens.expiresAt': credentials.expiry_date ?? null,
        },
      });
      client.setCredentials(credentials);
    } catch {
      await UserModel.findByIdAndUpdate(userId, { $set: { googleCalendarConnected: false } });
      const err = new Error('Google Calendar token invalid. Please reconnect.');
      (err as Error & { reconnectRequired: boolean }).reconnectRequired = true;
      throw err;
    }
  }

  return google.calendar({ version: 'v3', auth: client });
}

export async function getEvents(userId: string, timeMin: string, timeMax: string): Promise<CalendarEvent[]> {
  const cal = await buildClient(userId);
  const res = await cal.events.list({
    calendarId: 'primary',
    timeMin,
    timeMax,
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 250,
  });

  return (res.data.items ?? []).map(ev => ({
    id: ev.id ?? '',
    title: ev.summary ?? '(No title)',
    start: ev.start?.dateTime ?? ev.start?.date ?? '',
    end: ev.end?.dateTime ?? ev.end?.date ?? '',
    allDay: !ev.start?.dateTime,
    source: 'google' as const,
  }));
}

export async function createEvent(
  userId: string,
  data: { title: string; start: string; end: string; description?: string }
): Promise<string> {
  const cal = await buildClient(userId);
  const res = await cal.events.insert({
    calendarId: 'primary',
    requestBody: {
      summary: data.title,
      description: data.description,
      start: { dateTime: data.start },
      end: { dateTime: data.end },
    },
  });
  return res.data.id ?? '';
}

export async function updateEvent(
  userId: string,
  eventId: string,
  updates: { title?: string; start?: string; end?: string }
): Promise<void> {
  const cal = await buildClient(userId);
  await cal.events.patch({
    calendarId: 'primary',
    eventId,
    requestBody: {
      ...(updates.title !== undefined && { summary: updates.title }),
      ...(updates.start !== undefined && { start: { dateTime: updates.start } }),
      ...(updates.end !== undefined && { end: { dateTime: updates.end } }),
    },
  });
}

export async function deleteEvent(userId: string, eventId: string): Promise<void> {
  const cal = await buildClient(userId);
  await cal.events.delete({ calendarId: 'primary', eventId });
}
