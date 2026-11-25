import React, { useId } from 'react';
import { BatteryCharging, BatteryLow, Gauge, PauseCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { BatteryThresholdPct, useBatterySaver } from '../context/BatterySaverContext';

interface BatterySaverToggleProps {
  /** Optional visual surface variant ('dark' matches ManagementHub, 'light' matches modals) */
  variant?: 'dark' | 'light';
  /** Optional callback invoked when Battery Saver is toggled */
  onChange?: (enabled: boolean) => void;
}

const THRESHOLD_OPTIONS: BatteryThresholdPct[] = [15, 20, 30];

export const BatterySaverToggle: React.FC<BatterySaverToggleProps> = ({
  variant = 'dark',
  onChange,
}) => {
  const { language } = useLanguage();
  const isTi = language === 'ti';
  const isDark = variant === 'dark';

  const {
    settings,
    batteryStatus,
    isLowBattery,
    isPowerSavingActive,
    setEnabled,
    setLowBatteryThresholdPct,
    setForceActive,
  } = useBatterySaver();

  const labelId = useId();
  const descriptionId = useId();
  const forceLabelId = useId();
  const forceDescId = useId();

  const handleToggle = () => {
    const next = !settings.enabled;
    setEnabled(next);
    onChange?.(next);
  };

  const batterySummary = batteryStatus.supported
    ? isTi
      ? `ባትሪ ${batteryStatus.levelPct}% · ${
          batteryStatus.charging ? 'ይመልእ ኣሎ' : 'ባትሪ ይጥቀም'
        }`
      : `Battery ${batteryStatus.levelPct}% · ${
          batteryStatus.charging ? 'Charging' : 'On Battery'
        }`
    : isTi
    ? 'ቀጥታ ሓይሊ / ዴስክቶፕ'
    : 'Desktop / AC Power';

  const powerStateSummary = isPowerSavingActive
    ? isTi
      ? 'ምዕቃብ ባትሪ ንጡፍ · ትሑት ፍጥነት (FPS) & ቀጻሊ Sync ደው ኢሉ'
      : 'Active · Reduced Animation FPS & Background Sync Paused'
    : settings.enabled
    ? isTi
      ? `ድሉው · ባትሪ ≤ ${settings.lowBatteryThresholdPct}% ክበጽሕ ከሎ ይጅምር`
      : `Standby · Engages automatically at <= ${settings.lowBatteryThresholdPct}%`
    : isTi
    ? 'ዝተዓጸወ'
    : 'Disabled';

  return (
    <div
      className={
        isDark
          ? 'bg-[#141220] border border-[#8E6D28]/35 rounded-xl p-4 space-y-3'
          : 'bg-white border border-slate-200 rounded-xl p-4 space-y-3'
      }
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
              isPowerSavingActive
                ? isDark
                  ? 'bg-emerald-950/70 border border-emerald-500/45 text-emerald-300'
                  : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                : isDark
                ? 'bg-[#1F190D] border border-[#8E6D28]/45 text-[#E1C47D]'
                : 'bg-amber-50 border border-amber-200 text-amber-700'
            }`}
          >
            {isLowBattery || isPowerSavingActive ? (
              <BatteryLow className="w-4 h-4" />
            ) : (
              <BatteryCharging className="w-4 h-4" />
            )}
          </div>

          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                id={labelId}
                className={
                  isDark ? 'text-sm font-bold text-[#F3E5AB]' : 'text-sm font-bold text-slate-900'
                }
              >
                {isTi ? 'መዕቀቢ ባትሪ (Battery Saver)' : 'Battery Saver'}
              </span>
              <span className={isDark ? 'text-[11px] text-slate-400' : 'text-[11px] text-slate-500'}>
                <span aria-hidden="true">· </span>
                {settings.enabled ? (isTi ? 'ንጡፍ' : 'On') : isTi ? 'ዝተዓጸወ' : 'Off'}
              </span>
            </div>

            <p
              id={descriptionId}
              className={
                isDark
                  ? 'text-xs text-slate-300 leading-relaxed'
                  : 'text-xs text-slate-600 leading-relaxed'
              }
            >
              {isTi
                ? 'ባትሪ መሳርሒ ክውሕድ ከሎ ፍጥነት ምንቅስቓስ (FPS) ይቅንስ ከምኡ ውን ቀጻሊ ናይ ድሕረ-ባይታ ምውህሃድ (Background Sync) ደው የብል።'
                : 'Automatically lowers animation frame rate and disables continuous background sync when device battery runs low.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={settings.enabled}
          aria-labelledby={labelId}
          aria-describedby={descriptionId}
          onClick={handleToggle}
          className={`min-w-[44px] min-h-[44px] inline-flex items-center justify-end shrink-0 cursor-pointer rounded-xl focus-visible:outline-none focus-visible:ring-2 ${
            isDark
              ? 'focus-visible:ring-[#E1C47D] focus-visible:ring-offset-2 focus-visible:ring-offset-[#141220]'
              : 'focus-visible:ring-amber-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white'
          }`}
        >
          <span
            aria-hidden="true"
            className={`w-11 h-6 rounded-full p-0.5 flex items-center transition-colors ${
              settings.enabled
                ? isDark
                  ? 'bg-[#C5A059] justify-end'
                  : 'bg-amber-600 justify-end'
                : isDark
                ? 'bg-slate-700 justify-start'
                : 'bg-stone-300 justify-start'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full shadow-sm ${
                isDark && settings.enabled ? 'bg-[#0B0914]' : 'bg-white'
              }`}
            />
          </span>
        </button>
      </div>

      {/* Inline Battery Status & Power-Save Telemetry */}
      <div
        className={`pt-2 border-t flex flex-wrap items-center justify-between gap-2 text-[11px] ${
          isDark ? 'border-slate-800/80 text-slate-400' : 'border-slate-100 text-slate-500'
        }`}
      >
        <div className="flex flex-wrap items-center gap-1.5">
          <Gauge className="w-3.5 h-3.5 shrink-0" />
          <span>{batterySummary}</span>
          <span aria-hidden="true">·</span>
          <span
            className={
              isPowerSavingActive
                ? isDark
                  ? 'text-emerald-300 font-semibold'
                  : 'text-emerald-700 font-semibold'
                : undefined
            }
          >
            {powerStateSummary}
          </span>
        </div>

        {/* Auto-engage threshold selector */}
        <div className="flex items-center gap-1" role="group" aria-label={isTi ? 'ደረጃ ባትሪ' : 'Low battery threshold'}>
          {THRESHOLD_OPTIONS.map((pct) => {
            const active = settings.lowBatteryThresholdPct === pct;
            return (
              <button
                key={pct}
                type="button"
                onClick={() => setLowBatteryThresholdPct(pct)}
                aria-pressed={active}
                className={`min-h-[32px] px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 ${
                  active
                    ? isDark
                      ? 'bg-[#1F190D] border border-[#8E6D28]/60 text-[#F3E5AB] focus-visible:ring-[#E1C47D]'
                      : 'bg-amber-50 border border-amber-300 text-amber-900 focus-visible:ring-amber-600'
                    : isDark
                    ? 'bg-[#110F1A] border border-slate-800 text-slate-400 hover:text-slate-200 focus-visible:ring-slate-500'
                    : 'bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 focus-visible:ring-slate-400'
                }`}
              >
                {pct}%
              </button>
            );
          })}
        </div>
      </div>

      {/* Force Power Save override for AC/Desktop testing or immediate conservation */}
      <div
        className={`pt-2.5 border-t flex items-center justify-between gap-3 ${
          isDark ? 'border-slate-800/80' : 'border-slate-100'
        }`}
      >
        <div className="flex items-start gap-2.5 min-w-0">
          <PauseCircle
            className={`w-4 h-4 shrink-0 mt-0.5 ${
              isPowerSavingActive
                ? isDark
                  ? 'text-emerald-300'
                  : 'text-emerald-700'
                : isDark
                ? 'text-slate-400'
                : 'text-slate-500'
            }`}
          />
          <div className="min-w-0">
            <div
              id={forceLabelId}
              className={
                isDark ? 'text-xs font-semibold text-slate-200' : 'text-xs font-semibold text-slate-800'
              }
            >
              {isTi ? 'ምዕቃብ ባትሪ ሕጂ ኣንቅስ (Always On)' : 'Always Apply Power Save'}
            </div>
            <p
              id={forceDescId}
              className={isDark ? 'text-[11px] text-slate-400' : 'text-[11px] text-slate-500'}
            >
              {isTi
                ? 'ዋላ ባትሪ ምሉእ እንተኾነ ትሑት FPSን ደው ዝበለ Background Syncን ሕጂ ኣተግብር።'
                : 'Keep reduced frame rate and paused background sync active even when charging.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={settings.forceActive}
          aria-labelledby={forceLabelId}
          aria-describedby={forceDescId}
          onClick={() => setForceActive(!settings.forceActive)}
          className={`min-w-[44px] min-h-[44px] inline-flex items-center justify-end shrink-0 cursor-pointer rounded-xl focus-visible:outline-none focus-visible:ring-2 ${
            isDark
              ? 'focus-visible:ring-[#E1C47D] focus-visible:ring-offset-2 focus-visible:ring-offset-[#141220]'
              : 'focus-visible:ring-amber-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white'
          }`}
        >
          <span
            aria-hidden="true"
            className={`w-11 h-6 rounded-full p-0.5 flex items-center transition-colors ${
              settings.forceActive
                ? isDark
                  ? 'bg-emerald-500 justify-end'
                  : 'bg-emerald-600 justify-end'
                : isDark
                ? 'bg-slate-700 justify-start'
                : 'bg-stone-300 justify-start'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full shadow-sm ${
                isDark && settings.forceActive ? 'bg-[#0B0914]' : 'bg-white'
              }`}
            />
          </span>
        </button>
      </div>
    </div>
  );
};
