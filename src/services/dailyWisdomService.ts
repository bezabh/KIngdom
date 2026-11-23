import { AxumiteWisdomQuote, getDailyWisdomQuote } from '../data/axumiteManuscriptQuotes';
import {
  DailyWisdomState,
  WISDOM_TRIGGER_EVENT,
  getDailyWisdomStats,
  getTodayDateString,
  onDailyWisdomTrigger,
  saveDailyWisdomStats,
} from './dailyWisdomState';

export type { DailyWisdomState };
export { getDailyWisdomStats, saveDailyWisdomStats, onDailyWisdomTrigger };

function getYesterdayString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Executes login wisdom routine, updates active usage streak, and grants bonus tokens / wisdom XP.
 */
export function recordDailyLoginWisdom(userId?: string): {
  state: DailyWisdomState;
  isNewDay: boolean;
  quote: AxumiteWisdomQuote;
  bonusPoints: number;
  bonusTokens: number;
} {
  const current = getDailyWisdomStats();
  const today = getTodayDateString();
  const yesterday = getYesterdayString();
  const isNewDay = current.lastLoginDate !== today;

  let newStreak = current.streakDays;
  let bonusPoints = 0;
  let bonusTokens = 0;

  if (isNewDay) {
    if (current.lastLoginDate === yesterday) {
      // Continued streak
      newStreak = current.streakDays + 1;
    } else if (current.lastLoginDate === '') {
      // First ever login
      newStreak = 1;
    } else {
      // Streak broken after missing 1+ days
      newStreak = 1;
    }
    bonusPoints = 100 + Math.min(newStreak * 25, 500);
    bonusTokens = 500 + Math.min(newStreak * 100, 2000);
  }

  // Get today's quote
  const quote = getDailyWisdomQuote();
  const updatedQuoteIds = current.collectedQuoteIds.includes(quote.id)
    ? current.collectedQuoteIds
    : [...current.collectedQuoteIds, quote.id];

  const updatedState: DailyWisdomState = {
    ...current,
    streakDays: newStreak,
    lastLoginDate: today,
    wisdomPoints: current.wisdomPoints + bonusPoints,
    collectedQuoteIds: updatedQuoteIds,
    todayQuoteId: quote.id,
    hasSeenToday: true,
    totalWisdomRead: current.totalWisdomRead + (isNewDay ? 1 : 0),
  };

  saveDailyWisdomStats(updatedState);

  // Credit tokens to subscription if available
  if (bonusTokens > 0) {
    try {
      const rawSub = localStorage.getItem('axumite_subscription');
      if (rawSub) {
        const sub = JSON.parse(rawSub);
        sub.tokensRemaining = (sub.tokensRemaining || 25000) + bonusTokens;
        localStorage.setItem('axumite_subscription', JSON.stringify(sub));
      }
    } catch (err) {
      console.warn('Could not credit daily wisdom tokens to subscription:', err);
    }
  }

  return {
    state: updatedState,
    isNewDay,
    quote,
    bonusPoints,
    bonusTokens,
  };
}

/**
 * Triggers the Daily Wisdom login popup to show anywhere in the app.
 */
export function triggerDailyWisdomModal(customQuote?: AxumiteWisdomQuote): void {
  const quote = customQuote || getDailyWisdomQuote();
  const event = new CustomEvent(WISDOM_TRIGGER_EVENT, {
    detail: { quote, timestamp: Date.now() },
  });
  window.dispatchEvent(event);
}
