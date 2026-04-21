export interface GroupMember {
  userId: string;
  name: string;
  joinedAt: string;
}

export interface StudyGroup {
  _id: string;
  name: string;
  createdBy: string;
  members: GroupMember[];
  inviteCode: string;
  createdAt: string;
}
