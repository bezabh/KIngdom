import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell,
  GraduationCap,
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  X,
  Sparkles,
  Volume2,
  VolumeX,
  ExternalLink,
  ArrowRight,
  Sliders,
  Check,
  Copy,
  AlertTriangle,
  Globe,
  Radio,
  Layers,
  Send,
  Inbox,
  CreditCard,
  AlertOctagon,
  ShieldAlert,
  FileText,
  Download,
  Smartphone,
  TrendingUp,
  DollarSign,
  BookOpen,
  Tag,
  Code2,
  CheckCheck,
  BellOff,
  Zap,
  Info
} from 'lucide-react';
import { AppNotification, NotificationPreferences, UserProfile, WeeklySummaryData } from '../types';
import { useLanguage } from '../context/LanguageContext';
import {
  getBrowserPushPermissionStatus,
  requestBrowserPushPermission,
  triggerBrowserPushNotification,
  playGoldenNotificationChime,
  DEFAULT_NOTIFICATION_PREFERENCES,
} from '../services/notificationService';
import {
  ONESIGNAL_CATEGORY_SUBSCRIPTIONS,
  OneSignalCategoryConfig,
  OneSignalCategoryId,
  syncOneSignalCategoryTags,
  createCategoryTestNotification,
  isCategorySubscribed,
  generateOneSignalTagsPayload,
  ONESIGNAL_APP_ID
} from '../services/oneSignalTagService';
import { generateWeeklySummaryPdfReport } from '../utils/weeklySummaryPdfReport';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onUpdateNotifications: (notifs: AppNotification[]) => void;
  preferences: NotificationPreferences;
  onUpdatePreferences: (prefs: NotificationPreferences) => void;
  onOpenScholarshipOpportunity?: (scholarshipId?: string) => void;
  onOpenPaymentManagement?: () => void;
  onOpenWeeklySummary?: (summaryData?: WeeklySummaryData) => void;
  onNavigateTab?: (tab: string) => void;
  onOpenSystemStatus?: () => void;
  onTriggerTestNotification?: () => void;
  onTriggerWeeklySummary?: () => void;
  user?: Partial<UserProfile>;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  notifications,
  onUpdateNotifications,
  preferences,
  onUpdatePreferences,
  onOpenScholarshipOpportunity,
  onOpenPaymentManagement,
  onOpenWeeklySummary,
  onNavigateTab,
  onOpenSystemStatus,
  onTriggerTestNotification,
  onTriggerWeeklySummary,
  user,
}) => {
  const { language } = useLanguage();
  const [activeFilter, setActiveFilter] = useState<'all' | 'weekly_summary' | 'payment' | 'scholarship' | 'system_update' | 'unread' | 'settings'>('all');
  const [browserPermission, setBrowserPermission] = useState<'default' | 'granted' | 'denied' | 'unsupported'>('default');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedTags, setCopiedTags] = useState(false);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [downloadingPdfId, setDownloadingPdfId] = useState<string | null>(null);
  const [isSyncingTags, setIsSyncingTags] = useState(false);
  const [tagSyncSuccess, setTagSyncSuccess] = useState(false);
  const [showTagsInspector, setShowTagsInspector] = useState(false);
  const [testSentCategory, setTestSentCategory] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setBrowserPermission(getBrowserPushPermissionStatus());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;
  const paymentAlertsCount = notifications.filter((n) => n.category === 'payment_failed' || n.category === 'payment').length;
  const weeklySummaryCount = notifications.filter((n) => n.category === 'weekly_summary').length;

  const filteredNotifications = notifications.filter((item) => {
    if (activeFilter === 'unread') return !item.read;
    if (activeFilter === 'weekly_summary') return item.category === 'weekly_summary';
    if (activeFilter === 'payment') return item.category === 'payment_failed' || item.category === 'payment';
    if (activeFilter === 'scholarship') return item.category === 'scholarship';
    if (activeFilter === 'system_update') return item.category === 'system_update' || item.category === 'security' || item.category === 'feature';
    return true;
  });

  const handleToggleRead = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const updated = notifications.map((n) =>
      n.id === id ? { ...n, read: !n.read } : n
    );
    onUpdateNotifications(updated);
  };

  const handleMarkAllRead = () => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    onUpdateNotifications(updated);
  };

  const handleDeleteNotification = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const updated = notifications.filter((n) => n.id !== id);
    onUpdateNotifications(updated);
  };

  const handleClearAll = () => {
    onUpdateNotifications([]);
  };

  const handleQuickDownloadPdf = (item: AppNotification, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!item.weeklySummary) return;

    setDownloadingPdfId(item.id);
    playGoldenNotificationChime();
    setTimeout(() => {
      try {
        generateWeeklySummaryPdfReport(item.weeklySummary!, user);
      } catch (err) {
        console.error('Error generating PDF:', err);
      } finally {
        setDownloadingPdfId(null);
      }
    }, 300);
  };

  const handleCopy = (item: AppNotification, e: React.MouseEvent) => {
    e.stopPropagation();
    const text = `${item.titleTi}\n${item.titleEn}\n\n${item.bodyTi}\n${item.bodyEn}`;
    navigator.clipboard.writeText(text);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleEnableWebPush = async () => {
    setIsRequestingPermission(true);
    const perm = await requestBrowserPushPermission();
    setBrowserPermission(perm);
    setIsRequestingPermission(false);

    if (perm === 'granted') {
      const updatedPrefs = { ...preferences, enableWebPush: true };
      onUpdatePreferences(updatedPrefs);
      syncOneSignalCategoryTags(updatedPrefs, user);
      triggerBrowserPushNotification({
        id: `perm_${Date.now()}`,
        titleTi: '🔔 ናይ Axumite AI ምልክታታት በርሁ ኣለዉ',
        titleEn: '🔔 Axumite AI Notifications Active',
        bodyTi: 'ናይ ስኮላርሺፕ ዕድላትን ናይ ሰሙን ጸብጻባትን ብOneSignal Category Tags ተኸታቲሎም ክበጽሓኩም እዮም።',
        bodyEn: 'You are now subscribed to verified OneSignal push category segments for scholarships, weekly summaries, and system intelligence.',
        category: 'system_update',
        timestamp: 'ሕጂ • Just now',
        isoDate: new Date().toISOString(),
        read: false,
        urgency: 'info'
      });
      playGoldenNotificationChime();
    }
  };

  // Toggle individual category tag
  const handleToggleCategoryTag = (categoryConfig: OneSignalCategoryConfig, enabled: boolean) => {
    const updatedPrefs: NotificationPreferences = {
      ...preferences,
      [categoryConfig.prefKey]: enabled,
      oneSignalTags: {
        ...(preferences.oneSignalTags || {}),
        [categoryConfig.tagKey]: enabled ? '1' : '0'
      },
      lastSyncedAt: new Date().toISOString()
    };
    onUpdatePreferences(updatedPrefs);
    syncOneSignalCategoryTags(updatedPrefs, user);
  };

  // Subscribe / Unsubscribe all categories
  const handleToggleAllCategories = (subscribeAll: boolean) => {
    const updatedPrefs: NotificationPreferences = {
      ...preferences,
      enableScholarships: subscribeAll,
      enableSystemUpdates: subscribeAll,
      enableWeeklySummary: subscribeAll,
      enablePaymentAlerts: subscribeAll,
      enableCulturalHeritage: subscribeAll,
      enableAiInsights: subscribeAll,
      oneSignalTags: {
        sub_scholarships: subscribeAll ? '1' : '0',
        sub_system_alerts: subscribeAll ? '1' : '0',
        sub_weekly_summary: subscribeAll ? '1' : '0',
        sub_payment_alerts: subscribeAll ? '1' : '0',
        sub_cultural_heritage: subscribeAll ? '1' : '0',
        sub_ai_insights: subscribeAll ? '1' : '0'
      },
      lastSyncedAt: new Date().toISOString()
    };
    onUpdatePreferences(updatedPrefs);
    syncOneSignalCategoryTags(updatedPrefs, user);
  };

  // Trigger manual OneSignal tag synchronization
  const handleManualTagSync = async () => {
    setIsSyncingTags(true);
    try {
      await syncOneSignalCategoryTags(preferences, user);
      setTagSyncSuccess(true);
      if (preferences.enableAudioChime) {
        playGoldenNotificationChime();
      }
      setTimeout(() => setTagSyncSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to sync tags:', err);
    } finally {
      setIsSyncingTags(false);
    }
  };

  // Test dispatch for specific category
  const handleTestCategoryPush = (categoryId: OneSignalCategoryId) => {
    const notif = createCategoryTestNotification(categoryId);
    const updated = [notif, ...notifications];
    onUpdateNotifications(updated);

    if (preferences.enableAudioChime) {
      playGoldenNotificationChime();
    }

    if (preferences.enableWebPush && isCategorySubscribed(categoryId, preferences)) {
      triggerBrowserPushNotification(
        notif,
        user?.preferredLanguage?.startsWith('ti') ? 'ti' : 'en'
      );
    }

    setTestSentCategory(categoryId);
    setTimeout(() => setTestSentCategory(null), 2500);
  };

  const handleCopyTagsPayload = () => {
    const payload = generateOneSignalTagsPayload(preferences, user);
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopiedTags(true);
    setTimeout(() => setCopiedTags(false), 2000);
  };

  const handleItemAction = (item: AppNotification) => {
    // Mark as read
    const updated = notifications.map((n) => (n.id === item.id ? { ...n, read: true } : n));
    onUpdateNotifications(updated);

    if (item.category === 'weekly_summary' || item.actionType === 'open_weekly_summary' || item.targetTab === 'weekly_summary') {
      if (onOpenWeeklySummary) {
        onOpenWeeklySummary(item.weeklySummary);
      }
      onClose();
    } else if (item.category === 'payment_failed' || item.actionType === 'open_payment' || item.targetTab === 'payment') {
      if (onOpenPaymentManagement) {
        onOpenPaymentManagement();
      } else if (onNavigateTab) {
        onNavigateTab('payment');
      }
      onClose();
    } else if (item.category === 'scholarship') {
      if (onOpenScholarshipOpportunity) {
        onOpenScholarshipOpportunity(item.scholarshipId);
        onClose();
      } else if (item.actionUrl) {
        window.open(item.actionUrl, '_blank');
      }
    } else if (item.actionUrl) {
      window.open(item.actionUrl, '_blank');
    } else if (onOpenSystemStatus) {
      onOpenSystemStatus();
      onClose();
    }
  };

  // Check if active filter category is currently unsubscribed
  const isCurrentFilterMuted = (() => {
    if (activeFilter === 'scholarship') return preferences.enableScholarships === false;
    if (activeFilter === 'system_update') return preferences.enableSystemUpdates === false;
    if (activeFilter === 'payment') return preferences.enablePaymentAlerts === false;
    if (activeFilter === 'weekly_summary') return preferences.enableWeeklySummary === false;
    return false;
  })();

  const subscribedCategoriesCount = ONESIGNAL_CATEGORY_SUBSCRIPTIONS.filter(
    (c) => preferences[c.prefKey] !== false
  ).length;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-2 sm:p-4 md:p-6">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity animate-fade-in"
        onClick={onClose}
      />

      {/* Modal Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: 'spring', damping: 25, stiffness: 320 }}
        className="relative w-full max-w-3xl max-h-[92vh] flex flex-col bg-gradient-to-b from-[#110D1D] via-[#0D0917] to-[#07050E] border-2 border-[#8E6D28] rounded-[28px] shadow-[0_25px_60px_rgba(0,0,0,0.9),0_0_35px_rgba(197,160,89,0.25)] text-slate-100 overflow-hidden z-10"
      >
        {/* TOP HEADER */}
        <div className="p-5 sm:p-6 border-b border-[#2C2140] flex items-center justify-between gap-3 bg-[#161026]/60">
          <div className="flex items-center space-x-3">
            <div className="relative p-2.5 rounded-2xl bg-amber-500/15 border border-amber-400/40 text-amber-300 shadow-md">
              <Bell className="w-6 h-6" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white font-bold text-[10px] rounded-full flex items-center justify-center border-2 border-[#110D1D] animate-pulse">
                  {unreadCount}
                </span>
              )}
            </div>

            <div>
              <div className="flex items-center space-x-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black text-[#F3E5AB]">
                  {language === 'ti' ? 'ማእከል ምልክታታት' : 'Notification Center'}
                </h2>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40 text-[10px] font-bold">
                    {unreadCount} {language === 'ti' ? 'ሓደስቲ' : 'New'}
                  </span>
                )}
                <span className="px-2 py-0.5 rounded-full bg-[#1C142E] text-amber-300/80 border border-[#3C2D56] text-[10px] font-mono flex items-center space-x-1">
                  <Tag className="w-2.5 h-2.5 text-amber-400" />
                  <span>OneSignal Tags: {subscribedCategoriesCount}/6</span>
                </span>
              </div>
              <p className="text-xs text-gray-400">
                {language === 'ti' 
                  ? 'ስኮላርሺፕ፡ ናይ ሰሙን ጸብጻብን ብምድብ ዝተፈልየ OneSignal ምልክታታትን' 
                  : 'Category-based OneSignal subscriptions for scholarships, weekly reports, and system alerts'}
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center space-x-2">
            {onTriggerWeeklySummary && (
              <button
                onClick={onTriggerWeeklySummary}
                className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#1D162E] hover:bg-[#2A1F42] border border-[#433261] text-[11px] font-bold text-amber-300 transition-all cursor-pointer"
                title="Generate Weekly Summary Report"
              >
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                <span>{language === 'ti' ? 'ናይ ሰሙን ጸብጻብ' : 'Weekly Summary'}</span>
              </button>
            )}

            <button
              onClick={() => setActiveFilter(activeFilter === 'settings' ? 'all' : 'settings')}
              className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center space-x-1.5 ${
                activeFilter === 'settings'
                  ? 'bg-amber-500 text-slate-950 border-amber-400'
                  : 'bg-[#1C1530] hover:bg-[#281E44] text-gray-300 border-[#3C2D56]'
              }`}
              title="Notification Settings & OneSignal Category Tags"
            >
              <Sliders className="w-4 h-4" />
              <span className="hidden md:inline text-xs font-bold">
                {activeFilter === 'settings' ? (language === 'ti' ? 'ምልክታታት' : 'Feed') : (language === 'ti' ? 'ምርጫታት' : 'Subscriptions')}
              </span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-[#1C1530] hover:bg-[#281E44] text-gray-300 hover:text-white border border-[#3C2D56] transition-all cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* BROWSER PUSH PERMISSION PROMPT BANNER */}
        {browserPermission !== 'granted' && (
          <div className="px-5 py-3 bg-gradient-to-r from-[#2B1B0F] via-[#20140A] to-[#140D05] border-b border-amber-500/30 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2.5">
              <Smartphone className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-amber-200">
                {language === 'ti'
                  ? 'ኣብ መሳርሒኹም ብቐጥታ ናይ ስኮላርሺፕን ናይ ሰሙን ጸብጻብን ምልክታታት ንምርካብ Push Notifications ፍቐዱ'
                  : 'Enable Web Push to receive targeted OneSignal category alerts even when the browser tab is closed.'}
              </span>
            </div>

            <button
              onClick={handleEnableWebPush}
              disabled={isRequestingPermission}
              className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-[11px] shadow-sm transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
            >
              <Bell className="w-3 h-3" />
              <span>{isRequestingPermission ? 'Requesting...' : (language === 'ti' ? 'ምልክታታት ፍቐድ' : 'Allow Push Alerts')}</span>
            </button>
          </div>
        )}

        {/* CATEGORY FILTER TABS */}
        {activeFilter !== 'settings' && (
          <div className="px-5 pt-3 pb-2 flex items-center justify-between border-b border-[#251A3B] bg-[#0E0919] overflow-x-auto scrollbar-none gap-2">
            <div className="flex items-center space-x-1.5">
              {[
                { id: 'all', labelTi: 'ኩሉ', labelEn: 'All', count: notifications.length },
                { id: 'scholarship', labelTi: '🎓 ስኮላርሺፕ', labelEn: '🎓 Scholarships', count: notifications.filter(n => n.category === 'scholarship').length, isSubscribed: preferences.enableScholarships !== false },
                { id: 'system_update', labelTi: '⚙️ ስርዓት', labelEn: '⚙️ System', count: notifications.filter(n => n.category === 'system_update' || n.category === 'security' || n.category === 'feature').length, isSubscribed: preferences.enableSystemUpdates !== false },
                { id: 'weekly_summary', labelTi: '📊 ናይ ሰሙን ጸብጻብ', labelEn: '📊 Weekly Summary', count: weeklySummaryCount, isSubscribed: preferences.enableWeeklySummary !== false },
                { id: 'payment', labelTi: '⚠️ ክፍሊት', labelEn: '⚠️ Payments', count: paymentAlertsCount, isSubscribed: preferences.enablePaymentAlerts !== false },
                { id: 'unread', labelTi: 'ዘይተነበቡ', labelEn: 'Unread', count: unreadCount },
              ].map((tab) => {
                const isActive = activeFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveFilter(tab.id as any)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 whitespace-nowrap ${
                      isActive
                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span>{language === 'ti' ? tab.labelTi : tab.labelEn}</span>
                    {tab.count > 0 && (
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                        isActive ? 'bg-slate-900 text-amber-300 font-black' : 'bg-[#1D162E] text-gray-400'
                      }`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="px-2.5 py-1 text-[11px] font-medium text-amber-300 hover:text-[#F3E5AB] bg-amber-500/10 hover:bg-amber-500/20 rounded-lg border border-amber-400/20 transition-all cursor-pointer flex items-center space-x-1"
                >
                  <CheckCircle2 className="w-3 h-3" />
                  <span>{language === 'ti' ? 'ኩሉ ተነቢቡ' : 'Mark all read'}</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* MUTED CATEGORY BANNER (If user is viewing a category they have unsubscribed from in OneSignal) */}
        {activeFilter !== 'settings' && isCurrentFilterMuted && (
          <div className="px-5 py-2.5 bg-rose-950/40 border-b border-rose-500/30 flex items-center justify-between text-xs text-rose-200">
            <div className="flex items-center space-x-2">
              <BellOff className="w-4 h-4 text-rose-400 shrink-0" />
              <span>
                {language === 'ti'
                  ? 'ናይዚ ምድብ OneSignal ፑሽ ምልክታ ኣብዚ እዋን ኣቋሪጽኩምዎ ኣለኹም።'
                  : `OneSignal Push alerts for this category are currently muted.`}
              </span>
            </div>
            <button
              onClick={() => {
                if (activeFilter === 'scholarship') handleToggleCategoryTag(ONESIGNAL_CATEGORY_SUBSCRIPTIONS[0], true);
                else if (activeFilter === 'system_update') handleToggleCategoryTag(ONESIGNAL_CATEGORY_SUBSCRIPTIONS[1], true);
                else if (activeFilter === 'weekly_summary') handleToggleCategoryTag(ONESIGNAL_CATEGORY_SUBSCRIPTIONS[2], true);
                else if (activeFilter === 'payment') handleToggleCategoryTag(ONESIGNAL_CATEGORY_SUBSCRIPTIONS[3], true);
              }}
              className="px-2.5 py-1 bg-rose-500 hover:bg-rose-400 text-slate-950 rounded-lg font-bold text-[11px] transition-all cursor-pointer flex items-center space-x-1"
            >
              <Zap className="w-3 h-3" />
              <span>{language === 'ti' ? 'ምዝገባ ኣንቅሕ' : 'Subscribe to Tag'}</span>
            </button>
          </div>
        )}

        {/* MAIN BODY: NOTIFICATIONS LIST OR SETTINGS VIEW */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 max-h-[58vh] scrollbar-thin scrollbar-thumb-slate-800">
          {activeFilter === 'settings' ? (
            /* PREFERENCES & ONESIGNAL CATEGORY TAGS PANEL */
            <div className="space-y-6 animate-fade-in">
              {/* ONESIGNAL CATEGORY SUBSCRIPTION SECTION */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#140F24] border border-[#2D2144] space-y-4 shadow-lg">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2">
                      <Tag className="w-4 h-4 text-amber-400" />
                      <h3 className="text-sm font-bold text-[#F3E5AB]">
                        {language === 'ti' ? 'ናይ OneSignal ምድብ ምዝገባታት' : 'OneSignal Category Push Subscriptions'}
                      </h3>
                      <span className="px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-[10px] font-bold">
                        OneSignal v5
                      </span>
                    </div>
                    <p className="text-[11.5px] text-gray-400">
                      {language === 'ti'
                        ? 'ዝደለኹምዎም ዓይነት ምልክታታት ጥራይ ንምርካብ ምድባት ምረጹ (OneSignal Segment Tagging)።'
                        : 'Choose which content types you want to receive via background push alerts.'}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleToggleAllCategories(true)}
                      className="px-2.5 py-1 text-[11px] font-bold bg-[#1C1530] hover:bg-[#281E44] text-amber-300 rounded-lg border border-[#3C2D56] transition-all cursor-pointer"
                    >
                      {language === 'ti' ? 'ንኹሉ ኣንቅሕ' : 'Subscribe All'}
                    </button>
                    <button
                      onClick={() => handleToggleAllCategories(false)}
                      className="px-2.5 py-1 text-[11px] font-bold bg-[#1C1530] hover:bg-[#281E44] text-gray-400 hover:text-rose-300 rounded-lg border border-[#3C2D56] transition-all cursor-pointer"
                    >
                      {language === 'ti' ? 'ንኹሉ ኣቋርጽ' : 'Mute All'}
                    </button>
                    <button
                      onClick={handleManualTagSync}
                      disabled={isSyncingTags}
                      className={`px-3 py-1 text-[11px] font-black rounded-lg transition-all flex items-center space-x-1.5 cursor-pointer shadow-sm ${
                        tagSyncSuccess
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950'
                      }`}
                      title="Sync current tags with OneSignal backend"
                    >
                      {tagSyncSuccess ? (
                        <>
                          <CheckCheck className="w-3.5 h-3.5" />
                          <span>Synced!</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw className={`w-3.5 h-3.5 ${isSyncingTags ? 'animate-spin' : ''}`} />
                          <span>{isSyncingTags ? 'Syncing...' : 'Sync Tags'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* CATEGORY SWITCH CARDS GRID */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  {ONESIGNAL_CATEGORY_SUBSCRIPTIONS.map((cat) => {
                    const isSubscribed = preferences[cat.prefKey] !== false;
                    const isTestSent = testSentCategory === cat.id;

                    return (
                      <div
                        key={cat.id}
                        className={`p-3.5 rounded-xl border transition-all space-y-2.5 ${
                          isSubscribed
                            ? 'bg-[#100C1F] border-[#3B2B59] hover:border-amber-400/50 shadow-md'
                            : 'bg-[#0B0715]/80 border-[#201535] opacity-65 hover:opacity-100'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center space-x-2.5">
                            <span className="text-xl shrink-0 p-1.5 rounded-lg bg-[#18112C] border border-[#2D2147]">
                              {cat.iconEmoji}
                            </span>
                            <div>
                              <div className="flex items-center space-x-1.5 flex-wrap">
                                <h4 className="text-xs font-bold text-white">
                                  {language === 'ti' ? cat.nameTi : cat.nameEn}
                                </h4>
                              </div>
                              <span className="text-[10px] font-mono text-amber-400/90 flex items-center space-x-1">
                                <span>Tag:</span>
                                <code className="bg-slate-950 px-1.5 py-0.2 rounded border border-[#2D2147] text-[9.5px]">
                                  {cat.tagKey}: {isSubscribed ? '1' : '0'}
                                </code>
                              </span>
                            </div>
                          </div>

                          {/* Switch Input */}
                          <label className="relative inline-flex items-center cursor-pointer shrink-0">
                            <input
                              type="checkbox"
                              checked={isSubscribed}
                              onChange={(e) => handleToggleCategoryTag(cat, e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-[#201535] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500 border border-[#3C2D56]"></div>
                          </label>
                        </div>

                        <p className="text-[11px] text-gray-400 leading-snug">
                          {language === 'ti' ? cat.descTi : cat.descEn}
                        </p>

                        {/* Test Button for this Category */}
                        <div className="pt-1 flex items-center justify-between border-t border-[#1C142E] text-[10.5px]">
                          <span className={`font-mono text-[10px] flex items-center space-x-1 ${isSubscribed ? 'text-emerald-400' : 'text-gray-500'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isSubscribed ? 'bg-emerald-400' : 'bg-gray-500'}`} />
                            <span>{isSubscribed ? (language === 'ti' ? 'ምዝገባ ንቑሕ' : 'Subscribed') : (language === 'ti' ? 'ምዝገባ ተቋሪጹ' : 'Muted')}</span>
                          </span>

                          <button
                            onClick={() => handleTestCategoryPush(cat.id)}
                            className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold transition-all flex items-center space-x-1 cursor-pointer ${
                              isTestSent
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                                : 'bg-[#18112C] hover:bg-[#251B3E] text-amber-300 border-[#382852]'
                            }`}
                            title={`Trigger simulated push for ${cat.nameEn}`}
                          >
                            <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                            <span>{isTestSent ? 'Triggered!' : (language === 'ti' ? 'ፈትን' : 'Test Push')}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* TAGS INSPECTOR TOGGLE */}
                <div className="pt-2 border-t border-[#201535] flex items-center justify-between">
                  <button
                    onClick={() => setShowTagsInspector(!showTagsInspector)}
                    className="text-[11px] text-gray-400 hover:text-amber-300 flex items-center space-x-1.5 transition-colors cursor-pointer"
                  >
                    <Code2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>{showTagsInspector ? (language === 'ti' ? 'ናይ OneSignal JSON ሕባእ' : 'Hide OneSignal Tags JSON') : (language === 'ti' ? 'ናይ OneSignal JSON ርአ' : 'View OneSignal Tags Payload')}</span>
                  </button>

                  <span className="text-[10px] text-gray-500 font-mono">
                    App ID: {ONESIGNAL_APP_ID.slice(0, 8)}...
                  </span>
                </div>

                {/* EXPANDED ONESIGNAL TAGS JSON INSPECTOR */}
                {showTagsInspector && (
                  <div className="p-3 rounded-xl bg-slate-950 border border-[#2D2147] space-y-2 animate-fade-in">
                    <div className="flex items-center justify-between text-xs text-amber-200">
                      <span className="font-mono text-[11px] font-bold">OneSignal User Tags Payload</span>
                      <button
                        onClick={handleCopyTagsPayload}
                        className="px-2 py-0.5 rounded bg-[#1C142E] hover:bg-[#281E44] border border-[#3C2D56] text-[10px] text-amber-300 flex items-center space-x-1 cursor-pointer"
                      >
                        {copiedTags ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedTags ? 'Copied!' : 'Copy JSON'}</span>
                      </button>
                    </div>
                    <pre className="text-[10.5px] font-mono text-emerald-400 bg-[#090612] p-2.5 rounded-lg border border-[#1F1535] overflow-x-auto max-h-36 scrollbar-thin">
                      {JSON.stringify(generateOneSignalTagsPayload(preferences, user), null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              {/* GENERAL CHANNEL PREFERENCES */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#140F24] border border-[#2D2144] space-y-4">
                <h3 className="text-sm font-bold text-[#F3E5AB] flex items-center space-x-2">
                  <Sliders className="w-4 h-4 text-amber-400" />
                  <span>{language === 'ti' ? 'ናይ ምልክታ ሓፈሻዊ ምርጫታት' : 'General Audio & Delivery Preferences'}</span>
                </h3>

                <div className="space-y-3 divide-y divide-[#201535]">
                  {/* Web Push */}
                  <div className="pt-2 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white">{language === 'ti' ? 'ብራውዘር ፑሽ ምልክታታት' : 'Browser Web Push Alerts'}</div>
                      <div className="text-[11px] text-gray-400">{language === 'ti' ? 'ኣብ ኮምፒተር ወይ ስልኪ ብOneSignal ብቐጥታ ይበጽሓኩም' : 'Receive background push updates when tab is in background'}</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.enableWebPush}
                      onChange={(e) => {
                        const updated = { ...preferences, enableWebPush: e.target.checked };
                        onUpdatePreferences(updated);
                        syncOneSignalCategoryTags(updated, user);
                      }}
                      className="w-5 h-5 accent-amber-500 rounded cursor-pointer"
                    />
                  </div>

                  {/* Audio Chime */}
                  <div className="pt-3 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white">{language === 'ti' ? 'ናይ ድምጺ መጠንቀቕታ (Chime)' : 'Golden Sound Chime'}</div>
                      <div className="text-[11px] text-gray-400">{language === 'ti' ? 'ምልክታ ኣብ ዝመጸሉ እዋን ድምጺ የቃልሕ' : 'Play sacred chime when urgent alert arrives'}</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.enableAudioChime}
                      onChange={(e) => {
                        const updated = { ...preferences, enableAudioChime: e.target.checked };
                        onUpdatePreferences(updated);
                        syncOneSignalCategoryTags(updated, user);
                      }}
                      className="w-5 h-5 accent-amber-500 rounded cursor-pointer"
                    />
                  </div>

                  {/* Language */}
                  <div className="pt-3 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white">{language === 'ti' ? 'ናይ ምልክታ ቋንቋ' : 'Preferred Notification Language'}</div>
                      <div className="text-[11px] text-gray-400">{language === 'ti' ? 'ትግርኛ፡ እንግሊዝኛ ወይ ክልቲኡ' : 'Tigrinya, English, or Bilingual format'}</div>
                    </div>
                    <select
                      value={preferences.preferredLanguage}
                      onChange={(e) => {
                        const updated = { ...preferences, preferredLanguage: e.target.value as any };
                        onUpdatePreferences(updated);
                        syncOneSignalCategoryTags(updated, user);
                      }}
                      className="bg-[#1C142E] text-amber-200 border border-[#3C2D56] text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-amber-400 cursor-pointer"
                    >
                      <option value="bilingual">Bilingual (ትግርኛ + EN)</option>
                      <option value="ti">Tigrinya Only (ትግርኛ ጥራይ)</option>
                      <option value="en">English Only</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-between pt-2 flex-wrap gap-2">
                {onTriggerWeeklySummary && (
                  <button
                    onClick={onTriggerWeeklySummary}
                    className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/40 text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>{language === 'ti' ? 'ናይ ሰሙን ጸብጻብ ፍጠር' : 'Trigger Weekly Summary Alert'}</span>
                  </button>
                )}

                {onTriggerTestNotification && (
                  <button
                    onClick={onTriggerTestNotification}
                    className="px-4 py-2 rounded-xl bg-[#1C1530] hover:bg-[#281E44] text-gray-300 hover:text-white border border-[#3C2D56] text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>{language === 'ti' ? 'ናይ ፈተነ ምልክታ ልኣኽ' : 'Trigger Random Test Notification'}</span>
                  </button>
                )}
              </div>
            </div>
          ) : filteredNotifications.length === 0 ? (
            /* EMPTY STATE */
            <div className="py-14 text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-full bg-[#181128] border border-[#33234F] flex items-center justify-center text-gray-500">
                <Bell className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-gray-300">
                {language === 'ti' ? 'ዝኾነ ምልክታ የለን' : 'No notifications in this view'}
              </h3>
              <p className="text-xs text-gray-500 max-w-xs mx-auto">
                {language === 'ti'
                  ? 'ሓደስቲ ዕድላት ስኮላርሺፕን ናይ ሰሙን ጸብጻባትን ኣብዚ ክቐርቡ እዮም።'
                  : 'New weekly performance digests, scholarship alerts, and updates will appear here.'}
              </p>
            </div>
          ) : (
            /* NOTIFICATION CARDS LIST */
            filteredNotifications.map((item) => {
              const isUnread = !item.read;
              const isWeeklySummary = item.category === 'weekly_summary';
              const isPaymentFailed = item.category === 'payment_failed';
              const isScholarship = item.category === 'scholarship';

              return (
                <div
                  key={item.id}
                  onClick={() => handleItemAction(item)}
                  className={`group relative p-4 rounded-2xl border transition-all cursor-pointer space-y-3 ${
                    isPaymentFailed
                      ? isUnread
                        ? 'bg-gradient-to-br from-[#280D1A] via-[#1A0912] to-[#12050B] border-rose-500/80 shadow-[0_4px_20px_rgba(244,63,94,0.15)] ring-1 ring-rose-500/30'
                        : 'bg-[#1A0A12]/80 border-rose-900/40 text-gray-300'
                      : isWeeklySummary
                      ? isUnread
                        ? 'bg-gradient-to-br from-[#1C142E] via-[#120D22] to-[#0A0714] border-[#C5A059] shadow-[0_4px_20px_rgba(197,160,89,0.2)] ring-1 ring-amber-400/40'
                        : 'bg-[#120D20] border-[#2E2046] text-gray-300'
                      : isUnread
                      ? 'bg-gradient-to-br from-[#161026] via-[#100B1D] to-[#0B0714] border-amber-500/60 shadow-lg'
                      : 'bg-[#100C1B]/80 border-[#241A37] text-gray-300'
                  }`}
                >
                  <div className="space-y-2">
                    {/* Header line: Badge + Time + Read toggle */}
                    <div className="flex items-center justify-between text-xs gap-2">
                      <div className="flex items-center space-x-2 flex-wrap">
                        <span className={`p-1.5 rounded-lg ${
                          isPaymentFailed
                            ? 'bg-rose-500/20 text-rose-300 ring-1 ring-rose-500/40'
                            : isWeeklySummary
                            ? 'bg-amber-500/20 text-[#F3E5AB] ring-1 ring-amber-400/50'
                            : isScholarship 
                            ? 'bg-amber-500/20 text-amber-300' 
                            : 'bg-sky-500/20 text-sky-300'
                        }`}>
                          {isPaymentFailed ? (
                            <CreditCard className="w-4 h-4 text-rose-400" />
                          ) : isWeeklySummary ? (
                            <FileText className="w-4 h-4 text-[#F3E5AB]" />
                          ) : isScholarship ? (
                            <GraduationCap className="w-4 h-4" />
                          ) : (
                            <RefreshCw className="w-4 h-4" />
                          )}
                        </span>
                        
                        <span className={`text-[11px] font-mono font-bold uppercase tracking-wider ${
                          isPaymentFailed ? 'text-rose-400 font-black' : isWeeklySummary ? 'text-[#F3E5AB]' : 'text-amber-300'
                        }`}>
                          {isPaymentFailed 
                            ? (language === 'ti' ? '⚠️ ናይ ክፍሊት ጸገም' : '⚠️ Payment Failed') 
                            : isWeeklySummary
                            ? (language === 'ti' ? '📊 ናይ ሰሙን ጸብጻብ' : '📊 Weekly Summary')
                            : isScholarship 
                            ? (language === 'ti' ? 'ዕድል ስኮላርሺፕ' : 'Scholarship Opportunity') 
                            : (language === 'ti' ? 'ናይ ስርዓት ዜና' : 'System Update')}
                        </span>

                        {item.badgeText && (
                          <span className={`px-2 py-0.2 rounded-full text-[9px] font-bold uppercase ${
                            isPaymentFailed
                              ? 'bg-rose-500/20 text-rose-200 border border-rose-400/50 animate-pulse'
                              : isWeeklySummary
                              ? 'bg-amber-500/20 text-amber-200 border border-amber-400/50'
                              : 'bg-amber-500/20 text-amber-200 border border-amber-400/40'
                          }`}>
                            {item.badgeText}
                          </span>
                        )}

                        {isUnread && (
                          <span className={`w-2 h-2 rounded-full ${isPaymentFailed ? 'bg-rose-500' : 'bg-amber-400'} animate-ping`} />
                        )}
                      </div>

                      <div className="flex items-center space-x-1.5 text-gray-400 text-[10.5px] font-mono">
                        <span>{item.timestamp}</span>
                      </div>
                    </div>

                    {/* Titles */}
                    <div className="space-y-1">
                      {/* Tigrinya Title */}
                      <h4 className={`text-sm font-bold leading-snug transition-colors ${
                        isPaymentFailed 
                          ? 'text-rose-100 group-hover:text-rose-300' 
                          : isWeeklySummary
                          ? 'text-[#F3E5AB] group-hover:text-white'
                          : 'text-white group-hover:text-[#F3E5AB]'
                      }`}>
                        {item.titleTi}
                      </h4>

                      {/* English Title */}
                      {(preferences.preferredLanguage === 'bilingual' || preferences.preferredLanguage === 'en') && (
                        <div className={`text-xs font-semibold font-sans ${
                          isPaymentFailed ? 'text-rose-200/90' : 'text-amber-200/80'
                        }`}>
                          {item.titleEn}
                        </div>
                      )}
                    </div>

                    {/* Weekly Summary Highlights Strip */}
                    {isWeeklySummary && item.weeklySummary && (
                      <div className="p-3 rounded-xl bg-[#0B0715] border border-amber-500/30 grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="p-1.5 rounded-lg bg-[#140D24]">
                          <div className="text-[10px] text-gray-400 uppercase font-mono">{language === 'ti' ? 'ሰዓታት' : 'Study Time'}</div>
                          <div className="font-bold text-white font-mono text-xs sm:text-sm">{item.weeklySummary.totalStudyHours} hrs</div>
                        </div>
                        <div className="p-1.5 rounded-lg bg-[#140D24]">
                          <div className="text-[10px] text-gray-400 uppercase font-mono">{language === 'ti' ? 'ኣርእስታት' : 'Topics'}</div>
                          <div className="font-bold text-sky-300 font-mono text-xs sm:text-sm">{item.weeklySummary.topicsLearnedCount} Mastered</div>
                        </div>
                        <div className="p-1.5 rounded-lg bg-[#140D24]">
                          <div className="text-[10px] text-emerald-400 uppercase font-mono">{language === 'ti' ? 'ዕቋር' : 'Savings'}</div>
                          <div className="font-bold text-emerald-300 font-mono text-xs sm:text-sm">+${item.weeklySummary.totalSavingsUSD.toFixed(2)}</div>
                        </div>
                      </div>
                    )}

                    {/* Payment Failure Details Card if present */}
                    {isPaymentFailed && item.paymentDetails && (
                      <div className="p-2.5 rounded-xl bg-[#2A0E18]/80 border border-rose-500/30 text-[11px] space-y-1.5">
                        <div className="flex items-center justify-between text-rose-200 font-bold">
                          <span className="flex items-center space-x-1">
                            <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
                            <span>{item.paymentDetails.planName || 'AI Sovereign Plan'}</span>
                          </span>
                          <span className="font-mono text-xs bg-rose-950 px-2 py-0.5 rounded border border-rose-800">
                            {item.paymentDetails.currency || 'USD'} ${item.paymentDetails.amount?.toFixed(2) || '79.99'}
                          </span>
                        </div>
                        {item.paymentDetails.failureReason && (
                          <p className="text-rose-300/80 font-mono text-[10px]">
                            • Reason: {item.paymentDetails.failureReason}
                          </p>
                        )}
                        {item.paymentDetails.paymentMethod && (
                          <p className="text-gray-300 text-[10px]">
                            • Method: {item.paymentDetails.paymentMethod}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Body Texts */}
                    <div className="text-xs text-gray-300 leading-relaxed font-sans space-y-1 bg-[#090612] p-2.5 rounded-xl border border-[#201535]">
                      {preferences.preferredLanguage !== 'en' && (
                        <p className={isPaymentFailed ? 'text-rose-100/90 font-medium' : 'text-slate-200'}>{item.bodyTi}</p>
                      )}
                      {(preferences.preferredLanguage === 'bilingual' || preferences.preferredLanguage === 'en') && (
                        <p className="text-gray-400 text-[11.5px] pt-0.5 border-t border-[#1C1230]">{item.bodyEn}</p>
                      )}
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="pt-2 border-t border-[#201535] flex items-center justify-between gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={(e) => handleCopy(item, e)}
                        className="px-2.5 py-1 bg-[#1A132C] hover:bg-[#251B3E] text-gray-300 hover:text-white rounded-lg border border-[#3A2A54] text-[10.5px] font-bold transition-all flex items-center space-x-1 cursor-pointer"
                        title="Copy text"
                      >
                        {copiedId === item.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedId === item.id ? 'Copied' : 'Copy'}</span>
                      </button>

                      <button
                        onClick={(e) => handleToggleRead(item.id, e)}
                        className="px-2.5 py-1 bg-[#1A132C] hover:bg-[#251B3E] text-gray-300 hover:text-white rounded-lg border border-[#3A2A54] text-[10.5px] font-bold transition-all flex items-center space-x-1 cursor-pointer"
                      >
                        <CheckCircle2 className={`w-3 h-3 ${isUnread ? (isPaymentFailed ? 'text-rose-400' : 'text-amber-400') : 'text-gray-500'}`} />
                        <span>{isUnread ? (language === 'ti' ? 'ተነቢቡ' : 'Mark Read') : (language === 'ti' ? 'ዘይተነበበ' : 'Mark Unread')}</span>
                      </button>

                      <button
                        onClick={(e) => handleDeleteNotification(item.id, e)}
                        className="p-1 bg-[#1A132C] hover:bg-rose-500/20 text-gray-400 hover:text-rose-300 rounded-lg border border-[#3A2A54] transition-all cursor-pointer"
                        title="Delete notification"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center space-x-2">
                      {/* Direct PDF Download Button for Weekly Summary */}
                      {isWeeklySummary && item.weeklySummary && (
                        <button
                          onClick={(e) => handleQuickDownloadPdf(item, e)}
                          disabled={downloadingPdfId === item.id}
                          className="px-3 py-1.5 bg-[#1F1735] hover:bg-[#2C214B] text-amber-300 hover:text-white rounded-xl border border-amber-500/40 text-xs font-bold transition-all flex items-center space-x-1 shadow-sm cursor-pointer disabled:opacity-50"
                          title="Download PDF directly"
                        >
                          <Download className="w-3.5 h-3.5 text-amber-400" />
                          <span>{downloadingPdfId === item.id ? 'Exporting...' : 'PDF'}</span>
                        </button>
                      )}

                      {/* Primary Trigger Button */}
                      <button
                        onClick={() => handleItemAction(item)}
                        className={`px-3.5 py-1.5 font-black rounded-xl text-xs transition-all flex items-center space-x-1 shadow-md active:scale-95 cursor-pointer ${
                          isPaymentFailed
                            ? 'bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 text-white shadow-rose-500/30'
                            : isWeeklySummary
                            ? 'bg-gradient-to-r from-amber-400 via-[#E1C47D] to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 shadow-amber-500/30'
                            : 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 shadow-amber-500/20'
                        }`}
                      >
                        {isPaymentFailed ? (
                          <>
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>{language === 'ti' ? (item.actionLabelTi || 'ክፍሊት ኣሐድስ') : (item.actionLabelEn || 'Update Billing Info')}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </>
                        ) : isWeeklySummary ? (
                          <>
                            <FileText className="w-3.5 h-3.5" />
                            <span>{language === 'ti' ? (item.actionLabelTi || 'ናይ ሰሙን ጸብጻብን PDFን ርአ') : (item.actionLabelEn || 'View Summary & PDF')}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </>
                        ) : (
                          <>
                            <span>{language === 'ti' ? (item.actionLabelTi || 'ተመልከት') : (item.actionLabelEn || 'View')}</span>
                            {item.actionUrl ? <ExternalLink className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* FOOTER */}
        <div className="p-4 sm:p-5 border-t border-[#241A38] bg-[#0E0919] flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>
              {language === 'ti' ? 'ናይ Axumite AI OneSignal Tagged Feed ንቑሕ እዩ' : 'OneSignal Category Tagging Engine Active'}
            </span>
          </div>

          {filteredNotifications.length > 0 && activeFilter !== 'settings' && (
            <button
              onClick={handleClearAll}
              className="text-gray-400 hover:text-rose-400 transition-colors text-[11px] font-medium cursor-pointer"
            >
              {language === 'ti' ? 'ንኹሉ ደምስስ' : 'Clear all'}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};
