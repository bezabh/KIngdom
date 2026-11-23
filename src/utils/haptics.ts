/**
 * Axumite AI - Android Vibration API & Native Haptic Feedback Engine
 *
 * Combines Android `HapticFeedbackConstants` (including `LONG_PRESS` for weighted
 * tactile confirmation), custom `VIBRATE_PATTERN` luxury-gold thud waveforms,
 * the W3C / Android Chrome Vibration API (`navigator.vibrate`), and the native
 * Android WebView JS bridge (`window.AxumiteAndroidHaptics`).
 */

export type HapticIntensity = 'light' | 'medium' | 'crisp';

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

export interface HapticSettings {
  enabled: boolean;
  swipeGesturesEnabled: boolean;
  tabTapsEnabled: boolean;
  intensity: HapticIntensity;
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
  intensity: 'medium',
};

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
      intensity:
        parsed.intensity === 'light' || parsed.intensity === 'medium' || parsed.intensity === 'crisp'
          ? parsed.intensity
          : DEFAULT_SETTINGS.intensity,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveHapticSettings(partial: Partial<HapticSettings>): HapticSettings {
  const next = { ...getHapticSettings(), ...partial };
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
  feedbackConstant?: number
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

  const scaled = scalePattern(rawPattern, settings.intensity);
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

    if (!triggered && typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
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
 * Triggers Android `HapticFeedbackConstants.LONG_PRESS` paired with `VIBRATE_PATTERN`
 * to deliver a weighted, premium tactile "thud" for BottomNav tab navigation handlers.
 */
export function triggerBottomNavLuxuryThud(options?: {
  feedbackConstant?: number;
  pattern?: readonly number[];
  isPrimaryAction?: boolean;
}): boolean {
  const settings = getHapticSettings();
  if (!settings.enabled || !settings.tabTapsEnabled) return false;

  const feedbackConstant = options?.feedbackConstant ?? HapticFeedbackConstants.LONG_PRESS;
  const pattern =
    options?.pattern ??
    (options?.isPrimaryAction
      ? VIBRATE_PATTERN.BOTTOM_NAV_PRIMARY_THUD
      : VIBRATE_PATTERN.BOTTOM_NAV_THUD);

  return triggerHapticPattern(pattern, 'bottom-nav-thud', 24, feedbackConstant);
}

/**
 * Micro-detent when user drags horizontally past the swipe activation threshold
 * before lifting their finger (gives a physical latch/snap feel).
 */
export function triggerSwipeThresholdHaptic(): boolean {
  const settings = getHapticSettings();
  if (!settings.enabled || !settings.swipeGesturesEnabled) return false;
  return triggerHapticPattern(10, 'swipe-threshold', 60);
}

/**
 * Directional tactile confirmation pulse when a swipe gesture completes a tab/screen switch.
 * - Left swipe (next tab): crisp ascending double-tap [14, 18, 26]
 * - Right swipe (prev tab): crisp settling double-tap [24, 16, 12]
 */
export function triggerSwipeTransitionHaptic(direction: 'left' | 'right'): boolean {
  const settings = getHapticSettings();
  if (!settings.enabled || !settings.swipeGesturesEnabled) return false;
  const pattern = direction === 'left' ? [14, 18, 26] : [24, 16, 12];
  return triggerHapticPattern(pattern, direction === 'left' ? 'swipe-left' : 'swipe-right', 30);
}

/**
 * Subtle single mechanical click for secondary tab bars and controls
 */
export function triggerTabTapHaptic(): boolean {
  const settings = getHapticSettings();
  if (!settings.enabled || !settings.tabTapsEnabled) return false;
  return triggerHapticPattern(12, 'tab-tap', 25);
}

/**
 * Gentle double-bump for navigation boundaries or Android system back/home buttons
 */
export function triggerBoundaryBumpHaptic(): boolean {
  const settings = getHapticSettings();
  if (!settings.enabled) return false;
  return triggerHapticPattern([18, 32, 18], 'boundary', 40);
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
