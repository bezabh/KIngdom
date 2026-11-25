import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Crosshair,
  Eye,
  Monitor,
  MousePointerClick,
  RotateCcw,
  Smartphone,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { AppTab } from '../types';
import {
  HEATMAP_UPDATED_EVENT,
  HeatmapCell,
  HeatmapViewportKind,
  TapHeatmapPoint,
  analyzeTapHeatmap,
  clearTapHeatmapPoints,
  getTapHeatmapPoints,
} from '../utils/heatmapTracker';

type ViewportFilter = 'all' | HeatmapViewportKind;

function getHeatCellColor(intensity: number): string {
  if (intensity <= 0) return 'transparent';
  if (intensity < 0.28) return `rgba(14, 165, 233, ${(0.18 + intensity * 0.45).toFixed(2)})`;
  if (intensity < 0.62) return `rgba(225, 196, 125, ${(0.34 + intensity * 0.45).toFixed(2)})`;
  return `rgba(249, 115, 22, ${(0.52 + intensity * 0.42).toFixed(2)})`;
}

export const InteractionHeatmapView: React.FC = () => {
  const { language } = useLanguage();
  const isTi = language === 'ti';

  const [points, setPoints] = useState<TapHeatmapPoint[]>(() => getTapHeatmapPoints());
  const [viewportFilter, setViewportFilter] = useState<ViewportFilter>('all');
  const [tabFilter, setTabFilter] = useState<string>('all');
  const [showTargetOverlay, setShowTargetOverlay] = useState<boolean>(true);
  const [inspectedCell, setInspectedCell] = useState<HeatmapCell | null>(null);

  useEffect(() => {
    const onUpdated = (event: Event) => {
      const detail = (event as CustomEvent<TapHeatmapPoint[]>).detail;
      setPoints(Array.isArray(detail) ? detail : getTapHeatmapPoints());
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === 'axumite_tap_heatmap_v1') {
        setPoints(getTapHeatmapPoints());
      }
    };

    window.addEventListener(HEATMAP_UPDATED_EVENT, onUpdated);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(HEATMAP_UPDATED_EVENT, onUpdated);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const availableTabs = useMemo<AppTab[]>(() => {
    const set = new Set<AppTab>();
    for (const p of points) set.add(p.tab);
    return Array.from(set).sort();
  }, [points]);

  const filteredPoints = useMemo(() => {
    return points.filter((p) => {
      if (viewportFilter !== 'all' && p.viewport !== viewportFilter) return false;
      if (tabFilter !== 'all' && p.tab !== tabFilter) return false;
      return true;
    });
  }, [points, viewportFilter, tabFilter]);

  const summary = useMemo(() => analyzeTapHeatmap(filteredPoints, 12, 10), [filteredPoints]);

  const placementRecommendation = useMemo(() => {
    if (summary.totalTaps === 0) {
      return isTi
        ? 'ኣብ ዝኾነ ቦታ መተግበሪ ብምንካፍ ዋዕላ ቦታታት ምትንኻፍን ተበጻሕነትን ኣብዚ ብቀጥታ ተዓዘቡ።'
        : 'Interact across tabs or tap controls anywhere in the app to populate live screen reachability and touch-target telemetry.';
    }

    const topBarPct = summary.zones[0]?.pct ?? 0;
    if (summary.undersizedPct >= 15) {
      return isTi
        ? `${summary.undersizedPct}% ካብ ምትንኻፋት ካብ 44x44px ዝንእሱ መጠወቒታት ረኺቦም። ንተበጻሕነት ዝለዓለ ቦታ ምትንኻፍ ኣስፍሑ።`
        : `${summary.undersizedPct}% of interactive taps landed on controls smaller than 44x44px. Expanding those targets improves touch accuracy and WCAG accessibility.`;
    }
    if (topBarPct >= 35) {
      return isTi
        ? `${topBarPct}% ካብ ምትንኻፋት ኣብ ላዕለዋይ ባር ይርከቡ። ቀንዲ ተግባራት ናብ ምቹእ ቦታ ኣጻብዕቲ (45–80%) ምስጋር ሓጋዚ እዩ።`
        : `${topBarPct}% of taps occur in the Top Bar (0–15%). Moving frequent actions into the Thumb Comfort zone (45–80%) reduces single-hand reach strain.`;
    }
    return isTi
      ? `ጽቡቕ ኣቀማምጣ UI፡ ${summary.thumbZonePct}% ካብ ምትንኻፋት ኣብ ምቹእ ቦታ ኣጻብዕትን ታሕተዋይ መስመርን ይርከቡ።`
      : `Balanced ergonomic layout: ${summary.thumbZonePct}% of taps fall cleanly inside the Thumb Comfort and Bottom Dock reach zones.`;
  }, [isTi, summary]);

  const isMobileAspect = viewportFilter === 'mobile';

  return (
    <section
      aria-label={isTi ? 'ካርታ ዋዕላ ምትንኻፍ (Interaction Heatmap)' : 'Screen Interaction Heatmap'}
      className="bg-[#0B0914] border border-[#8E6D28]/30 rounded-2xl p-5 sm:p-6 space-y-5"
    >
      {/* Header & Controls */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2">
            <Crosshair className="w-4 h-4 text-[#E1C47D] shrink-0" aria-hidden="true" />
            <h2 className="text-base sm:text-lg font-bold text-[#F3E5AB] font-serif">
              {isTi ? 'ካርታ ዋዕላ ምትንኻፍ UI (Interaction Heatmap)' : 'Screen Interaction Heatmap'}
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            {isTi
              ? 'ተጠቀምቲ ብዝበዝሐ ኣበይ ከም ዝትንክፉ ብምርኣይ ንተበጻሕነት (44x44px) ዝምችእ ኣቀማምጣ UI ኣመሓይሹ።'
              : 'Visualizes screen tap density, single-hand thumb reach zones, and sub-44px accessibility target hits.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Viewport Filter Segmented Buttons */}
          <div
            role="group"
            aria-label={isTi ? 'ዓይነት ስክሪን' : 'Viewport filter'}
            className="flex items-center gap-1 p-1 rounded-lg bg-[#141220] border border-slate-800"
          >
            {(
              [
                { id: 'all', labelEn: 'All Screens', labelTi: 'ኩሉ', icon: null },
                { id: 'mobile', labelEn: 'Mobile', labelTi: 'ሞባይል', icon: Smartphone },
                { id: 'desktop', labelEn: 'Desktop', labelTi: 'ዴስክቶፕ', icon: Monitor },
              ] as const
            ).map((opt) => {
              const active = viewportFilter === opt.id;
              const Icon = opt.icon;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setViewportFilter(opt.id);
                    setInspectedCell(null);
                  }}
                  aria-pressed={active}
                  className={`min-h-[32px] px-2.5 py-1 rounded-md text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 ${
                    active
                      ? 'bg-[#2A2010] text-[#F3E5AB] focus-visible:ring-[#E1C47D]'
                      : 'text-slate-400 hover:text-slate-200 focus-visible:ring-slate-500'
                  }`}
                >
                  {Icon && <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
                  <span>{isTi ? opt.labelTi : opt.labelEn}</span>
                </button>
              );
            })}
          </div>

          {/* Active Tab Filter */}
          <select
            aria-label={isTi ? 'ታብ ምረጽ' : 'Filter by tab'}
            value={tabFilter}
            onChange={(e) => {
              setTabFilter(e.target.value);
              setInspectedCell(null);
            }}
            className="min-h-[36px] px-2.5 py-1 rounded-lg bg-[#141220] border border-slate-800 text-xs text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E1C47D] cursor-pointer"
          >
            <option value="all">{isTi ? 'ኩሎም ታብስ' : 'All Tabs'}</option>
            {availableTabs.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          {/* Toggle Undersized / Raw Points */}
          <button
            type="button"
            onClick={() => setShowTargetOverlay((prev) => !prev)}
            aria-pressed={showTargetOverlay}
            className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 ${
              showTargetOverlay
                ? 'bg-[#1F190D] border border-[#8E6D28]/50 text-[#F3E5AB] focus-visible:ring-[#E1C47D]'
                : 'bg-[#141220] border border-slate-800 text-slate-400 hover:text-slate-200 focus-visible:ring-slate-500'
            }`}
          >
            <Eye className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>{isTi ? 'ነጥብታት ኣርኢ' : 'Tap Points'}</span>
          </button>

          {/* Reset / Clear Data */}
          <button
            type="button"
            data-heatmap-ignore="true"
            onClick={() => {
              clearTapHeatmapPoints();
              setInspectedCell(null);
            }}
            disabled={points.length === 0}
            className="min-h-[36px] px-3 py-1 rounded-lg bg-[#141220] hover:bg-[#1E1A2E] border border-slate-800 text-xs font-medium text-slate-300 inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E1C47D]"
          >
            <RotateCcw className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>{isTi ? 'ኣጽሪ' : 'Clear'}</span>
          </button>
        </div>
      </div>

      {/* Tabular KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-slate-800/80">
        <div>
          <div className="text-[11px] text-slate-400">
            {isTi ? 'ጠቕላላ ምትንኻፋት' : 'Recorded Taps'}
          </div>
          <div
            data-testid="heatmap-total-taps"
            className="mt-0.5 text-xl font-bold font-mono tabular-nums text-[#F3E5AB]"
          >
            {summary.totalTaps}
          </div>
          <div className="text-[11px] font-mono tabular-nums text-slate-500">
            {summary.interactiveTaps} {isTi ? 'ተግባራዊ መጠወቒ' : 'on controls'}
          </div>
        </div>

        <div>
          <div className="text-[11px] text-slate-400">
            {isTi ? 'ምቹእ ቦታ ኣጻብዕቲ' : 'Thumb Comfort Reach'}
          </div>
          <div
            data-testid="heatmap-thumb-pct"
            className="mt-0.5 text-xl font-bold font-mono tabular-nums text-emerald-300"
          >
            {summary.totalTaps > 0 ? `${summary.thumbZonePct}%` : '—'}
          </div>
          <div className="text-[11px] text-slate-500">
            {isTi ? '45–100% ታሕተዋይ ስክሪን' : '45–100% vertical reach'}
          </div>
        </div>

        <div>
          <div className="text-[11px] text-slate-400">
            {isTi ? 'ዝበዝሐ ዝተተንከፈ ዞባ' : 'Primary Hotspot Zone'}
          </div>
          <div
            data-testid="heatmap-top-zone"
            className="mt-0.5 text-base sm:text-lg font-bold text-slate-100 truncate"
          >
            {summary.topZone
              ? isTi
                ? summary.topZone.labelTi
                : summary.topZone.labelEn
              : '—'}
          </div>
          <div className="text-[11px] font-mono tabular-nums text-slate-500">
            {summary.topZone ? `${summary.topZone.pct}% · ${summary.topZone.rangeLabel}` : 'No hits'}
          </div>
        </div>

        <div>
          <div className="text-[11px] text-slate-400">
            {isTi ? 'ንኣሽቱ መጠወቒታት (<44px)' : 'Sub-44px Target Hits'}
          </div>
          <div
            data-testid="heatmap-undersized-pct"
            className={`mt-0.5 text-xl font-bold font-mono tabular-nums ${
              summary.undersizedTaps > 0 ? 'text-amber-300' : 'text-slate-100'
            }`}
          >
            {summary.interactiveTaps > 0 ? `${summary.undersizedPct}%` : '—'}
          </div>
          <div className="text-[11px] font-mono tabular-nums text-slate-500">
            {summary.undersizedTaps} {isTi ? 'ንኣሽቱ ንኽክእ' : 'accessibility flags'}
          </div>
        </div>
      </div>

      {/* Main 2-Column Split: Thermal Grid Viewport + Reach Zone & Accessibility Analysis */}
      <div className="pt-4 border-t border-slate-800/80 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Screen Thermal Grid Canvas */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
            <div className="flex items-center gap-3">
              <span>{isTi ? 'ዝሑል (ውሑድ)' : 'Cool'}</span>
              <div
                aria-hidden="true"
                className="w-28 h-2 rounded-full bg-gradient-to-r from-sky-500/40 via-[#E1C47D]/70 to-orange-500/95"
              />
              <span>{isTi ? 'ውዑይ (ዝበዝሐ)' : 'Hot'}</span>
            </div>
            {inspectedCell && (
              <span className="font-mono tabular-nums text-[#F3E5AB]">
                Grid ({inspectedCell.col + 1}, {inspectedCell.row + 1}) · {inspectedCell.count}{' '}
                {isTi ? 'ምትንኻፍ' : 'taps'} ({inspectedCell.sharePct}%)
              </span>
            )}
          </div>

          {/* Screen Wireframe + 12x10 Heatmap Matrix */}
          <div
            data-testid="interaction-heatmap-canvas"
            className={`relative mx-auto rounded-xl border border-slate-800 bg-[#070709] overflow-hidden ${
              isMobileAspect ? 'max-w-[320px] aspect-[9/16]' : 'w-full aspect-[16/10]'
            }`}
          >
            {/* Subtle UI Wireframe Landmarks (Header, Content, Bottom Dock) */}
            <div
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-[10%] border-b border-slate-800/70 bg-slate-900/35 px-3 flex items-center justify-between text-[10px] text-slate-500 pointer-events-none"
            >
              <span>{isTi ? 'ናቭባር (Top Navbar)' : 'Top Navbar Zone'}</span>
              <span className="font-mono tabular-nums">0–10%</span>
            </div>

            <div
              aria-hidden="true"
              className="absolute inset-x-0 top-[45%] h-[35%] border-y border-dashed border-emerald-500/20 bg-emerald-500/[0.025] pointer-events-none flex items-start justify-end px-3 py-1"
            >
              <span className="text-[10px] text-emerald-400/70">
                {isTi ? 'ምቹእ ቦታ ኣጻብዕቲ' : 'Thumb Comfort Zone'}
              </span>
            </div>

            <div
              aria-hidden="true"
              className="absolute inset-x-0 bottom-0 h-[12%] border-t border-slate-800/70 bg-slate-900/45 px-3 flex items-center justify-between text-[10px] text-slate-500 pointer-events-none"
            >
              <span>{isTi ? 'ታሕተዋይ ናቪጌሽን (Bottom Dock)' : 'Bottom Navigation Dock'}</span>
              <span className="font-mono tabular-nums">88–100%</span>
            </div>

            {/* 12x10 Thermal Density Grid */}
            <div
              className="absolute inset-0 grid grid-cols-12 grid-rows-10"
              role="grid"
              aria-label={isTi ? '12x10 ካርታ ዋዕላ ስክሪን' : '12 by 10 screen tap density grid'}
            >
              {summary.cells.map((cell) => {
                const bg = getHeatCellColor(cell.intensity);
                const isSelected =
                  inspectedCell?.col === cell.col && inspectedCell?.row === cell.row;
                return (
                  <button
                    key={`${cell.col}-${cell.row}`}
                    type="button"
                    onMouseEnter={() => cell.count > 0 && setInspectedCell(cell)}
                    onFocus={() => setInspectedCell(cell)}
                    onClick={() => setInspectedCell(cell)}
                    aria-label={`Grid cell ${cell.col + 1} by ${cell.row + 1}: ${cell.count} taps`}
                    className={`border-[0.5px] border-white/[0.03] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#E1C47D] ${
                      isSelected ? 'ring-1 ring-[#F3E5AB]' : ''
                    }`}
                    style={{ backgroundColor: bg }}
                  />
                );
              })}
            </div>

            {/* Individual Tap Scatter Dots & Undersized Warning Rings */}
            {showTargetOverlay &&
              filteredPoints.slice(-150).map((pt) => (
                <span
                  key={pt.id}
                  aria-hidden="true"
                  className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none ${
                    pt.undersizedTarget
                      ? 'w-2.5 h-2.5 border border-rose-400 bg-rose-500/50'
                      : 'w-1.5 h-1.5 bg-[#F3E5AB]/75'
                  }`}
                  style={{
                    left: `${(pt.xNorm * 100).toFixed(2)}%`,
                    top: `${(pt.yNorm * 100).toFixed(2)}%`,
                  }}
                />
              ))}

            {/* Guided Empty Overlay */}
            {summary.totalTaps === 0 && (
              <div
                data-testid="interaction-heatmap-empty"
                className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 bg-[#070709]/80 pointer-events-none"
              >
                <MousePointerClick className="w-6 h-6 text-[#E1C47D] mb-2" aria-hidden="true" />
                <p className="text-xs font-semibold text-slate-200">
                  {isTi ? 'ገና ዝተመዝገበ ምትንኻፍ የለን' : 'No screen taps recorded yet'}
                </p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
                  {isTi
                    ? 'ኣብዚ ስክሪን ወይ ዝኾነ ታብ ብምንካፍ ዋዕላ ምትንኻፍን ተበጻሕነትን ርኣዩ።'
                    : 'Click buttons, switch tabs, or tap anywhere on screen to populate real heatmap hotspots.'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Screen Zone Breakdown & Accessibility Placement Insights */}
        <div className="lg:col-span-5 space-y-5">
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-200">
              {isTi ? 'ክፍፍል ምትንኻፍ ብዞባ ስክሪን' : 'Vertical Reach Zone Distribution'}
            </h3>
            <div className="space-y-3">
              {summary.zones.map((zone) => (
                <div key={zone.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs gap-2">
                    <span className="text-slate-300 truncate">
                      {isTi ? zone.labelTi : zone.labelEn}{' '}
                      <span className="text-slate-500 font-mono tabular-nums">
                        ({zone.rangeLabel})
                      </span>
                    </span>
                    <span className="font-mono tabular-nums font-semibold text-[#F3E5AB] shrink-0">
                      {zone.pct}% · {zone.count}
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        zone.id === 'thumb-comfort' || zone.id === 'bottom-dock'
                          ? 'bg-emerald-400'
                          : 'bg-[#C5A059]'
                      }`}
                      style={{ width: `${Math.max(zone.count > 0 ? 4 : 0, zone.pct)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {summary.topTabs.length > 0 && (
            <div className="pt-4 border-t border-slate-800/80 space-y-2.5">
              <h3 className="text-xs font-semibold text-slate-200">
                {isTi ? 'ዝበዝሐ ዝተነኽኡ ታብስ' : 'Most Active Screens'}
              </h3>
              <div className="space-y-1.5">
                {summary.topTabs.map((item) => (
                  <div
                    key={item.tab}
                    className="flex items-center justify-between text-xs py-1 border-b border-slate-800/50 last:border-b-0"
                  >
                    <span className="text-slate-300 font-mono truncate">{item.tab}</span>
                    <span className="font-mono tabular-nums text-slate-400">
                      {item.count} taps · {item.pct}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Accessibility Recommendation Box (no border-l-4 cliché, clean subtle border) */}
          <div className="pt-4 border-t border-slate-800/80">
            <div className="p-3.5 rounded-xl bg-[#141220] border border-[#8E6D28]/30 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#F3E5AB]">
                <AlertTriangle className="w-3.5 h-3.5 text-[#E1C47D] shrink-0" aria-hidden="true" />
                <span>
                  {isTi ? 'ምኽሪ ኣቀማምጣ ተበጻሕነት' : 'UI Accessibility Optimization'}
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{placementRecommendation}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
