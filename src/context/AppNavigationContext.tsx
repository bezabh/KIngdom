import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import { AppTab } from '../types';
import type { PaymentSystemSubTab } from '../components/PaymentSystem';
import type { TranslatorFeatureView } from '../components/translator/TranslationFeatureCardsGrid';
import type { AxumiteWisdomQuote } from '../data/axumiteManuscriptQuotes';
import { hasPrivilege } from '../lib/permissions';
import { useAdaptiveTheme } from './AdaptiveThemeContext';
import { useAuthUser } from './AuthUserContext';
import { useNetwork } from './NetworkContext';

export type AuthModalMode = 'login' | 'signup' | 'verify' | 'forgot_password';
export type BugTriggerSource = 'shake' | 'menu' | 'shortcut' | 'manual';

export type SimpleModalKey =
  | 'drawer'
  | 'pwa'
  | 'userProfile'
  | 'security'
  | 'onboarding'
  | 'hibernation'
  | 'biometricLock'
  | 'bugReport'
  | 'jobSearch'
  | 'scholarship'
  | 'videoTranslator'
  | 'voiceOverlay'
  | 'userFileVault'
  | 'legalAdvisor'
  | 'mechanic'
  | 'history'
  | 'premium'
  | 'notificationCenter'
  | 'weeklySummary'
  | 'dailyWisdom'
  | 'auth';

export interface ModalState {
  drawer: boolean;
  pwa: boolean;
  userProfile: boolean;
  security: boolean;
  onboarding: boolean;
  hibernation: boolean;
  biometricLock: boolean;
  bugReport: boolean;
  jobSearch: boolean;
  scholarship: boolean;
  videoTranslator: boolean;
  voiceOverlay: boolean;
  userFileVault: boolean;
  legalAdvisor: boolean;
  mechanic: boolean;
  history: boolean;
  premium: boolean;
  notificationCenter: boolean;
  weeklySummary: boolean;
  dailyWisdom: boolean;
  auth: boolean;
  authMode: AuthModalMode;
  authReason?: string;
  bugTriggerSource: BugTriggerSource;
  lastShakeVelocity?: number;
  shakeSensorSample?: { x: number; y: number; z: number };
  targetScholarshipId?: string;
  activeDailyWisdomQuote?: AxumiteWisdomQuote;
  deferredPwaPrompt: any;
}

type ModalAction =
  | { type: 'SET_MODAL'; key: SimpleModalKey; value: boolean }
  | { type: 'TOGGLE_MODAL'; key: SimpleModalKey }
  | { type: 'OPEN_AUTH'; mode: AuthModalMode; reason?: string }
  | { type: 'CLOSE_AUTH' }
  | {
      type: 'OPEN_BUG_REPORT';
      source: BugTriggerSource;
      velocity?: number;
      sensorSample?: { x: number; y: number; z: number };
    }
  | { type: 'OPEN_SCHOLARSHIP'; scholarshipId?: string }
  | { type: 'CLOSE_SCHOLARSHIP' }
  | { type: 'OPEN_DAILY_WISDOM'; quote?: AxumiteWisdomQuote }
  | { type: 'CLOSE_DAILY_WISDOM' }
  | { type: 'SET_DEFERRED_PWA_PROMPT'; prompt: any };

const INITIAL_MODAL_STATE: ModalState = {
  drawer: false,
  pwa: false,
  userProfile: false,
  security: false,
  onboarding: false,
  hibernation: false,
  biometricLock: false,
  bugReport: false,
  jobSearch: false,
  scholarship: false,
  videoTranslator: false,
  voiceOverlay: false,
  userFileVault: false,
  legalAdvisor: false,
  mechanic: false,
  history: false,
  premium: false,
  notificationCenter: false,
  weeklySummary: false,
  dailyWisdom: false,
  auth: false,
  authMode: 'login',
  authReason: undefined,
  bugTriggerSource: 'shake',
  lastShakeVelocity: undefined,
  shakeSensorSample: undefined,
  targetScholarshipId: undefined,
  activeDailyWisdomQuote: undefined,
  deferredPwaPrompt: null,
};

