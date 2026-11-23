import { playGoldenNotificationChime } from './notificationService';

export interface DailyStreakState {
  streakDays: number;
  lastActiveDate: string; // YYYY-MM-DD
  todayClaimed: boolean;
  toolsUsedToday: string[];
  totalDaysActive: number;
  streakMultiplier: number;
  bonusCreditsEarnedTotal: number;
  bonusCashEarnedTotal: number;
  weeklyProgress: {
    dayIndex: number; // 0..6 (Mon..Sun or 1..7)
    dayLabel: string;
    dayLabelTi: string;
    credits: number;
    cash: number;
    claimed: boolean;
    isCurrentDay: boolean;
  }[];
}

const STORAGE_KEY = 'axumite_daily_streak_v2';
const STREAK_EVENT = 'axumite:streak-updated';
const REWARDS_STORAGE_KEY = 'axumite_rewards_data_v1';

export function getTodayString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getYesterdayString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const BASE_WEEKLY_REWARDS = [
  { dayIndex: 1, dayLabel: 'Day 1', dayLabelTi: '1ይ መዓልቲ', credits: 50, cash: 0.05 },
  { dayIndex: 2, dayLabel: 'Day 2', dayLabelTi: '2ይ መዓልቲ', credits: 100, cash: 0.10 },
  { dayIndex: 3, dayLabel: 'Day 3', dayLabelTi: '3ይ መዓልቲ', credits: 150, cash: 0.15 },
  { dayIndex: 4, dayLabel: 'Day 4', dayLabelTi: '4ይ መዓልቲ', credits: 200, cash: 0.20 },
  { dayIndex: 5, dayLabel: 'Day 5', dayLabelTi: '5ይ መዓልቲ', credits: 300, cash: 0.30 },
  { dayIndex: 6, dayLabel: 'Day 6', dayLabelTi: '6ይ መዓልቲ', credits: 400, cash: 0.40 },
  { dayIndex: 7, dayLabel: 'Day 7 ★', dayLabelTi: '7ይ መዓልቲ ★', credits: 750, cash: 0.75 },
];

export function getDailyStreakState(): DailyStreakState {
  const today = getTodayString();
  const yesterday = getYesterdayString();

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      let streakDays = typeof parsed.streakDays === 'number' ? parsed.streakDays : 1;
      let totalDaysActive = typeof parsed.totalDaysActive === 'number' ? parsed.totalDaysActive : 1;
      let lastActiveDate = parsed.lastActiveDate || '';
      let todayClaimed = parsed.todayClaimed === true && lastActiveDate === today;
      let toolsUsedToday: string[] = Array.isArray(parsed.toolsUsedToday) && lastActiveDate === today ? parsed.toolsUsedToday : [];
      let bonusCreditsEarnedTotal = typeof parsed.bonusCreditsEarnedTotal === 'number' ? parsed.bonusCreditsEarnedTotal : 250;
      let bonusCashEarnedTotal = typeof parsed.bonusCashEarnedTotal === 'number' ? parsed.bonusCashEarnedTotal : 0.25;

      // Check if it is a new day
      if (lastActiveDate !== today) {
        if (lastActiveDate === yesterday) {
          // Continued streak yesterday, not yet claimed today
          // Streak stays at current streak or increases upon claim
        } else if (lastActiveDate === '') {
          streakDays = 1;
        } else {
          // Streak broken after missing 1+ full calendar days
          streakDays = 1;
        }
        todayClaimed = false;
        toolsUsedToday = [];
      }

      // Calculate multiplier (1.0x to 3.0x based on streak + tools used)
      const baseMult = 1.0 + Math.min(streakDays * 0.1, 1.5);
      const toolBoost = Math.min(toolsUsedToday.length * 0.15, 0.5);
      const streakMultiplier = parseFloat((baseMult + toolBoost).toFixed(2));

      const dayInCycle = ((streakDays - 1) % 7) + 1;

      const weeklyProgress = BASE_WEEKLY_REWARDS.map((tier) => {
        const isPastDay = tier.dayIndex < dayInCycle;
        const isCurrent = tier.dayIndex === dayInCycle;
        return {
          ...tier,
          claimed: isPastDay || (isCurrent && todayClaimed),
          isCurrentDay: isCurrent,
        };
      });

      return {
        streakDays,
        lastActiveDate: lastActiveDate || today,
        todayClaimed,
        toolsUsedToday,
        totalDaysActive,
        streakMultiplier,
        bonusCreditsEarnedTotal,
        bonusCashEarnedTotal,
        weeklyProgress,
      };
    }
  } catch (e) {
    console.warn('Error parsing daily streak state', e);
  }

  // Default state for first-time user
  const defaultStreak = 1;
  const weeklyProgress = BASE_WEEKLY_REWARDS.map((tier) => ({
    ...tier,
    claimed: false,
    isCurrentDay: tier.dayIndex === 1,
  }));

  return {
    streakDays: defaultStreak,
    lastActiveDate: today,
    todayClaimed: false,
    toolsUsedToday: [],
    totalDaysActive: 1,
    streakMultiplier: 1.1,
    bonusCreditsEarnedTotal: 0,
    bonusCashEarnedTotal: 0,
    weeklyProgress,
  };
}

