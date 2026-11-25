import React, { useState, useRef, useCallback, useEffect, Suspense } from 'react';
import { AppTab } from './types';
import {
  motion,
  MotionConfig,
  AnimatePresence,
  animate,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from 'motion/react';
import { Hand, ChevronLeft, ChevronRight, Smartphone } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { LazyChunkErrorBoundary, lazyWithRetry } from './components/LazyChunkBoundary';
import { OfflineDashboardPrefetcher, OfflineModeHost } from './components/OfflineModeHost';
import { AppModalsHost } from './components/AppModalsHost';
import { AppVoiceCommandHost } from './components/AppVoiceCommandHost';
import { useAuthUser } from './context/AuthUserContext';
import { useAdaptiveTheme } from './context/AdaptiveThemeContext';
import { useBatterySaver } from './context/BatterySaverContext';
import { useNetwork } from './context/NetworkContext';
import { useSubscription } from './context/SubscriptionContext';
import {
  useSavedInsights,
  useSavedInsightsActions,
  useSavedInsightsCount,
} from './context/SavedInsightsContext';
import { useNotificationUnreadCount } from './context/NotificationContext';
import { useAppActions, useNavigationState } from './context/AppNavigationContext';
import { useIsAlwaysListening, useVoiceCommandActions } from './context/VoiceCommandContext';
import {
  HAPTICS_SETTINGS_EVENT,
  HapticSettings,
  getSwipeThresholdPx,
  triggerSwipeThresholdHaptic,
  triggerSwipeTransitionHaptic,
  triggerTabTapHaptic,
} from './utils/haptics';
import {
  SWIPE_PAUSE_DECAY_MS,
  SwipeGestureAxis,
  computeDampedDragX,
  computeSwipeSnapDecision,
} from './utils/swipePhysics';
import { recordSwipeAttempt } from './utils/interactionMetrics';
import { recordTapHeatmapPointFromEvent } from './utils/heatmapTracker';
import logoImg from './assets/images/axumite_3d_luxury_logo_1787505687476.jpg';

// Lazy-loaded tab views & non-critical first-session helper
const EritreanPremiereView = lazyWithRetry(() =>
  import('./components/EritreanPremiereView').then((m) => ({ default: m.EritreanPremiereView }))
);
const ObeliskChat = lazyWithRetry(() =>
  import('./components/ObeliskChat').then((m) => ({ default: m.ObeliskChat }))
);
const SavedInsights = lazyWithRetry(() =>
  import('./components/SavedInsights').then((m) => ({ default: m.SavedInsights }))
);
const VisionStudio = lazyWithRetry(() =>
  import('./components/VisionStudio').then((m) => ({ default: m.VisionStudio }))
);
const PromptForge = lazyWithRetry(() =>
  import('./components/PromptForge').then((m) => ({ default: m.PromptForge }))
);
const GeezTranslator = lazyWithRetry(() =>
  import('./components/GeezTranslator').then((m) => ({ default: m.GeezTranslator }))
);
const GeezCalligraphyStudio = lazyWithRetry(() =>
  import('./components/GeezCalligraphyStudio').then((m) => ({ default: m.GeezCalligraphyStudio }))
);
const Analytics = lazyWithRetry(() =>
  import('./components/Analytics').then((m) => ({ default: m.Analytics }))
);
const PaymentSystem = lazyWithRetry(() =>
  import('./components/PaymentSystem').then((m) => ({ default: m.PaymentSystem }))
);
const AssistanceSystem = lazyWithRetry(() =>
  import('./components/AssistanceSystem').then((m) => ({ default: m.AssistanceSystem }))
);
const ManagementHub = lazyWithRetry(() =>
  import('./components/ManagementHub').then((m) => ({ default: m.ManagementHub }))
);
const EducationPlatformView = lazyWithRetry(() =>
  import('./components/education/EducationPlatformView').then((m) => ({
    default: m.EducationPlatformView,
  }))
);
const BusinessHubView = lazyWithRetry(() =>
  import('./components/business/BusinessHubView').then((m) => ({ default: m.BusinessHubView }))
);
const CulturalExplorerView = lazyWithRetry(() =>
  import('./components/cultural/CulturalExplorerView').then((m) => ({
    default: m.CulturalExplorerView,
  }))
);
const SovereignVoiceAssistantScreen = lazyWithRetry(() =>
  import('./components/SovereignVoiceAssistantScreen').then((m) => ({
    default: m.SovereignVoiceAssistantScreen,
  }))
);
const AndroidAppInterfaceView = lazyWithRetry(() =>
  import('./components/AndroidAppInterfaceView').then((m) => ({
    default: m.AndroidAppInterfaceView,
  }))
);
const RewardsView = lazyWithRetry(() =>
  import('./components/RewardsView').then((m) => ({ default: m.RewardsView }))
);
const PhotoToVideoStudio = lazyWithRetry(() =>
  import('./components/PhotoToVideoStudio').then((m) => ({ default: m.PhotoToVideoStudio }))
);

const LazyTabFallback = (
  <div className="min-h-[40vh] flex items-center justify-center">
    <div className="w-7 h-7 rounded-full border-2 border-[#C5A059]/30 border-t-[#C5A059] animate-spin" />
  </div>
);

const MAIN_TABS: { id: AppTab; labelTi: string; labelEn: string }[] = [
  { id: 'android-app', labelTi: 'ኣንድሮይድ ሃብ (Android)', labelEn: 'Android' },
  { id: 'premiere', labelTi: 'ኣክሱማይት (Premiere)', labelEn: 'Premiere' },
  { id: 'business-hub', labelTi: 'ቢዝነስ (Business Hub)', labelEn: 'Business' },
  { id: 'cultural-explorer', labelTi: 'ባህላዊ ቅርሲ (Cultural AI)', labelEn: 'Culture' },
  { id: 'education', labelTi: 'ትምህርቲ (Academy)', labelEn: 'Education' },
  { id: 'chat', labelTi: 'ቻት (Chat)', labelEn: 'Chat' },
  { id: 'assistance', labelTi: 'ድምጺ ሓገዝ (Voice)', labelEn: 'Voice' },
  { id: 'payment', labelTi: 'ክፍሊት (Pay)', labelEn: 'Pay' },
  { id: 'vision', labelTi: 'ምስሊ (Vision)', labelEn: 'Vision' },
  { id: 'photo-to-video', labelTi: 'ስእሊ ናብ ቪድዮ (Video AI)', labelEn: 'Photo-to-Video' },
  { id: 'prompt-forge', labelTi: 'ፕሮምፕት (Forge)', labelEn: 'Forge' },
  { id: 'translator', labelTi: 'ትርጉም (Translate)', labelEn: 'Translate' },
  { id: 'calligraphy', labelTi: 'ጥበበ ፊደል (Calligraphy)', labelEn: 'Calligraphy' },
  { id: 'rewards', labelTi: 'ዓስብን ቦነስን (Rewards)', labelEn: 'Rewards' },
  { id: 'saved', labelTi: 'ተዓቂቡ (Saved)', labelEn: 'Saved' },
];

/**
 * Isolated Navbar connector: subscribes to unread counts, saved count, and voice active flag
 * without causing App or the active tab view to re-render when those counters change.
 */
const ConnectedNavbar: React.FC<{ isShowingFullOfflineDashboard: boolean }> = React.memo(
  ({ isShowingFullOfflineDashboard }) => {
    const { activeTab, homeTheme } = useNavigationState();
    const { user } = useAuthUser();
    const { isOffline } = useNetwork();
    const savedCount = useSavedInsightsCount();
    const unreadNotifCount = useNotificationUnreadCount();
    const isAlwaysListening = useIsAlwaysListening();
    const { toggleAlwaysListening } = useVoiceCommandActions();
    const actions = useAppActions();

    const handleSetActiveTab = useCallback(
      (tab: AppTab) => {
        triggerTabTapHaptic();
        actions.navigateTab(tab);
      },
      [actions]
    );

    const handleOpenPwa = useCallback(() => actions.openModal('pwa'), [actions]);
    const handleOpenUser = useCallback(() => actions.openModal('userProfile'), [actions]);
    const handleOpenSecurity = useCallback(() => actions.openModal('security'), [actions]);
    const handleOpenOnboarding = useCallback(() => actions.openModal('onboarding'), [actions]);
    const handleOpenAuth = useCallback((m: 'login' | 'signup') => actions.openAuthModal(m), [actions]);
    const handleOpenDrawer = useCallback(() => actions.openModal('drawer'), [actions]);
    const handleOpenNotifications = useCallback(() => actions.openModal('notificationCenter'), [actions]);
    const handleOpenVoice = useCallback(() => actions.openModal('voiceOverlay'), [actions]);
    const handleToggleVoice = useCallback(() => toggleAlwaysListening(), [toggleAlwaysListening]);
    const handleOpenDailyWisdom = useCallback(() => actions.openDailyWisdom(), [actions]);

    return (
      <Navbar
        activeTab={activeTab}
        setActiveTab={handleSetActiveTab}
        savedCount={savedCount}
        logoSrc={logoImg}
        homeTheme={homeTheme}
        onToggleHomeTheme={actions.toggleHomeTheme}
        onOpenPwaModal={handleOpenPwa}
        user={user}
        onOpenUserModal={handleOpenUser}
        onOpenSecurityModal={handleOpenSecurity}
        isOffline={isOffline}
        onOpenOnboardingModal={handleOpenOnboarding}
        onOpenAuthModal={handleOpenAuth}
        onOpenDrawer={handleOpenDrawer}
        unreadNotifCount={unreadNotifCount}
        onOpenNotifications={handleOpenNotifications}
        onOpenVoiceOverlay={handleOpenVoice}
        isAlwaysListening={isAlwaysListening}
        onToggleAlwaysListening={handleToggleVoice}
        onOpenDailyWisdom={handleOpenDailyWisdom}
      />
    );
  }
);

/**
 * Isolated BottomNav connector: only updates on activeTab or savedCount changes.
 */
const ConnectedBottomNav: React.FC = React.memo(() => {
  const { activeTab } = useNavigationState();
  const savedCount = useSavedInsightsCount();
  const actions = useAppActions();

  const handleOpenUser = useCallback(() => actions.openModal('userProfile'), [actions]);
  const handleOpenDrawer = useCallback(() => actions.openModal('drawer'), [actions]);
  const handleOpenHistory = useCallback(() => actions.openModal('history'), [actions]);

  return (
    <BottomNav
      activeTab={activeTab}
      setActiveTab={actions.navigateTab}
      savedCount={savedCount}
      onOpenUserModal={handleOpenUser}
      onOpenDrawer={handleOpenDrawer}
      onOpenHistory={handleOpenHistory}
    />
  );
});

/**
 * Granular tab wrappers so only views that display savedItems / unreadCount / voice state subscribe to them.
 */
const SavedTabView: React.FC = () => {
  const { savedItems, deleteInsight } = useSavedInsights();
  return <SavedInsights savedItems={savedItems} onDelete={deleteInsight} />;
};

const AnalyticsTabView: React.FC = () => {
  const { user } = useAuthUser();
  const { savedItems } = useSavedInsights();
  const actions = useAppActions();
  return <Analytics user={user} savedItems={savedItems} onNavigateTab={actions.navigateTab} />;
};

const PremiereTabView: React.FC = () => {
  const { activeTab, homeTheme } = useNavigationState();
  const { user, updateUser } = useAuthUser();
  const { isOffline } = useNetwork();
  const { saveInsight } = useSavedInsightsActions();
  const unreadNotifCount = useNotificationUnreadCount();
  const actions = useAppActions();

  return (
    <EritreanPremiereView
      activeTab={activeTab}
      setActiveTab={actions.navigateTab}
      homeTheme={homeTheme}
      onToggleHomeTheme={actions.toggleHomeTheme}
      user={user}
      isOffline={isOffline}
      onUpdateUser={updateUser}
      onSaveInsight={saveInsight}
      onOpenAuthModal={actions.openAuthModal}
      onOpenUserModal={() => actions.openModal('userProfile')}
      onOpenOnboardingModal={() => actions.openModal('onboarding')}
      onOpenSecurityModal={() => actions.openModal('security')}
      onOpenJobSearch={() => actions.openModal('jobSearch')}
      onOpenScholarship={() => actions.openScholarship()}
      onOpenLegalAdvisor={() => actions.openModal('legalAdvisor')}
      onOpenMechanic={() => actions.openModal('mechanic')}
      onOpenHistory={() => actions.openModal('history')}
      onOpenPremiumModal={() => actions.openModal('premium')}
      onOpenDrawer={() => actions.openModal('drawer')}
      unreadNotifCount={unreadNotifCount}
      onOpenNotifications={() => actions.openModal('notificationCenter')}
      onOpenVideoTranslator={() => actions.openModal('videoTranslator')}
      onOpenVoiceOverlay={() => actions.openModal('voiceOverlay')}
      onOpenHibernation={() => actions.openModal('hibernation')}
      onOpenBiometricLock={() => actions.openModal('biometricLock')}
      onOpenBugReport={() => actions.openBugReport('menu')}
      onOpenDailyWisdom={() => actions.openDailyWisdom()}
      onOpenTranslatorFeature={actions.openTranslatorFeature}
      onOpenTranslatorWithText={actions.openTranslatorWithText}
      onSelectPromptForChat={actions.selectPromptForChat}
    />
  );
};

const VoiceAssistantTabView: React.FC = () => {
  const { user, updateUser } = useAuthUser();
  const isAlwaysListening = useIsAlwaysListening();
  const { toggleAlwaysListening } = useVoiceCommandActions();
  const actions = useAppActions();

  return (
    <div className="py-2 px-1 sm:px-4 flex justify-center">
      <SovereignVoiceAssistantScreen
        isOpen={true}
        standalone={true}
        onClose={() => actions.navigateTab('premiere')}
        onNavigateTab={actions.navigateTab}
        isAlwaysListening={isAlwaysListening}
        onToggleAlwaysListening={() => toggleAlwaysListening()}
        user={user}
        onUpdateUser={updateUser}
      />
    </div>
  );
};

const ActiveTabRouter: React.FC = React.memo(() => {
  const {
    activeTab,
    paymentSubTab,
    translatorInitialFeature,
    translatorFeatureVersion,
    pendingChatPrompt,
    pendingTranslationText,
  } = useNavigationState();
  const { user, authSessionVersion, updateUser } = useAuthUser();
  const { isProOrHigher } = useSubscription();
  const { isOffline, setIsOfflineDashboardMinimized } = useNetwork();
  const { saveInsight } = useSavedInsightsActions();
  const actions = useAppActions();

  return (
    <LazyChunkErrorBoundary
      resetKey={`${activeTab}-${authSessionVersion}`}
      onReturnOffline={isOffline ? () => setIsOfflineDashboardMinimized(false) : undefined}
    >
      <Suspense fallback={LazyTabFallback}>
        {activeTab === 'chat' && (
          <ObeliskChat
            onSaveInsight={saveInsight}
            initialPrompt={pendingChatPrompt}
            onPromptConsumed={actions.clearPendingChatPrompt}
            user={user}
            onOpenAuthModal={actions.openAuthModal}
          />
        )}

        {activeTab === 'assistance' && (
          <AssistanceSystem
            onNavigateTab={actions.navigateTab}
            onSaveInsight={saveInsight}
            onOpenUserModal={() => actions.openModal('userProfile')}
            onOpenSecurityModal={() => actions.openModal('security')}
            onOpenPaymentModal={() => actions.navigateTab('payment')}
            onUpdateUser={updateUser}
            user={user}
          />
        )}

        {activeTab === 'payment' && (
          <PaymentSystem
            onSaveInsight={saveInsight}
            user={user}
            onOpenAuthModal={actions.openAuthModal}
            initialSubTab={paymentSubTab}
          />
        )}

        {activeTab === 'vision' && (
          <VisionStudio
            onSaveInsight={saveInsight}
            user={user}
            onOpenAuthModal={actions.openAuthModal}
            onNavigateTab={actions.navigateTab}
          />
        )}

        {activeTab === 'photo-to-video' && (
          <PhotoToVideoStudio
            user={user}
            onSaveInsight={saveInsight}
            onOpenAuthModal={actions.openAuthModal}
          />
        )}

        {activeTab === 'prompt-forge' && (
          <PromptForge onSaveInsight={saveInsight} logoSrc={logoImg} />
        )}

        {activeTab === 'translator' && (
          <GeezTranslator
            onSaveInsight={saveInsight}
            user={user}
            onOpenAuthModal={actions.openAuthModal}
            initialFeature={translatorInitialFeature}
            featureRequestVersion={translatorFeatureVersion}
            initialInputText={pendingTranslationText}
            onInitialInputConsumed={actions.clearPendingTranslationText}
            onOpenPaymentCheckout={() => actions.openPaymentWithSubTab('saas-plans')}
          />
        )}

        {activeTab === 'calligraphy' && (
          <GeezCalligraphyStudio
            user={user}
            onSaveInsight={saveInsight}
            onNavigateTab={actions.navigateTab}
          />
        )}

        {activeTab === 'education' && (
          <EducationPlatformView
            onOpenPricingModal={() => actions.openModal('premium')}
            isUserSubscribed={isProOrHigher}
            preferredLanguage={user.preferredLanguage?.startsWith('ti') ? 'ti' : 'en'}
          />
        )}

        {activeTab === 'business-hub' && (
          <BusinessHubView
            isPro={isProOrHigher}
            onOpenUpgradeModal={() => actions.openModal('premium')}
          />
        )}

        {activeTab === 'cultural-explorer' && (
          <CulturalExplorerView
            isPro={isProOrHigher}
            onOpenUpgradeModal={() => actions.openModal('premium')}
          />
        )}

        {activeTab === 'premiere' && <PremiereTabView />}

        {activeTab === 'voice-assistant' && <VoiceAssistantTabView />}

        {activeTab === 'saved' && <SavedTabView />}

        {activeTab === 'analytics' && <AnalyticsTabView />}

        {(activeTab === 'management' || activeTab === 'user-management') && (
          <ManagementHub initialSection="users" user={user} onUpdateUser={updateUser} />
        )}

        {activeTab === 'payment-management' && (
          <ManagementHub initialSection="payments" user={user} onUpdateUser={updateUser} />
        )}

        {activeTab === 'customer-management' && (
          <ManagementHub initialSection="customers" user={user} onUpdateUser={updateUser} />
        )}

        {activeTab === 'admin-config' && (
          <ManagementHub initialSection="admin-config" user={user} onUpdateUser={updateUser} />
        )}

        {activeTab === 'system-activity' && (
          <ManagementHub initialSection="activity" user={user} onUpdateUser={updateUser} />
        )}

        {activeTab === 'android-app' && (
          <AndroidAppInterfaceView
            user={user}
            onNavigateTab={actions.navigateTab}
            onOpenAuthModal={actions.openAuthModal}
            onOpenPaymentMethods={() => actions.openPaymentWithSubTab('payment-methods')}
            onUpdateUser={updateUser}
            onOpenTranslatorFeature={actions.openTranslatorFeature}
          />
        )}

        {activeTab === 'rewards' && (
          <RewardsView
            onBack={() => actions.navigateTab('premiere')}
            onNavigateTab={actions.navigateTab}
            user={user}
          />
        )}
      </Suspense>
    </LazyChunkErrorBoundary>
  );
});

export default function App() {
  const { activeTab } = useNavigationState();
  const actions = useAppActions();
  const { isOffline, isOfflineDashboardMinimized } = useNetwork();

  const prefersReducedMotion = useReducedMotion();
  const { isPowerSavingActive } = useBatterySaver();
  const { activeAesthetic } = useAdaptiveTheme();
  const isGoldAmbient = activeAesthetic === 'gold-ambient';
  const reduceAnimations = Boolean(prefersReducedMotion || isPowerSavingActive);

  // Touch Gesture Swipe Navigation State & Physics Handlers
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchStartTime = useRef<number>(0);
  const lastMoveXRef = useRef<number>(0);
  const lastMoveTimeRef = useRef<number>(0);
  const velocityXRef = useRef<number>(0); // px/s
  const gestureAxisRef = useRef<SwipeGestureAxis>('pending');
  const swipeThresholdFiredRef = useRef<boolean>(false);
  const swipeThresholdPxRef = useRef<number>(getSwipeThresholdPx());

  // Live motion value driving interactive horizontal follow & spring snap-back
  const dragX = useMotionValue(0);
  const dragScale = useTransform(dragX, [-160, 0, 160], [0.988, 1, 0.988]);
  const dragOpacity = useTransform(dragX, [-180, 0, 180], [0.9, 1, 0.9]);

  const activeTabRef = useRef<AppTab>(activeTab);
  activeTabRef.current = activeTab;

  useEffect(() => {
    const onHapticsUpdated = (event: Event) => {
      const detail = (event as CustomEvent<HapticSettings>).detail;
      swipeThresholdPxRef.current = detail?.swipeThresholdPx ?? getSwipeThresholdPx();
    };
    window.addEventListener(HAPTICS_SETTINGS_EVENT, onHapticsUpdated);
    return () => window.removeEventListener(HAPTICS_SETTINGS_EVENT, onHapticsUpdated);
  }, []);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      recordTapHeatmapPointFromEvent(event, activeTabRef.current);
    };
    document.addEventListener('pointerdown', handlePointerDown, { capture: true, passive: true });
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, { capture: true });
    };
  }, []);

  const [swipeNotice, setSwipeNotice] = useState<{
    label: string;
    icon: 'left' | 'right';
    hapticFired?: boolean;
  } | null>(null);
  const [dragPreview, setDragPreview] = useState<{
    label: string;
    direction: 'left' | 'right';
    willCommit: boolean;
  } | null>(null);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right'>('left');

  const triggerSwipeNotice = useCallback(
    (label: string, iconDir: 'left' | 'right', hapticFired?: boolean) => {
      setSwipeNotice({ label, icon: iconDir, hapticFired });
      window.setTimeout(() => setSwipeNotice(null), 1800);
    },
    []
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('input, textarea, select, button, [role="button"], [data-no-swipe]')) {
        touchStartX.current = null;
        touchStartY.current = null;
        gestureAxisRef.current = 'pending';
        swipeThresholdFiredRef.current = false;
        return;
      }
      const x = e.touches[0].clientX;
      const y = e.touches[0].clientY;
      const now = Date.now();
      dragX.stop();
      touchStartX.current = x;
      touchStartY.current = y;
      touchStartTime.current = now;
      lastMoveXRef.current = x;
      lastMoveTimeRef.current = now;
      velocityXRef.current = 0;
      gestureAxisRef.current = 'pending';
      swipeThresholdFiredRef.current = false;
      setDragPreview(null);
    },
    [dragX]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartX.current === null || touchStartY.current === null) {
        return;
      }

      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;
      const deltaX = currentX - touchStartX.current;
      const deltaY = currentY - touchStartY.current;
      const now = Date.now();

      // Determine gesture axis lock cleanly so vertical scrolling stays 100% crisp
      if (gestureAxisRef.current === 'pending') {
        if (Math.abs(deltaY) > 10 && Math.abs(deltaY) > Math.abs(deltaX)) {
          gestureAxisRef.current = 'vertical';
          return;
        }
        if (Math.abs(deltaX) > 10 && Math.abs(deltaX) > Math.abs(deltaY) * 1.15) {
          const currentIndex = MAIN_TABS.findIndex((t) => t.id === activeTab);
          if (currentIndex === -1) {
            gestureAxisRef.current = 'vertical';
            return;
          }
          gestureAxisRef.current = 'horizontal';
        } else {
          return;
        }
      }

      if (gestureAxisRef.current !== 'horizontal') {
        return;
      }

      // Compute smoothed instantaneous velocity (px/s)
      const dt = now - lastMoveTimeRef.current;
      if (dt > 0) {
        const instantVelocity = ((currentX - lastMoveXRef.current) / dt) * 1000;
        velocityXRef.current = velocityXRef.current * 0.35 + instantVelocity * 0.65;
        lastMoveXRef.current = currentX;
        lastMoveTimeRef.current = now;
      }

      const thresholdPx = swipeThresholdPxRef.current;
      if (!reduceAnimations) {
        dragX.set(computeDampedDragX(deltaX, thresholdPx));
      }

      const currentIndex = MAIN_TABS.findIndex((t) => t.id === activeTab);
      if (currentIndex !== -1 && Math.abs(deltaX) > 18) {
        const direction: 'left' | 'right' = deltaX < 0 ? 'left' : 'right';
        const targetTab =
          direction === 'left'
            ? MAIN_TABS[(currentIndex + 1) % MAIN_TABS.length]
            : MAIN_TABS[(currentIndex - 1 + MAIN_TABS.length) % MAIN_TABS.length];
        const willCommit = Math.abs(deltaX) >= thresholdPx;

        setDragPreview((prev) =>
          prev &&
          prev.label === targetTab.labelEn &&
          prev.direction === direction &&
          prev.willCommit === willCommit
            ? prev
            : { label: targetTab.labelEn, direction, willCommit }
        );
      } else {
        setDragPreview(null);
      }

      if (!swipeThresholdFiredRef.current && Math.abs(deltaX) >= thresholdPx) {
        swipeThresholdFiredRef.current = true;
        triggerSwipeThresholdHaptic();
      } else if (swipeThresholdFiredRef.current && Math.abs(deltaX) < thresholdPx * 0.75) {
        swipeThresholdFiredRef.current = false;
      }
    },
    [activeTab, dragX, reduceAnimations]
  );

  const springSnapBack = useCallback(
    (releaseVelocity: number) => {
      if (reduceAnimations) {
        dragX.set(0);
        return;
      }
      animate(dragX, 0, {
        type: 'spring',
        stiffness: 460,
        damping: 34,
        mass: 0.8,
        velocity: releaseVelocity,
      });
    },
    [dragX, reduceAnimations]
  );

  const handleTouchCancel = useCallback(() => {
    touchStartX.current = null;
    touchStartY.current = null;
    gestureAxisRef.current = 'pending';
    swipeThresholdFiredRef.current = false;
    setDragPreview(null);
    springSnapBack(0);
  }, [springSnapBack]);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartX.current === null || touchStartY.current === null) return;

      const endX = e.changedTouches[0].clientX;
      const deltaX = endX - touchStartX.current;
      const now = Date.now();
      const axis = gestureAxisRef.current;
      const thresholdPx = swipeThresholdPxRef.current;

      // Decay velocity to 0 if the user paused mid-way before lifting their finger
      const msSinceLastMove = now - lastMoveTimeRef.current;
      const releaseVelocity =
        msSinceLastMove > SWIPE_PAUSE_DECAY_MS ? 0 : velocityXRef.current;

      touchStartX.current = null;
      touchStartY.current = null;
      gestureAxisRef.current = 'pending';
      swipeThresholdFiredRef.current = false;
      setDragPreview(null);

      const decision = computeSwipeSnapDecision({
        deltaX,
        velocityX: releaseVelocity,
        thresholdPx,
        axis,
      });

      const currentIndex = MAIN_TABS.findIndex((t) => t.id === activeTab);
      if (!decision.shouldTransition || currentIndex === -1) {
        if (axis === 'horizontal' && Math.abs(deltaX) >= 12) {
          recordSwipeAttempt({
            fromTab: activeTab,
            distancePx: Math.abs(deltaX),
            velocityPxS: Math.abs(releaseVelocity),
            thresholdPx,
            succeeded: false,
            direction: decision.direction,
          });
        }
        // Snap cleanly back to the current tab with spring physics
        springSnapBack(releaseVelocity);
        return;
      }

      // Snap forward cleanly into the next or previous tab
      dragX.set(0);
      if (decision.direction === 'left') {
        const nextIndex = (currentIndex + 1) % MAIN_TABS.length;
        const nextTab = MAIN_TABS[nextIndex];
        recordSwipeAttempt({
          fromTab: activeTab,
          toTab: nextTab.id,
          distancePx: Math.abs(deltaX),
          velocityPxS: Math.abs(releaseVelocity),
          thresholdPx,
          succeeded: true,
          direction: 'left',
        });
        setSwipeDirection('left');
        actions.navigateTab(nextTab.id);
        const hapticFired = triggerSwipeTransitionHaptic('left');
        triggerSwipeNotice(nextTab.labelTi, 'right', hapticFired);
      } else {
        const prevIndex = (currentIndex - 1 + MAIN_TABS.length) % MAIN_TABS.length;
        const prevTab = MAIN_TABS[prevIndex];
        recordSwipeAttempt({
          fromTab: activeTab,
          toTab: prevTab.id,
          distancePx: Math.abs(deltaX),
          velocityPxS: Math.abs(releaseVelocity),
          thresholdPx,
          succeeded: true,
          direction: 'right',
        });
        setSwipeDirection('right');
        actions.navigateTab(prevTab.id);
        const hapticFired = triggerSwipeTransitionHaptic('right');
        triggerSwipeNotice(prevTab.labelTi, 'left', hapticFired);
      }
    },
    [activeTab, actions, dragX, springSnapBack, triggerSwipeNotice]
  );

  const isShowingFullOfflineDashboard = isOffline && !isOfflineDashboardMinimized;
  const isLightHome = activeTab === 'premiere' && !isShowingFullOfflineDashboard;

  return (
    <MotionConfig reducedMotion={isPowerSavingActive ? 'always' : 'user'}>
      <div
        data-time-aesthetic={activeAesthetic}
        className={`min-h-screen font-sans flex flex-col relative overflow-x-hidden antialiased transition-colors duration-300 ${
          isLightHome
            ? isGoldAmbient
              ? 'bg-gradient-to-b from-[#FFFDF7] via-[#FBF3DF] to-[#F6EBD0] text-slate-900 selection:bg-amber-400/25 selection:text-slate-900'
              : 'bg-gradient-to-b from-[#04060D] via-[#070B16] to-[#0B1120] text-slate-100 selection:bg-blue-500/20 selection:text-white'
            : isGoldAmbient
            ? 'bg-[#120E08] text-slate-100 selection:bg-[#E1C47D]/30 selection:text-[#F3E5AB]'
            : 'bg-[#040508] text-slate-100 selection:bg-[#C5A059]/30 selection:text-[#F3E5AB]'
        }`}
      >
      {/* Background idle prefetch of OfflineModeDashboard while online */}
      <OfflineDashboardPrefetcher />

      {/* Unified Ambient Depth tuned to Time-of-Day Aesthetic */}
      {isLightHome ? (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          {isGoldAmbient ? (
            <>
              <div className="absolute -top-24 left-1/4 w-[560px] h-[360px] bg-amber-300/30 blur-[120px] rounded-full pointer-events-none" />
              <div className="absolute top-1/3 right-0 w-[460px] h-[380px] bg-orange-200/30 blur-[120px] rounded-full pointer-events-none" />
            </>
          ) : (
            <>
              <div className="absolute -top-24 left-1/4 w-[520px] h-[340px] bg-indigo-900/25 blur-[120px] rounded-full pointer-events-none" />
              <div className="absolute top-1/3 right-0 w-[440px] h-[380px] bg-slate-800/30 blur-[130px] rounded-full pointer-events-none" />
            </>
          )}
        </div>
      ) : (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          {isGoldAmbient ? (
            <>
              <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[460px] bg-gradient-to-b from-[#E1C47D]/18 via-[#C5A059]/10 to-transparent blur-[140px] rounded-full pointer-events-none" />
              <div className="absolute bottom-0 right-0 w-[520px] h-[520px] bg-amber-500/[0.06] blur-[160px] rounded-full pointer-events-none" />
            </>
          ) : (
            <>
              <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[850px] h-[440px] bg-gradient-to-b from-[#0F172A]/45 via-[#8E6D28]/6 to-transparent blur-[150px] rounded-full pointer-events-none" />
              <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-indigo-950/[0.14] blur-[160px] rounded-full pointer-events-none" />
            </>
          )}
        </div>
      )}

      {/* Compact Offline Bar when user minimizes the Offline Mode Dashboard to browse tabs */}
      <OfflineModeHost mode="bar" />

      {/* Navigation Header */}
      <ConnectedNavbar isShowingFullOfflineDashboard={isShowingFullOfflineDashboard} />

      {/* Offline Mode Dashboard OR Main App Content View Area */}
      {isShowingFullOfflineDashboard ? (
        <OfflineModeHost mode="full" />
      ) : (
        <main
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchCancel}
          className={
            isLightHome
              ? 'flex-1 w-full mx-auto relative touch-pan-y overflow-x-hidden'
              : 'flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-28 sm:pb-32 relative touch-pan-y overflow-x-hidden'
          }
        >
          {/* Interactive Mid-Swipe Snap Preview Indicator */}
          <AnimatePresence>
            {dragPreview && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.14 }}
                aria-hidden="true"
                className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-3.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-2 pointer-events-none shadow-lg backdrop-blur-md ${
                  dragPreview.willCommit
                    ? 'bg-[#17130A]/95 border-[#C5A059] text-[#F3E5AB]'
                    : 'bg-slate-900/90 border-slate-700 text-slate-200'
                }`}
              >
                {dragPreview.direction === 'right' && <ChevronLeft className="w-3.5 h-3.5 shrink-0" />}
                <span>
                  {dragPreview.willCommit
                    ? `Release for ${dragPreview.label}`
                    : `Keep dragging · ${dragPreview.label}`}
                </span>
                {dragPreview.direction === 'left' && <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Floating Touch Swipe Feedback Banner */}
          <AnimatePresence>
            {swipeNotice && (
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.9 }}
                className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-[#17130A] border-2 border-[#C5A059] px-4 py-2 rounded-2xl shadow-2xl text-amber-200 text-xs font-bold flex items-center space-x-2.5 pointer-events-none backdrop-blur-md"
              >
                <Hand className="w-4 h-4 text-[#C5A059] animate-bounce shrink-0" />
                <div className="flex items-center space-x-1">
                  {swipeNotice.icon === 'left' && (
                    <ChevronLeft className="w-4 h-4 text-[#C5A059] animate-pulse" />
                  )}
                  <span>{swipeNotice.label}</span>
                  {swipeNotice.icon === 'right' && (
                    <ChevronRight className="w-4 h-4 text-[#C5A059] animate-pulse" />
                  )}
                </div>
                {swipeNotice.hapticFired && (
                  <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/40 text-[9px] font-mono text-emerald-300">
                    <Smartphone className="w-2.5 h-2.5" />
                    <span>HAPTIC</span>
                  </span>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Animated Slide Tab Container with Live Snap-to-Tab Spring Physics */}
          <motion.div
            style={
              reduceAnimations
                ? undefined
                : { x: dragX, scale: dragScale, opacity: dragOpacity }
            }
            className="relative w-full will-change-transform"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={`gold-veil-${activeTab}`}
                initial={{ opacity: 0.65, scale: 0.96 }}
                animate={{ opacity: 0, scale: 1.05 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
                className="absolute -top-8 left-1/2 -translate-x-1/2 w-full max-w-3xl h-36 bg-gradient-to-b from-amber-400/20 via-[#E1C47D]/10 to-transparent blur-3xl pointer-events-none rounded-full z-0"
              />
            </AnimatePresence>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={
                  reduceAnimations
                    ? { opacity: 0 }
                    : {
                        opacity: 0,
                        x: swipeDirection === 'left' ? 42 : -42,
                        scale: 0.985,
                      }
                }
                animate={
                  reduceAnimations
                    ? { opacity: 1 }
                    : {
                        opacity: 1,
                        x: 0,
                        scale: 1,
                      }
                }
                exit={
                  reduceAnimations
                    ? { opacity: 0 }
                    : {
                        opacity: 0,
                        x: swipeDirection === 'left' ? -36 : 36,
                        scale: 0.985,
                      }
                }
                transition={
                  reduceAnimations
                    ? { duration: 0.15 }
                    : {
                        type: 'spring',
                        stiffness: 380,
                        damping: 32,
                        mass: 0.85,
                      }
                }
                className="relative z-10"
              >
                <motion.div
                  initial={{ opacity: 0.85, scaleX: 0.2, x: '-50%' }}
                  animate={{ opacity: 0, scaleX: 1.1, x: '50%' }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[1.5px] bg-gradient-to-r from-transparent via-[#E1C47D] to-transparent pointer-events-none z-20 shadow-[0_0_10px_#E1C47D]"
                />
                <ActiveTabRouter />
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </main>
      )}

      {/* Isolated On-Demand Modals, Drawer, Paywall, Idle Guard, Shake Detector & Push Toasts */}
      <AppModalsHost />

      {/* Isolated Voice HUD Overlay, Keyboard Shortcut & Floating Always-Listening Pill */}
      <AppVoiceCommandHost />

      {/* Floating Bottom Navigation Bar */}
      <ConnectedBottomNav />
      </div>
    </MotionConfig>
  );
}
