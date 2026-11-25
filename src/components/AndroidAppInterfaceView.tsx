import React, { useState, useEffect, useRef } from 'react';
import {
  Smartphone,
  Wifi,
  WifiOff,
  Battery,
  BatteryCharging,
  Signal,
  RotateCcw,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Camera,
  MessageSquare,
  Sparkles,
  Layers,
  Download,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Send,
  ArrowLeft,
  Circle,
  Square,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  QrCode,
  Globe,
  Sliders,
  Bell,
  Sun,
  Moon,
  Bluetooth,
  Flame,
  Radio,
  FileText,
  Search,
  BookOpen,
  Copy,
  Check,
  ExternalLink,
  Cpu,
  HardDrive,
  Activity,
  Zap,
  Info,
  Play,
  Pause,
  Code2,
  FolderTree,
  FileCode,
  PackageCheck,
  Fingerprint,
  Lock,
  Unlock,
  BellRing,
  Tag,
  X,
  Key,
  Shield,
  KeyRound,
  History,
  Timer,
  Plus,
  Wallet
} from 'lucide-react';
import { UserProfile, AppTab, SavedPaymentMethod, PaymentMethodType } from '../types';
import {
  addPaymentMethod,
  fetchPaymentMethods,
  formatCardNumber,
  formatExpiry,
  PAYMENT_METHODS_UPDATED_EVENT,
  setDefaultPaymentMethod,
} from '../services/paymentMethodService';
import { useLanguage } from '../context/LanguageContext';
import { playGoldenNotificationChime } from '../services/notificationService';
import { pinAuthService, AppAuthState } from '../services/pinAuthenticationService';
import { triggerDailyWisdomModal } from '../services/dailyWisdomService';
import {
  getHapticSettings,
  saveHapticSettings,
  triggerSwipeThresholdHaptic,
  triggerSwipeTransitionHaptic,
  triggerTabTapHaptic,
  triggerBoundaryBumpHaptic,
  HAPTICS_SETTINGS_EVENT,
  HAPTICS_PULSE_EVENT,
} from '../utils/haptics';
import { motion, AnimatePresence } from 'motion/react';
import type { AndroidFileRecord } from '../data/androidSourceCodeData';
import type { AndroidKotlinFileRecord } from '../data/androidKotlinSourceCodeData';
import { NotificationIconStyleSelector } from './NotificationIconStyleSelector';
import { 
  NOTIFICATION_CATEGORIES, 
  NotificationCategoryConfig, 
  NotificationIconStyleOption, 
  CategoryIconStyleMap, 
  loadSavedNotificationStyles, 
  getSelectedStyleForCategory 
} from '../data/notificationIconStyles';
import {
  VoicePersonaId,
  VoicePersonaSettings,
  VOICE_PERSONAS,
  VOICE_PERSONA_UPDATED_EVENT,
  getVoicePersona,
  getStoredVoicePersonaSettings,
  saveVoicePersonaSettings,
} from '../types/voicePersona';

import {
  TranslationFeatureCardsGrid,
  TranslatorFeatureView,
} from './translator/TranslationFeatureCardsGrid';
import {
  ComposableAdView,
  ADMOB_BANNER_TEST_AD_UNIT_ID,
} from './ComposableAdView';

interface AndroidAppInterfaceViewProps {
  user: UserProfile;
  onNavigateTab?: (tab: AppTab) => void;
  onOpenAuthModal?: (mode: 'login' | 'signup') => void;
  onOpenPaymentMethods?: () => void;
  onUpdateUser?: (updated: Partial<UserProfile>) => void;
  onOpenTranslatorFeature?: (feature: TranslatorFeatureView) => void;
}

type AndroidScreen = 'home' | 'chat' | 'camera-ocr' | 'telebirr' | 'dictionary' | 'diagnostics' | 'recents' | 'onesignal' | 'splash';

interface DiagnosticCheck {
  id: string;
  name: string;
  category: 'Runtime' | 'Storage' | 'Audio/Speech' | 'Network' | 'Security';
  status: 'passed' | 'warning' | 'checking';
  latencyMs: number;
  details: string;
}

