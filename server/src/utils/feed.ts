import { FeedItemModel, type FeedItemType } from '../models/FeedItem';

export async function postFeedItem(
  userId: string,
  userName: string,
  type: FeedItemType,
  data: Record<string, unknown>
): Promise<void> {
  await FeedItemModel.create({ userId, userName, type, data });
}