function modalReducer(state: ModalState, action: ModalAction): ModalState {
  switch (action.type) {
    case 'SET_MODAL':
      if (state[action.key] === action.value) return state;
      return { ...state, [action.key]: action.value };
    case 'TOGGLE_MODAL':
      return { ...state, [action.key]: !state[action.key] };
    case 'OPEN_AUTH':
      return {
        ...state,
        auth: true,
        authMode: action.mode,
        authReason: action.reason,
      };
    case 'CLOSE_AUTH':
      if (!state.auth && !state.authReason) return state;
      return {
        ...state,
        auth: false,
        authReason: undefined,
      };
    case 'OPEN_BUG_REPORT':
      return {
        ...state,
        bugReport: true,
        bugTriggerSource: action.source,
        lastShakeVelocity: action.velocity ?? state.lastShakeVelocity,
        shakeSensorSample: action.sensorSample ?? state.shakeSensorSample,
      };
    case 'OPEN_SCHOLARSHIP':
      return {
        ...state,
        scholarship: true,
        targetScholarshipId: action.scholarshipId,
      };
    case 'CLOSE_SCHOLARSHIP':
      return {
        ...state,
        scholarship: false,
        targetScholarshipId: undefined,
      };
    case 'OPEN_DAILY_WISDOM':
      return {
        ...state,
        dailyWisdom: true,
        activeDailyWisdomQuote: action.quote ?? state.activeDailyWisdomQuote,
      };
    case 'CLOSE_DAILY_WISDOM':
      return {
        ...state,
        dailyWisdom: false,
      };
    case 'SET_DEFERRED_PWA_PROMPT':
      return {
        ...state,
        deferredPwaPrompt: action.prompt,
      };
    default:
      return state;
  }
}

export type HomeThemeMode = 'light' | 'dark';

export interface NavigationStateType {
  activeTab: AppTab;
  homeTheme: HomeThemeMode;
  paymentSubTab: PaymentSystemSubTab;
  translatorInitialFeature: TranslatorFeatureView;
  translatorFeatureVersion: number;
  pendingChatPrompt: string;
  pendingTranslationText: string;
}

export interface AppActionsType {
  navigateTab: (tab: AppTab) => void;
  setActiveTabRaw: (tab: AppTab) => void;
  setHomeTheme: (mode: HomeThemeMode) => void;
  toggleHomeTheme: () => void;
  openTranslatorFeature: (feature: TranslatorFeatureView) => void;
  openTranslatorWithText: (text: string) => void;
  clearPendingTranslationText: () => void;
  openPaymentWithSubTab: (subTab: PaymentSystemSubTab) => void;
  selectPromptForChat: (prompt: string) => void;
  clearPendingChatPrompt: () => void;
  openModal: (key: SimpleModalKey) => void;
  closeModal: (key: SimpleModalKey) => void;
  toggleModal: (key: SimpleModalKey) => void;
  openAuthModal: (mode: AuthModalMode, reason?: string) => void;
  closeAuthModal: () => void;
  openBugReport: (
    source: BugTriggerSource,
    velocity?: number,
    sensorSample?: { x: number; y: number; z: number }
  ) => void;
  openScholarship: (scholarshipId?: string) => void;
  closeScholarship: () => void;
  openDailyWisdom: (quote?: AxumiteWisdomQuote) => void;
  closeDailyWisdom: () => void;
  clearDeferredPwaPrompt: () => void;
}

const NavigationStateContext = createContext<NavigationStateType | undefined>(undefined);
const ModalStateContext = createContext<ModalState | undefined>(undefined);
const AppActionsContext = createContext<AppActionsType | undefined>(undefined);

