export interface GroupMember {
  userId: string;
  name: string;
  joinedAt: string;
}

export interface GroupChallenge {
  targetHours: number;
  title: string;
  weekStart: string;
  createdBy: string;
  createdAt: string;
}

export interface StudyGroup {
  _id: string;
  name: string;
  createdBy: string;
  members: GroupMember[];
  inviteCode: string;
  createdAt: string;
  challenge?: GroupChallenge | null;
}
