import React, { Suspense, useCallback, useEffect } from 'react';
import { AppTab } from '../types';
import { LazyChunkErrorBoundary, lazyWithRetry } from './LazyChunkBoundary';
import { useAppActions, useModalState, useNavigationState } from '../context/AppNavigationContext';
import { useAuthUser } from '../context/AuthUserContext';
import { useNetwork } from '../context/NetworkContext';
import { useSavedInsightsActions } from '../context/SavedInsightsContext';
import {
  useActivePushToast,
  useNotificationActions,
  useNotificationData,
  useNotificationUnreadCount,
} from '../context/NotificationContext';
import { useSubscription } from '../context/SubscriptionContext';
import { useIdleTimer } from '../hooks/useIdleTimer';
import { useShakeDetector } from '../hooks/useShakeDetector';
import { getDailyWisdomStats, onDailyWisdomTrigger } from '../services/dailyWisdomState';
import { triggerTabTapHaptic } from '../utils/haptics';
import logoImg from '../assets/images/axumite_3d_luxury_logo_1787505687476.jpg';

// All modals, drawers, paywalls, and toasts are strictly lazy-loaded on demand
const SovereignSideDrawer = lazyWithRetry(() =>
  import('./SovereignSideDrawer').then((m) => ({ default: m.SovereignSideDrawer }))
);
const AuthModal = lazyWithRetry(() =>
  import('./AuthModal').then((m) => ({ default: m.AuthModal }))
);
const UserManagementModal = lazyWithRetry(() =>
  import('./UserManagementModal').then((m) => ({ default: m.UserManagementModal }))
);
const SecurityManagementModal = lazyWithRetry(() =>
  import('./SecurityManagementModal').then((m) => ({ default: m.SecurityManagementModal }))
);
const TigrinyaOnboardingModal = lazyWithRetry(() =>
  import('./TigrinyaOnboardingModal').then((m) => ({ default: m.TigrinyaOnboardingModal }))
);
const BrandHeroModal = lazyWithRetry(() =>
  import('./BrandHeroModal').then((m) => ({ default: m.BrandHeroModal }))
);
const IdleWarningModal = lazyWithRetry(() =>
  import('./IdleWarningModal').then((m) => ({ default: m.IdleWarningModal }))
);
const AxumiteHibernationScreen = lazyWithRetry(() =>
  import('./AxumiteHibernationScreen').then((m) => ({ default: m.AxumiteHibernationScreen }))
);
const BiometricVerificationScreen = lazyWithRetry(() =>
  import('./BiometricVerificationScreen').then((m) => ({ default: m.BiometricVerificationScreen }))
);
const BugReportModal = lazyWithRetry(() =>
  import('./BugReportModal').then((m) => ({ default: m.BugReportModal }))
);
const JobSearchModal = lazyWithRetry(() =>
  import('./JobSearchModal').then((m) => ({ default: m.JobSearchModal }))
);
const LegalAdvisorModal = lazyWithRetry(() =>
  import('./LegalAdvisorModal').then((m) => ({ default: m.LegalAdvisorModal }))
);
const MechanicDiagnosisModal = lazyWithRetry(() =>
  import('./MechanicDiagnosisModal').then((m) => ({ default: m.MechanicDiagnosisModal }))
);
const HistoryModal = lazyWithRetry(() =>
  import('./HistoryModal').then((m) => ({ default: m.HistoryModal }))
);
const PricingPlanComparisonModal = lazyWithRetry(() =>
  import('./PricingPlanComparisonModal').then((m) => ({ default: m.PricingPlanComparisonModal }))
);
const ScholarshipModal = lazyWithRetry(() =>
  import('./ScholarshipModal').then((m) => ({ default: m.ScholarshipModal }))
);
const NotificationCenterModal = lazyWithRetry(() =>
  import('./NotificationCenterModal').then((m) => ({ default: m.NotificationCenterModal }))
);
const WeeklySummaryModal = lazyWithRetry(() =>
  import('./WeeklySummaryModal').then((m) => ({ default: m.WeeklySummaryModal }))
);
const AiVideoTranslatorModal = lazyWithRetry(() =>
  import('./AiVideoTranslatorModal').then((m) => ({ default: m.AiVideoTranslatorModal }))
);
const UserFileManagerModal = lazyWithRetry(() =>
  import('./UserFileManagerModal').then((m) => ({ default: m.UserFileManagerModal }))
);
const DailyWisdomLoginModal = lazyWithRetry(() =>
  import('./DailyWisdomLoginModal').then((m) => ({ default: m.DailyWisdomLoginModal }))
);
const PwaInstallModal = lazyWithRetry(() =>
  import('./PwaInstallModal').then((m) => ({ default: m.PwaInstallModal }))
);
const SubscriptionGateModal = lazyWithRetry(() =>
  import('./SubscriptionGateModal').then((m) => ({ default: m.SubscriptionGateModal }))
);
const PushNotificationToast = lazyWithRetry(() =>
  import('./PushNotificationToast').then((m) => ({ default: m.PushNotificationToast }))
);

