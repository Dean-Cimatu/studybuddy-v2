import mongoose, { Document, Schema } from 'mongoose';

export interface FlashcardDeckDocument extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  description: string;
  moduleId: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const deckSchema = new Schema<FlashcardDeckDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, maxlength: 100, trim: true },
    description: { type: String, default: '', maxlength: 300 },
    moduleId: { type: Schema.Types.ObjectId, ref: 'Module', default: null },
  },
  { timestamps: true }
);

deckSchema.index({ userId: 1 });

export const FlashcardDeckModel = mongoose.model<FlashcardDeckDocument>('FlashcardDeck', deckSchema);
