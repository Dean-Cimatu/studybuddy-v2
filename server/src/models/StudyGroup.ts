import mongoose, { Document, Schema } from 'mongoose';

export interface IStudyGroupMember {
  userId: mongoose.Types.ObjectId;
  name: string;
  joinedAt: Date;
}

export interface IGroupChallenge {
  targetHours: number;
  title: string;
  weekStart: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

export interface IStudyGroup extends Document {
  name: string;
  createdBy: mongoose.Types.ObjectId;
  members: IStudyGroupMember[];
  inviteCode: string;
  createdAt: Date;
  challenge?: IGroupChallenge | null;
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

const challengeSchema = new Schema<IGroupChallenge>(
  {
    targetHours: { type: Number, required: true, min: 1, max: 168 },
    title: { type: String, default: '' },
    weekStart: { type: String, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const studyGroupSchema = new Schema<IStudyGroup>(
  {
    name: { type: String, required: true, maxlength: 100 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    members: [memberSchema],
    inviteCode: { type: String, unique: true, required: true, default: generateInviteCode },
    challenge: { type: challengeSchema, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

studyGroupSchema.index({ 'members.userId': 1 });


export const StudyGroupModel = mongoose.model<IStudyGroup>('StudyGroup', studyGroupSchema);
