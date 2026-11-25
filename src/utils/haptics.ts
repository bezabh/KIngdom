/**
 * Axumite AI - Android Vibration API & Native Haptic Feedback Engine
 *
 * Combines Android `HapticFeedbackConstants` (including `LONG_PRESS` for weighted
 * tactile confirmation), custom `VIBRATE_PATTERN` luxury-gold thud waveforms,
 * the W3C / Android Chrome Vibration API (`navigator.vibrate`), and the native
 * Android WebView JS bridge (`window.AxumiteAndroidHaptics`).
 */

import { playHapticSnapClick } from './audioChime';

export type HapticIntensity = 'light' | 'medium' | 'crisp';
export type HapticPatternIntensity = 'subtle' | 'moderate' | 'strong';

export interface HapticPatternProfile {
  id: HapticPatternIntensity;
  legacyIntensity: HapticIntensity;
  labelEn: string;
  labelTi: string;
  descriptionEn: string;
  descriptionTi: string;
  swipeThresholdMs: number;
  swipeLeftPattern: readonly [number, number, number];
  swipeRightPattern: readonly [number, number, number];
  tabTapMs: number;
  bottomNavThudPattern: readonly [number, number, number];
  bottomNavPrimaryThudPattern: readonly [number, number, number];
  boundaryPattern: readonly [number, number, number];
}

export const HAPTIC_PATTERN_PROFILES: Record<HapticPatternIntensity, HapticPatternProfile> = {
  subtle: {
    id: 'subtle',
    legacyIntensity: 'light',
    labelEn: 'Subtle',
    labelTi: 'ረቂቕ',
    descriptionEn: 'Gentle micro-pulse for quiet, minimal tactile cues.',
    descriptionTi: 'ንህዱእን ረቂቕን ኣካላዊ ምልክት ዝኸውን ቀሊል ምንቅጥቃጥ።',
    swipeThresholdMs: 6,
    swipeLeftPattern: [8, 12, 12],
    swipeRightPattern: [12, 12, 8],
    tabTapMs: 8,
    bottomNavThudPattern: [10, 12, 18],
    bottomNavPrimaryThudPattern: [12, 14, 22],
    boundaryPattern: [10, 26, 10],
  },
  moderate: {
    id: 'moderate',
    legacyIntensity: 'medium',
    labelEn: 'Moderate',
    labelTi: 'ሚዛናዊ',
    descriptionEn: 'Balanced, crisp confirmation for everyday gestures.',
    descriptionTi: 'ንመዓልታዊ ስዋይፕን ጠውቅን ዝተመጣጠነ ንጹር ምንቅጥቃጥ።',
    swipeThresholdMs: 10,
    swipeLeftPattern: [14, 18, 26],
    swipeRightPattern: [24, 16, 12],
    tabTapMs: 12,
    bottomNavThudPattern: [18, 14, 34],
    bottomNavPrimaryThudPattern: [22, 16, 42],
    boundaryPattern: [18, 32, 18],
  },
  strong: {
    id: 'strong',
    legacyIntensity: 'crisp',
    labelEn: 'Strong',
    labelTi: 'ሓያል',
    descriptionEn: 'Pronounced, resonant pulse for high-clarity accessibility.',
    descriptionTi: 'ንልዑል ተበጻሕነት ዝኸውን ሓያልን ንጹርን ድርብ ምንቅጥቃጥ።',
    swipeThresholdMs: 16,
    swipeLeftPattern: [22, 16, 40],
    swipeRightPattern: [38, 16, 20],
    tabTapMs: 18,
    bottomNavThudPattern: [28, 14, 52],
    bottomNavPrimaryThudPattern: [34, 16, 62],
    boundaryPattern: [28, 28, 28],
  },
};

export function intensityToPatternPreset(intensity?: string): HapticPatternIntensity {
  if (intensity === 'subtle' || intensity === 'light') return 'subtle';
  if (intensity === 'strong' || intensity === 'crisp') return 'strong';
  return 'moderate';
}

export function patternPresetToIntensity(preset: HapticPatternIntensity): HapticIntensity {
  return HAPTIC_PATTERN_PROFILES[preset].legacyIntensity;
}

/**
 * Mirrors `android.view.HapticFeedbackConstants` integer identifiers so hybrid
 * Android WebView bridges and web handlers share exact Android SDK constants.
 */
export const HapticFeedbackConstants = {
  LONG_PRESS: 0,
  VIRTUAL_KEY: 1,
  KEYBOARD_TAP: 3,
  CLOCK_TICK: 4,
  CONTEXT_CLICK: 6,
  CONFIRM: 16,
  REJECT: 17,
  FLAG_IGNORE_VIEW_SETTING: 1,
  FLAG_IGNORE_GLOBAL_SETTING: 2,
} as const;

