import { FeedItemModel, type FeedItemType } from '../models/FeedItem';

export async function postFeedItem(
  userId: string,
  userName: string,
  type: FeedItemType,
  data: Record<string, unknown>
): Promise<void> {
  await FeedItemModel.create({ userId, userName, type, data });
}

export async function upsertWeeklyFeedItem(
  userId: string,
  userName: string,
  type: FeedItemType,
  weekOf: string,
  data: Record<string, unknown>
): Promise<void> {
  await FeedItemModel.findOneAndUpdate(
    { userId, type, 'data.weekOf': weekOf },
    { $set: { userName, data: { ...data, weekOf }, createdAt: new Date() } },
    { upsert: true }
  );
}