export const AppNavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isOffline, setIsOfflineDashboardMinimized } = useNetwork();
  const { user, isAuthReady, loginRedirectTick, authDismissTick } = useAuthUser();
  const { activeAesthetic, setMode: setAdaptiveMode } = useAdaptiveTheme();

  const isOfflineRef = useRef(isOffline);
  isOfflineRef.current = isOffline;

  const [activeTab, setActiveTab] = useState<AppTab>('premiere');
  const [homeTheme, setHomeThemeState] = useState<HomeThemeMode>(() =>
    activeAesthetic === 'obsidian-deep' ? 'dark' : 'light'
  );
  const [paymentSubTab, setPaymentSubTab] = useState<PaymentSystemSubTab>('saas-plans');
  const [translatorInitialFeature, setTranslatorInitialFeature] = useState<TranslatorFeatureView>('hub');
  const [translatorFeatureVersion, setTranslatorFeatureVersion] = useState<number>(0);
  const [pendingChatPrompt, setPendingChatPrompt] = useState<string>('');
  const [pendingTranslationText, setPendingTranslationText] = useState<string>('');
  const [modals, dispatchModal] = useReducer(modalReducer, INITIAL_MODAL_STATE);

  // Sync `.dark` and homeTheme automatically with Time-of-Day Adaptive Aesthetic
  useEffect(() => {
    const targetHomeTheme: HomeThemeMode =
      activeAesthetic === 'obsidian-deep' ? 'dark' : 'light';
    setHomeThemeState(targetHomeTheme);
    try {
      localStorage.setItem('axumite_home_theme_v1', targetHomeTheme);
    } catch {
      // ignore
    }
  }, [activeAesthetic]);

  // Sync `.dark` on `document.documentElement`: dark mode is active either when user/sun-cycle is Obsidian-Deep (`dark`) or inside a studio tab
  useEffect(() => {
    const shouldUseDark = activeTab !== 'premiere' || homeTheme === 'dark';
    document.documentElement.classList.toggle('dark', shouldUseDark);
  }, [activeTab, homeTheme]);

  const homeThemeRef = useRef<HomeThemeMode>(homeTheme);
  homeThemeRef.current = homeTheme;

  const setHomeTheme = useCallback(
    (mode: HomeThemeMode) => {
      setHomeThemeState(mode);
      setAdaptiveMode(mode === 'dark' ? 'obsidian-deep' : 'gold-ambient');
      try {
        localStorage.setItem('axumite_home_theme_v1', mode);
      } catch {
        // ignore
      }
    },
    [setAdaptiveMode]
  );

  const toggleHomeTheme = useCallback(() => {
    const next: HomeThemeMode = homeThemeRef.current === 'light' ? 'dark' : 'light';
    setHomeTheme(next);
  }, [setHomeTheme]);

  // Capture PWA beforeinstallprompt globally so PwaInstallModal can be lazy-loaded on demand
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      dispatchModal({ type: 'SET_DEFERRED_PWA_PROMPT', prompt: e });
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Reset translator sub-feature when navigating away from translator tab
  useEffect(() => {
    if (activeTab !== 'translator') {
      setTranslatorInitialFeature('hub');
    }
  }, [activeTab]);

  // Navigate to Premiere landing screen on fresh login / account switch / redirect sign-in
  useEffect(() => {
    if (loginRedirectTick > 0) {
      setActiveTab('premiere');
    }
  }, [loginRedirectTick]);

  // Dismiss Auth modal when a real sign-in completes
  useEffect(() => {
    if (authDismissTick > 0) {
      dispatchModal({ type: 'CLOSE_AUTH' });
    }
  }, [authDismissTick]);

  // Automatically dismiss auth prompt once a real authenticated account signs in (except OTP verify mode)
  useEffect(() => {
    if (!isAuthReady) return;
    const isAuthenticatedAccount =
      Boolean(user?.isLoggedIn) &&
      Boolean(user?.email) &&
      user.email.trim().toLowerCase() !== 'guest@axumite.ai';

    if (isAuthenticatedAccount && modals.auth && modals.authMode !== 'verify') {
      dispatchModal({ type: 'CLOSE_AUTH' });
    }
  }, [isAuthReady, user?.isLoggedIn, user?.email, modals.auth, modals.authMode]);

  // Enforce account-specific management permissions whenever auth role/privileges change
  useEffect(() => {
    if (!isAuthReady) return;
    const needsUsers =
      (activeTab === 'management' || activeTab === 'user-management') &&
      !hasPrivilege(user, 'canManageUsers');
    const needsPayments =
      activeTab === 'payment-management' && !hasPrivilege(user, 'canManagePayments');
    const needsCRM =
      activeTab === 'customer-management' && !hasPrivilege(user, 'canManageCRM');
    const needsAdminConfig =
      activeTab === 'admin-config' && !hasPrivilege(user, 'canConfigureApp');

    if (needsUsers || needsPayments || needsCRM || needsAdminConfig) {
      setActiveTab('premiere');
    }
  }, [isAuthReady, activeTab, user]);

  // Stable navigation & modal action dispatchers (never invalidate child memoization)
  const navigateTab = useCallback(
    (tab: AppTab) => {
      if (isOfflineRef.current) {
        setIsOfflineDashboardMinimized(true);
      }
      if (tab === 'translator') {
        setTranslatorInitialFeature('hub');
        setTranslatorFeatureVersion((v) => v + 1);
      }
      setActiveTab(tab);
    },
    [setIsOfflineDashboardMinimized]
  );

  const setActiveTabRaw = useCallback((tab: AppTab) => {
    setActiveTab(tab);
  }, []);

  const openTranslatorFeature = useCallback(
    (feature: TranslatorFeatureView) => {
      if (isOfflineRef.current) {
        setIsOfflineDashboardMinimized(true);
      }
      setTranslatorInitialFeature(feature);
      setTranslatorFeatureVersion((v) => v + 1);
      setActiveTab('translator');
    },
    [setIsOfflineDashboardMinimized]
  );

  const openTranslatorWithText = useCallback(
    (text: string) => {
      if (isOfflineRef.current) {
        setIsOfflineDashboardMinimized(true);
      }
      setPendingTranslationText(text);
      setTranslatorInitialFeature('hub');
      setTranslatorFeatureVersion((v) => v + 1);
      setActiveTab('translator');
    },
    [setIsOfflineDashboardMinimized]
  );

  const clearPendingTranslationText = useCallback(() => {
    setPendingTranslationText('');
  }, []);

  const openPaymentWithSubTab = useCallback(
    (subTab: PaymentSystemSubTab) => {
      setPaymentSubTab(subTab);
      if (isOfflineRef.current) {
        setIsOfflineDashboardMinimized(true);
      }
      setActiveTab('payment');
    },
    [setIsOfflineDashboardMinimized]
  );

  const selectPromptForChat = useCallback((prompt: string) => {
    setPendingChatPrompt(prompt);
    setActiveTab('chat');
  }, []);

  const clearPendingChatPrompt = useCallback(() => {
    setPendingChatPrompt('');
  }, []);

  const openModal = useCallback((key: SimpleModalKey) => {
    dispatchModal({ type: 'SET_MODAL', key, value: true });
  }, []);

  const closeModal = useCallback((key: SimpleModalKey) => {
    dispatchModal({ type: 'SET_MODAL', key, value: false });
  }, []);

  const toggleModal = useCallback((key: SimpleModalKey) => {
    dispatchModal({ type: 'TOGGLE_MODAL', key });
  }, []);

  const openAuthModal = useCallback((mode: AuthModalMode, reason?: string) => {
    dispatchModal({ type: 'OPEN_AUTH', mode, reason });
  }, []);

  const closeAuthModal = useCallback(() => {
    dispatchModal({ type: 'CLOSE_AUTH' });
  }, []);

  const openBugReport = useCallback(
    (
      source: BugTriggerSource,
      velocity?: number,
      sensorSample?: { x: number; y: number; z: number }
    ) => {
      dispatchModal({ type: 'OPEN_BUG_REPORT', source, velocity, sensorSample });
    },
    []
  );

  const openScholarship = useCallback((scholarshipId?: string) => {
    dispatchModal({ type: 'OPEN_SCHOLARSHIP', scholarshipId });
  }, []);

  const closeScholarship = useCallback(() => {
    dispatchModal({ type: 'CLOSE_SCHOLARSHIP' });
  }, []);

  const openDailyWisdom = useCallback((quote?: AxumiteWisdomQuote) => {
    dispatchModal({ type: 'OPEN_DAILY_WISDOM', quote });
  }, []);

  const closeDailyWisdom = useCallback(() => {
    dispatchModal({ type: 'CLOSE_DAILY_WISDOM' });
  }, []);

  const clearDeferredPwaPrompt = useCallback(() => {
    dispatchModal({ type: 'SET_DEFERRED_PWA_PROMPT', prompt: null });
  }, []);

  const navigationState = useMemo<NavigationStateType>(
    () => ({
      activeTab,
      homeTheme,
      paymentSubTab,
      translatorInitialFeature,
      translatorFeatureVersion,
      pendingChatPrompt,
      pendingTranslationText,
    }),
    [
      activeTab,
      homeTheme,
      paymentSubTab,
      translatorInitialFeature,
      translatorFeatureVersion,
      pendingChatPrompt,
      pendingTranslationText,
    ]
  );

  const actionsValue = useMemo<AppActionsType>(
    () => ({
      navigateTab,
      setActiveTabRaw,
      setHomeTheme,
      toggleHomeTheme,
      openTranslatorFeature,
      openTranslatorWithText,
      clearPendingTranslationText,
      openPaymentWithSubTab,
      selectPromptForChat,
      clearPendingChatPrompt,
      openModal,
      closeModal,
      toggleModal,
      openAuthModal,
      closeAuthModal,
      openBugReport,
      openScholarship,
      closeScholarship,
      openDailyWisdom,
      closeDailyWisdom,
      clearDeferredPwaPrompt,
    }),
    [
      navigateTab,
      setActiveTabRaw,
      setHomeTheme,
      toggleHomeTheme,
      openTranslatorFeature,
      openTranslatorWithText,
      clearPendingTranslationText,
      openPaymentWithSubTab,
      selectPromptForChat,
      clearPendingChatPrompt,
      openModal,
      closeModal,
      toggleModal,
      openAuthModal,
      closeAuthModal,
      openBugReport,
      openScholarship,
      closeScholarship,
      openDailyWisdom,
      closeDailyWisdom,
      clearDeferredPwaPrompt,
    ]
  );

  return (
    <AppActionsContext.Provider value={actionsValue}>
      <NavigationStateContext.Provider value={navigationState}>
        <ModalStateContext.Provider value={modals}>{children}</ModalStateContext.Provider>
      </NavigationStateContext.Provider>
    </AppActionsContext.Provider>
  );
};

export const useNavigationState = (): NavigationStateType => {
  const ctx = useContext(NavigationStateContext);
  if (!ctx) {
    throw new Error('useNavigationState must be used within an AppNavigationProvider');
  }
  return ctx;
};

export const useModalState = (): ModalState => {
  const ctx = useContext(ModalStateContext);
  if (!ctx) {
    throw new Error('useModalState must be used within an AppNavigationProvider');
  }
  return ctx;
};

export const useAppActions = (): AppActionsType => {
  const ctx = useContext(AppActionsContext);
  if (!ctx) {
    throw new Error('useAppActions must be used within an AppNavigationProvider');
  }
  return ctx;
};
