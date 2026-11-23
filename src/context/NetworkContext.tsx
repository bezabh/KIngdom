import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export interface NetworkContextType {
  isOffline: boolean;
  isOnline: boolean;
  isOfflineDashboardMinimized: boolean;
  setIsOfflineDashboardMinimized: React.Dispatch<React.SetStateAction<boolean>>;
  forceOfflineMode: boolean;
  setForceOfflineMode: React.Dispatch<React.SetStateAction<boolean>>;
  retryConnection: () => Promise<boolean>;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOffline, setIsOffline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );
  const [isOfflineDashboardMinimized, setIsOfflineDashboardMinimized] = useState<boolean>(false);
  const [forceOfflineMode, setForceOfflineMode] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setIsOfflineDashboardMinimized(false);
    };
    const handleOffline = () => {
      setIsOffline(true);
      setIsOfflineDashboardMinimized(false);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const retryConnection = useCallback(async (): Promise<boolean> => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return false;
    }
    try {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 3000);
      const res = await fetch('/api/health', {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal,
      });
      window.clearTimeout(timeoutId);
      if (res.ok) {
        setIsOffline(false);
        setIsOfflineDashboardMinimized(false);
        return true;
      }
    } catch {
      // Network still unreachable
    }
    return false;
  }, []);

  const value = useMemo<NetworkContextType>(
    () => ({
      isOffline,
      isOnline: !isOffline,
      isOfflineDashboardMinimized,
      setIsOfflineDashboardMinimized,
      forceOfflineMode,
      setForceOfflineMode,
      retryConnection,
    }),
    [isOffline, isOfflineDashboardMinimized, forceOfflineMode, retryConnection]
  );

  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>;
};

export const useNetwork = (): NetworkContextType => {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
};
