import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  AdaptiveAesthetic,
  AdaptiveThemeMode,
  AdaptiveThemeSettings,
  DEFAULT_ADAPTIVE_THEME_SETTINGS,
  DEFAULT_CUSTOM_SUNRISE,
  DEFAULT_CUSTOM_SUNSET,
  SunCycleEvaluation,
  evaluateSunCycleState,
} from '../utils/sunCycle';

export const ADAPTIVE_THEME_STORAGE_KEY = 'axumite_adaptive_theme_v1';
export const ADAPTIVE_THEME_UPDATED_EVENT = 'axumite_adaptive_theme_updated';

const sanitizeHHMM = (value: unknown, fallback: string): string => {
  if (typeof value !== 'string') return fallback;
  return /^\d{2}:\d{2}$/.test(value.trim()) ? value.trim() : fallback;
};

export function getAdaptiveThemeSettings(): AdaptiveThemeSettings {
  if (typeof window === 'undefined') return DEFAULT_ADAPTIVE_THEME_SETTINGS;
  try {
    const raw = window.localStorage.getItem(ADAPTIVE_THEME_STORAGE_KEY);
    if (!raw) return DEFAULT_ADAPTIVE_THEME_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AdaptiveThemeSettings>;
    const mode: AdaptiveThemeMode =
      parsed.mode === 'gold-ambient' || parsed.mode === 'obsidian-deep' || parsed.mode === 'auto'
        ? parsed.mode
        : 'auto';

    const coordinates =
      parsed.coordinates &&
      typeof parsed.coordinates.latitude === 'number' &&
      typeof parsed.coordinates.longitude === 'number'
        ? {
            latitude: parsed.coordinates.latitude,
            longitude: parsed.coordinates.longitude,
            label:
              typeof parsed.coordinates.label === 'string' ? parsed.coordinates.label : undefined,
          }
        : null;

    return {
      mode,
      useCustomSchedule: Boolean(parsed.useCustomSchedule),
      customSunrise: sanitizeHHMM(parsed.customSunrise, DEFAULT_CUSTOM_SUNRISE),
      customSunset: sanitizeHHMM(parsed.customSunset, DEFAULT_CUSTOM_SUNSET),
      coordinates,
    };
  } catch {
    return DEFAULT_ADAPTIVE_THEME_SETTINGS;
  }
}

export function saveAdaptiveThemeSettings(
  patch: Partial<AdaptiveThemeSettings>
): AdaptiveThemeSettings {
  const prev = getAdaptiveThemeSettings();
  const next: AdaptiveThemeSettings = {
    ...prev,
    ...patch,
    customSunrise: sanitizeHHMM(patch.customSunrise ?? prev.customSunrise, DEFAULT_CUSTOM_SUNRISE),
    customSunset: sanitizeHHMM(patch.customSunset ?? prev.customSunset, DEFAULT_CUSTOM_SUNSET),
  };

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(ADAPTIVE_THEME_STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(
        new CustomEvent<AdaptiveThemeSettings>(ADAPTIVE_THEME_UPDATED_EVENT, { detail: next })
      );
    } catch {
      // Ignore storage quota errors
    }
  }

  return next;
}

const applyTimeOfDayAestheticToDom = (
  aesthetic: AdaptiveAesthetic,
  mode: AdaptiveThemeMode
): void => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.toggle('axum-aesthetic-gold-ambient', aesthetic === 'gold-ambient');
  root.classList.toggle('axum-aesthetic-obsidian-deep', aesthetic === 'obsidian-deep');
  root.dataset.timeAesthetic = aesthetic;
  root.dataset.adaptiveThemeMode = mode;
};

export interface AdaptiveThemeContextType {
  settings: AdaptiveThemeSettings;
  sunCycle: SunCycleEvaluation;
  activeAesthetic: AdaptiveAesthetic;
  isGeoLocating: boolean;
  geoError: string | null;
  setMode: (mode: AdaptiveThemeMode) => void;
  setUseCustomSchedule: (enabled: boolean) => void;
  setCustomTimes: (sunriseHHMM: string, sunsetHHMM: string) => void;
  requestGeolocation: () => void;
  clearGeolocation: () => void;
  refreshNow: () => void;
}

const AdaptiveThemeContext = createContext<AdaptiveThemeContextType | undefined>(undefined);