/**
 * Isolated 30-minute Idle Security Guard.
 * Countdown ticks during the 60s warning window only re-render this small component.
 */
const IdleSecurityGuard: React.FC = React.memo(() => {
  const { user, logoutUser } = useAuthUser();
  const actions = useAppActions();

  const handleIdleAutoLogout = useCallback(() => {
    if (user?.isLoggedIn) {
      logoutUser();
      actions.openAuthModal(
        'login',
        '🔒 ድሕንነትኩም ንምሕላው፡ ብሰንኪ 30 ደቓይቕ ዘይምንቅስቓስ ብኣውቶማቲክ ወጺእኩም ኣለኹም (Logged out automatically after 30 minutes of inactivity for your account security. Please sign in again).'
      );
    }
  }, [user?.isLoggedIn, logoutUser, actions]);

  const { remainingSeconds, isWarning, formattedRemaining, resetTimer } = useIdleTimer({
    timeoutMs: 30 * 60 * 1000,
    warningMs: 60 * 1000,
    isLoggedIn: !!user?.isLoggedIn,
    onIdle: handleIdleAutoLogout,
  });

  if (!isWarning || !user?.isLoggedIn) return null;

  return (
    <Suspense fallback={null}>
      <IdleWarningModal
        isOpen={true}
        remainingSeconds={remainingSeconds}
        formattedRemaining={formattedRemaining}
        onStayLoggedIn={resetTimer}
        onLogoutNow={handleIdleAutoLogout}
        onEnterHibernation={() => {
          resetTimer();
          actions.openModal('hibernation');
        }}
      />
    </Suspense>
  );
});

/**
 * Isolated Shake-to-Report Detector & Diagnostics Modal Host.
 * Accelerometer state updates are strictly gated on `trackLiveAcceleration: isBugReportOpen`,
 * preventing 12.5 Hz background re-renders across the application.
 */
const ShakeBugReportHost: React.FC = React.memo(() => {
  const modals = useModalState();
  const { activeTab } = useNavigationState();
  const { user } = useAuthUser();
  const actions = useAppActions();

  const {
    simulateShake,
    currentAcceleration,
    getLatestAcceleration,
    sensitivity,
    setSensitivity,
  } = useShakeDetector({
    enabled: true,
    threshold: 20,
    trackLiveAcceleration: modals.bugReport,
    onShake: (data) => {
      actions.openBugReport('shake', data.velocity, data.acceleration);
    },
  });

  if (!modals.bugReport) return null;

  return (
    <Suspense fallback={null}>
      <BugReportModal
        isOpen={modals.bugReport}
        onClose={() => actions.closeModal('bugReport')}
        user={user}
        activeTab={activeTab}
        triggerSource={modals.bugTriggerSource}
        shakeVelocity={modals.lastShakeVelocity}
        sensorSample={modals.shakeSensorSample || currentAcceleration || getLatestAcceleration()}
        onSimulateShake={simulateShake}
        shakeSensitivity={sensitivity}
        onUpdateSensitivity={setSensitivity}
      />
    </Suspense>
  );
});

/**
 * Isolated Daily Wisdom Trigger Watcher (uses lightweight dailyWisdomState.ts so the
 * 21.8 KB manuscript quotes dataset stays out of the initial entry bundle).
 */
const DailyWisdomAutoTrigger: React.FC = React.memo(() => {
  const { user } = useAuthUser();
  const actions = useAppActions();

  useEffect(() => {
    const unsubscribe = onDailyWisdomTrigger((quote) => {
      actions.openDailyWisdom(quote);
    });

    if (user?.isLoggedIn) {
      const stats = getDailyWisdomStats();
      if (!stats.hasSeenToday) {
        const timer = setTimeout(() => {
          actions.openDailyWisdom();
        }, 1500);
        return () => {
          clearTimeout(timer);
          unsubscribe();
        };
      }
    }

    return () => {
      unsubscribe();
    };
  }, [user?.isLoggedIn, actions]);

  return null;
});

