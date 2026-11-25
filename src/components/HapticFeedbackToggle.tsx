import React, { useEffect, useId, useState } from 'react';
import { Accessibility, Vibrate, Volume2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import {
  HAPTICS_SETTINGS_EVENT,
  HapticSettings,
  getHapticSettings,
  isAndroidDevice,
  isVibrationApiSupported,
  saveHapticSettings,
  triggerSwipeTransitionHaptic,
  triggerTabTapHaptic,
} from '../utils/haptics';
import { playHapticSnapClick } from '../utils/audioChime';

interface HapticFeedbackToggleProps {
  /** Optional callback invoked whenever the user toggles haptic feedback */
  onChange?: (hapticEnabled: boolean) => void;
  /** Optional visual surface variant ('dark' matches ManagementHub, 'light' matches modals) */
  variant?: 'dark' | 'light';
  /** Render compact synchronized Audio Snap toggle inside this card */
  showAudioSnapControl?: boolean;
}

export const HapticFeedbackToggle: React.FC<HapticFeedbackToggleProps> = ({
  onChange,
  variant = 'dark',
  showAudioSnapControl = false,
}) => {
  const { language } = useLanguage();
  const isTi = language === 'ti';
  const isDark = variant === 'dark';

  const labelId = useId();
  const descriptionId = useId();
  const audioLabelId = useId();
  const audioDescId = useId();
  const statusId = useId();

  const [hapticEnabled, setHapticEnabled] = useState<boolean>(
    () => getHapticSettings().enabled
  );
  const [gestureSettings, setGestureSettings] = useState<HapticSettings>(
    () => getHapticSettings()
  );
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    const handleGlobalUpdate = (event: Event) => {
      const detail = (event as CustomEvent<HapticSettings>).detail;
      const latest = detail ?? getHapticSettings();
      setHapticEnabled(latest.enabled);
      setGestureSettings(latest);
    };

    window.addEventListener(HAPTICS_SETTINGS_EVENT, handleGlobalUpdate);
    return () => window.removeEventListener(HAPTICS_SETTINGS_EVENT, handleGlobalUpdate);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleMediaChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    media.addEventListener?.('change', handleMediaChange);
    return () => media.removeEventListener?.('change', handleMediaChange);
  }, []);

  const handleToggle = () => {
    const nextEnabled = !hapticEnabled;
    const updated = saveHapticSettings({ enabled: nextEnabled });
    setHapticEnabled(updated.enabled);
    setGestureSettings(updated);

    if (nextEnabled) {
      if (updated.tabTapsEnabled) {
        triggerTabTapHaptic();
      } else if (updated.swipeGesturesEnabled) {
        triggerSwipeTransitionHaptic('left');
      }
      setStatusMessage(
        isTi
          ? 'ሃፕቲክ ግብረ-መልሲ ንምንቅስቓስ UI ተኸፊቱ።'
          : 'Haptic feedback enabled globally for UI gestures.'
      );
    } else {
      setStatusMessage(
        isTi
          ? 'ሃፕቲክ ግብረ-መልሲ ንምንቅስቓስ UI ተዓጽዩ።'
          : 'Haptic feedback disabled globally for UI gestures.'
      );
    }

    onChange?.(updated.enabled);
  };

  const handleTestPulse = () => {
    if (!hapticEnabled) {
      setStatusMessage(
        isTi
          ? 'ፈተነ ቅድሚ ምግባርኩም ሃፕቲክ ግብረ-መልሲ ክፈቱ።'
          : 'Enable Haptic Feedback first to test gesture vibration.'
      );
      return;
    }

    const fired = triggerSwipeTransitionHaptic('left');
    setStatusMessage(
      fired
        ? isTi
          ? 'ምልክት ሃፕቲክ ተፈቲኑ።'
          : 'Gesture haptic pulse triggered.'
        : isVibrationApiSupported()
        ? isTi
          ? 'ምልክት ተላኢኹ (ኣብ ስልክኹም vibrate ክፉት ምዃኑ ኣረጋግጹ)።'
          : 'Vibration pattern queued (verify device vibrate mute switch).'
        : isTi
        ? 'ቅድመ-ርእይቶ ዴስክቶፕ (ኣብ Android መሳርሒታት ብኣካል ይሰርሕ)።'
        : 'Desktop preview mode (physical pulse active on Android devices).'
    );
  };

  const apiSupported = isVibrationApiSupported();
  const androidDetected = isAndroidDevice();

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
              isDark
                ? 'bg-[#1F190D] border border-[#8E6D28]/45 text-[#E1C47D]'
                : 'bg-amber-50 border border-amber-200 text-amber-700'
            }`}
          >
            <Vibrate className="w-4 h-4" />
          </div>

          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                id={labelId}
                className={
                  isDark
                    ? 'text-sm font-bold text-[#F3E5AB]'
                    : 'text-sm font-bold text-slate-900'
                }
              >
                {isTi ? 'ሃፕቲክ ግብረ-መልሲ (Haptic Feedback)' : 'Haptic Feedback'}
              </span>
              <span
                className={
                  isDark ? 'text-[11px] text-slate-400' : 'text-[11px] text-slate-500'
                }
              >
                <span aria-hidden="true">· </span>
                {hapticEnabled
                  ? isTi
                    ? 'ንጡፍ'
                    : 'On'
                  : isTi
                  ? 'ዝተዓጸወ'
                  : 'Off'}
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
                ? 'ኣብ ስዋይፕ፣ ምትንኻፍ መጠወቒታትን ምቕያር ታብስን ኣካላዊ ሃፕቲክ ግብረ-መልሲ ብደረጃ መተግበሪ የመሓድር።'
                : 'Global accessibility preference controlling tactile vibration for UI swipe gestures, taps, and navigation controls.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={hapticEnabled}
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
              hapticEnabled
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
                isDark && hapticEnabled ? 'bg-[#0B0914]' : 'bg-white'
              }`}
            />
          </span>
        </button>
      </div>

      {/* Inline Accessibility Metadata & Test Trigger */}
      <div
        className={`pt-2 border-t flex flex-wrap items-center justify-between gap-2 text-[11px] ${
          isDark ? 'border-slate-800/80 text-slate-400' : 'border-slate-100 text-slate-500'
        }`}
      >
        <div className="flex flex-wrap items-center gap-1.5">
          <Accessibility className="w-3.5 h-3.5 shrink-0" />
          <span>
            {apiSupported
              ? androidDetected
                ? isTi
                  ? 'Android ሃፕቲክ ድሉው'
                  : 'Android Haptics Ready'
                : isTi
                ? 'Vibration API ድሉው'
                : 'Vibration API Ready'
              : isTi
              ? 'ቅድመ-ርእይቶ ዴስክቶፕ'
              : 'Desktop Preview'}
          </span>
          <span aria-hidden="true">·</span>
          <span>
            {isTi
              ? `ስዋይፕ: ${gestureSettings.swipeGesturesEnabled ? 'ንጡፍ' : 'ዝተዓጸወ'} · ጠውቂ: ${gestureSettings.tabTapsEnabled ? 'ንጡፍ' : 'ዝተዓጸወ'} · ድምጺ ስናፕ: ${gestureSettings.audioFeedbackEnabled ? 'ንጡፍ' : 'ዝተዓጸወ'}`
              : `Swipes ${gestureSettings.swipeGesturesEnabled ? 'On' : 'Off'} · Taps ${gestureSettings.tabTapsEnabled ? 'On' : 'Off'} · Snap Audio ${gestureSettings.audioFeedbackEnabled ? 'On' : 'Off'}`}
          </span>
          {prefersReducedMotion && (
            <>
              <span aria-hidden="true">·</span>
              <span className={isDark ? 'text-[#E1C47D]' : 'text-amber-700'}>
                {isTi ? 'Reduced Motion ንጡፍ' : 'OS Reduced Motion Active'}
              </span>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={handleTestPulse}
          className={`min-h-[36px] px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 ${
            hapticEnabled
              ? isDark
                ? 'bg-[#1F190D] hover:bg-[#2F2414] border border-[#8E6D28]/50 text-[#F3E5AB] focus-visible:ring-[#E1C47D]'
                : 'bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 focus-visible:ring-amber-600'
              : isDark
              ? 'bg-[#110F1A] border border-slate-800 text-slate-500 focus-visible:ring-slate-500'
              : 'bg-slate-100 border border-slate-200 text-slate-400 focus-visible:ring-slate-400'
          }`}
        >
          {isTi ? 'ምልክት ፈትን' : 'Test Pulse'}
        </button>
      </div>

      {showAudioSnapControl && (
        <div
          className={`pt-3 border-t flex items-center justify-between gap-3 ${
            isDark ? 'border-slate-800/80' : 'border-slate-100'
          }`}
        >
          <div className="flex items-start gap-2.5 min-w-0">
            <Volume2
              className={`w-4 h-4 shrink-0 mt-0.5 ${
                isDark ? 'text-[#E1C47D]' : 'text-amber-700'
              }`}
            />
            <div className="min-w-0">
              <div
                id={audioLabelId}
                className={
                  isDark ? 'text-xs font-bold text-[#F3E5AB]' : 'text-xs font-bold text-slate-900'
                }
              >
                {isTi ? 'ናይ ስዋይፕ ድምጺ ስናፕ (Audio Snap)' : 'Swipe Audio Snap Sound'}
              </div>
              <p
                id={audioDescId}
                className={isDark ? 'text-[11px] text-slate-400' : 'text-[11px] text-slate-500'}
              >
                {isTi
                  ? 'ምቕያር ታብ ብስዋይፕ ክፍጸም ከሎ ምስ ሃፕቲክ ዝተወሃሃደ ቀሊል ድምጺ የስምዕ።'
                  : 'Play a soft snap click synced with haptic feedback on committed tab swipes.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={
              hapticEnabled &&
              gestureSettings.swipeGesturesEnabled &&
              gestureSettings.audioFeedbackEnabled
            }
            aria-labelledby={audioLabelId}
            aria-describedby={audioDescId}
            onClick={() => {
              const active =
                hapticEnabled &&
                gestureSettings.swipeGesturesEnabled &&
                gestureSettings.audioFeedbackEnabled;
              const nextAudio = !active;
              const updated = saveHapticSettings({
                enabled: nextAudio ? true : hapticEnabled,
                swipeGesturesEnabled: nextAudio ? true : gestureSettings.swipeGesturesEnabled,
                audioFeedbackEnabled: nextAudio,
              });
              setHapticEnabled(updated.enabled);
              setGestureSettings(updated);
              if (nextAudio) {
                playHapticSnapClick('left', updated.intensity);
                setStatusMessage(
                  isTi
                    ? 'ናይ ስዋይፕ ድምጺ ስናፕ ተኸፊቱ።'
                    : 'Swipe audio snap feedback enabled.'
                );
              } else {
                setStatusMessage(
                  isTi
                    ? 'ናይ ስዋይፕ ድምጺ ስናፕ ተዓጽዩ።'
                    : 'Swipe audio snap feedback disabled.'
                );
              }
            }}
            className={`min-w-[44px] min-h-[44px] inline-flex items-center justify-end shrink-0 cursor-pointer rounded-xl focus-visible:outline-none focus-visible:ring-2 ${
              isDark
                ? 'focus-visible:ring-[#E1C47D] focus-visible:ring-offset-2 focus-visible:ring-offset-[#141220]'
                : 'focus-visible:ring-amber-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white'
            }`}
          >
            <span
              aria-hidden="true"
              className={`w-11 h-6 rounded-full p-0.5 flex items-center transition-colors ${
                hapticEnabled &&
                gestureSettings.swipeGesturesEnabled &&
                gestureSettings.audioFeedbackEnabled
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
                  isDark &&
                  hapticEnabled &&
                  gestureSettings.swipeGesturesEnabled &&
                  gestureSettings.audioFeedbackEnabled
                    ? 'bg-[#0B0914]'
                    : 'bg-white'
                }`}
              />
            </span>
          </button>
        </div>
      )}

      {statusMessage && (
        <div
          id={statusId}
          role="status"
          aria-live="polite"
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