export const AdaptiveThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AdaptiveThemeSettings>(() => getAdaptiveThemeSettings());
  const [nowTick, setNowTick] = useState<Date>(() => new Date());
  const [isGeoLocating, setIsGeoLocating] = useState<boolean>(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const sunCycle = useMemo(
    () => evaluateSunCycleState(nowTick, settings),
    [nowTick, settings]
  );

  // Apply root aesthetic class & attributes synchronously on change
  useEffect(() => {
    applyTimeOfDayAestheticToDom(sunCycle.aesthetic, settings.mode);
  }, [sunCycle.aesthetic, settings.mode]);

  // Listen to storage sync and custom settings updates
  useEffect(() => {
    const onSettingsEvent = (event: Event) => {
      const detail = (event as CustomEvent<AdaptiveThemeSettings>).detail;
      setSettings(detail ?? getAdaptiveThemeSettings());
      setNowTick(new Date());
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === ADAPTIVE_THEME_STORAGE_KEY) {
        setSettings(getAdaptiveThemeSettings());
        setNowTick(new Date());
      }
    };
    window.addEventListener(ADAPTIVE_THEME_UPDATED_EVENT, onSettingsEvent);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(ADAPTIVE_THEME_UPDATED_EVENT, onSettingsEvent);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  // Re-evaluate automatically right at local sunrise/sunset boundaries + 60s check
  useEffect(() => {
    const msUntilBoundary = Math.max(
      1000,
      Math.min(sunCycle.nextTransitionAt.getTime() - Date.now() + 500, 3600000)
    );
    const boundaryTimer = window.setTimeout(() => {
      setNowTick(new Date());
    }, msUntilBoundary);

    const minuteTicker = window.setInterval(() => {
      setNowTick(new Date());
    }, 60000);

    return () => {
      window.clearTimeout(boundaryTimer);
      window.clearInterval(minuteTicker);
    };
  }, [sunCycle.nextTransitionAt]);

  const setMode = useCallback((mode: AdaptiveThemeMode) => {
    const next = saveAdaptiveThemeSettings({ mode });
    setSettings(next);
    setNowTick(new Date());
  }, []);

  const setUseCustomSchedule = useCallback((useCustomSchedule: boolean) => {
    const next = saveAdaptiveThemeSettings({ useCustomSchedule });
    setSettings(next);
    setNowTick(new Date());
  }, []);

  const setCustomTimes = useCallback((customSunrise: string, customSunset: string) => {
    const next = saveAdaptiveThemeSettings({
      useCustomSchedule: true,
      customSunrise,
      customSunset,
    });
    setSettings(next);
    setNowTick(new Date());
  }, []);

  const requestGeolocation = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoError('Browser geolocation unavailable; using local timezone sun estimates.');
      return;
    }

    setIsGeoLocating(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = saveAdaptiveThemeSettings({
          useCustomSchedule: false,
          coordinates: {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            label: `GPS (${pos.coords.latitude.toFixed(2)}°, ${pos.coords.longitude.toFixed(2)}°)`,
          },
        });
        setSettings(next);
        setNowTick(new Date());
        setIsGeoLocating(false);
      },
      (err) => {
        setIsGeoLocating(false);
        setGeoError(
          err.code === err.PERMISSION_DENIED
            ? 'Location permission declined — continuing with timezone solar schedule.'
            : 'Unable to lock GPS coordinates — using timezone solar schedule.'
        );
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 3600000 }
    );
  }, []);

  const clearGeolocation = useCallback(() => {
    const next = saveAdaptiveThemeSettings({ coordinates: null, useCustomSchedule: false });
    setSettings(next);
    setGeoError(null);
    setNowTick(new Date());
  }, []);

  const refreshNow = useCallback(() => {
    setNowTick(new Date());
  }, []);

  const value = useMemo<AdaptiveThemeContextType>(
    () => ({
      settings,
      sunCycle,
      activeAesthetic: sunCycle.aesthetic,
      isGeoLocating,
      geoError,
      setMode,
      setUseCustomSchedule,
      setCustomTimes,
      requestGeolocation,
      clearGeolocation,
      refreshNow,
    }),
    [
      settings,
      sunCycle,
      isGeoLocating,
      geoError,
      setMode,
      setUseCustomSchedule,
      setCustomTimes,
      requestGeolocation,
      clearGeolocation,
      refreshNow,
    ]
  );

  return (
    <AdaptiveThemeContext.Provider value={value}>{children}</AdaptiveThemeContext.Provider>
  );
};

export const useAdaptiveTheme = (): AdaptiveThemeContextType => {
  const ctx = useContext(AdaptiveThemeContext);
  if (!ctx) {
    throw new Error('useAdaptiveTheme must be used within an AdaptiveThemeProvider');
  }
  return ctx;
};
