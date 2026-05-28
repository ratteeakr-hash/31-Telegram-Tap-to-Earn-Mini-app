import {
  Award,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Home,
  Loader2,
  Play,
  Share2,
  Square,
  Trophy,
  Zap
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { authenticate, claimTask, collectTap, getLeaderboard, getReferral, getTasks } from "./lib/api";
import { getTelegramLaunchData } from "./lib/telegram";
import type { AuthResponse, LeaderboardResponse, ReferralStats, TaskItem } from "./types";

type TabKey = "home" | "tasks" | "referral" | "leaderboard";
type TapOutcome = "PERFECT" | "GOOD";
type BrowserAudioContext = typeof AudioContext;

const tabs: Array<{ key: TabKey; label: string; icon: typeof Home }> = [
  { key: "home", label: "Home", icon: Home },
  { key: "tasks", label: "Tasks", icon: ClipboardCheck },
  { key: "referral", label: "Referral", icon: Share2 },
  { key: "leaderboard", label: "Rank", icon: Trophy }
];

export function App() {
  const [activeTab, setActiveTab] = useState<TabKey>("home");
  const [auth, setAuth] = useState<AuthResponse | null>(null);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [referral, setReferral] = useState<ReferralStats | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  useEffect(() => {
    const launchData = getTelegramLaunchData();

    authenticate(launchData.initData, launchData.startParam)
      .then(async (authResult) => {
        setAuth(authResult);
        await refreshDashboard(authResult.token);
      })
      .catch((authError: unknown) => {
        setError(authError instanceof Error ? authError.message : "Connection problem. Please try again.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  async function refreshDashboard(token = auth?.token) {
    if (!token) {
      return;
    }

    setIsRefreshing(true);
    setError(null);

    try {
      const [tasksResult, referralResult, leaderboardResult] = await Promise.all([
        getTasks(token),
        getReferral(token),
        getLeaderboard(token)
      ]);

      setTasks(tasksResult.items);
      setReferral(referralResult);
      setLeaderboard(leaderboardResult);
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "Connection problem. Please try again.");
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleRhythmReward(outcome: TapOutcome) {
    if (!auth) {
      return false;
    }

    setPendingAction("tap");
    setError(null);

    try {
      const result = await collectTap(auth.token, outcome);
      setAuth({
        ...auth,
        user: {
          ...auth.user,
          points: result.totalPoints
        }
      });
      await refreshDashboard(auth.token);
      return true;
    } catch (tapError) {
      setError(tapError instanceof Error ? tapError.message : "Wait for the next beat.");
      return false;
    } finally {
      setPendingAction(null);
    }
  }

  async function handleClaimTask(taskId: string) {
    if (!auth) {
      return;
    }

    setPendingAction(taskId);
    setError(null);

    try {
      const result = await claimTask(auth.token, taskId);
      setAuth({
        ...auth,
        user: {
          ...auth.user,
          points: result.totalPoints
        }
      });
      setTasks((currentTasks) => currentTasks.map((task) => (task.id === result.task.id ? result.task : task)));
      setNotice(`+${result.pointsAdded} points`);
      await refreshDashboard(auth.token);
    } catch (claimError) {
      setError(claimError instanceof Error ? claimError.message : "Connection problem. Please try again.");
    } finally {
      setPendingAction(null);
    }
  }

  async function handleCopyInvite() {
    if (!referral) {
      return;
    }

    await navigator.clipboard.writeText(referral.inviteLink);
    setNotice("Invite link copied");
  }

  function handleShareInvite() {
    if (!referral) {
      return;
    }

    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(referral.inviteLink)}`;
    window.open(shareUrl, "_blank", "noopener,noreferrer");
  }

  const displayName = useMemo(() => {
    if (!auth?.user) {
      return "Player";
    }

    return auth.user.firstName ?? auth.user.username ?? "Player";
  }, [auth]);

  if (isLoading) {
    return (
      <AppFrame mode="loading">
        <div className="flex min-h-[420px] flex-col items-center justify-center gap-3 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-mint" aria-hidden="true" />
          <p className="text-sm font-medium text-slate-600">Loading your session...</p>
        </div>
      </AppFrame>
    );
  }

  if (!auth) {
    return (
      <AppFrame mode="error">
        <ErrorState message={error ?? "We could not verify your Telegram session. Please reopen the app from Telegram."} />
      </AppFrame>
    );
  }

  return (
    <AppFrame mode={auth.mode}>
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-cloud pb-24">
        <header className="px-5 pb-3 pt-5">
          {auth.mode === "demo" ? (
            <div className="mb-3 rounded-md border border-amber/40 bg-amber/15 px-3 py-2 text-xs font-medium text-amber-900">
              Demo Mode: This preview uses sample user data.
            </div>
          ) : null}
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm text-slate-500">Welcome back</p>
              <h1 className="truncate text-2xl font-semibold text-ink">{displayName}</h1>
            </div>
            <div className="shrink-0 rounded-md bg-white px-3 py-2 text-right shadow-sm">
              <p className="text-xs text-slate-500">Points</p>
              <p className="text-lg font-semibold text-ink">{auth.user.points.toLocaleString()}</p>
            </div>
          </div>
          {notice ? <StatusMessage tone="success">{notice}</StatusMessage> : null}
          {error ? <StatusMessage tone="error">{error}</StatusMessage> : null}
        </header>

        <section className="flex-1 px-5">
          {activeTab === "home" ? (
            <HomeScreen
              points={auth.user.points}
              tasks={tasks}
              leaderboard={leaderboard}
              isPending={pendingAction === "tap"}
              onReward={handleRhythmReward}
            />
          ) : null}
          {activeTab === "tasks" ? (
            <TasksScreen tasks={tasks} pendingAction={pendingAction} isLoading={isRefreshing} onClaim={handleClaimTask} />
          ) : null}
          {activeTab === "referral" ? (
            <ReferralScreen referral={referral} onCopy={handleCopyInvite} onShare={handleShareInvite} />
          ) : null}
          {activeTab === "leaderboard" ? <LeaderboardScreen leaderboard={leaderboard} isLoading={isRefreshing} /> : null}
        </section>

        <BottomNavigation activeTab={activeTab} onChange={setActiveTab} />
      </main>
    </AppFrame>
  );
}

function AppFrame({ children, mode }: { children: ReactNode; mode: "telegram" | "demo" | "loading" | "error" }) {
  return (
    <div className="min-h-dvh bg-slate-200">
      <div className="mx-auto min-h-dvh max-w-md bg-cloud shadow-soft" data-mode={mode}>
        {children}
      </div>
    </div>
  );
}

function HomeScreen({
  points,
  tasks,
  leaderboard,
  isPending,
  onReward
}: {
  points: number;
  tasks: TaskItem[];
  leaderboard: LeaderboardResponse | null;
  isPending: boolean;
  onReward: (outcome: TapOutcome) => Promise<boolean>;
}) {
  const dailyTask = tasks.find((task) => task.code === "DAILY_TAP_10");
  const progress = dailyTask ? Math.round((dailyTask.progress / dailyTask.target) * 100) : 0;
  const [roundState, setRoundState] = useState<"idle" | "playing" | "finished">("idle");
  const [roundStartedAt, setRoundStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => performance.now());
  const [roundScore, setRoundScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [speedProgress, setSpeedProgress] = useState(0);
  const [attempts, setAttempts] = useState({ perfect: 0, good: 0, miss: 0 });
  const [markerPosition, setMarkerPosition] = useState(0);
  const [lastHit, setLastHit] = useState<{
    label: "Perfect" | "Good" | "Miss";
    points: number;
    delta: number;
  } | null>(null);
  const markerPositionRef = useRef(0);
  const markerDirectionRef = useRef(1);
  const markerSpeedRef = useRef(2 / 2400);
  const targetSpeedRef = useRef(2 / 2400);
  const lastFrameAtRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const roundDurationMs = 30_000;
  const elapsedMs = roundStartedAt ? Math.min(now - roundStartedAt, roundDurationMs) : 0;
  const remainingMs = Math.max(roundDurationMs - elapsedMs, 0);
  const speedLevel = Math.min(8, 1 + Math.floor(speedProgress / 3));
  const targetCycleMs = Math.max(850, 2400 - speedLevel * 180);
  const targetSpeed = 2 / targetCycleMs;
  const distanceFromTarget = Math.abs(markerPosition - 0.5);
  const totalAttempts = attempts.perfect + attempts.good + attempts.miss;

  useEffect(() => {
    targetSpeedRef.current = targetSpeed;
  }, [targetSpeed]);

  useEffect(() => {
    if (roundState !== "playing") {
      return;
    }

    let frameId = 0;

    function tick() {
      const frameNow = performance.now();
      const lastFrameAt = lastFrameAtRef.current ?? frameNow;
      const deltaMs = Math.min(frameNow - lastFrameAt, 48);
      lastFrameAtRef.current = frameNow;

      markerSpeedRef.current += (targetSpeedRef.current - markerSpeedRef.current) * 0.055;

      let nextPosition =
        markerPositionRef.current + markerDirectionRef.current * markerSpeedRef.current * deltaMs;

      if (nextPosition >= 1) {
        nextPosition = 1 - (nextPosition - 1);
        markerDirectionRef.current = -1;
      } else if (nextPosition <= 0) {
        nextPosition = -nextPosition;
        markerDirectionRef.current = 1;
      }

      markerPositionRef.current = Math.max(0, Math.min(1, nextPosition));
      setMarkerPosition(markerPositionRef.current);
      setNow(frameNow);
      frameId = requestAnimationFrame(tick);
    }

    frameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [roundState]);

  useEffect(() => {
    if (roundState === "playing" && remainingMs <= 0) {
      setRoundState("finished");
    }
  }, [remainingMs, roundState]);

  function startRound() {
    playGameSound("start");
    setRoundState("playing");
    setRoundStartedAt(performance.now());
    setNow(performance.now());
    setRoundScore(0);
    setCombo(0);
    setBestCombo(0);
    setSpeedProgress(0);
    setAttempts({ perfect: 0, good: 0, miss: 0 });
    setLastHit(null);
    setMarkerPosition(0);
    markerPositionRef.current = 0;
    markerDirectionRef.current = 1;
    markerSpeedRef.current = 2 / 2400;
    targetSpeedRef.current = 2 / 2400;
    lastFrameAtRef.current = null;
  }

  function stopRound() {
    if (roundState === "playing") {
      playGameSound("stop");
      setRoundState("finished");
    }
  }

  async function handleRhythmTap() {
    if (roundState !== "playing" || isPending) {
      return;
    }

    if (distanceFromTarget <= 0.06) {
      await applyHit("PERFECT", 10, distanceFromTarget);
      return;
    }

    if (distanceFromTarget <= 0.16) {
      await applyHit("GOOD", 5, distanceFromTarget);
      return;
    }

    setCombo(0);
    setAttempts((current) => ({ ...current, miss: current.miss + 1 }));
    setLastHit({ label: "Miss", points: 0, delta: distanceFromTarget });
    playGameSound("miss");
  }

  async function applyHit(outcome: TapOutcome, pointsAdded: number, delta: number) {
    const rewardApplied = await onReward(outcome);

    if (!rewardApplied) {
      return;
    }

    const nextCombo = combo + 1;
    setCombo(nextCombo);
    setBestCombo((current) => Math.max(current, nextCombo));
    setSpeedProgress((current) => current + 1);
    setRoundScore((current) => current + pointsAdded);
    setAttempts((current) => ({
      ...current,
      [outcome === "PERFECT" ? "perfect" : "good"]: current[outcome === "PERFECT" ? "perfect" : "good"] + 1
    }));
    setLastHit({ label: outcome === "PERFECT" ? "Perfect" : "Good", points: pointsAdded, delta });
    playGameSound(outcome === "PERFECT" ? "perfect" : "good");
  }

  function getAudioContext() {
    if (audioContextRef.current) {
      return audioContextRef.current;
    }

    const AudioContextConstructor = window.AudioContext ?? getWebkitAudioContext();

    if (!AudioContextConstructor) {
      return null;
    }

    audioContextRef.current = new AudioContextConstructor();

    return audioContextRef.current;
  }

  function playGameSound(sound: "start" | "stop" | "perfect" | "good" | "miss") {
    const audioContext = getAudioContext();

    if (!audioContext) {
      return;
    }

    if (audioContext.state === "suspended") {
      void audioContext.resume();
    }

    if (sound === "perfect") {
      playTone(audioContext, 784, 0.075, 0.05, "sine");
      playTone(audioContext, 1046, 0.105, 0.055, "sine", 0.055);
      return;
    }

    if (sound === "good") {
      playTone(audioContext, 660, 0.09, 0.045, "triangle");
      return;
    }

    if (sound === "miss") {
      playTone(audioContext, 160, 0.12, 0.04, "sawtooth");
      return;
    }

    if (sound === "start") {
      playTone(audioContext, 440, 0.06, 0.035, "sine");
      playTone(audioContext, 660, 0.08, 0.04, "sine", 0.055);
      return;
    }

    playTone(audioContext, 220, 0.08, 0.035, "triangle");
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-ink p-5 text-white shadow-soft">
        <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-3">
          <div>
            <p className="text-sm text-slate-300">Rhythm Tap</p>
            <h2 className="mt-1 text-3xl font-semibold">{formatSeconds(remainingMs)}</h2>
          </div>
          <div className="min-h-16 min-w-24 rounded-md bg-slate-950/70 px-3 py-2 text-center">
            <p className="text-xs text-slate-400">Timing</p>
            <p
              className={`mt-1 text-sm font-semibold ${
                lastHit?.label === "Miss" ? "text-amber" : lastHit ? "text-mint" : "text-slate-300"
              }`}
            >
              {lastHit ? `${lastHit.label} +${lastHit.points}` : "Ready"}
            </p>
          </div>
          <div className="justify-self-end rounded-md bg-white/10 px-3 py-2 text-right">
            <p className="text-xs text-slate-300">Round</p>
            <p className="text-lg font-semibold">{roundScore.toLocaleString()}</p>
          </div>
        </div>

        <div className="mt-5 rounded-md bg-white/10 p-4">
          <div className="mb-3 flex items-center justify-between text-xs text-slate-300">
            <span>Speed L{speedLevel}</span>
            <span>Combo {combo}</span>
          </div>
          <div className="relative h-14 overflow-hidden rounded-md bg-slate-950">
            <div className="absolute left-1/2 top-0 h-full w-[18%] -translate-x-1/2 bg-mint/20" />
            <div className="absolute left-1/2 top-0 h-full w-[6%] -translate-x-1/2 bg-mint/40" />
            <div
              className="absolute top-2 h-10 w-3 -translate-x-1/2 rounded-full bg-amber shadow-soft transition-colors"
              style={{ left: `${markerPosition * 100}%` }}
            />
          </div>
          <div className="mt-3 flex min-h-6 items-center justify-between text-sm">
            <span className="text-slate-300">Target center</span>
            <span className="text-slate-300">{roundState === "playing" ? "Tap on beat" : "Start round"}</span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-white px-4 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-60"
            disabled={roundState === "playing"}
            type="button"
            onClick={startRound}
          >
            <Play className="h-4 w-4" aria-hidden="true" />
            {roundState === "finished" ? "Again" : "Start"}
          </button>
          <button
            className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-slate-700 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            disabled={roundState !== "playing"}
            type="button"
            onClick={stopRound}
          >
            <Square className="h-4 w-4" aria-hidden="true" />
            Stop
          </button>
        </div>

        <button
          className="mt-3 flex min-h-14 w-full items-center justify-center gap-2 rounded-md bg-mint px-4 text-base font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-60"
          disabled={roundState !== "playing" || isPending}
          type="button"
          onClick={handleRhythmTap}
        >
          {isPending ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <Zap className="h-5 w-5" aria-hidden="true" />}
          Tap the Beat
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <MetricTile label="Perfect" value={attempts.perfect.toLocaleString()} />
        <MetricTile label="Good" value={attempts.good.toLocaleString()} />
        <MetricTile label="Miss" value={attempts.miss.toLocaleString()} />
      </div>

      {roundState === "finished" ? (
        <div className="celebration-card relative overflow-hidden rounded-lg bg-ink p-5 text-white shadow-soft">
          <div className="celebration-burst" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
          <div className="relative">
            <p className="text-sm font-medium text-mint">Round complete</p>
            <div className="mt-2 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs text-slate-300">Score</p>
                <p className="text-4xl font-semibold">{roundScore.toLocaleString()}</p>
              </div>
              <div className="rounded-md bg-white/10 px-3 py-2 text-right">
                <p className="text-xs text-slate-300">Best combo</p>
                <p className="text-xl font-semibold">{bestCombo.toLocaleString()}</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-md bg-white/10 px-2 py-2">
                <p className="text-xs text-slate-300">Perfect</p>
                <p className="font-semibold text-mint">{attempts.perfect.toLocaleString()}</p>
              </div>
              <div className="rounded-md bg-white/10 px-2 py-2">
                <p className="text-xs text-slate-300">Good</p>
                <p className="font-semibold text-mint">{attempts.good.toLocaleString()}</p>
              </div>
              <div className="rounded-md bg-white/10 px-2 py-2">
                <p className="text-xs text-slate-300">Miss</p>
                <p className="font-semibold text-amber">{attempts.miss.toLocaleString()}</p>
              </div>
            </div>
            <p className="mt-3 text-sm text-slate-300">
              {totalAttempts.toLocaleString()} taps played. Hit Again to chase a cleaner run.
            </p>
          </div>
        </div>
      ) : null}

      <div className="rounded-lg bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-ink">{dailyTask?.title ?? "Daily Tap Challenge"}</p>
            <p className="text-xs text-slate-500">
              {dailyTask ? `${dailyTask.progress} / ${dailyTask.target} completed` : "Loading progress..."}
            </p>
          </div>
          <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
            {dailyTask?.completed ? "Done" : "Active"}
          </span>
        </div>
        <div className="mt-3 h-2 rounded-full bg-slate-100">
          <div className="h-2 rounded-full bg-mint transition-all" style={{ width: `${Math.min(progress, 100)}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <MetricTile label="Balance" value={points.toLocaleString()} />
        <MetricTile label="Rank" value={leaderboard ? `#${leaderboard.currentUserRank}` : "--"} />
      </div>
    </div>
  );
}

function formatSeconds(ms: number) {
  return (ms / 1000).toFixed(2).padStart(5, "0");
}

function getWebkitAudioContext() {
  return (window as Window & { webkitAudioContext?: BrowserAudioContext }).webkitAudioContext;
}

function playTone(
  audioContext: AudioContext,
  frequency: number,
  durationSeconds: number,
  volume: number,
  type: OscillatorType,
  delaySeconds = 0
) {
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const startsAt = audioContext.currentTime + delaySeconds;
  const endsAt = startsAt + durationSeconds;

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startsAt);
  gain.gain.setValueAtTime(0.0001, startsAt);
  gain.gain.exponentialRampToValueAtTime(volume, startsAt + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, endsAt);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(startsAt);
  oscillator.stop(endsAt + 0.02);
}

function TasksScreen({
  tasks,
  pendingAction,
  isLoading,
  onClaim
}: {
  tasks: TaskItem[];
  pendingAction: string | null;
  isLoading: boolean;
  onClaim: (taskId: string) => void;
}) {
  if (isLoading && tasks.length === 0) {
    return <LoadingPanel label="Loading tasks..." />;
  }

  if (tasks.length === 0) {
    return <EmptyPanel label="Start collecting points to complete your first task." />;
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} isPending={pendingAction === task.id} onClaim={onClaim} />
      ))}
    </div>
  );
}

