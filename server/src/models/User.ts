import mongoose, { Document, Schema } from 'mongoose';
import type { User } from '@studybuddy/shared';

export interface UserDocument extends Omit<User, 'id' | 'createdAt'>, Document {
  passwordHash: string;
}

const userSchema = new Schema<UserDocument>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    displayName: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true },
    studyGoalHours: { type: Number, default: 15 },
    discipline: { type: String, default: 'Not set' },
    studyLanguage: { type: String, default: 'en' },
    preferredSessionLength: { type: Number, default: 25 },
    preferredStudyTime: { type: String, enum: ['morning', 'afternoon', 'evening', 'no-preference'], default: 'no-preference' },
    streak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    lastActiveDate: { type: String, default: null },
    totalStudyMinutes: { type: Number, default: 0 },
    achievements: { type: [String], default: [] },
    streakMilestonesAwarded: { type: [Number], default: [] },
    themeAccent: { type: String, enum: ['blue', 'green', 'purple', 'amber'], default: 'blue' },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        ret['id'] = (ret['_id'] as { toString(): string }).toString();
        delete ret['_id'];
        delete ret['__v'];
        delete ret['passwordHash'];
        return ret;
      },
    },
  }
);

export const UserModel = mongoose.model<UserDocument>('User', userSchema);