/**
 * Isolated Push Notification Toast Host: only re-renders when activePushToast changes,
 * and lazy-loads PushNotificationToast.tsx (13.6 KB) only when a toast is actually visible.
 */
const PushNotificationHost: React.FC = React.memo(() => {
  const activePushToast = useActivePushToast();
  const { dismissToast, prepareWeeklySummary } = useNotificationActions();
  const actions = useAppActions();

  if (!activePushToast) return null;

  return (
    <Suspense fallback={null}>
      <PushNotificationToast
        notification={activePushToast}
        onClose={dismissToast}
        onActionClick={(notif) => {
          dismissToast();
          if (notif.category === 'weekly_summary' || notif.actionType === 'open_weekly_summary') {
            prepareWeeklySummary(notif.weeklySummary);
            actions.openModal('weeklySummary');
          } else if (notif.category === 'scholarship') {
            actions.openScholarship(notif.scholarshipId);
          } else if (notif.category === 'payment_failed' || notif.actionType === 'open_payment') {
            actions.setActiveTabRaw('payment');
          } else {
            actions.openModal('notificationCenter');
          }
        }}
      />
    </Suspense>
  );
});

/**
 * Isolated Subscription Paywall Host: lazy-loads SubscriptionGateModal (5.8 KB) only when triggered.
 */
const SubscriptionPaywallHost: React.FC = React.memo(() => {
  const { activePaywallFeature } = useSubscription();
  const actions = useAppActions();

  if (!activePaywallFeature) return null;

  return (
    <Suspense fallback={null}>
      <SubscriptionGateModal onOpenPricingPlans={() => actions.openModal('premium')} />
    </Suspense>
  );
});

/**
 * Isolated Notification Center & Weekly Summary Modal Host (subscribes to NotificationData only when mounted).
 */
const NotificationModalsHost: React.FC = React.memo(() => {
  const modals = useModalState();
  const actions = useAppActions();
  const { user } = useAuthUser();
  const { notifications, notificationPrefs, weeklySummaryData } = useNotificationData();
  const {
    updateNotifications,
    updateNotificationPrefs,
    prepareWeeklySummary,
    triggerWeeklySummary,
    triggerTestPushNotification,
  } = useNotificationActions();

  if (!modals.notificationCenter && !modals.weeklySummary) return null;

  return (
    <Suspense fallback={null}>
      {modals.notificationCenter && (
        <NotificationCenterModal
          isOpen={modals.notificationCenter}
          onClose={() => actions.closeModal('notificationCenter')}
          notifications={notifications}
          preferences={notificationPrefs}
          onUpdateNotifications={updateNotifications}
          onUpdatePreferences={updateNotificationPrefs}
          onOpenScholarshipOpportunity={(id) => {
            actions.closeModal('notificationCenter');
            actions.openScholarship(id);
          }}
          onOpenPaymentManagement={() => {
            actions.closeModal('notificationCenter');
            actions.setActiveTabRaw('payment');
          }}
          onOpenWeeklySummary={(data) => {
            actions.closeModal('notificationCenter');
            prepareWeeklySummary(data);
            actions.openModal('weeklySummary');
          }}
          onTriggerWeeklySummary={triggerWeeklySummary}
          onNavigateTab={(tab) => {
            actions.closeModal('notificationCenter');
            actions.navigateTab(tab as AppTab);
          }}
          onTriggerTestNotification={triggerTestPushNotification}
          user={user}
        />
      )}

      {modals.weeklySummary && (
        <WeeklySummaryModal
          isOpen={modals.weeklySummary}
          onClose={() => actions.closeModal('weeklySummary')}
          summaryData={weeklySummaryData}
          user={user}
          onNavigateTab={(tab) => {
            actions.closeModal('weeklySummary');
            actions.navigateTab(tab as AppTab);
          }}
        />
      )}
    </Suspense>
  );
});

/**
 * Isolated Side Drawer Host (only subscribes to unreadCount when drawer opens).
 */