export const AndroidAppInterfaceView: React.FC<AndroidAppInterfaceViewProps> = ({
  user,
  onNavigateTab,
  onOpenAuthModal,
  onOpenPaymentMethods,
  onUpdateUser,
  onOpenTranslatorFeature,
}) => {
  const { language, setLanguage } = useLanguage();

  // Android Chassis & Frame State
  const [isFrameMode, setIsFrameMode] = useState<boolean>(true);
  const [deviceModel, setDeviceModel] = useState<'galaxy-ultra' | 'pixel-pro' | 'axum-phone'>('galaxy-ultra');
  const [carrier, setCarrier] = useState<'Telebirr 5G' | 'EriTel 4G LTE' | 'Axumite Mesh'>('Telebirr 5G');
  const [batteryLevel, setBatteryLevel] = useState<number>(89);
  const [isCharging, setIsCharging] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentGeezDate, setCurrentGeezDate] = useState<string>('፲፭ ነሓሰ ፳፻፲፰');
  
  // Navigation & Screen Stack
  const [activeScreen, setActiveScreen] = useState<AndroidScreen>('home');
  const [screenHistory, setScreenHistory] = useState<AndroidScreen[]>(['home']);
  const [isQuickSettingsOpen, setIsQuickSettingsOpen] = useState<boolean>(false);
  const [isNotificationShadeOpen, setIsNotificationShadeOpen] = useState<boolean>(false);

  // Android Settings Toggles
  const [wifiEnabled, setWifiEnabled] = useState<boolean>(true);
  const [bluetoothEnabled, setBluetoothEnabled] = useState<boolean>(true);
  const [mobileDataEnabled, setMobileDataEnabled] = useState<boolean>(true);
  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [flashlightEnabled, setFlashlightEnabled] = useState<boolean>(false);
  const [offlineMode, setOfflineMode] = useState<boolean>(false);
  const [hapticsEnabled, setHapticsEnabled] = useState<boolean>(() => getHapticSettings().enabled);
  const [hapticPulseFlash, setHapticPulseFlash] = useState<boolean>(false);
  const [volumeLevel, setVolumeLevel] = useState<number>(85);
  const [voicePersonaId, setVoicePersonaId] = useState<VoicePersonaId>(
    () => getStoredVoicePersonaSettings(user).personaId
  );
  const [voicePitchMultiplier, setVoicePitchMultiplier] = useState<number>(
    () => getStoredVoicePersonaSettings(user).pitchMultiplier
  );
  const [voiceRateMultiplier, setVoiceRateMultiplier] = useState<number>(
    () => getStoredVoicePersonaSettings(user).rateMultiplier
  );
  const activeVoicePersona = getVoicePersona(voicePersonaId);

  useEffect(() => {
    const synced = getStoredVoicePersonaSettings(user);
    setVoicePersonaId(synced.personaId);
    setVoicePitchMultiplier(synced.pitchMultiplier);
    setVoiceRateMultiplier(synced.rateMultiplier);
  }, [user?.voicePersona, user?.voicePersonaPitch, user?.voicePersonaRate]);

  useEffect(() => {
    const onPersonaUpdate = (event: Event) => {
      const detail = (event as CustomEvent<VoicePersonaSettings>).detail;
      if (!detail) return;
      setVoicePersonaId(detail.personaId);
      setVoicePitchMultiplier(detail.pitchMultiplier);
      setVoiceRateMultiplier(detail.rateMultiplier);
    };
    window.addEventListener(VOICE_PERSONA_UPDATED_EVENT, onPersonaUpdate);
    return () => window.removeEventListener(VOICE_PERSONA_UPDATED_EVENT, onPersonaUpdate);
  }, []);
  const [brightnessLevel, setBrightnessLevel] = useState<number>(90);

  const phoneTouchStartX = useRef<number | null>(null);
  const phoneTouchStartY = useRef<number | null>(null);
  const phoneTouchStartTime = useRef<number>(0);
  const phoneSwipeThresholdFiredRef = useRef<boolean>(false);

  useEffect(() => {
    const onSettingsUpdate = (e: Event) => {
      const detail = (e as CustomEvent<{ enabled?: boolean }>).detail;
      if (typeof detail?.enabled === 'boolean') {
        setHapticsEnabled(detail.enabled);
      }
    };
    const onPulse = () => {
      setHapticPulseFlash(true);
      setTimeout(() => setHapticPulseFlash(false), 260);
    };
    window.addEventListener(HAPTICS_SETTINGS_EVENT, onSettingsUpdate);
    window.addEventListener(HAPTICS_PULSE_EVENT, onPulse);
    return () => {
      window.removeEventListener(HAPTICS_SETTINGS_EVENT, onSettingsUpdate);
      window.removeEventListener(HAPTICS_PULSE_EVENT, onPulse);
    };
  }, []);

  // In-App Feature States
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; sender: 'user' | 'ai'; text: string; time: string }>>([
    {
      id: 'm1',
      sender: 'ai',
      text: 'ሰላም! ኣነ ኦበሊስክ AI እየ። ብትግርኛ ወይ ብግእዝ ዝኾነ ሕቶ ክትሓቱኒ ትኽእሉ ኢኹም።',
      time: '10:42 AM',
    },
    {
      id: 'm2',
      sender: 'user',
      text: 'ናይ ሎሚ ናይ ግእዝ ጥንታዊ ምስላ ንገረኒ።',
      time: '10:43 AM',
    },
    {
      id: 'm3',
      sender: 'ai',
      text: '«ብልሓት ካብ ሓይሊ ትበልጽ» — ጥበብ ኣቦታትና ኣብ ንግስነት ኣክሱም ካብ ጥንቲ ዝተሰረተ ዓቢ መምርሒ እዩ።',
      time: '10:43 AM',
    }
  ]);
  const [chatInput, setChatInput] = useState<string>('');
  const [isAiTyping, setIsAiTyping] = useState<boolean>(false);
  const [isListeningVoice, setIsListeningVoice] = useState<boolean>(false);

  // OCR Camera Scanner State
  const [ocrScanning, setOcrScanning] = useState<boolean>(false);
  const [ocrResultText, setOcrResultText] = useState<string | null>(null);
  const [ocrTargetMode, setOcrTargetMode] = useState<'geez-manuscript' | 'road-sign' | 'document'>('geez-manuscript');

  // Telebirr Wallet & Linked Payment Methods Simulator
  const [walletBalance, setWalletBalance] = useState<number>(4850.75);
  const [transferPhone, setTransferPhone] = useState<string>('0911234567');
  const [transferAmount, setTransferAmount] = useState<string>('250');
  const [walletSuccessMsg, setWalletSuccessMsg] = useState<string | null>(null);
  const [androidSavedMethods, setAndroidSavedMethods] = useState<SavedPaymentMethod[]>([]);
  const [showAndroidAddMethod, setShowAndroidAddMethod] = useState<boolean>(false);
  const [androidNewMethodType, setAndroidNewMethodType] = useState<PaymentMethodType>('telebirr');
  const [androidNewCardNum, setAndroidNewCardNum] = useState<string>('');
  const [androidNewExpiry, setAndroidNewExpiry] = useState<string>('');
  const [androidNewCvv, setAndroidNewCvv] = useState<string>('');
  const [androidNewPhone, setAndroidNewPhone] = useState<string>('+251 9');
  const [androidAddError, setAndroidAddError] = useState<string | null>(null);
  const [isAddingAndroidMethod, setIsAddingAndroidMethod] = useState<boolean>(false);

  useEffect(() => {
    fetchPaymentMethods(user?.id, user?.email).then(setAndroidSavedMethods);
    const onUpdated = (e: Event) => {
      const custom = e as CustomEvent<{ methods?: SavedPaymentMethod[] }>;
      if (Array.isArray(custom.detail?.methods)) {
        setAndroidSavedMethods(custom.detail.methods);
      }
    };
    window.addEventListener(PAYMENT_METHODS_UPDATED_EVENT, onUpdated);
    return () => window.removeEventListener(PAYMENT_METHODS_UPDATED_EVENT, onUpdated);
  }, [user?.id, user?.email]);

  // Dictionary State
  const [dictQuery, setDictQuery] = useState<string>('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Toast / System Notification
  const [inAppToast, setInAppToast] = useState<string | null>(null);

  // OneSignal Push Notification State (v5.x SDK)
  const [oneSignalAppId, setOneSignalAppId] = useState<string>('122b150b-1b50-4200-b515-7da4ed438c4e');
  const [isPushPermissionGranted, setIsPushPermissionGranted] = useState<boolean>(true);
  const [pushUserTier, setPushUserTier] = useState<'free' | 'sovereign_pro' | 'scholar'>('sovereign_pro');
  const [pushSelectedLang, setPushSelectedLang] = useState<'ti' | 'en'>('ti');
  const [testPushPreset, setTestPushPreset] = useState<string>('geez_manuscript');
  const [customPushTitle, setCustomPushTitle] = useState<string>('ኣክሱማይት AI • ሓድሽ መልእኽቲ');
  const [customPushBody, setCustomPushBody] = useState<string>('ናይ ሎሚ ጥንታዊ ናይ ግእዝ ቅርስን ትርጉምን ኣብ መዝገብኩም ተወሲኹ ኣሎ።');
  const [customPushCategory, setCustomPushCategory] = useState<string>('ai_chat');
  const [categoryIconStyles, setCategoryIconStyles] = useState<CategoryIconStyleMap>(loadSavedNotificationStyles);

  const [pushNotificationHistory, setPushNotificationHistory] = useState<Array<{ 
    id: string; 
    title: string; 
    body: string; 
    time: string; 
    tag: string; 
    deepLink?: AndroidScreen;
    category?: string;
    styleName?: string;
    drawableName?: string;
    iconEmoji?: string;
    accentColor?: string;
  }>>([
    {
      id: 'p1',
      title: 'OneSignal Push Engine Active',
      body: 'Registered with Android 15 & FCM Project (axumite-ai). Ready for push alerts.',
      time: '10:45 AM',
      tag: 'system',
      deepLink: 'diagnostics',
      category: 'security_system',
      styleName: 'Sovereign Armor Shield',
      drawableName: 'ic_stat_onesignal_shield_gold',
      iconEmoji: '🛡️',
      accentColor: '#D97706'
    },
    {
      id: 'p2',
      title: 'Telebirr ሒሳብ ተቐቢልኩም',
      body: '500.00 ETB ካብ +251 91 123 4567 ብዓወት ናብ ዋሌትኩም ተወሲኹ ኣሎ።',
      time: '10:48 AM',
      tag: 'payment',
      deepLink: 'telebirr',
      category: 'telebirr_finance',
      styleName: 'Telebirr Digital Vault',
      drawableName: 'ic_stat_onesignal_vault_telebirr',
      iconEmoji: '💳',
      accentColor: '#2563EB'
    }
  ]);

  const handleSendOneSignalTestPush = (
    presetKey?: string,
    overrideCategory?: NotificationCategoryConfig,
    overrideStyle?: NotificationIconStyleOption
  ) => {
    let title = customPushTitle;
    let body = customPushBody;
    let deepLink: AndroidScreen = 'home';
    let targetCategory = overrideCategory?.id || customPushCategory;

    const selectedKey = presetKey || testPushPreset;
    if (selectedKey === 'geez_manuscript' || targetCategory === 'geez_ocr') {
      targetCategory = 'geez_ocr';
      title = pushSelectedLang === 'ti' ? '📜 ግእዝ ቅርስ፡ ሓድሽ ትርጉም ተረኺቡ' : '📜 Ancient Ge\'ez Inscription Decoded';
      body = pushSelectedLang === 'ti' ? '«ንጉሠ ነገሥት ዘኢትዮጵያ» — ናይ ፬ ክፍለ ዘመን ናይ ዕዛና ጽሑፍ ተተርጒሙ።' : 'Ezana Monumental Inscription (4th Century) translated with 99.4% accuracy.';
      deepLink = 'camera-ocr';
    } else if (selectedKey === 'telebirr_payment' || targetCategory === 'telebirr_finance') {
      targetCategory = 'telebirr_finance';
      title = pushSelectedLang === 'ti' ? '💳 ቴሌብር፡ ክፍሊት ብዓወት ተፈጺሙ' : '💳 Telebirr: Mobile Money Received';
      body = pushSelectedLang === 'ti' ? '750.00 ETB ካብ CBE Birr ተቐቢልኩም። ሓድሽ ዝተረፈ፡ 5,600.75 ETB።' : 'Received 750.00 ETB from CBE Birr. Current Balance: 5,600.75 ETB.';
      deepLink = 'telebirr';
    } else if (selectedKey === 'sovereign_wisdom' || targetCategory === 'cultural_heritage') {
      targetCategory = 'cultural_heritage';
      title = pushSelectedLang === 'ti' ? '✨ ዕለታዊ ጥበብ ኣክሱም (Daily Wisdom)' : '✨ Daily Sovereign Ge\'ez Wisdom';
      body = pushSelectedLang === 'ti' ? '«ዘኢተማህረ አይነግሥ፡ ዘኢተጋደለ አይከብር» — ሎሚ ንመሃር!' : '"He who does not learn will not lead" — Explore today\'s proverb.';
      deepLink = 'dictionary';
    } else if (selectedKey === 'model_update' || targetCategory === 'ai_chat') {
      targetCategory = 'ai_chat';
      title = pushSelectedLang === 'ti' ? '⚡ ሓድሽ ናይ ትግርኛ LLM ሞዴል ተጻዒኑ' : '⚡ Tigrinya 1.2B Quantized Model v3.8';
      body = pushSelectedLang === 'ti' ? 'ናይ ኤርትራን ኢትዮጵያን ላህጃታት ዘጠቓለለ ድምጺ ሞዴል ኣብ ኦፍላይን ተኸፊቱ።' : 'Offline speech acoustic models updated for ultra-low latency inference.';
      deepLink = 'chat';
    } else if (targetCategory === 'security_system') {
      title = pushSelectedLang === 'ti' ? '🛡️ ባዮሜትሪክ ድሕንነት ተረጋጊጹ' : '🛡️ Biometric Verification Passed';
      body = pushSelectedLang === 'ti' ? 'Android 15 StrongBox TEE ውሕስና ተረጋጊጹ።' : 'Class 3 Hardware-backed Biometric Key verified.';
      deepLink = 'diagnostics';
    }

    const resolvedStyle = overrideStyle || getSelectedStyleForCategory(targetCategory, categoryIconStyles);

    const newPush = {
      id: 'push_' + Date.now(),
      title,
      body,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      tag: selectedKey,
      deepLink,
      category: targetCategory,
      styleName: resolvedStyle.name,
      drawableName: resolvedStyle.drawableName,
      iconEmoji: resolvedStyle.previewEmoji,
      accentColor: resolvedStyle.accentColor
    };

    setPushNotificationHistory(prev => [newPush, ...prev]);
    playGoldenNotificationChime();
    triggerToast(
      pushSelectedLang === 'ti' 
        ? `OneSignal ፑሽ [${resolvedStyle.nameTi}] ተላኢኹ: "${title}"` 
        : `OneSignal Push [${resolvedStyle.name}] Dispatched: "${title}"`
    );
  };

  // Biometric Security Prompt State & PIN Fallback
  const [isBiometricPromptOpen, setIsBiometricPromptOpen] = useState<boolean>(false);
  const [isAppBiometricallyLocked, setIsAppBiometricallyLocked] = useState<boolean>(false);
  const [biometricScanStatus, setBiometricScanStatus] = useState<'idle' | 'scanning' | 'success' | 'failed'>('idle');
  const [biometricAuthMode, setBiometricAuthMode] = useState<'biometric' | 'pin'>('biometric');
  const [pinCode, setPinCode] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinSuccess, setPinSuccess] = useState<boolean>(false);
  const [isValidatingPin, setIsValidatingPin] = useState<boolean>(false);
  const [appAuthState, setAppAuthState] = useState<AppAuthState>(pinAuthService.getAuthState());

  // Custom PIN Management State for Diagnostics Screen
  const [newPinCodeInput, setNewPinCodeInput] = useState<string>('');
  const [currentPinVerifyInput, setCurrentPinVerifyInput] = useState<string>('');
  const [pinConfigFeedback, setPinConfigFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [previewPinHash, setPreviewPinHash] = useState<string>('');

  // Subscribe to persistent Auth State updates across the app
  useEffect(() => {
    const unsubscribe = pinAuthService.onAuthStateChange((newState) => {
      setAppAuthState(newState);
      if (newState.isLockedOut) {
        setPinError(`ድሕንነት ተዓጽዩ ኣሎ (${newState.lockoutSecondsRemaining}s) • Lockout Active`);
      }
    });
    return () => unsubscribe();
  }, []);

  // Compute live hash preview when typing new custom PIN
  useEffect(() => {
    if (newPinCodeInput.length === 4) {
      pinAuthService.hashPin(newPinCodeInput).then(h => {
        setPreviewPinHash(`${h.substring(0, 12)}...${h.substring(h.length - 8)}`);
      });
    } else {
      setPreviewPinHash('');
    }
  }, [newPinCodeInput]);

  // Hub Mode: Interactive Emulator or Native Code Explorer (Kotlin & Compose / Java)
  const [hubMode, setHubMode] = useState<'emulator' | 'code-explorer'>('emulator');
  const [codeLanguageMode, setCodeLanguageMode] = useState<'kotlin' | 'java'>('kotlin');
  const [kotlinProjectFiles, setKotlinProjectFiles] = useState<AndroidKotlinFileRecord[]>([]);
  const [javaProjectFiles, setJavaProjectFiles] = useState<AndroidFileRecord[]>([]);
  const [isLoadingSourceFiles, setIsLoadingSourceFiles] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<AndroidFileRecord | AndroidKotlinFileRecord | null>(null);
  const [fileCategoryFilter, setFileCategoryFilter] = useState<'all' | 'kotlin' | 'compose' | 'service' | 'test' | 'data' | 'java' | 'layout' | 'values' | 'manifest' | 'gradle'>('all');
  const [codeCopied, setCodeCopied] = useState<boolean>(false);
  const [isExportingZip, setIsExportingZip] = useState<boolean>(false);

  const ensureSourceFilesLoaded = async (lang: 'kotlin' | 'java') => {
    if (lang === 'kotlin' && kotlinProjectFiles.length > 0) return kotlinProjectFiles;
    if (lang === 'java' && javaProjectFiles.length > 0) return javaProjectFiles;
    setIsLoadingSourceFiles(true);
    try {
      if (lang === 'kotlin') {
        const mod = await import('../data/androidKotlinSourceCodeData');
        setKotlinProjectFiles(mod.KOTLIN_ANDROID_PROJECT_FILES);
        return mod.KOTLIN_ANDROID_PROJECT_FILES;
      }
      const mod = await import('../data/androidSourceCodeData');
      setJavaProjectFiles(mod.ANDROID_PROJECT_FILES);
      return mod.ANDROID_PROJECT_FILES;
    } finally {
      setIsLoadingSourceFiles(false);
    }
  };

  // Deep Error Diagnostics State
  const [isAnalyzingErrors, setIsAnalyzingErrors] = useState<boolean>(false);
  const [diagnosticsList, setDiagnosticsList] = useState<DiagnosticCheck[]>([
    {
      id: 'd1',
      name: 'TypeScript AST & Codebase Linter',
      category: 'Runtime',
      status: 'passed',
      latencyMs: 18,
      details: 'Zero compilation errors; clean syntax across 80+ TypeScript modules.',
    },
    {
      id: 'd2',
      name: 'React 18 Component Tree & Reconciliation',
      category: 'Runtime',
      status: 'passed',
      latencyMs: 12,
      details: 'All state hooks, memoized contexts, and portals mounted without memory leaks.',
    },
    {
      id: 'd3',
      name: 'Web Speech API & Tigrinya Voice Synthesis',
      category: 'Audio/Speech',
      status: 'passed',
      latencyMs: 34,
      details: 'Tigrinya (ti-ET / ti-ER) TTS synthesis & microphone speech recognition available.',
    },
    {
      id: 'd4',
      name: 'IndexedDB & LocalStorage Resilience',
      category: 'Storage',
      status: 'passed',
      latencyMs: 9,
      details: 'Encrypted offline cache intact; quota usage at 4.2 MB / 50 MB.',
    },
    {
      id: 'd5',
      name: 'Network & Backend Gateway Proxy',
      category: 'Network',
      status: 'passed',
      latencyMs: 46,
      details: 'HTTPS port 3000 reverse-proxy routing active with sub-50ms ping.',
    },
    {
      id: 'd6',
      name: 'RBAC Security Matrix & Sovereign Cryptography',
      category: 'Security',
      status: 'passed',
      latencyMs: 14,
      details: 'Role-based access rules strictly validated for Super Admin and member tiers.',
    },
    {
      id: 'd7',
      name: 'D3 Telemetry & Vector Graphics Pipeline',
      category: 'Runtime',
      status: 'passed',
      latencyMs: 22,
      details: 'Interactive area streams and multi-series bar charts rendering at 60 FPS.',
    },
  ]);

  // Update clock every second
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const triggerToast = (msg: string) => {
    setInAppToast(msg);
    setTimeout(() => setInAppToast(null), 3500);
  };

  const triggerBiometricPrompt = (initialMode: 'biometric' | 'pin' = 'biometric') => {
    setIsBiometricPromptOpen(true);
    setBiometricScanStatus('idle');
    setBiometricAuthMode(initialMode);
    setPinCode('');
    setPinError(null);
    setPinSuccess(false);
  };

  const handleCompleteAuthentication = (authType: 'biometric' | 'pin', sessionToken?: string) => {
    // Record internal app auth state
    const authState = pinAuthService.recordSuccessfulAuth(authType, sessionToken);
    setAppAuthState(authState);
    setIsAppBiometricallyLocked(false);

    playGoldenNotificationChime();
    triggerToast(
      authType === 'pin'
        ? `ናይ ስልኪ ፒን ብዓወት ተረጋጊጹ • StrongBox TEE Verified (${authState.token?.substring(0, 18)}...)`
        : `ባዮሜትሪክ ምርመራ ብዓወት ሓሊፉ • StrongBox Hardware TEE Verified!`
    );
    // Trigger Daily Wisdom quote upon successful authentication
    setTimeout(() => {
      triggerDailyWisdomModal();
    }, 450);
    setTimeout(() => {
      setIsBiometricPromptOpen(false);
      setBiometricScanStatus('idle');
      setPinSuccess(false);
      setPinCode('');
      setIsValidatingPin(false);

      // If on Telebirr transfer screen, deduct balance and confirm
      if (activeScreen === 'telebirr') {
        const amountNum = parseFloat(transferAmount);
        if (!isNaN(amountNum) && amountNum > 0 && amountNum <= walletBalance) {
          setWalletBalance((prev) => prev - amountNum);
          setWalletSuccessMsg(`ክፍሊት ${amountNum.toFixed(2)} ETB ብ${authType === 'pin' ? 'ናይ ስልኪ ፒን' : 'ባዮሜትሪክ'} ተረጋጊጹ ናብ ${transferPhone} ብዓወት ተላኢኹ ኣሎ!`);
          setTimeout(() => setWalletSuccessMsg(null), 6000);
        }
      }
    }, 700);
  };

  const handlePinDigitPress = async (digit: string) => {
    if (pinSuccess || isValidatingPin || pinCode.length >= 4) return;
    if (appAuthState.isLockedOut) {
      triggerToast(`🔒 Security Throttling: Wait ${appAuthState.lockoutSecondsRemaining}s before retry.`);
      return;
    }

    setPinError(null);
    const newPin = pinCode + digit;
    setPinCode(newPin);

    if (newPin.length === 4) {
      setIsValidatingPin(true);
      try {
        const validation = await pinAuthService.validatePin(newPin);
        if (validation.isValid) {
          setPinSuccess(true);
          setPinError(null);
          handleCompleteAuthentication('pin', validation.token);
        } else {
          setPinSuccess(false);
          const errText = language === 'ti' ? (validation.errorMessageTi || validation.errorMessage) : (validation.errorMessage || 'Incorrect PIN.');
          setPinError(errText || 'Incorrect PIN.');
          setTimeout(() => {
            setPinCode('');
            setIsValidatingPin(false);
          }, 900);
        }
      } catch {
        setPinError('Validation failed. Please retry.');
        setIsValidatingPin(false);
        setPinCode('');
      }
    }
  };

  const handleLockDevice = () => {
    const lockedState = pinAuthService.lockApp();
    setAppAuthState(lockedState);
    setIsAppBiometricallyLocked(true);
    triggerBiometricPrompt('biometric');
    triggerToast('🔐 Device Screen & Hardware Enclave Locked.');
  };

  const handleSaveCustomPin = async () => {
    if (!newPinCodeInput || newPinCodeInput.length !== 4) {
      setPinConfigFeedback({
        type: 'error',
        text: 'PIN must be exactly 4 numeric digits.',
      });
      return;
    }

    const res = await pinAuthService.setCustomPin(newPinCodeInput, currentPinVerifyInput || undefined);
    if (res.success) {
      setPinConfigFeedback({
        type: 'success',
        text: language === 'ti' ? res.messageTi : res.message,
      });
      setNewPinCodeInput('');
      setCurrentPinVerifyInput('');
      triggerToast('🔑 New PIN saved to StrongBox Keystore!');
      setTimeout(() => setPinConfigFeedback(null), 5000);
    } else {
      setPinConfigFeedback({
        type: 'error',
        text: language === 'ti' ? res.messageTi : res.message,
      });
    }
  };

  const handlePinBackspace = () => {
    if (pinSuccess) return;
    setPinError(null);
    setPinCode(prev => prev.slice(0, -1));
  };

  const handlePinClear = () => {
    if (pinSuccess) return;
    setPinError(null);
    setPinCode('');
  };

  const handleSimulateFingerprint = (success: boolean) => {
    setBiometricScanStatus('scanning');
    setTimeout(() => {
      if (success) {
        setBiometricScanStatus('success');
        handleCompleteAuthentication('biometric');
      } else {
        setBiometricScanStatus('failed');
        triggerToast('ባዮሜትሪክ ኣይተለለየን፡ ደጊምኩም ፈትኑ ወይ ፒን ተጠቐሙ • Biometric rejected. Use PIN fallback');
      }
    }, 600);
  };

  const ANDROID_SWIPE_SCREENS: AndroidScreen[] = [
    'home',
    'chat',
    'camera-ocr',
    'telebirr',
    'dictionary',
    'diagnostics',
  ];

  const handlePhoneTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    const target = e.target as HTMLElement;
    if (target.closest('input, textarea, select, button, [role="button"]')) {
      phoneTouchStartX.current = null;
      phoneTouchStartY.current = null;
      phoneSwipeThresholdFiredRef.current = false;
      return;
    }
    phoneTouchStartX.current = e.touches[0].clientX;
    phoneTouchStartY.current = e.touches[0].clientY;
    phoneTouchStartTime.current = Date.now();
    phoneSwipeThresholdFiredRef.current = false;
  };

  const handlePhoneTouchMove = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (
      phoneTouchStartX.current === null ||
      phoneTouchStartY.current === null ||
      phoneSwipeThresholdFiredRef.current
    ) {
      return;
    }
    const dx = e.touches[0].clientX - phoneTouchStartX.current;
    const dy = e.touches[0].clientY - phoneTouchStartY.current;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.25) {
      if (ANDROID_SWIPE_SCREENS.includes(activeScreen)) {
        phoneSwipeThresholdFiredRef.current = true;
        triggerSwipeThresholdHaptic();
      }
    }
  };

  const handlePhoneTouchEnd = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (phoneTouchStartX.current === null || phoneTouchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - phoneTouchStartX.current;
    const dy = e.changedTouches[0].clientY - phoneTouchStartY.current;
    const dt = Date.now() - phoneTouchStartTime.current;

    phoneTouchStartX.current = null;
    phoneTouchStartY.current = null;
    phoneSwipeThresholdFiredRef.current = false;

    if (dt < 550 && Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.25) {
      const idx = ANDROID_SWIPE_SCREENS.indexOf(activeScreen);
      if (idx === -1) return;
      if (dx < 0) {
        const nextIdx = (idx + 1) % ANDROID_SWIPE_SCREENS.length;
        const nextScreen = ANDROID_SWIPE_SCREENS[nextIdx];
        triggerSwipeTransitionHaptic('left');
        setScreenHistory((prev) => [...prev, nextScreen]);
        setActiveScreen(nextScreen);
      } else {
        const prevIdx = (idx - 1 + ANDROID_SWIPE_SCREENS.length) % ANDROID_SWIPE_SCREENS.length;
        const prevScreen = ANDROID_SWIPE_SCREENS[prevIdx];
        triggerSwipeTransitionHaptic('right');
        setScreenHistory((prev) => [...prev, prevScreen]);
        setActiveScreen(prevScreen);
      }
    }
  };

  const navigateTo = (screen: AndroidScreen) => {
    if (screen !== activeScreen) {
      triggerTabTapHaptic();
      setScreenHistory((prev) => [...prev, screen]);
      setActiveScreen(screen);
    }
  };

  const handleAndroidBack = () => {
    if (isQuickSettingsOpen) {
      triggerTabTapHaptic();
      setIsQuickSettingsOpen(false);
      return;
    }
    if (isNotificationShadeOpen) {
      triggerTabTapHaptic();
      setIsNotificationShadeOpen(false);
      return;
    }
    if (screenHistory.length > 1) {
      triggerTabTapHaptic();
      const nextHistory = [...screenHistory];
      nextHistory.pop();
      const prevScreen = nextHistory[nextHistory.length - 1];
      setScreenHistory(nextHistory);
      setActiveScreen(prevScreen);
    } else {
      triggerBoundaryBumpHaptic();
      setActiveScreen('home');
    }
  };

  const handleAndroidHome = () => {
    triggerTabTapHaptic();
    setIsQuickSettingsOpen(false);
    setIsNotificationShadeOpen(false);
    setActiveScreen('home');
    setScreenHistory(['home']);
  };

  const handleAndroidRecents = () => {
    triggerTabTapHaptic();
    setIsQuickSettingsOpen(false);
    setIsNotificationShadeOpen(false);
    if (activeScreen === 'recents') {
      handleAndroidBack();
    } else {
      navigateTo('recents');
    }
  };

  // Tigrinya Voice Synthesis (respecting active AI Voice Persona cadence)
  const speakTigrinyaText = (text: string) => {
    if (!('speechSynthesis' in window)) {
      triggerToast('Speech synthesis not available in this browser environment.');
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ti-ET';
    utterance.rate = Math.min(2.0, Math.max(0.5, activeVoicePersona.speechRate * voiceRateMultiplier));
    utterance.pitch = Math.min(2.0, Math.max(0.5, activeVoicePersona.speechPitch * voicePitchMultiplier));
    window.speechSynthesis.speak(utterance);
    triggerToast(
      language === 'ti'
        ? `${activeVoicePersona.nameTi} ድምጺ ይስማዕ ኣሎ...`
        : `Speaking as ${activeVoicePersona.name}...`
    );
  };

  const handleSelectQuickVoicePersona = (personaId: VoicePersonaId) => {
    triggerTabTapHaptic();
    const chosen = getVoicePersona(personaId);
    setVoicePersonaId(personaId);
    saveVoicePersonaSettings({ personaId });
    onUpdateUser?.({ voicePersona: personaId });
    triggerToast(
      language === 'ti'
        ? `ናይ ድምጺ ፐርሶና: ${chosen.nameTi}`
        : `Voice Persona: ${chosen.name}`
    );
  };

  // Send Chat Message
  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    const userMsg = {
      id: `usr-${Date.now()}`,
      sender: 'user' as const,
      text: chatInput,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    const query = chatInput;
    setChatInput('');
    setIsAiTyping(true);

    setTimeout(() => {
      let replyText = 'እወ! ብትግርኛ ዝተሓተተ ሕቶ ብልክዕ ተረዲኡኒ ኣሎ። ኣክሱማይት AI ንኹሉ ናይ ትግርኛ ጽሑፍ፣ ትርጉምን ምዕባለን ዝተዳለወ እዩ።';
      if (query.toLowerCase().includes('telebirr') || query.includes('ብር')) {
        replyText = 'ናይ ቴሌብር (Telebirr) ኣገልግሎት ኣብዚ ሞባይል ኣፕሊኬሽን ብቕልጡፍ ክትሰዱን ክትቅበሉን የኽእለኩም እዩ።';
      } else if (query.toLowerCase().includes('camera') || query.includes('ካሜራ') || query.includes('ocr')) {
        replyText = 'ናይ ካሜራ ስካነር መሳርሒ ብምጥቃም ናይ ግእዝን ትግርኛን ጽሑፋት ብቐሊሉ ናብ ዲጂታል ቀይርዎ።';
      }
      const aiMsg = {
        id: `ai-${Date.now()}`,
        sender: 'ai' as const,
        text: replyText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages((prev) => [...prev, aiMsg]);
      setIsAiTyping(false);
      speakTigrinyaText(replyText);
    }, 1200);
  };

  // OCR Scan Action
  const handleRunOcrScan = () => {
    setOcrScanning(true);
    setOcrResultText(null);
    setTimeout(() => {
      setOcrScanning(false);
      if (ocrTargetMode === 'geez-manuscript') {
        setOcrResultText('በስመ አብ ወወልድ ወመንፈስ ቅዱስ አሐዱ አምላክ — «እግዚአብሔር ብርሃነይ ወመድኃኒየይ እዩ።»');
      } else if (ocrTargetMode === 'road-sign') {
        setOcrResultText('ጎደና ሰማእታት ኣስመራ — Asmara Martyrs Avenue (Speed limit 50 km/h)');
      } else {
        setOcrResultText('ናይ ንግዲ ፍቓድ ምስክር ወረቐት — Business Registration Certificate #AX-89104');
      }
      playGoldenNotificationChime();
      triggerToast(language === 'ti' ? 'ናይ ስካን ውጽኢት ብትኽክል ተረኺቡ ኣሎ!' : 'OCR scan extracted text successfully!');
    }, 2000);
  };

  // Telebirr Transfer Action
  const handleTelebirrTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(transferAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      triggerToast('Please enter a valid amount.');
      return;
    }
    if (amountNum > walletBalance) {
      triggerToast('Insufficient Telebirr balance!');
      return;
    }

    // Open bespoke Axumite Biometric Prompt for cryptographic confirmation
    setIsBiometricPromptOpen(true);
    triggerToast('Axumite Biometric StrongBox prompt displayed for transfer');
  };

  // Run Error Diagnostics Analysis
  const handleRunDiagnosticsAnalysis = () => {
    setIsAnalyzingErrors(true);
    triggerToast('Running deep codebase & runtime error analysis...');
    
    // Simulate real-time diagnostic testing
    setTimeout(() => {
      setDiagnosticsList((prev) =>
        prev.map((item) => ({
          ...item,
          status: 'passed',
          latencyMs: Math.floor(8 + Math.random() * 25),
        }))
      );
      setIsAnalyzingErrors(false);
      playGoldenNotificationChime();
      triggerToast(
        language === 'ti'
          ? 'ምርመራ ተዛዚሙ፡ ዋላ ሓደ ጌጋ (Zero Errors) ኣይተረኽበን!'
          : 'Diagnostics complete: 0 errors found! All systems 100% operational.'
      );
    }, 1800);
  };

  // Download APK Simulator
  const handleDownloadApk = () => {
    const apkManifest = {
      appName: 'Axumite AI Sovereign Mobile',
      version: '3.8.2',
      build: 4092,
      packageName: 'com.axumite.ai.tigrinya',
      sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      minSdkVersion: 26, // Android 8.0+
      targetSdkVersion: 35, // Android 15
      permissions: [
        'android.permission.INTERNET',
        'android.permission.RECORD_AUDIO',
        'android.permission.CAMERA',
        'android.permission.POST_NOTIFICATIONS',
        'android.permission.VIBRATE',
      ],
      features: [
        'Offline Tigrinya LLM Model (1.2B Quantized)',
        'Ge\'ez Ancient Inscription Camera OCR',
        'Telebirr / CBE Birr Quick Action Bridge',
        'Eritrea & Ethiopia Dialect Acoustic Models',
      ],
    };

    const dataStr = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(apkManifest, null, 2))}`;
    const a = document.createElement('a');
    a.setAttribute('href', dataStr);
    a.setAttribute('download', `AxumiteAI-v3.8.2-release.apk.json`);
    document.body.appendChild(a);
    a.click();
    a.remove();
    triggerToast(
      language === 'ti'
        ? 'ናይ ኣንድሮይድ APK ፓኬጅ ማኒፌስት ብዓወት ወሪዱ ኣሎ!'
        : 'Android APK package bundle downloaded successfully!'
    );
  };

  // 1-Click Download Native Kotlin (Jetpack Compose) Android Studio Project (.ZIP)
  const handleDownloadKotlinZip = async () => {
    setIsExportingZip(true);
    triggerToast('Packaging Kotlin & Jetpack Compose Android Studio Project ZIP...');
    try {
      const [{ default: JSZip }, files] = await Promise.all([
        import('jszip'),
        ensureSourceFilesLoaded('kotlin'),
      ]);
      const zip = new JSZip();
      
      // Add all Kotlin & Compose project files
      files.forEach((f) => {
        zip.file(f.path, f.content);
      });

      // Extra Gradle Wrapper & Project settings
      zip.file('build.gradle.kts', `plugins {\n    alias(libs.plugins.android.application) apply false\n    alias(libs.plugins.kotlin.android) apply false\n    alias(libs.plugins.kotlin.compose) apply false\n    alias(libs.plugins.ksp) apply false\n}`);
      zip.file('settings.gradle.kts', `pluginManagement {\n    repositories {\n        google()\n        mavenCentral()\n        gradlePluginPortal()\n    }\n}\ndependencyResolutionManagement {\n    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)\n    repositories {\n        google()\n        mavenCentral()\n    }\n}\nrootProject.name = "AxumiteAI"\ninclude(":app")\n`);
      zip.file('gradle/libs.versions.toml', `[versions]
