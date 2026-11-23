import type { AxumiteWisdomQuote } from '../data/axumiteManuscriptQuotes';

export interface DailyWisdomState {
  streakDays: number;
  totalWisdomRead: number;
  lastLoginDate: string; // YYYY-MM-DD
  wisdomPoints: number;
  collectedQuoteIds: string[];
  todayQuoteId: string;
  hasSeenToday: boolean;
}

export const DAILY_WISDOM_STORAGE_KEY = 'axumite_daily_wisdom_state';
export const WISDOM_TRIGGER_EVENT = 'axumite:daily-wisdom-trigger';
const FALLBACK_DEFAULT_QUOTE_ID = 'axm_001';

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDailyWisdomStats(): DailyWisdomState {
  const today = getTodayDateString();
  try {
    const raw = localStorage.getItem(DAILY_WISDOM_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        streakDays: typeof parsed.streakDays === 'number' ? parsed.streakDays : 1,
        totalWisdomRead: typeof parsed.totalWisdomRead === 'number' ? parsed.totalWisdomRead : 0,
        lastLoginDate: parsed.lastLoginDate || today,
        wisdomPoints: typeof parsed.wisdomPoints === 'number' ? parsed.wisdomPoints : 150,
        collectedQuoteIds: Array.isArray(parsed.collectedQuoteIds)
          ? parsed.collectedQuoteIds
          : [FALLBACK_DEFAULT_QUOTE_ID],
        todayQuoteId: parsed.todayQuoteId || FALLBACK_DEFAULT_QUOTE_ID,
        hasSeenToday: parsed.lastLoginDate === today && parsed.hasSeenToday === true,
      };
    }
  } catch (e) {
    console.warn('Error reading daily wisdom stats:', e);
  }

  return {
    streakDays: 1,
    totalWisdomRead: 0,
    lastLoginDate: '',
    wisdomPoints: 100,
    collectedQuoteIds: [FALLBACK_DEFAULT_QUOTE_ID],
    todayQuoteId: FALLBACK_DEFAULT_QUOTE_ID,
    hasSeenToday: false,
  };
}

export function saveDailyWisdomStats(state: DailyWisdomState): void {
  try {
    localStorage.setItem(DAILY_WISDOM_STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Error saving daily wisdom stats:', e);
  }
}

/**
 * Subscribes to wisdom trigger events without eagerly bundling the manuscript quotes dataset.
 */
export function onDailyWisdomTrigger(callback: (quote: AxumiteWisdomQuote) => void): () => void {
  const handler = (e: Event) => {
    const customEvent = e as CustomEvent<{ quote: AxumiteWisdomQuote }>;
    if (customEvent.detail?.quote) {
      callback(customEvent.detail.quote);
    }
  };
  window.addEventListener(WISDOM_TRIGGER_EVENT, handler);
  return () => window.removeEventListener(WISDOM_TRIGGER_EVENT, handler);
}
