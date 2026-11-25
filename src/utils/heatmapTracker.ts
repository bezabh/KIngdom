import { AppTab } from '../types';

export type HeatmapViewportKind = 'mobile' | 'desktop';
export type HeatmapTargetKind = 'button' | 'nav' | 'input' | 'link' | 'surface';

export interface TapHeatmapPoint {
  id: string;
  timestamp: number;
  xNorm: number; // 0..1
  yNorm: number; // 0..1
  viewport: HeatmapViewportKind;
  tab: AppTab;
  targetKind: HeatmapTargetKind;
  undersizedTarget: boolean;
}

export interface HeatmapCell {
  col: number;
  row: number;
  count: number;
  undersizedCount: number;
  intensity: number; // 0..1 relative to max cell count
  sharePct: number;
}

export interface ScreenZoneSummary {
  id: 'top-chrome' | 'upper-stage' | 'thumb-comfort' | 'bottom-dock';
  labelEn: string;
  labelTi: string;
  rangeLabel: string;
  count: number;
  pct: number;
}

export interface HeatmapAnalyticsSummary {
  totalTaps: number;
  interactiveTaps: number;
  undersizedTaps: number;
  undersizedPct: number;
  thumbZonePct: number;
  topZone: ScreenZoneSummary | null;
  zones: ScreenZoneSummary[];
  cells: HeatmapCell[];
  maxCellCount: number;
  cols: number;
  rows: number;
  topTabs: { tab: AppTab; count: number; pct: number }[];
}

export const HEATMAP_STORAGE_KEY = 'axumite_tap_heatmap_v1';
export const HEATMAP_UPDATED_EVENT = 'axumite_tap_heatmap_updated';
const MAX_HEATMAP_POINTS = 400;

let lastRecordedTs = 0;

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0.5;
  return Math.min(0.999, Math.max(0, value));
}

export function getTapHeatmapPoints(): TapHeatmapPoint[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(HEATMAP_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is TapHeatmapPoint =>
        Boolean(item) &&
        typeof item.id === 'string' &&
        typeof item.timestamp === 'number' &&
        typeof item.xNorm === 'number' &&
        typeof item.yNorm === 'number' &&
        (item.viewport === 'mobile' || item.viewport === 'desktop') &&
        typeof item.tab === 'string'
    );
  } catch {
    return [];
  }
}

function saveTapHeatmapPoints(points: TapHeatmapPoint[]): void {
  if (typeof window === 'undefined') return;
  try {
    const trimmed = points.slice(-MAX_HEATMAP_POINTS);
    window.localStorage.setItem(HEATMAP_STORAGE_KEY, JSON.stringify(trimmed));
    window.dispatchEvent(
      new CustomEvent<TapHeatmapPoint[]>(HEATMAP_UPDATED_EVENT, { detail: trimmed })
    );
  } catch {
    // Ignore storage quota errors
  }
}

export function clearTapHeatmapPoints(): void {
  saveTapHeatmapPoints([]);
}