export function saveDailyStreakState(state: DailyStreakState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent(STREAK_EVENT, { detail: state }));
  } catch (e) {
    console.warn('Error saving daily streak state', e);
  }
}

export function subscribeToStreak(callback: (state: DailyStreakState) => void): () => void {
  const handler = (e: any) => {
    if (e.detail) {
      callback(e.detail);
    } else {
      callback(getDailyStreakState());
    }
  };
  window.addEventListener(STREAK_EVENT, handler);
  // Initial callback
  callback(getDailyStreakState());
  return () => window.removeEventListener(STREAK_EVENT, handler);
}

/**
 * Records when an AI tool is launched or executed (e.g. 'chat', 'translator', 'calligraphy', 'vision', 'education', 'speech-studio', 'document-ai').
 */
export function recordToolUsage(toolKey: string): {
  isFirstUseToday: boolean;
  state: DailyStreakState;
  bonusBonusTokens: number;
} {
  const current = getDailyStreakState();
  const today = getTodayString();
  const yesterday = getYesterdayString();

  let newStreak = current.streakDays;
  if (current.lastActiveDate !== today) {
    if (current.lastActiveDate === yesterday) {
      newStreak = current.streakDays + 1;
    } else if (current.lastActiveDate !== '') {
      newStreak = 1;
    }
  }

  const isFirstUseToday = !current.toolsUsedToday.includes(toolKey);
  const updatedTools = isFirstUseToday ? [...current.toolsUsedToday, toolKey] : current.toolsUsedToday;

  const baseMult = 1.0 + Math.min(newStreak * 0.1, 1.5);
  const toolBoost = Math.min(updatedTools.length * 0.15, 0.5);
  const streakMultiplier = parseFloat((baseMult + toolBoost).toFixed(2));

  const dayInCycle = ((newStreak - 1) % 7) + 1;
  const weeklyProgress = BASE_WEEKLY_REWARDS.map((tier) => {
    const isPastDay = tier.dayIndex < dayInCycle;
    const isCurrent = tier.dayIndex === dayInCycle;
    return {
      ...tier,
      claimed: isPastDay || (isCurrent && current.todayClaimed),
      isCurrentDay: isCurrent,
    };
  });

  const updatedState: DailyStreakState = {
    ...current,
    streakDays: newStreak,
    lastActiveDate: today,
    toolsUsedToday: updatedTools,
    streakMultiplier,
    weeklyProgress,
  };

  saveDailyStreakState(updatedState);

  let bonusBonusTokens = 0;
  if (isFirstUseToday) {
    bonusBonusTokens = 150;
    try {
      const rawSub = localStorage.getItem('axumite_subscription');
      if (rawSub) {
        const sub = JSON.parse(rawSub);
        sub.tokensRemaining = (sub.tokensRemaining || 25000) + bonusBonusTokens;
        localStorage.setItem('axumite_subscription', JSON.stringify(sub));
      }
    } catch (e) {
      console.warn('Could not add tool usage bonus to subscription', e);
    }
  }

  return {
    isFirstUseToday,
    state: updatedState,
    bonusBonusTokens,
  };
}

