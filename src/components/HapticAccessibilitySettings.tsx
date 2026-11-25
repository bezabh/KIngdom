import React, { useEffect, useId, useState } from 'react';
import {
  Accessibility,
  ArrowLeftRight,
  Hand,
  RotateCcw,
  Smartphone,
  Sliders,
  Vibrate,
  Volume2,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import {
  DEFAULT_SWIPE_THRESHOLD_PX,
  HAPTICS_SETTINGS_EVENT,
  HapticIntensity,
  HapticSettings,
  getHapticSettings,
  isAndroidDevice,
  isVibrationApiSupported,
  saveHapticSettings,
  triggerBottomNavLuxuryThud,
  triggerSwipeTransitionHaptic,
  triggerTabTapHaptic,
} from '../utils/haptics';
import { playHapticSnapClick } from '../utils/audioChime';
import { SwipeSensitivitySlider } from './SwipeSensitivitySlider';

interface HapticAccessibilitySettingsProps {
  variant?: 'light' | 'dark';
  onStatusToast?: (message: string) => void;
  showSwipeSlider?: boolean;
  showPatternSelector?: boolean;
}

const INTENSITY_OPTIONS: {
  id: HapticIntensity;
  labelEn: string;
  labelTi: string;
  hintEn: string;
}[] = [
  { id: 'light', labelEn: 'Subtle', labelTi: 'ረቂቕ', hintEn: 'Gentle' },
  { id: 'medium', labelEn: 'Moderate', labelTi: 'ሚዛናዊ', hintEn: 'Standard' },
  { id: 'crisp', labelEn: 'Strong', labelTi: 'ሓያል', hintEn: 'Strong' },
];

export const HapticAccessibilitySettings: React.FC<HapticAccessibilitySettingsProps> = ({
  variant = 'light',
  onStatusToast,
  showSwipeSlider = true,
  showPatternSelector = true,
}) => {
  const { language } = useLanguage();
  const isTi = language === 'ti';
  const isDark = variant === 'dark';

  const baseId = useId();
  const masterLabelId = `${baseId}-master-label`;
  const masterDescId = `${baseId}-master-desc`;
  const swipeLabelId = `${baseId}-swipe-label`;
  const swipeDescId = `${baseId}-swipe-desc`;
  const tapLabelId = `${baseId}-tap-label`;
  const tapDescId = `${baseId}-tap-desc`;
  const audioLabelId = `${baseId}-audio-label`;
  const audioDescId = `${baseId}-audio-desc`;
  const intensityLabelId = `${baseId}-intensity-label`;

  const [settings, setSettings] = useState<HapticSettings>(() => getHapticSettings());
  const [lastFeedbackNote, setLastFeedbackNote] = useState<string | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    const onSettingsUpdated = (event: Event) => {
      const detail = (event as CustomEvent<HapticSettings>).detail;
      if (detail) {
        setSettings(detail);
      } else {
        setSettings(getHapticSettings());
      }
    };

    window.addEventListener(HAPTICS_SETTINGS_EVENT, onSettingsUpdated);
    return () => window.removeEventListener(HAPTICS_SETTINGS_EVENT, onSettingsUpdated);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    media.addEventListener?.('change', onChange);
    return () => media.removeEventListener?.('change', onChange);
  }, []);

  const notify = (msg: string) => {
    setLastFeedbackNote(msg);
    if (onStatusToast) {
      onStatusToast(msg);
    }
  };

  const handleToggleMaster = () => {
    const nextEnabled = !settings.enabled;
    const updated = saveHapticSettings({ enabled: nextEnabled });
    setSettings(updated);
    if (nextEnabled) {
      if (updated.tabTapsEnabled) {
        triggerTabTapHaptic();
      } else if (updated.swipeGesturesEnabled) {
        triggerSwipeTransitionHaptic('left');
      }
      notify(isTi ? 'ሃፕቲክ ምንቅጥቃጥ ተኸፊቱ' : 'Haptic feedback enabled');
    } else {
      notify(isTi ? 'ሃፕቲክ ምንቅጥቃጥ ተዓጽዩ' : 'Haptic feedback disabled');
    }
  };

  const handleToggleSwipe = () => {
    const currentlyActive = settings.enabled && settings.swipeGesturesEnabled;
    const nextSwipe = !currentlyActive;
    const updated = saveHapticSettings({
      enabled: nextSwipe ? true : settings.enabled,
      swipeGesturesEnabled: nextSwipe,
    });
    setSettings(updated);
    if (nextSwipe) {
      triggerSwipeTransitionHaptic('left');
      notify(isTi ? 'ናይ ስዋይፕ ሃፕቲክ ተኸፊቱ' : 'Swipe gesture haptics enabled');
    } else {
      notify(isTi ? 'ናይ ስዋይፕ ሃፕቲክ ተዓጽዩ' : 'Swipe gesture haptics disabled');
    }
  };

  const handleToggleTaps = () => {
    const currentlyActive = settings.enabled && settings.tabTapsEnabled;
    const nextTaps = !currentlyActive;
    const updated = saveHapticSettings({
      enabled: nextTaps ? true : settings.enabled,
      tabTapsEnabled: nextTaps,
    });
    setSettings(updated);
    if (nextTaps) {
      triggerTabTapHaptic();
      notify(isTi ? 'ናይ ጠውቂ ሃፕቲክ ተኸፊቱ' : 'Tap & button haptics enabled');
    } else {
      notify(isTi ? 'ናይ ጠውቂ ሃፕቲክ ተዓጽዩ' : 'Tap & button haptics disabled');
    }
  };

  const handleToggleAudioSnap = () => {
    const currentlyActive =
      settings.enabled && settings.swipeGesturesEnabled && settings.audioFeedbackEnabled;
    const nextAudio = !currentlyActive;
    const updated = saveHapticSettings({
      enabled: nextAudio ? true : settings.enabled,
      swipeGesturesEnabled: nextAudio ? true : settings.swipeGesturesEnabled,
      audioFeedbackEnabled: nextAudio,
    });
    setSettings(updated);
    if (nextAudio) {
      triggerSwipeTransitionHaptic('left');
      notify(
        isTi
          ? 'ናይ ስዋይፕ ድምጺ ስናፕ ተኸፊቱ'
          : 'Swipe transition snap audio enabled'
      );
    } else {
      notify(
        isTi
          ? 'ናይ ስዋይፕ ድምጺ ስናፕ ተዓጽዩ'
          : 'Swipe transition snap audio disabled'
      );
    }
  };

  const handleTestAudioSnap = () => {
    if (!settings.enabled || !settings.swipeGesturesEnabled || !settings.audioFeedbackEnabled) {
      notify(
        isTi
          ? 'ፈተነ ቅድሚ ምግባርኩም ድምጺ ስናፕ ክፈቱ'
          : 'Enable Swipe Audio Snap to preview the snap sound'
      );
      return;
    }
    const played = playHapticSnapClick('left', settings.intensity);
    triggerSwipeTransitionHaptic('left');
    notify(
      played
        ? isTi
          ? 'ናይ ስዋይፕ ድምጺ ስናፕ ተፈቲኑ'
          : 'Subtle snap click played with haptic sync'
        : isTi
        ? 'ድምጺ ኣብዚ ብራውዘር ኣይተኸፍተን'
        : 'Audio playback unavailable in this context'
    );
  };

  const handleSelectIntensity = (level: HapticIntensity) => {
    const updated = saveHapticSettings({ intensity: level });
    setSettings(updated);
    if (updated.enabled) {
      if (updated.tabTapsEnabled) {
        triggerTabTapHaptic();
      } else if (updated.swipeGesturesEnabled) {
        triggerSwipeTransitionHaptic('left');
      }
    }
    const label = level === 'light' ? 'Subtle' : level === 'crisp' ? 'Strong' : 'Moderate';
    notify(
      isTi
        ? `ቅዲ ሃፕቲክ ናብ ${label} ተቐዪሩ`
        : `Haptic pattern set to ${label}`
    );
  };

  const handleTestSwipe = () => {
    if (!settings.enabled || !settings.swipeGesturesEnabled) {
      notify(
        isTi
          ? 'ፈተነ ቅድሚ ምግባርኩም ናይ ስዋይፕ ሃፕቲክ ክፈቱ'
          : 'Enable Swipe Gestures haptics to test swipe feedback'
      );
      return;
    }
    const fired = triggerSwipeTransitionHaptic('left');
    notify(
      fired
        ? isTi
          ? 'ናይ ስዋይፕ ምንቅጥቃጥ ተፈቲኑ'
          : 'Swipe pulse triggered via device Vibration API'
        : isVibrationApiSupported()
        ? isTi
          ? 'ምልክት ተላኢኹ (ኣብ ስልክኹም vibrate ክፉት ምዃኑ ኣረጋግጹ)'
          : 'Swipe pattern queued (check device vibration mute switch)'
        : isTi
        ? 'ኣብዚ ዴስክቶፕ ብራውዘር Vibration API የለን — ኣብ Android ይሰርሕ'
        : 'Desktop preview mode — active physically on Android devices'
    );
  };

  const handleTestTap = () => {
    if (!settings.enabled || !settings.tabTapsEnabled) {
      notify(
        isTi
          ? 'ፈተነ ቅድሚ ምግባርኩም ናይ ጠውቂ ሃፕቲክ ክፈቱ'
          : 'Enable Tap & Navigation haptics to test tap feedback'
      );
      return;
    }
    const fired = triggerBottomNavLuxuryThud();
    notify(
      fired
        ? isTi
          ? 'ናይ ጠውቂ ምንቅጥቃጥ ተፈቲኑ'
          : 'Tap pulse triggered via device Vibration API'
        : isVibrationApiSupported()
        ? isTi
          ? 'ምልክት ተላኢኹ (ኣብ ስልክኹም vibrate ክፉት ምዃኑ ኣረጋግጹ)'
          : 'Tap pattern queued (check device vibration mute switch)'
        : isTi
        ? 'ኣብዚ ዴስክቶፕ ብራውዘር Vibration API የለን — ኣብ Android ይሰርሕ'
        : 'Desktop preview mode — active physically on Android devices'
    );
  };

  const handleResetDefaults = () => {
    const updated = saveHapticSettings({
      enabled: true,
      swipeGesturesEnabled: true,
      tabTapsEnabled: true,
      audioFeedbackEnabled: true,
      intensity: 'medium',
      swipeThresholdPx: DEFAULT_SWIPE_THRESHOLD_PX,
    });
    setSettings(updated);
    triggerTabTapHaptic();
    notify(isTi ? 'ቅጥዕታት ሃፕቲክ ናብ ንቡር ተመሊሱ' : 'Haptic accessibility settings reset to defaults');
  };

  const apiSupported = isVibrationApiSupported();
  const androidDetected = isAndroidDevice();

  const cardSurface = isDark
    ? 'bg-[#0B0914] border border-[#8E6D28]/35 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xl'
    : 'p-4 space-y-4 bg-slate-50/75 border-t border-slate-100';

  const rowSurface = isDark
    ? 'bg-[#120F1E] border border-[#8E6D28]/25 rounded-xl p-4'
    : 'bg-white border border-slate-200/80 rounded-xl p-3.5';

  const titleClass = isDark ? 'text-sm font-bold text-[#F3E5AB]' : 'text-xs font-bold text-slate-900';
  const bodyClass = isDark ? 'text-xs text-slate-300' : 'text-[11px] text-slate-600';
  const mutedClass = isDark ? 'text-[11px] text-slate-400' : 'text-[11px] text-slate-500';

  const switchTrackClass = (active: boolean) =>
    `w-11 h-6 rounded-full p-0.5 flex items-center transition-colors ${
      active
        ? isDark
          ? 'bg-[#C5A059] justify-end'
          : 'bg-amber-600 justify-end'
        : isDark
        ? 'bg-slate-700 justify-start'
        : 'bg-stone-300 justify-start'
    }`;

  const switchHitAreaClass = `min-w-[44px] min-h-[44px] inline-flex items-center justify-end shrink-0 cursor-pointer rounded-xl focus-visible:outline-none focus-visible:ring-2 ${
    isDark
      ? 'focus-visible:ring-[#E1C47D] focus-visible:ring-offset-2 focus-visible:ring-offset-[#120F1E]'
      : 'focus-visible:ring-amber-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white'
  }`;

  const testBtnClass = (enabled: boolean) =>
    `min-h-[36px] px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors inline-flex items-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 ${
      enabled
        ? isDark
          ? 'bg-[#1F190D] hover:bg-[#2F2414] border border-[#8E6D28]/50 text-[#F3E5AB] focus-visible:ring-[#E1C47D]'
          : 'bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 focus-visible:ring-amber-600'
        : isDark
        ? 'bg-[#171424] border border-slate-800 text-slate-500 focus-visible:ring-slate-500'
        : 'bg-slate-100 border border-slate-200 text-slate-400 focus-visible:ring-slate-400'
    }`;

  return (
    <section
      aria-label={
        isTi
          ? 'ናይ ተበጻሕነትን ሃፕቲክ ግብረ-መልስን ቅጥዕታት'
          : 'Accessibility and Gesture Haptic Settings'
      }
      className={cardSurface}
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isDark
                ? 'bg-[#1F190D] border border-[#8E6D28]/50 text-[#E1C47D]'
                : 'bg-amber-50 border border-amber-200 text-amber-700'
            }`}
          >
            <Accessibility className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3
              className={
                isDark
                  ? 'text-base font-bold text-[#F3E5AB] font-serif'
                  : 'text-xs sm:text-sm font-bold text-slate-900'
              }
            >
              {isTi
                ? 'ተበጻሕነትን ሃፕቲክ ግብረ-መልስን (Accessibility & Haptics)'
                : 'Accessibility & Gesture Haptics'}
            </h3>
            <p className={bodyClass}>
              {isTi
                ? 'ንስዋይፕን ጠውቅን ኣካላዊ ሃፕቲክ ምንቅጥቃጥ ብምቁጽጻር ተበጻሕነት ኣመሓይሹ።'
                : 'Customize tactile vibration feedback for swipes, button taps, and navigation gestures.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleResetDefaults}
          className={`min-h-[36px] px-2.5 py-1 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 ${
            isDark
              ? 'text-slate-300 hover:text-[#F3E5AB] hover:bg-[#1A162B] border border-slate-800 focus-visible:ring-[#E1C47D]'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 border border-slate-200 focus-visible:ring-amber-600'
          }`}
          title={isTi ? 'ናብ ንቡር ምለስ' : 'Reset haptic settings to defaults'}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>{isTi ? 'ንቡር ምለስ' : 'Reset'}</span>
        </button>
      </div>

      {/* Master Haptics Switch */}
      <div className={rowSurface}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                isDark ? 'bg-[#1A162B] text-[#E1C47D]' : 'bg-slate-100 text-slate-700'
              }`}
            >
              <Vibrate className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div id={masterLabelId} className={titleClass}>
                {isTi ? 'ዋና ሃፕቲክ ግብረ-መልሲ (Master Haptics)' : 'Enable Haptic Feedback'}
              </div>
              <p id={masterDescId} className={mutedClass}>
                {isTi
                  ? 'ኩሉ ኣካላዊ ምንቅጥቃጥ ኣብ ምንቅስቓስን ምትንኻፍን ይኸፍት ወይ ይዓጹ።'
                  : 'Master control for all tactile feedback pulses across the interface.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={settings.enabled}
            aria-labelledby={masterLabelId}
            aria-describedby={masterDescId}
            onClick={handleToggleMaster}
            className={switchHitAreaClass}
          >
            <span className={switchTrackClass(settings.enabled)} aria-hidden="true">
              <span
                className={`w-5 h-5 rounded-full shadow-sm transition-transform ${
                  isDark && settings.enabled ? 'bg-[#0B0914]' : 'bg-white'
                }`}
              />
            </span>
          </button>
        </div>
      </div>

      {/* Granular Gesture Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Swipe Gestures Toggle */}
        <div
          className={`${rowSurface} flex flex-col justify-between gap-3 transition-opacity ${
            settings.enabled ? 'opacity-100' : 'opacity-75'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5 min-w-0">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                  isDark ? 'bg-[#1A162B] text-cyan-300' : 'bg-blue-50 text-blue-700'
                }`}
              >
                <ArrowLeftRight className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div id={swipeLabelId} className={titleClass}>
                  {isTi ? 'ምልክታት ስዋይፕ (Swipe Gestures)' : 'Swipe Gestures'}
                </div>
                <p id={swipeDescId} className={mutedClass}>
                  {isTi
                    ? 'ኣብ መንጎ ገጻትን ታብስን ክትስሕቡ ከለኹም ኣንፈታዊ ምንቅጥቃጥ ይህብ።'
                    : 'Directional pulse when swiping between views, panels, and tabs.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={settings.enabled && settings.swipeGesturesEnabled}
              aria-labelledby={swipeLabelId}
              aria-describedby={swipeDescId}
              onClick={handleToggleSwipe}
              className={switchHitAreaClass}
            >
              <span
                className={switchTrackClass(settings.enabled && settings.swipeGesturesEnabled)}
                aria-hidden="true"
              >
                <span
                  className={`w-5 h-5 rounded-full shadow-sm ${
                    isDark && settings.enabled && settings.swipeGesturesEnabled
                      ? 'bg-[#0B0914]'
                      : 'bg-white'
                  }`}
                />
              </span>
            </button>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <span className={mutedClass}>
              {settings.enabled && settings.swipeGesturesEnabled
                ? isTi
                  ? 'ንጡፍ'
                  : 'Active'
                : isTi
                ? 'ዝተዓጸወ'
                : 'Off'}
            </span>
            <button
              type="button"
              onClick={handleTestSwipe}
              className={testBtnClass(settings.enabled && settings.swipeGesturesEnabled)}
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>{isTi ? 'ስዋይፕ ፈትን' : 'Test Swipe'}</span>
            </button>
          </div>
        </div>

        {/* Tab & Control Taps Toggle */}
        <div
          className={`${rowSurface} flex flex-col justify-between gap-3 transition-opacity ${
            settings.enabled ? 'opacity-100' : 'opacity-75'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5 min-w-0">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                  isDark ? 'bg-[#1A162B] text-emerald-300' : 'bg-emerald-50 text-emerald-700'
                }`}
              >
                <Hand className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div id={tapLabelId} className={titleClass}>
                  {isTi ? 'ምትንኻፍ ጠውቅን ታብን (Taps)' : 'Taps & Navigation Controls'}
                </div>
                <p id={tapDescId} className={mutedClass}>
                  {isTi
                    ? 'መጠወቒታትን ታብስን ክትትንክፉ ከለኹም ንጹር ምንቅጥቃጥ ይህብ።'
                    : 'Tactile confirmation click when tapping buttons and bottom navigation tabs.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={settings.enabled && settings.tabTapsEnabled}
              aria-labelledby={tapLabelId}
              aria-describedby={tapDescId}
              onClick={handleToggleTaps}
              className={switchHitAreaClass}
            >
              <span
                className={switchTrackClass(settings.enabled && settings.tabTapsEnabled)}
                aria-hidden="true"
              >
                <span
                  className={`w-5 h-5 rounded-full shadow-sm ${
                    isDark && settings.enabled && settings.tabTapsEnabled
                      ? 'bg-[#0B0914]'
                      : 'bg-white'
                  }`}
                />
              </span>
            </button>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <span className={mutedClass}>
              {settings.enabled && settings.tabTapsEnabled
                ? isTi
                  ? 'ንጡፍ'
                  : 'Active'
                : isTi
                ? 'ዝተዓጸወ'
                : 'Off'}
            </span>
            <button
              type="button"
              onClick={handleTestTap}
              className={testBtnClass(settings.enabled && settings.tabTapsEnabled)}
            >
              <Hand className="w-3.5 h-3.5" />
              <span>{isTi ? 'ጠውቂ ፈትን' : 'Test Tap'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Swipe Audio Snap Feedback (Synced with Haptics) */}
      <div
        className={`${rowSurface} flex flex-col justify-between gap-3 transition-opacity ${
          settings.enabled && settings.swipeGesturesEnabled ? 'opacity-100' : 'opacity-75'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                isDark ? 'bg-[#1A162B] text-[#E1C47D]' : 'bg-amber-50 text-amber-700'
              }`}
            >
              <Volume2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div id={audioLabelId} className={titleClass}>
                {isTi
                  ? 'ናይ ስዋይፕ ድምጺ ስናፕ (Audio Snap)'
                  : 'Swipe Audio Snap Feedback'}
              </div>
              <p id={audioDescId} className={mutedClass}>
                {isTi
                  ? 'ምቕያር ታብ ብስዋይፕ ክፍጸም ከሎ ምስ ሃፕቲክ ዝተወሃሃደ ቀሊል ድምጺ የስምዕ።'
                  : 'Plays a soft snap click synced with haptic feedback when a tab transition swipe commits.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={
              settings.enabled && settings.swipeGesturesEnabled && settings.audioFeedbackEnabled
            }
            aria-labelledby={audioLabelId}
            aria-describedby={audioDescId}
            onClick={handleToggleAudioSnap}
            className={switchHitAreaClass}
          >
            <span
              className={switchTrackClass(
                settings.enabled && settings.swipeGesturesEnabled && settings.audioFeedbackEnabled
              )}
              aria-hidden="true"
            >
              <span
                className={`w-5 h-5 rounded-full shadow-sm ${
                  isDark &&
                  settings.enabled &&
                  settings.swipeGesturesEnabled &&
                  settings.audioFeedbackEnabled
                    ? 'bg-[#0B0914]'
                    : 'bg-white'
                }`}
              />
            </span>
          </button>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          <span className={mutedClass}>
            {settings.enabled && settings.swipeGesturesEnabled && settings.audioFeedbackEnabled
              ? isTi
                ? 'ምስ ሃፕቲክ ዝተወሃሃደ'
                : 'Synced with swipe haptics'
              : isTi
              ? 'ዝተዓጸወ'
              : 'Off'}
          </span>
          <button
            type="button"
            onClick={handleTestAudioSnap}
            className={testBtnClass(
              settings.enabled && settings.swipeGesturesEnabled && settings.audioFeedbackEnabled
            )}
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>{isTi ? 'ድምጺ ፈትን' : 'Test Snap Sound'}</span>
          </button>
        </div>
      </div>

      {/* Haptic Intensity Selector */}
      {showPatternSelector && (
        <div className={rowSurface}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Sliders className={`w-4 h-4 shrink-0 ${isDark ? 'text-[#E1C47D]' : 'text-amber-700'}`} />
              <div>
                <div id={intensityLabelId} className={titleClass}>
                  {isTi ? 'መጠን ሓይሊ ሃፕቲክ (Intensity)' : 'Pulse Intensity'}
                </div>
                <div className={mutedClass}>
                  {isTi ? 'ንነፍሲ ወከፍ ምልክት ሓይሊ ምንቅጥቃጥ ምረጹ' : 'Adjust vibration duration and crispness'}
                </div>
              </div>
            </div>

            <div
              role="radiogroup"
              aria-labelledby={intensityLabelId}
              className="grid grid-cols-3 gap-1.5 sm:w-auto w-full"
            >
              {INTENSITY_OPTIONS.map((option) => {
                const selected = settings.intensity === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => handleSelectIntensity(option.id)}
                    className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 ${
                      selected
                        ? isDark
                          ? 'bg-[#C5A059] text-[#09090B] focus-visible:ring-[#E1C47D]'
                          : 'bg-amber-600 text-white shadow-xs focus-visible:ring-amber-700'
                        : isDark
                        ? 'bg-[#171424] hover:bg-[#221D34] text-slate-300 border border-[#8E6D28]/25 focus-visible:ring-[#E1C47D]'
                        : 'bg-slate-50 hover:bg-amber-50 text-slate-700 border border-slate-200 focus-visible:ring-amber-600'
                    }`}
                  >
                    <span>{isTi ? option.labelTi : option.labelEn}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Swipe Sensitivity Threshold Slider */}
      {showSwipeSlider && <SwipeSensitivitySlider variant={variant} />}

      {/* Inline Device & Accessibility Status Metadata (no pill clutter) */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
        <div className={`flex flex-wrap items-center gap-1.5 ${mutedClass}`}>
          <Smartphone className="w-3.5 h-3.5 shrink-0" />
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
              ? 'ቅድመ-ርእይቶ ዴስክቶፕ (ኣብ Android ይሰርሕ)'
              : 'Desktop Preview (Physical pulse active on Android)'}
          </span>
          {prefersReducedMotion && (
            <>
              <span aria-hidden="true">·</span>
              <span className={isDark ? 'text-[#E1C47D]' : 'text-amber-700'}>
                {isTi
                  ? 'OS ዝተቐነሰ ምንቅስቓስ (Reduced Motion) ተኸፊቱ ኣሎ'
                  : 'OS Reduced Motion active'}
              </span>
            </>
          )}
        </div>

        {lastFeedbackNote && (
          <div
            role="status"
            aria-live="polite"
            className={`font-medium ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}
          >
            {lastFeedbackNote}
          </div>
        )}
      </div>
    </section>
  );
};
