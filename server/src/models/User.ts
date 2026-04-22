import mongoose, { Document, Schema } from 'mongoose';
import type { User } from '@studybuddy/shared';

export interface OAuthTokens {
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
}

export interface UserDocument extends Omit<User, 'id' | 'createdAt'>, Document {
  passwordHash: string;
  googleTokens: OAuthTokens;
  spotifyTokens: OAuthTokens;
  spotifyConnected: boolean;
  university: string;
  yearOfStudy: string;
  bio: string;
  linkedinUrl: string;
  githubUrl: string;
}

const userSchema = new Schema<UserDocument>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    displayName: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true },
    studyGoalHours: { type: Number, default: 15 },
    discipline: { type: String, default: '' },
    university: { type: String, default: '' },
    yearOfStudy: { type: String, default: '' },
    bio: { type: String, default: '', maxlength: 300 },
    linkedinUrl: { type: String, default: '' },
    githubUrl: { type: String, default: '' },
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
    googleCalendarConnected: { type: Boolean, default: false },
    googleTokens: {
      accessToken: { type: String, default: null },
      refreshToken: { type: String, default: null },
      expiresAt: { type: Number, default: null },
    },
    spotifyConnected: { type: Boolean, default: false },
    spotifyTokens: {
      accessToken: { type: String, default: null },
      refreshToken: { type: String, default: null },
      expiresAt: { type: Number, default: null },
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        ret['id'] = (ret['_id'] as { toString(): string }).toString();
        delete ret['_id'];
        delete ret['__v'];
        delete ret['passwordHash'];
        delete ret['googleTokens'];
        return ret;
      },
    },
  }
);

export const UserModel = mongoose.model<UserDocument>('User', userSchema);
