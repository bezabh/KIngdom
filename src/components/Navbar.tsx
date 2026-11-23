import React, { useEffect, useRef, useState } from 'react';
import { AppTab, UserProfile } from '../types';
import {
  Bell,
  Check,
  ChevronDown,
  Crown,
  Flame,
  Gift,
  Globe,
  LogIn,
  Menu,
  Mic,
  Moon,
  Radio,
  Sun,
  User,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { getDailyWisdomStats } from '../services/dailyWisdomState';

interface NavbarProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  savedCount: number;
  logoSrc: string;
  homeTheme?: 'light' | 'dark';
  onToggleHomeTheme?: () => void;
  onOpenPwaModal?: () => void;
  user: UserProfile;
  onOpenUserModal: () => void;
  isOffline: boolean;
  onOpenOnboardingModal?: () => void;
  onOpenAuthModal?: (mode: 'login' | 'signup') => void;
  onOpenWelcomeOverlay?: () => void;
  onOpenSecurityModal?: () => void;
  onOpenDrawer?: () => void;
  unreadNotifCount?: number;
  onOpenNotifications?: () => void;
  onOpenVoiceOverlay?: () => void;
  isAlwaysListening?: boolean;
  onToggleAlwaysListening?: () => void;
  onOpenDailyWisdom?: () => void;
}

const GradientMarkA: React.FC<{ className?: string }> = ({ className = 'w-9 h-9' }) => (
  <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
    <defs>
      <linearGradient id="axmA1" x1="8" y1="8" x2="54" y2="56" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#06B6D4" />
        <stop offset="35%" stopColor="#3B82F6" />
        <stop offset="68%" stopColor="#EC4899" />
        <stop offset="100%" stopColor="#F97316" />
      </linearGradient>
      <linearGradient id="axmA2" x1="30" y1="10" x2="56" y2="56" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#A855F7" />
        <stop offset="60%" stopColor="#EC4899" />
        <stop offset="100%" stopColor="#F59E0B" />
      </linearGradient>
    </defs>
    <path
      d="M27.4 8.5C29.4 4.8 34.6 4.8 36.6 8.5L56.2 46.8C58.1 50.5 55.4 55 51.2 55H43.5C41.4 55 39.5 53.8 38.6 51.9L32 37.8L25.4 51.9C24.5 53.8 22.6 55 20.5 55H12.8C8.6 55 5.9 50.5 7.8 46.8L27.4 8.5Z"
      fill="url(#axmA1)"
    />
    <path
      d="M32 10.5L51.5 49.5C53 52.3 50.9 55 47.7 55H42.5L27.5 23.5L32 10.5Z"
      fill="url(#axmA2)"
      opacity="0.88"
    />
    <path
      d="M22.5 39.5H41.5L38.2 46.5H25.8L22.5 39.5Z"
      fill="#FFFFFF"
      fillOpacity="0.92"
    />
  </svg>
);

