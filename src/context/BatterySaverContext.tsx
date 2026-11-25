import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

export type BatteryThresholdPct = 15 | 20 | 30;

export interface BatterySaverSettings {
  enabled: boolean;
  lowBatteryThresholdPct: BatteryThresholdPct;
  forceActive: boolean;
}

export interface BatteryStatus {
  supported: boolean;
  levelPct: number;
  charging: boolean;
}

interface BatteryManagerLike extends EventTarget {
  charging: boolean;
  level: number;
  addEventListener: (type: string, listener: EventListenerOrEventListenerObject) => void;
  removeEventListener: (type: string, listener: EventListenerOrEventListenerObject) => void;
}

export const BATTERY_SAVER_STORAGE_KEY = 'axumite_battery_saver_v1';
export const BATTERY_SAVER_EVENT = 'axumite_battery_saver_updated';

export const DEFAULT_BATTERY_SAVER_SETTINGS: BatterySaverSettings = {
  enabled: false,
  lowBatteryThresholdPct: 20,
  forceActive: false,
};

let currentPowerSavingActive = false;

export const isBatterySaverPowerSaveActive = (): boolean => currentPowerSavingActive;

const normalizeThreshold = (val: unknown): BatteryThresholdPct => {
  if (val === 15 || val === 20 || val === 30) return val;
  return 20;
};

export const getBatterySaverSettings = (): BatterySaverSettings => {
  if (typeof window === 'undefined') return DEFAULT_BATTERY_SAVER_SETTINGS;
  try {
    const raw = window.localStorage.getItem(BATTERY_SAVER_STORAGE_KEY);
    if (!raw) return DEFAULT_BATTERY_SAVER_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<BatterySaverSettings>;
    return {
      enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : false,
      lowBatteryThresholdPct: normalizeThreshold(parsed.lowBatteryThresholdPct),
      forceActive: typeof parsed.forceActive === 'boolean' ? parsed.forceActive : false,
    };
  } catch {
    return DEFAULT_BATTERY_SAVER_SETTINGS;
  }
};

export const saveBatterySaverSettings = (
  patch: Partial<BatterySaverSettings>
): BatterySaverSettings => {
  const next: BatterySaverSettings = {
    ...getBatterySaverSettings(),
    ...patch,
    lowBatteryThresholdPct: normalizeThreshold(
      patch.lowBatteryThresholdPct ?? getBatterySaverSettings().lowBatteryThresholdPct
    ),
  };

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(BATTERY_SAVER_STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent<BatterySaverSettings>(BATTERY_SAVER_EVENT, { detail: next }));
    } catch {
      // Ignore storage quota errors
    }
  }

  return next;
};

const applyBatterySaverDomState = (isActive: boolean) => {
  currentPowerSavingActive = isActive;
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('axumite-battery-saver', isActive);
  document.documentElement.dataset.batterySaver = isActive ? 'active' : 'off';
};

export interface BatterySaverContextType {
  settings: BatterySaverSettings;
  batteryStatus: BatteryStatus;
  isLowBattery: boolean;
  isPowerSavingActive: boolean;
  setEnabled: (enabled: boolean) => void;
  setLowBatteryThresholdPct: (threshold: BatteryThresholdPct) => void;
  setForceActive: (forceActive: boolean) => void;
}

const BatterySaverContext = createContext<BatterySaverContextType | undefined>(undefined);

export const BatterySaverProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<BatterySaverSettings>(() => getBatterySaverSettings());
  const [batteryStatus, setBatteryStatus] = useState<BatteryStatus>({
    supported: false,
    levelPct: 100,
    charging: true,
  });

  // Subscribe to W3C Battery Status API when supported by the browser/device
  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    const navWithBattery = navigator as Navigator & {
      getBattery?: () => Promise<BatteryManagerLike>;
    };
    if (typeof navWithBattery.getBattery !== 'function') return;

    let mounted = true;
    let managerRef: BatteryManagerLike | null = null;

    const syncFromManager = (manager: BatteryManagerLike) => {
      if (!mounted) return;
      const pct = Math.max(0, Math.min(100, Math.round((manager.level ?? 1) * 100)));
      setBatteryStatus({
        supported: true,
        levelPct: pct,
        charging: Boolean(manager.charging),
      });
    };

    const handleBatteryChange = () => {
      if (managerRef) {
        syncFromManager(managerRef);
      }
    };

    navWithBattery
      .getBattery()
      .then((manager) => {
        if (!mounted || !manager) return;
        managerRef = manager;
        syncFromManager(manager);
        manager.addEventListener('levelchange', handleBatteryChange);
        manager.addEventListener('chargingchange', handleBatteryChange);
      })
      .catch(() => {
        // Battery API unavailable or blocked
      });

    return () => {
      mounted = false;
      if (managerRef) {
        managerRef.removeEventListener('levelchange', handleBatteryChange);
        managerRef.removeEventListener('chargingchange', handleBatteryChange);
      }
    };
  }, []);

  // Keep in sync with custom events or external localStorage updates
  useEffect(() => {
    const handleSettingsEvent = (event: Event) => {
      const detail = (event as CustomEvent<BatterySaverSettings>).detail;
      setSettings(detail ?? getBatterySaverSettings());
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === BATTERY_SAVER_STORAGE_KEY) {
        setSettings(getBatterySaverSettings());
      }
    };

    window.addEventListener(BATTERY_SAVER_EVENT, handleSettingsEvent);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(BATTERY_SAVER_EVENT, handleSettingsEvent);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const isLowBattery =
    batteryStatus.supported &&
    !batteryStatus.charging &&
    batteryStatus.levelPct <= settings.lowBatteryThresholdPct;

  const isPowerSavingActive = settings.enabled && (settings.forceActive || isLowBattery);

  useEffect(() => {
    applyBatterySaverDomState(isPowerSavingActive);
  }, [isPowerSavingActive]);

  const setEnabled = useCallback((enabled: boolean) => {
    const next = saveBatterySaverSettings({ enabled });
    setSettings(next);
  }, []);

  const setLowBatteryThresholdPct = useCallback((lowBatteryThresholdPct: BatteryThresholdPct) => {
    const next = saveBatterySaverSettings({ lowBatteryThresholdPct });
    setSettings(next);
  }, []);

  const setForceActive = useCallback((forceActive: boolean) => {
    const next = saveBatterySaverSettings({
      forceActive,
      ...(forceActive ? { enabled: true } : {}),
    });
    setSettings(next);
  }, []);

  const value = useMemo<BatterySaverContextType>(
    () => ({
      settings,
      batteryStatus,
      isLowBattery,
      isPowerSavingActive,
      setEnabled,
      setLowBatteryThresholdPct,
      setForceActive,
    }),
    [
      settings,
      batteryStatus,
      isLowBattery,
      isPowerSavingActive,
      setEnabled,
      setLowBatteryThresholdPct,
      setForceActive,
    ]
  );

  return <BatterySaverContext.Provider value={value}>{children}</BatterySaverContext.Provider>;
};

export const useBatterySaver = (): BatterySaverContextType => {
  const ctx = useContext(BatterySaverContext);
  if (!ctx) {
    throw new Error('useBatterySaver must be used within a BatterySaverProvider');
  }
  return ctx;
};