export type HapticFeedbackConstantValue =
  (typeof HapticFeedbackConstants)[keyof typeof HapticFeedbackConstants];

/**
 * Luxury gold tactile vibration waveforms (in ms: [vibrate, pause, vibrate]).
 * Tuned for a weighted, resonant "thud" rather than a thin metallic buzz.
 */
export const VIBRATE_PATTERN = {
  /** Primary BottomNav tab navigation weighted 'thud' (crisp latch -> tight damp -> deep gold strike) */
  BOTTOM_NAV_THUD: [18, 14, 34] as readonly number[],
  /** Center elevated sovereign action button authoritative 'thud' */
  BOTTOM_NAV_PRIMARY_THUD: [22, 16, 42] as readonly number[],
  /** Direct Android LONG_PRESS fallback thud pattern when native View bridge is unavailable */
  LONG_PRESS_THUD: [26, 12, 38] as readonly number[],
} as const;

export const MIN_SWIPE_THRESHOLD_PX = 24;
export const MAX_SWIPE_THRESHOLD_PX = 140;
export const DEFAULT_SWIPE_THRESHOLD_PX = 50;

export interface HapticSettings {
  enabled: boolean;
  swipeGesturesEnabled: boolean;
  tabTapsEnabled: boolean;
  /** Play subtle audio 'snap'/'click' synced with committed swipe tab transitions */
  audioFeedbackEnabled: boolean;
  intensity: HapticIntensity;
  /** Named vibration pattern profile (Subtle, Moderate, Strong) for swipes and tab transitions */
  patternPreset: HapticPatternIntensity;
  /** Horizontal drag distance in px required to trigger swipe detent & tab transition */
  swipeThresholdPx: number;
}

export interface HapticPulseDetail {
  kind:
    | 'swipe-threshold'
    | 'swipe-left'
    | 'swipe-right'
    | 'tab-tap'
    | 'bottom-nav-thud'
    | 'boundary'
    | 'custom';
  pattern: number | number[];
  feedbackConstant?: number;
  isAndroid?: boolean;
  supported: boolean;
  triggered: boolean;
  timestamp: number;
}

interface AxumiteAndroidHapticsBridge {
  vibratePattern?: (patternJson: string) => void;
  performHapticFeedback?: (feedbackConstant: number) => void;
  triggerBottomNavThud?: (feedbackConstant: number, patternJson: string) => void;
}

const STORAGE_KEY = 'axumite_haptic_settings_v1';
export const HAPTICS_SETTINGS_EVENT = 'axumite_haptics_settings_updated';
export const HAPTICS_PULSE_EVENT = 'axumite_haptics_pulse';

const DEFAULT_SETTINGS: HapticSettings = {
  enabled: true,
  swipeGesturesEnabled: true,
  tabTapsEnabled: true,
  audioFeedbackEnabled: true,
  intensity: 'medium',
  patternPreset: 'moderate',
  swipeThresholdPx: DEFAULT_SWIPE_THRESHOLD_PX,
};

export function clampSwipeThresholdPx(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_SWIPE_THRESHOLD_PX;
  return Math.min(MAX_SWIPE_THRESHOLD_PX, Math.max(MIN_SWIPE_THRESHOLD_PX, Math.round(value)));
}

const INTENSITY_MULTIPLIER: Record<HapticIntensity, number> = {
  light: 0.72,
  medium: 1.0,
  crisp: 1.35,
};

let lastPulseTimestamp = 0;

function getNativeAndroidHapticsBridge(): AxumiteAndroidHapticsBridge | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as unknown as { AxumiteAndroidHaptics?: AxumiteAndroidHapticsBridge })
    .AxumiteAndroidHaptics;
}

export function isAndroidDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  if (getNativeAndroidHapticsBridge()) return true;
  return /Android/i.test(navigator.userAgent || '');
}

export function isVibrationApiSupported(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const hasWebVibrate = typeof navigator.vibrate === 'function';
  const bridge = getNativeAndroidHapticsBridge();
  const hasNativeBridge =
    typeof bridge?.vibratePattern === 'function' ||
    typeof bridge?.performHapticFeedback === 'function' ||
    typeof bridge?.triggerBottomNavThud === 'function';
  return hasWebVibrate || hasNativeBridge;
}

