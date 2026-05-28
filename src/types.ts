export type AuthMode = "telegram" | "demo";

export type AuthUser = {
  id: string;
  telegramId: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  points: number;
  referralCode: string;
};

export type AuthResponse = {
  user: AuthUser;
  token: string;
  mode: AuthMode;
};

export type TaskItem = {
  id: string;
  code: string;
  title: string;
  description: string;
  rewardPoints: number;
  progress: number;
  target: number;
  completed: boolean;
  claimed: boolean;
  completedAt: string | null;
  claimedAt: string | null;
};

export type ReferralStats = {
  referralCode: string;
  inviteLink: string;
  totalInvited: number;
  bonusEarned: number;
};

export type LeaderboardItem = {
  rank: number;
  id: string;
  name: string;
  points: number;
  isCurrentUser: boolean;
};

export type LeaderboardResponse = {
  items: LeaderboardItem[];
  currentUserRank: number;
  currentUserPoints: number;
  pointsGapToNextRank: number;
};
