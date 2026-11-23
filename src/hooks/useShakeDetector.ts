import { useState, useEffect, useRef, useCallback } from 'react';
import { playVoiceTriggerChime } from '../utils/audioChime';

export interface ShakeEventData {
  timestamp: number;
  acceleration: {
    x: number;
    y: number;
    z: number;
  };
  velocity: number;
  deviceType: 'mobile' | 'tablet' | 'desktop';
}

export interface UseShakeDetectorOptions {
  onShake: (data: ShakeEventData) => void;
  enabled?: boolean;
  threshold?: number; // Acceleration delta threshold (default: 20)
  cooldownMs?: number; // Cooldown after a shake trigger (default: 1200ms)
  enableHaptics?: boolean; // Vibration trigger
  enableAudioChime?: boolean; // Acoustic trigger sound
  trackLiveAcceleration?: boolean; // Only push 12.5Hz React state updates when a live diagnostics UI is open
}

export interface UseShakeDetectorReturn {
  isSupported: boolean;
  permissionGranted: boolean;
  requestPermission: () => Promise<boolean>;
  simulateShake: (customVelocity?: number) => void;
  currentAcceleration: { x: number; y: number; z: number };
  getLatestAcceleration: () => { x: number; y: number; z: number };
  lastShakeTime: number | null;
  sensitivity: number;
  setSensitivity: (val: number) => void;
  shakeCount: number;
}

const STORAGE_SHAKE_SENSITIVITY_KEY = 'axumite_shake_sensitivity';

