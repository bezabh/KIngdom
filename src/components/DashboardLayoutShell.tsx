import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface DashboardTabItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  count?: number;
}

export interface DashboardMetricItem {
  id: string;
  label: string;
  value: string | number;
  sublabel?: string;
  accent?: 'gold' | 'emerald' | 'sky' | 'neutral' | 'amber' | 'rose';
  onClick?: () => void;
}

interface DashboardLayoutShellProps {
  id?: string;
  sectionLabel?: string;
  title: string;
  subtitleTi?: string;
  description?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  bannerNotice?: React.ReactNode;
  metrics?: DashboardMetricItem[];
  tabs?: DashboardTabItem[];
  activeTabId?: string;
  onSelectTab?: (tabId: string) => void;
  children: React.ReactNode;
}

const METRIC_ACCENT_STYLES: Record<NonNullable<DashboardMetricItem['accent']>, string> = {
  gold: 'text-[#F3E5AB]',
  emerald: 'text-emerald-400',
  sky: 'text-sky-400',
  amber: 'text-amber-400',
  rose: 'text-rose-400',
  neutral: 'text-slate-100',
};

export const DashboardLayoutShell: React.FC<DashboardLayoutShellProps> = ({
  id,
  sectionLabel,
  title,
  subtitleTi,
  description,
  icon: Icon,
  actions,
  bannerNotice,
  metrics,
  tabs,
  activeTabId,
  onSelectTab,
  children,
}) => {
  return (
    <section
      id={id}
      className="max-w-7xl mx-auto rounded-3xl bg-[#0B0D14] border border-[#8E6D28]/25 shadow-[0_18px_50px_rgba(0,0,0,0.55)] overflow-hidden"
    >
      {/* Header Bar */}
      <header className="px-5 sm:px-7 py-5 sm:py-6 border-b border-[#8E6D28]/20 bg-gradient-to-b from-[#111420] to-[#0B0D14]">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start gap-3.5 min-w-0">
            {Icon && (
              <div className="w-11 h-11 rounded-2xl bg-[#C5A059]/12 border border-[#C5A059]/35 flex items-center justify-center text-[#E1C47D] shrink-0">
                <Icon className="w-5 h-5" />
              </div>
            )}
            <div className="min-w-0 space-y-1">
              {(sectionLabel || subtitleTi) && (
                <div className="flex items-center gap-2 text-xs text-[#C5A059] font-medium">
                  {sectionLabel && <span>{sectionLabel}</span>}
                  {sectionLabel && subtitleTi && <span aria-hidden="true">·</span>}
                  {subtitleTi && <span className="font-ethiopic text-slate-400">{subtitleTi}</span>}
                </div>
              )}
              <h1 className="text-lg sm:text-2xl font-extrabold tracking-tight text-slate-100 text-balance">
                {title}
              </h1>
              {description && (
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-3xl">
                  {description}
                </p>
              )}
            </div>
          </div>

          {actions && (
            <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>
          )}
        </div>

        {/* Optional Summary Metrics Row */}
        {metrics && metrics.length > 0 && (
          <div className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-3">
            {metrics.map((m) => {
              const accentClass = METRIC_ACCENT_STYLES[m.accent || 'neutral'];
              const interactive = typeof m.onClick === 'function';
              const Tag = interactive ? 'button' : 'div';
              return (
                <Tag
                  key={m.id}
                  {...(interactive ? { type: 'button' as const, onClick: m.onClick } : {})}
                  className={`text-left p-3.5 rounded-2xl bg-[#10131D] border border-slate-800/90 ${
                    interactive
                      ? 'hover:border-[#C5A059]/45 transition-colors cursor-pointer'
                      : ''
                  }`}
                >
                  <p className="text-[11px] text-slate-400 font-medium truncate">{m.label}</p>
                  <p className={`mt-1 text-lg sm:text-xl font-bold tabular-nums ${accentClass}`}>
                    {m.value}
                  </p>
                  {m.sublabel && (
                    <p className="mt-0.5 text-[11px] text-slate-500 truncate">{m.sublabel}</p>
                  )}
                </Tag>
              );
            })}
          </div>
        )}
      </header>

      {/* Optional Banner Notice */}
      {bannerNotice && <div className="border-b border-[#8E6D28]/20">{bannerNotice}</div>}

      {/* Section Navigation Tabs */}
      {tabs && tabs.length > 0 && onSelectTab && (
        <nav
          aria-label={`${title} sections`}
          className="px-5 sm:px-7 py-2.5 border-b border-slate-800/80 bg-[#090B11] flex items-center gap-1.5 overflow-x-auto"
        >
          {tabs.map((tab) => {
            const TabIcon = tab.icon;
            const isActive = tab.id === activeTabId;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectTab(tab.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-[#C5A059] text-[#09090B] shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-[#141824]'
                }`}
              >
                {TabIcon && <TabIcon className="w-3.5 h-3.5 shrink-0" />}
                <span>{tab.label}</span>
                {typeof tab.count === 'number' && (
                  <span
                    className={`font-mono tabular-nums text-[11px] ${
                      isActive ? 'text-[#09090B]/75' : 'text-slate-400'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      )}

      {/* Main Content */}
      <div className="p-5 sm:p-7">{children}</div>
    </section>
  );
};