export function getHapticSettings(): HapticSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    const resolvedIntensity: HapticIntensity =
      parsed.intensity === 'light' || parsed.intensity === 'medium' || parsed.intensity === 'crisp'
        ? parsed.intensity
        : DEFAULT_SETTINGS.intensity;
    const resolvedPreset: HapticPatternIntensity =
      parsed.patternPreset === 'subtle' ||
      parsed.patternPreset === 'moderate' ||
      parsed.patternPreset === 'strong'
        ? parsed.patternPreset
        : intensityToPatternPreset(resolvedIntensity);

    return {
      enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : DEFAULT_SETTINGS.enabled,
      swipeGesturesEnabled:
        typeof parsed.swipeGesturesEnabled === 'boolean'
          ? parsed.swipeGesturesEnabled
          : DEFAULT_SETTINGS.swipeGesturesEnabled,
      tabTapsEnabled:
        typeof parsed.tabTapsEnabled === 'boolean'
          ? parsed.tabTapsEnabled
          : DEFAULT_SETTINGS.tabTapsEnabled,
      audioFeedbackEnabled:
        typeof parsed.audioFeedbackEnabled === 'boolean'
          ? parsed.audioFeedbackEnabled
          : DEFAULT_SETTINGS.audioFeedbackEnabled,
      intensity: patternPresetToIntensity(resolvedPreset),
      patternPreset: resolvedPreset,
      swipeThresholdPx:
        typeof parsed.swipeThresholdPx === 'number'
          ? clampSwipeThresholdPx(parsed.swipeThresholdPx)
          : DEFAULT_SETTINGS.swipeThresholdPx,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function getSwipeThresholdPx(): number {
  return getHapticSettings().swipeThresholdPx;
}

export function saveHapticSettings(partial: Partial<HapticSettings>): HapticSettings {
  const current = getHapticSettings();
  let nextPreset: HapticPatternIntensity = current.patternPreset;
  let nextIntensity: HapticIntensity = current.intensity;

  if (partial.patternPreset) {
    nextPreset = intensityToPatternPreset(partial.patternPreset);
    nextIntensity = patternPresetToIntensity(nextPreset);
  } else if (partial.intensity) {
    nextPreset = intensityToPatternPreset(partial.intensity);
    nextIntensity = patternPresetToIntensity(nextPreset);
  }

  const merged = {
    ...current,
    ...partial,
    patternPreset: nextPreset,
    intensity: nextIntensity,
  };
  const next: HapticSettings = {
    ...merged,
    swipeThresholdPx: clampSwipeThresholdPx(merged.swipeThresholdPx),
  };
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent(HAPTICS_SETTINGS_EVENT, { detail: next }));
    } catch {
      // Ignore storage quota errors
    }
  }
  return next;
}

function scalePattern(
  pattern: number | readonly number[],
  intensity: HapticIntensity
): number | number[] {
  const mult = INTENSITY_MULTIPLIER[intensity] ?? 1.0;
  if (typeof pattern === 'number') {
    return Math.max(5, Math.round(pattern * mult));
  }
  return pattern.map((ms, idx) =>
    // Keep pause intervals (odd indices) tight so multi-tap waveforms stay crisp and resonant
    idx % 2 === 0 ? Math.max(5, Math.round(ms * mult)) : Math.max(10, ms)
  );
}

function dispatchPulseEvent(detail: HapticPulseDetail): void {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent(HAPTICS_PULSE_EVENT, { detail }));
  } catch {
    // Ignore
  }
}

/**
 * Low-level Android Vibration API trigger with rate-limit guard
 */
export function triggerHapticPattern(
  rawPattern: number | readonly number[],
  kind: HapticPulseDetail['kind'] = 'custom',
  minCooldownMs = 24,
  feedbackConstant?: number,
  skipIntensityScaling = false
): boolean {
  const settings = getHapticSettings();
  const supported = isVibrationApiSupported();
  const android = isAndroidDevice();
  const now = Date.now();
  const normalizedPattern = typeof rawPattern === 'number' ? rawPattern : [...rawPattern];

  if (!settings.enabled) {
    dispatchPulseEvent({
      kind,
      pattern: normalizedPattern,
      feedbackConstant,
      isAndroid: android,
      supported,
      triggered: false,
      timestamp: now,
    });
    return false;
  }

  if (now - lastPulseTimestamp < minCooldownMs) {
    return false;
  }
  lastPulseTimestamp = now;

  const scaled = skipIntensityScaling
    ? normalizedPattern
    : scalePattern(rawPattern, settings.intensity);
  let triggered = false;

  try {
    const nativeBridge = getNativeAndroidHapticsBridge();
    const arr = Array.isArray(scaled) ? scaled : [scaled];

    if (
      nativeBridge &&
      typeof feedbackConstant === 'number' &&
      typeof nativeBridge.triggerBottomNavThud === 'function'
    ) {
      nativeBridge.triggerBottomNavThud(feedbackConstant, JSON.stringify(arr));
      triggered = true;
    } else if (nativeBridge) {
      if (
        typeof feedbackConstant === 'number' &&
        typeof nativeBridge.performHapticFeedback === 'function'
      ) {
        nativeBridge.performHapticFeedback(feedbackConstant);
        triggered = true;
      }
      if (typeof nativeBridge.vibratePattern === 'function') {
        nativeBridge.vibratePattern(JSON.stringify(arr));
        triggered = true;
      }
    }

    const userActivation = (
      navigator as unknown as { userActivation?: { hasBeenActive?: boolean } }
    )?.userActivation;
    const canVibrateSafely =
      typeof userActivation?.hasBeenActive === 'boolean' ? userActivation.hasBeenActive : true;

    if (
      !triggered &&
      canVibrateSafely &&
      typeof navigator !== 'undefined' &&
      typeof navigator.vibrate === 'function'
    ) {
      // Android Chrome & WebView Vibration API returns true when vibration is queued
      const res = navigator.vibrate(scaled);
      triggered = res !== false;
    }
  } catch {
    triggered = false;
  }

  dispatchPulseEvent({
    kind,
    pattern: scaled,
    feedbackConstant,
    isAndroid: android,
    supported,
    triggered,
    timestamp: now,
  });

  return triggered;
}

