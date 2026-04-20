import mongoose, { Document, Schema } from 'mongoose';

export interface StudySessionDocument extends Document {
  userId: mongoose.Types.ObjectId;
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
  type: 'pomodoro' | 'free';
  moduleTag: string | null;
  moduleName: string | null;
  notes: string | null;
}

const studySessionSchema = new Schema<StudySessionDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    durationMinutes: { type: Number, required: true, min: 1, max: 480 },
    type: { type: String, enum: ['pomodoro', 'free'], required: true },
    moduleTag: { type: String, default: null },
    moduleName: { type: String, default: null },
    notes: { type: String, default: null },
  },
  { timestamps: true }
);

studySessionSchema.index({ userId: 1, startTime: -1 });

export const StudySessionModel = mongoose.model<StudySessionDocument>('StudySession', studySessionSchema);
