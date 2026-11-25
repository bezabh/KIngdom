import { AppTab } from '../types';
import { getSwipeThresholdPx } from './haptics';

export interface SwipeAttemptRecord {
  id: string;
  timestamp: number;
  fromTab: AppTab;
  toTab?: AppTab;
  distancePx: number;
  velocityPxS: number;
  thresholdPx: number;
  succeeded: boolean;
  direction: 'left' | 'right';
}

export interface InteractionSummary {
  totalAttempts: number;
  successfulTransitions: number;
  snapBacks: number;
  successRatePct: number;
  avgSwipeDistancePx: number;
  avgCommittedDistancePx: number;
  avgVelocityPxS: number;
  currentThresholdPx: number;
  recommendedThresholdPx: number | null;
  adviceKey: 'need-more-data' | 'lower-threshold' | 'raise-threshold' | 'balanced';
}

export interface InteractionChartDatum {
  label: string;
  avgDistancePx: number;
  thresholdPx: number;
  successRatePct: number;
  attempts: number;
  successes: number;
}

export const INTERACTION_METRICS_STORAGE_KEY = 'axumite_interaction_metrics_v1';
export const INTERACTION_METRICS_EVENT = 'axumite_interaction_metrics_updated';
const MAX_STORED_SWIPES = 150;

export function getSwipeAttemptRecords(): SwipeAttemptRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(INTERACTION_METRICS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is SwipeAttemptRecord =>
        Boolean(item) &&
        typeof item.id === 'string' &&
        typeof item.timestamp === 'number' &&
        typeof item.distancePx === 'number' &&
        typeof item.velocityPxS === 'number' &&
        typeof item.thresholdPx === 'number' &&
        typeof item.succeeded === 'boolean' &&
        (item.direction === 'left' || item.direction === 'right')
    );
  } catch {
    return [];
  }
}

function saveSwipeAttemptRecords(records: SwipeAttemptRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    const trimmed = records.slice(-MAX_STORED_SWIPES);
    window.localStorage.setItem(INTERACTION_METRICS_STORAGE_KEY, JSON.stringify(trimmed));
    window.dispatchEvent(
      new CustomEvent<SwipeAttemptRecord[]>(INTERACTION_METRICS_EVENT, { detail: trimmed })
    );
  } catch {
    // Ignore storage quota errors
  }
}

