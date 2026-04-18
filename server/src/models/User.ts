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
