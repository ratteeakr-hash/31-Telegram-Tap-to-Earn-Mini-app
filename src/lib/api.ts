import type { AuthResponse, LeaderboardResponse, ReferralStats, TaskItem } from "../types";

const STORAGE_KEY = "telegram-mini-game-demo-state";

type DemoState = {
  points: number;
  tasks: TaskItem[];
};

const initialTasks: TaskItem[] = [
  {
    id: "open-app",
    code: "OPEN_APP",
    title: "Open the Mini App",
    description: "Start your first session in the Telegram Mini App.",
    rewardPoints: 25,
    progress: 1,
    target: 1,
    completed: true,
    claimed: false,
    completedAt: new Date().toISOString(),
    claimedAt: null
  },
  {
    id: "daily-tap-10",
    code: "DAILY_TAP_10",
    title: "Daily Tap Challenge",
    description: "Hit 10 rhythm taps in a demo round.",
    rewardPoints: 100,
    progress: 0,
    target: 10,
    completed: false,
    claimed: false,
    completedAt: null,
    claimedAt: null
  },
  {
    id: "invite-one-friend",
    code: "INVITE_ONE_FRIEND",
    title: "Invite One Friend",
    description: "Preview the referral reward flow with a demo invite link.",
    rewardPoints: 150,
    progress: 1,
    target: 1,
    completed: true,
    claimed: false,
    completedAt: new Date().toISOString(),
    claimedAt: null
  }
];

let demoState = loadState();

function loadState(): DemoState {
  const saved = window.localStorage.getItem(STORAGE_KEY);

  if (!saved) {
    return {
      points: 100,
      tasks: initialTasks
    };
  }

  try {
    return JSON.parse(saved) as DemoState;
  } catch {
    return {
      points: 100,
      tasks: initialTasks
    };
  }
}

function saveState() {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(demoState));
}

function wait(ms = 180) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function authenticate(_initData: string, _startParam?: string) {
  await wait();

  return {
    user: {
      id: "demo-user",
      telegramId: "100000001",
      username: "demo_player",
      firstName: "Demo",
      lastName: "Player",
      avatarUrl: null,
      points: demoState.points,
      referralCode: "DEMO2026"
    },
    token: "demo-session-token",
    mode: "demo"
  } satisfies AuthResponse;
}

export async function collectTap(_token: string, outcome: "PERFECT" | "GOOD" = "PERFECT") {
  await wait(120);

  const pointsAdded = outcome === "PERFECT" ? 10 : 5;
  const dailyTask = demoState.tasks.find((task) => task.code === "DAILY_TAP_10");

  demoState = {
    points: demoState.points + pointsAdded,
    tasks: demoState.tasks.map((task) => {
      if (task.id !== dailyTask?.id) {
        return task;
      }

      const progress = Math.min(task.target, task.progress + 1);
      const completed = progress >= task.target;

      return {
        ...task,
        progress,
        completed,
        completedAt: completed ? (task.completedAt ?? new Date().toISOString()) : null
      };
    })
  };
  saveState();

  return {
    pointsAdded,
    totalPoints: demoState.points,
    taskProgress: dailyTask
      ? [
          {
            code: dailyTask.code,
            progress: Math.min(dailyTask.target, dailyTask.progress + 1),
            target: dailyTask.target,
            completed: dailyTask.progress + 1 >= dailyTask.target
          }
        ]
      : []
  };
}

export async function getTasks(_token: string) {
  await wait();

  return {
    items: demoState.tasks
  };
}

export async function claimTask(_token: string, taskId: string) {
  await wait();

  const task = demoState.tasks.find((item) => item.id === taskId);

  if (!task || !task.completed || task.claimed) {
    throw new Error("This demo task is not ready to claim.");
  }

  const claimedTask = {
    ...task,
    claimed: true,
    claimedAt: new Date().toISOString()
  };

  demoState = {
    points: demoState.points + task.rewardPoints,
    tasks: demoState.tasks.map((item) => (item.id === taskId ? claimedTask : item))
  };
  saveState();

  return {
    pointsAdded: task.rewardPoints,
    totalPoints: demoState.points,
    task: claimedTask
  };
}

export async function getReferral(_token: string) {
  await wait();

  return {
    referralCode: "DEMO2026",
    inviteLink: "https://t.me/demo_bot/app?startapp=DEMO2026",
    totalInvited: 3,
    bonusEarned: 300
  } satisfies ReferralStats;
}

export async function getLeaderboard(_token: string) {
  await wait();

  const players = [
    { id: "ava", name: "Ava", points: 1380 },
    { id: "niko", name: "Niko", points: 980 },
    { id: "demo-user", name: "Demo Player", points: demoState.points },
    { id: "mai", name: "Mai", points: 760 },
    { id: "leo", name: "Leo", points: 420 }
  ].sort((left, right) => right.points - left.points);

  const currentIndex = players.findIndex((player) => player.id === "demo-user");
  const nextRank = currentIndex > 0 ? players[currentIndex - 1] : null;

  return {
    items: players.map((player, index) => ({
      rank: index + 1,
      id: player.id,
      name: player.name,
      points: player.points,
      isCurrentUser: player.id === "demo-user"
    })),
    currentUserRank: currentIndex + 1,
    currentUserPoints: demoState.points,
    pointsGapToNextRank: nextRank ? nextRank.points - demoState.points : 0
  } satisfies LeaderboardResponse;
}
