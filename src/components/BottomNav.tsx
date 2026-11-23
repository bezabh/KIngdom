import React, { useEffect, useRef, useState } from 'react';
import { AppTab } from '../types';
import { Crown, History, Home, LayoutGrid, Settings } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import {
  HapticFeedbackConstants,
  VIBRATE_PATTERN,
  triggerBottomNavLuxuryThud,
} from '../utils/haptics';

interface BottomNavProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  savedCount?: number;
  onOpenUserModal: () => void;
  onOpenDrawer?: () => void;
  onOpenHistory?: () => void;
}

type NavButtonKey = 'home' | 'tools' | 'pro' | 'history' | 'settings';

const BottomNavComponent: React.FC<BottomNavProps> = ({
  activeTab,
  setActiveTab,
  onOpenUserModal,
  onOpenHistory,
}) => {
  const { language } = useLanguage();
  const [pulsingButton, setPulsingButton] = useState<NavButtonKey | null>(null);
  const pulseTimerRef = useRef<number | null>(null);

  const isTigrinya = language === 'ti' || language === 'ti_tg';
  const isGerman = language === 'de';
  const isLightHome = activeTab === 'premiere';

  useEffect(() => {
    return () => {
      if (pulseTimerRef.current !== null) {
        window.clearTimeout(pulseTimerRef.current);
      }
    };
  }, []);

  const handleTabNavigation = (key: NavButtonKey, onNavigate: () => void) => {
    triggerBottomNavLuxuryThud({
      feedbackConstant: HapticFeedbackConstants.LONG_PRESS,
      pattern: VIBRATE_PATTERN.BOTTOM_NAV_THUD,
      isPrimaryAction: false,
    });

    setPulsingButton(key);
    if (pulseTimerRef.current !== null) {
      window.clearTimeout(pulseTimerRef.current);
    }
    pulseTimerRef.current = window.setTimeout(() => {
      setPulsingButton((prev) => (prev === key ? null : prev));
    }, 220);

    onNavigate();
  };

  const navItems: Array<{
    key: NavButtonKey;
    label: string;
    ariaLabel: string;
    icon: React.FC<{ className?: string }>;
    isActive: boolean;
    isProAccent?: boolean;
    onClick: () => void;
    id?: string;
  }> = [
    {
      key: 'home',
      label: isTigrinya ? 'ቤት' : isGerman ? 'Start' : 'Home',
      ariaLabel: isTigrinya ? 'ቤት — ቀንዲ ገጽ' : 'Home',
      icon: Home,
      isActive: activeTab === 'premiere',
      onClick: () => setActiveTab('premiere'),
    },
    {
      key: 'tools',
      id: 'axumite-tools-tab-mobile',
      label: isTigrinya ? 'መሳርሒ' : isGerman ? 'Tools' : 'Tools',
      ariaLabel: isTigrinya ? 'መሳርሒታት AI' : 'AI & Translation Tools',
      icon: LayoutGrid,
      isActive:
        activeTab === 'translator' ||
        activeTab === 'chat' ||
        activeTab === 'vision' ||
        activeTab === 'photo-to-video' ||
        activeTab === 'prompt-forge' ||
        activeTab === 'education',
      onClick: () => setActiveTab('translator'),
    },
    {
      key: 'pro',
      id: 'axumite-pro-tab-mobile',
      label: 'Pro',
      ariaLabel: isTigrinya ? 'ኣክሱማይት Pro ክፍሊት' : 'Upgrade to Pro',
      icon: Crown,
      isActive: activeTab === 'payment',
      isProAccent: true,
      onClick: () => setActiveTab('payment'),
    },
    {
      key: 'history',
      label: isTigrinya ? 'ታሪኽ' : isGerman ? 'Verlauf' : 'History',
      ariaLabel: isTigrinya ? 'ታሪኽን ዝተዓቀበን' : 'Activity History',
      icon: History,
      isActive: activeTab === 'saved',
      onClick: () => (onOpenHistory ? onOpenHistory() : setActiveTab('saved')),
    },
    {
      key: 'settings',
      label: isTigrinya ? 'ምድላው' : isGerman ? 'Profil' : 'Settings',
      ariaLabel: isTigrinya ? 'ምድላው ሕሳብ' : 'Account & Settings',
      icon: Settings,
      isActive: false,
      onClick: onOpenUserModal,
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40">
      <div
        className={
          isLightHome
            ? 'rounded-t-2xl sm:rounded-t-3xl bg-white/92 dark:bg-[#0B1228]/92 border-t border-indigo-100/90 dark:border-indigo-500/20 shadow-[0_-8px_30px_rgba(30,58,138,0.09)] dark:shadow-[0_-10px_30px_rgba(2,6,23,0.55)] backdrop-blur-xl pb-safe transition-colors duration-200'
            : 'rounded-t-2xl sm:rounded-t-3xl bg-gradient-to-b from-[#0E204B]/95 to-[#081330]/98 border-t border-[#C5A059]/40 shadow-[0_-6px_24px_rgba(8,19,48,0.24)] backdrop-blur-xl pb-safe'
        }
      >
        <nav
          aria-label={isTigrinya ? 'ታሕተዋይ ናይ ዳህሳስ መስመር' : 'Bottom navigation bar'}
          className="max-w-2xl mx-auto px-2 h-15 sm:h-16 grid grid-cols-5 items-center"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isPulsing = pulsingButton === item.key;
            return (
              <button
                key={item.key}
                id={item.id}
                type="button"
                onClick={() => handleTabNavigation(item.key, item.onClick)}
                aria-label={item.ariaLabel}
                aria-current={item.isActive ? 'page' : undefined}
                className={`relative group flex flex-col items-center justify-center min-h-[44px] py-1 px-1 rounded-xl transition-all duration-150 active:scale-[0.95] cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                  isLightHome
                    ? isPulsing
                      ? 'bg-blue-50 dark:bg-blue-500/15'
                      : 'hover:bg-slate-100/80 dark:hover:bg-slate-800/70'
                    : isPulsing
                    ? 'bg-[#D4AF37]/15'
                    : 'hover:bg-white/[0.05]'
                }`}
              >
                <Icon
                  className={`w-4.5 h-4.5 transition-all duration-150 ${
                    isLightHome
                      ? item.isActive
                        ? 'text-[#2563EB] dark:text-sky-400 stroke-[2.3] scale-105'
                        : item.isProAccent
                        ? 'text-amber-500 dark:text-amber-400 stroke-[2.1] fill-amber-400/80'
                        : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white stroke-[1.9]'
                      : item.isActive
                      ? 'text-[#F5D880] stroke-[2.2] scale-105'
                      : item.isProAccent
                      ? 'text-amber-400 stroke-[2]'
                      : 'text-[#D4AF37]/75 group-hover:text-[#F5D880] stroke-[1.75]'
                  }`}
                />
                <span
                  className={`mt-1 text-[9.5px] sm:text-[10px] leading-none tracking-tight whitespace-nowrap transition-colors font-ethiopic ${
                    isLightHome
                      ? item.isActive
                        ? 'text-[#2563EB] dark:text-sky-400 font-bold'
                        : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white font-semibold'
                      : item.isActive
                      ? 'text-[#F6DA86] font-bold'
                      : 'text-[#D4AF37]/75 group-hover:text-[#F5D880] font-medium'
                  }`}
                >
                  {item.label}
                </span>
                <span
                  aria-hidden="true"
                  className={`mt-1 h-[2.5px] rounded-full transition-all duration-200 ${
                    item.isActive
                      ? isLightHome
                        ? 'w-7 bg-[#2563EB] dark:bg-sky-400 opacity-100'
                        : 'w-7 bg-[#F5D880] opacity-100'
                      : 'w-0 opacity-0'
                  }`}
                />
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export const BottomNav = React.memo(BottomNavComponent);
