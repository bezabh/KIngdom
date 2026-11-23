import { useState, useEffect, useRef, useCallback } from 'react';

const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const DEFAULT_WARNING_MS = 60 * 1000;      // 1 minute warning
const ACTIVITY_STORAGE_KEY = 'axumite_last_activity_timestamp';
const THROTTLE_MS = 2000;                  // Throttle activity event dispatch

export interface IdleTimerOptions {
  timeoutMs?: number;
  warningMs?: number;
  isLoggedIn: boolean;
  onIdle: () => void;
}

export interface IdleTimerState {
  remainingSeconds: number;
  isWarning: boolean;
  formattedRemaining: string;
  resetTimer: () => void;
  lastActive: Date;
}

export function useIdleTimer({
  timeoutMs = DEFAULT_TIMEOUT_MS,
  warningMs = DEFAULT_WARNING_MS,
  isLoggedIn,
  onIdle,
}: IdleTimerOptions): IdleTimerState {
  const [remainingMs, setRemainingMs] = useState<number>(timeoutMs);
  const [isWarning, setIsWarning] = useState<boolean>(false);
  const lastActivityRef = useRef<number>(Date.now());
  const lastThrottleRef = useRef<number>(0);
  const hasTriggeredIdleRef = useRef<boolean>(false);
  const isWarningRef = useRef<boolean>(false);
  const lastReportedSecondsRef = useRef<number>(Math.ceil(timeoutMs / 1000));
  const onIdleRef = useRef(onIdle);

  useEffect(() => {
    onIdleRef.current = onIdle;
  }, [onIdle]);

  // Initialize or restore last activity from localStorage
  useEffect(() => {
    if (!isLoggedIn) {
      hasTriggeredIdleRef.current = false;
      if (isWarningRef.current) {
        isWarningRef.current = false;
        setIsWarning(false);
      }
      return;
    }

    try {
      const stored = localStorage.getItem(ACTIVITY_STORAGE_KEY);
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed) && parsed <= Date.now()) {
          // If stored activity is already older than timeout
          if (Date.now() - parsed >= timeoutMs) {
            hasTriggeredIdleRef.current = true;
            onIdleRef.current();
            return;
          }
          lastActivityRef.current = parsed;
        }
      } else {
        const now = Date.now();
        lastActivityRef.current = now;
        localStorage.setItem(ACTIVITY_STORAGE_KEY, now.toString());
      }
    } catch {
      lastActivityRef.current = Date.now();
    }
    hasTriggeredIdleRef.current = false;
  }, [isLoggedIn, timeoutMs]);

  // Record user activity
  const handleUserActivity = useCallback(() => {
    if (!isLoggedIn) return;
    const now = Date.now();

    // Throttle writing to state / storage
    if (now - lastThrottleRef.current < THROTTLE_MS) {
      return;
    }
    lastThrottleRef.current = now;
    lastActivityRef.current = now;
    hasTriggeredIdleRef.current = false;

    if (isWarningRef.current) {
      isWarningRef.current = false;
      setIsWarning(false);
      lastReportedSecondsRef.current = Math.ceil(timeoutMs / 1000);
      setRemainingMs(timeoutMs);
    }

    try {
      localStorage.setItem(ACTIVITY_STORAGE_KEY, now.toString());
    } catch {
      // Ignore localStorage errors
    }
  }, [isLoggedIn, timeoutMs]);

  // Reset timer manually (e.g. clicked "Stay Logged In")
  const resetTimer = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;
    lastThrottleRef.current = now;
    hasTriggeredIdleRef.current = false;
    isWarningRef.current = false;
    lastReportedSecondsRef.current = Math.ceil(timeoutMs / 1000);
    setIsWarning(false);
    setRemainingMs(timeoutMs);
    try {
      localStorage.setItem(ACTIVITY_STORAGE_KEY, now.toString());
    } catch {
      // Ignore
    }
  }, [timeoutMs]);

  // Register multi-input event listeners for user activity
  useEffect(() => {
    if (!isLoggedIn) return;

    const events = [
      'mousedown',
      'mousemove',
      'keydown',
      'touchstart',
      'scroll',
      'wheel',
      'click',
      'pointerdown',
    ];

    const onActivity = () => handleUserActivity();

    events.forEach((evt) => {
      window.addEventListener(evt, onActivity, { passive: true });
    });

    // Multi-tab synchronization
    const onStorage = (e: StorageEvent) => {
      if (e.key === ACTIVITY_STORAGE_KEY && e.newValue) {
        const remoteTime = parseInt(e.newValue, 10);
        if (!isNaN(remoteTime)) {
          lastActivityRef.current = remoteTime;
          hasTriggeredIdleRef.current = false;
        }
      }
    };
    window.addEventListener('storage', onStorage);

    return () => {
      events.forEach((evt) => {
        window.removeEventListener(evt, onActivity);
      });
      window.removeEventListener('storage', onStorage);
    };
  }, [isLoggedIn, handleUserActivity]);

  // Periodic timer check (only mutates React state inside the warning window or on timeout)
  useEffect(() => {
    if (!isLoggedIn) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastActivityRef.current;
      const timeLeft = Math.max(0, timeoutMs - elapsed);
      const inWarningWindow = timeLeft > 0 && timeLeft <= warningMs;

      if (inWarningWindow) {
        if (!isWarningRef.current) {
          isWarningRef.current = true;
          setIsWarning(true);
        }
        const nextSec = Math.ceil(timeLeft / 1000);
        if (nextSec !== lastReportedSecondsRef.current) {
          lastReportedSecondsRef.current = nextSec;
          setRemainingMs(timeLeft);
        }
      } else if (isWarningRef.current) {
        isWarningRef.current = false;
        setIsWarning(false);
      }

      // Check if idle timeout reached
      if (timeLeft <= 0 && !hasTriggeredIdleRef.current) {
        hasTriggeredIdleRef.current = true;
        isWarningRef.current = false;
        setIsWarning(false);
        setRemainingMs(0);
        onIdleRef.current();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isLoggedIn, timeoutMs, warningMs]);

  // Formatting helpers
  const remainingSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const formattedRemaining = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  return {
    remainingSeconds,
    isWarning,
    formattedRemaining,
    resetTimer,
    lastActive: new Date(lastActivityRef.current),
  };
}
