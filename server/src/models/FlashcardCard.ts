import mongoose, { Document, Schema } from 'mongoose';

export interface FlashcardCardDocument extends Document {
  deckId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  front: string;
  back: string;
  due: Date;
  interval: number;
  easeFactor: number;
  repetitions: number;
}

const cardSchema = new Schema<FlashcardCardDocument>(
  {
    deckId: { type: Schema.Types.ObjectId, ref: 'FlashcardDeck', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    front: { type: String, required: true, maxlength: 500 },
    back: { type: String, required: true, maxlength: 1000 },
    due: { type: Date, default: () => new Date() },
    interval: { type: Number, default: 0 },
    easeFactor: { type: Number, default: 2.5 },
    repetitions: { type: Number, default: 0 },
  },
  { timestamps: true }
);

cardSchema.index({ deckId: 1 });
cardSchema.index({ userId: 1, due: 1 });

export const FlashcardCardModel = mongoose.model<FlashcardCardDocument>('FlashcardCard', cardSchema);
