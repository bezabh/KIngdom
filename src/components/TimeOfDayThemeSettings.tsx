import React, { useId } from 'react';
import {
  Clock,
  LocateFixed,
  Moon,
  RotateCcw,
  Sun,
  Sunrise,
  Sunset,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAdaptiveTheme } from '../context/AdaptiveThemeContext';
import {
  AdaptiveThemeMode,
  DEFAULT_CUSTOM_SUNRISE,
  DEFAULT_CUSTOM_SUNSET,
} from '../utils/sunCycle';

interface TimeOfDayThemeSettingsProps {
  variant?: 'dark' | 'light';
}

export const TimeOfDayThemeSettings: React.FC<TimeOfDayThemeSettingsProps> = ({
  variant = 'dark',
}) => {
  const { language } = useLanguage();
  const isTi = language === 'ti';
  const isDark = variant === 'dark';

  const {
    settings,
    sunCycle,
    activeAesthetic,
    isGeoLocating,
    geoError,
    setMode,
    setUseCustomSchedule,
    setCustomTimes,
    requestGeolocation,
    clearGeolocation,
  } = useAdaptiveTheme();

  const groupLabelId = useId();
  const sunriseInputId = useId();
  const sunsetInputId = useId();

  const isGoldAmbient = activeAesthetic === 'gold-ambient';

  const formatCountdown = (totalMins: number): string => {
    const hrs = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    if (hrs <= 0) return `${mins}m`;
    return `${hrs}h ${mins}m`;
  };

  const modeOptions: {
    id: AdaptiveThemeMode;
    labelEn: string;
    labelTi: string;
    icon: React.FC<{ className?: string }>;
  }[] = [
    {
      id: 'auto',
      labelEn: 'Auto (Sun Cycle)',
      labelTi: 'ኣውቶ (ብጸሓይ)',
      icon: Clock,
    },
    {
      id: 'gold-ambient',
      labelEn: 'Gold-Ambient',
      labelTi: 'Gold-Ambient (መዓልቲ)',
      icon: Sun,
    },
    {
      id: 'obsidian-deep',
      labelEn: 'Obsidian-Deep',
      labelTi: 'Obsidian-Deep (ለይቲ)',
      icon: Moon,
    },
  ];

  return (
    <div
      data-testid="time-of-day-theme-settings"
      className={
        isDark
          ? 'bg-[#141220] border border-[#8E6D28]/35 rounded-xl p-4 space-y-4'
          : 'bg-white border border-slate-200 rounded-xl p-4 space-y-4'
      }
    >
      {/* Header & Active Aesthetic Readout */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
              isGoldAmbient
                ? isDark
                  ? 'bg-[#2A200E] border border-[#E1C47D]/50 text-[#F3E5AB]'
                  : 'bg-amber-50 border border-amber-200 text-amber-700'
                : isDark
                ? 'bg-[#0C101B] border border-slate-700 text-indigo-300'
                : 'bg-slate-900 border border-slate-700 text-amber-300'
            }`}
          >
            {isGoldAmbient ? (
              <Sun className="w-4 h-4" aria-hidden="true" />
            ) : (
              <Moon className="w-4 h-4" aria-hidden="true" />
            )}
          </div>

          <div className="min-w-0 space-y-0.5">
            <div
              id={groupLabelId}
              className={
                isDark
                  ? 'text-sm font-bold text-[#F3E5AB]'
                  : 'text-sm font-bold text-slate-900'
              }
            >
              {isTi
                ? 'ብግዜ ዝምራሕ ቅዲ (Time-of-Day Adaptive Theme)'
                : 'Time-of-Day Adaptive Theme'}
            </div>
            <p className={isDark ? 'text-xs text-slate-300' : 'text-xs text-slate-600'}>
              {isTi
                ? 'ብመሰረት ሰዓት ብርሃን ጸሓይን ዕራርቦን ኣብ መንጎ Gold-Ambient (መዓልቲ) እና Obsidian-Deep (ለይቲ) ብኣውቶማቲክ ይሰጋገር።'
                : 'Automatically transitions between Gold-Ambient (Daytime) and Obsidian-Deep (Nighttime) aesthetics from local sunrise and sunset.'}
            </p>
          </div>
        </div>

        <div
          data-testid="adaptive-theme-active-aesthetic"
          className={`inline-flex items-center gap-1.5 font-mono tabular-nums text-xs font-bold shrink-0 ${
            isGoldAmbient
              ? isDark
                ? 'text-[#F3E5AB]'
                : 'text-amber-700'
              : isDark
              ? 'text-slate-200'
              : 'text-slate-900'
          }`}
        >
          {isGoldAmbient ? (
            <Sun className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
          ) : (
            <Moon className="w-3.5 h-3.5 text-indigo-400" aria-hidden="true" />
          )}
          <span>{isGoldAmbient ? 'Gold-Ambient' : 'Obsidian-Deep'}</span>
          <span className={isDark ? 'text-slate-500 font-normal' : 'text-slate-400 font-normal'}>
            · {settings.mode === 'auto' ? (isTi ? 'ኣውቶ' : 'Auto') : isTi ? 'ብኢድ' : 'Pinned'}
          </span>
        </div>
      </div>

      {/* Mode Selector: Auto (Sun Cycle) / Gold-Ambient / Obsidian-Deep */}
      <div
        role="radiogroup"
        aria-labelledby={groupLabelId}
        className={`grid grid-cols-1 sm:grid-cols-3 gap-1.5 p-1 rounded-xl border ${
          isDark ? 'bg-[#0B0914] border-slate-800' : 'bg-slate-100 border-slate-200'
        }`}
      >
        {modeOptions.map((opt) => {
          const Icon = opt.icon;
          const selected = settings.mode === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={selected}
              data-testid={`adaptive-theme-mode-${opt.id}`}
              onClick={() => setMode(opt.id)}
              className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 ${
                selected
                  ? isDark
                    ? 'bg-[#C5A059] text-[#09090B] focus-visible:ring-[#E1C47D]'
                    : 'bg-slate-900 text-amber-300 shadow-xs focus-visible:ring-amber-600'
                  : isDark
                  ? 'text-slate-300 hover:bg-[#191528] focus-visible:ring-[#E1C47D]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/70 focus-visible:ring-amber-600'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>{isTi ? opt.labelTi : opt.labelEn}</span>
            </button>
          );
        })}
      </div>

      {/* Solar Window Telemetry Strip */}
      <div
        className={`grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t ${
          isDark ? 'border-slate-800/80' : 'border-slate-100'
        }`}
      >
        <div>
          <div className="flex items-center gap-1 text-[11px] text-slate-400">
            <Sunrise className="w-3 h-3 text-amber-400 shrink-0" aria-hidden="true" />
            <span>{isTi ? 'ምብራቕ ጸሓይ' : 'Local Sunrise'}</span>
          </div>
          <div
            data-testid="adaptive-theme-sunrise"
            className={`mt-0.5 text-sm font-bold font-mono tabular-nums ${
              isDark ? 'text-slate-100' : 'text-slate-900'
            }`}
          >
            {sunCycle.sunriseFormatted}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-1 text-[11px] text-slate-400">
            <Sunset className="w-3 h-3 text-amber-500 shrink-0" aria-hidden="true" />
            <span>{isTi ? 'ዕራርቦ ጸሓይ' : 'Local Sunset'}</span>
          </div>
          <div
            data-testid="adaptive-theme-sunset"
            className={`mt-0.5 text-sm font-bold font-mono tabular-nums ${
              isDark ? 'text-slate-100' : 'text-slate-900'
            }`}
          >
            {sunCycle.sunsetFormatted}
          </div>
        </div>

        <div>
          <div className="text-[11px] text-slate-400">
            {isTi ? 'ዝቕጽል ስግግር' : 'Next Shift'}
          </div>
          <div
            data-testid="adaptive-theme-next-shift"
            className={`mt-0.5 text-xs sm:text-sm font-bold font-mono tabular-nums ${
              isDark ? 'text-[#E1C47D]' : 'text-amber-700'
            }`}
          >
            {sunCycle.nextTransitionFormatted} · {formatCountdown(sunCycle.minutesUntilTransition)}
          </div>
        </div>

        <div>
          <div className="text-[11px] text-slate-400">
            {isTi ? 'ቦታ / ምንጪ' : 'Solar Source'}
          </div>
          <div
            data-testid="adaptive-theme-location"
            className={`mt-0.5 text-xs font-medium truncate ${
              isDark ? 'text-slate-200' : 'text-slate-800'
            }`}
            title={sunCycle.locationLabel}
          >
            {sunCycle.locationLabel}
          </div>
        </div>
      </div>

      {/* Solar Cycle Progress Meter */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span>
            {sunCycle.isDaytime
              ? isTi
                ? 'ናይ መዓልቲ ዑደት ጸሓይ (Gold-Ambient Window)'
                : 'Daylight Solar Window (Gold-Ambient)'
              : isTi
              ? 'ናይ ለይቲ ዑደት (Obsidian-Deep Window)'
              : 'Nocturnal Window (Obsidian-Deep)'}
          </span>
          <span className="font-mono tabular-nums">{sunCycle.solarProgressPct}%</span>
        </div>
        <div
          className={`h-1.5 w-full rounded-full overflow-hidden ${
            isDark ? 'bg-slate-800' : 'bg-slate-200'
          }`}
        >
          <div
            className={`h-full transition-all ${
              isGoldAmbient ? 'bg-[#E1C47D]' : 'bg-indigo-400'
            }`}
            style={{ width: `${Math.max(4, sunCycle.solarProgressPct)}%` }}
          />
        </div>
      </div>

      {/* Location & Custom Sunrise/Sunset Controls */}
      <div
        className={`pt-3 border-t space-y-3 ${
          isDark ? 'border-slate-800/80' : 'border-slate-100'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={requestGeolocation}
              disabled={isGeoLocating}
              className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 ${
                isDark
                  ? 'bg-[#1F190D] hover:bg-[#2F2414] border border-[#8E6D28]/50 text-[#F3E5AB] focus-visible:ring-[#E1C47D]'
                  : 'bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 focus-visible:ring-amber-600'
              }`}
            >
              <LocateFixed className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>
                {isGeoLocating
                  ? isTi
                    ? 'ቦታ ይምርመር ኣሎ...'
                    : 'Locating...'
                  : isTi
                  ? 'ናይ GPS ጸሓይ ሰዓት ኣስምር'
                  : 'Detect Local Sun Times'}
              </span>
            </button>

            {settings.coordinates && !settings.useCustomSchedule && (
              <button
                type="button"
                onClick={clearGeolocation}
                className={`min-h-[36px] px-2.5 py-1 rounded-lg text-xs font-medium inline-flex items-center gap-1 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 ${
                  isDark
                    ? 'text-slate-400 hover:text-slate-200 border border-slate-800 focus-visible:ring-[#E1C47D]'
                    : 'text-slate-500 hover:text-slate-800 border border-slate-200 focus-visible:ring-amber-600'
                }`}
              >
                <RotateCcw className="w-3 h-3" aria-hidden="true" />
                <span>{isTi ? 'ናብ Timezone ምለስ' : 'Use Timezone'}</span>
              </button>
            )}
          </div>

          <button
            type="button"
            data-testid="adaptive-theme-custom-schedule-toggle"
            onClick={() => setUseCustomSchedule(!settings.useCustomSchedule)}
            aria-pressed={settings.useCustomSchedule}
            className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 ${
              settings.useCustomSchedule
                ? isDark
                  ? 'bg-[#221A0E] border border-[#C5A059] text-[#F3E5AB] focus-visible:ring-[#E1C47D]'
                  : 'bg-slate-900 border border-slate-900 text-amber-300 focus-visible:ring-amber-600'
                : isDark
                ? 'bg-[#0E0C18] border border-slate-800 text-slate-300 hover:text-white focus-visible:ring-[#E1C47D]'
                : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 focus-visible:ring-amber-600'
            }`}
          >
            {settings.useCustomSchedule
              ? isTi
                ? 'ብሕታዊ ሰዓት ንጡፍ'
                : 'Custom Sun Schedule: On'
              : isTi
              ? 'ብሕታዊ ሰዓት ስርዓት'
              : 'Custom Sun Schedule'}
          </button>
        </div>

        {settings.useCustomSchedule && (
          <div
            className={`grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl border ${
              isDark
                ? 'bg-[#0B0914] border-slate-800'
                : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="space-y-1">
              <label
                htmlFor={sunriseInputId}
                className="text-[11px] font-medium text-slate-400 block"
              >
                {isTi ? 'ሰዓት ምብራቕ ጸሓይ (Gold-Ambient)' : 'Sunrise Time (Gold-Ambient starts)'}
              </label>
              <input
                id={sunriseInputId}
                data-testid="adaptive-theme-custom-sunrise"
                type="time"
                value={settings.customSunrise || DEFAULT_CUSTOM_SUNRISE}
                onChange={(e) => setCustomTimes(e.target.value, settings.customSunset)}
                className={`w-full min-h-[38px] px-3 py-1.5 rounded-lg border font-mono text-xs focus-visible:outline-none focus-visible:ring-2 ${
                  isDark
                    ? 'bg-[#141220] border-slate-700 text-[#F3E5AB] focus-visible:ring-[#E1C47D]'
                    : 'bg-white border-slate-300 text-slate-900 focus-visible:ring-amber-600'
                }`}
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor={sunsetInputId}
                className="text-[11px] font-medium text-slate-400 block"
              >
                {isTi ? 'ሰዓት ዕራርቦ ጸሓይ (Obsidian-Deep)' : 'Sunset Time (Obsidian-Deep starts)'}
              </label>
              <input
                id={sunsetInputId}
                data-testid="adaptive-theme-custom-sunset"
                type="time"
                value={settings.customSunset || DEFAULT_CUSTOM_SUNSET}
                onChange={(e) => setCustomTimes(settings.customSunrise, e.target.value)}
                className={`w-full min-h-[38px] px-3 py-1.5 rounded-lg border font-mono text-xs focus-visible:outline-none focus-visible:ring-2 ${
                  isDark
                    ? 'bg-[#141220] border-slate-700 text-[#F3E5AB] focus-visible:ring-[#E1C47D]'
                    : 'bg-white border-slate-300 text-slate-900 focus-visible:ring-amber-600'
                }`}
              />
            </div>
          </div>
        )}

        {geoError && (
          <p className="text-[11px] text-amber-400" role="status">
            {geoError}
          </p>
        )}
      </div>
    </div>
  );
};