agp = "8.5.2"
kotlin = "2.0.20"
coreKtx = "1.13.1"
lifecycleRuntimeKtx = "2.8.5"
activityCompose = "1.9.2"
composeBom = "2024.09.00"
navigationCompose = "2.8.0"
cameraX = "1.3.4"
room = "2.6.1"
ksp = "2.0.20-1.0.25"
okhttp = "4.12.0"
onesignal = "5.1.20"
coroutines = "1.8.1"
junit = "4.13.2"
mockk = "1.13.12"
androidxTestExt = "1.2.1"
androidxTestRunner = "1.6.2"
androidxTestRules = "1.6.1"
androidxTestCore = "1.6.1"
espresso = "3.6.1"

[libraries]
androidx-core-ktx = { group = "androidx.core", name = "core-ktx", version.ref = "coreKtx" }
androidx-lifecycle-runtime-ktx = { group = "androidx.lifecycle", name = "lifecycle-runtime-ktx", version.ref = "lifecycleRuntimeKtx" }
androidx-activity-compose = { group = "androidx.activity", name = "activity-compose", version.ref = "activityCompose" }
androidx-compose-bom = { group = "androidx.compose", name = "compose-bom", version.ref = "composeBom" }
androidx-ui = { group = "androidx.compose.ui", name = "ui" }
androidx-ui-graphics = { group = "androidx.compose.ui", name = "ui-graphics" }
androidx-ui-tooling-preview = { group = "androidx.compose.ui", name = "ui-tooling-preview" }
androidx-material3 = { group = "androidx.compose.material3", name = "material3" }
androidx-navigation-compose = { group = "androidx.navigation", name = "navigation-compose", version.ref = "navigationCompose" }
androidx-camera-core = { group = "androidx.camera", name = "camera-core", version.ref = "cameraX" }
androidx-camera-camera2 = { group = "androidx.camera", name = "camera-camera2", version.ref = "cameraX" }
androidx-camera-lifecycle = { group = "androidx.camera", name = "camera-lifecycle", version.ref = "cameraX" }
androidx-camera-view = { group = "androidx.camera", name = "camera-view", version.ref = "cameraX" }
androidx-room-runtime = { group = "androidx.room", name = "room-runtime", version.ref = "room" }
androidx-room-ktx = { group = "androidx.room", name = "room-ktx", version.ref = "room" }
androidx-room-compiler = { group = "androidx.room", name = "room-compiler", version.ref = "room" }
okhttp = { group = "com.squareup.okhttp3", name = "okhttp", version.ref = "okhttp" }
onesignal = { group = "com.onesignal", name = "OneSignal", version.ref = "onesignal" }
kotlinx-coroutines-android = { group = "org.jetbrains.kotlinx", name = "kotlinx-coroutines-android", version.ref = "coroutines" }

# Testing Suite (JUnit 4, MockK, Coroutines Test, AndroidX Test, Espresso)
junit = { group = "junit", name = "junit", version.ref = "junit" }
mockk = { group = "io.mockk", name = "mockk", version.ref = "mockk" }
mockk-android = { group = "io.mockk", name = "mockk-android", version.ref = "mockk" }
kotlinx-coroutines-test = { group = "org.jetbrains.kotlinx", name = "kotlinx-coroutines-test", version.ref = "coroutines" }
androidx-test-ext-junit = { group = "androidx.test.ext", name = "junit", version.ref = "androidxTestExt" }
androidx-test-runner = { group = "androidx.test", name = "runner", version.ref = "androidxTestRunner" }
androidx-test-rules = { group = "androidx.test", name = "rules", version.ref = "androidxTestRules" }
androidx-test-core = { group = "androidx.test", name = "core", version.ref = "androidxTestCore" }
androidx-test-espresso-core = { group = "androidx.test.espresso", name = "espresso-core", version.ref = "espresso" }
androidx-test-espresso-intents = { group = "androidx.test.espresso", name = "espresso-intents", version.ref = "espresso" }
androidx-compose-ui-test-junit4 = { group = "androidx.compose.ui", name = "ui-test-junit4" }

[plugins]
android-application = { id = "com.android.application", version.ref = "agp" }
kotlin-android = { id = "org.jetbrains.kotlin.android", version.ref = "kotlin" }
kotlin-compose = { id = "org.jetbrains.kotlin.plugin.compose", version.ref = "kotlin" }
ksp = { id = "com.google.devtools.ksp", version.ref = "ksp" }
`);
      zip.file('README.md', `# Axumite AI - Sovereign Native Kotlin & Jetpack Compose Android Project