export function useShakeDetector({
  onShake,
  enabled = true,
  threshold = 20,
  cooldownMs = 1200,
  enableHaptics = true,
  enableAudioChime = true,
  trackLiveAcceleration = false,
}: UseShakeDetectorOptions): UseShakeDetectorReturn {
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [permissionGranted, setPermissionGranted] = useState<boolean>(false);
  const [currentAcceleration, setCurrentAcceleration] = useState<{ x: number; y: number; z: number }>({ x: 0, y: 0, z: 0 });
  const [lastShakeTime, setLastShakeTime] = useState<number | null>(null);
  const [shakeCount, setShakeCount] = useState<number>(0);

  // Stored sensitivity preference (10 to 40, lower = more sensitive)
  const [sensitivity, setSensitivityState] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SHAKE_SENSITIVITY_KEY);
      return saved ? parseFloat(saved) : threshold;
    } catch {
      return threshold;
    }
  });

  const lastX = useRef<number | null>(null);
  const lastY = useRef<number | null>(null);
  const lastZ = useRef<number | null>(null);
  const latestAccelerationRef = useRef<{ x: number; y: number; z: number }>({ x: 0, y: 0, z: 0 });
  const trackLiveRef = useRef<boolean>(trackLiveAcceleration);
  trackLiveRef.current = trackLiveAcceleration;

  const lastUpdate = useRef<number>(0);
  const lastTriggerTime = useRef<number>(0);
  const onShakeRef = useRef(onShake);

  useEffect(() => {
    onShakeRef.current = onShake;
  }, [onShake]);

  const setSensitivity = useCallback((val: number) => {
    setSensitivityState(val);
    try {
      localStorage.setItem(STORAGE_SHAKE_SENSITIVITY_KEY, val.toString());
    } catch {
      // ignore
    }
  }, []);

  const getLatestAcceleration = useCallback(() => latestAccelerationRef.current, []);

  // Check device motion support
  useEffect(() => {
    if (typeof window !== 'undefined' && 'DeviceMotionEvent' in window) {
      setIsSupported(true);
      // Check if iOS permission function exists
      if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
        setPermissionGranted(false);
      } else {
        setPermissionGranted(true);
      }
    } else {
      setIsSupported(false);
    }
  }, []);

  // Permission requester for iOS 13+
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined') return false;

    if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      try {
        const response = await (DeviceMotionEvent as any).requestPermission();
        if (response === 'granted') {
          setPermissionGranted(true);
          return true;
        } else {
          setPermissionGranted(false);
          return false;
        }
      } catch (err) {
        console.warn('DeviceMotionEvent permission error:', err);
        setPermissionGranted(false);
        return false;
      }
    } else {
      setPermissionGranted(true);
      return true;
    }
  }, []);

  const triggerShakeAction = useCallback((velocity: number, acc: { x: number; y: number; z: number }) => {
    const now = Date.now();
    if (now - lastTriggerTime.current < cooldownMs) {
      return;
    }

    lastTriggerTime.current = now;
    setLastShakeTime(now);
    setShakeCount((prev) => prev + 1);

    // Haptics
    if (enableHaptics && typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([60, 40, 80]);
      } catch {
        // ignore
      }
    }

    // Audio Chime
    if (enableAudioChime) {
      try {
        playVoiceTriggerChime(0.12);
      } catch {
        // ignore
      }
    }

    const deviceType: 'mobile' | 'tablet' | 'desktop' =
      typeof window !== 'undefined' && window.innerWidth <= 640
        ? 'mobile'
        : typeof window !== 'undefined' && window.innerWidth <= 1024
        ? 'tablet'
        : 'desktop';

    onShakeRef.current({
      timestamp: now,
      acceleration: acc,
      velocity,
      deviceType,
    });
  }, [cooldownMs, enableAudioChime, enableHaptics]);

  // Manual simulation for Desktop / Emulators
  const simulateShake = useCallback((customVelocity: number = 32.5) => {
    triggerShakeAction(customVelocity, {
      x: +(Math.random() * 15).toFixed(2),
      y: +(Math.random() * 20).toFixed(2),
      z: +(Math.random() * 18).toFixed(2),
    });
  }, [triggerShakeAction]);

  // Motion event listener
  useEffect(() => {
    if (!enabled || !isSupported || !permissionGranted) {
      return;
    }

    const handleMotion = (event: DeviceMotionEvent) => {
      const now = Date.now();
      // Rate limit evaluation to every 80ms
      if (now - lastUpdate.current < 80) {
        return;
      }

      const acc = event.accelerationIncludingGravity || event.acceleration;
      if (!acc || acc.x === null || acc.y === null || acc.z === null) {
        return;
      }

      const x = acc.x;
      const y = acc.y;
      const z = acc.z;

      const sample = {
        x: +x.toFixed(2),
        y: +y.toFixed(2),
        z: +z.toFixed(2),
      };
      latestAccelerationRef.current = sample;

      // Only trigger React state updates when a consumer actively displays live telemetry
      if (trackLiveRef.current) {
        setCurrentAcceleration(sample);
      }

      if (lastX.current !== null && lastY.current !== null && lastZ.current !== null) {
        const timeDelta = now - lastUpdate.current;
        const deltaX = Math.abs(x - lastX.current);
        const deltaY = Math.abs(y - lastY.current);
        const deltaZ = Math.abs(z - lastZ.current);

        // Speed metric: calculate vector change over time
        const speed = ((deltaX + deltaY + deltaZ) / (timeDelta || 1)) * 100;

        if (speed > sensitivity) {
          triggerShakeAction(speed, sample);
        }
      }

      lastX.current = x;
      lastY.current = y;
      lastZ.current = z;
      lastUpdate.current = now;
    };

    window.addEventListener('devicemotion', handleMotion, { passive: true });
    return () => {
      window.removeEventListener('devicemotion', handleMotion);
    };
  }, [enabled, isSupported, permissionGranted, sensitivity, triggerShakeAction]);

  return {
    isSupported,
    permissionGranted,
    requestPermission,
    simulateShake,
    currentAcceleration,
    getLatestAcceleration,
    lastShakeTime,
    sensitivity,
    setSensitivity,
    shakeCount,
  };
}