export function recordSwipeAttempt(
  entry: Omit<SwipeAttemptRecord, 'id' | 'timestamp'>
): SwipeAttemptRecord {
  const record: SwipeAttemptRecord = {
    ...entry,
    id: `swp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: Date.now(),
    distancePx: Math.max(0, Math.round(entry.distancePx)),
    velocityPxS: Math.max(0, Math.round(entry.velocityPxS)),
    thresholdPx: Math.max(24, Math.round(entry.thresholdPx)),
  };

  const existing = getSwipeAttemptRecords();
  saveSwipeAttemptRecords([...existing, record]);
  return record;
}

export function clearSwipeAttemptRecords(): void {
  saveSwipeAttemptRecords([]);
}

export function summarizeInteractionMetrics(
  records: SwipeAttemptRecord[],
  currentThresholdPx: number = getSwipeThresholdPx()
): InteractionSummary {
  const totalAttempts = records.length;
  if (totalAttempts === 0) {
    return {
      totalAttempts: 0,
      successfulTransitions: 0,
      snapBacks: 0,
      successRatePct: 0,
      avgSwipeDistancePx: 0,
      avgCommittedDistancePx: 0,
      avgVelocityPxS: 0,
      currentThresholdPx,
      recommendedThresholdPx: null,
      adviceKey: 'need-more-data',
    };
  }

  let successfulTransitions = 0;
  let totalDistance = 0;
  let committedDistance = 0;
  let totalVelocity = 0;

  for (const r of records) {
    totalDistance += r.distancePx;
    totalVelocity += r.velocityPxS;
    if (r.succeeded) {
      successfulTransitions += 1;
      committedDistance += r.distancePx;
    }
  }

  const snapBacks = totalAttempts - successfulTransitions;
  const successRatePct = Math.round((successfulTransitions / totalAttempts) * 100);
  const avgSwipeDistancePx = Math.round(totalDistance / totalAttempts);
  const avgCommittedDistancePx =
    successfulTransitions > 0 ? Math.round(committedDistance / successfulTransitions) : 0;
  const avgVelocityPxS = Math.round(totalVelocity / totalAttempts);

  let recommendedThresholdPx: number | null = null;
  let adviceKey: InteractionSummary['adviceKey'] = 'need-more-data';

  const avgFailedDistancePx =
    snapBacks > 0
      ? Math.round((totalDistance - committedDistance) / snapBacks)
      : avgSwipeDistancePx;

  if (totalAttempts >= 3) {
    if (successRatePct < 65 && currentThresholdPx > 24) {
      const targetAnchor = snapBacks > 0 ? avgFailedDistancePx : avgSwipeDistancePx;
      const candidate = Math.min(
        currentThresholdPx - 6,
        Math.max(24, Math.round(targetAnchor * 0.9))
      );
      recommendedThresholdPx =
        candidate >= 24 && candidate < currentThresholdPx
          ? candidate
          : Math.max(24, currentThresholdPx - 10);
      adviceKey = 'lower-threshold';
    } else if (
      successRatePct >= 92 &&
      avgCommittedDistancePx > currentThresholdPx * 1.7 &&
      currentThresholdPx < 100
    ) {
      recommendedThresholdPx = Math.min(120, Math.round((currentThresholdPx + avgCommittedDistancePx) / 2));
      adviceKey = 'raise-threshold';
    } else {
      adviceKey = 'balanced';
    }
  }

  return {
    totalAttempts,
    successfulTransitions,
    snapBacks,
    successRatePct,
    avgSwipeDistancePx,
    avgCommittedDistancePx,
    avgVelocityPxS,
    currentThresholdPx,
    recommendedThresholdPx,
    adviceKey,
  };
}

export function buildInteractionChartSeries(
  records: SwipeAttemptRecord[],
  windowLimit: 10 | 25 | 150 = 25
): InteractionChartDatum[] {
  const sliced = records.slice(-windowLimit);
  if (sliced.length === 0) return [];

  // Show individual gestures when count <= 10 for crisp per-gesture granularity
  if (sliced.length <= 10) {
    const startOffset = records.length - sliced.length;
    return sliced.map((item, idx) => ({
      label: `#${startOffset + idx + 1}`,
      avgDistancePx: item.distancePx,
      thresholdPx: item.thresholdPx,
      successRatePct: item.succeeded ? 100 : 0,
      attempts: 1,
      successes: item.succeeded ? 1 : 0,
    }));
  }

  // Group into up to 8 balanced sequential buckets for readable trend visualization
  const bucketCount = Math.min(8, Math.ceil(sliced.length / 3));
  const bucketSize = Math.ceil(sliced.length / bucketCount);
  const startOffset = records.length - sliced.length;
  const series: InteractionChartDatum[] = [];

  for (let i = 0; i < sliced.length; i += bucketSize) {
    const chunk = sliced.slice(i, i + bucketSize);
    const totalDist = chunk.reduce((sum, c) => sum + c.distancePx, 0);
    const totalThresh = chunk.reduce((sum, c) => sum + c.thresholdPx, 0);
    const successes = chunk.filter((c) => c.succeeded).length;
    const fromIdx = startOffset + i + 1;
    const toIdx = startOffset + i + chunk.length;

    series.push({
      label: fromIdx === toIdx ? `#${fromIdx}` : `${fromIdx}–${toIdx}`,
      avgDistancePx: Math.round(totalDist / chunk.length),
      thresholdPx: Math.round(totalThresh / chunk.length),
      successRatePct: Math.round((successes / chunk.length) * 100),
      attempts: chunk.length,
      successes,
    });
  }

  return series;
}
