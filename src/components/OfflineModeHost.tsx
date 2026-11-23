import React, { Suspense, useEffect } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { LazyChunkErrorBoundary, lazyWithRetry } from './LazyChunkBoundary';
import { useNetwork } from '../context/NetworkContext';
import { useSavedInsights } from '../context/SavedInsightsContext';
import { useAppActions } from '../context/AppNavigationContext';

const loadOfflineModeDashboard = () =>
  import('./OfflineModeDashboard').then((m) => ({ default: m.OfflineModeDashboard }));

const OfflineModeDashboard = lazyWithRetry(loadOfflineModeDashboard);

interface OfflineModeHostProps {
  mode: 'bar' | 'full';
}

/**
 * Prefetches the 74 KB OfflineModeDashboard chunk quietly during browser idle time while online,
 * keeping initial bundle footprint lean while guaranteeing instant offline rendering if connectivity drops.
 */
export const OfflineDashboardPrefetcher: React.FC = () => {
  const { isOnline } = useNetwork();

  useEffect(() => {
    if (!isOnline || typeof window === 'undefined') return;

    const prefetch = () => {
      void loadOfflineModeDashboard().catch(() => {
        // Silent prefetch failure; retried on demand
      });
    };

    const win = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    if (typeof win.requestIdleCallback === 'function') {
      const idleId = win.requestIdleCallback(prefetch, { timeout: 4000 });
      return () => win.cancelIdleCallback?.(idleId);
    }

    const timer = window.setTimeout(prefetch, 2500);
    return () => window.clearTimeout(timer);
  }, [isOnline]);

  return null;
};

export const OfflineModeHost: React.FC<OfflineModeHostProps> = React.memo(({ mode }) => {
  const {
    isOffline,
    isOfflineDashboardMinimized,
    setIsOfflineDashboardMinimized,
    retryConnection,
  } = useNetwork();
  const { savedItems, saveInsight, deleteInsight } = useSavedInsights();
  const actions = useAppActions();

  if (!isOffline) return null;
  if (mode === 'bar' && !isOfflineDashboardMinimized) return null;
  if (mode === 'full' && isOfflineDashboardMinimized) return null;

  const emergencyFallback = (
    <div className="w-full px-4 py-3 bg-[#17130A] border-b border-[#C5A059]/40 flex items-center justify-between text-amber-200 text-xs">
      <div className="flex items-center space-x-2">
        <WifiOff className="w-4 h-4 text-[#C5A059]" />
        <span className="font-semibold">Offline Mode Active — Local Vault & Offline Packs Ready</span>
      </div>
      <div className="flex items-center space-x-2">
        <button
          type="button"
          onClick={() => void retryConnection()}
          className="px-3 py-1 rounded-lg bg-[#C5A059]/20 border border-[#C5A059]/50 hover:bg-[#C5A059]/30 font-bold flex items-center space-x-1 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry</span>
        </button>
        {mode === 'full' && (
          <button
            type="button"
            onClick={() => setIsOfflineDashboardMinimized(true)}
            className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 font-semibold cursor-pointer"
          >
            Browse Tabs
          </button>
        )}
      </div>
    </div>
  );

  const dashboard = (
    <LazyChunkErrorBoundary compact resetKey={`offline-${mode}`}>
      <Suspense fallback={emergencyFallback}>
        <OfflineModeDashboard
          isOffline={isOffline}
          savedItems={savedItems}
          onNavigateTab={actions.navigateTab}
          onSaveInsight={saveInsight}
          onDeleteInsight={deleteInsight}
          onRetryConnection={retryConnection}
          onOpenCacheSettings={() => actions.openModal('userProfile')}
          isMinimized={mode === 'bar'}
          onToggleMinimize={setIsOfflineDashboardMinimized}
        />
      </Suspense>
    </LazyChunkErrorBoundary>
  );

  if (mode === 'full') {
    return <div className="flex-1 w-full">{dashboard}</div>;
  }

  return dashboard;
});
