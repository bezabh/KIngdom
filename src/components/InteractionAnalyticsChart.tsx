import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Activity, MoveHorizontal, RotateCcw, Sliders } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import {
  HAPTICS_SETTINGS_EVENT,
  HapticSettings,
  getSwipeThresholdPx,
  saveHapticSettings,
} from '../utils/haptics';
import { computeSwipeSnapDecision } from '../utils/swipePhysics';
import {
  INTERACTION_METRICS_EVENT,
  SwipeAttemptRecord,
  buildInteractionChartSeries,
  clearSwipeAttemptRecords,
  getSwipeAttemptRecords,
  recordSwipeAttempt,
  summarizeInteractionMetrics,
} from '../utils/interactionMetrics';

interface InteractionAnalyticsChartProps {
  variant?: 'dark' | 'light';
}

type WindowFilter = 10 | 25 | 150;

export const InteractionAnalyticsChart: React.FC<InteractionAnalyticsChartProps> = ({
  variant = 'dark',
}) => {
  const { language } = useLanguage();
  const isTi = language === 'ti';
  const isDark = variant === 'dark';

  const [records, setRecords] = useState<SwipeAttemptRecord[]>(() => getSwipeAttemptRecords());
  const [thresholdPx, setThresholdPx] = useState<number>(() => getSwipeThresholdPx());
  const [windowFilter, setWindowFilter] = useState<WindowFilter>(25);

  // Interactive calibration swipe pad state (supports both pointer & touch drag)
  const dragStartRef = useRef<{ x: number; time: number } | null>(null);
  const lastMoveRef = useRef<{ x: number; time: number; velocityX: number }>({
    x: 0,
    time: 0,
    velocityX: 0,
  });
  const [liveDragDeltaX, setLiveDragDeltaX] = useState<number>(0);
  const [lastCalibrationResult, setLastCalibrationResult] = useState<{
    distancePx: number;
    succeeded: boolean;
  } | null>(null);

  useEffect(() => {
    const onMetricsUpdated = (event: Event) => {
      const detail = (event as CustomEvent<SwipeAttemptRecord[]>).detail;
      setRecords(Array.isArray(detail) ? detail : getSwipeAttemptRecords());
    };
    const onHapticsUpdated = (event: Event) => {
      const detail = (event as CustomEvent<HapticSettings>).detail;
      setThresholdPx(detail?.swipeThresholdPx ?? getSwipeThresholdPx());
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === 'axumite_interaction_metrics_v1') {
        setRecords(getSwipeAttemptRecords());
      }
    };

    window.addEventListener(INTERACTION_METRICS_EVENT, onMetricsUpdated);
    window.addEventListener(HAPTICS_SETTINGS_EVENT, onHapticsUpdated);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(INTERACTION_METRICS_EVENT, onMetricsUpdated);
      window.removeEventListener(HAPTICS_SETTINGS_EVENT, onHapticsUpdated);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const scopedRecords = useMemo(
    () => (windowFilter === 150 ? records : records.slice(-windowFilter)),
    [records, windowFilter]
  );

  const summary = useMemo(
    () => summarizeInteractionMetrics(scopedRecords, thresholdPx),
    [scopedRecords, thresholdPx]
  );

  const chartData = useMemo(
    () => buildInteractionChartSeries(records, windowFilter),
    [records, windowFilter]
  );

  const handlePadPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const now = Date.now();
    dragStartRef.current = { x: e.clientX, time: now };
    lastMoveRef.current = { x: e.clientX, time: now, velocityX: 0 };
    setLiveDragDeltaX(0);
  };

  const handlePadPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStartRef.current) return;
    const now = Date.now();
    const dt = now - lastMoveRef.current.time;
    if (dt > 0) {
      const instantVelocity = ((e.clientX - lastMoveRef.current.x) / dt) * 1000;
      lastMoveRef.current.velocityX = lastMoveRef.current.velocityX * 0.35 + instantVelocity * 0.65;
      lastMoveRef.current.x = e.clientX;
      lastMoveRef.current.time = now;
    }
    setLiveDragDeltaX(e.clientX - dragStartRef.current.x);
  };

  const finishPadDrag = (endX: number) => {
    if (!dragStartRef.current) return;
    const deltaX = endX - dragStartRef.current.x;
    const velocityX =
      Date.now() - lastMoveRef.current.time > 90 ? 0 : lastMoveRef.current.velocityX;
    dragStartRef.current = null;
    setLiveDragDeltaX(0);

    if (Math.abs(deltaX) < 12) return;

    const decision = computeSwipeSnapDecision({
      deltaX,
      velocityX,
      thresholdPx,
      axis: 'horizontal',
    });

    const distancePx = Math.round(Math.abs(deltaX));
    recordSwipeAttempt({
      fromTab: 'management',
      toTab: decision.shouldTransition ? 'premiere' : undefined,
      distancePx,
      velocityPxS: Math.abs(velocityX),
      thresholdPx,
      succeeded: decision.shouldTransition,
      direction: decision.direction,
    });

    setLastCalibrationResult({ distancePx, succeeded: decision.shouldTransition });
  };

  const handleApplyRecommendedThreshold = () => {
    if (summary.recommendedThresholdPx === null) return;
    const updated = saveHapticSettings({ swipeThresholdPx: summary.recommendedThresholdPx });
    setThresholdPx(updated.swipeThresholdPx);
  };

  const adviceText = (() => {
    switch (summary.adviceKey) {
      case 'lower-threshold':
        return isTi
          ? `ገምጋም፡ ማእከላይ ርሕቀት ስዋይፕ (${summary.avgSwipeDistancePx}px) ካብ ሕጂ ዘሎ ደረት (${summary.currentThresholdPx}px) ይንእስ ስለ ዘሎ ናብ ${summary.recommendedThresholdPx}px ምውራድ ዕዉት ምቕያር ታብ የዛይድ።`
          : `Average swipe distance (${summary.avgSwipeDistancePx}px) frequently falls short of your ${summary.currentThresholdPx}px threshold. Lowering to ${summary.recommendedThresholdPx}px reduces snap-backs.`;
      case 'raise-threshold':
        return isTi
          ? `ገምጋም፡ ስዋይፕታት ብቐሊሉ (${summary.avgCommittedDistancePx}px) ይሓልፉ ኣለዉ። ሃንደበታዊ ምቕያር ንምክልኻል ናብ ${summary.recommendedThresholdPx}px ክብ ምባል ይከኣል።`
          : `Committed swipes average ${summary.avgCommittedDistancePx}px, well above ${summary.currentThresholdPx}px. Raising to ${summary.recommendedThresholdPx}px helps prevent accidental tab switches.`;
      case 'balanced':
        return isTi
          ? `ጽቡቕ ሚዛን፡ መጠን ዕዉትነት (${summary.successRatePct}%) ምስ ደረት ${summary.currentThresholdPx}px ብግቡእ ተወሃሂዱ ኣሎ።`
          : `Well calibrated: ${summary.successRatePct}% transition success aligns cleanly with your ${summary.currentThresholdPx}px swipe threshold.`;
      default:
        return isTi
          ? 'ንልክዕ ምኽሪ ቅጥዒ እንተወሓደ 3 ስዋይፕ ኣብ መተግበሪ ወይ ኣብ ታሕቲ ዘሎ መፈተኒ ቦታ ግበሩ።'
          : 'Complete at least 3 swipe gestures across tabs or on the calibration strip below for tailored threshold guidance.';
    }
  })();

  return (
    <section
      aria-label={
        isTi ? 'ግራፍ ትንተና ስዋይፕ ተጠቃሚ' : 'User Swipe Interaction Analytics'
      }
      className={
        isDark
          ? 'bg-[#0B0914] border border-[#8E6D28]/30 rounded-2xl p-5 space-y-5'
          : 'bg-white border border-slate-200 rounded-2xl p-5 space-y-5'
      }
    >
      {/* Header + Window Filter & Reset Controls */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2">
            <Activity
              className={`w-4 h-4 shrink-0 ${isDark ? 'text-[#E1C47D]' : 'text-amber-700'}`}
              aria-hidden="true"
            />
            <h3
              className={`text-base font-bold font-serif ${
                isDark ? 'text-[#F3E5AB]' : 'text-slate-900'
              }`}
            >
              {isTi ? 'ትንተና ስዋይፕን ዕዉትነት ምቕያር ታብን' : 'Swipe & Transition Interaction Chart'}
            </h3>
          </div>
          <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            {isTi
              ? 'ማእከላይ ርሕቀት ስዋይፕ (px)፣ ሚእታዊት ዕዉት ምቕያር ታብን ንምምሕያሽ ዝሕግዝ ንጡፍ ደረትን።'
              : 'Live telemetry comparing swipe drag distance against your threshold alongside tab transition success rate.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Segmented Window Control */}
          <div
            role="group"
            aria-label={isTi ? 'ብዝሒ መዝገብ' : 'Sample window'}
            className={`flex items-center gap-1 p-1 rounded-lg ${
              isDark ? 'bg-[#141220] border border-slate-800' : 'bg-slate-100 border border-slate-200'
            }`}
          >
            {([10, 25, 150] as WindowFilter[]).map((opt) => {
              const active = windowFilter === opt;
              const label = opt === 150 ? (isTi ? 'ኩሉ' : 'All') : `${opt}`;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setWindowFilter(opt)}
                  aria-pressed={active}
                  className={`min-h-[32px] px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 ${
                    active
                      ? isDark
                        ? 'bg-[#2A2010] text-[#F3E5AB] focus-visible:ring-[#E1C47D]'
                        : 'bg-white text-slate-900 shadow-sm focus-visible:ring-amber-600'
                      : isDark
                      ? 'text-slate-400 hover:text-slate-200 focus-visible:ring-slate-500'
                      : 'text-slate-600 hover:text-slate-900 focus-visible:ring-slate-400'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={clearSwipeAttemptRecords}
            disabled={records.length === 0}
            className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 ${
              isDark
                ? 'bg-[#141220] hover:bg-[#1E1A2E] border border-slate-800 text-slate-300 focus-visible:ring-[#E1C47D]'
                : 'bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 focus-visible:ring-amber-600'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{isTi ? 'ኣጽሪ' : 'Reset'}</span>
          </button>
        </div>
      </div>

      {/* Tabular KPI Strip separated by hairline dividers */}
      <div
        className={`grid grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t ${
          isDark ? 'border-slate-800/80' : 'border-slate-200'
        }`}
      >
        <div>
          <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {isTi ? 'ማእከላይ ርሕቀት ስዋይፕ' : 'Avg Swipe Distance'}
          </div>
          <div
            data-testid="metric-avg-distance"
            className={`mt-0.5 text-xl font-bold font-mono tabular-nums ${
              isDark ? 'text-[#F3E5AB]' : 'text-slate-900'
            }`}
          >
            {summary.totalAttempts > 0 ? `${summary.avgSwipeDistancePx} px` : '—'}
          </div>
          <div className={`text-[11px] font-mono tabular-nums ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
            {isTi ? `ደረት: ${summary.currentThresholdPx} px` : `Threshold ${summary.currentThresholdPx} px`}
          </div>
        </div>

        <div>
          <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {isTi ? 'ዕዉትነት ምቕያር ታብ' : 'Transition Success Rate'}
          </div>
          <div
            data-testid="metric-success-rate"
            className={`mt-0.5 text-xl font-bold font-mono tabular-nums ${
              summary.totalAttempts === 0
                ? isDark
                  ? 'text-slate-500'
                  : 'text-slate-400'
                : summary.successRatePct >= 65
                ? isDark
                  ? 'text-emerald-300'
                  : 'text-emerald-700'
                : isDark
                ? 'text-amber-300'
                : 'text-amber-700'
            }`}
          >
            {summary.totalAttempts > 0 ? `${summary.successRatePct}%` : '—'}
          </div>
          <div className={`text-[11px] font-mono tabular-nums ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
            {summary.successfulTransitions}/{summary.totalAttempts}{' '}
            {isTi ? 'ዝተፈጸሙ' : 'committed'}
          </div>
        </div>

        <div>
          <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {isTi ? 'ማእከላይ ፍጥነት' : 'Avg Release Velocity'}
          </div>
          <div
            className={`mt-0.5 text-xl font-bold font-mono tabular-nums ${
              isDark ? 'text-slate-100' : 'text-slate-900'
            }`}
          >
            {summary.totalAttempts > 0 ? `${summary.avgVelocityPxS} px/s` : '—'}
          </div>
          <div className={`text-[11px] font-mono tabular-nums ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
            {isTi
              ? `ዝተመልሱ: ${summary.snapBacks}`
              : `${summary.snapBacks} snap-back${summary.snapBacks === 1 ? '' : 's'}`}
          </div>
        </div>

        <div>
          <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {isTi ? 'ዝተዓቀነ ርሕቀት ዕዉታት' : 'Avg Committed Drag'}
          </div>
          <div
            className={`mt-0.5 text-xl font-bold font-mono tabular-nums ${
              isDark ? 'text-slate-100' : 'text-slate-900'
            }`}
          >
            {summary.avgCommittedDistancePx > 0 ? `${summary.avgCommittedDistancePx} px` : '—'}
          </div>
          <div className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
            {summary.totalAttempts} {isTi ? 'ጠቕላላ ፈተነ' : 'recorded'}
          </div>
        </div>
      </div>

      {/* Chart Viewport or Guided Empty State */}
      <div
        className={`pt-4 border-t ${isDark ? 'border-slate-800/80' : 'border-slate-200'}`}
      >
        {chartData.length === 0 ? (
          <div
            data-testid="interaction-chart-empty"
            className={`h-[220px] flex flex-col items-center justify-center text-center px-4 rounded-xl border border-dashed ${
              isDark
                ? 'border-slate-800 bg-[#110F1A]/60 text-slate-300'
                : 'border-slate-200 bg-slate-50 text-slate-600'
            }`}
          >
            <MoveHorizontal
              className={`w-6 h-6 mb-2 ${isDark ? 'text-[#E1C47D]' : 'text-amber-700'}`}
              aria-hidden="true"
            />
            <p className="text-xs font-semibold">
              {isTi
                ? 'ገና ዝተመዝገበ ምንቅስቓስ ስዋይፕ የለን'
                : 'No swipe interaction telemetry recorded yet'}
            </p>
            <p className={`text-[11px] mt-1 max-w-md ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {isTi
                ? 'ንታብ ብስዋይፕ ቀይሩ ወይ ኣብ ታሕቲ ዘሎ መፈተኒ ስዋይፕ ብምንቅስቓስ ርሕቀትን ዕዉትነትን ኣብዚ ብቀጥታ ተዓዘቡ።'
                : 'Swipe between app tabs or drag across the calibration strip below to plot live distance and transition success rates.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2" data-testid="interaction-chart-canvas">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
              <div className={`flex flex-wrap items-center gap-3 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                <span>
                  <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#C5A059] mr-1.5 align-middle" />
                  {isTi ? 'ርሕቀት ስዋይፕ (px)' : 'Swipe Distance (px)'}
                </span>
                <span>
                  <span className="inline-block w-3 h-0.5 bg-emerald-400 mr-1.5 align-middle" />
                  {isTi ? 'ዕዉትነት ምቕያር (%)' : 'Success Rate (%)'}
                </span>
                <span>
                  <span className="inline-block w-3 h-0.5 border-t border-dashed border-[#E1C47D] mr-1.5 align-middle" />
                  {isTi ? `ደረት (${thresholdPx}px)` : `Threshold (${thresholdPx}px)`}
                </span>
              </div>
            </div>

            <div className="w-full h-[240px]">
              <ResponsiveContainer width="100%" height={240} minWidth={0}>
                <ComposedChart
                  data={chartData}
                  margin={{ top: 12, right: 12, left: -12, bottom: 4 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={isDark ? 'rgba(148,163,184,0.12)' : 'rgba(15,23,42,0.08)'}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: isDark ? '#94A3B8' : '#475569', fontSize: 11 }}
                    axisLine={{ stroke: isDark ? '#334155' : '#CBD5E1' }}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="dist"
                    domain={[0, (dataMax: number) => Math.max(150, dataMax + 20, thresholdPx + 20)]}
                    tick={{ fill: isDark ? '#94A3B8' : '#475569', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    unit="px"
                  />
                  <YAxis
                    yAxisId="rate"
                    orientation="right"
                    domain={[0, 100]}
                    tick={{ fill: isDark ? '#6EE7B7' : '#047857', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    unit="%"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? '#141220' : '#FFFFFF',
                      borderColor: isDark ? 'rgba(142,109,40,0.45)' : '#E2E8F0',
                      borderRadius: '10px',
                      fontSize: '12px',
                      color: isDark ? '#F8FAFC' : '#0F172A',
                    }}
                    formatter={(value: unknown, name: unknown) => {
                      if (name === 'avgDistancePx') {
                        return [`${value} px`, isTi ? 'ርሕቀት ስዋይፕ' : 'Avg Swipe Distance'];
                      }
                      if (name === 'successRatePct') {
                        return [`${value}%`, isTi ? 'ዕዉትነት' : 'Success Rate'];
                      }
                      return [String(value), String(name)];
                    }}
                  />
                  <ReferenceLine
                    yAxisId="dist"
                    y={thresholdPx}
                    stroke="#E1C47D"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                  />
                  <Bar
                    yAxisId="dist"
                    dataKey="avgDistancePx"
                    fill="#C5A059"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={36}
                  />
                  <Line
                    yAxisId="rate"
                    type="monotone"
                    dataKey="successRatePct"
                    stroke="#34D399"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#34D399' }}
                    activeDot={{ r: 5 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Live Swipe Calibration Strip (records genuine pointer/touch swipes directly) */}
      <div
        className={`pt-4 border-t space-y-2 ${
          isDark ? 'border-slate-800/80' : 'border-slate-200'
        }`}
      >
        <div
          role="region"
          aria-label={isTi ? 'መፈተኒ ቦታ ስዋይፕ' : 'Swipe calibration pad'}
          data-testid="swipe-calibration-pad"
          onPointerDown={handlePadPointerDown}
          onPointerMove={handlePadPointerMove}
          onPointerUp={(e) => finishPadDrag(e.clientX)}
          onPointerCancel={() => {
            dragStartRef.current = null;
            setLiveDragDeltaX(0);
          }}
          className={`select-none touch-none cursor-grab active:cursor-grabbing rounded-xl border px-4 py-3 flex items-center justify-between gap-3 transition-colors ${
            Math.abs(liveDragDeltaX) >= thresholdPx
              ? isDark
                ? 'bg-[#1F190D] border-[#C5A059] text-[#F3E5AB]'
                : 'bg-amber-50 border-amber-500 text-amber-900'
              : isDark
              ? 'bg-[#141220] border-slate-800 text-slate-300'
              : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <MoveHorizontal className="w-4 h-4 shrink-0 text-[#E1C47D]" aria-hidden="true" />
            <span className="text-xs font-medium truncate">
              {liveDragDeltaX !== 0
                ? `${Math.round(Math.abs(liveDragDeltaX))} px ${
                    Math.abs(liveDragDeltaX) >= thresholdPx
                      ? isTi
                        ? '· ክቕየር ድሉው'
                        : '· Will commit'
                      : isTi
                      ? '· ይምለስ'
                      : '· Snap back on release'
                  }`
                : isTi
                ? 'መፈተኒ ቦታ ስዋይፕ — ኣብዚ ንጸጋም ወይ ንየማን ስሓቡ'
                : 'Interactive Calibration Strip — Drag left or right to test your swipe threshold'}
            </span>
          </div>

          {lastCalibrationResult && (
            <span
              className={`text-[11px] font-mono tabular-nums shrink-0 ${
                lastCalibrationResult.succeeded
                  ? isDark
                    ? 'text-emerald-300'
                    : 'text-emerald-700'
                  : isDark
                  ? 'text-slate-400'
                  : 'text-slate-500'
              }`}
            >
              {lastCalibrationResult.distancePx}px ·{' '}
              {lastCalibrationResult.succeeded
                ? isTi
                  ? 'ተፈጺሙ'
                  : 'Committed'
                : isTi
                ? 'ተመሊሱ'
                : 'Snap-back'}
            </span>
          )}
        </div>
      </div>

      {/* Threshold Optimization Advice + Optional 1-Click Apply */}
      <div
        className={`pt-3 border-t flex flex-wrap items-center justify-between gap-3 text-xs ${
          isDark ? 'border-slate-800/80 text-slate-300' : 'border-slate-200 text-slate-700'
        }`}
      >
        <div className="flex items-start gap-2 min-w-0 flex-1">
          <Sliders
            className={`w-4 h-4 shrink-0 mt-0.5 ${isDark ? 'text-[#E1C47D]' : 'text-amber-700'}`}
            aria-hidden="true"
          />
          <p className="leading-relaxed">{adviceText}</p>
        </div>

        {summary.recommendedThresholdPx !== null && (
          <button
            type="button"
            onClick={handleApplyRecommendedThreshold}
            className={`min-h-[36px] px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 ${
              isDark
                ? 'bg-[#C5A059] hover:bg-[#D5B26B] text-[#09090B] focus-visible:ring-[#E1C47D]'
                : 'bg-amber-600 hover:bg-amber-700 text-white focus-visible:ring-amber-600'
            }`}
          >
            {isTi
              ? `ናብ ${summary.recommendedThresholdPx}px ኣመዓራሪ`
              : `Apply ${summary.recommendedThresholdPx}px Threshold`}
          </button>
        )}
      </div>
    </section>
  );
};
