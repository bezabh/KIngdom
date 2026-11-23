import React, { ComponentType, LazyExoticComponent, ReactNode, lazy } from 'react';
import { RefreshCw, WifiOff } from 'lucide-react';

/**
 * Wraps React.lazy with an automatic transient-failure retry when online.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  importer: () => Promise<{ default: T }>
): LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      return await importer();
    } catch (firstError) {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        throw firstError;
      }
      await new Promise((resolve) => setTimeout(resolve, 350));
      return importer();
    }
  });
}

interface LazyChunkErrorBoundaryProps {
  children: ReactNode;
  resetKey?: string | number | boolean;
  compact?: boolean;
  onReturnOffline?: () => void;
}

interface LazyChunkErrorBoundaryState {
  hasError: boolean;
}

export class LazyChunkErrorBoundary extends React.Component<
  LazyChunkErrorBoundaryProps,
  LazyChunkErrorBoundaryState
> {
  declare props: Readonly<LazyChunkErrorBoundaryProps>;
  declare setState: (
    state:
      | LazyChunkErrorBoundaryState
      | ((prevState: Readonly<LazyChunkErrorBoundaryState>) => LazyChunkErrorBoundaryState)
  ) => void;
  state: LazyChunkErrorBoundaryState = { hasError: false };

  constructor(props: LazyChunkErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): LazyChunkErrorBoundaryState {
    return { hasError: true };
  }

  componentDidUpdate(prevProps: LazyChunkErrorBoundaryProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  componentDidCatch(error: unknown) {
    console.warn('Lazy module load fallback activated:', error);
  }

  private handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (this.props.compact) {
      return null;
    }

    const offline = typeof navigator !== 'undefined' && !navigator.onLine;

    return (
      <div className="min-h-[45vh] flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full rounded-2xl bg-[#111116] border border-[#C5A059]/30 p-6 text-center shadow-2xl space-y-4">
          <div className="w-12 h-12 mx-auto rounded-xl bg-[#C5A059]/15 border border-[#C5A059]/30 flex items-center justify-center text-[#E1C47D]">
            {offline ? <WifiOff className="w-6 h-6" /> : <RefreshCw className="w-6 h-6" />}
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base font-semibold text-amber-100">
              {offline ? 'Unavailable While Offline' : 'Module Failed to Load'}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {offline
                ? 'This view requires an active connection to load for the first time. Reconnect or return to the Offline Mode Dashboard.'
                : 'A temporary connection interruption prevented loading this view. Retry to load it now.'}
            </p>
          </div>
          <div className="flex items-center justify-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={this.handleRetry}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#C5A059] to-[#E1C47D] text-[#0A0A0D] text-xs font-bold inline-flex items-center gap-1.5 hover:brightness-110 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
            {this.props.onReturnOffline && (
              <button
                type="button"
                onClick={() => {
                  this.setState({ hasError: false });
                  this.props.onReturnOffline?.();
                }}
                className="px-4 py-2 rounded-xl bg-white/5 border border-[#C5A059]/30 text-amber-200 text-xs font-semibold hover:bg-white/10 transition"
              >
                Offline Hub
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
}