/**
 * Triggers Android `HapticFeedbackConstants.LONG_PRESS` paired with the active pattern preset
 * to deliver a weighted, tactile "thud" for BottomNav tab navigation handlers.
 */
export function triggerBottomNavLuxuryThud(options?: {
  feedbackConstant?: number;
  pattern?: readonly number[];
  isPrimaryAction?: boolean;
}): boolean {
  const settings = getHapticSettings();
  if (!settings.enabled || !settings.tabTapsEnabled) return false;

  const profile = HAPTIC_PATTERN_PROFILES[settings.patternPreset];
  const feedbackConstant = options?.feedbackConstant ?? HapticFeedbackConstants.LONG_PRESS;
  const usesStandardThud =
    !options?.pattern ||
    options.pattern === VIBRATE_PATTERN.BOTTOM_NAV_THUD ||
    options.pattern === VIBRATE_PATTERN.BOTTOM_NAV_PRIMARY_THUD;
  const isPrimary =
    Boolean(options?.isPrimaryAction) ||
    options?.pattern === VIBRATE_PATTERN.BOTTOM_NAV_PRIMARY_THUD;

  const pattern = usesStandardThud
    ? isPrimary
      ? profile.bottomNavPrimaryThudPattern
      : profile.bottomNavThudPattern
    : options!.pattern!;

  return triggerHapticPattern(
    pattern,
    'bottom-nav-thud',
    24,
    feedbackConstant,
    usesStandardThud
  );
}

/**
 * Micro-detent when user drags horizontally past the swipe activation threshold
 * before lifting their finger (gives a physical latch/snap feel).
 */
export function triggerSwipeThresholdHaptic(): boolean {
  const settings = getHapticSettings();
  if (!settings.enabled || !settings.swipeGesturesEnabled) return false;
  const profile = HAPTIC_PATTERN_PROFILES[settings.patternPreset];
  return triggerHapticPattern(profile.swipeThresholdMs, 'swipe-threshold', 60, undefined, true);
}

/**
 * Directional tactile confirmation pulse when a swipe gesture completes a tab/screen switch.
 */
export function triggerSwipeTransitionHaptic(direction: 'left' | 'right'): boolean {
  const settings = getHapticSettings();
  if (!settings.enabled || !settings.swipeGesturesEnabled) return false;
  if (settings.audioFeedbackEnabled) {
    playHapticSnapClick(direction, settings.intensity);
  }
  const profile = HAPTIC_PATTERN_PROFILES[settings.patternPreset];
  const pattern = direction === 'left' ? profile.swipeLeftPattern : profile.swipeRightPattern;
  return triggerHapticPattern(
    pattern,
    direction === 'left' ? 'swipe-left' : 'swipe-right',
    30,
    undefined,
    true
  );
}

/**
 * Subtle single mechanical click for secondary tab bars and controls
 */
export function triggerTabTapHaptic(): boolean {
  const settings = getHapticSettings();
  if (!settings.enabled || !settings.tabTapsEnabled) return false;
  const profile = HAPTIC_PATTERN_PROFILES[settings.patternPreset];
  return triggerHapticPattern(profile.tabTapMs, 'tab-tap', 25, undefined, true);
}

/**
 * Gentle double-bump for navigation boundaries or Android system back/home buttons
 */
export function triggerBoundaryBumpHaptic(): boolean {
  const settings = getHapticSettings();
  if (!settings.enabled) return false;
  const profile = HAPTIC_PATTERN_PROFILES[settings.patternPreset];
  return triggerHapticPattern(profile.boundaryPattern, 'boundary', 40, undefined, true);
}

/**
 * Cancels any ongoing vibration pattern
 */
export function cancelHapticFeedback(): void {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(0);
    }
  } catch {
    // Ignore
  }
}