const SideDrawerHost: React.FC = React.memo(() => {
  const modals = useModalState();
  const { activeTab } = useNavigationState();
  const actions = useAppActions();
  const { user } = useAuthUser();
  const unreadNotifCount = useNotificationUnreadCount();

  if (!modals.drawer) return null;

  return (
    <Suspense fallback={null}>
      <SovereignSideDrawer
        isOpen={modals.drawer}
        onClose={() => actions.closeModal('drawer')}
        activeTab={activeTab}
        onNavigateTab={(tab) => {
          triggerTabTapHaptic();
          actions.navigateTab(tab);
          actions.closeModal('drawer');
        }}
        user={user}
        onOpenUserModal={() => {
          actions.closeModal('drawer');
          actions.openModal('userProfile');
        }}
        onOpenSecurityModal={() => {
          actions.closeModal('drawer');
          actions.openModal('security');
        }}
        onOpenPremiumModal={() => {
          actions.closeModal('drawer');
          actions.openModal('premium');
        }}
        onOpenJobSearch={() => {
          actions.closeModal('drawer');
          actions.openModal('jobSearch');
        }}
        onOpenScholarship={() => {
          actions.closeModal('drawer');
          actions.openScholarship();
        }}
        onOpenLegalAdvisor={() => {
          actions.closeModal('drawer');
          actions.openModal('legalAdvisor');
        }}
        onOpenMechanic={() => {
          actions.closeModal('drawer');
          actions.openModal('mechanic');
        }}
        onOpenHistory={() => {
          actions.closeModal('drawer');
          actions.openModal('history');
        }}
        unreadNotifCount={unreadNotifCount}
        onOpenNotifications={() => {
          actions.closeModal('drawer');
          actions.openModal('notificationCenter');
        }}
        onOpenVideoTranslator={() => {
          actions.closeModal('drawer');
          actions.openModal('videoTranslator');
        }}
        onOpenVoiceOverlay={() => {
          actions.closeModal('drawer');
          actions.openModal('voiceOverlay');
        }}
        onOpenFileVault={() => {
          actions.closeModal('drawer');
          actions.openModal('userFileVault');
        }}
        onOpenHibernation={() => {
          actions.closeModal('drawer');
          actions.openModal('hibernation');
        }}
        onOpenBiometricLock={() => {
          actions.closeModal('drawer');
          actions.openModal('biometricLock');
        }}
        onOpenBugReport={() => {
          actions.closeModal('drawer');
          actions.openBugReport('menu');
        }}
        onOpenTranslatorFeature={(feature) => {
          actions.closeModal('drawer');
          actions.openTranslatorFeature(feature);
        }}
      />
    </Suspense>
  );
});