function TaskCard({ task, isPending, onClaim }: { task: TaskItem; isPending: boolean; onClaim: (taskId: string) => void }) {
  const progress = Math.round((task.progress / task.target) * 100);
  const canClaim = task.completed && !task.claimed;

  return (
    <div className="rounded-lg bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-ink">{task.title}</p>
          <p className="mt-1 text-sm leading-5 text-slate-600">{task.description}</p>
        </div>
        {task.claimed ? <CheckCircle2 className="h-5 w-5 shrink-0 text-mint" aria-hidden="true" /> : null}
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
        <span>
          {task.progress} / {task.target}
        </span>
        <span>{task.rewardPoints} pts</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-slate-100">
        <div className="h-2 rounded-full bg-mint transition-all" style={{ width: `${Math.min(progress, 100)}%` }} />
      </div>
      <button
        className="mt-4 min-h-11 w-full rounded-md bg-ink px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
        disabled={!canClaim || isPending}
        type="button"
        onClick={() => onClaim(task.id)}
      >
        {isPending ? "Claiming..." : task.claimed ? "Task Completed" : "Claim Reward"}
      </button>
    </div>
  );
}

function ReferralScreen({
  referral,
  onCopy,
  onShare
}: {
  referral: ReferralStats | null;
  onCopy: () => void;
  onShare: () => void;
}) {
  if (!referral) {
    return <LoadingPanel label="Loading referral..." />;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-white p-5 shadow-sm">
        <div className="flex h-11 w-11 items-center justify-center rounded-md bg-mint/15 text-mint">
          <Share2 className="h-5 w-5" aria-hidden="true" />
        </div>
        <h2 className="mt-4 text-xl font-semibold text-ink">Invite Friend</h2>
        <p className="mt-2 break-all font-mono text-sm text-slate-600">{referral.inviteLink}</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white"
            type="button"
            onClick={onCopy}
          >
            <Copy className="h-4 w-4" aria-hidden="true" />
            Copy Link
          </button>
          <button
            className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-mint px-4 text-sm font-semibold text-ink"
            type="button"
            onClick={onShare}
          >
            <Share2 className="h-4 w-4" aria-hidden="true" />
            Share
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <MetricTile label="Invited" value={referral.totalInvited.toLocaleString()} />
        <MetricTile label="Bonus" value={referral.bonusEarned.toLocaleString()} />
      </div>
      <div className="rounded-lg bg-white p-4 shadow-sm">
        <p className="text-xs text-slate-500">Referral code</p>
        <p className="mt-1 font-mono text-lg font-semibold text-ink">{referral.referralCode}</p>
      </div>
    </div>
  );
}

