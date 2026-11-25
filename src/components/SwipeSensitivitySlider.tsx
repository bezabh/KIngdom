import React, { useEffect, useId, useState } from 'react';
import { MoveHorizontal, RotateCcw } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import {
  DEFAULT_SWIPE_THRESHOLD_PX,
  HAPTICS_SETTINGS_EVENT,
  HapticSettings,
  MAX_SWIPE_THRESHOLD_PX,
  MIN_SWIPE_THRESHOLD_PX,
  clampSwipeThresholdPx,
  getHapticSettings,
  saveHapticSettings,
  triggerTabTapHaptic,
} from '../utils/haptics';

interface SwipeSensitivitySliderProps {
  variant?: 'dark' | 'light';
  onChange?: (thresholdPx: number) => void;
}

const PRESETS: { px: number; labelEn: string; labelTi: string }[] = [
  { px: 32, labelEn: 'Sensitive', labelTi: 'ቅልጡፍ' },
  { px: 50, labelEn: 'Balanced', labelTi: 'ሚዛናዊ' },
  { px: 84, labelEn: 'Deliberate', labelTi: 'ርጉእ' },
];

export const SwipeSensitivitySlider: React.FC<SwipeSensitivitySliderProps> = ({
  variant = 'dark',
  onChange,
}) => {
  const { language } = useLanguage();
  const isTi = language === 'ti';
  const isDark = variant === 'dark';

  const sliderId = useId();
  const descId = useId();

  const [thresholdPx, setThresholdPx] = useState<number>(
    () => getHapticSettings().swipeThresholdPx
  );
  const [statusNote, setStatusNote] = useState<string>('');

  useEffect(() => {
    const onSettingsUpdated = (event: Event) => {
      const detail = (event as CustomEvent<HapticSettings>).detail;
      const next = detail?.swipeThresholdPx ?? getHapticSettings().swipeThresholdPx;
      setThresholdPx(clampSwipeThresholdPx(next));
    };

    window.addEventListener(HAPTICS_SETTINGS_EVENT, onSettingsUpdated);
    return () => window.removeEventListener(HAPTICS_SETTINGS_EVENT, onSettingsUpdated);
  }, []);

  const getSensitivityLabel = (px: number): string => {
    if (px <= 36) return isTi ? 'ልዑል ተነቃቕነት' : 'High Sensitivity';
    if (px <= 70) return isTi ? 'ሚዛናዊ (ንቡር)' : 'Balanced (Default)';
    return isTi ? 'ሰፊሕ ምስሓብ' : 'Deliberate Swipe';
  };

  const commitThreshold = (rawValue: number, withHapticFeedback: boolean) => {
    const clamped = clampSwipeThresholdPx(rawValue);
    const updated = saveHapticSettings({ swipeThresholdPx: clamped });
    setThresholdPx(updated.swipeThresholdPx);
    if (withHapticFeedback) {
      triggerTabTapHaptic();
    }
    onChange?.(updated.swipeThresholdPx);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = Number(e.target.value);
    commitThreshold(next, false);
  };

  const handlePresetClick = (px: number) => {
    commitThreshold(px, true);
    setStatusNote(
      isTi
        ? `ደረት ስዋይፕ ናብ ${px}px ተቐዪሩ`
        : `Swipe threshold updated to ${px}px`
    );
  };

  const handleReset = () => {
    commitThreshold(DEFAULT_SWIPE_THRESHOLD_PX, true);
    setStatusNote(
      isTi
        ? `ደረት ስዋይፕ ናብ ንቡር (${DEFAULT_SWIPE_THRESHOLD_PX}px) ተመሊሱ`
        : `Swipe threshold reset to ${DEFAULT_SWIPE_THRESHOLD_PX}px`
    );
  };

  const sensitivityLabel = getSensitivityLabel(thresholdPx);
  const travelPercent = Math.round(
    ((thresholdPx - MIN_SWIPE_THRESHOLD_PX) /
      (MAX_SWIPE_THRESHOLD_PX - MIN_SWIPE_THRESHOLD_PX)) *
      100
  );

  return (
    <div
      className={
        isDark
          ? 'bg-[#141220] border border-[#8E6D28]/35 rounded-xl p-4 space-y-3'
          : 'bg-white border border-slate-200 rounded-xl p-4 space-y-3'
      }
    >
      {/* Header Row */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
              isDark
                ? 'bg-[#1F190D] border border-[#8E6D28]/45 text-[#E1C47D]'
                : 'bg-amber-50 border border-amber-200 text-amber-700'
            }`}
          >
            <MoveHorizontal className="w-4 h-4" />
          </div>

          <div className="min-w-0 space-y-0.5">
            <label
              htmlFor={sliderId}
              className={`block cursor-pointer ${
                isDark
                  ? 'text-sm font-bold text-[#F3E5AB]'
                  : 'text-sm font-bold text-slate-900'
              }`}
            >
              {isTi
                ? 'ደረት ተነቃቕነት ስዋይፕ-ናብ-ታብ (Swipe Threshold)'
                : 'Swipe-to-Tab Sensitivity Threshold'}
            </label>
            <p
              id={descId}
              className={
                isDark ? 'text-xs text-slate-300' : 'text-xs text-slate-600'
              }
            >
              {isTi
                ? 'ገጽ ወይ ታብ ንምቕያር ዝድለ ርሕቀት ምስሓብ ብፒክሰል ኣመዓራርዩ።'
                : 'Control the physical horizontal drag distance required to commit a tab transition.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`font-mono tabular-nums text-xs font-bold ${
              isDark ? 'text-[#F3E5AB]' : 'text-slate-900'
            }`}
          >
            {thresholdPx} px
          </span>
          <span
            className={
              isDark ? 'text-[11px] text-slate-400' : 'text-[11px] text-slate-500'
            }
          >
            <span aria-hidden="true">· </span>
            {sensitivityLabel}
          </span>
        </div>
      </div>

      {/* Range Slider */}
      <div className="space-y-1.5">
        <div className="min-h-[44px] flex items-center">
          <input
            id={sliderId}
            type="range"
            min={MIN_SWIPE_THRESHOLD_PX}
            max={MAX_SWIPE_THRESHOLD_PX}
            step={2}
            value={thresholdPx}
            onChange={handleSliderChange}
            aria-describedby={descId}
            aria-valuemin={MIN_SWIPE_THRESHOLD_PX}
            aria-valuemax={MAX_SWIPE_THRESHOLD_PX}
            aria-valuenow={thresholdPx}
            aria-valuetext={`${thresholdPx} pixels (${sensitivityLabel})`}
            className={`w-full h-2 rounded-lg cursor-pointer focus-visible:outline-none focus-visible:ring-2 ${
              isDark
                ? 'bg-slate-800 accent-[#C5A059] focus-visible:ring-[#E1C47D]'
                : 'bg-slate-200 accent-amber-600 focus-visible:ring-amber-600'
            }`}
          />
        </div>

        <div
          className={`flex items-center justify-between text-[11px] font-mono tabular-nums ${
            isDark ? 'text-slate-400' : 'text-slate-500'
          }`}
        >
          <span>
            {MIN_SWIPE_THRESHOLD_PX}px ({isTi ? 'ቅልጡፍ' : 'Short drag'})
          </span>
          <span>
            {MAX_SWIPE_THRESHOLD_PX}px ({isTi ? 'ሰፊሕ' : 'Long drag'})
          </span>
        </div>
      </div>

      {/* Presets & Visual Physical Distance Preview */}
      <div
        className={`pt-2 border-t flex flex-wrap items-center justify-between gap-2 ${
          isDark ? 'border-slate-800/80' : 'border-slate-100'
        }`}
      >
        <div className="flex flex-wrap items-center gap-1.5">
          {PRESETS.map((preset) => {
            const isSelected = thresholdPx === preset.px;
            return (
              <button
                key={preset.px}
                type="button"
                onClick={() => handlePresetClick(preset.px)}
                className={`min-h-[36px] px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 ${
                  isSelected
                    ? isDark
                      ? 'bg-[#C5A059] text-[#09090B] focus-visible:ring-[#E1C47D]'
                      : 'bg-amber-600 text-white focus-visible:ring-amber-700'
                    : isDark
                    ? 'bg-[#1A162B] hover:bg-[#25203D] border border-[#8E6D28]/25 text-slate-300 focus-visible:ring-[#E1C47D]'
                    : 'bg-slate-50 hover:bg-amber-50 border border-slate-200 text-slate-700 focus-visible:ring-amber-600'
                }`}
              >
                <span className="font-mono tabular-nums">{preset.px}px</span>
                <span aria-hidden="true"> · </span>
                <span>{isTi ? preset.labelTi : preset.labelEn}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-[11px]">
            <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
              {isTi ? 'ርሕቀት 1:1' : '1:1 Distance'}
            </span>
            <div
              aria-hidden="true"
              className={`h-2 rounded-full overflow-hidden flex items-center ${
                isDark ? 'bg-slate-800' : 'bg-slate-200'
              }`}
              style={{ width: `${MAX_SWIPE_THRESHOLD_PX}px` }}
            >
              <div
                className={isDark ? 'h-full bg-[#C5A059] transition-all' : 'h-full bg-amber-600 transition-all'}
                style={{ width: `${thresholdPx}px` }}
              />
            </div>
            <span className="sr-only">{travelPercent}%</span>
          </div>

          {thresholdPx !== DEFAULT_SWIPE_THRESHOLD_PX && (
            <button
              type="button"
              onClick={handleReset}
              className={`min-h-[36px] px-2.5 py-1 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 ${
                isDark
                  ? 'text-slate-300 hover:text-[#F3E5AB] hover:bg-[#1A162B] border border-slate-800 focus-visible:ring-[#E1C47D]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 focus-visible:ring-amber-600'
              }`}
            >
              <RotateCcw className="w-3 h-3" />
              <span>{isTi ? 'ንቡር' : 'Reset'}</span>
            </button>
          )}
        </div>
      </div>

      {statusNote && (
        <div
          role="status"
          aria-live="polite"
          className={`text-[11px] font-medium ${
            isDark ? 'text-emerald-300' : 'text-emerald-700'
          }`}
        >
          {statusNote}
        </div>
      )}
    </div>
  );
};
