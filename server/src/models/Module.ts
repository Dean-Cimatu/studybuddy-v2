import mongoose, { Document, Schema } from 'mongoose';

export interface ModuleDeadlineDocument {
  _id: mongoose.Types.ObjectId;
  title: string;
  date: Date;
  type: 'exam' | 'coursework' | 'presentation' | 'lab' | 'other';
  weight: number | null;
  format: string | null;
  completed: boolean;
}

export interface ModuleDocument extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  fullName: string;
  colour: string;
  language: string;
  topics: string[];
  topicProgress: Map<string, string>;
  weeklyTargetHours: number;
  deadlines: ModuleDeadlineDocument[];
  notes: string | null;
}

const deadlineSchema = new Schema<ModuleDeadlineDocument>({
  title: { type: String, required: true },
  date: { type: Date, required: true },
  type: { type: String, enum: ['exam', 'coursework', 'presentation', 'lab', 'other'], required: true },
  weight: { type: Number, default: null },
  format: { type: String, default: null },
  completed: { type: Boolean, default: false },
});

const moduleSchema = new Schema<ModuleDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, maxlength: 50 },
    fullName: { type: String, default: '' },
    colour: { type: String, default: '#3B82F6' },
    language: { type: String, default: 'en' },
    topics: { type: [String], default: [] },
    topicProgress: { type: Map, of: String, default: {} },
    weeklyTargetHours: { type: Number, default: 3, min: 0, max: 40 },
    deadlines: { type: [deadlineSchema], default: [] },
    notes: { type: String, default: null },
  },
  { timestamps: true }
);

moduleSchema.index({ userId: 1 });

export const ModuleModel = mongoose.model<ModuleDocument>('Module', moduleSchema);