function LeaderboardScreen({ leaderboard, isLoading }: { leaderboard: LeaderboardResponse | null; isLoading: boolean }) {
  if (isLoading && !leaderboard) {
    return <LoadingPanel label="Loading leaderboard..." />;
  }

  if (!leaderboard || leaderboard.items.length === 0) {
    return <EmptyPanel label="Loading leaderboard..." />;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <MetricTile label="Your rank" value={`#${leaderboard.currentUserRank}`} />
        <MetricTile label="Next rank" value={leaderboard.pointsGapToNextRank.toLocaleString()} />
      </div>
      <div className="space-y-2">
        {leaderboard.items.map((item) => (
          <div
            key={item.id}
            className={`flex items-center justify-between rounded-lg p-4 shadow-sm ${
              item.isCurrentUser ? "bg-mint/15" : "bg-white"
            }`}
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-ink text-sm font-semibold text-white">
                {item.rank}
              </span>
              <p className="truncate font-semibold text-ink">{item.name}</p>
            </div>
            <p className="shrink-0 text-sm font-semibold text-slate-700">{item.points.toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white p-4 shadow-sm">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-ink">{value}</p>
    </div>
  );
}

function LoadingPanel({ label }: { label: string }) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-lg bg-white p-5 text-center shadow-sm">
      <Loader2 className="h-6 w-6 animate-spin text-mint" aria-hidden="true" />
      <p className="text-sm font-medium text-slate-600">{label}</p>
    </div>
  );
}

function EmptyPanel({ label }: { label: string }) {
  return (
    <div className="rounded-lg bg-white p-5 text-center shadow-sm">
      <p className="text-sm text-slate-600">{label}</p>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber/20 text-amber">
        <Zap className="h-6 w-6" aria-hidden="true" />
      </div>
      <h1 className="text-xl font-semibold text-ink">Session problem</h1>
      <p className="max-w-xs text-sm text-slate-600">{message}</p>
    </div>
  );
}

function StatusMessage({ children, tone }: { children: ReactNode; tone: "success" | "error" }) {
  return (
    <div
      className={`mt-3 rounded-md px-3 py-2 text-xs font-medium ${
        tone === "success" ? "bg-mint/15 text-emerald-800" : "bg-amber/15 text-amber-900"
      }`}
    >
      {children}
    </div>
  );
}

function BottomNavigation({ activeTab, onChange }: { activeTab: TabKey; onChange: (tab: TabKey) => void }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 mx-auto max-w-md border-t border-slate-200 bg-white/95 px-3 pb-3 pt-2 backdrop-blur">
      <div className="grid grid-cols-4 gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.key === activeTab;

          return (
            <button
              key={tab.key}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-md text-xs font-medium ${
                isActive ? "bg-mint/15 text-ink" : "text-slate-500"
              }`}
              type="button"
              onClick={() => onChange(tab.key)}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
