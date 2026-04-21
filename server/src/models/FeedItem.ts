import mongoose, { Document, Schema } from 'mongoose';

export type FeedItemType =
  | 'session-complete'
  | 'streak-milestone'
  | 'achievement-earned'
  | 'goal-met'
  | 'goal-progress'
  | 'plan-generated';

export interface IFeedItemReaction {
  userId: mongoose.Types.ObjectId;
  createdAt: Date;
}

export interface IFeedItem extends Document {
  userId: mongoose.Types.ObjectId;
  userName: string;
  type: FeedItemType;
  data: Record<string, unknown>;
  reactions: IFeedItemReaction[];
  createdAt: Date;
}

const reactionSchema = new Schema<IFeedItemReaction>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const feedItemSchema = new Schema<IFeedItem>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  userName: { type: String, required: true },
  type: {
    type: String,
    enum: ['session-complete', 'streak-milestone', 'achievement-earned', 'goal-met', 'goal-progress', 'plan-generated'],
    required: true,
  },
  data: { type: Schema.Types.Mixed, default: {} },
  reactions: [reactionSchema],
  createdAt: { type: Date, default: Date.now, index: true },
});

export const FeedItemModel = mongoose.model<IFeedItem>('FeedItem', feedItemSchema);