/**
 * Claims today's daily streak loyalty reward and credits both AI credits and cash balance to RewardsView.
 */
export function claimDailyStreakReward(): {
  success: boolean;
  state: DailyStreakState;
  rewardEarned: {
    credits: number;
    cash: number;
    tokens: number;
    multiplier: number;
    streakDays: number;
  };
} {
  const current = getDailyStreakState();
  const today = getTodayString();

  if (current.todayClaimed && current.lastActiveDate === today) {
    return {
      success: false,
      state: current,
      rewardEarned: {
        credits: 0,
        cash: 0,
        tokens: 0,
        multiplier: current.streakMultiplier,
        streakDays: current.streakDays,
      },
    };
  }

  playGoldenNotificationChime();

  const dayInCycle = ((current.streakDays - 1) % 7) + 1;
  const baseTier = BASE_WEEKLY_REWARDS.find(t => t.dayIndex === dayInCycle) || BASE_WEEKLY_REWARDS[0];

  const earnedCash = parseFloat((baseTier.cash * current.streakMultiplier).toFixed(2));
  const earnedCredits = Math.round(baseTier.credits * current.streakMultiplier);
  const earnedTokens = earnedCredits * 10;

  // 1. Update unified RewardsView persistent data
  try {
    const rawRewards = localStorage.getItem(REWARDS_STORAGE_KEY);
    let unpaidBalance = 10.00;
    let tasksDone = 200;
    let payoutRequested = true;
    let payoutHistory = [];

    if (rawRewards) {
      const parsed = JSON.parse(rawRewards);
      if (typeof parsed.unpaidBalance === 'number') unpaidBalance = parsed.unpaidBalance;
      if (typeof parsed.tasksDone === 'number') tasksDone = parsed.tasksDone;
      if (typeof parsed.payoutRequested === 'boolean') payoutRequested = parsed.payoutRequested;
      if (Array.isArray(parsed.payoutHistory)) payoutHistory = parsed.payoutHistory;
    }

    const newBalance = parseFloat((unpaidBalance + earnedCash).toFixed(2));
    const newDone = tasksDone + 1;

    localStorage.setItem(REWARDS_STORAGE_KEY, JSON.stringify({
      unpaidBalance: newBalance,
      tasksDone: newDone,
      payoutRequested,
      payoutHistory,
    }));
  } catch (err) {
    console.warn('Could not update RewardsView storage', err);
  }

  // 2. Update AI Subscription Token balance
  try {
    const rawSub = localStorage.getItem('axumite_subscription');
    if (rawSub) {
      const sub = JSON.parse(rawSub);
      sub.tokensRemaining = (sub.tokensRemaining || 25000) + earnedTokens;
      localStorage.setItem('axumite_subscription', JSON.stringify(sub));
    }
  } catch (err) {
    console.warn('Could not update subscription token balance', err);
  }

  // 3. Update Streak State
  const weeklyProgress = BASE_WEEKLY_REWARDS.map((tier) => {
    const isPastDay = tier.dayIndex < dayInCycle;
    const isCurrent = tier.dayIndex === dayInCycle;
    return {
      ...tier,
      claimed: isPastDay || isCurrent,
      isCurrentDay: isCurrent,
    };
  });

  const updatedState: DailyStreakState = {
    ...current,
    lastActiveDate: today,
    todayClaimed: true,
    totalDaysActive: current.totalDaysActive + 1,
    bonusCreditsEarnedTotal: current.bonusCreditsEarnedTotal + earnedCredits,
    bonusCashEarnedTotal: parseFloat((current.bonusCashEarnedTotal + earnedCash).toFixed(2)),
    weeklyProgress,
  };

  saveDailyStreakState(updatedState);

  return {
    success: true,
    state: updatedState,
    rewardEarned: {
      credits: earnedCredits,
      cash: earnedCash,
      tokens: earnedTokens,
      multiplier: current.streakMultiplier,
      streakDays: current.streakDays,
    },
  };
}