export function recordTapHeatmapPoint(
  input: Omit<TapHeatmapPoint, 'id' | 'timestamp'>
): TapHeatmapPoint {
  const point: TapHeatmapPoint = {
    ...input,
    id: `tap_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: Date.now(),
    xNorm: Number(clamp01(input.xNorm).toFixed(4)),
    yNorm: Number(clamp01(input.yNorm).toFixed(4)),
  };

  const existing = getTapHeatmapPoints();
  saveTapHeatmapPoints([...existing, point]);
  return point;
}

export function recordTapHeatmapPointFromEvent(
  event: PointerEvent,
  activeTab: AppTab
): TapHeatmapPoint | null {
  if (typeof window === 'undefined') return null;

  const vw = window.innerWidth || 1;
  const vh = window.innerHeight || 1;
  if (event.clientX < 0 || event.clientY < 0 || event.clientX > vw || event.clientY > vh) {
    return null;
  }

  const target = event.target as HTMLElement | null;
  if (target?.closest('[data-heatmap-ignore="true"]')) {
    return null;
  }

  const now = Date.now();
  if (now - lastRecordedTs < 65) return null;
  lastRecordedTs = now;

  let targetKind: HeatmapTargetKind = 'surface';
  let undersizedTarget = false;

  const interactiveEl = target?.closest(
    'button, a, input, select, textarea, [role="button"], [role="switch"], [role="tab"]'
  ) as HTMLElement | null;

  if (interactiveEl) {
    const tag = interactiveEl.tagName.toLowerCase();
    if (interactiveEl.closest('nav, header')) {
      targetKind = 'nav';
    } else if (tag === 'input' || tag === 'select' || tag === 'textarea') {
      targetKind = 'input';
    } else if (tag === 'a') {
      targetKind = 'link';
    } else {
      targetKind = 'button';
    }

    const rect = interactiveEl.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44)) {
      undersizedTarget = true;
    }
  }

  return recordTapHeatmapPoint({
    xNorm: event.clientX / vw,
    yNorm: event.clientY / vh,
    viewport: vw < 768 ? 'mobile' : 'desktop',
    tab: activeTab,
    targetKind,
    undersizedTarget,
  });
}

export function analyzeTapHeatmap(
  points: TapHeatmapPoint[],
  cols = 12,
  rows = 10
): HeatmapAnalyticsSummary {
  const totalTaps = points.length;
  const cells: HeatmapCell[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push({
        col: c,
        row: r,
        count: 0,
        undersizedCount: 0,
        intensity: 0,
        sharePct: 0,
      });
    }
  }

  const zones: ScreenZoneSummary[] = [
    {
      id: 'top-chrome',
      labelEn: 'Top Bar & Controls',
      labelTi: 'ላዕለዋይ ባር',
      rangeLabel: '0–15%',
      count: 0,
      pct: 0,
    },
    {
      id: 'upper-stage',
      labelEn: 'Upper Content Zone',
      labelTi: 'ላዕለዋይ ገጽ',
      rangeLabel: '15–45%',
      count: 0,
      pct: 0,
    },
    {
      id: 'thumb-comfort',
      labelEn: 'Thumb Comfort Zone',
      labelTi: 'ምቹእ ቦታ ኣጻብዕቲ',
      rangeLabel: '45–80%',
      count: 0,
      pct: 0,
    },
    {
      id: 'bottom-dock',
      labelEn: 'Bottom Navigation Dock',
      labelTi: 'ታሕተዋይ መስመር',
      rangeLabel: '80–100%',
      count: 0,
      pct: 0,
    },
  ];

  let interactiveTaps = 0;
  let undersizedTaps = 0;
  const tabCounts = new Map<AppTab, number>();

  for (const pt of points) {
    const col = Math.min(cols - 1, Math.max(0, Math.floor(pt.xNorm * cols)));
    const row = Math.min(rows - 1, Math.max(0, Math.floor(pt.yNorm * rows)));
    const idx = row * cols + col;
    cells[idx].count += 1;
    if (pt.undersizedTarget) {
      cells[idx].undersizedCount += 1;
    }

    if (pt.targetKind !== 'surface') {
      interactiveTaps += 1;
      if (pt.undersizedTarget) undersizedTaps += 1;
    }

    if (pt.yNorm < 0.15) zones[0].count += 1;
    else if (pt.yNorm < 0.45) zones[1].count += 1;
    else if (pt.yNorm < 0.8) zones[2].count += 1;
    else zones[3].count += 1;

    tabCounts.set(pt.tab, (tabCounts.get(pt.tab) ?? 0) + 1);
  }

  let maxCellCount = 0;
  for (const cell of cells) {
    if (cell.count > maxCellCount) maxCellCount = cell.count;
  }

  if (totalTaps > 0) {
    for (const cell of cells) {
      cell.intensity = maxCellCount > 0 ? cell.count / maxCellCount : 0;
      cell.sharePct = Math.round((cell.count / totalTaps) * 100);
    }
    for (const zone of zones) {
      zone.pct = Math.round((zone.count / totalTaps) * 100);
    }
  }

  const sortedZones = [...zones].sort((a, b) => b.count - a.count);
  const topZone = totalTaps > 0 ? sortedZones[0] : null;
  const thumbZonePct =
    totalTaps > 0 ? Math.round(((zones[2].count + zones[3].count) / totalTaps) * 100) : 0;
  const undersizedPct =
    interactiveTaps > 0 ? Math.round((undersizedTaps / interactiveTaps) * 100) : 0;

  const topTabs = Array.from(tabCounts.entries())
    .map(([tab, count]) => ({
      tab,
      count,
      pct: totalTaps > 0 ? Math.round((count / totalTaps) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalTaps,
    interactiveTaps,
    undersizedTaps,
    undersizedPct,
    thumbZonePct,
    topZone,
    zones,
    cells,
    maxCellCount,
    cols,
    rows,
    topTabs,
  };
}