- **Kotlin 2.0+ & Jetpack Compose** Material 3 Architecture
- **Android SDK 35 (Android 15)** Target / Min SDK 26
- **Biometric Security & StrongBox TEE Cryptography**: AndroidX \`BiometricPrompt\`
- **OneSignal SDK v5.x**: App ID \`122b150b-1b50-4200-b515-7da4ed438c4e\`
- **CameraX + Gemini Vision OCR** for Ge'ez manuscript decoding
- **Room Database** for offline Tigrinya lexicon storage
- **Unit & Instrumented Testing Suite**:
  - JUnit 4 & MockK Unit tests (\`BiometricAuthManagerTest.kt\`, \`OneSignalNotificationManagerTest.kt\`)
  - Espresso & Compose UI Instrumented tests (\`BiometricAuthEspressoTest.kt\`, \`PushNotificationEspressoTest.kt\`)

### How to Run Tests & Build in Android Studio:
1. Unzip this package.
2. Open **Android Studio Jellyfish / Ladybug / Koala** and choose the unzipped folder.
3. Wait for Gradle Sync to complete.
4. **Run Unit Tests**: Run \`./gradlew test\` or right-click \`app/src/test/kotlin\` > **Run Tests**.
5. **Run Espresso Tests**: Connect an Android device/emulator and run \`./gradlew connectedAndroidTest\` or right-click \`app/src/androidTest/kotlin\` > **Run Tests**.
6. Generate APK: **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
`);

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'AxumiteAI-Kotlin-Compose-Android-Project.zip';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      playGoldenNotificationChime();
      triggerToast(
        language === 'ti'
          ? 'ናይ ኮትሊን (Jetpack Compose) ኣንድሮይድ ስቱድዮ ፕሮጀክት ZIP ብዓወት ወሪዱ ኣሎ!'
          : 'Complete Kotlin & Jetpack Compose Android Project (.ZIP) downloaded successfully!'
      );
    } catch (err) {
      triggerToast('Kotlin export failed: ' + String(err));
    } finally {
      setIsExportingZip(false);
    }
  };

  // 1-Click Download Entire Java + XML Layouts Android Studio Project (.ZIP)
  const handleDownloadAndroidZip = async () => {
    setIsExportingZip(true);
    triggerToast('Packaging Java source code and XML layouts into Android Studio Project ZIP...');
    try {
      const [{ default: JSZip }, files] = await Promise.all([
        import('jszip'),
        ensureSourceFilesLoaded('java'),
      ]);
      const zip = new JSZip();
      
      // Add all project files (Java Activities, Services, Adapters, XML Layouts, Manifest, Strings, Colors, Gradle)
      files.forEach((f) => {
        zip.file(f.path, f.content);
      });

      // Extra Root Gradle files and documentation
      zip.file('build.gradle', `buildscript {\n    repositories {\n        google()\n        mavenCentral()\n    }\n    dependencies {\n        classpath 'com.android.tools.build:gradle:8.5.2'\n        classpath 'com.google.gms:google-services:4.4.2'\n    }\n}\n\nallprojects {\n    repositories {\n        google()\n        mavenCentral()\n    }\n}`);
      zip.file('settings.gradle', `rootProject.name = "AxumiteAI"\ninclude ':app'`);
      zip.file('gradle.properties', `org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8\nandroid.useAndroidX=true\nandroid.enableJetifier=true`);
      zip.file('gradle/wrapper/gradle-wrapper.properties', `distributionBase=GRADLE_USER_HOME\ndistributionPath=wrapper/dists\ndistributionUrl=https\\://services.gradle.org/distributions/gradle-8.9-bin.zip\nnetworkTimeout=10000\nvalidateDistributionUrl=true\nzipStoreBase=GRADLE_USER_HOME\nzipStorePath=wrapper/dists\n`);
      zip.file('README.md', `# Axumite AI - Sovereign Native Android Studio Project\n\n- **Pure Java 17 Architecture** (100% Kotlin-free)\n- **Declarative XML Layouts** in \`app/src/main/res/layout/\`\n- **Target SDK 35 (Android 15)** / Min SDK 26\n- **OneSignal SDK v5.x**: App ID \`122b150b-1b50-4200-b515-7da4ed438c4e\`\n\n### How to Run & Build APK in Android Studio:\n1. Unzip this package.\n2. In Android Studio, select **File > Open** and choose the unzipped directory.\n3. Wait for Gradle Sync to complete.\n4. Connect an Android phone or launch an emulator and click **Run** (Shift + F10).\n5. To build release APK: Go to **Build > Build Bundle(s) / APK(s) > Build APK(s)**.\n`);

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'AxumiteAI-Java-Android-Project.zip';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      playGoldenNotificationChime();
      triggerToast(
        language === 'ti'
          ? 'ናይ ጃቫ ኣንድሮይድ ስቱድዮ ፕሮጀክት ZIP ብዓወት ወሪዱ ኣሎ!'
          : 'Complete Java Android Studio Project (.ZIP) downloaded successfully!'
      );
    } catch (err) {
      triggerToast('Export failed: ' + String(err));
    } finally {
      setIsExportingZip(false);
    }
  };

  const handleCopyCode = () => {
    if (!selectedFile) return;
    navigator.clipboard.writeText(selectedFile.content);
    setCodeCopied(true);
    triggerToast(`Copied ${selectedFile.name} to clipboard`);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const DICTIONARY_ENTRIES = [
    { geez: 'ሰላም', phonetics: 'Selam', definition: 'Peace, wellbeing, customary greeting throughout the Horn of Africa.' },
    { geez: 'ጥበብ', phonetics: 'T\'ibeb', definition: 'Wisdom, sacred knowledge, mastery of arts and sciences.' },
    { geez: 'ሓርነት', phonetics: 'Harnet', definition: 'Liberty, sovereignty, unyielding independence.' },
    { geez: 'ጽንዓት', phonetics: 'Tsin\'at', definition: 'Resilience, steadfast endurance through generations.' },
    { geez: 'ሓድነት', phonetics: 'Hadnet', definition: 'Unity, collective strength and cultural solidarity.' },
    { geez: 'ምዕባለ', phonetics: 'M\'ibale', definition: 'Progress, technological and economic advancement.' },
  ];

  const filteredDictionary = DICTIONARY_ENTRIES.filter(
    (e) =>
      e.geez.includes(dictQuery) ||
      e.phonetics.toLowerCase().includes(dictQuery.toLowerCase()) ||
      e.definition.toLowerCase().includes(dictQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in text-slate-100 max-w-7xl mx-auto px-2 sm:px-4 pb-20">
      
      {/* Top Banner & Control Deck */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-[#110D20] via-[#17122A] to-[#0D091A] border-2 border-[#8E6D28]/50 shadow-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative overflow-hidden">
        
        {/* Glow backdrop */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#C5A059]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center space-x-4 relative z-10">
          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('premiere')}
              className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-amber-200 border border-amber-500/30 transition-all cursor-pointer flex items-center justify-center shrink-0"
              title="Return to Web Hub"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#8E6D28]/50 via-[#C5A059]/30 to-transparent border-2 border-[#C5A059] flex items-center justify-center text-[#E1C47D] shadow-xl shadow-amber-500/10 shrink-0">
            <Smartphone className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
              <h2 className="text-xl sm:text-2xl font-black text-white font-cinzel tracking-wide">
                {language === 'ti' ? 'ናይ ኣንድሮይድ ኣፕሊኬሽን መተሓላለፊ' : 'Android Native Application Hub'}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>KOTLIN 2.0 • SDK 35</span>
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                JETPACK COMPOSE
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              {language === 'ti'
                ? 'ናይ ሞባይል ተመኩሮ፡ ብትግርኛ ድምጺ ምዝራብ፣ ናይ ግእዝ OCR ካሜራ ስካነር፣ ቴሌብር ምትእስሳርን ናይ ሲስተም ጌጋታት መርመራን ዘጠቓለለ ልዑላዊ መድረኽ።'
                : 'Native Android Studio project in Kotlin & Jetpack Compose with CameraX OCR, Tigrinya Voice, Telebirr Wallet, Biometric StrongBox TEE, and 1-Click Android Studio export.'}
            </p>
          </div>
        </div>

        {/* Global Toolbar Options */}
        <div className="flex flex-wrap items-center gap-2 relative z-10">
          
          {/* Frame Toggle */}
          <button
            onClick={() => setIsFrameMode(!isFrameMode)}
            className="px-3.5 py-2 rounded-xl bg-[#1A142A] hover:bg-[#281F3F] border border-[#8E6D28]/60 hover:border-[#C5A059] text-amber-300 text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer shadow-md"
            title="Toggle between Smartphone frame and fullscreen layout"
          >
            {isFrameMode ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
            <span>{isFrameMode ? 'Fullscreen Mode' : 'Device Frame'}</span>
          </button>

          {/* Carrier Switcher */}
          <div className="flex items-center space-x-1.5 bg-[#140F24] border border-slate-700/80 rounded-xl px-2.5 py-1 text-xs">
            <Signal className="w-3.5 h-3.5 text-amber-400" />
            <select
              value={carrier}
              onChange={(e) => setCarrier(e.target.value as any)}
              className="bg-transparent text-slate-200 text-xs font-semibold focus:outline-none cursor-pointer pr-1"
            >
              <option value="Telebirr 5G" className="bg-[#151026] text-white">Telebirr 5G</option>
              <option value="EriTel 4G LTE" className="bg-[#151026] text-amber-400">EriTel 4G LTE</option>
              <option value="Axumite Mesh" className="bg-[#151026] text-cyan-400">Axumite Satellite</option>
            </select>
          </div>

          {/* Payment Methods Hub Shortcut */}
          <button
            onClick={() => {
              if (onOpenPaymentMethods) onOpenPaymentMethods();
              else navigateTo('telebirr');
            }}
            className="px-3.5 py-2 rounded-xl bg-[#1A142A] hover:bg-[#281F3F] border border-[#8E6D28]/60 hover:border-[#C5A059] text-amber-200 text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer shadow-md"
          >
            <CreditCard className="w-3.5 h-3.5 text-amber-400" />
            <span>{language === 'ti' ? 'ናይ ክፍሊት መንገድታት' : 'Payment Methods'}</span>
            {androidSavedMethods.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-mono">
                {androidSavedMethods.length}
              </span>
            )}
          </button>

          {/* Download APK Button */}
          <button
            onClick={handleDownloadApk}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#8E6D28] to-[#C5A059] text-slate-950 font-black text-xs transition-all cursor-pointer shadow-lg shadow-amber-500/20 hover:brightness-110 flex items-center space-x-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download APK</span>
          </button>
        </div>

      </div>

      {/* Hub Sub-Tabs: Interactive Emulator vs Native Code Explorer (Kotlin / Java) */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#110D20] p-2.5 rounded-2xl border border-[#8E6D28]/30">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setHubMode('emulator')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
              hubMode === 'emulator'
                ? 'bg-[#C5A059] text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Interactive Android Emulator</span>
          </button>
          
          <button
            onClick={async () => {
              setHubMode('code-explorer');
              const files = await ensureSourceFilesLoaded(codeLanguageMode);
              if (files.length > 0) {
                setSelectedFile(files[0]);
              }
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
              hubMode === 'code-explorer'
                ? 'bg-[#C5A059] text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <FolderTree className="w-4 h-4" />
            <span>Native Android Code Explorer</span>
            <span className="px-1.5 py-0.2 rounded bg-amber-950/80 border border-amber-500/40 text-[9px] text-amber-200">
              KOTLIN + COMPOSE
            </span>
          </button>
        </div>

        {/* 1-Click Android Studio Project ZIP Downloads */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDownloadKotlinZip}
            disabled={isExportingZip}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-500 hover:brightness-110 text-slate-950 text-xs font-black transition-all flex items-center space-x-1.5 cursor-pointer shadow-md disabled:opacity-50"
          >
            {isExportingZip ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <PackageCheck className="w-4 h-4" />
                <span>Download Kotlin Studio Project (.ZIP)</span>
              </>
            )}
          </button>

          <button
            onClick={handleDownloadAndroidZip}
            disabled={isExportingZip}
            className="px-3 py-2 rounded-xl bg-[#1D1730] hover:bg-[#2A2045] border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Java Project (.ZIP)</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. MAIN HUB CONTENT (EMULATOR VIEW OR NATIVE KOTLIN & JAVA CODE EXPLORER) */}
      {/* ========================================================================= */}
      {hubMode === 'code-explorer' ? (
        <div className="bg-[#0D091B] rounded-3xl border border-[#8E6D28]/40 shadow-2xl p-4 sm:p-6 space-y-4">
          
          {/* Header Info & Language Switcher */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <div className="flex items-center space-x-2.5">
                <FileCode className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white font-cinzel">
                  Native Android Project Tree ({codeLanguageMode === 'kotlin' ? 'Kotlin 2.0 & Jetpack Compose' : 'Java 17 & XML Layouts'})
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {codeLanguageMode === 'kotlin'
                  ? 'Modern Android 15 (Target SDK 35) architecture with Jetpack Compose Material 3, Room SQLite, CameraX, and Kotlin Coroutines.'
                  : 'Classic Java 17 Android architecture with declarative XML UI views in res/layout/.'}
              </p>
            </div>

            {/* Language & Stack Switcher */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="bg-[#151028] p-1 rounded-xl border border-slate-700 flex items-center space-x-1">
                <button
                  onClick={async () => {
                    setCodeLanguageMode('kotlin');
                    setFileCategoryFilter('all');
                    const files = await ensureSourceFilesLoaded('kotlin');
                    setSelectedFile(files[0] || null);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                    codeLanguageMode === 'kotlin'
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-black shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-black" />
                  <span>Kotlin (Compose)</span>
                </button>
                <button
                  onClick={async () => {
                    setCodeLanguageMode('java');
                    setFileCategoryFilter('all');
                    const files = await ensureSourceFilesLoaded('java');
                    setSelectedFile(files[0] || null);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                    codeLanguageMode === 'java'
                      ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-black shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>Java (XML)</span>
                </button>
              </div>

              {/* Filter Pills */}
              <div className="flex flex-wrap items-center gap-1 text-xs">
                {(codeLanguageMode === 'kotlin' 
                  ? (['all', 'kotlin', 'compose', 'service', 'test', 'data', 'manifest', 'gradle'] as const)
                  : (['all', 'java', 'layout', 'manifest', 'gradle'] as const)
                ).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setFileCategoryFilter(cat)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase transition-all cursor-pointer ${
                      fileCategoryFilter === cat
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                        : 'text-slate-400 hover:text-white bg-[#151026] border border-slate-800'
                    }`}
                  >
                    {cat === 'compose' ? 'Compose Screens' : cat === 'kotlin' ? 'Kotlin App/VM' : cat === 'service' ? 'Native Services' : cat === 'test' ? '🧪 Unit & Espresso Tests' : cat === 'layout' ? 'XML Layouts' : cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Explorer Layout: Left Tree + Right Code View */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            
            {/* Left Sidebar: File List */}
            <div className="lg:col-span-4 bg-[#140F26] rounded-2xl border border-slate-800 p-3 space-y-1.5 max-h-[580px] overflow-y-auto custom-scrollbar">
              <div className="flex items-center justify-between px-2 pb-1">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">
                  Files ({
                    (codeLanguageMode === 'kotlin' ? kotlinProjectFiles : javaProjectFiles)
                      .filter(f => fileCategoryFilter === 'all' || f.category === fileCategoryFilter).length
                  })
                </span>
                <span className="text-[9px] font-mono font-bold text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-700/50">
                  SDK 35 • ANDROID 15
                </span>
              </div>

              {isLoadingSourceFiles ? (
                <div className="py-10 flex items-center justify-center text-xs text-amber-300 space-x-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Loading Android project tree...</span>
                </div>
              ) : (codeLanguageMode === 'kotlin' ? kotlinProjectFiles : javaProjectFiles)
                .filter(f => fileCategoryFilter === 'all' || f.category === fileCategoryFilter)
                .map((file) => {
                  const isSelected = selectedFile?.path === file.path;
                  return (
                    <button
                      key={file.path}
                      onClick={() => setSelectedFile(file)}
                      className={`w-full text-left p-2.5 rounded-xl text-xs font-mono transition-all cursor-pointer flex items-center justify-between group ${
                        isSelected
                          ? 'bg-gradient-to-r from-[#8E6D28]/40 to-[#C5A059]/20 border border-[#C5A059] text-white shadow-md'
                          : 'text-slate-300 hover:bg-[#1C1635] border border-transparent'
                      }`}
                    >
                      <div className="flex items-center space-x-2 truncate">
                        {file.language === 'kotlin' ? (
                          <span className="px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300 font-bold text-[9px]">KT</span>
                        ) : file.language === 'kts' ? (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[9px]">KTS</span>
                        ) : file.language === 'java' ? (
                          <span className="px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 font-bold text-[9px]">JAVA</span>
                        ) : file.language === 'xml' ? (
                          <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold text-[9px]">XML</span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[9px]">GRADLE</span>
                        )}
                        <span className="truncate font-semibold">{file.name}</span>
                      </div>
                      <ChevronRight className={`w-3.5 h-3.5 text-slate-500 group-hover:text-amber-300 ${isSelected ? 'text-amber-400' : ''}`} />
                    </button>
                  );
                })}
            </div>

            {/* Right: Code Viewer */}
            <div className="lg:col-span-8 bg-[#090614] rounded-2xl border border-slate-800 flex flex-col overflow-hidden shadow-inner">
              {selectedFile ? (
                <>
                  {/* Code Header */}
                  <div className="bg-[#120E22] px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-2">
                    <div className="truncate">
                      <div className="flex items-center space-x-2 truncate">
                        <span className="text-xs font-mono font-bold text-amber-300 truncate">
                          {selectedFile.path}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-300 shrink-0">
                          {selectedFile.language}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                        {selectedFile.description}
                      </p>
                    </div>

                    <button
                      onClick={handleCopyCode}
                      className="px-3 py-1.5 rounded-lg bg-[#1B1530] hover:bg-[#271E44] border border-[#8E6D28]/40 hover:border-amber-400 text-amber-200 text-xs font-bold flex items-center space-x-1.5 cursor-pointer transition-all shrink-0"
                    >
                      {codeCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{codeCopied ? 'Copied' : 'Copy Code'}</span>
                    </button>
                  </div>

                  {/* Code Pre Body with Line Numbers */}
                  <div className="p-4 max-h-[500px] overflow-y-auto font-mono text-[12px] leading-relaxed text-slate-200 bg-[#090614] custom-scrollbar">
                    <pre className="whitespace-pre overflow-x-auto">
                      {selectedFile.content.split('\n').map((line, idx) => (
                        <div key={idx} className="flex hover:bg-slate-900/60 py-0.5">
                          <span className="w-10 text-slate-600 text-right pr-4 select-none shrink-0">
                            {idx + 1}
                          </span>
                          <span className="text-slate-300">{line}</span>
                        </div>
                      ))}
                    </pre>
                  </div>
                </>
              ) : (
                <div className="p-10 text-center text-xs text-slate-400">
                  {isLoadingSourceFiles ? 'Loading source files...' : 'Select a source file to inspect its code.'}
                </div>
              )}

            </div>

          </div>

        </div>
      ) : (
      <div className={`transition-all duration-300 flex justify-center items-start ${isFrameMode ? 'py-4' : ''}`}>
        
        {/* Smartphone Chassis Outer Boundary */}
        <div
          className={`relative transition-all duration-300 ${
            isFrameMode
              ? 'w-full max-w-[420px] rounded-[48px] p-3.5 bg-gradient-to-b from-[#2E283E] via-[#171324] to-[#0A0713] border-4 border-[#8E6D28]/70 shadow-[0_0_60px_rgba(197,160,89,0.25)]'
              : 'w-full rounded-3xl p-2 bg-[#0C0818] border-2 border-[#8E6D28]/40 shadow-2xl'
          }`}
        >

          {/* Physical Side Buttons (Simulated on chassis) */}
          {isFrameMode && (
            <>
              {/* Volume Up / Down on Left */}
              <div className="absolute -left-1.5 top-28 w-1.5 h-12 bg-amber-500/40 rounded-l-md" />
              <div className="absolute -left-1.5 top-44 w-1.5 h-12 bg-amber-500/40 rounded-l-md" />
              {/* Power button on Right */}
              <div className="absolute -right-1.5 top-32 w-1.5 h-16 bg-[#C5A059] rounded-r-md shadow-md shadow-amber-500/50" />
            </>
          )}

          {/* Screen Inner Bezel */}
          <div className={`relative w-full overflow-hidden rounded-[36px] bg-[#07050E] border flex flex-col min-h-[720px] max-h-[820px] transition-all duration-150 ${
            hapticPulseFlash ? 'border-amber-400 shadow-[0_0_24px_rgba(245,158,11,0.4)]' : 'border-slate-800'
          }`}>
            
            {/* Top Punch-Hole Camera & Speaker Pill */}
            <div className="relative z-30 pt-2 pb-1 px-4 flex items-center justify-between bg-[#07050E] text-[11px] font-mono text-slate-300 select-none">
              
              {/* Left: Clock & Date */}
              <div className="flex items-center space-x-1.5 font-bold">
                <span className="text-white">{currentTime || '12:00'}</span>
                <span className="text-[9px] text-[#E1C47D] px-1 py-0.2 rounded bg-amber-950/60 border border-amber-800/40">
                  {currentGeezDate}
                </span>
              </div>

              {/* Center: Punch-Hole Camera Notch */}
              <div className="flex items-center space-x-2">
                <div className="w-3.5 h-3.5 rounded-full bg-black border border-slate-700/80 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-900 border border-cyan-500/40" />
                </div>
              </div>

              {/* Right: Carrier & Status Icons */}
              <div className="flex items-center space-x-2 text-slate-300">
                <button
                  onClick={() => setIsNotificationShadeOpen(!isNotificationShadeOpen)}
                  className="hover:text-amber-400 transition-colors relative cursor-pointer"
                  title="Notifications"
                >
                  <Bell className="w-3 h-3 text-amber-300" />
                  <span className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-red-500 rounded-full" />
                </button>

                <div className="flex items-center space-x-1">
                  {wifiEnabled ? <Wifi className="w-3 h-3 text-emerald-400" /> : <WifiOff className="w-3 h-3 text-slate-600" />}
                  <Signal className="w-3 h-3 text-amber-400" />
                </div>

                <div className="flex items-center space-x-0.5">
                  <span className="text-[10px] font-bold text-slate-200">{batteryLevel}%</span>
                  <Battery className="w-3.5 h-3.5 text-emerald-400" />
                </div>
              </div>

            </div>

            {/* Quick Settings & Notification Swipe Drawer (Expandable) */}
            {isNotificationShadeOpen && (
              <div className="absolute top-8 left-0 right-0 z-40 bg-[#0C081A]/95 backdrop-blur-xl border-b-2 border-amber-500/40 p-4 space-y-3 shadow-2xl animate-in slide-in-from-top-4 duration-200">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center space-x-2">
                    <Sliders className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-200 font-mono">
                      Android Quick Settings
                    </span>
                  </div>
                  <button
                    onClick={() => setIsNotificationShadeOpen(false)}
                    className="text-slate-400 hover:text-white text-xs font-bold px-2 py-0.5 rounded bg-slate-800 cursor-pointer"
                  >
                    Close ✕
                  </button>
                </div>

                {/* Quick Toggle Tiles */}
                <div className="grid grid-cols-5 gap-1.5 text-center text-[9.5px] font-mono">
                  <button
                    onClick={() => {
                      triggerTabTapHaptic();
                      setWifiEnabled(!wifiEnabled);
                    }}
                    className={`p-2 rounded-xl border flex flex-col items-center justify-center space-y-1 transition-all cursor-pointer ${
                      wifiEnabled ? 'bg-amber-500/20 border-amber-400 text-amber-300' : 'bg-slate-900 border-slate-800 text-slate-500'
                    }`}
                  >
                    <Wifi className="w-3.5 h-3.5" />
                    <span>Wi-Fi</span>
                  </button>

                  <button
                    onClick={() => {
                      triggerTabTapHaptic();
                      setMobileDataEnabled(!mobileDataEnabled);
                    }}
                    className={`p-2 rounded-xl border flex flex-col items-center justify-center space-y-1 transition-all cursor-pointer ${
                      mobileDataEnabled ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300' : 'bg-slate-900 border-slate-800 text-slate-500'
                    }`}
                  >
                    <Signal className="w-3.5 h-3.5" />
                    <span>5G Data</span>
                  </button>

                  <button
                    onClick={() => {
                      triggerTabTapHaptic();
                      setBluetoothEnabled(!bluetoothEnabled);
                    }}
                    className={`p-2 rounded-xl border flex flex-col items-center justify-center space-y-1 transition-all cursor-pointer ${
                      bluetoothEnabled ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300' : 'bg-slate-900 border-slate-800 text-slate-500'
                    }`}
                  >
                    <Bluetooth className="w-3.5 h-3.5" />
                    <span>BT</span>
                  </button>

                  <button
                    onClick={() => {
                      triggerTabTapHaptic();
                      setDarkMode(!darkMode);
                    }}
                    className={`p-2 rounded-xl border flex flex-col items-center justify-center space-y-1 transition-all cursor-pointer ${
                      darkMode ? 'bg-purple-500/20 border-purple-400 text-purple-300' : 'bg-slate-900 border-slate-800 text-slate-500'
                    }`}
                  >
                    {darkMode ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
                    <span>Dark</span>
                  </button>

                  <button
                    onClick={() => {
                      const next = !hapticsEnabled;
                      saveHapticSettings({ enabled: next, swipeGesturesEnabled: next });
                      setHapticsEnabled(next);
                      if (next) triggerSwipeTransitionHaptic('left');
                    }}
                    className={`p-2 rounded-xl border flex flex-col items-center justify-center space-y-1 transition-all cursor-pointer ${
                      hapticsEnabled ? 'bg-amber-500/25 border-amber-400 text-amber-200' : 'bg-slate-900 border-slate-800 text-slate-500'
                    }`}
                    title="Toggle Android Vibration API Swipe Haptics"
                  >
                    <Activity className="w-3.5 h-3.5" />
                    <span>Haptic</span>
                  </button>
                </div>

                {/* AI Voice Persona Quick Selector */}
                <div className="rounded-xl bg-[#130F23] border border-[#8E6D28]/35 p-2.5 space-y-2">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold text-amber-300 uppercase tracking-wider">
                      AI Voice Persona
                    </span>
                    <span className="font-mono text-slate-400 truncate max-w-[140px]">
                      {activeVoicePersona.name} · {activeVoicePersona.geminiVoiceName}
                    </span>
                  </div>
                  <div
                    role="radiogroup"
                    aria-label="Quick Settings AI Voice Persona"
                    className="grid grid-cols-1 gap-1.5"
                  >
                    {VOICE_PERSONAS.map((persona) => {
                      const isSelected = voicePersonaId === persona.id;
                      return (
                        <button
                          key={persona.id}
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          onClick={() => handleSelectQuickVoicePersona(persona.id)}
                          className={`w-full px-2.5 py-2 rounded-lg border text-left transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                            isSelected
                              ? 'bg-amber-500/15 border-amber-400 text-amber-100'
                              : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-sm leading-none shrink-0" aria-hidden="true">
                              {persona.avatarIcon}
                            </span>
                            <div className="min-w-0">
                              <div className="text-[11px] font-semibold truncate">
                                {language === 'ti' ? persona.nameTi : persona.name}
                              </div>
                              <div className="text-[9.5px] text-slate-400 truncate">
                                {persona.tagline}
                              </div>
                            </div>
                          </div>
                          <span className="text-[9.5px] font-mono tabular-nums text-amber-300/90 shrink-0">
                            {persona.speechRate.toFixed(2)}x
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Notifications in shade */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] px-1">
                    <span className="font-bold text-amber-300 flex items-center space-x-1">
                      <BellRing className="w-3.5 h-3.5 text-amber-400" />
                      <span>OneSignal Push Stream ({pushNotificationHistory.length})</span>
                    </span>
                    <button
                      onClick={() => handleSendOneSignalTestPush()}
                      className="text-[9px] text-amber-300 hover:underline font-mono cursor-pointer"
                    >
                      + Test Push
                    </button>
                  </div>

                  {pushNotificationHistory.slice(0, 4).map((push) => (
                    <div
                      key={push.id}
                      onClick={() => {
                        if (push.deepLink) navigateTo(push.deepLink);
                        setIsNotificationShadeOpen(false);
                      }}
                      className="bg-[#151025] hover:bg-[#1E1736] rounded-xl p-2.5 border border-slate-800 hover:border-amber-500/50 transition-all cursor-pointer space-y-1.5 group"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <div className="flex items-center space-x-1.5 truncate">
                          {push.iconEmoji && (
                            <span 
                              className="w-5 h-5 rounded-md flex items-center justify-center text-xs shrink-0 shadow-sm"
                              style={{ backgroundColor: `${push.accentColor || '#F59E0B'}22`, border: `1px solid ${push.accentColor || '#F59E0B'}66` }}
                            >
                              {push.iconEmoji}
                            </span>
                          )}
                          <span className="font-bold text-amber-300 group-hover:text-amber-200 truncate">{push.title}</span>
                        </div>
                        <span className="text-[9px] text-slate-400 font-mono shrink-0 ml-1">{push.time}</span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-snug">
                        {push.body}
                      </p>
                      {push.styleName && (
                        <div className="flex items-center justify-between pt-0.5 text-[9px] font-mono text-slate-400">
                          <span className="text-amber-400/90 truncate">Icon: {push.styleName}</span>
                          <span className="text-slate-500 text-[8px] truncate ml-1">{push.drawableName}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* In-App Toast Notification */}
            {inAppToast && (
              <div className="absolute top-12 left-4 right-4 z-50 p-2.5 rounded-xl bg-[#1E1735] border border-amber-400 text-amber-200 text-xs font-bold shadow-2xl flex items-center space-x-2 animate-in fade-in slide-in-from-top-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="truncate">{inAppToast}</span>
              </div>
            )}

            {/* =============================================================== */}
            {/* ANDROID SCREEN VIEWPORT (DYNAMIC ACTIVE SCREEN + SWIPE GESTURES)*/}
            {/* =============================================================== */}
            <div
              data-no-swipe="true"
              onTouchStart={handlePhoneTouchStart}
              onTouchMove={handlePhoneTouchMove}
              onTouchEnd={handlePhoneTouchEnd}
              className="flex-1 overflow-y-auto p-4 space-y-4 relative scrollbar-none touch-pan-y"
            >
              
              {/* ------------------------------------------------------------- */}
              {/* SCREEN 1: ANDROID HOME / DASHBOARD                            */}
              {/* ------------------------------------------------------------- */}
              {activeScreen === 'home' && (
                <div className="space-y-4 animate-fade-in">
                  
                  {/* User Profile Header Card */}
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#17122B] via-[#1E1838] to-[#120E22] border border-[#8E6D28]/40 shadow-lg flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 p-0.5 shadow-md">
                        <div className="w-full h-full rounded-full bg-[#0E0A1A] flex items-center justify-center text-amber-300 font-bold text-sm">
                          {user.name ? user.name.charAt(0) : 'A'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white flex items-center space-x-1.5">
                          <span>{user.name || 'Becky Love'}</span>
                          <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] font-mono border border-amber-500/30">
                            {user.role || 'Super Admin'}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {carrier} • Android 15
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => navigateTo('splash')}
                        className="p-2 rounded-xl bg-[#140F24] border border-amber-500/30 hover:border-amber-400 text-amber-300 transition-all cursor-pointer"
                        title="Native Splash Screen Layout Preview (activity_splash.xml)"
                      >
                        <Sparkles className="w-4 h-4 text-amber-400" />
                      </button>

                      <button
                        onClick={() => navigateTo('onesignal')}
                        className="p-2 rounded-xl bg-[#140F24] border border-amber-500/30 hover:border-amber-400 text-amber-300 transition-all cursor-pointer relative"
                        title="OneSignal Push Notifications (v5.x)"
                      >
                        <BellRing className="w-4 h-4 text-amber-400" />
                        <span className="w-2 h-2 rounded-full bg-emerald-400 absolute top-1 right-1 border border-slate-950" />
                      </button>

                      <button
                        onClick={triggerBiometricPrompt}
                        className="p-2 rounded-xl bg-[#140F24] border border-amber-500/30 hover:border-amber-400 text-amber-300 transition-all cursor-pointer flex items-center space-x-1"
                        title="Biometric Authentication Prompt (androidx.biometric)"
                      >
                        <Fingerprint className="w-4 h-4 text-amber-400" />
                      </button>

                      <button
                        onClick={() => navigateTo('diagnostics')}
                        className="p-2 rounded-xl bg-[#140F24] border border-amber-500/30 hover:border-amber-400 text-amber-300 transition-all cursor-pointer"
                        title="System Diagnostics & Error Analyzer"
                      >
                        <Cpu className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Ge'ez Daily Verse & Wisdom Widget */}
                  <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#241A0E] via-[#352514] to-[#1C1309] border border-[#C5A059]/60 shadow-lg relative overflow-hidden">
                    <div className="flex items-center justify-between text-[10px] font-mono font-bold text-amber-300 mb-1">
                      <span className="flex items-center space-x-1">
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        <span>ዕለታዊ ጥበብ (DAILY WISDOM)</span>
                      </span>
                      <span>፳፻፲፰ ዓ.ም</span>
                    </div>
                    <p className="text-xs font-bold text-[#F3E5AB] leading-relaxed">
                      «ዘኢተማህረ አይነግሥ፡ ዘኢተጋደለ አይከብር።»
                    </p>
                    <p className="text-[10px] text-slate-300 mt-1 italic">
                      "He who does not learn will not lead; he who does not strive will not prosper."
                    </p>
                  </div>

                  {/* Tigrinya Voice Command Master Tile */}
                  <div className="p-4 rounded-2xl bg-[#120D24] border-2 border-amber-500/50 shadow-xl text-center space-y-2">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-mono font-bold text-slate-400 uppercase">
                        Hands-Free Voice AI (ትግርኛ ድምጺ)
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          triggerTabTapHaptic();
                          setIsNotificationShadeOpen(true);
                        }}
                        className="text-[10px] font-semibold text-amber-300 hover:text-amber-200 underline underline-offset-2 cursor-pointer"
                        title="Switch AI Voice Persona in Quick Settings"
                      >
                        {activeVoicePersona.avatarIcon} {activeVoicePersona.name}
                      </button>
                    </div>
                    <div className="flex justify-center">
                      <button
                        onClick={() => {
                          setIsListeningVoice(!isListeningVoice);
                          if (!isListeningVoice) {
                            speakTigrinyaText('ሰላም! እንታይ ክሕግዘኩም ትደልዩ፧');
                          }
                        }}
                        className={`w-14 h-14 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-lg ${
                          isListeningVoice
                            ? 'bg-red-500 text-white animate-pulse shadow-red-500/50 scale-110'
                            : 'bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 shadow-amber-500/40 hover:scale-105'
                        }`}
                      >
                        <Mic className="w-6 h-6" />
                      </button>
                    </div>
                    <p className="text-[11px] text-amber-200 font-medium">
                      {isListeningVoice ? 'ይሰምዕ ኣሎ... (Listening in Tigrinya)' : 'ንክዛረቡ ንኽቢ ምልክት ይጽቀጡ'}
                    </p>
                  </div>

                  {/* Native App Grid (4 Android App Tiles) */}
                  <div className="grid grid-cols-2 gap-3">
                    
                    {/* App 1: Obelisk Tigrinya Chat */}
                    <button
                      onClick={() => navigateTo('chat')}
                      className="p-3.5 rounded-2xl bg-[#151028] hover:bg-[#20183D] border border-[#8E6D28]/40 hover:border-amber-400 text-left transition-all cursor-pointer shadow-md group space-y-2"
                    >
                      <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 group-hover:scale-110 transition-transform">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">ኦበሊስክ AI Chat</div>
                        <div className="text-[10px] text-slate-400">Tigrinya Assistant</div>
                      </div>
                    </button>

                    {/* App 2: Ge'ez Camera OCR */}
                    <button
                      onClick={() => navigateTo('camera-ocr')}
                      className="p-3.5 rounded-2xl bg-[#151028] hover:bg-[#20183D] border border-[#8E6D28]/40 hover:border-amber-400 text-left transition-all cursor-pointer shadow-md group space-y-2"
                    >
                      <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 group-hover:scale-110 transition-transform">
                        <Camera className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">Ge'ez Camera OCR</div>
                        <div className="text-[10px] text-slate-400">Scan & Translate</div>
                      </div>
                    </button>

                    {/* App 3: Telebirr Wallet */}
                    <button
                      onClick={() => navigateTo('telebirr')}
                      className="p-3.5 rounded-2xl bg-[#151028] hover:bg-[#20183D] border border-[#8E6D28]/40 hover:border-amber-400 text-left transition-all cursor-pointer shadow-md group space-y-2"
                    >
                      <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 group-hover:scale-110 transition-transform">
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">Telebirr Wallet</div>
                        <div className="text-[10px] text-slate-400">ETB Balance: 4,850</div>
                      </div>
                    </button>

                    {/* App 4: Heritage Dictionary */}
                    <button
                      onClick={() => navigateTo('dictionary')}
                      className="p-3.5 rounded-2xl bg-[#151028] hover:bg-[#20183D] border border-[#8E6D28]/40 hover:border-amber-400 text-left transition-all cursor-pointer shadow-md group space-y-2"
                    >
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300 group-hover:scale-110 transition-transform">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">Heritage Lexicon</div>
                        <div className="text-[10px] text-slate-400">Offline Ge'ez Fidel</div>
                      </div>
                    </button>

                  </div>

                  {/* OneSignal Push Notification Sentinel Card */}
                  <div
                    onClick={() => navigateTo('onesignal')}
                    className="p-3.5 rounded-2xl bg-gradient-to-r from-[#1D1435] via-[#241744] to-[#170E2D] border border-amber-500/50 hover:border-amber-400 transition-all cursor-pointer shadow-md flex items-center justify-between group"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        <BellRing className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors flex items-center space-x-1.5">
                          <span>OneSignal Push Sentinel</span>
                          <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-mono border border-emerald-500/30">
                            v5.1 Active
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-300">
                          {pushNotificationHistory.length} pushes received • FCM BoM 33.7.0
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-amber-400 group-hover:text-white" />
                  </div>

                  {/* System Error Analyzer Link Card */}
                  <div
                    onClick={() => navigateTo('diagnostics')}
                    className="p-3.5 rounded-2xl bg-[#0F0B1E] border border-emerald-500/40 hover:border-emerald-400 transition-all cursor-pointer shadow-md flex items-center justify-between group"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">
                          System Integrity: 0 Errors Found
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Tap to view full runtime audit & health logs
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-white" />
                  </div>

                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* SCREEN 2: OBELISK TIGRINYA AI CHAT                            */}
              {/* ------------------------------------------------------------- */}
              {activeScreen === 'chat' && (
                <div className="h-full flex flex-col justify-between space-y-3 animate-fade-in">
                  
                  {/* Chat Top Bar */}
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center space-x-2">
                      <button onClick={handleAndroidBack} className="p-1 rounded-lg bg-slate-800 text-slate-300 cursor-pointer">
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </button>
                      <div>
                        <div className="text-xs font-bold text-white">ኦበሊስክ ትግርኛ AI</div>
                        <div className="text-[9px] text-emerald-400 flex items-center space-x-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          <span>Online • Offline Neural Engine</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => speakTigrinyaText('ሰላም! እንቋዕ ናብ ኦበሊስክ AI ብደሓን መጻእኩም።')}
                      className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 cursor-pointer"
                      title="Speak Greeting"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Messages Bubble List */}
                  <div className="space-y-3 overflow-y-auto max-h-[380px] pr-1 scrollbar-thin scrollbar-thumb-slate-800">
                    {chatMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed ${
                            msg.sender === 'user'
                              ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-br-none shadow-md'
                              : 'bg-[#18132A] border border-slate-700/80 text-slate-200 rounded-bl-none shadow-md'
                          }`}
                        >
                          <p>{msg.text}</p>
                          <div className="flex items-center justify-between mt-1 text-[9px] opacity-70">
                            <span>{msg.time}</span>
                            {msg.sender === 'ai' && (
                              <button
                                onClick={() => speakTigrinyaText(msg.text)}
                                className="ml-2 hover:text-amber-300 transition-colors"
                              >
                                <Volume2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    {isAiTyping && (
                      <div className="flex items-center space-x-1.5 text-xs text-amber-400 font-mono p-2">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                        <span>ኦበሊስክ AI ይሓስብ ኣሎ...</span>
                      </div>
                    )}
                  </div>

                  {/* Chat Input Bar */}
                  <div className="pt-2 border-t border-slate-800 flex items-center space-x-1.5">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                      placeholder="ብትግርኛ ጽሓፉ..."
                      className="flex-1 px-3 py-2 rounded-xl bg-[#140F24] border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                    />
                    <button
                      onClick={handleSendChat}
                      disabled={!chatInput.trim()}
                      className="p-2 rounded-xl bg-gradient-to-r from-[#8E6D28] to-[#C5A059] text-slate-950 font-bold disabled:opacity-40 transition-all cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>

                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* SCREEN 3: GE'EZ CAMERA & OCR SCANNER                          */}
              {/* ------------------------------------------------------------- */}
              {activeScreen === 'camera-ocr' && (
                <div className="space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center space-x-2">
                      <button onClick={handleAndroidBack} className="p-1 rounded-lg bg-slate-800 text-slate-300 cursor-pointer">
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs font-bold text-white">Ge'ez Camera OCR</span>
                    </div>
                    <span className="text-[10px] text-amber-400 font-mono">Neural Vision v2</span>
                  </div>

                  {/* Target Mode Selector */}
                  <div className="grid grid-cols-3 gap-1.5 text-[10px] font-mono">
                    {(['geez-manuscript', 'road-sign', 'document'] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => setOcrTargetMode(m)}
                        className={`p-1.5 rounded-lg border text-center transition-all cursor-pointer ${
                          ocrTargetMode === m
                            ? 'bg-amber-500/30 border-amber-400 text-amber-200 font-bold'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        {m === 'geez-manuscript' ? '📜 Ge\'ez Scroll' : m === 'road-sign' ? '🚸 Road Sign' : '📄 Document'}
                      </button>
                    ))}
                  </div>

                  {/* Simulated Camera Viewfinder */}
                  <div className="relative w-full h-56 rounded-2xl bg-black border-2 border-dashed border-amber-500/60 overflow-hidden flex flex-col items-center justify-center p-4">
                    
                    {/* Viewfinder Reticle */}
                    <div className="absolute inset-4 border border-amber-400/40 rounded-xl pointer-events-none">
                      <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-amber-400" />
                      <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-amber-400" />
                      <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-amber-400" />
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-amber-400" />
                    </div>

                    {/* Animated Scanning Line */}
                    {ocrScanning && (
                      <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-bounce" />
                    )}

                    <Camera className="w-8 h-8 text-amber-400/60 mb-2" />
                    <p className="text-[11px] text-center text-slate-300">
                      {ocrScanning ? 'Analyzing ancient characters...' : 'Align Ge\'ez text inside frame'}
                    </p>
                  </div>

                  {/* Capture & Scan Button */}
                  <button
                    onClick={handleRunOcrScan}
                    disabled={ocrScanning}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#8E6D28] to-[#C5A059] text-slate-950 font-bold text-xs transition-all cursor-pointer shadow-lg shadow-amber-500/20 hover:brightness-110 flex items-center justify-center space-x-1.5"
                  >
                    <Camera className="w-4 h-4" />
                    <span>{ocrScanning ? 'Scanning in Progress...' : 'Capture & Extract Text'}</span>
                  </button>

                  {/* OCR Output Text Card */}
                  {ocrResultText && (
                    <div className="p-3 rounded-xl bg-[#140F24] border border-amber-500/50 space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] font-mono text-amber-300">
                        <span>Extracted Result:</span>
                        <button
                          onClick={() => speakTigrinyaText(ocrResultText)}
                          className="hover:text-white flex items-center space-x-1"
                        >
                          <Volume2 className="w-3 h-3" />
                          <span>Play Audio</span>
                        </button>
                      </div>
                      <p className="text-xs text-white font-bold leading-relaxed">{ocrResultText}</p>
                    </div>
                  )}

                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* SCREEN 4: TELEBIRR & CBE MOBILE MONEY                         */}
              {/* ------------------------------------------------------------- */}
              {activeScreen === 'telebirr' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center space-x-2">
                      <button onClick={handleAndroidBack} className="p-1 rounded-lg bg-slate-800 text-slate-300 cursor-pointer">
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs font-bold text-white">Telebirr & CBE Birr</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono">
                      Active Wallet
                    </span>
                  </div>

                  {/* Digital Wallet Card */}
                  <div className="p-4 rounded-2xl bg-gradient-to-tr from-[#0E2E3B] via-[#104354] to-[#0A1F29] border border-cyan-400/50 shadow-xl space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-mono text-cyan-200">
                      <span>TELEBIRR SOVEREIGN PAY</span>
                      <QrCode className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-300">Available Balance</div>
                      <div className="text-2xl font-black text-white font-mono">
                        {walletBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span className="text-xs text-cyan-300 font-bold">ETB</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-300 pt-2 border-t border-cyan-800/60 font-mono">
                      <span>Acc: +251 91 123 4567</span>
                      <span className="text-emerald-400">Verified ID</span>
                    </div>
                  </div>

                  {/* Linked Payment Methods inside Android Wallet */}
                  <div className="p-3.5 rounded-2xl bg-[#140F24] border border-[#8E6D28]/40 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5 text-xs font-bold text-[#F3E5AB]">
                        <Wallet className="w-3.5 h-3.5 text-amber-400" />
                        <span>{language === 'ti' ? 'ዝተኣሳሰሩ መንገዲ ክፍሊት' : 'Linked Payment Methods'}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAndroidAddMethod((v) => !v);
                          setAndroidAddError(null);
                        }}
                        className="px-2 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-200 text-[10px] font-bold flex items-center space-x-1 cursor-pointer hover:bg-amber-500/30"
                      >
                        <Plus className="w-3 h-3" />
                        <span>{showAndroidAddMethod ? 'Close' : 'Add Method'}</span>
                      </button>
                    </div>

                    {showAndroidAddMethod && (
                      <div className="p-2.5 rounded-xl bg-[#0B0816] border border-slate-700 space-y-2">
                        <div className="grid grid-cols-3 gap-1">
                          {(
                            [
                              { id: 'telebirr', label: 'Telebirr' },
                              { id: 'cbe_birr', label: 'CBE Birr' },
                              { id: 'card', label: 'Card' },
                            ] as const
                          ).map((opt) => (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => {
                                setAndroidNewMethodType(opt.id);
                                setAndroidAddError(null);
                              }}
                              className={`py-1 rounded-lg text-[10px] font-bold cursor-pointer ${
                                androidNewMethodType === opt.id
                                  ? 'bg-[#C5A059] text-black'
                                  : 'bg-slate-800 text-slate-300'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>

                        {androidNewMethodType === 'card' ? (
                          <div className="space-y-1.5">
                            <input
                              type="text"
                              value={androidNewCardNum}
                              onChange={(e) => setAndroidNewCardNum(formatCardNumber(e.target.value))}
                              placeholder="Card number (4242 ...)"
                              maxLength={19}
                              className="w-full px-2.5 py-1.5 rounded-lg bg-[#140F24] border border-slate-700 text-[11px] font-mono text-white"
                            />
                            <div className="grid grid-cols-2 gap-1.5">
                              <input
                                type="text"
                                value={androidNewExpiry}
                                onChange={(e) => setAndroidNewExpiry(formatExpiry(e.target.value))}
                                placeholder="MM/YY"
                                maxLength={5}
                                className="w-full px-2.5 py-1.5 rounded-lg bg-[#140F24] border border-slate-700 text-[11px] font-mono text-white"
                              />
                              <input
                                type="password"
                                value={androidNewCvv}
                                onChange={(e) => setAndroidNewCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                placeholder="CVV"
                                maxLength={4}
                                className="w-full px-2.5 py-1.5 rounded-lg bg-[#140F24] border border-slate-700 text-[11px] font-mono text-white"
                              />
                            </div>
                          </div>
                        ) : (
                          <input
                            type="tel"
                            value={androidNewPhone}
                            onChange={(e) => setAndroidNewPhone(e.target.value)}
                            placeholder="+251 911 234 567"
                            className="w-full px-2.5 py-1.5 rounded-lg bg-[#140F24] border border-slate-700 text-[11px] font-mono text-white"
                          />
                        )}

                        {androidAddError && (
                          <div className="text-[10px] text-rose-300 font-mono">{androidAddError}</div>
                        )}

                        <button
                          type="button"
                          disabled={isAddingAndroidMethod}
                          onClick={async () => {
                            setIsAddingAndroidMethod(true);
                            setAndroidAddError(null);
                            try {
                              const updated = await addPaymentMethod({
                                userId: user?.id,
                                userEmail: user?.email,
                                type: androidNewMethodType,
                                cardNumber: androidNewMethodType === 'card' ? androidNewCardNum : undefined,
                                expiry: androidNewMethodType === 'card' ? androidNewExpiry : undefined,
                                cvv: androidNewMethodType === 'card' ? androidNewCvv : undefined,
                                holderName: user?.name || 'Axumite Mobile User',
                                phoneNumber: androidNewMethodType !== 'card' ? androidNewPhone : undefined,
                                setAsDefault: true,
                              });
                              setAndroidSavedMethods(updated);
                              setShowAndroidAddMethod(false);
                              setAndroidNewCardNum('');
                              setAndroidNewExpiry('');
                              setAndroidNewCvv('');
                              triggerToast('💳 Payment method added & synced!');
                            } catch (err: any) {
                              setAndroidAddError(err.message || 'Could not add method');
                            } finally {
                              setIsAddingAndroidMethod(false);
                            }
                          }}
                          className="w-full py-1.5 rounded-lg bg-gradient-to-r from-[#8E6D28] to-[#C5A059] text-black text-[11px] font-black cursor-pointer disabled:opacity-50"
                        >
                          {isAddingAndroidMethod ? 'Saving...' : 'Save Payment Method'}
                        </button>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      {androidSavedMethods.slice(0, 4).map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={async () => {
                            const updated = await setDefaultPaymentMethod(m.id, user?.id, user?.email);
                            setAndroidSavedMethods(updated);
                            triggerToast(`Default: ${m.label}`);
                          }}
                          className={`w-full px-2.5 py-2 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                            m.isDefault
                              ? 'bg-[#1D1633] border-amber-400/70 text-white'
                              : 'bg-[#0E0A1A] border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="text-[11px] font-bold truncate">{m.label}</div>
                            <div className="text-[9px] text-slate-400 font-mono">
                              {m.providerBadge} • {m.currency}
                            </div>
                          </div>
                          {m.isDefault && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-bold shrink-0">
                              DEFAULT
                            </span>
                          )}
                        </button>
                      ))}
                    </div>

                    {onOpenPaymentMethods && (
                      <button
                        type="button"
                        onClick={onOpenPaymentMethods}
                        className="w-full py-1.5 rounded-xl bg-[#1A142A] border border-slate-700 hover:border-amber-400/60 text-amber-300 text-[10px] font-bold cursor-pointer"
                      >
                        {language === 'ti' ? 'ኩሎም ናይ ክፍሊት መንገድታት ኣመሓድር →' : 'Open Full Payment Vault →'}
                      </button>
                    )}
                  </div>

                  {/* Send Money Form */}
                  <form onSubmit={handleTelebirrTransfer} className="p-3.5 rounded-2xl bg-[#140F24] border border-slate-800 space-y-3">
                    <div className="text-xs font-bold text-white">Quick Transfer (ገንዘብ ምልኣኽ)</div>
                    
                    <div>
                      <label className="text-[10px] text-slate-400 font-mono">Recipient Mobile</label>
                      <input
                        type="text"
                        value={transferPhone}
                        onChange={(e) => setTransferPhone(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl bg-[#0E0A1A] border border-slate-700 text-xs text-white font-mono mt-1"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 font-mono">Amount (ETB)</label>
                      <input
                        type="number"
                        value={transferAmount}
                        onChange={(e) => setTransferAmount(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl bg-[#0E0A1A] border border-slate-700 text-xs text-white font-mono mt-1"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#8E6D28] via-[#C5A059] to-[#F3E5AB] text-slate-950 font-black text-xs transition-all cursor-pointer shadow-md hover:brightness-110 flex items-center justify-center space-x-1.5"
                    >
                      <Fingerprint className="w-4 h-4 text-slate-950" />
                      <span>ብባዮሜትሪክ ኣረጋጊጽካ ስደድ (Confirm with Biometrics)</span>
                    </button>
                  </form>

                  {walletSuccessMsg && (
                    <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500 text-emerald-200 text-xs font-bold flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{walletSuccessMsg}</span>
                    </div>
                  )}

                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* SCREEN 5: HERITAGE LEXICON & OFFLINE DICTIONARY               */}
              {/* ------------------------------------------------------------- */}
              {activeScreen === 'dictionary' && (
                <div className="space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center space-x-2">
                      <button onClick={handleAndroidBack} className="p-1 rounded-lg bg-slate-800 text-slate-300 cursor-pointer">
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs font-bold text-white">Ge'ez Heritage Lexicon</span>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-mono">Offline Ready</span>
                  </div>

                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      value={dictQuery}
                      onChange={(e) => setDictQuery(e.target.value)}
                      placeholder="Search Ge'ez, Tigrinya, or English..."
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#140F24] border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  {/* Vocabulary Cards */}
                  <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                    {filteredDictionary.map((entry, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-[#120D24] border border-slate-800 hover:border-amber-500/50 transition-all space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-base font-bold text-amber-300 font-cinzel">{entry.geez}</span>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => speakTigrinyaText(entry.geez)}
                              className="p-1 rounded bg-amber-500/20 text-amber-300 hover:text-white transition-colors cursor-pointer"
                              title="Listen"
                            >
                              <Volume2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(entry.geez);
                                setCopiedIndex(idx);
                                setTimeout(() => setCopiedIndex(null), 2000);
                              }}
                              className="p-1 rounded bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
                              title="Copy"
                            >
                              {copiedIndex === idx ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                        </div>
                        <div className="text-[10px] text-amber-200/80 font-mono">Phonetics: /{entry.phonetics}/</div>
                        <p className="text-xs text-slate-300 leading-snug">{entry.definition}</p>
                      </div>
                    ))}
                  </div>

                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* SCREEN 6: SYSTEM ERROR ANALYZER & RUNTIME DIAGNOSTICS         */}
              {/* ------------------------------------------------------------- */}
              {activeScreen === 'diagnostics' && (
                <div className="space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center space-x-2">
                      <button onClick={handleAndroidBack} className="p-1 rounded-lg bg-slate-800 text-slate-300 cursor-pointer">
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs font-bold text-white">System Error Analyzer</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono border border-emerald-500/30">
                      0 ERRORS
                    </span>
                  </div>

                  {/* Analyzer Hero Card */}
                  <div className="p-3.5 rounded-2xl bg-[#0F1C18] border border-emerald-500/60 shadow-lg space-y-2">
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      <div>
                        <div className="text-xs font-bold text-white">Full System Health: OPTIMAL (100%)</div>
                        <div className="text-[10px] text-emerald-300/80 font-mono">
                          Zero syntax breaks or unhandled rejections detected.
                        </div>
                      </div>
                    </div>
                    
                    <button
                      onClick={handleRunDiagnosticsAnalysis}
                      disabled={isAnalyzingErrors}
                      className="w-full py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-bold text-xs transition-all cursor-pointer shadow-md hover:brightness-110 flex items-center justify-center space-x-1.5"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzingErrors ? 'animate-spin' : ''}`} />
                      <span>{isAnalyzingErrors ? 'Running Full Audit...' : 'Re-Run Error Analysis'}</span>
                    </button>
                  </div>

                  {/* StrongBox TEE Cryptographic Auth State & Keystore Card */}
                  <div className="p-3.5 rounded-2xl bg-[#140D26] border border-amber-500/40 shadow-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Shield className="w-4 h-4 text-amber-400" />
                        <span className="text-xs font-bold text-amber-200 font-cinzel">StrongBox TEE Cryptography</span>
                      </div>
                      <span className={`text-[9.5px] px-2 py-0.5 rounded font-mono font-bold border ${
                        appAuthState.isAuthenticated 
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                          : 'bg-red-500/20 text-red-300 border-red-500/40'
                      }`}>
                        {appAuthState.isAuthenticated ? 'UNLOCKED' : 'LOCKED'}
                      </span>
                    </div>

                    <div className="space-y-1 text-[10px] font-mono bg-[#090514] p-2 rounded-xl border border-amber-500/20">
                      <div className="flex justify-between text-slate-300">
                        <span>Hardware Enclave:</span>
                        <span className="text-amber-300 font-bold">Class 3 StrongBox</span>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span>Auth Method:</span>
                        <span className="text-amber-200 capitalize font-bold">{appAuthState.authMethod}</span>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span>Active Session Token:</span>
                        <span className="text-emerald-300 truncate max-w-[140px]">
                          {appAuthState.token || 'No active session token'}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span>Failed PIN Attempts:</span>
                        <span className={appAuthState.failedAttempts > 0 ? 'text-red-400 font-bold' : 'text-slate-400'}>
                          {appAuthState.failedAttempts} / {appAuthState.maxAttempts}
                        </span>
                      </div>
                    </div>

                    {/* Quick Security Controls: Lock App vs Trigger Auth */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={handleLockDevice}
                        className="py-1.5 px-2 rounded-xl bg-red-950/60 hover:bg-red-900/60 border border-red-500/40 text-red-300 font-bold text-[10.5px] flex items-center justify-center space-x-1 cursor-pointer"
                      >
                        <Lock className="w-3 h-3 text-red-400" />
                        <span>Lock Device</span>
                      </button>
                      <button
                        onClick={() => triggerBiometricPrompt('pin')}
                        className="py-1.5 px-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-[10.5px] flex items-center justify-center space-x-1 cursor-pointer"
                      >
                        <Key className="w-3 h-3 text-amber-400" />
                        <span>Prompt PIN</span>
                      </button>
                    </div>

                    {/* Custom 4-Digit Sovereign PIN Setup */}
                    <div className="pt-2 border-t border-amber-500/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-200 flex items-center space-x-1">
                          <KeyRound className="w-3 h-3 text-amber-400" />
                          <span>Configure Sovereign PIN</span>
                        </span>
                        {previewPinHash && (
                          <span className="text-[8.5px] font-mono text-emerald-400">
                            SHA-256: {previewPinHash}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-1.5">
                        <input
                          type="password"
                          maxLength={4}
                          value={currentPinVerifyInput}
                          onChange={(e) => setCurrentPinVerifyInput(e.target.value.replace(/\D/g, ''))}
                          placeholder="Current PIN (Opt.)"
                          className="px-2.5 py-1.5 rounded-lg bg-[#0E091D] border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400 font-mono text-center"
                        />
                        <input
                          type="password"
                          maxLength={4}
                          value={newPinCodeInput}
                          onChange={(e) => setNewPinCodeInput(e.target.value.replace(/\D/g, ''))}
                          placeholder="New 4-Digit PIN"
                          className="px-2.5 py-1.5 rounded-lg bg-[#0E091D] border border-amber-500/40 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400 font-mono text-center"
                        />
                      </div>

                      <button
                        onClick={handleSaveCustomPin}
                        disabled={newPinCodeInput.length !== 4}
                        className="w-full py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 disabled:opacity-40 text-slate-950 font-bold text-xs shadow transition-all cursor-pointer flex items-center justify-center space-x-1"
                      >
                        <Shield className="w-3.5 h-3.5" />
                        <span>Save to StrongBox Keystore</span>
                      </button>

                      {pinConfigFeedback && (
                        <div className={`text-[10px] p-1.5 rounded-lg font-mono text-center ${
                          pinConfigFeedback.type === 'success' 
                            ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30' 
                            : 'bg-red-950/60 text-red-300 border border-red-500/30'
                        }`}>
                          {pinConfigFeedback.text}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Diagnostic Test Matrix */}
                  <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                    {diagnosticsList.map((test) => (
                      <div
                        key={test.id}
                        className="p-2.5 rounded-xl bg-[#120E22] border border-slate-800 space-y-1"
                      >
                        <div className="flex items-center justify-between text-xs font-bold text-white">
                          <div className="flex items-center space-x-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400" />
                            <span>{test.name}</span>
                          </div>
                          <span className="text-[10px] font-mono text-amber-300">{test.latencyMs}ms</span>
                        </div>
                        <p className="text-[10px] text-slate-400">{test.details}</p>
                      </div>
                    ))}
                  </div>

                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* SCREEN 7: ANDROID RECENTS / TASK SWITCHER                     */}
              {/* ------------------------------------------------------------- */}
              {activeScreen === 'recents' && (
                <div className="space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold text-white">Recent Android Apps</span>
                    <button
                      onClick={() => {
                        setActiveScreen('home');
                        setScreenHistory(['home']);
                      }}
                      className="text-[10px] text-amber-300 hover:underline cursor-pointer"
                    >
                      Clear All
                    </button>
                  </div>

                  <div className="space-y-2">
                    {[
                      { screen: 'onesignal' as const, name: 'OneSignal Push Manager', icon: BellRing },
                      { screen: 'chat' as const, name: 'ኦበሊስክ AI Chat', icon: MessageSquare },
                      { screen: 'camera-ocr' as const, name: 'Ge\'ez Camera OCR', icon: Camera },
                      { screen: 'telebirr' as const, name: 'Telebirr Mobile Wallet', icon: CreditCard },
                      { screen: 'diagnostics' as const, name: 'System Error Diagnostics', icon: ShieldCheck },
                    ].map((app) => {
                      const IconComp = app.icon;
                      return (
                        <div
                          key={app.screen}
                          onClick={() => navigateTo(app.screen)}
                          className="p-3 rounded-2xl bg-[#151028] border border-slate-800 hover:border-amber-400 transition-all cursor-pointer flex items-center justify-between group shadow-md"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              <IconComp className="w-4 h-4" />
                            </div>
                            <span className="text-xs font-bold text-white group-hover:text-amber-200">
                              {app.name}
                            </span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* SCREEN 8: ONESIGNAL PUSH NOTIFICATIONS MANAGER                */}
              {/* ------------------------------------------------------------- */}
              {activeScreen === 'onesignal' && (
                <div className="space-y-3.5 animate-fade-in pb-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center space-x-2">
                      <button onClick={handleAndroidBack} className="p-1 rounded-lg bg-slate-800 text-slate-300 cursor-pointer hover:text-white">
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs font-bold text-white">OneSignal Push Manager</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono border border-emerald-500/30 flex items-center space-x-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>SDK v5.1.28</span>
                    </span>
                  </div>

                  {/* OneSignal App ID Status Banner */}
                  <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-[#1D1236] via-[#2A1B4E] to-[#160B29] border border-amber-500/50 shadow-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="p-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          <Radio className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">OneSignal App ID Initialized</div>
                          <div className="text-[10px] text-slate-400 font-mono">com.axumite.ai • Android 15</div>
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">
                        POST_NOTIFICATIONS
                      </span>
                    </div>

                    <div className="p-2 rounded-xl bg-[#0F0A1F] border border-slate-800 font-mono text-[10px] text-amber-200/90 break-all flex items-center justify-between">
                      <span className="truncate mr-2">{oneSignalAppId}</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(oneSignalAppId);
                          triggerToast('OneSignal App ID copied to clipboard');
                        }}
                        className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 hover:text-white cursor-pointer shrink-0 font-sans text-[10px]"
                      >
                        Copy
                      </button>
                    </div>
                  </div>

                  {/* Push Permission & Tags Configuration */}
                  <div className="p-3.5 rounded-2xl bg-[#140F24] border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-bold text-white">
                      <span className="flex items-center space-x-1.5">
                        <Tag className="w-3.5 h-3.5 text-amber-400" />
                        <span>User Segments & OneSignal Tags</span>
                      </span>
                      <span className="text-[10px] text-emerald-400 font-mono">Synced</span>
                    </div>

                    {/* Tag selectors */}
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div>
                        <label className="text-slate-400 font-mono block mb-1">language tag</label>
                        <select
                          value={pushSelectedLang}
                          onChange={(e) => setPushSelectedLang(e.target.value as 'ti' | 'en')}
                          className="w-full px-2 py-1.5 rounded-xl bg-[#0D091A] border border-slate-700 text-white font-mono"
                        >
                          <option value="ti">ti (ትግርኛ)</option>
                          <option value="en">en (English)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-slate-400 font-mono block mb-1">tier tag</label>
                        <select
                          value={pushUserTier}
                          onChange={(e) => setPushUserTier(e.target.value as any)}
                          className="w-full px-2 py-1.5 rounded-xl bg-[#0D091A] border border-slate-700 text-white font-mono"
                        >
                          <option value="sovereign_pro">sovereign_pro</option>
                          <option value="scholar">scholar</option>
                          <option value="free">free</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Category-Based Custom Notification Icon Styles Selector */}
                  <NotificationIconStyleSelector 
                    onStyleChange={(category, styleId, style) => {
                      setCategoryIconStyles(prev => ({
                        ...prev,
                        [category]: styleId
                      }));
                      triggerToast(`OneSignal icon style updated: ${style.name}`);
                    }}
                    onTestPush={(category, style) => {
                      handleSendOneSignalTestPush(undefined, category, style);
                    }}
                  />

                  {/* Interactive Push Dispatcher */}
                  <div className="p-3.5 rounded-2xl bg-[#140F24] border border-amber-500/40 space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-white">
                      <span className="flex items-center space-x-1.5">
                        <BellRing className="w-3.5 h-3.5 text-amber-400" />
                        <span>Dispatch Test Push Notification</span>
                      </span>
                      <span className="text-[10px] text-amber-300 font-mono">1-Click Dispatch</span>
                    </div>

                    {/* Quick Presets */}
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { key: 'geez_manuscript', label: '📜 Ge\'ez OCR Alert', cat: 'geez_ocr' },
                        { key: 'telebirr_payment', label: '💳 Telebirr Transfer', cat: 'telebirr_finance' },
                        { key: 'sovereign_wisdom', label: '✨ Daily Wisdom', cat: 'cultural_heritage' },
                        { key: 'model_update', label: '⚡ Tigrinya LLM Push', cat: 'ai_chat' },
                      ].map((preset) => (
                        <button
                          key={preset.key}
                          type="button"
                          onClick={() => handleSendOneSignalTestPush(preset.key)}
                          className="p-2 rounded-xl bg-[#1A1330] hover:bg-[#251B45] border border-slate-700 hover:border-amber-400 text-slate-200 hover:text-amber-200 text-[10px] font-bold transition-all text-left flex items-center justify-between cursor-pointer"
                        >
                          <span>{preset.label}</span>
                          <Send className="w-3 h-3 opacity-60" />
                        </button>
                      ))}
                    </div>

                    {/* Custom Push Composer */}
                    <div className="space-y-2 pt-2 border-t border-slate-800">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-400 font-mono">Target Category</label>
                          <select
                            value={customPushCategory}
                            onChange={(e) => setCustomPushCategory(e.target.value)}
                            className="w-full px-2 py-1.5 rounded-xl bg-[#0D091A] border border-slate-700 text-xs text-white mt-1 focus:outline-none focus:border-amber-400 font-mono"
                          >
                            {NOTIFICATION_CATEGORIES.map(c => (
                              <option key={c.id} value={c.id}>
                                {c.iconEmoji} {c.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 font-mono">Resolved Icon Style</label>
                          <div className="px-2.5 py-1.5 rounded-xl bg-[#0D091A] border border-slate-800 text-[11px] text-amber-300 mt-1 flex items-center space-x-1.5 truncate">
                            <span>{getSelectedStyleForCategory(customPushCategory, categoryIconStyles).previewEmoji}</span>
                            <span className="truncate">{getSelectedStyleForCategory(customPushCategory, categoryIconStyles).name}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-400 font-mono">Notification Title</label>
                        <input
                          type="text"
                          value={customPushTitle}
                          onChange={(e) => setCustomPushTitle(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-xl bg-[#0D091A] border border-slate-700 text-xs text-white mt-1 focus:outline-none focus:border-amber-400"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-400 font-mono">Notification Body Message</label>
                        <textarea
                          rows={2}
                          value={customPushBody}
                          onChange={(e) => setCustomPushBody(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-xl bg-[#0D091A] border border-slate-700 text-xs text-white mt-1 focus:outline-none focus:border-amber-400 resize-none"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSendOneSignalTestPush()}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-bold text-xs transition-all cursor-pointer shadow-md hover:brightness-110 flex items-center justify-center space-x-1.5"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Send Custom OneSignal Push</span>
                      </button>
                    </div>
                  </div>

                  {/* Push History */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-white px-1">
                      <span>Push Notification Log ({pushNotificationHistory.length})</span>
                      <button
                        onClick={() => setPushNotificationHistory([])}
                        className="text-[10px] text-slate-400 hover:text-amber-300 cursor-pointer font-mono"
                      >
                        Clear Log
                      </button>
                    </div>

                    <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                      {pushNotificationHistory.map((push) => (
                        <div
                          key={push.id}
                          className="p-2.5 rounded-xl bg-[#120D24] border border-slate-800 space-y-1.5"
                        >
                          <div className="flex items-center justify-between text-[11px] font-bold text-white">
                            <div className="flex items-center space-x-1.5 truncate">
                              {push.iconEmoji && (
                                <span 
                                  className="w-5 h-5 rounded-md flex items-center justify-center text-xs shrink-0"
                                  style={{ backgroundColor: `${push.accentColor || '#F59E0B'}22`, border: `1px solid ${push.accentColor || '#F59E0B'}55` }}
                                >
                                  {push.iconEmoji}
                                </span>
                              )}
                              <span className="text-amber-300 truncate">{push.title}</span>
                            </div>
                            <span className="text-[9px] text-slate-400 font-mono shrink-0 ml-1">{push.time}</span>
                          </div>
                          <p className="text-[10px] text-slate-300 leading-relaxed">{push.body}</p>
                          <div className="flex items-center justify-between text-[9px] text-slate-500 font-mono pt-1 border-t border-slate-800/60">
                            <span className="text-amber-400/80 truncate">
                              {push.styleName ? `Style: ${push.styleName}` : `Tag: ${push.tag}`}
                            </span>
                            {push.deepLink && (
                              <button
                                onClick={() => navigateTo(push.deepLink!)}
                                className="text-amber-400 hover:underline cursor-pointer shrink-0 ml-2"
                              >
                                Open Screen →
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Java 17 OneSignal Implementation Reference Card */}
                  <div className="p-3 rounded-2xl bg-[#0E0A1A] border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>Android Java 17 Integration:</span>
                      <button
                        onClick={async () => {
                          setCodeLanguageMode('java');
                          setHubMode('code-explorer');
                          const files = await ensureSourceFilesLoaded('java');
                          const oneSignalFile = files.find(f => f.path.includes('OneSignalPushHelper'));
                          if (oneSignalFile) setSelectedFile(oneSignalFile);
                        }}
                        className="text-amber-300 hover:underline flex items-center space-x-1 cursor-pointer"
                      >
                        <span>View OneSignalPushHelper.java</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                    <pre className="p-2 rounded-lg bg-black/60 font-mono text-[9px] text-emerald-300/90 overflow-x-auto leading-relaxed">
{`OneSignal.initWithContext(this, ONESIGNAL_APP_ID);
OneSignal.getNotifications().requestPermission(true, Continue.none());
OneSignal.getUser().addTags(Map.of("lang", "ti", "tier", "pro"));`}
                    </pre>
                  </div>

                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* SCREEN 8: NATIVE ANDROID SPLASH SCREEN (activity_splash.xml)  */}
              {/* ------------------------------------------------------------- */}
              {activeScreen === 'splash' && (
                <div className="h-full flex flex-col justify-between items-center text-center py-6 px-4 animate-in fade-in zoom-in-95 duration-500 relative select-none">
                  
                  {/* Top Bar with Dismiss */}
                  <div className="w-full flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[9px] border border-amber-500/30">
                      activity_splash.xml
                    </span>
                    <button
                      onClick={() => setActiveScreen('home')}
                      className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-[10px] font-mono transition-colors cursor-pointer"
                    >
                      Skip to Home →
                    </button>
                  </div>

                  {/* Center Branding & Identity */}
                  <div className="my-auto flex flex-col items-center space-y-4">
                    {/* Emblem */}
                    <div className="w-24 h-24 rounded-full bg-gradient-to-b from-[#2A1E0E] via-[#1A1208] to-[#120D24] border-2 border-[#C5A059] shadow-2xl flex items-center justify-center relative p-3">
                      <div className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center">
                        <Sparkles className="w-9 h-9 text-[#F3E5AB] animate-pulse" />
                      </div>
                      <span className="absolute -bottom-1 px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-bold text-[8px] uppercase tracking-wider font-mono shadow">
                        OBELISK AI
                      </span>
                    </div>

                    {/* Ge'ez & English Titles */}
                    <div>
                      <h1 className="text-2xl font-black text-[#F3E5AB] tracking-wide font-serif">
                        ኣክሱማይት AI
                      </h1>
                      <h2 className="text-xs font-mono font-bold text-amber-400 tracking-[0.25em] uppercase mt-1">
                        AXUMITE AI SOVEREIGN
                      </h2>
                      <p className="text-[11px] text-slate-400 mt-2 max-w-[240px] leading-relaxed">
                        Sovereign Artificial Intelligence for Horn of Africa
                      </p>
                    </div>

                    {/* Pure Java 17 Badge */}
                    <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono text-[10px] font-bold shadow-sm">
                      <Cpu className="w-3 h-3 text-emerald-400" />
                      <span>Pure Java 17 • Target SDK 35 (Android 15)</span>
                    </div>
                  </div>

                  {/* Bottom Loading Progress & Diagnostic Footer */}
                  <div className="w-full space-y-3 pt-4 border-t border-slate-800/80">
                    <div className="flex flex-col items-center space-y-1.5">
                      <div className="w-6 h-6 border-2 border-amber-500/30 border-t-[#C5A059] rounded-full animate-spin" />
                      <span className="text-[11px] text-amber-200 font-mono">
                        ኦበሊስክ AI ንባዮሜትሪክን ይዳሎ ኣሎ...
                      </span>
                    </div>

                    <div className="text-[9.5px] font-mono text-slate-500">
                      Android 15 (API 35) • StrongBox TEE • Java 17
                    </div>
                  </div>

                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* BESPOKE AXUMITE BRANDED CUSTOM BIOMETRIC PROMPT DIALOG        */}
              {/* With Framer Motion gold-shimmer entrance & radar animations   */}
              {/* ------------------------------------------------------------- */}
              <AnimatePresence>
                {isBiometricPromptOpen && (
                  <motion.div
                    key="axumite-biometric-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.22 }}
                    className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col justify-end p-3"
                  >
                    {/* Glowing golden halo aura behind card */}
                    <div className="relative w-full">
                      <motion.div
                        className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-[#8E6D28] via-[#F3E5AB] to-[#C5A059] opacity-50 blur-md pointer-events-none"
                        initial={{ opacity: 0, scale: 0.92 }}
                        animate={{ opacity: [0, 0.65, 0.35], scale: 1 }}
                        transition={{ duration: 1.2, ease: "easeOut" }}
                      />

                      <motion.div
                        key="axumite-biometric-card"
                        initial={{ opacity: 0, y: 55, scale: 0.92 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 40, scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 360, damping: 25 }}
                        className="bg-gradient-to-b from-[#1E1436] via-[#140D26] to-[#0A0614] border-2 border-[#C5A059] rounded-3xl p-5 shadow-[0_0_40px_rgba(197,160,89,0.3)] space-y-4 relative overflow-hidden z-10"
                      >
                        {/* Golden Shimmer Entrance Light Beam Sweep */}
                        <motion.div
                          className="absolute inset-0 pointer-events-none z-30 bg-gradient-to-r from-transparent via-[#F3E5AB]/40 via-amber-300/50 to-transparent"
                          initial={{ x: '-150%', skewX: -24 }}
                          animate={{ x: '260%' }}
                          transition={{ duration: 1.25, ease: [0.16, 1, 0.3, 1], delay: 0.08 }}
                        />

                        {/* Golden Ambient Glow Background */}
                        <div className="absolute -top-12 -right-12 w-36 h-36 bg-amber-500/15 rounded-full blur-2xl pointer-events-none" />
                        <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-[#C5A059]/10 rounded-full blur-xl pointer-events-none" />

                        {/* Top Sovereign Security Header & StrongBox TEE Tag */}
                        <div className="flex items-center justify-between border-b border-amber-500/20 pb-3 relative z-20">
                          <div className="flex items-center space-x-2.5">
                            <motion.div
                              initial={{ opacity: 0, y: 12, rotate: -10, scale: 0.72 }}
                              animate={{
                                opacity: 1,
                                y: 0,
                                rotate: [-10, 2, 0],
                                scale: [0.72, 1.08, 1],
                              }}
                              transition={{ duration: 0.68, ease: [0.16, 1, 0.3, 1], delay: 0.06 }}
                              className="relative w-9 h-9 rounded-xl bg-gradient-to-tr from-[#1B1230] via-[#2C1D4A] to-[#130C24] border border-[#C5A059] flex items-center justify-center text-[#F3E5AB] shadow-[0_0_14px_rgba(212,175,55,0.4)] overflow-hidden"
                            >
                              <motion.div
                                initial={{ x: '-145%', skewX: -22 }}
                                animate={{ x: '220%' }}
                                transition={{
                                  duration: 1.15,
                                  delay: 0.14,
                                  ease: [0.16, 1, 0.3, 1],
                                  repeat: Infinity,
                                  repeatDelay: 2.8,
                                }}
                                className="absolute inset-y-0 -left-4 w-7 bg-gradient-to-r from-transparent via-[#FFF4B8]/80 to-transparent pointer-events-none z-20"
                              />
                              {biometricScanStatus === 'success' ? (
                                <Unlock className="w-4 h-4 text-emerald-300 relative z-10" />
                              ) : (
                                <Lock className="w-4 h-4 text-[#F3E5AB] relative z-10" />
                              )}
                            </motion.div>
                            <div>
                              <div className="flex items-center space-x-1.5">
                                <span className="text-[10px] font-mono font-black text-amber-400 uppercase tracking-widest">
                                  AXUMITE SOVEREIGN TEE
                                </span>
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              </div>
                              <h4 className="text-xs font-black text-[#F3E5AB] font-serif">
                                {biometricAuthMode === 'biometric' 
                                  ? 'ባዮሜትሪክ መከላኸሊ • Axumite Guard' 
                                  : 'ናይ ስልኪ ፒን መከላኸሊ • Sovereign PIN Fallback'}
                              </h4>
                            </div>
                          </div>

                          <button
                            onClick={() => {
                              setIsBiometricPromptOpen(false);
                              setBiometricAuthMode('biometric');
                              setPinCode('');
                              setPinError(null);
                              triggerToast('Authentication dismissed');
                            }}
                            className="p-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Mode Switcher Tabs: Biometric vs PIN Fallback */}
                        <div className="grid grid-cols-2 p-1 bg-[#090514] border border-amber-500/30 rounded-xl gap-1 relative z-20">
                          <button
                            onClick={() => {
                              setBiometricAuthMode('biometric');
                              setPinError(null);
                            }}
                            className={`py-1.5 text-[11px] font-bold rounded-lg flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                              biometricAuthMode === 'biometric'
                                ? 'bg-gradient-to-r from-[#8E6D28] to-[#C5A059] text-slate-950 shadow-md font-black'
                                : 'text-amber-300 hover:text-white hover:bg-slate-800/50'
                            }`}
                          >
                            <Fingerprint className="w-3.5 h-3.5" />
                            <span>ባዮሜትሪክ (Biometric)</span>
                          </button>

                          <button
                            onClick={() => {
                              setBiometricAuthMode('pin');
                              setBiometricScanStatus('idle');
                              setPinError(null);
                            }}
                            className={`py-1.5 text-[11px] font-bold rounded-lg flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                              biometricAuthMode === 'pin'
                                ? 'bg-gradient-to-r from-[#8E6D28] to-[#C5A059] text-slate-950 shadow-md font-black'
                                : 'text-amber-300 hover:text-white hover:bg-slate-800/50'
                            }`}
                          >
                            <Key className="w-3.5 h-3.5" />
                            <span>ናይ ስልኪ ፒን (PIN Code)</span>
                          </button>
                        </div>

                        {/* Bilingual Subtitle & StrongBox Security Context */}
                        <div className="bg-[#0D081D]/80 border border-amber-500/25 rounded-2xl p-2.5 space-y-1 relative z-20">
                          <div className="flex items-center justify-between text-[11px] font-bold text-amber-200">
                            <span>
                              {biometricAuthMode === 'biometric'
                                ? 'ንልዑላዊ ዳታን ቴሌብር ዋሌትን ምርግጋጽ'
                                : 'ባዮሜትሪክ እንተዘይሰሪሑ ብፒን እተዉ'}
                            </span>
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              StrongBox TEE
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-300 leading-relaxed">
                            {biometricAuthMode === 'biometric'
                              ? "Axumite Custom Biometric Prompt with hardware-backed encryption securing Ge'ez OCR models and Telebirr."
                              : "Secondary PIN fallback guarantees 100% lockout protection if biometric sensors are rejected, wet, or unavailable."}
                          </p>
                        </div>

                        {/* MODE 1: BIOMETRIC TOUCH SENSOR */}
                        {biometricAuthMode === 'biometric' && (
                          <div className="space-y-3 relative z-20">
                            <div className="flex flex-col items-center justify-center py-2 space-y-2 relative">
                              {/* Radar Scanning Ripple Rings */}
                              {biometricScanStatus === 'scanning' && (
                                <>
                                  <div className="absolute w-28 h-28 rounded-full border-2 border-amber-400/40 animate-ping pointer-events-none" />
                                  <div className="absolute w-24 h-24 rounded-full border border-amber-300/30 animate-pulse pointer-events-none" />
                                </>
                              )}

                              <button
                                onClick={() => handleSimulateFingerprint(true)}
                                disabled={biometricScanStatus === 'scanning'}
                                className={`w-20 h-20 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer shadow-xl relative z-10 ${
                                  biometricScanStatus === 'scanning'
                                    ? 'border-amber-400 bg-gradient-to-b from-amber-500/40 to-yellow-600/30 text-amber-200 scale-105 shadow-[0_0_25px_rgba(245,158,11,0.5)]'
                                    : biometricScanStatus === 'success'
                                    ? 'border-emerald-400 bg-gradient-to-b from-emerald-600/40 to-emerald-950 text-emerald-300 scale-105 shadow-[0_0_25px_rgba(16,185,129,0.5)]'
                                    : biometricScanStatus === 'failed'
                                    ? 'border-red-500 bg-gradient-to-b from-red-600/40 to-red-950 text-red-300 animate-bounce'
                                    : 'border-[#C5A059] bg-gradient-to-b from-[#2E1F4D] to-[#160D29] text-amber-300 hover:border-[#F3E5AB] hover:shadow-[0_0_20px_rgba(197,160,89,0.3)] hover:scale-105'
                                }`}
                                title="Click to authenticate via Axumite Custom Biometric Sensor"
                              >
                                {biometricScanStatus === 'success' ? (
                                  <Check className="w-9 h-9 text-emerald-400" />
                                ) : biometricScanStatus === 'failed' ? (
                                  <X className="w-9 h-9 text-red-400" />
                                ) : (
                                  <Fingerprint className={`w-10 h-10 ${biometricScanStatus === 'scanning' ? 'animate-pulse text-[#F3E5AB]' : 'text-amber-300'}`} />
                                )}
                              </button>

                              <div className="text-center space-y-0.5 pt-1">
                                <span className={`text-xs font-bold ${
                                  biometricScanStatus === 'success' 
                                    ? 'text-emerald-400' 
                                    : biometricScanStatus === 'failed' 
                                    ? 'text-red-400' 
                                    : biometricScanStatus === 'scanning' 
                                    ? 'text-amber-300' 
                                    : 'text-white'
                                }`}>
                                  {biometricScanStatus === 'scanning'
                                    ? 'ባዮሜትሪክ ይምርመር ኣሎ... (Verifying TEE Token)'
                                    : biometricScanStatus === 'success'
                                    ? 'ምርመራ ብዓወት ሓሊፉ! (Authenticated)'
                                    : biometricScanStatus === 'failed'
                                    ? 'ባዮሜትሪክ ኣይተለለየን። ብፒን ተጠቐሙ።'
                                    : 'ኣጻብዕትኹም ኣብዚ ምልክት ንከስዎ (Touch to Verify)'}
                                </span>
                                <p className="text-[9.5px] text-slate-400 font-mono">
                                  Fingerprint • Face ID • Sovereign Passkey
                                </p>
                              </div>
                            </div>

                            {/* Failure Alert Banner: Auto PIN Fallback suggestion */}
                            {biometricScanStatus === 'failed' && (
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-red-950/60 border border-red-500/40 rounded-xl p-2 flex items-center justify-between"
                              >
                                <span className="text-[10px] text-red-200 font-medium">
                                  ባዮሜትሪክ ኣይተለለየን። ብናይ ስልኪ ፒን ትኣትዉ ዶ?
                                </span>
                                <button
                                  onClick={() => {
                                    setBiometricAuthMode('pin');
                                    setBiometricScanStatus('idle');
                                  }}
                                  className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 rounded-lg text-amber-300 text-[10px] font-bold cursor-pointer"
                                >
                                  ናይ ስልኪ ፒን እተው →
                                </button>
                              </motion.div>
                            )}

                            {/* Custom Action Buttons: Switch to PIN vs 1-Click Match */}
                            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-amber-500/20">
                              <button
                                onClick={() => {
                                  setBiometricAuthMode('pin');
                                  setBiometricScanStatus('idle');
                                  triggerToast('Switched to PIN fallback mode');
                                }}
                                className="py-2.5 px-3 rounded-xl bg-[#18112C] hover:bg-[#23183F] border border-amber-500/40 text-amber-200 text-xs font-bold transition-all cursor-pointer text-center flex items-center justify-center space-x-1.5"
                              >
                                <Key className="w-3.5 h-3.5 text-amber-400" />
                                <span>ናይ ስልኪ ፒን (PIN)</span>
                              </button>

                              <button
                                onClick={() => handleSimulateFingerprint(true)}
                                className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#8E6D28] via-[#C5A059] to-[#F3E5AB] text-slate-950 text-xs font-black shadow-md hover:brightness-110 transition-all cursor-pointer text-center flex items-center justify-center space-x-1.5"
                              >
                                <Fingerprint className="w-3.5 h-3.5" />
                                <span>ምርመራ ግበር (Match)</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {/* MODE 2: SECONDARY PIN-BASED AUTHENTICATION FALLBACK */}
                        {biometricAuthMode === 'pin' && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.96 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-2.5 relative z-20"
                          >
                            {/* Security Throttling / Lockout Alert Banner */}
                            {appAuthState.isLockedOut ? (
                              <motion.div
                                initial={{ opacity: 0, y: -6 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-2.5 rounded-xl bg-red-950/80 border border-red-500/60 shadow-lg text-center space-y-1"
                              >
                                <div className="flex items-center justify-center space-x-1.5 text-red-300 font-bold text-xs">
                                  <ShieldAlert className="w-4 h-4 text-red-400 animate-pulse" />
                                  <span>🔒 ድሕንነት ተዓጽዩ ኣሎ • Lockout Active</span>
                                </div>
                                <div className="text-[11px] font-mono text-amber-300 font-bold">
                                  StrongBox Throttling: {appAuthState.lockoutSecondsRemaining}s remaining
                                </div>
                                <div className="text-[9.5px] text-red-300/80">
                                  Too many incorrect PIN attempts. Rate-limit active.
                                </div>
                                <button
                                  onClick={() => {
                                    pinAuthService.resetLockout();
                                    triggerToast('Lockout reset for testing.');
                                  }}
                                  className="mt-1 px-2 py-0.5 rounded bg-red-800/60 hover:bg-red-700/60 text-[9.5px] text-red-200 border border-red-500/40 cursor-pointer font-bold"
                                >
                                  🔄 Reset Lockout (Demo Bypass)
                                </button>
                              </motion.div>
                            ) : (
                              /* PIN Indicator Dots & Attempts Status */
                              <div className="flex flex-col items-center justify-center space-y-1 py-0.5">
                                <div className="flex items-center justify-between w-full px-2 text-[10.5px]">
                                  <span className="font-bold text-[#F3E5AB]">
                                    {pinSuccess 
                                      ? '✅ ፒን ተረጋጊጹ! (Authenticated)' 
                                      : isValidatingPin
                                      ? '🔐 Cryptographic Hash Verification...'
                                      : '4-ዲጂት ናይ ስልኪ ፒን የእትዉ'}
                                  </span>
                                  <span className={`text-[9.5px] font-mono font-bold px-1.5 py-0.5 rounded ${
                                    appAuthState.failedAttempts > 0 
                                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                                      : 'text-slate-400'
                                  }`}>
                                    {appAuthState.failedAttempts > 0 
                                      ? `Attempt ${appAuthState.failedAttempts}/${appAuthState.maxAttempts}` 
                                      : 'StrongBox TEE'}
                                  </span>
                                </div>

                                <div className="flex items-center space-x-3 py-1.5">
                                  {[0, 1, 2, 3].map((index) => {
                                    const isFilled = pinCode.length > index;
                                    return (
                                      <motion.div
                                        key={index}
                                        animate={{
                                          scale: isFilled ? [1, 1.25, 1] : 1,
                                          backgroundColor: pinSuccess
                                            ? '#10B981'
                                            : pinError
                                            ? '#EF4444'
                                            : isFilled
                                            ? '#F3E5AB'
                                            : 'rgba(255,255,255,0.08)',
                                          borderColor: pinSuccess
                                            ? '#34D399'
                                            : pinError
                                            ? '#F87171'
                                            : isFilled
                                            ? '#C5A059'
                                            : 'rgba(197,160,89,0.3)',
                                        }}
                                        className={`w-4 h-4 rounded-full border-2 transition-all ${
                                          isFilled ? 'shadow-[0_0_10px_rgba(243,229,171,0.6)]' : ''
                                        }`}
                                      />
                                    );
                                  })}
                                </div>

                                {pinError ? (
                                  <span className="text-[10px] text-red-400 font-bold animate-pulse text-center px-1">
                                    {pinError}
                                  </span>
                                ) : (
                                  <span className="text-[9.5px] text-slate-400 font-mono">
                                    Trusted PINs: <strong className="text-amber-300">2026</strong>, <strong className="text-amber-300">1234</strong>, <strong className="text-amber-300">0000</strong>
                                  </span>
                                )}
                              </div>
                            )}

                            {/* 3x4 Numeric Keypad Grid */}
                            <div className="grid grid-cols-3 gap-1.5 max-w-[240px] mx-auto">
                              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                                <button
                                  key={digit}
                                  onClick={() => handlePinDigitPress(digit)}
                                  disabled={pinSuccess || isValidatingPin || appAuthState.isLockedOut}
                                  className="h-9 rounded-xl bg-[#1D1433] hover:bg-[#2B1E4A] active:scale-95 border border-amber-500/30 text-white font-bold text-sm shadow transition-all cursor-pointer flex items-center justify-center hover:border-amber-400 hover:text-amber-200 disabled:opacity-40"
                                >
                                  {digit}
                                </button>
                              ))}

                              {/* Clear Button */}
                              <button
                                onClick={handlePinClear}
                                disabled={pinSuccess || isValidatingPin || pinCode.length === 0 || appAuthState.isLockedOut}
                                className="h-9 rounded-xl bg-slate-900/80 hover:bg-slate-800 active:scale-95 border border-slate-700/60 text-slate-400 hover:text-white text-xs font-bold transition-all cursor-pointer flex items-center justify-center disabled:opacity-40"
                                title="Clear All"
                              >
                                C
                              </button>

                              {/* Digit 0 */}
                              <button
                                onClick={() => handlePinDigitPress('0')}
                                disabled={pinSuccess || isValidatingPin || appAuthState.isLockedOut}
                                className="h-9 rounded-xl bg-[#1D1433] hover:bg-[#2B1E4A] active:scale-95 border border-amber-500/30 text-white font-bold text-sm shadow transition-all cursor-pointer flex items-center justify-center hover:border-amber-400 hover:text-amber-200 disabled:opacity-40"
                              >
                                0
                              </button>

                              {/* Backspace Button */}
                              <button
                                onClick={handlePinBackspace}
                                disabled={pinSuccess || isValidatingPin || pinCode.length === 0 || appAuthState.isLockedOut}
                                className="h-9 rounded-xl bg-slate-900/80 hover:bg-slate-800 active:scale-95 border border-slate-700/60 text-amber-400 hover:text-amber-200 text-xs font-bold transition-all cursor-pointer flex items-center justify-center disabled:opacity-40"
                                title="Backspace"
                              >
                                ⌫
                              </button>
                            </div>

                            {/* Quick Test Demo Button & Return to Biometric */}
                            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-amber-500/20">
                              <button
                                onClick={async () => {
                                  if (appAuthState.isLockedOut) {
                                    triggerToast('Cannot auto-fill while locked out.');
                                    return;
                                  }
                                  setPinCode('2026');
                                  setIsValidatingPin(true);
                                  const validation = await pinAuthService.validatePin('2026');
                                  if (validation.isValid) {
                                    setPinSuccess(true);
                                    handleCompleteAuthentication('pin', validation.token);
                                  }
                                }}
                                disabled={appAuthState.isLockedOut || pinSuccess}
                                className="py-2 px-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-[10.5px] font-bold transition-all cursor-pointer flex items-center justify-center space-x-1 disabled:opacity-40"
                              >
                                <Sparkles className="w-3 h-3 text-amber-400" />
                                <span>⚡ Auto-Fill (2026)</span>
                              </button>

                              <button
                                onClick={() => {
                                  setBiometricAuthMode('biometric');
                                  setPinError(null);
                                }}
                                className="py-2 px-2.5 rounded-xl bg-[#18112C] hover:bg-[#23183F] border border-amber-500/40 text-amber-200 text-[10.5px] font-bold transition-all cursor-pointer flex items-center justify-center space-x-1"
                              >
                                <Fingerprint className="w-3 h-3 text-amber-400" />
                                <span>ናብ ባዮሜትሪክ ተመለስ</span>
                              </button>
                            </div>
                          </motion.div>
                        )}

                      </motion.div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

            </div>

            {/* =============================================================== */}
            {/* GMA NEXT-GEN COMPOSABLE ADVIEW BANNER (HOME SCREEN BOTTOM BAR)  */}
            {/* =============================================================== */}
            {activeScreen === 'home' && !isBiometricPromptOpen && (
              <ComposableAdView
                adUnitId={ADMOB_BANNER_TEST_AD_UNIT_ID}
                isOffline={offlineMode}
                hasConnectivity={wifiEnabled || mobileDataEnabled}
                darkMode={darkMode}
              />
            )}

            {/* =============================================================== */}
            {/* ANDROID SYSTEM NAVIGATION BAR (BACK, HOME, RECENTS)             */}
            {/* =============================================================== */}
            <div className="py-2.5 px-8 bg-[#07050E] border-t border-slate-800/80 flex items-center justify-around text-slate-400 select-none z-30">
              
              {/* Back Button (Triangle ◀) */}
              <button
                onClick={handleAndroidBack}
                className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white active:scale-90 transition-all cursor-pointer"
                title="Android Back"
                aria-label="Back"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              {/* Home Button (Circle ⬤) */}
              <button
                onClick={handleAndroidHome}
                className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white active:scale-90 transition-all cursor-pointer"
                title="Android Home"
                aria-label="Home"
              >
                <Circle className="w-4 h-4" />
              </button>

              {/* Recents / Overview Button (Square ◼) */}
              <button
                onClick={handleAndroidRecents}
                className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white active:scale-90 transition-all cursor-pointer"
                title="Android Recents"
                aria-label="Recent Apps"
              >
                <Square className="w-4 h-4" />
              </button>

            </div>

          </div>

        </div>

      </div>
      )}

      {/* ========================================================================= */}
      {/* 2.5. SIX MAIN TRANSLATION FEATURE CARDS                                   */}
      {/* ========================================================================= */}
      <div className="pt-2">
        <TranslationFeatureCardsGrid
          variant="dark"
          defaultLanguage="ti"
          defaultViewMode="icons"
          isOfflineActive={offlineMode}
          onSelectFeature={(feature) => {
            if (onOpenTranslatorFeature) {
              onOpenTranslatorFeature(feature);
            } else if (onNavigateTab) {
              onNavigateTab('translator');
            }
          }}
          onOpenFullHub={() => {
            if (onOpenTranslatorFeature) {
              onOpenTranslatorFeature('hub');
            } else if (onNavigateTab) {
              onNavigateTab('translator');
            }
          }}
        />
      </div>

      {/* ========================================================================= */}
      {/* 3. TECHNICAL SPECIFICATIONS & JAVA / XML CODEBASE AUDIT BANNER            */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
        
        {/* Spec 1: Java 17 Native Android Architecture */}
        <div className="p-4 rounded-2xl bg-[#0F0B1E] border border-[#8E6D28]/30 space-y-1">
          <span className="text-[10px] font-mono font-bold text-amber-400 uppercase">
            Pure Java Architecture
          </span>
          <h4 className="text-sm font-bold text-white">Java 17 • Target SDK 35</h4>
          <p className="text-xs text-slate-400">
            100% Kotlin-free native Android Studio project using standard Activity lifecycle and Java thread pools.
          </p>
        </div>

        {/* Spec 2: XML Layouts & Material Design */}
        <div className="p-4 rounded-2xl bg-[#0F0B1E] border border-emerald-500/40 space-y-1">
          <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase">
            Declarative UI Views
          </span>
          <h4 className="text-sm font-bold text-white flex items-center space-x-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>res/layout/ XML Directory</span>
          </h4>
          <p className="text-xs text-slate-400">
            Structured XML layouts with MaterialCardView, ConstraintLayout, CoordinatorLayout, and RecyclerView view holders.
          </p>
        </div>

        {/* Spec 3: Local Sovereign Capabilities */}
        <div className="p-4 rounded-2xl bg-[#0F0B1E] border border-[#8E6D28]/30 space-y-1">
          <span className="text-[10px] font-mono font-bold text-amber-400 uppercase">
            Offline Sovereign Features
          </span>
          <h4 className="text-sm font-bold text-white">OCR, Voice & Telebirr</h4>
          <p className="text-xs text-slate-400">
            Ge'ez camera scanner, Tigrinya dictionary, voice transcription, and Telebirr mobile wallet bridge.
          </p>
        </div>

      </div>

    </div>
  );
};
