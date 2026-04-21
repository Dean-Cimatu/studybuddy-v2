import mongoose, { Document, Schema } from 'mongoose';

export interface IStudyGroupMember {
  userId: mongoose.Types.ObjectId;
  name: string;
  joinedAt: Date;
}

export interface IStudyGroup extends Document {
  name: string;
  createdBy: mongoose.Types.ObjectId;
  members: IStudyGroupMember[];
  inviteCode: string;
  createdAt: Date;
}

function generateInviteCode(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

const memberSchema = new Schema<IStudyGroupMember>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, required: true },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const studyGroupSchema = new Schema<IStudyGroup>(
  {
    name: { type: String, required: true, maxlength: 100 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    members: [memberSchema],
    inviteCode: { type: String, unique: true, required: true, default: generateInviteCode },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

studyGroupSchema.index({ 'members.userId': 1 });


export const StudyGroupModel = mongoose.model<IStudyGroup>('StudyGroup', studyGroupSchema);
