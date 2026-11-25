import React, { useEffect, useState, useCallback, useRef } from 'react';
import { AlertTriangle, RefreshCw, ShieldCheck, X } from 'lucide-react';

/**
 * Official Google AdMob GMA Next-Gen Test IDs.
 */
export const ADMOB_SAMPLE_APP_ID = 'ca-app-pub-3940256099942544~3347511713';
export const ADMOB_BANNER_TEST_AD_UNIT_ID = 'ca-app-pub-3940256099942544/9214589741';

export type AdLoadStatus = 'loading' | 'loaded' | 'error' | 'collapsed';

export interface LoadAdErrorInfo {
  code: number;
  domain: string;
  message: string;
}

export interface ComposableAdViewProps {
  adUnitId?: string;
  isOffline?: boolean;
  hasConnectivity?: boolean;
  darkMode?: boolean;
  onAdLoaded?: () => void;
  onAdFailedToLoad?: (error: LoadAdErrorInfo) => void;
}

/**
 * Composable AdView representation for the Android Home screen using the
 * Google Mobile Ads (GMA) Next-Gen anchored adaptive banner contract.
 * Handles offline states and LoadAdError failures gracefully without blocking UI.
 */
export const ComposableAdView: React.FC<ComposableAdViewProps> = ({
  adUnitId = ADMOB_BANNER_TEST_AD_UNIT_ID,
  isOffline = false,
  hasConnectivity = true,
  darkMode = true,
  onAdLoaded,
  onAdFailedToLoad,
}) => {
  const [status, setStatus] = useState<AdLoadStatus>('loading');
  const [loadError, setLoadError] = useState<LoadAdErrorInfo | null>(null);
  const timerRef = useRef<number | null>(null);
  const isMountedRef = useRef<boolean>(true);
  const statusRef = useRef<AdLoadStatus>('loading');
  const onAdLoadedRef = useRef(onAdLoaded);
  const onAdFailedToLoadRef = useRef(onAdFailedToLoad);

  statusRef.current = status;
  onAdLoadedRef.current = onAdLoaded;
  onAdFailedToLoadRef.current = onAdFailedToLoad;

  const clearPendingTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const requestBannerAd = useCallback(() => {
    clearPendingTimer();
    setStatus('loading');
    setLoadError(null);

    timerRef.current = window.setTimeout(() => {
      if (!isMountedRef.current) return;

      if (isOffline || !hasConnectivity) {
        const networkError: LoadAdErrorInfo = {
          code: 2,
          domain: 'com.google.android.gms.ads',
          message: 'Network error: Unable to reach AdMob server while offline.',
        };
        setLoadError(networkError);
        setStatus('error');
        onAdFailedToLoadRef.current?.(networkError);
        return;
      }

      setLoadError(null);
      setStatus('loaded');
      onAdLoadedRef.current?.();
    }, 320);
  }, [clearPendingTimer, hasConnectivity, isOffline]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      clearPendingTimer();
    };
  }, [clearPendingTimer]);

  useEffect(() => {
    if (statusRef.current === 'collapsed') return;
    requestBannerAd();
  }, [adUnitId, requestBannerAd]);

  const handleSimulateLoadError = () => {
    clearPendingTimer();
    const simulatedError: LoadAdErrorInfo = {
      code: 3,
      domain: 'com.google.android.gms.ads',
      message: 'No fill: Test banner request failed gracefully.',
    };
    setLoadError(simulatedError);
    setStatus('error');
    onAdFailedToLoadRef.current?.(simulatedError);
  };

  if (status === 'collapsed') {
    return null;
  }

  const surfaceClass = darkMode
    ? 'bg-[#0C0818] border-t border-slate-800/90 text-slate-200'
    : 'bg-[#F5F2EA] border-t border-amber-900/20 text-slate-900';

  const mutedTextClass = darkMode ? 'text-slate-400' : 'text-slate-600';

  return (
    <section
      role="region"
      aria-label="AdMob Composable AdView Test Banner"
      data-testid="composable-adview"
      data-ad-unit-id={adUnitId}
      data-ad-status={status}
      className={`w-full px-3 py-2 shrink-0 select-none transition-colors duration-200 ${surfaceClass}`}
    >
      {status === 'loading' && (
        <div className="flex items-center justify-between gap-2 min-h-[40px]">
          <div className="flex items-center gap-2 min-w-0">
            <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin shrink-0" />
            <div className="min-w-0">
              <div className="text-[11px] font-semibold truncate">
                Loading GMA Next-Gen Banner
              </div>
              <div className={`text-[10px] font-mono tabular-nums truncate ${mutedTextClass}`}>
                {adUnitId}
              </div>
            </div>
          </div>
          <span className={`text-[10px] font-mono shrink-0 ${mutedTextClass}`}>
            Adaptive
          </span>
        </div>
      )}

      {status === 'loaded' && (
        <div className="flex items-center justify-between gap-2 min-h-[40px]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/40 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] leading-tight">
                <span className="font-bold text-amber-400 shrink-0">Ad</span>
                <span aria-hidden="true" className={mutedTextClass}>·</span>
                <span className="font-semibold truncate">Google Mobile Ads Test Banner</span>
              </div>
              <div className={`text-[9.5px] font-mono tabular-nums truncate mt-0.5 ${mutedTextClass}`}>
                {adUnitId} · Anchored Adaptive
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handleSimulateLoadError}
              title="Simulate banner LoadAdError fallback"
              aria-label="Simulate ad load error"
              className={`px-2 py-1 rounded-lg text-[10px] font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                darkMode
                  ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
                  : 'bg-amber-900/10 hover:bg-amber-900/20 text-slate-700'
              }`}
            >
              Test Error
            </button>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center justify-between gap-2 min-h-[40px]"
        >
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <div className="min-w-0">
              <div className="text-[11px] font-semibold truncate">
                Banner ad unavailable (Code {loadError?.code ?? 2})
              </div>
              <div className={`text-[9.5px] truncate ${mutedTextClass}`}>
                {loadError?.message || 'App continues normally without ad.'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={requestBannerAd}
              className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-[10px] font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Retry</span>
            </button>
            <button
              type="button"
              onClick={() => setStatus('collapsed')}
              title="Collapse unavailable ad slot"
              aria-label="Dismiss ad banner"
              className={`p-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
                darkMode
                  ? 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                  : 'hover:bg-amber-900/10 text-slate-600'
              }`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