const NavbarComponent: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  logoSrc,
  homeTheme = 'light',
  onToggleHomeTheme,
  user,
  onOpenUserModal,
  isOffline,
  onOpenAuthModal,
  onOpenDrawer,
  unreadNotifCount = 0,
  onOpenNotifications,
  onOpenVoiceOverlay,
  isAlwaysListening = false,
  onToggleAlwaysListening,
  onOpenDailyWisdom,
}) => {
  const { language, setLanguage, t } = useLanguage();
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const langMenuContainerRef = useRef<HTMLDivElement | null>(null);
  const langMenuTriggerRef = useRef<HTMLButtonElement | null>(null);
  const wisdomStats = getDailyWisdomStats();

  const isTigrinya = language === 'ti' || language === 'ti_tg';
  const isGerman = language === 'de';
  const isLightHome = activeTab === 'premiere';

  const isSignedInAccount =
    Boolean(user.isLoggedIn) &&
    Boolean(user.email) &&
    user.email.trim().toLowerCase() !== 'guest@axumite.ai';
  const isSuperAdmin =
    isSignedInAccount &&
    (user.email?.toLowerCase() === 'beckylove2004@gmail.com' || user.role === 'Creator');
  const isManagementActive =
    activeTab === 'management' ||
    activeTab === 'user-management' ||
    activeTab === 'payment-management' ||
    activeTab === 'customer-management';

  useEffect(() => {
    if (!isLangMenuOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsLangMenuOpen(false);
        langMenuTriggerRef.current?.focus();
      }
    };

    const handlePointerDown = (event: MouseEvent) => {
      if (
        langMenuContainerRef.current &&
        !langMenuContainerRef.current.contains(event.target as Node)
      ) {
        setIsLangMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [isLangMenuOpen]);

  const activeLanguageLabel = isTigrinya
    ? 'ትግርኛ'
    : isGerman
    ? 'Deutsch'
    : 'English';

  const activeLanguageName = isTigrinya
    ? 'ትግርኛ (Tigrinya)'
    : isGerman
    ? 'Deutsch (German)'
    : 'English';

  const userInitials = (user.name || user.email || 'A')
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const shortLanguageLabel = isTigrinya ? 'ትግ' : isGerman ? 'DE' : 'EN';

  if (isLightHome) {
    return (
      <header className="sticky top-0 z-40 bg-white/85 dark:bg-[#0B1228]/85 backdrop-blur-xl border-b border-indigo-100/80 dark:border-indigo-500/20 shadow-[0_2px_16px_rgba(30,58,138,0.05)] dark:shadow-[0_4px_20px_rgba(2,6,23,0.45)] transition-colors duration-200">
        <div className="max-w-6xl mx-auto px-2.5 sm:px-6">
          <div className="flex items-center justify-between gap-1.5 sm:gap-3 h-14 sm:h-16">
            {/* Left: Hamburger + Gradient "A" Logo + Brand Name + Short Tagline */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
              {onOpenDrawer && (
                <button
                  type="button"
                  onClick={onOpenDrawer}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl hover:bg-slate-100/90 dark:hover:bg-slate-800/80 text-slate-800 dark:text-slate-100 transition-colors cursor-pointer flex items-center justify-center shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  title={isTigrinya ? 'ናይ መሳርሒታት ዝርዝር' : 'Open all tools menu'}
                  aria-label={isTigrinya ? 'ናይ መሳርሒታት ዝርዝር ክፈት' : 'Open all tools menu'}
                >
                  <Menu className="w-5 h-5 sm:w-5.5 sm:h-5.5 stroke-[2.2]" aria-hidden="true" />
                </button>
              )}

              <button
                type="button"
                id="axumite-logo-brand"
                onClick={() => setActiveTab('premiere')}
                aria-label="AXUMITE AI Home"
                aria-current="page"
                className="flex items-center gap-2 text-left cursor-pointer group min-w-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <GradientMarkA className="w-7.5 h-7.5 sm:w-8.5 sm:h-8.5 shrink-0 group-hover:scale-105 transition-transform" />
                <div className="min-w-0 leading-tight">
                  <div className="flex items-baseline gap-1 whitespace-nowrap">
                    <span className="font-black text-[13px] sm:text-[15px] tracking-tight text-slate-900 dark:text-white">
                      AXUMITE
                    </span>
                    <span className="font-black text-[13px] sm:text-[15px] tracking-tight text-[#2563EB] dark:text-cyan-400">
                      AI
                    </span>
                  </div>
                  <p className="hidden min-[370px]:block text-[8.5px] sm:text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate font-ethiopic">
                    {isTigrinya
                      ? 'ብልሒ · ፍጥነት · ብሓባር'
                      : isGerman
                      ? 'Smarter. Schneller. Gemeinsam.'
                      : 'Smarter. Faster. Together.'}
                  </p>
                </div>
              </button>
            </div>

            {/* Right: Admin (if Admin) + Light/Dark Switch + Notification Bell + Language Selector + Profile Avatar */}
            <nav
              aria-label="Primary header controls"
              className="flex items-center gap-1 sm:gap-2 shrink-0"
            >
              {isSuperAdmin && (
                <button
                  type="button"
                  onClick={() => setActiveTab('management')}
                  className="hidden md:inline-flex items-center gap-1 h-8 px-2.5 rounded-full bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-400/30 hover:border-amber-300 text-amber-800 dark:text-amber-300 text-[10px] sm:text-[11px] font-bold transition-colors cursor-pointer whitespace-nowrap"
                  aria-label="Open Super Admin Hub"
                >
                  <Crown className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                  <span>Admin</span>
                </button>
              )}

              {onToggleHomeTheme && (
                <button
                  type="button"
                  id="axumite-theme-toggle-btn"
                  onClick={onToggleHomeTheme}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/95 dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700 shadow-xs text-slate-700 dark:text-amber-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-center cursor-pointer transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  title={
                    homeTheme === 'dark'
                      ? isTigrinya
                        ? 'ናብ ብርሃን ቅዲ ቀይር'
                        : 'Switch to Light Mode'
                      : isTigrinya
                      ? 'ናብ ጸሊም ቅዲ ቀይር'
                      : 'Switch to Dark Mode'
                  }
                  aria-label={homeTheme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                  aria-pressed={homeTheme === 'dark'}
                >
                  {homeTheme === 'dark' ? (
                    <Sun className="w-4 h-4 text-amber-300" aria-hidden="true" />
                  ) : (
                    <Moon className="w-4 h-4 text-indigo-600" aria-hidden="true" />
                  )}
                </button>
              )}

              {onOpenNotifications && (
                <button
                  type="button"
                  id="axumite-notifications-bell-btn"
                  onClick={onOpenNotifications}
                  className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/95 dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700 shadow-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-center cursor-pointer transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  title={isTigrinya ? 'መልእኽትታት' : 'Notifications'}
                  aria-label={
                    unreadNotifCount > 0
                      ? `Open notifications (${unreadNotifCount} unread)`
                      : 'Open notifications'
                  }
                >
                  <Bell className="w-4 h-4 text-blue-600 dark:text-cyan-400" aria-hidden="true" />
                  {unreadNotifCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-[9px] font-bold text-white flex items-center justify-center tabular-nums shadow-xs">
                      {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                    </span>
                  )}
                </button>
              )}

              {/* Compact Language Dropdown */}
              <div ref={langMenuContainerRef} className="relative z-50 shrink-0">
                <button
                  ref={langMenuTriggerRef}
                  type="button"
                  onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                  className="flex items-center gap-1 sm:gap-1.5 h-8 sm:h-8.5 px-2 sm:px-2.5 bg-white/95 dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700 hover:border-blue-300 dark:hover:border-cyan-400/50 shadow-[0_2px_10px_rgba(15,23,42,0.06)] text-slate-800 dark:text-slate-100 font-semibold text-[10px] sm:text-[11px] whitespace-nowrap transition-all cursor-pointer rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  title={t.selectLanguage}
                  aria-label={`Select interface language (${activeLanguageName})`}
                  aria-expanded={isLangMenuOpen}
                  aria-haspopup="menu"
                  aria-controls="axumite-language-menu"
                >
                  <Globe className="w-3 h-3 text-slate-700 dark:text-cyan-400 shrink-0" aria-hidden="true" />
                  <span className="sm:hidden font-ethiopic">{shortLanguageLabel}</span>
                  <span className="hidden sm:inline font-ethiopic">{activeLanguageLabel}</span>
                  <ChevronDown className="w-3 h-3 text-slate-500 dark:text-slate-400 shrink-0" aria-hidden="true" />
                </button>

                {isLangMenuOpen && (
                  <div
                    id="axumite-language-menu"
                    role="menu"
                    aria-label={t.selectLanguage || 'Select language'}
                    className="absolute right-0 mt-2 w-52 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl p-2 z-50 space-y-1"
                  >
                    <div className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 px-2.5 py-1 border-b border-slate-100 dark:border-slate-800 font-bold">
                      {t.selectLanguage}
                    </div>
                    {[
                      { code: 'en' as const, label: 'English', sub: 'International English', flag: '🇬🇧' },
                      { code: 'ti' as const, label: 'ትግርኛ', sub: 'Tigrinya', flag: '📜' },
                      { code: 'de' as const, label: 'Deutsch', sub: 'German', flag: '🇩🇪' },
                    ].map((opt) => {
                      const active =
                        opt.code === 'ti' ? isTigrinya : opt.code === 'de' ? isGerman : language === 'en';
                      return (
                        <button
                          key={opt.code}
                          type="button"
                          role="menuitemradio"
                          aria-checked={active}
                          onClick={() => {
                            setLanguage(opt.code);
                            setIsLangMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
                            active
                              ? 'bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-sky-300'
                              : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span aria-hidden="true">{opt.flag}</span>
                            <span className="text-left">
                              <span className="block font-ethiopic">{opt.label}</span>
                              <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-normal">
                                {opt.sub}
                              </span>
                            </span>
                          </span>
                          {active && <Check className="w-4 h-4 text-blue-600 dark:text-sky-400" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Circular Avatar with Online/Offline Status OR Compact Sign-In CTA */}
              {isSignedInAccount ? (
                <button
                  type="button"
                  id="axumite-nav-account-btn"
                  onClick={onOpenUserModal}
                  className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full p-0.5 bg-gradient-to-tr from-blue-500 via-indigo-500 to-purple-500 shadow-sm cursor-pointer shrink-0 hover:scale-105 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  title={`${user.email} · ${isOffline ? 'Offline' : 'Online'}`}
                  aria-label={`Account profile (${user.name || user.email}, ${isOffline ? 'offline' : 'online'})`}
                >
                  <div className="w-full h-full rounded-full overflow-hidden bg-slate-900 flex items-center justify-center text-white text-xs font-bold">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.name || 'User'}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span>{userInitials}</span>
                    )}
                  </div>
                  <span
                    aria-hidden="true"
                    className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-[#0B1228] ${
                      isOffline ? 'bg-amber-400' : 'bg-emerald-500'
                    }`}
                  />
                </button>
              ) : (
                onOpenAuthModal && (
                  <button
                    type="button"
                    id="axumite-nav-signin-btn"
                    onClick={() => onOpenAuthModal('login')}
                    className="flex items-center gap-1 h-8 sm:h-8.5 px-2.5 sm:px-3 rounded-full bg-gradient-to-r from-[#2563EB] to-[#4F46E5] hover:brightness-105 text-white text-[10px] sm:text-[11px] font-bold whitespace-nowrap shadow-sm cursor-pointer active:scale-95 transition-all shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    aria-label={isTigrinya ? 'ናብ ኣክሱማይት AI እቶ' : 'Sign in to Axumite AI'}
                  >
                    <LogIn className="w-3 h-3 shrink-0" aria-hidden="true" />
                    <span>{isTigrinya ? 'እቶ' : isGerman ? 'Login' : 'Sign In'}</span>
                  </button>
                )
              )}
            </nav>
          </div>
        </div>
      </header>
    );
  }

  // Dark Mode Header for Studio Sub-Tabs
  return (
    <header className="sticky top-0 z-40 bg-[#050505]/95 backdrop-blur-md border-b border-[#8E6D28]/25">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3 h-14 sm:h-16">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {onOpenDrawer && (
              <button
                type="button"
                onClick={onOpenDrawer}
                className="w-10 h-10 rounded-xl bg-[#121422] border border-[#8E6D28]/40 hover:border-[#C5A059] text-[#F3E5AB] hover:text-white transition-all shadow-sm active:scale-95 cursor-pointer flex items-center justify-center shrink-0 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E1C47D]"
                title="All Tools & Menu"
                aria-label="Open all tools menu"
              >
                <Menu className="w-4.5 h-4.5 text-amber-400" aria-hidden="true" />
              </button>
            )}

            <button
              type="button"
              id="axumite-logo-brand"
              className="flex items-center gap-2.5 cursor-pointer group text-left rounded-xl min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E1C47D]"
              onClick={() => setActiveTab('premiere')}
              aria-label="Axumite AI — Go to home"
            >
              <div className="relative w-9 h-9 sm:w-10 sm:h-10 border border-[#C5A059]/60 p-0.5 rounded-xl flex items-center justify-center bg-[#0F0E13] shadow-sm shrink-0">
                <img
                  src={logoSrc}
                  alt=""
                  aria-hidden="true"
                  className="w-full h-full rounded-lg object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="flex items-baseline gap-1 whitespace-nowrap shrink-0">
                <span className="font-black text-sm sm:text-base tracking-tight text-white">
                  AXUMITE
                </span>
                <span className="font-serif font-black text-xs sm:text-sm tracking-wider text-amber-400">
                  AI
                </span>
              </div>
            </button>
          </div>

          <nav aria-label="Primary header actions" className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {onOpenVoiceOverlay && (
              <div className="hidden md:flex items-center rounded-lg border border-amber-500/50 bg-[#120E1C] overflow-hidden shadow-sm">
                <button
                  type="button"
                  id="axumite-voice-command-nav-btn"
                  onClick={onOpenVoiceOverlay}
                  className="h-9 px-2.5 hover:bg-amber-500/20 text-amber-300 hover:text-white transition-all cursor-pointer flex items-center justify-center"
                  aria-label="Open voice command overlay"
                >
                  <Mic className={`w-4 h-4 ${isAlwaysListening ? 'text-emerald-400' : 'text-amber-400'}`} />
                </button>

                {onToggleAlwaysListening && (
                  <button
                    type="button"
                    id="axumite-always-listening-toggle-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleAlwaysListening();
                    }}
                    className={`h-9 px-2 border-l border-amber-500/35 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer ${
                      isAlwaysListening ? 'bg-emerald-950/80 text-emerald-300' : 'text-amber-400/85'
                    }`}
                    aria-pressed={isAlwaysListening}
                  >
                    <Radio className="w-3 h-3" />
                    <span>{isAlwaysListening ? 'ON' : 'AUTO'}</span>
                  </button>
                )}
              </div>
            )}

            {onOpenDailyWisdom && (
              <button
                type="button"
                id="axumite-nav-daily-wisdom-btn"
                onClick={onOpenDailyWisdom}
                className="hidden lg:flex items-center gap-1.5 h-9 px-2.5 rounded-lg border border-amber-400/45 bg-[#1B1428] text-amber-200 cursor-pointer"
                aria-label="Open daily wisdom"
              >
                <Flame className="w-3.5 h-3.5 text-orange-400" />
                <span className="text-[11px] font-bold font-mono tabular-nums">
                  {wisdomStats.streakDays}D
                </span>
              </button>
            )}

            <button
              type="button"
              id="axumite-nav-rewards-btn"
              onClick={() => setActiveTab('rewards')}
              className={`hidden xl:flex items-center gap-1.5 h-9 px-2.5 rounded-lg border text-[11px] font-bold cursor-pointer ${
                activeTab === 'rewards'
                  ? 'bg-gradient-to-r from-[#8E6D28] via-[#E1C47D] to-[#C5A059] text-black border-[#F3E5AB]'
                  : 'bg-[#120E1C] border-amber-500/40 text-amber-300'
              }`}
              aria-label="Rewards"
            >
              <Gift className="w-3.5 h-3.5" />
              <span>Rewards</span>
            </button>

            {onOpenNotifications && (
              <button
                type="button"
                id="axumite-notifications-bell-btn"
                onClick={onOpenNotifications}
                className="relative w-9 h-9 rounded-xl border border-[#C5A059]/45 bg-[#120E1C] text-[#F3E5AB] flex items-center justify-center cursor-pointer"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4 text-amber-400" />
                {unreadNotifCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-[9px] font-black text-white flex items-center justify-center">
                    {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                  </span>
                )}
              </button>
            )}

            <div ref={langMenuContainerRef} className="relative z-50 shrink-0">
              <button
                ref={langMenuTriggerRef}
                type="button"
                onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                className="flex items-center gap-1.5 h-9 px-2.5 bg-[#120E1C] border border-[#C5A059]/55 text-[#F3E5AB] font-bold text-[11px] rounded-xl cursor-pointer"
                aria-expanded={isLangMenuOpen}
                aria-haspopup="menu"
              >
                <Globe className="w-3.5 h-3.5 text-amber-400" />
                <span>{isTigrinya ? 'ትግርኛ' : isGerman ? 'DE' : 'EN'}</span>
              </button>

              {isLangMenuOpen && (
                <div
                  id="axumite-language-menu"
                  role="menu"
                  className="absolute right-0 mt-2 w-48 bg-[#0B0912] border-2 border-[#8E6D28] rounded-xl shadow-2xl p-2 z-50 space-y-1"
                >
                  {[
                    { code: 'ti' as const, label: 'ትግርኛ' },
                    { code: 'en' as const, label: 'English' },
                    { code: 'de' as const, label: 'Deutsch' },
                  ].map((opt) => (
                    <button
                      key={opt.code}
                      type="button"
                      onClick={() => {
                        setLanguage(opt.code);
                        setIsLangMenuOpen(false);
                      }}
                      className="w-full text-left px-2.5 py-2 text-xs font-bold rounded-lg text-gray-200 hover:bg-[#181326] cursor-pointer"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {isSuperAdmin && (
              <button
                type="button"
                onClick={() => setActiveTab('management')}
                className={`hidden md:flex items-center gap-1.5 h-9 px-2.5 rounded-xl border text-[11px] font-bold cursor-pointer ${
                  isManagementActive
                    ? 'bg-amber-500 text-black border-[#F3E5AB]'
                    : 'bg-[#1D1432] border-amber-400/60 text-amber-300'
                }`}
              >
                <Crown className="w-3.5 h-3.5" />
                <span>Admin</span>
              </button>
            )}

            {isSignedInAccount ? (
              <button
                type="button"
                id="axumite-nav-account-btn"
                onClick={onOpenUserModal}
                className="flex items-center gap-1.5 h-9 px-2.5 rounded-xl border border-[#C5A059]/60 bg-[#120E1C] text-[#F3E5AB] text-[11px] font-bold cursor-pointer"
              >
                <User className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline max-w-[90px] truncate">
                  {user.name?.split(' ')[0] || user.email.split('@')[0]}
                </span>
              </button>
            ) : (
              onOpenAuthModal && (
                <button
                  type="button"
                  id="axumite-nav-signin-btn"
                  onClick={() => onOpenAuthModal('login')}
                  className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-[#F3E5AB] bg-gradient-to-r from-[#8E6D28] via-[#E1C47D] to-[#C5A059] text-black text-[11px] font-black cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>{isTigrinya ? 'እቶ' : 'Sign In'}</span>
                </button>
              )
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};

export const Navbar = React.memo(NavbarComponent);
