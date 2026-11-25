import React, { useEffect, useId, useState } from 'react';
import { AudioWaveform, ArrowLeftRight, Layers } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import {
  HAPTICS_SETTINGS_EVENT,
  HAPTIC_PATTERN_PROFILES,
  HapticPatternIntensity,
  HapticSettings,
  getHapticSettings,
  saveHapticSettings,
  triggerBottomNavLuxuryThud,
  triggerSwipeTransitionHaptic,
} from '../utils/haptics';

interface HapticPatternSelectorProps {
  variant?: 'dark' | 'light';
  onChange?: (pattern: HapticPatternIntensity) => void;
}

const PATTERN_ORDER: HapticPatternIntensity[] = ['subtle', 'moderate', 'strong'];

export const HapticPatternSelector: React.FC<HapticPatternSelectorProps> = ({
  variant = 'dark',
  onChange,
}) => {
  const { language } = useLanguage();
  const isTi = language === 'ti';
  const isDark = variant === 'dark';

  const groupLabelId = useId();
  const groupDescId = useId();

  const [settings, setSettings] = useState<HapticSettings>(() => getHapticSettings());
  const [statusMessage, setStatusMessage] = useState<string>('');

  useEffect(() => {
    const onSettingsUpdated = (event: Event) => {
      const detail = (event as CustomEvent<HapticSettings>).detail;
      setSettings(detail ?? getHapticSettings());
    };
    window.addEventListener(HAPTICS_SETTINGS_EVENT, onSettingsUpdated);
    return () => window.removeEventListener(HAPTICS_SETTINGS_EVENT, onSettingsUpdated);
  }, []);

  const handleSelectPattern = (preset: HapticPatternIntensity) => {
    const updated = saveHapticSettings({ patternPreset: preset });
    setSettings(updated);

    if (updated.enabled) {
      if (updated.swipeGesturesEnabled) {
        triggerSwipeTransitionHaptic('left');
      } else if (updated.tabTapsEnabled) {
        triggerBottomNavLuxuryThud();
      }
    }

    const profile = HAPTIC_PATTERN_PROFILES[preset];
    setStatusMessage(
      isTi
        ? `ቅዲ ሃፕቲክ ናብ ${profile.labelTi} (${profile.labelEn}) ተቐዪሩ`
        : `Haptic feedback pattern set to ${profile.labelEn} (${profile.swipeLeftPattern.join('-')}ms swipe · ${profile.bottomNavThudPattern.join('-')}ms tab)`
    );
    onChange?.(preset);
  };

  const handlePreviewSwipe = () => {
    const profile = HAPTIC_PATTERN_PROFILES[settings.patternPreset];
    if (!settings.enabled || !settings.swipeGesturesEnabled) {
      setStatusMessage(
        isTi
          ? 'ቅድሚ ፈተነ ሃፕቲክ ስዋይፕ ክፈቱ'
          : 'Enable Haptic Feedback and Swipe Gestures above to trigger a live swipe pulse'
      );
      return;
    }
    triggerSwipeTransitionHaptic('left');
    setStatusMessage(
      isTi
        ? `ናይ ስዋይፕ ቅዲ ${profile.labelTi} (${profile.swipeLeftPattern.join('-')}ms) ተፈቲኑ`
        : `Previewed ${profile.labelEn} swipe pulse (${profile.swipeLeftPattern.join('-')}ms)`
    );
  };

  const handlePreviewTab = () => {
    const profile = HAPTIC_PATTERN_PROFILES[settings.patternPreset];
    if (!settings.enabled || !settings.tabTapsEnabled) {
      setStatusMessage(
        isTi
          ? 'ቅድሚ ፈተነ ሃፕቲክ ጠውቂ ታብ ክፈቱ'
          : 'Enable Haptic Feedback and Tap Controls to trigger a live tab transition pulse'
      );
      return;
    }
    triggerBottomNavLuxuryThud();
    setStatusMessage(
      isTi
        ? `ናይ ታብ ቅዲ ${profile.labelTi} (${profile.bottomNavThudPattern.join('-')}ms) ተፈቲኑ`
        : `Previewed ${profile.labelEn} tab transition pulse (${profile.bottomNavThudPattern.join('-')}ms)`
    );
  };

  const activeProfile = HAPTIC_PATTERN_PROFILES[settings.patternPreset];

  return (
    <div
      data-testid="haptic-pattern-selector"
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
            <AudioWaveform className="w-4 h-4" />
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
                ? 'ቅዲ ሃፕቲክ ምንቅጥቃጥ (Haptic Feedback Pattern)'
                : 'Haptic Feedback Pattern'}
            </div>
            <p
              id={groupDescId}
              className={isDark ? 'text-xs text-slate-300' : 'text-xs text-slate-600'}
            >
              {isTi
                ? 'ንስዋይፕ ምንቅስቓስን ምቕያር ታብን ሓይልን ቅርጽን ምንቅጥቃጥ (Subtle, Moderate, Strong) ምረጹ።'
                : 'Choose vibration intensity and waveform profile for swipe gestures and tab transitions.'}
            </p>
          </div>
        </div>

        <div
          data-testid="haptic-pattern-active-label"
          className={`font-mono tabular-nums text-xs font-bold shrink-0 ${
            isDark ? 'text-[#F3E5AB]' : 'text-slate-900'
          }`}
        >
          {isTi ? activeProfile.labelTi : activeProfile.labelEn}
          <span className={isDark ? 'text-slate-500 font-normal' : 'text-slate-400 font-normal'}>
            {' '}
            · {activeProfile.swipeLeftPattern.join('/')}ms
          </span>
        </div>
      </div>

      {/* Pattern Selection Radio Cards */}
      <div
        role="radiogroup"
        aria-labelledby={groupLabelId}
        aria-describedby={groupDescId}
        className="grid grid-cols-1 sm:grid-cols-3 gap-2.5"
      >
        {PATTERN_ORDER.map((presetId, idx) => {
          const profile = HAPTIC_PATTERN_PROFILES[presetId];
          const selected = settings.patternPreset === presetId;
          const barCount = idx + 1;

          return (
            <button
              key={presetId}
              type="button"
              role="radio"
              aria-checked={selected}
              data-testid={`haptic-pattern-option-${presetId}`}
              onClick={() => handleSelectPattern(presetId)}
              className={`min-h-[44px] text-left rounded-xl p-3 border transition-colors cursor-pointer flex flex-col justify-between gap-2 focus-visible:outline-none focus-visible:ring-2 ${
                selected
                  ? isDark
                    ? 'bg-[#221A0E] border-[#C5A059] text-[#F3E5AB] focus-visible:ring-[#E1C47D]'
                    : 'bg-amber-50 border-amber-600 text-amber-950 focus-visible:ring-amber-700'
                  : isDark
                  ? 'bg-[#0E0C18] hover:bg-[#191528] border-slate-800 text-slate-300 focus-visible:ring-[#E1C47D]'
                  : 'bg-slate-50 hover:bg-amber-50/50 border-slate-200 text-slate-700 focus-visible:ring-amber-600'
              }`}
            >
              <div className="flex items-center justify-between gap-2 w-full">
                <span className="text-xs font-bold">
                  {isTi ? `${profile.labelTi} (${profile.labelEn})` : profile.labelEn}
                </span>

                {/* Geometric 3-Bar Vibration Strength Indicator */}
                <span
                  aria-hidden="true"
                  className="inline-flex items-end gap-0.5 h-3.5 shrink-0"
                >
                  {[1, 2, 3].map((step) => {
                    const lit = step <= barCount;
                    const heightClass =
                      step === 1 ? 'h-1.5' : step === 2 ? 'h-2.5' : 'h-3.5';
                    return (
                      <span
                        key={step}
                        className={`w-1 rounded-xs ${heightClass} ${
                          lit
                            ? selected
                              ? isDark
                                ? 'bg-[#E1C47D]'
                                : 'bg-amber-600'
                              : isDark
                              ? 'bg-slate-400'
                              : 'bg-slate-500'
                            : isDark
                            ? 'bg-slate-800'
                            : 'bg-slate-200'
                        }`}
                      />
                    );
                  })}
                </span>
              </div>

              <p
                className={`text-[11px] leading-snug ${
                  selected
                    ? isDark
                      ? 'text-slate-200'
                      : 'text-amber-900/90'
                    : isDark
                    ? 'text-slate-400'
                    : 'text-slate-500'
                }`}
              >
                {isTi ? profile.descriptionTi : profile.descriptionEn}
              </p>

              <div
                className={`pt-1.5 border-t flex items-center justify-between gap-2 text-[10px] font-mono tabular-nums ${
                  selected
                    ? isDark
                      ? 'border-[#8E6D28]/40 text-[#E1C47D]'
                      : 'border-amber-200 text-amber-800'
                    : isDark
                    ? 'border-slate-800/80 text-slate-500'
                    : 'border-slate-200/80 text-slate-500'
                }`}
              >
                <span>Swipe: {profile.swipeLeftPattern.join('-')}ms</span>
                <span>Tab: {profile.bottomNavThudPattern.join('-')}ms</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Waveform Preview Actions */}
      <div
        className={`pt-2 border-t flex flex-wrap items-center justify-between gap-2 text-[11px] ${
          isDark ? 'border-slate-800/80 text-slate-400' : 'border-slate-100 text-slate-500'
        }`}
      >
        <span>
          {settings.enabled
            ? isTi
              ? 'ቅዲ ኣብ ስዋይፕን ምቕያር ታብን ብቀጥታ ይሰርሕ'
              : 'Applied immediately to swipe gestures & tab transitions'
            : isTi
            ? 'ሃፕቲክ ተዓጽዩ ኣሎ — ቅዲ ምስ ከፈትኩምዎ ክሰርሕ እዩ'
            : 'Haptics currently muted — saved pattern activates when enabled'}
        </span>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handlePreviewSwipe}
            className={`min-h-[36px] px-2.5 py-1 rounded-lg font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 ${
              settings.enabled && settings.swipeGesturesEnabled
                ? isDark
                  ? 'bg-[#1F190D] hover:bg-[#2F2414] border border-[#8E6D28]/50 text-[#F3E5AB] focus-visible:ring-[#E1C47D]'
                  : 'bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 focus-visible:ring-amber-600'
                : isDark
                ? 'bg-[#110F1A] border border-slate-800 text-slate-500 focus-visible:ring-slate-500'
                : 'bg-slate-100 border border-slate-200 text-slate-400 focus-visible:ring-slate-400'
            }`}
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>{isTi ? 'ስዋይፕ ፈትን' : 'Preview Swipe'}</span>
          </button>

          <button
            type="button"
            onClick={handlePreviewTab}
            className={`min-h-[36px] px-2.5 py-1 rounded-lg font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 ${
              settings.enabled && settings.tabTapsEnabled
                ? isDark
                  ? 'bg-[#1F190D] hover:bg-[#2F2414] border border-[#8E6D28]/50 text-[#F3E5AB] focus-visible:ring-[#E1C47D]'
                  : 'bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 focus-visible:ring-amber-600'
                : isDark
                ? 'bg-[#110F1A] border border-slate-800 text-slate-500 focus-visible:ring-slate-500'
                : 'bg-slate-100 border border-slate-200 text-slate-400 focus-visible:ring-slate-400'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{isTi ? 'ታብ ፈትን' : 'Preview Tab'}</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div
          role="status"
          aria-live="polite"
          data-testid="haptic-pattern-status"
          className={`text-[11px] font-medium ${
            isDark ? 'text-emerald-300' : 'text-emerald-700'
          }`}
        >
          {statusMessage}
        </div>
      )}
    </div>
  );
};