export const AppModalsHost: React.FC = React.memo(() => {
  const modals = useModalState();
  const { activeTab } = useNavigationState();
  const actions = useAppActions();
  const { user, updateUser } = useAuthUser();
  const { isOffline } = useNetwork();
  const { saveInsight } = useSavedInsightsActions();

  const resetKey = `${modals.userFileVault}-${modals.scholarship}-${modals.jobSearch}-${modals.legalAdvisor}-${modals.mechanic}-${modals.history}-${modals.premium}-${modals.auth}-${modals.userProfile}-${modals.security}-${modals.notificationCenter}-${modals.weeklySummary}-${modals.videoTranslator}-${modals.dailyWisdom}-${modals.pwa}`;

  return (
    <>
      <DailyWisdomAutoTrigger />
      <SideDrawerHost />

      <LazyChunkErrorBoundary compact resetKey={resetKey}>
        <Suspense fallback={null}>
          {modals.userFileVault && (
            <UserFileManagerModal
              isOpen={modals.userFileVault}
              onClose={() => actions.closeModal('userFileVault')}
              user={user}
              onSendToChat={actions.selectPromptForChat}
            />
          )}

          {modals.scholarship && (
            <ScholarshipModal
              isOpen={modals.scholarship}
              onClose={actions.closeScholarship}
              user={user}
              onSaveInsight={saveInsight}
              onOpenAuthModal={actions.openAuthModal}
              onNavigateToChat={actions.selectPromptForChat}
              initialScholarshipId={modals.targetScholarshipId}
            />
          )}

          {modals.jobSearch && (
            <JobSearchModal
              isOpen={modals.jobSearch}
              onClose={() => actions.closeModal('jobSearch')}
              onSelectPromptForChat={actions.selectPromptForChat}
            />
          )}

          {modals.legalAdvisor && (
            <LegalAdvisorModal
              isOpen={modals.legalAdvisor}
              onClose={() => actions.closeModal('legalAdvisor')}
              onSelectPromptForChat={actions.selectPromptForChat}
            />
          )}

          {modals.mechanic && (
            <MechanicDiagnosisModal
              isOpen={modals.mechanic}
              onClose={() => actions.closeModal('mechanic')}
              onSelectPromptForChat={actions.selectPromptForChat}
            />
          )}

          {modals.history && (
            <HistoryModal
              isOpen={modals.history}
              onClose={() => actions.closeModal('history')}
              onSelectPromptForChat={actions.selectPromptForChat}
            />
          )}

          {modals.premium && (
            <PricingPlanComparisonModal
              isOpen={modals.premium}
              onClose={() => actions.closeModal('premium')}
              user={user}
              onUpdateUser={updateUser}
            />
          )}

          {modals.auth && (
            <AuthModal
              isOpen={modals.auth}
              onClose={actions.closeAuthModal}
              user={user}
              onUpdateUser={updateUser}
              initialMode={modals.authMode}
              verificationReason={modals.authReason}
              isMandatory={false}
              logoSrc={logoImg}
            />
          )}

          {modals.onboarding && (
            <TigrinyaOnboardingModal
              isOpen={modals.onboarding}
              onClose={() => actions.closeModal('onboarding')}
              onNavigateTab={actions.navigateTab}
            />
          )}

          {modals.userProfile && (
            <UserManagementModal
              isOpen={modals.userProfile}
              onClose={() => actions.closeModal('userProfile')}
              user={user}
              onUpdateUser={updateUser}
              isOffline={isOffline}
              onOpenSecurityModal={() => actions.openModal('security')}
              onOpenPaymentModal={() => actions.openPaymentWithSubTab('checkout')}
              onOpenPaymentMethods={() => actions.openPaymentWithSubTab('payment-methods')}
              onOpenManagement={(sec) =>
                actions.navigateTab(
                  sec === 'payments'
                    ? 'payment-management'
                    : sec === 'customers'
                    ? 'customer-management'
                    : 'user-management'
                )
              }
              onOpenAuthModal={(mode) => actions.openAuthModal(mode)}
              onSaveInsight={saveInsight}
              onNavigateTab={actions.navigateTab}
            />
          )}

          {modals.security && (
            <SecurityManagementModal
              isOpen={modals.security}
              onClose={() => actions.closeModal('security')}
              user={user}
              onUpdateUser={updateUser}
            />
          )}

          {modals.hibernation && (
            <AxumiteHibernationScreen
              isOpen={modals.hibernation}
              onWakeUp={() => actions.closeModal('hibernation')}
              reason="manual"
            />
          )}

          {modals.biometricLock && (
            <BiometricVerificationScreen
              isOpen={modals.biometricLock}
              onUnlock={() => actions.closeModal('biometricLock')}
              onCancel={() => actions.closeModal('biometricLock')}
              user={user}
              securityPin="7849"
              isStartupLock={true}
              allowBypass={true}
            />
          )}

          {activeTab === 'brand-manifesto' && (
            <BrandHeroModal logoSrc={logoImg} onClose={() => actions.setActiveTabRaw('chat')} />
          )}

          {modals.videoTranslator && (
            <AiVideoTranslatorModal
              isOpen={modals.videoTranslator}
              onClose={() => actions.closeModal('videoTranslator')}
            />
          )}

          {modals.dailyWisdom && (
            <DailyWisdomLoginModal
              isOpen={modals.dailyWisdom}
              onClose={actions.closeDailyWisdom}
              user={user}
              initialQuote={modals.activeDailyWisdomQuote}
              onSaveInsight={saveInsight}
              onNavigateToTab={(tab) => {
                actions.closeDailyWisdom();
                actions.navigateTab(tab);
              }}
            />
          )}

          {modals.pwa && (
            <PwaInstallModal
              isOpen={modals.pwa}
              onClose={() => actions.closeModal('pwa')}
              onOpenAuthModal={(m) => actions.openAuthModal(m)}
              onOpenAndroidInterface={() => actions.setActiveTabRaw('android-app')}
              onOpenHibernation={() => actions.openModal('hibernation')}
              deferredPrompt={modals.deferredPwaPrompt}
              onClearDeferredPrompt={actions.clearDeferredPwaPrompt}
            />
          )}
        </Suspense>
      </LazyChunkErrorBoundary>

      <IdleSecurityGuard />
      <ShakeBugReportHost />
      <NotificationModalsHost />
      <SubscriptionPaywallHost />
      <PushNotificationHost />
    </>
  );
});
