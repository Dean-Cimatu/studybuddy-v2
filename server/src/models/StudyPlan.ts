import mongoose, { Document, Schema } from 'mongoose';
import type { StudyPlan, StudyPlanSession } from '@studybuddy/shared';

export interface StudyPlanDocument extends Omit<StudyPlan, '_id'>, Document {}

const sessionSchema = new Schema<StudyPlanSession>(
  {
    dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
    startHour: { type: Number, required: true, min: 0, max: 23 },
    durationMinutes: { type: Number, required: true },
    moduleId: { type: Schema.Types.ObjectId, ref: 'Module', default: null },
    moduleName: { type: String, required: true },
    moduleColour: { type: String, default: '#3B82F6' },
    topic: { type: String, required: true },
    googleEventId: { type: String, default: null },
  },
  { _id: false }
);

const studyPlanSchema = new Schema<StudyPlanDocument>(
  {
    userId: { type: String, required: true },
    weekStartDate: { type: String, required: true },
    sessions: { type: [sessionSchema], default: [] },
    totalPlannedMinutes: { type: Number, default: 0 },
    generatedAt: { type: String, required: true },
  },
  {
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        ret['_id'] = (ret['_id'] as { toString(): string }).toString();
        delete ret['__v'];
        return ret;
      },
    },
  }
);

studyPlanSchema.index({ userId: 1, weekStartDate: 1 }, { unique: true });

export const StudyPlanModel = mongoose.model<StudyPlanDocument>('StudyPlan', studyPlanSchema);
