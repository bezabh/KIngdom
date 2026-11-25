import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, UIThemeScheme, SavedPaymentMethod } from '../types';
import { getDefaultPaymentMethod, PAYMENT_METHODS_UPDATED_EVENT } from '../services/paymentMethodService';
import { PaymentMethodsManager } from './PaymentMethodsManager';
import { 
  ChevronLeft, Bell, Share2, Star, HelpCircle, Shield, FileText, 
  CreditCard, ChevronRight, LogIn, LogOut, Sparkles, Rocket, Camera,
  Check, X, HardDrive, Trash2, ShieldCheck, RefreshCw, Volume2, Mic,
  Palette, Sliders, Sun, Moon, Eye, Layers, Sparkle, Cloud, Zap,
  SlidersHorizontal, CheckCircle2, Loader2, AlertCircle, Database, Landmark, Info, BookOpen,
  Upload, Image as ImageIcon, UserCircle, Edit3, Trash, Music, Volume1, VolumeX, Radio,
  ChevronDown, ChevronUp, Minimize2, Maximize2, Eraser,
  Lock, Unlock, Fingerprint, Key, Smartphone, ShieldAlert, Cpu, CheckCircle, Wallet, Plus
} from 'lucide-react';
import { 
  useBrandingTheme, 
  GoldIntensity, 
  ThemeHue, 
  GOLD_PALETTE, 
  THEME_HUE_PALETTE 
} from '../context/BrandingThemeContext';
import { logoutFromFirebase, syncUserProfileToFirestore, uploadAvatarToFirebaseStorage } from '../lib/firebase';
import { HeritageGalleryCarousel } from './HeritageGalleryCarousel';
import { useTraditionalAmbientAudio } from '../hooks/useTraditionalAmbientAudio';
import { TraditionalInstrument } from '../utils/traditionalAmbientAudio';
import { NotificationIconStyleSelector } from './NotificationIconStyleSelector';
import {
  VoicePersonaId,
  VoicePersonaSettings,
  VOICE_PERSONA_UPDATED_EVENT,
  getVoicePersona,
  getStoredVoicePersonaSettings,
  saveVoicePersonaSettings,
} from '../types/voicePersona';
import { VoicePersonaSelector } from './VoicePersonaSelector';
import { HapticAccessibilitySettings } from './HapticAccessibilitySettings';
import { TimeOfDayThemeSettings } from './TimeOfDayThemeSettings';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  onUpdateUser: (updated: Partial<UserProfile>) => void;
  isOffline: boolean;
  onToggleOfflineAccess?: () => void;
  onOpenSecurityModal?: () => void;
  onOpenPaymentModal?: () => void;
  onOpenPaymentMethods?: () => void;
  onOpenManagement?: (section?: 'users' | 'payments' | 'customers') => void;
  onOpenAuthModal?: (mode: 'login' | 'signup' | 'forgot_password') => void;
  onSaveInsight?: (item: any) => void;
  onNavigateTab?: (tab: any) => void;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  user,
  onUpdateUser,
  isOffline,
  onToggleOfflineAccess,
  onOpenSecurityModal,
  onOpenPaymentModal,
  onOpenPaymentMethods,
  onOpenManagement,
  onOpenAuthModal,
  onSaveInsight,
  onNavigateTab,
}) => {
  // Custom Branding Hook
  const { 
    branding, 
    setThemeScheme, 
    setGoldIntensity, 
    setThemeHue, 
    setGoldShimmerEffect, 
    setBorderGlow, 
    resetToDefaultBranding,
    goldAccentColor,
    themeHueColor
  } = useBrandingTheme();

  // Ambient Audio Hook & State
  const { 
    isPlaying: isAmbientPlaying, 
    volume: ambientVolume, 
    instrument: ambientInstrument,
    currentMode: ambientCurrentMode,
    toggle: toggleAmbientSound,
    start: startAmbientSound,
    stop: stopAmbientSound,
    setVolume: setAmbientAudioVolume,
    setInstrument: setAmbientInstrument
  } = useTraditionalAmbientAudio();

  // User Preference Toggle States (with auto-save effect)
  const [notificationsEnabled, setNotificationsEnabled] = useState(user.notificationsEnabled ?? true);
  const [isNotificationIconsExpanded, setIsNotificationIconsExpanded] = useState<boolean>(false);
  const [offlineAccessEnabled, setOfflineAccessEnabled] = useState(user.offlineAccessEnabled ?? true);
  const [soundEffectsEnabled, setSoundEffectsEnabled] = useState(user.soundEffectsEnabled ?? true);
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(user.autoBackupEnabled ?? true);
  const [ambientSoundEnabled, setAmbientSoundEnabled] = useState(user.ambientSoundEnabled ?? false);
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState<SavedPaymentMethod | null>(() =>
    getDefaultPaymentMethod(user?.id, user?.email)
  );
  const [isPaymentMethodsModalOpen, setIsPaymentMethodsModalOpen] = useState(false);

  useEffect(() => {
    setDefaultPaymentMethod(getDefaultPaymentMethod(user?.id, user?.email));
    const onUpdated = (e: Event) => {
      const custom = e as CustomEvent<{ defaultMethod?: SavedPaymentMethod | null }>;
      if (custom.detail && 'defaultMethod' in custom.detail) {
        setDefaultPaymentMethod(custom.detail.defaultMethod || null);
      }
    };
    window.addEventListener(PAYMENT_METHODS_UPDATED_EVENT, onUpdated);
    return () => window.removeEventListener(PAYMENT_METHODS_UPDATED_EVENT, onUpdated);
  }, [user?.id, user?.email]);
  const [selectedInstrument, setSelectedInstrument] = useState<TraditionalInstrument>(
    (user.ambientInstrument as TraditionalInstrument) || ambientInstrument || 'ensemble'
  );
  const [currentVolume, setCurrentVolume] = useState<number>(
    user.ambientSoundVolume !== undefined ? user.ambientSoundVolume : ambientVolume
  );

  // AI Voice Persona Selection & Tuning State (synced with Firestore profile & voice assistant)
  const initialVoiceSettings = getStoredVoicePersonaSettings(user);
  const [voicePersona, setVoicePersona] = useState<VoicePersonaId>(initialVoiceSettings.personaId);
  const [voicePersonaPitch, setVoicePersonaPitch] = useState<number>(initialVoiceSettings.pitchMultiplier);
  const [voicePersonaRate, setVoicePersonaRate] = useState<number>(initialVoiceSettings.rateMultiplier);
  const [isVoicePersonaSectionOpen, setIsVoicePersonaSectionOpen] = useState<boolean>(true);

  useEffect(() => {
    const synced = getStoredVoicePersonaSettings(user);
    setVoicePersona(synced.personaId);
    setVoicePersonaPitch(synced.pitchMultiplier);
    setVoicePersonaRate(synced.rateMultiplier);
  }, [user?.voicePersona, user?.voicePersonaPitch, user?.voicePersonaRate]);

  useEffect(() => {
    const onPersonaUpdated = (evt: Event) => {
      const custom = evt as CustomEvent<VoicePersonaSettings>;
      if (!custom.detail) return;
      setVoicePersona(custom.detail.personaId);
      setVoicePersonaPitch(custom.detail.pitchMultiplier);
      setVoicePersonaRate(custom.detail.rateMultiplier);
    };
    window.addEventListener(VOICE_PERSONA_UPDATED_EVENT, onPersonaUpdated);
    return () => window.removeEventListener(VOICE_PERSONA_UPDATED_EVENT, onPersonaUpdated);
  }, []);

  // Security & App Lock State
  const [appLockEnabled, setAppLockEnabled] = useState<boolean>(() => {
    if (typeof user.appLockEnabled === 'boolean') return user.appLockEnabled;
    try {
      return localStorage.getItem('axumite_app_lock_enabled') === 'true';
    } catch {
      return false;
    }
  });
  const [biometricType, setBiometricType] = useState<'fingerprint' | 'face' | 'both'>(user.biometricType || 'fingerprint');
  const [lockTimeoutMinutes, setLockTimeoutMinutes] = useState<number>(user.lockTimeoutMinutes || 0);
  const [panicWipeEnabled, setPanicWipeEnabled] = useState<boolean>(user.panicWipeEnabled || false);
  const [isTestingBiometrics, setIsTestingBiometrics] = useState<boolean>(false);
  const [testBioSuccess, setTestBioSuccess] = useState<boolean | null>(null);

  // Sync ambient sound playing state with toggle
  const handleToggleAmbient = () => {
    if (isAmbientPlaying) {
      stopAmbientSound();
      setAmbientSoundEnabled(false);
    } else {
      startAmbientSound();
      setAmbientSoundEnabled(true);
    }
  };

  const handleVolumeChange = (newVol: number) => {
    setCurrentVolume(newVol);
    setAmbientAudioVolume(newVol);
  };

  const handleInstrumentSelect = (inst: TraditionalInstrument) => {
    setSelectedInstrument(inst);
    setAmbientInstrument(inst);
  };

  // Auto-Save Status & Indicator States
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('saved');
  const [lastSavedTime, setLastSavedTime] = useState<string>('Just now');
  const isInitialMount = useRef(true);

  const [activeSubModal, setActiveSubModal] = useState<
    'none' | 'avatar-picker' | 'theme-customization' | 'branding' | 'storage' | 'privacy' | 'terms' | 'faq' | 'rate' | 'share' | 'contribute' | 'about' | 'security-settings'
  >('none');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSavingToFirestore, setIsSavingToFirestore] = useState(false);
  const [firestoreSyncSuccess, setFirestoreSyncSuccess] = useState(false);

  // Quick biometric test simulation
  const handleTestBiometrics = () => {
    setIsTestingBiometrics(true);
    setTestBioSuccess(null);
    setTimeout(() => {
      setIsTestingBiometrics(false);
      setTestBioSuccess(true);
      setTimeout(() => setTestBioSuccess(null), 3500);
    }, 1200);
  };

  // Collapsible / Minimizable Topics States
  const [isAccountSectionOpen, setIsAccountSectionOpen] = useState(true);
  const [isAmbientSectionOpen, setIsAmbientSectionOpen] = useState(true);
  const [isSupportSectionOpen, setIsSupportSectionOpen] = useState(true);
  const [expandedFaqIndex, setExpandedFaqIndex] = useState<number | null>(0);

  // Quick minimize all / expand all
  const allSectionsExpanded = isAccountSectionOpen && isAmbientSectionOpen && isSupportSectionOpen;
  const toggleAllSections = () => {
    const nextState = !allSectionsExpanded;
    setIsAccountSectionOpen(nextState);
    setIsAmbientSectionOpen(nextState);
    setIsSupportSectionOpen(nextState);
  };

  // Avatar Upload & Customization State
  const avatarFileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [customAvatarUrlInput, setCustomAvatarUrlInput] = useState('');

  // Check if string is an image URL (http/https/data/blob)
  const isAvatarImageUrl = (avatarStr?: string) => {
    if (!avatarStr) return false;
    return (
      avatarStr.startsWith('http://') ||
      avatarStr.startsWith('https://') ||
      avatarStr.startsWith('data:image/') ||
      avatarStr.startsWith('blob:')
    );
  };

  // Handle avatar file upload to Firebase Storage and Firestore
  const handleAvatarFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('በጃኹም ቅኑዕ ናይ ስእሊ ፋይል ምረጹ (Please select a valid image file)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showToast('ዓቐን ስእሊ ካብ 10MB ክበልጽ የብሉን (Image size must be less than 10MB)');
      return;
    }

    try {
      setIsUploadingAvatar(true);
      setSaveStatus('saving');
      showToast('ስእሊ ይጸዓን ኣሎ... (Uploading avatar to Firebase Storage...)');

      const userEmail = user.email || 'guest@axumite.ai';
      const result = await uploadAvatarToFirebaseStorage(file, userEmail, user.id);

      if (result.success && result.downloadUrl) {
        onUpdateUser({ avatar: result.downloadUrl });

        if (user.email) {
          await syncUserProfileToFirestore({
            ...user,
            avatar: result.downloadUrl,
          });
        }

        setSaveStatus('saved');
        const now = new Date();
        setLastSavedTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        showToast('ስእሊ ፕሮፋይል ብዓወት ተቐይሩ ኣሎ! (Profile picture updated successfully!)');
        setActiveSubModal('none');
      } else {
        throw new Error(result.error || 'Avatar upload failed');
      }
    } catch (err: any) {
      console.error('Avatar upload error:', err);
      setSaveStatus('error');
      showToast('ስእሊ ኣብ ምዕራግ ጌጋ ኣጋጢሙ (Failed to upload avatar image)');
    } finally {
      setIsUploadingAvatar(false);
      if (e.target) e.target.value = '';
    }
  };

  // Handle preset avatar icon selection
  const handleSelectPresetAvatar = async (presetIcon: string) => {
    try {
      setIsUploadingAvatar(true);
      setSaveStatus('saving');
      onUpdateUser({ avatar: presetIcon });
      
      if (user.email) {
        await syncUserProfileToFirestore({
          ...user,
          avatar: presetIcon,
        });
      }

      setSaveStatus('saved');
      const now = new Date();
      setLastSavedTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      showToast(`ምልክት ፕሮፋይል ተቐይሩ፡ ${presetIcon}`);
      setActiveSubModal('none');
    } catch (err) {
      console.warn('Preset avatar error:', err);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Handle custom image URL submission
  const handleSaveCustomImageUrl = async () => {
    const trimmed = customAvatarUrlInput.trim();
    if (!trimmed) return;

    try {
      setIsUploadingAvatar(true);
      setSaveStatus('saving');
      onUpdateUser({ avatar: trimmed });

      if (user.email) {
        await syncUserProfileToFirestore({
          ...user,
          avatar: trimmed,
        });
      }

      setSaveStatus('saved');
      const now = new Date();
      setLastSavedTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      showToast('ስእሊ ፕሮፋይል ተቐይሩ ኣሎ (Profile picture updated)');
      setCustomAvatarUrlInput('');
      setActiveSubModal('none');
    } catch (err) {
      console.warn('Custom avatar url error:', err);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Handle reset avatar
  const handleResetAvatar = async () => {
    const defaultIcon = ((user.email || '').trim().toLowerCase() === 'beckylove2004@gmail.com' || user.role === 'Creator') ? '👑' : '🦁';
    try {
      onUpdateUser({ avatar: defaultIcon });
      if (user.email) {
        await syncUserProfileToFirestore({
          ...user,
          avatar: defaultIcon,
        });
      }
      showToast('ስእሊ ፕሮፋይል ተቐይሩ ኣሎ (Profile avatar reset)');
      setActiveSubModal('none');
    } catch (err) {
      console.warn('Reset avatar error:', err);
    }
  };

  // Auto-Save Effect: Triggers a Firestore update for user preferences whenever preference/save state is modified
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    setSaveStatus('saving');
    setIsSavingToFirestore(true);

    const timer = setTimeout(async () => {
      try {
        const updatedPreferences: Partial<UserProfile> = {
          notificationsEnabled,
          offlineAccessEnabled,
          soundEffectsEnabled,
          autoBackupEnabled,
          ambientSoundEnabled,
          ambientSoundVolume: currentVolume,
          ambientInstrument: selectedInstrument,
          voicePersona,
          voicePersonaPitch,
          voicePersonaRate,
          appLockEnabled,
          biometricAuthEnabled: appLockEnabled,
          biometricType,
          lockTimeoutMinutes,
          panicWipeEnabled,
          themePreference: branding.themeScheme,
          themeConfig: {
            scheme: branding.themeScheme,
            goldIntensity: branding.goldIntensity,
            themeHue: branding.themeHue,
            goldShimmerEffect: branding.goldShimmerEffect,
            borderGlow: branding.borderGlow,
            updatedAt: new Date().toISOString(),
          },
        };

        // Save app lock preference locally for immediate access & native sync
        try {
          localStorage.setItem('axumite_app_lock_enabled', String(appLockEnabled));
          localStorage.setItem('axumite_biometric_type', biometricType);
        } catch {
          // ignore
        }

        // 1. Update local user profile state in parent
        onUpdateUser(updatedPreferences);

        // 2. Persist updated preferences to Firestore user document
        if (user.email) {
          await syncUserProfileToFirestore({
            ...user,
            ...updatedPreferences,
          });
        }

        setSaveStatus('saved');
        setFirestoreSyncSuccess(true);
        setTimeout(() => setFirestoreSyncSuccess(false), 3000);

        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLastSavedTime(timeStr);
      } catch (err) {
        console.warn('Auto-save Firestore update notice:', err);
        setSaveStatus('error');
      } finally {
        setIsSavingToFirestore(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [
    notificationsEnabled,
    offlineAccessEnabled,
    soundEffectsEnabled,
    autoBackupEnabled,
    ambientSoundEnabled,
    currentVolume,
    selectedInstrument,
    voicePersona,
    voicePersonaPitch,
    voicePersonaRate,
    appLockEnabled,
    biometricType,
    lockTimeoutMinutes,
    panicWipeEnabled,
    branding.themeScheme,
    branding.goldIntensity,
    branding.themeHue,
    branding.goldShimmerEffect,
    branding.borderGlow,
  ]);

  // Storage Stats & Cache Clearing States
  const [chatCacheSizeKb, setChatCacheSizeKb] = useState('0.0');
  const [visionCacheSizeKb, setVisionCacheSizeKb] = useState('0.0');
  const [savedInsightsSizeKb, setSavedInsightsSizeKb] = useState('0.0');
  const [dependentDataSizeKb, setDependentDataSizeKb] = useState('0.0');
  const [totalReclaimableKb, setTotalReclaimableKb] = useState('0.0');
  const [isClearingCache, setIsClearingCache] = useState(false);
  const [isClearingAllStorage, setIsClearingAllStorage] = useState(false);

  const calculateStorage = () => {
    try {
      const insightsRaw = localStorage.getItem('axumite_saved_insights');
      const insightsKb = insightsRaw ? insightsRaw.length / 1024 : 0;
      setSavedInsightsSizeKb(insightsKb.toFixed(1));

      let chatBytes = 0;
      [
        'axumite_chat_history_archive',
        'axumite_chat_history',
        'axumite_chat_cache',
        'axumite_chat_conversations',
        'axumite_chat_messages',
        'axumite_cached_messages',
        'axumite_offline_responses',
        'axumite_offline_cache',
        'axumite_recent_queries',
        'obelisk_chat_history',
        'obelisk_conversations'
      ].forEach((k) => {
        const v = localStorage.getItem(k);
        if (v) chatBytes += v.length;
      });
      setChatCacheSizeKb((chatBytes / 1024).toFixed(1));

      let visionBytes = 0;
      ['axumite_vision_history', 'axumite_vision_cache', 'axumite_image_prompts'].forEach((k) => {
        const v = localStorage.getItem(k);
        if (v) visionBytes += v.length;
      });
      setVisionCacheSizeKb((visionBytes / 1024).toFixed(1));

      let depBytes = 0;
      [
        'axumite_welcome_overlay_shown',
        'axumite_temp_cache',
        'axumite_audio_cache',
        'axumite_audio_blobs',
        'axumite_local_metadata',
        'axumite_offline_translations'
      ].forEach((k) => {
        const v = localStorage.getItem(k);
        if (v) depBytes += v.length;
      });
      setDependentDataSizeKb((depBytes / 1024).toFixed(1));

      setTotalReclaimableKb(((insightsKb * 1024 + chatBytes + visionBytes + depBytes) / 1024).toFixed(1));
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (isOpen) calculateStorage();
  }, [isOpen]);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Clear offline chat history, cached prompts, and local metadata to free up storage
  const handleClearCache = () => {
    setIsClearingCache(true);
    try {
      const cacheKeysToWipe = [
        'axumite_chat_history_archive',
        'axumite_chat_history',
        'axumite_chat_cache',
        'axumite_chat_conversations',
        'axumite_chat_messages',
        'axumite_cached_messages',
        'axumite_offline_responses',
        'axumite_offline_cache',
        'axumite_recent_queries',
        'axumite_vision_history',
        'axumite_vision_cache',
        'axumite_image_prompts',
        'axumite_welcome_overlay_shown',
        'axumite_temp_cache',
        'axumite_audio_cache',
        'axumite_audio_blobs',
        'axumite_local_metadata',
        'axumite_offline_translations',
        'obelisk_chat_history',
        'obelisk_conversations'
      ];
      
      cacheKeysToWipe.forEach((k) => localStorage.removeItem(k));
      calculateStorage();
      showToast('ናይ ኦፍላይን ታሪክን መረዳእታን ብዓወት ተጸሪጉ ኣሎ! (Offline chat history & cache cleared!)');
    } catch (e) {
      console.error('Failed to clear offline cache:', e);
      showToast('ዕቋር ኣብ ምጽራግ ጌጋ ኣጋጢሙ (Failed to wipe offline cache)');
    } finally {
      setTimeout(() => setIsClearingCache(false), 500);
    }
  };

  const handleClearAllStorage = () => {
    setIsClearingAllStorage(true);
    try {
      [
        'axumite_saved_insights',
        'axumite_chat_history_archive',
        'axumite_chat_history',
        'axumite_chat_cache',
        'axumite_chat_conversations',
        'axumite_chat_messages',
        'axumite_cached_messages',
        'axumite_offline_responses',
        'axumite_offline_cache',
        'axumite_recent_queries',
        'axumite_vision_history',
        'axumite_vision_cache',
        'axumite_image_prompts',
        'axumite_welcome_overlay_shown',
        'axumite_temp_cache',
        'axumite_audio_cache',
        'axumite_audio_blobs',
        'axumite_local_metadata',
        'axumite_offline_translations',
        'obelisk_chat_history',
        'obelisk_conversations'
      ].forEach((k) => localStorage.removeItem(k));
      calculateStorage();
      showToast('ዕቋር ብምሉእ ተጸሪጉ (All local storage cleared)');
    } catch (e) {
      console.error(e);
      showToast('ዕቋር ኣብ ምጽራግ ጌጋ ኣጋጢሙ (Error clearing storage)');
    } finally {
      setTimeout(() => setIsClearingAllStorage(false), 500);
    }
  };

  const handleShareApp = () => {
    if (navigator.share) {
      navigator.share({
        title: 'ኣክሱማይት AI',
        text: 'ቀዳማይ ቋንቋ ትግርኛን ግዕዝን AI ፕላትፎርም ተጠቐሙ።',
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      showToast('ሊንክ ናይ ኣፕ ተቐዲሑ (Link copied to clipboard)');
    }
  };

  const handleApplyAndPersistTheme = async (
    scheme: UIThemeScheme,
    customIntensity?: GoldIntensity,
    customHue?: ThemeHue
  ) => {
    setIsSavingToFirestore(true);
    setFirestoreSyncSuccess(false);

    try {
      // 1. Update branding theme context state
      setThemeScheme(scheme);
      if (customIntensity) setGoldIntensity(customIntensity);
      if (customHue) setThemeHue(customHue);

      const targetIntensity = customIntensity || (scheme === 'high-contrast-gold' ? 'pure-axum' : scheme === 'soft-ambient-gold' ? 'soft' : 'balanced');
      const targetHue = customHue || branding.themeHue || 'royal-axum';
      const targetShimmer = scheme === 'high-contrast-gold' || scheme === 'balanced-gold';
      const targetGlow = scheme === 'high-contrast-gold' || scheme === 'balanced-gold';

      const updatedConfig = {
        scheme,
        goldIntensity: targetIntensity,
        themeHue: targetHue,
        goldShimmerEffect: targetShimmer,
        borderGlow: targetGlow,
        updatedAt: new Date().toISOString(),
      };

      // 2. Update local UserProfile state
      onUpdateUser({
        themePreference: scheme,
        themeConfig: updatedConfig,
      });

      // 3. Persist to Firestore user profile document if user has email
      if (user.email) {
        await syncUserProfileToFirestore({
          ...user,
          themePreference: scheme,
          themeConfig: updatedConfig,
        });
        setFirestoreSyncSuccess(true);
        setTimeout(() => setFirestoreSyncSuccess(false), 4000);
      }

      showToast(
        scheme === 'high-contrast-gold'
          ? '⚡ ዝለዓለ ፍልልይ ወርቂ ተዓቂቡ (High-Contrast Gold synced to Firestore)'
          : scheme === 'soft-ambient-gold'
          ? '🌙 ልዙብ ከባቢ ወርቂ ተዓቂቡ (Soft Ambient Gold synced to Firestore)'
          : '👑 ሚዛናዊ ንግሳዊ ወርቂ ተዓቂቡ (Balanced Royal Gold synced to Firestore)'
      );
    } catch (err) {
      console.warn('Firestore theme profile update notice:', err);
      showToast('Theme preference updated locally');
    } finally {
      setIsSavingToFirestore(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-center bg-black/50 backdrop-blur-xs overflow-y-auto animate-fade-in">
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-[#F8FAFC] min-h-screen sm:min-h-0 sm:my-6 sm:rounded-[36px] shadow-2xl p-5 sm:p-6 space-y-5 relative text-slate-800 flex flex-col justify-between"
      >
        
        <div className="space-y-4">
          
          {/* Top Header: Circular Back Button & Title */}
          <div className="relative flex items-center justify-center pt-2 pb-1">
            <button
              type="button"
              onClick={onClose}
              className="absolute left-0 w-11 h-11 rounded-full bg-white border border-stone-200 shadow-sm flex items-center justify-center text-slate-700 hover:bg-stone-50 active:scale-95 transition-all cursor-pointer"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <div className="text-center">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight font-serif">
                ፕሮፋይል
              </h1>
              <div className="text-[11px] font-bold text-[#3B82F6] uppercase tracking-widest mt-0.5 font-sans">
                USER PROFILE
              </div>
            </div>
          </div>

          {/* Toast Notification */}
          {toastMessage && (
            <div className="bg-slate-900 text-white text-xs px-4 py-2.5 rounded-2xl text-center shadow-lg animate-fade-in flex items-center justify-center space-x-2">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Hidden File Input for Avatar Upload to Firebase Storage */}
          <input
            ref={avatarFileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarFileSelect}
            disabled={isUploadingAvatar}
          />

          {/* User Profile Avatar & Badge Section (Matching Screenshot 2) */}
          <div className="flex flex-col items-center justify-center pt-1 pb-2">
            <div className="relative">
              {/* Avatar Bubble Container */}
              <div 
                onClick={() => setActiveSubModal('avatar-picker')}
                className="w-20 h-20 rounded-full bg-gradient-to-b from-[#3B82F6] to-[#1D4ED8] flex items-center justify-center text-white text-3xl font-black shadow-lg shadow-blue-500/20 font-serif overflow-hidden cursor-pointer hover:ring-4 hover:ring-blue-400/40 transition-all group relative border-2 border-white/80"
                title="Change Avatar (ስእሊ ፕሮፋይል ቀይር)"
              >
                {isAvatarImageUrl(user.avatar) ? (
                  <img 
                    src={user.avatar} 
                    alt={user.name || 'User Avatar'} 
                    className="w-full h-full object-cover rounded-full"
                    referrerPolicy="no-referrer"
                  />
                ) : user.avatar && user.avatar.length <= 4 && user.avatar !== 'axumite-star' ? (
                  <span>{user.avatar}</span>
                ) : (
                  <span>{user.name && user.name.trim().length > 0 ? user.name.charAt(0) : 'ክ'}</span>
                )}

                {/* Hover overlay hint */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-full">
                  <Camera className="w-6 h-6 text-white" />
                </div>

                {/* Uploading Spinner Overlay */}
                {isUploadingAvatar && (
                  <div className="absolute inset-0 bg-slate-900/85 flex flex-col items-center justify-center text-white z-20 rounded-full backdrop-blur-2xs">
                    <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
                    <span className="text-[8.5px] font-bold mt-1 text-amber-200">ይጸዓን...</span>
                  </div>
                )}
              </div>

              {/* Camera Icon Button Overlay on bottom right */}
              <button 
                type="button"
                onClick={() => {
                  if (avatarFileInputRef.current) {
                    avatarFileInputRef.current.click();
                  } else {
                    setActiveSubModal('avatar-picker');
                  }
                }}
                disabled={isUploadingAvatar}
                className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-[#1E293B] border-2 border-white flex items-center justify-center text-white shadow-md hover:bg-blue-600 active:scale-95 transition-all cursor-pointer"
                title="Upload Photo / Change Avatar (ስእሊ ቀይር)"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>

              {/* Superadmin / Guest Pill Badge below Avatar */}
              {((user.email || '').trim().toLowerCase() === 'beckylove2004@gmail.com' || user.role === 'Creator') ? (
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#F59E0B] via-[#EAB308] to-[#F59E0B] text-slate-950 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-lg shadow-amber-500/20 border border-amber-300 flex items-center space-x-1 whitespace-nowrap">
                  <span>👑</span>
                  <span>SUPERADMIN (ልዑላዊ ኣድሚን)</span>
                </div>
              ) : (
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-slate-900 text-cyan-300 border border-cyan-500/50 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm flex items-center space-x-1 whitespace-nowrap">
                  <span>👤</span>
                  <span>GUEST USER (ጋሻ ተጠቃሚ)</span>
                </div>
              )}
            </div>

            {/* Name and Email */}
            <div className="text-center mt-4">
              <h2 className="text-xl font-black text-slate-900 tracking-tight font-serif">
                {user.name || 'ክቡር ዓሚል'}
              </h2>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                {user.email || 'No email linked'}
              </p>

              {/* Small 'Saved' / Auto-Save Status Indicator */}
              <div className="flex items-center justify-center mt-2.5">
                <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-white/90 backdrop-blur-xs rounded-full border border-stone-200 shadow-2xs text-[11px] transition-all">
                  <Cloud className="w-3 h-3 text-blue-500 shrink-0" />
                  <span className="font-semibold text-slate-600 text-[10.5px]">ምርጫታት:</span>
                  
                  {saveStatus === 'saving' && (
                    <span className="inline-flex items-center space-x-1 text-amber-600 font-bold font-mono text-[10px] bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/80 animate-pulse">
                      <Loader2 className="w-2.5 h-2.5 animate-spin text-amber-600" />
                      <span>Saving...</span>
                    </span>
                  )}
                  {saveStatus === 'saved' && (
                    <span className="inline-flex items-center space-x-1 text-emerald-600 font-bold font-mono text-[10px] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/80 transition-all">
                      <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                      <span>Saved</span>
                      <span className="text-[9px] text-emerald-600/70 font-normal">({lastSavedTime})</span>
                    </span>
                  )}
                  {saveStatus === 'error' && (
                    <span className="inline-flex items-center space-x-1 text-rose-600 font-bold font-mono text-[10px] bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200/80">
                      <AlertCircle className="w-2.5 h-2.5 text-rose-600" />
                      <span>Sync Error</span>
                    </span>
                  )}

                  {/* Quick Minimize / Expand All Topics Control */}
                  <button
                    type="button"
                    onClick={toggleAllSections}
                    className="inline-flex items-center space-x-1 text-slate-600 hover:text-amber-800 font-bold text-[10px] bg-white hover:bg-amber-50 px-2 py-0.5 rounded-full border border-stone-200 transition-all cursor-pointer"
                    title={allSectionsExpanded ? 'Minimize all topics' : 'Expand all topics'}
                  >
                    {allSectionsExpanded ? (
                      <>
                        <Minimize2 className="w-2.5 h-2.5 text-amber-700" />
                        <span>Minimize All</span>
                      </>
                    ) : (
                      <>
                        <Maximize2 className="w-2.5 h-2.5 text-amber-700" />
                        <span>Expand All</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Project Support Card (Dark Navy Hero Card Matching Screenshot 2) */}
          <div className="relative bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0A0F1D] p-5 rounded-3xl text-white shadow-xl overflow-hidden space-y-3">
            {/* Background geometric curve */}
            <div className="absolute -right-10 -bottom-10 w-44 h-44 rounded-full bg-blue-500/10 pointer-events-none blur-2xl" />

            <div className="relative z-10 space-y-2">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center text-amber-400 shadow-inner shrink-0">
                  <Rocket className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white tracking-tight leading-snug">
                    ደገፍኩም ንፕሮጀክትና
                  </h3>
                  <div className="text-[11px] text-slate-400 font-medium">
                    ንዕቤትና ኣተባብዑ
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed font-normal pt-1">
                ከም ማሕበረሰብ ምስ ግዜ ንምስጓም፡ ዝተረቐቐ ቴክኖሎጂ ክህልወና ኣገዳሲ እዩ። ነዚ ተጀሚሩ ዘሎ ዕዮ ብዝበለጸ ንምቕጻልን ናብ ዝለዓለ ደረጃ ንምብጻሕን ሓገዝኩም የድልየና።
              </p>

              <button
                type="button"
                onClick={() => {
                  if (onOpenPaymentModal) onOpenPaymentModal();
                  else setActiveSubModal('contribute');
                }}
                className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-[#FACC15] via-[#EAB308] to-[#CA8A04] hover:brightness-105 active:scale-[0.98] text-slate-950 font-black text-xs sm:text-sm rounded-2xl shadow-md flex items-center justify-center space-x-2 transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-slate-950" />
                <span>ኣበርክቶኹም ንፕሮጀክትና</span>
                <ChevronRight className="w-4 h-4 text-slate-950" />
              </button>
            </div>
          </div>

          {/* Section 1: ACCOUNT & SETTINGS (Screenshot 2) */}
          <div className="space-y-1.5 pt-1">
            <div 
              onClick={() => setIsAccountSectionOpen(!isAccountSectionOpen)}
              className="flex items-center justify-between px-1 py-1 cursor-pointer select-none group"
            >
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1.5 group-hover:text-slate-800 transition-colors">
                <span>ኣካውንትን ቅጥዕታትን (ACCOUNT & SETTINGS)</span>
                <span className="text-[9.5px] px-1.5 py-0.2 bg-stone-100 text-stone-600 rounded-full font-mono font-bold">
                  {isAccountSectionOpen ? '8 items' : 'Collapsed'}
                </span>
              </div>
              <button
                type="button"
                className="p-1 rounded-md text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-all"
                title={isAccountSectionOpen ? 'Minimize section' : 'Expand section'}
              >
                {isAccountSectionOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {isAccountSectionOpen && (
            <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs divide-y divide-stone-100 overflow-hidden animate-in fade-in duration-200">
              
              {/* Item 1: Subscription / PRO */}
              <button
                type="button"
                onClick={() => {
                  if (onOpenPaymentModal) onOpenPaymentModal();
                  else showToast('PRO Membership Active');
                }}
                className="w-full p-3.5 flex items-center justify-between hover:bg-stone-50 transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      ክፍሊት (Subscription)
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Manage your PRO status
                    </div>
                  </div>
                </div>

                <span className="px-2.5 py-0.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-full text-[10px] font-black uppercase font-mono tracking-wider">
                  PRO
                </span>
              </button>

              {/* Item 1b: Saved Payment Methods */}
              <button
                type="button"
                onClick={() => {
                  if (onOpenPaymentMethods) {
                    onClose();
                    onOpenPaymentMethods();
                  } else {
                    setIsPaymentMethodsModalOpen(true);
                  }
                }}
                className="w-full p-3.5 flex items-center justify-between hover:bg-amber-50/60 transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      ናይ ክፍሊት መንገድታት (Payment Methods)
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {defaultPaymentMethod ? defaultPaymentMethod.label : 'Cards, Telebirr, CBE Birr & Bank Wire'}
                    </div>
                  </div>
                </div>

                <span className="px-2.5 py-1 bg-amber-100 text-amber-800 border border-amber-300 rounded-full text-[10px] font-black flex items-center space-x-1">
                  <Plus className="w-3 h-3" />
                  <span>Manage</span>
                </span>
              </button>

              <PaymentMethodsManager
                user={user}
                mode="modal"
                isOpen={isPaymentMethodsModalOpen}
                onClose={() => setIsPaymentMethodsModalOpen(false)}
                defaultOpenAddForm={false}
              />

              {/* Item 2: Theme Customization (High-Contrast vs Soft Ambient Gold) */}
              <button
                type="button"
                onClick={() => setActiveSubModal('theme-customization')}
                className="w-full p-3.5 flex items-center justify-between hover:bg-amber-50/60 transition-colors text-left cursor-pointer bg-gradient-to-r from-amber-50/30 via-transparent to-transparent"
              >
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs border"
                    style={{ 
                      backgroundColor: `${goldAccentColor}20`,
                      borderColor: `${goldAccentColor}60`,
                      color: goldAccentColor
                    }}
                  >
                    <Palette className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                      <span>ምምዕርራይ ቅዲ (Theme Customization)</span>
                      <span 
                        className="text-[9px] font-black px-1.5 py-0.2 rounded uppercase"
                        style={{ 
                          backgroundColor: goldAccentColor,
                          color: '#0F172A'
                        }}
                      >
                        {branding.themeScheme === 'high-contrast-gold' 
                          ? '⚡ HIGH-CONTRAST' 
                          : branding.themeScheme === 'soft-ambient-gold' 
                          ? '🌙 SOFT AMBIENT' 
                          : '👑 BALANCED GOLD'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      High-Contrast & Soft Ambient Gold Color Schemes (Firestore Synced)
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-stone-400" />
              </button>

              {/* Item 3: Notifications Switch */}
              <div className="p-3.5 space-y-3 bg-stone-50/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
                      <Bell className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                        <span>መተሓሳሰቢ (Notifications)</span>
                        <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-mono text-[9px]">
                          OneSignal v5
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Auto-saved push alerts &amp; custom category styles
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {notificationsEnabled && (
                      <button
                        type="button"
                        onClick={() => setIsNotificationIconsExpanded(!isNotificationIconsExpanded)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center space-x-1 cursor-pointer ${
                          isNotificationIconsExpanded
                            ? 'bg-amber-500 text-slate-950 shadow-sm'
                            : 'bg-amber-100/80 text-amber-900 hover:bg-amber-200'
                        }`}
                      >
                        <Layers className="w-3 h-3" />
                        <span>ምልክታት ({isNotificationIconsExpanded ? 'Hide' : 'Icons'})</span>
                        {isNotificationIconsExpanded ? (
                          <ChevronUp className="w-3 h-3 ml-0.5" />
                        ) : (
                          <ChevronDown className="w-3 h-3 ml-0.5" />
                        )}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                      className={`w-11 h-6 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                        notificationsEnabled ? 'bg-blue-600 justify-end' : 'bg-stone-300 justify-start'
                      }`}
                    >
                      <div className="bg-white w-5 h-5 rounded-full shadow-md" />
                    </button>
                  </div>
                </div>

                {/* Expandable Custom Notification Icon Style Selector */}
                {notificationsEnabled && isNotificationIconsExpanded && (
                  <div className="pt-3 border-t border-amber-200/50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <NotificationIconStyleSelector />
                  </div>
                )}
              </div>

              {/* Item 3b: Offline Vault Access Switch */}
              <div className="p-3.5 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center shrink-0">
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      ናይ ኦፍላይን ቫልት (Offline Access Vault)
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Local neural response caching
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setOfflineAccessEnabled(!offlineAccessEnabled);
                    if (onToggleOfflineAccess) onToggleOfflineAccess();
                  }}
                  className={`w-11 h-6 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                    offlineAccessEnabled ? 'bg-emerald-600 justify-end' : 'bg-stone-300 justify-start'
                  }`}
                >
                  <div className="bg-white w-5 h-5 rounded-full shadow-md" />
                </button>
              </div>

              {/* Item 3c: Sound & Voice Audio Switch */}
              <div className="p-3.5 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                    <Volume2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      ድምጽን ጽልዋን (Sound & Audio FX)
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Interactive UX audio feedback
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSoundEffectsEnabled(!soundEffectsEnabled)}
                  className={`w-11 h-6 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                    soundEffectsEnabled ? 'bg-purple-600 justify-end' : 'bg-stone-300 justify-start'
                  }`}
                >
                  <div className="bg-white w-5 h-5 rounded-full shadow-md" />
                </button>
              </div>

              {/* Item 3c.1: Accessibility & Gesture Haptic Feedback */}
              <HapticAccessibilitySettings variant="light" onStatusToast={showToast} />

              {/* Item 3c.2: Ambient Sound & Traditional Tigray Instruments (Masinko / Kirar) */}
              <div className="p-3.5 space-y-3 bg-gradient-to-r from-amber-50/50 via-stone-50/50 to-amber-50/30 border-y border-amber-200/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                      isAmbientPlaying 
                        ? 'bg-gradient-to-tr from-[#8E6D28] to-[#C5A059] text-black shadow-md shadow-amber-500/20' 
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      <Music className={`w-4 h-4 ${isAmbientPlaying ? 'animate-pulse' : ''}`} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 flex items-center space-x-2">
                        <span>ባህላዊ ናይ ድምጺ ጽልዋ (Ambient Sound)</span>
                        {isAmbientPlaying && (
                          <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 bg-amber-500 text-black text-[9px] font-black rounded-full uppercase tracking-wider animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-black inline-block animate-ping" />
                            <span>PLAYING</span>
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Soft, looping background traditional instruments (Masinko & Kirar)
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleToggleAmbient}
                    className={`w-11 h-6 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                      isAmbientPlaying ? 'bg-[#8E6D28] justify-end' : 'bg-stone-300 justify-start'
                    }`}
                    title={isAmbientPlaying ? 'Turn off ambient sound' : 'Turn on traditional ambient sound'}
                  >
                    <div className="bg-white w-5 h-5 rounded-full shadow-md" />
                  </button>
                </div>

                {/* Expanded Ambient Sound Controls when Active or Configured */}
                {isAmbientPlaying && (
                  <div className="mt-2.5 pt-3 border-t border-amber-200/60 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                    
                    {/* Live Equalizer Visualizer & Mode Badge */}
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-[10px] uppercase font-bold text-amber-900 tracking-wider">
                          Pentatonic Mode:
                        </span>
                        <span className="text-[10px] font-bold font-mono px-2 py-0.5 bg-amber-200/80 text-amber-950 rounded-md border border-amber-400/40 uppercase">
                          {ambientCurrentMode} (ትዝታ/ባቲ)
                        </span>
                      </div>

                      {/* Live 5-bar dancing sound visualizer */}
                      <div className="flex items-end space-x-1 h-3.5">
                        <span className="w-1 bg-amber-600 rounded-full animate-bounce [animation-delay:-0.3s] h-3" />
                        <span className="w-1 bg-amber-500 rounded-full animate-bounce [animation-delay:-0.15s] h-2" />
                        <span className="w-1 bg-amber-700 rounded-full animate-bounce [animation-delay:-0.45s] h-3.5" />
                        <span className="w-1 bg-amber-500 rounded-full animate-bounce [animation-delay:-0.2s] h-2.5" />
                        <span className="w-1 bg-amber-600 rounded-full animate-bounce [animation-delay:-0.35s] h-3" />
                      </div>
                    </div>

                    {/* Volume Slider with Real-time Continuation */}
                    <div className="bg-white/80 p-2.5 rounded-xl border border-amber-200 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700 flex items-center space-x-1.5">
                          {currentVolume === 0 ? (
                            <VolumeX className="w-3.5 h-3.5 text-stone-400" />
                          ) : currentVolume < 0.5 ? (
                            <Volume1 className="w-3.5 h-3.5 text-amber-700" />
                          ) : (
                            <Volume2 className="w-3.5 h-3.5 text-amber-700" />
                          )}
                          <span>መጠን ድምጺ (Volume Level)</span>
                        </span>
                        <span className="font-mono font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded text-[11px] border border-amber-300">
                          {Math.round(currentVolume * 100)}%
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={currentVolume}
                          onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                          className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-[#8E6D28]"
                        />
                      </div>

                      {/* Quick Volume Preset Buttons */}
                      <div className="flex items-center justify-between gap-1 pt-1">
                        {[
                          { label: 'Soft (20%)', val: 0.20 },
                          { label: 'Relaxed (35%)', val: 0.35 },
                          { label: 'Rich (60%)', val: 0.60 },
                          { label: 'Full (80%)', val: 0.80 },
                        ].map((preset) => (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => handleVolumeChange(preset.val)}
                            className={`flex-1 py-1 px-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                              Math.abs(currentVolume - preset.val) < 0.05
                                ? 'bg-[#8E6D28] text-white shadow-sm'
                                : 'bg-stone-100 hover:bg-amber-100 text-stone-700 border border-stone-200'
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Traditional Tigray Instrument Selection */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block">
                        ባህላዊ መሳርሒታት ምረጹ (Select Instrument):
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                        {[
                          { id: 'masinko', nameTi: 'ማሲንቆ', nameEn: 'Masinko (Bowed)', icon: '🎻', desc: 'Bowed 1-string lute' },
                          { id: 'kirar', nameTi: 'ክራር', nameEn: 'Kirar (Plucked)', icon: '🪕', desc: '5/6-string lyre' },
                          { id: 'washint', nameTi: 'ዋሽንት', nameEn: 'Washint (Flute)', icon: '🪈', desc: 'Bamboo breath flute' },
                          { id: 'ensemble', nameTi: 'ሕውስዋስ', nameEn: 'Axum Ensemble', icon: '✨', desc: 'Kirar & Masinko blend' },
                        ].map((inst) => {
                          const isSelected = selectedInstrument === inst.id;
                          return (
                            <button
                              key={inst.id}
                              type="button"
                              onClick={() => handleInstrumentSelect(inst.id as TraditionalInstrument)}
                              className={`p-2 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                                isSelected
                                  ? 'bg-[#1F190D] text-amber-200 border-[#8E6D28] shadow-sm ring-1 ring-[#8E6D28]'
                                  : 'bg-white/80 hover:bg-amber-50 text-slate-800 border-stone-200 hover:border-amber-300'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-sm">{inst.icon}</span>
                                {isSelected && (
                                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                                )}
                              </div>
                              <div className="mt-1">
                                <div className="text-xs font-bold font-serif">{inst.nameTi}</div>
                                <div className="text-[9.5px] opacity-75 truncate">{inst.nameEn}</div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                  </div>
                )}
              </div>

              {/* Item 3c.3: AI Voice Persona Selection (Ancient Historian, Modern Advisor, Technical Consultant, etc.) */}
              <div className="p-3.5 space-y-3 bg-stone-50/70 border-b border-amber-200/40">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#D4AF37] to-[#FFF3B0] text-black flex items-center justify-center shrink-0 shadow-sm">
                      <Mic className="w-4 h-4 text-black" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">
                        ናይ ድምጺ AI ፐርሶና (AI Voice Persona)
                      </div>
                      <div className="text-[11px] text-slate-600 truncate">
                        {getVoicePersona(voicePersona).name}
                        <span className="mx-1.5 text-slate-400" aria-hidden="true">·</span>
                        <span>{getVoicePersona(voicePersona).tagline}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsVoicePersonaSectionOpen(!isVoicePersonaSectionOpen)}
                    className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-amber-100 transition-colors cursor-pointer shrink-0"
                    title={isVoicePersonaSectionOpen ? "Collapse Voice Personas" : "Expand Voice Personas"}
                  >
                    {isVoicePersonaSectionOpen ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Collapsible Voice Persona Cards Grid & Tuner */}
                {isVoicePersonaSectionOpen && (
                  <div className="pt-3 border-t border-amber-200/50 animate-in fade-in slide-in-from-top-1 duration-200">
                    <VoicePersonaSelector
                      selectedPersonaId={voicePersona}
                      pitchMultiplier={voicePersonaPitch}
                      rateMultiplier={voicePersonaRate}
                      onSelectPersona={(newId) => {
                        setVoicePersona(newId);
                        saveVoicePersonaSettings({
                          personaId: newId,
                          pitchMultiplier: voicePersonaPitch,
                          rateMultiplier: voicePersonaRate,
                        });
                        onUpdateUser({
                          voicePersona: newId,
                          voicePersonaPitch,
                          voicePersonaRate,
                        });
                        showToast(`AI Voice Persona set to ${getVoicePersona(newId).name}`);
                      }}
                      onChangeTuning={({ pitchMultiplier, rateMultiplier }) => {
                        setVoicePersonaPitch(pitchMultiplier);
                        setVoicePersonaRate(rateMultiplier);
                        onUpdateUser({
                          voicePersona,
                          voicePersonaPitch: pitchMultiplier,
                          voicePersonaRate: rateMultiplier,
                        });
                      }}
                      theme="light"
                    />
                  </div>
                )}
              </div>

              {/* Item 3d: Cloud Auto-Backup Switch */}
              <div className="p-3.5 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Cloud className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                      <span>ቀጥታዊ ናይ ደመና ዕቋር (Cloud Auto-Sync)</span>
                      <span className="text-[9px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.2 rounded font-mono">FIRESTORE</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Sync profile & preferences to Firestore
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setAutoBackupEnabled(!autoBackupEnabled)}
                  className={`w-11 h-6 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                    autoBackupEnabled ? 'bg-blue-600 justify-end' : 'bg-stone-300 justify-start'
                  }`}
                >
                  <div className="bg-white w-5 h-5 rounded-full shadow-md" />
                </button>
              </div>

              {/* Item 3: Admin & Operations Management Suite */}
              {onOpenManagement && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenManagement('users');
                  }}
                  className="w-full p-3.5 flex items-center justify-between hover:bg-amber-50/60 transition-colors text-left cursor-pointer bg-gradient-to-r from-amber-50/30 to-transparent"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 border border-amber-300">
                      <Sparkles className="w-4 h-4 text-amber-700" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                        <span>ምሕደራ (Management Suite)</span>
                        <span className="text-[9px] bg-amber-600 text-white font-bold px-1.5 py-0.2 rounded">ADMIN</span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        User, Payment & Customer Management
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-stone-400" />
                </button>
              )}

              {/* Item 4: Storage Manager */}
              <div className="p-3.5 flex items-center justify-between hover:bg-stone-50 transition-colors">
                <div 
                  onClick={() => setActiveSubModal('storage')}
                  className="flex items-center space-x-3 cursor-pointer flex-1"
                >
                  <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                    <HardDrive className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                      <span>ዕቋርን ኣሴትን (Asset & Storage)</span>
                      <span className="text-[9.5px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded font-mono">
                        {totalReclaimableKb} KB
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Chat Cache: {chatCacheSizeKb} KB • Vision: {visionCacheSizeKb} KB
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5 ml-2">
                  <button
                    type="button"
                    title="Wipe offline-stored chat history and local metadata"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClearCache();
                    }}
                    disabled={isClearingCache}
                    className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-bold text-[11px] rounded-lg shadow-sm flex items-center space-x-1 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isClearingCache ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Eraser className="w-3.5 h-3.5" />
                    )}
                    <span>Clear Cache</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveSubModal('storage')}
                    className="p-1 hover:bg-stone-200/60 rounded-lg text-stone-400 hover:text-stone-600 transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Item 5: Security Settings & App Lock Tab */}
              <div className="p-3.5 flex items-center justify-between hover:bg-stone-50 transition-colors border-t border-stone-100">
                <div 
                  onClick={() => setActiveSubModal('security-settings')}
                  className="flex items-center space-x-3 cursor-pointer flex-1"
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                    appLockEnabled ? 'bg-emerald-50 text-emerald-600' : 'bg-stone-100 text-stone-500'
                  }`}>
                    {appLockEnabled ? <Lock className="w-4 h-4 text-emerald-600" /> : <Unlock className="w-4 h-4 text-stone-500" />}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 flex items-center space-x-2">
                      <span>ቅጥዕታት ድሕንነትን መዕጸዊ ኣፕን (Security Settings)</span>
                      <span className={`text-[9.5px] px-1.5 py-0.2 rounded font-mono font-bold ${
                        appLockEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-600'
                      }`}>
                        {appLockEnabled ? '🔒 LOCK ON' : '🔓 OFF'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Biometric Authentication • {biometricType === 'fingerprint' ? 'Fingerprint' : biometricType === 'face' ? 'Face ID' : 'Fingerprint & Face'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-2">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={appLockEnabled}
                    onClick={(e) => {
                      e.stopPropagation();
                      const next = !appLockEnabled;
                      setAppLockEnabled(next);
                      showToast(next ? 'ናይ ኣፕ መዕጸዊ ተወሊዑ ኣሎ (App Lock enabled)' : 'ናይ ኣፕ መዕጸዊ ጠፊኡ ኣሎ (App Lock disabled)');
                    }}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                      appLockEnabled ? 'bg-emerald-600' : 'bg-stone-300'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                        appLockEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveSubModal('security-settings')}
                    className="p-1 hover:bg-stone-200/60 rounded-lg text-stone-400 hover:text-stone-600 transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Item 6: Security Center & Vault */}
              <button
                type="button"
                onClick={() => {
                  if (onOpenSecurityModal) onOpenSecurityModal();
                  else setActiveSubModal('security-settings');
                }}
                className="w-full p-3.5 flex items-center justify-between hover:bg-stone-50 transition-colors text-left cursor-pointer border-t border-stone-100"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      ደሕንነትን ቫልትን (Hardware Vault & PIN)
                    </div>
                    <div className="text-[11px] text-slate-400">
                      AES-256 GCM KeyStore & Panic Wipe
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-stone-400" />
              </button>

            </div>
            )}
          </div>

          {/* Section 2: SUPPORT & MORE (Screenshot 1) */}
          <div className="space-y-1.5 pt-1">
            <div 
              onClick={() => setIsSupportSectionOpen(!isSupportSectionOpen)}
              className="flex items-center justify-between px-1 py-1 cursor-pointer select-none group"
            >
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1.5 group-hover:text-slate-800 transition-colors">
                <span>ሓገዝን ካልእን (SUPPORT & MORE)</span>
                <span className="text-[9.5px] px-1.5 py-0.2 bg-stone-100 text-stone-600 rounded-full font-mono font-bold">
                  {isSupportSectionOpen ? '5 items' : 'Collapsed'}
                </span>
              </div>
              <button
                type="button"
                className="p-1 rounded-md text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-all"
                title={isSupportSectionOpen ? 'Minimize section' : 'Expand section'}
              >
                {isSupportSectionOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {isSupportSectionOpen && (
            <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs divide-y divide-stone-100 overflow-hidden animate-in fade-in duration-200">
              
              {/* Item 0: About Axumite AI detailed modal launcher */}
              <button
                type="button"
                onClick={() => setActiveSubModal('about')}
                className="w-full p-3.5 flex items-center justify-between hover:bg-amber-50/60 transition-colors text-left cursor-pointer bg-gradient-to-r from-amber-50/30 to-transparent"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center shrink-0 shadow-xs">
                    <Landmark className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                      <span>ብዛዕባ ኣክሱማይት AI (About Axumite AI)</span>
                      <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded border border-amber-300 font-mono">
                        MISSION & GALLERY
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Civilization mission, monuments & AI art studio
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-stone-400" />
              </button>

              {/* 1. Share App */}
              <button
                type="button"
                onClick={handleShareApp}
                className="w-full p-3.5 flex items-center justify-between hover:bg-stone-50 transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <Share2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      ኣካፍል (Share App)
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Invite friends & family
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-stone-400" />
              </button>

              {/* 2. Rate Us */}
              <button
                type="button"
                onClick={() => setActiveSubModal('rate')}
                className="w-full p-3.5 flex items-center justify-between hover:bg-stone-50 transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-pink-50 text-pink-500 flex items-center justify-center shrink-0">
                    <Star className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      ገምግም (Rate Us)
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Leave a review on the store
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-stone-400" />
              </button>

              {/* 3. Support & FAQ */}
              <button
                type="button"
                onClick={() => setActiveSubModal('faq')}
                className="w-full p-3.5 flex items-center justify-between hover:bg-stone-50 transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-500 flex items-center justify-center shrink-0">
                    <HelpCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      ሓገዝ (Support & FAQ)
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Get help with the app
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-stone-400" />
              </button>

              {/* 4. Privacy Policy */}
              <button
                type="button"
                onClick={() => setActiveSubModal('privacy')}
                className="w-full p-3.5 flex items-center justify-between hover:bg-stone-50 transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      ፖሊሲ ብሕትውና (Privacy Policy)
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-stone-400" />
              </button>

              {/* 5. Terms of Service */}
              <button
                type="button"
                onClick={() => setActiveSubModal('terms')}
                className="w-full p-3.5 flex items-center justify-between hover:bg-stone-50 transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      ውዕል ኣገልግሎት (Terms of Service)
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-stone-400" />
              </button>

            </div>
            )}
          </div>

        </div>

        {/* Bottom Actions: Log in/Log out button & Version text (Screenshot 1) */}
        <div className="pt-4 space-y-4">
          <button
            type="button"
            onClick={async () => {
              const isAuthenticatedMember =
                Boolean(user.isLoggedIn) &&
                Boolean(user.email) &&
                user.email.trim().toLowerCase() !== 'guest@axumite.ai';

              if (!isAuthenticatedMember && onOpenAuthModal) {
                onClose();
                onOpenAuthModal('login');
              } else {
                await logoutFromFirebase();
                onUpdateUser({ 
                  isLoggedIn: false,
                  authUid: undefined,
                  id: 'usr_guest_001',
                  name: 'ጋሻ (Guest User)',
                  email: 'guest@axumite.ai',
                  role: 'Guest',
                  isEmailVerified: false,
                  isPhoneVerified: false,
                });
                showToast('Signed out of Firebase Session');
                onClose();
                if (onOpenAuthModal) {
                  onOpenAuthModal('login');
                }
              }
            }}
            className="w-full py-3.5 px-4 bg-white hover:bg-blue-50 border border-blue-200 text-blue-600 font-bold text-sm rounded-2xl shadow-sm flex items-center justify-center space-x-2 transition-all cursor-pointer active:scale-[0.98]"
          >
            {user.isLoggedIn && user.email?.trim().toLowerCase() !== 'guest@axumite.ai' ? (
              <>
                <LogOut className="w-4 h-4" />
                <span>ውጻእ (Log Out)</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>እቶ / ተመዝገብ (Log In)</span>
              </>
            )}
          </button>

          <div className="text-center text-[11px] text-stone-400 font-mono">
            ኣክሱማይት AI v1.0.0
          </div>
        </div>

      </div>

      {/* ================= SUB MODAL DIALOGS ================= */}
      {activeSubModal !== 'none' && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div 
            onClick={(e) => e.stopPropagation()}
            className={`bg-white rounded-3xl p-6 w-full ${activeSubModal === 'about' ? 'max-w-3xl' : 'max-w-md'} space-y-4 shadow-2xl relative text-slate-800 animate-slide-up`}
          >
            <button
              onClick={() => setActiveSubModal('none')}
              className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 p-1 cursor-pointer z-10 bg-stone-100 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Sub-Modal: Avatar Picker & Firebase Storage Upload */}
            {activeSubModal === 'avatar-picker' && (
              <div className="space-y-4 max-h-[85vh] overflow-y-auto pr-1">
                {/* Header */}
                <div className="flex items-center space-x-3 text-slate-900 font-serif pb-3 border-b border-stone-200">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-md shrink-0">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 leading-tight">
                      ናይ ፕሮፋይል ስእሊ ቀይር
                    </h3>
                    <p className="text-[11px] text-slate-500 font-sans font-medium">
                      Upload Profile Picture & Cultural Avatars (Available to All Users)
                    </p>
                  </div>
                </div>

                {/* Current Avatar Preview Card */}
                <div className="bg-slate-900 text-white p-4 rounded-2xl flex items-center space-x-4 border border-slate-800 shadow-md">
                  <div className="relative w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-2xl font-bold font-serif overflow-hidden shrink-0 border-2 border-amber-400/80 shadow-inner">
                    {isAvatarImageUrl(user.avatar) ? (
                      <img 
                        src={user.avatar} 
                        alt={user.name} 
                        className="w-full h-full object-cover rounded-full"
                        referrerPolicy="no-referrer"
                      />
                    ) : user.avatar && user.avatar.length <= 4 && user.avatar !== 'axumite-star' ? (
                      <span>{user.avatar}</span>
                    ) : (
                      <span>{user.name ? user.name.charAt(0) : 'ክ'}</span>
                    )}

                    {isUploadingAvatar && (
                      <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-10">
                        <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-white truncate font-serif">
                      {user.name || 'ክቡር ዓሚል'}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {user.email || 'Guest User (ጋሻ)'}
                    </div>
                    <div className="text-[10px] text-amber-400 font-semibold mt-0.5">
                      {isAvatarImageUrl(user.avatar) ? '📷 ብሕታዊ ስእሊ (Custom Photo)' : `✨ ምልክት፡ ${user.avatar || 'ክ'}`}
                    </div>
                  </div>
                </div>

                {/* Section 1: Upload from Device (Firebase Storage) */}
                <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-2xl space-y-2.5">
                  <div className="flex items-center space-x-2 text-blue-900 font-bold text-xs">
                    <Upload className="w-4 h-4 text-blue-600" />
                    <span>ካብ ሞባይል / ኮምፒተር ስእሊ ምረጽ (Upload from Device)</span>
                  </div>
                  <p className="text-[11px] text-blue-800/80 leading-relaxed">
                    ካብ ጋለሪኹም ወይ ካሜራኹም ስእሊ ብምምራጽ ቀጥታ ናብ Firebase Storage ኣዕርጉ። ንኹሎም ተጠቀምቲ ፍቑድ እዩ።
                  </p>
                  <button
                    type="button"
                    onClick={() => avatarFileInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer active:scale-98 disabled:opacity-50"
                  >
                    {isUploadingAvatar ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>ስእሊ ይጸዓን ኣሎ... (Uploading...)</span>
                      </>
                    ) : (
                      <>
                        <Camera className="w-4 h-4 text-white" />
                        <span>ስእሊ ምረጽ (Choose Image File)</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Section 2: Cultural & Sovereign Presets */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      <span>ናይ ስልጣነን ታሪክን ምልክታት (Cultural Emblems)</span>
                    </span>
                    <span className="text-[10px] text-slate-400">12 Presets</span>
                  </div>

                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {[
                      { icon: '👑', label: 'ልዑል ንጉስ' },
                      { icon: '🦁', label: 'ኣንበሳ' },
                      { icon: '🏛️', label: 'ሃውልቲ ኣክሱም' },
                      { icon: '🦅', label: 'ንስሪ' },
                      { icon: '📜', label: 'ብራና' },
                      { icon: '🛡️', label: 'ዋላ ሓርነት' },
                      { icon: '🌟', label: 'ኮኸብ' },
                      { icon: '💎', label: 'ዕንቊ' },
                      { icon: '☕', label: 'ጀበና' },
                      { icon: '⚡', label: 'በርቂ AI' },
                      { icon: '🎓', label: 'ምሁር' },
                      { icon: '🕊️', label: 'ሰላም' },
                    ].map((item) => {
                      const isSelected = user.avatar === item.icon;
                      return (
                        <button
                          key={item.icon}
                          type="button"
                          onClick={() => handleSelectPresetAvatar(item.icon)}
                          disabled={isUploadingAvatar}
                          className={`p-2 rounded-xl flex flex-col items-center justify-center space-y-1 transition-all cursor-pointer ${
                            isSelected 
                              ? 'bg-amber-500/20 border-2 border-amber-500 shadow-sm scale-105' 
                              : 'bg-stone-50 border border-stone-200 hover:bg-stone-100'
                          }`}
                        >
                          <span className="text-2xl">{item.icon}</span>
                          <span className="text-[9px] font-bold text-slate-700 truncate w-full text-center">
                            {item.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Section 3: Web Image URL Input */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-xs font-bold text-slate-800 flex items-center space-x-1">
                    <ImageIcon className="w-3.5 h-3.5 text-slate-600" />
                    <span>ናይ ኦንላይን ስእሊ ሊንክ (Online Image URL)</span>
                  </span>
                  <div className="flex items-center space-x-2">
                    <input
                      type="url"
                      placeholder="https://example.com/avatar.jpg"
                      value={customAvatarUrlInput}
                      onChange={(e) => setCustomAvatarUrlInput(e.target.value)}
                      className="flex-1 px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={handleSaveCustomImageUrl}
                      disabled={!customAvatarUrlInput.trim() || isUploadingAvatar}
                      className="px-3.5 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all disabled:opacity-40 cursor-pointer"
                    >
                      ተግብር
                    </button>
                  </div>
                </div>

                {/* Section 4: Display Name Quick Edit */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-xs font-bold text-slate-800 flex items-center space-x-1">
                    <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                    <span>ስም ፕሮፋይል ቀይር (Display Name)</span>
                  </span>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      defaultValue={user.name || ''}
                      placeholder="ስምኩም ኣእትዉ"
                      id="display_name_submodal_input"
                      className="flex-1 px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const elem = document.getElementById('display_name_submodal_input') as HTMLInputElement;
                        if (elem && elem.value.trim()) {
                          onUpdateUser({ name: elem.value.trim() });
                          if (user.email) {
                            syncUserProfileToFirestore({ ...user, name: elem.value.trim() });
                          }
                          showToast(`ስም ተቐይሩ፡ ${elem.value.trim()}`);
                        }
                      }}
                      className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl transition-all cursor-pointer"
                    >
                      ኣዕርቕ
                    </button>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center space-x-2 pt-3 border-t border-stone-200">
                  <button
                    type="button"
                    onClick={handleResetAvatar}
                    className="py-2.5 px-3 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl transition-all flex items-center space-x-1 cursor-pointer"
                  >
                    <Trash className="w-3.5 h-3.5" />
                    <span>ናብ ቀደሙ</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSubModal('none')}
                    className="flex-1 py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    ተወዲኡ (Done)
                  </button>
                </div>
              </div>
            )}

            {/* Sub-Modal: About Axumite AI */}
            {activeSubModal === 'about' && (
              <div className="space-y-4 max-h-[85vh] overflow-y-auto pr-1">
                <div className="flex items-center space-x-3 text-slate-900 font-serif pb-3 border-b border-stone-200">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center shadow-md shrink-0 font-black">
                    <Landmark className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 leading-tight">
                      ብዛዕባ ኣክሱማይት AI (About Axumite AI)
                    </h3>
                    <p className="text-[11px] text-slate-500 font-sans font-medium">
                      Sovereign AI for Tigrinya, Ancient Horn African Civilization & Modern Intelligence
                    </p>
                  </div>
                </div>

                {/* Mission Card */}
                <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-950 p-4 rounded-2xl text-white space-y-2.5 shadow-md border border-amber-500/30">
                  <div className="flex items-center space-x-2 text-amber-400 font-bold text-xs">
                    <Sparkles className="w-4 h-4" />
                    <span>ተልእኾና (Our Sovereign Mission)</span>
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed">
                    ኣክሱማይት AI ንስልጣነ ኣክሱም፡ ቋንቋ ትግርኛ፡ ፊደላት ግእዝን ጥንታዊ ቅርስታት ትግራይን ምስ ዝለዓለ ናይ ዘመናዊ ኣርቲፊሻል ኢንተለጀንስ (AI) ዘዋህድ ልዑላዊ ፕላትፎርም እዩ።
                  </p>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="bg-white/5 border border-white/10 p-2.5 rounded-xl text-center">
                      <div className="text-[10px] text-slate-400">ፊደልን ቋንቋን</div>
                      <div className="text-xs font-black text-amber-300 font-mono">Ge'ez & Tigrinya</div>
                    </div>
                    <div className="bg-white/5 border border-white/10 p-2.5 rounded-xl text-center">
                      <div className="text-[10px] text-slate-400">ታሪኻዊ ቅርሲ</div>
                      <div className="text-xs font-black text-cyan-300 font-mono">Axum • Metera • Yeha</div>
                    </div>
                  </div>
                </div>

                {/* Heritage Carousel Component */}
                <div className="pt-1">
                  <HeritageGalleryCarousel
                    user={user}
                    onSaveInsight={onSaveInsight}
                    onOpenAuthModal={onOpenAuthModal}
                    onNavigateTab={(tab) => {
                      setActiveSubModal('none');
                      onClose();
                      if (onNavigateTab) onNavigateTab(tab);
                    }}
                  />
                </div>

                <button
                  onClick={() => setActiveSubModal('none')}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  ዕጾ (Close)
                </button>
              </div>
            )}

            {/* Sub-Modal: Theme Customization (High-Contrast & Soft Ambient Gold) */}
            {(activeSubModal === 'theme-customization' || activeSubModal === 'branding') && (
              <div className="space-y-4 max-h-[82vh] overflow-y-auto pr-1">
                {/* Header */}
                <div className="flex items-center space-x-2.5 text-slate-900 font-black text-lg font-serif">
                  <div 
                    className="w-9 h-9 rounded-xl flex items-center justify-center shadow-xs shrink-0"
                    style={{ backgroundColor: goldAccentColor, color: '#0F172A' }}
                  >
                    <Palette className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 leading-tight">
                      ምምዕርራይ ቅዲ (Theme Customization)
                    </h3>
                    <p className="text-[10.5px] text-slate-500 font-sans font-medium">
                      High-Contrast vs Soft Ambient Gold Schemes • Firestore Synced
                    </p>
                  </div>
                </div>

                {/* Firestore Cloud Sync Status Card */}
                <div className="bg-gradient-to-r from-amber-500/10 via-amber-50 to-blue-500/10 p-3 rounded-2xl border border-amber-200/80 flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-7 h-7 rounded-lg bg-white shadow-xs border border-amber-200 flex items-center justify-center text-amber-600">
                      <Cloud className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[11px] font-bold text-slate-900 flex items-center space-x-1.5">
                        <span>Firestore Profile Sync</span>
                        <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono truncate max-w-[200px]">
                        {user.email || 'Local User Profile'}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    {saveStatus === 'saving' || isSavingToFirestore ? (
                      <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-full animate-pulse">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Saving...</span>
                      </span>
                    ) : saveStatus === 'saved' || firestoreSyncSuccess ? (
                      <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full transition-all">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Saved</span>
                      </span>
                    ) : (
                      <span className="text-[9.5px] font-semibold text-slate-500 bg-white/80 border border-slate-200 px-2 py-0.5 rounded-full">
                        Auto-Synced
                      </span>
                    )}
                  </div>
                </div>

                {/* Time-of-Day Adaptive Theme (Sunrise / Sunset Auto-Transition) */}
                <TimeOfDayThemeSettings variant="light" />

                {/* Primary Theme Scheme Selection Cards */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>ምርጫ ሕብሪ ቅዲ (UI Color Scheme Selection)</span>
                    </label>
                    <span className="text-[10px] font-bold text-amber-600 uppercase font-mono">
                      {branding.themeScheme || 'balanced-gold'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5">
                    {/* Option 1: High-Contrast Gold */}
                    <button
                      type="button"
                      onClick={() => handleApplyAndPersistTheme('high-contrast-gold')}
                      className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden cursor-pointer ${
                        branding.themeScheme === 'high-contrast-gold'
                          ? 'border-amber-500 shadow-md ring-2 ring-amber-400/50 bg-gradient-to-br from-amber-50 via-white to-amber-100/30'
                          : 'border-slate-200 bg-white hover:border-amber-300 hover:bg-amber-50/20'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-8 h-8 rounded-xl bg-slate-900 border-2 border-amber-400 flex items-center justify-center text-amber-300 shadow-sm">
                            <Zap className="w-4 h-4 fill-amber-400 text-amber-400" />
                          </div>
                          <div>
                            <div className="text-xs font-black text-slate-900 flex items-center space-x-1.5">
                              <span>⚡ ዝለዓለ ፍልልይ ወርቂ (High-Contrast Gold)</span>
                            </div>
                            <div className="text-[10px] text-amber-700 font-bold uppercase tracking-wider">
                              Maximum Clarity • Pure 24K Glow
                            </div>
                          </div>
                        </div>

                        {branding.themeScheme === 'high-contrast-gold' ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black flex items-center space-x-1 shadow-xs">
                            <Check className="w-3 h-3 stroke-[3]" />
                            <span>ተመሪጹ</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-slate-400 px-2 py-0.5 rounded-full border border-slate-200">
                            ይምረጹ
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-600 font-normal mt-2 leading-relaxed">
                        Pure 24K imperial gold accents (<span className="font-mono text-amber-600 font-bold">#FFD700</span>) paired with obsidian contrast and radiant borders. Engineered for bright environments, maximum legibility, and high-focus research.
                      </p>

                      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100">
                        <div className="flex items-center space-x-1.5">
                          <div className="w-3.5 h-3.5 rounded-full bg-[#FFD700] border border-white shadow-xs" title="24K Gold" />
                          <div className="w-3.5 h-3.5 rounded-full bg-[#FFE55C] border border-white shadow-xs" title="Gold Glow" />
                          <div className="w-3.5 h-3.5 rounded-full bg-[#0A0F1D] border border-white shadow-xs" title="Obsidian Canvas" />
                          <div className="w-3.5 h-3.5 rounded-full bg-[#F59E0B] border border-white shadow-xs" title="Amber Accent" />
                        </div>
                        <span className="text-[9.5px] font-black text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-md font-mono">
                          14.8:1 AAA Clarity
                        </span>
                      </div>
                    </button>

                    {/* Option 2: Soft Ambient Gold */}
                    <button
                      type="button"
                      onClick={() => handleApplyAndPersistTheme('soft-ambient-gold')}
                      className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden cursor-pointer ${
                        branding.themeScheme === 'soft-ambient-gold'
                          ? 'border-amber-400 shadow-md ring-2 ring-amber-300/50 bg-gradient-to-br from-amber-50/70 via-white to-stone-100/50'
                          : 'border-slate-200 bg-white hover:border-amber-300 hover:bg-amber-50/20'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-8 h-8 rounded-xl bg-slate-800 border-2 border-amber-300/80 flex items-center justify-center text-amber-200 shadow-sm">
                            <Moon className="w-4 h-4 fill-amber-200 text-amber-200" />
                          </div>
                          <div>
                            <div className="text-xs font-black text-slate-900 flex items-center space-x-1.5">
                              <span>🌙 ልዙብ ከባቢ ወርቂ (Soft Ambient Gold)</span>
                            </div>
                            <div className="text-[10px] text-amber-800 font-bold uppercase tracking-wider">
                              Warm & Relaxed Atmosphere • Eye-Safe
                            </div>
                          </div>
                        </div>

                        {branding.themeScheme === 'soft-ambient-gold' ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black flex items-center space-x-1 shadow-xs">
                            <Check className="w-3 h-3 stroke-[3]" />
                            <span>ተመሪጹ</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-slate-400 px-2 py-0.5 rounded-full border border-slate-200">
                            ይምረጹ
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-600 font-normal mt-2 leading-relaxed">
                        Subtle champagne gold sheen (<span className="font-mono text-amber-600 font-bold">#D1B26F</span>) with soft warm ambient illumination. Reduces eye strain during extended nighttime reading and evening study sessions.
                      </p>

                      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100">
                        <div className="flex items-center space-x-1.5">
                          <div className="w-3.5 h-3.5 rounded-full bg-[#D1B26F] border border-white shadow-xs" title="Champagne Gold" />
                          <div className="w-3.5 h-3.5 rounded-full bg-[#C5A059] border border-white shadow-xs" title="Muted Gold" />
                          <div className="w-3.5 h-3.5 rounded-full bg-[#071630] border border-white shadow-xs" title="Night Navy" />
                          <div className="w-3.5 h-3.5 rounded-full bg-[#F3E5AB] border border-white shadow-xs" title="Warm Cream" />
                        </div>
                        <span className="text-[9.5px] font-black text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-md font-mono">
                          8.5:1 AA Eye-Safe
                        </span>
                      </div>
                    </button>

                    {/* Option 3: Balanced Sovereign Gold */}
                    <button
                      type="button"
                      onClick={() => handleApplyAndPersistTheme('balanced-gold')}
                      className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden cursor-pointer ${
                        branding.themeScheme === 'balanced-gold'
                          ? 'border-amber-400 shadow-md ring-2 ring-amber-300/40 bg-amber-50/50'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-7 h-7 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700">
                            <Sparkle className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900">
                              👑 ሚዛናዊ ንግሳዊ ወርቂ (Balanced Royal Axum)
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Standard sovereign 24K gold balance
                            </div>
                          </div>
                        </div>

                        {branding.themeScheme === 'balanced-gold' && (
                          <Check className="w-4 h-4 text-amber-600 font-black" />
                        )}
                      </div>
                    </button>
                  </div>
                </div>

                {/* Live Branded Component Preview */}
                <div className="space-y-1.5 pt-1">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>ቀጥታዊ ናይ ምርኢት መርኣያ (Live Preview)</span>
                    <span className="text-amber-600 font-mono text-[9px] font-bold">
                      {branding.themeScheme === 'high-contrast-gold' ? 'HIGH CONTRAST MODE' : 'SOFT AMBIENT MODE'}
                    </span>
                  </div>
                  <div 
                    className="p-4 rounded-2xl text-white space-y-3 relative overflow-hidden shadow-lg border"
                    style={{ 
                      backgroundColor: themeHueColor,
                      borderColor: branding.themeScheme === 'high-contrast-gold' ? '#FFD700' : '#D1B26F40'
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-3 h-3 rounded-full animate-pulse"
                          style={{ backgroundColor: goldAccentColor }}
                        />
                        <span className="text-xs font-black tracking-wide font-serif">
                          AXUMITE SOVEREIGN AI
                        </span>
                      </div>
                      <span 
                        className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase"
                        style={{ backgroundColor: goldAccentColor, color: '#0F172A' }}
                      >
                        {branding.themeScheme || 'balanced'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-200 font-light leading-relaxed">
                      እዚ ናይ ሕብሪ ቅዲ ኣብ መላእ ፕላትፎርም፡ ቻት፡ ትርጉምን ባጆችን ብቐጻልነት ክትግበር እዩ።
                    </p>

                    <button
                      type="button"
                      onClick={() => handleApplyAndPersistTheme(branding.themeScheme || 'high-contrast-gold')}
                      className="w-full py-2.5 px-3 rounded-xl font-black text-xs shadow-md flex items-center justify-center space-x-2 transition-transform active:scale-95 cursor-pointer"
                      style={{ 
                        backgroundColor: goldAccentColor, 
                        color: '#0F172A',
                        boxShadow: `0 4px 14px ${goldAccentColor}50`
                      }}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>ናብ Firestore Profile ኣጽድቕ (Sync to Firestore)</span>
                    </button>
                  </div>
                </div>

                {/* Fine-Tuning Drawer / Sub-Controls */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                      <Sliders className="w-3.5 h-3.5 text-blue-600" />
                      <span>ዝርዝር መስተኻኸሊ (Fine-Tuning Controls)</span>
                    </label>
                  </div>

                  {/* Intensity Grid */}
                  <div className="space-y-1.5">
                    <div className="text-[10.5px] font-bold text-slate-700">
                      ጽዓት ወርቂ (Gold Intensity)
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {(['soft', 'balanced', 'rich', 'pure-axum'] as GoldIntensity[]).map((intensity) => {
                        const isSelected = branding.goldIntensity === intensity;
                        const pal = GOLD_PALETTE[intensity];
                        const labels: Record<GoldIntensity, { ti: string; en: string }> = {
                          soft: { ti: 'ልዙብ (Soft Sheen)', en: '60% Champagne' },
                          balanced: { ti: 'ሚዛናዊ (Balanced)', en: '100% 24K Royal' },
                          rich: { ti: 'ደማቕ (Rich Glow)', en: '140% Radiance' },
                          'pure-axum': { ti: 'ንጹህ ኣክሱም (Pure Axum)', en: '180% Ultra Gold' },
                        };

                        return (
                          <button
                            key={intensity}
                            type="button"
                            onClick={() => {
                              setGoldIntensity(intensity);
                              handleApplyAndPersistTheme(branding.themeScheme || 'high-contrast-gold', intensity);
                            }}
                            className={`p-2.5 rounded-2xl border text-left transition-all relative overflow-hidden cursor-pointer ${
                              isSelected 
                                ? 'border-amber-400 shadow-md ring-2 ring-amber-400/40 bg-amber-50/60' 
                                : 'border-slate-200 bg-white hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <div 
                                className="w-4.5 h-4.5 rounded-full shadow-inner border border-white"
                                style={{ 
                                  backgroundColor: pal.primary, 
                                  boxShadow: `0 0 8px ${pal.glow}` 
                                }}
                              />
                              {isSelected && (
                                <Check className="w-3.5 h-3.5 text-amber-600 font-black" />
                              )}
                            </div>
                            <div className="text-[11px] font-black text-slate-900 leading-tight">
                              {labels[intensity].ti}
                            </div>
                            <div className="text-[9px] text-slate-500 font-medium">
                              {labels[intensity].en}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* UI Theme Hue Selector */}
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[10.5px] font-bold text-slate-700">
                      ቀንዲ ሕብሪ ድሕረ-ባይታ (Background Theme Hue)
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {(Object.keys(THEME_HUE_PALETTE) as ThemeHue[]).map((hueKey) => {
                        const hue = THEME_HUE_PALETTE[hueKey];
                        const isSelected = branding.themeHue === hueKey;

                        return (
                          <button
                            key={hueKey}
                            type="button"
                            onClick={() => {
                              setThemeHue(hueKey);
                              handleApplyAndPersistTheme(branding.themeScheme || 'high-contrast-gold', branding.goldIntensity, hueKey);
                            }}
                            className={`p-2 rounded-xl border text-left transition-all flex items-center space-x-2 cursor-pointer ${
                              isSelected 
                                ? 'border-blue-500 shadow-md ring-2 ring-blue-500/30 bg-blue-50/40' 
                                : 'border-slate-200 bg-white hover:border-slate-300'
                            }`}
                          >
                            <div 
                              className="w-6 h-6 rounded-lg shadow-xs shrink-0 flex items-center justify-center text-white text-[9px] font-black"
                              style={{ backgroundColor: hue.primary }}
                            >
                              {isSelected ? '✓' : ''}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-[11px] font-bold text-slate-900 truncate">
                                {hue.nameTi}
                              </div>
                              <div className="text-[9px] text-slate-400 truncate">
                                {hue.nameEn}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Visual FX Toggles */}
                  <div className="space-y-2 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-slate-900">
                          ናይ ወርቂ ብልጭታ (Metallic Shimmer Effect)
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Dynamic animated metallic reflection on cards
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setGoldShimmerEffect(!branding.goldShimmerEffect)}
                        className={`w-10 h-5.5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                          branding.goldShimmerEffect ? 'bg-amber-500 justify-end' : 'bg-slate-300 justify-start'
                        }`}
                      >
                        <div className="bg-white w-4.5 h-4.5 rounded-full shadow-sm" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                      <div>
                        <div className="text-xs font-bold text-slate-900">
                          ብሩህ ደረት (Border Accent Glow)
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Radiant borders for high-contrast visibility
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setBorderGlow(!branding.borderGlow)}
                        className={`w-10 h-5.5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                          branding.borderGlow ? 'bg-amber-500 justify-end' : 'bg-slate-300 justify-start'
                        }`}
                      >
                        <div className="bg-white w-4.5 h-4.5 rounded-full shadow-sm" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      resetToDefaultBranding();
                      handleApplyAndPersistTheme('high-contrast-gold', 'pure-axum', 'royal-axum');
                      showToast('Reset to High-Contrast Gold');
                    }}
                    className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center space-x-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>ናብ ቀደሙ</span>
                  </button>

                  <button
                    type="button"
                    disabled={isSavingToFirestore}
                    onClick={async () => {
                      await handleApplyAndPersistTheme(branding.themeScheme || 'high-contrast-gold');
                      setActiveSubModal('none');
                    }}
                    className="flex-1 py-2.5 px-4 font-black text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center space-x-1.5 text-[#0F172A]"
                    style={{ 
                      backgroundColor: goldAccentColor 
                    }}
                  >
                    {isSavingToFirestore ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4 stroke-[3]" />
                    )}
                    <span>ኣጽድቕን ዕጾን (Save to Profile & Close)</span>
                  </button>
                </div>
              </div>
            )}

            {/* Sub-Modal 1: Storage Manager */}
            {activeSubModal === 'storage' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-amber-600 font-black text-lg font-serif">
                    <HardDrive className="w-5 h-5" />
                    <span>ዕቋርን ኣሴትን (Storage Manager)</span>
                  </div>
                  <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full font-mono">
                    {totalReclaimableKb} KB Total
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
                    <div className="text-stone-400 text-[10px]">Chat & Conversations</div>
                    <div className="font-bold text-slate-800">{chatCacheSizeKb} KB</div>
                    <div className="text-[9px] text-stone-400 mt-0.5">Offline history & transcripts</div>
                  </div>
                  <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
                    <div className="text-stone-400 text-[10px]">Vision & Prompts</div>
                    <div className="font-bold text-slate-800">{visionCacheSizeKb} KB</div>
                    <div className="text-[9px] text-stone-400 mt-0.5">Image queries & cache</div>
                  </div>
                  <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
                    <div className="text-stone-400 text-[10px]">Bookmarks / Saved</div>
                    <div className="font-bold text-slate-800">{savedInsightsSizeKb} KB</div>
                    <div className="text-[9px] text-stone-400 mt-0.5">Favorited translations</div>
                  </div>
                  <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
                    <div className="text-stone-400 text-[10px]">Metadata & Temp</div>
                    <div className="font-bold text-slate-800">{dependentDataSizeKb} KB</div>
                    <div className="text-[9px] text-stone-400 mt-0.5">Audio cache & UI state</div>
                  </div>
                </div>

                <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-900 space-y-1">
                  <div className="font-bold flex items-center space-x-1.5 text-amber-800">
                    <Info className="w-4 h-4" />
                    <span>ናይ መዝገብን ታሪክን ምጽራግ (Cache Management)</span>
                  </div>
                  <p className="text-[11px] text-amber-700 leading-relaxed">
                    Clear Cache will wipe offline-stored chat conversations, multimodal vision queries, and temporary local metadata to free up browser storage without altering your cloud profile.
                  </p>
                </div>

                <div className="space-y-2">
                  {/* Primary Clear Cache Button */}
                  <button
                    type="button"
                    onClick={handleClearCache}
                    disabled={isClearingCache}
                    className="w-full py-3 bg-amber-500 hover:bg-amber-600 active:scale-[0.99] text-slate-950 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isClearingCache ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Eraser className="w-4 h-4" />
                    )}
                    <span>ናይ ኦፍላይን ታሪክ ኣጽሪ (Clear Cache & Chat History)</span>
                  </button>

                  {/* Wipe All Storage Button */}
                  <button
                    type="button"
                    onClick={handleClearAllStorage}
                    disabled={isClearingAllStorage}
                    className="w-full py-2.5 bg-stone-100 hover:bg-rose-50 hover:text-rose-600 text-stone-600 border border-stone-200 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isClearingAllStorage ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    <span>ዕቋር ብምሉእ ኣጽሪ (Wipe All Storage - {totalReclaimableKb} KB)</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveSubModal('none')}
                  className="w-full py-2 bg-stone-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  ዕጾ (Close)
                </button>
              </div>
            )}

            {/* Sub-Modal 2: Privacy Policy */}
            {activeSubModal === 'privacy' && (
              <div className="space-y-3">
                <div className="flex items-center space-x-2 text-slate-900 font-black text-lg font-serif">
                  <Shield className="w-5 h-5 text-blue-600" />
                  <span>ፖሊሲ ብሕትውና (Privacy Policy)</span>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed max-h-60 overflow-y-auto pr-1">
                  AXUMITE AI App values your privacy above all. User chat transcripts, voice audio, and image prompts are processed through secured neural models and encrypted locally on your device. We do not sell your personal data or speech recordings. For your security, active sessions are protected with a 30-minute inactivity auto-logout shield to prevent unauthorized device access.
                </p>
                <button
                  onClick={() => setActiveSubModal('none')}
                  className="w-full py-2.5 bg-stone-900 text-white rounded-xl text-xs font-bold"
                >
                  ተረዲአዮ (Understood)
                </button>
              </div>
            )}

            {/* Sub-Modal 3: Terms of Service */}
            {activeSubModal === 'terms' && (
              <div className="space-y-3">
                <div className="flex items-center space-x-2 text-slate-900 font-black text-lg font-serif">
                  <FileText className="w-5 h-5 text-purple-600" />
                  <span>ውዕል ኣገልግሎት (Terms of Service)</span>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed max-h-60 overflow-y-auto pr-1">
                  By using the ኣክሱማይት AI platform, you agree to utilize natural language translation, conversational intelligence, and multimodal generative tools responsibly and in compliance with international digital ethics.
                </p>
                <button
                  onClick={() => setActiveSubModal('none')}
                  className="w-full py-2.5 bg-stone-900 text-white rounded-xl text-xs font-bold"
                >
                  ተረዲአዮ (Accept & Close)
                </button>
              </div>
            )}

            {/* Sub-Modal 4: Rate Us */}
            {activeSubModal === 'rate' && (
              <div className="space-y-3 text-center">
                <div className="w-12 h-12 rounded-full bg-pink-50 text-pink-500 mx-auto flex items-center justify-center">
                  <Star className="w-6 h-6 fill-pink-500" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                  ገምግም (Rate Us 5 Stars)
                </h3>
                <p className="text-xs text-stone-500">
                  ነዚ ኣፕ ብምግምጋም ንዕቤት ቋንቋ ትግርኛን ባህልናን ኣብ ዲጂታል ዓለም ደግፉ!
                </p>
                <div className="flex justify-center space-x-2 py-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        showToast(`Thanks for the ${s}-star rating!`);
                        setActiveSubModal('none');
                      }}
                      className="p-1 text-amber-400 hover:scale-125 transition-transform cursor-pointer"
                    >
                      <Star className="w-7 h-7 fill-amber-400" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Sub-Modal 5: Support & FAQ */}
            {activeSubModal === 'faq' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-sky-600 font-black text-lg font-serif">
                    <HelpCircle className="w-5 h-5" />
                    <span>ሓገዝ (Support & FAQ)</span>
                  </div>
                  <span className="text-[10px] bg-sky-100 text-sky-800 font-bold px-2 py-0.5 rounded-full font-mono">
                    4 Topics
                  </span>
                </div>
                
                <div className="text-xs text-stone-600 space-y-2 max-h-72 overflow-y-auto pr-1">
                  {[
                    {
                      q: 'ብድምጺ ከመይ ገይረ ይዛረብ? (How to use Voice & Live Assistant?)',
                      a: 'ኣብ Obelisk Chat ወይ Voice Commands ቀጥታዊ ናይ ማይክራፎን ምልክት ጠውቑ። ብትግርኛ፣ እንግሊዝኛ ወይ ካልእ ቋንቋ ብቐጥታ ክዛረቡ ይኽእሉ እዮም።'
                    },
                    {
                      q: 'ብዘይ ኢንተርነት ይሰርሕ ድዩ? (Does Offline Mode work?)',
                      a: 'እወ! ዝተዓቀበ ታሪክን መዝገበ ቃላትን ብዘይ ኢንተርነት (Offline Cache) ይሰርሕ። ኣብ Settings ውሽጢ "ያላ ኢንተርኔት ኣገልግሎት" ንቁሕ ምዃኑ ኣረጋግጹ።'
                    },
                    {
                      q: 'ባህላዊ ናይ ድምጺ ጽልዋ ከመይ እዩ ዝሰርሕ? (How does Ambient Sound work?)',
                      a: 'ኣብ Settings ውሽጢ "ባህላዊ ናይ ድምጺ ጽልዋ" ብምውላዕ ማሲንቆ፣ ክራር፣ ዋሽንት ወይ Axum Ensemble ሙዚቃ ክትሰምዑ ትኽእሉ። ድምጺ መተዓራረዪ ድማ ብቐሊሉ ክትቆጻጸርዎ ትኽእሉ።'
                    },
                    {
                      q: 'ናይ ፕሮጀክት ኣበርክቶ ከመይ ገይረ የበርክት? (How to support or upgrade?)',
                      a: 'ኣብ Account & Settings ን "ምዝገባ" (Subscription) ወይ "ኣበርክቶኹም ንፕሮጀክትና" ብምጥዋቕ ብቐሊሉ ክትድግፉ ወይ ናብ PRO ክትዓብዩ ትኽእሉ።'
                    }
                  ].map((faq, idx) => {
                    const isOpen = expandedFaqIndex === idx;
                    return (
                      <div 
                        key={idx} 
                        className="rounded-xl border border-stone-200 bg-stone-50/80 overflow-hidden transition-all"
                      >
                        <button
                          type="button"
                          onClick={() => setExpandedFaqIndex(isOpen ? null : idx)}
                          className="w-full p-2.5 flex items-center justify-between text-left font-bold text-slate-900 hover:bg-stone-100 transition-colors cursor-pointer"
                        >
                          <span className="text-xs leading-snug">{faq.q}</span>
                          {isOpen ? <ChevronUp className="w-3.5 h-3.5 text-sky-600 shrink-0 ml-2" /> : <ChevronDown className="w-3.5 h-3.5 text-stone-400 shrink-0 ml-2" />}
                        </button>
                        {isOpen && (
                          <div className="p-2.5 pt-0 text-[11.5px] text-stone-600 border-t border-stone-200/60 bg-white leading-relaxed">
                            {faq.a}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={() => setActiveSubModal('none')}
                  className="w-full py-2.5 bg-stone-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-colors cursor-pointer"
                >
                  ዕጾ (Close)
                </button>
              </div>
            )}

            {/* Sub-Modal: Security Settings & App Lock */}
            {activeSubModal === 'security-settings' && (
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-emerald-700 font-black text-lg font-serif">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    <span>ቅጥዕታት ድሕንነት (Security Settings)</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${
                    appLockEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-600'
                  }`}>
                    {appLockEnabled ? '🔒 APP LOCK: ON' : '🔓 APP LOCK: OFF'}
                  </span>
                </div>

                {/* Main Toggle Card */}
                <div className={`p-3.5 rounded-xl border transition-all ${
                  appLockEnabled 
                    ? 'bg-emerald-50/70 border-emerald-200' 
                    : 'bg-stone-50 border-stone-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        appLockEnabled ? 'bg-emerald-600 text-white' : 'bg-stone-200 text-stone-500'
                      }`}>
                        <Fingerprint className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                          <span>ናይ ኣፕ መዕጸዊ (Biometric App Lock)</span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                            appLockEnabled ? 'bg-emerald-200 text-emerald-900' : 'bg-stone-200 text-stone-700'
                          }`}>
                            {appLockEnabled ? 'Active' : 'Disabled'}
                          </span>
                        </div>
                        <div className="text-[11px] text-stone-500 mt-0.5">
                          Requires fingerprint/face scan when starting the app
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={appLockEnabled}
                      onClick={() => {
                        const next = !appLockEnabled;
                        setAppLockEnabled(next);
                        showToast(next ? '🔒 App Lock enabled! Biometric prompt active.' : '🔓 App Lock disabled.');
                      }}
                      className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                        appLockEnabled ? 'bg-emerald-600' : 'bg-stone-300'
                      }`}
                    >
                      <div
                        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                          appLockEnabled ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <p className="text-[11px] text-stone-600 mt-2.5 leading-relaxed bg-white/60 p-2 rounded-lg border border-stone-200/60">
                    {appLockEnabled 
                      ? '✅ ብቑዕ ሓለዋ፡ ኣብ ዝኾነ ናይ ኣፕ መበገሲ ወይ ድሕሪ ዕረፍቲ ናይ ኣጻብዕቲ/ገጽ ምርመራ ክሕተት እዩ።'
                      : '⚠️ ኣፕ መዕጸዊ ጠፊኡ ኣሎ። ዝኾነ ሰብ ናብቲ ኣፕ እንተኣትዩ ብቐጥታ ናብ ዝርርብን ዋሌትን ክኣቱ ይኽእል እዩ።'}
                  </p>
                </div>

                {/* Biometric Method Selector */}
                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1">
                    <Key className="w-3.5 h-3.5 text-amber-600" />
                    <span>ኣገባብ ባዮሜትሪክ (Biometric Method)</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setBiometricType('fingerprint');
                        showToast('Biometric set to Fingerprint');
                      }}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        biometricType === 'fingerprint'
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold ring-1 ring-emerald-500'
                          : 'border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700'
                      }`}
                    >
                      <Fingerprint className="w-4 h-4 mx-auto mb-1 text-emerald-600" />
                      <div className="text-[11px]">ኣጻብዕቲ</div>
                      <div className="text-[9px] text-stone-500">Fingerprint</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setBiometricType('face');
                        showToast('Biometric set to Face Unlock');
                      }}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        biometricType === 'face'
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold ring-1 ring-emerald-500'
                          : 'border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700'
                      }`}
                    >
                      <Eye className="w-4 h-4 mx-auto mb-1 text-sky-600" />
                      <div className="text-[11px]">ገጽ ምልላይ</div>
                      <div className="text-[9px] text-stone-500">Face ID</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setBiometricType('both');
                        showToast('Biometric set to Hybrid');
                      }}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        biometricType === 'both'
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold ring-1 ring-emerald-500'
                          : 'border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700'
                      }`}
                    >
                      <Shield className="w-4 h-4 mx-auto mb-1 text-purple-600" />
                      <div className="text-[11px]">ክልቲኦም</div>
                      <div className="text-[9px] text-stone-500">Hybrid</div>
                    </button>
                  </div>
                </div>

                {/* Lock Timeout Selector */}
                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1">
                    <Smartphone className="w-3.5 h-3.5 text-amber-600" />
                    <span>ናይ ምዕጻው እዋን (Lock Timeout)</span>
                  </div>

                  <div className="grid grid-cols-4 gap-1.5 text-xs">
                    {[
                      { min: 0, label: 'ቀጥታ', sub: 'Instant' },
                      { min: 1, label: '1 ደቒቕ', sub: '1 Min' },
                      { min: 5, label: '5 ደቒቕ', sub: '5 Min' },
                      { min: 15, label: '15 ደቒቕ', sub: '15 Min' },
                    ].map((t) => (
                      <button
                        key={t.min}
                        type="button"
                        onClick={() => {
                          setLockTimeoutMinutes(t.min);
                          showToast(`Lock timeout set to: ${t.sub}`);
                        }}
                        className={`p-2 rounded-lg border text-center transition-all cursor-pointer ${
                          lockTimeoutMinutes === t.min
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold'
                            : 'border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700'
                        }`}
                      >
                        <div className="text-[11px] font-bold">{t.label}</div>
                        <div className="text-[9px] text-stone-400">{t.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Biometric Interactive Test Simulator */}
                <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                      <Fingerprint className="w-4 h-4 text-emerald-600" />
                      <span>ባዮሜትሪክ ፈትን (Test Biometric Sensor)</span>
                    </div>
                    {testBioSuccess && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full flex items-center space-x-1 animate-pulse">
                        <CheckCircle className="w-3 h-3" />
                        <span>Verified!</span>
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-stone-500">
                    Verify that your device's biometric scanner (BiometricPrompt) responds properly.
                  </p>

                  <button
                    type="button"
                    onClick={handleTestBiometrics}
                    disabled={isTestingBiometrics}
                    className="w-full py-2.5 bg-stone-900 hover:bg-black text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isTestingBiometrics ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                        <span>Scanning Fingerprint / Face...</span>
                      </>
                    ) : testBioSuccess ? (
                      <>
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <span>ባዮሜትሪክ ብዓወት ተረጋጊጹ (Biometric Sensor Ready)</span>
                      </>
                    ) : (
                      <>
                        <Fingerprint className="w-4 h-4 text-amber-400" />
                        <span>ባዮሜትሪክ መርምር (Run Sensor Test)</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Panic Wipe Protection Toggle */}
                <div className="p-3 bg-rose-50/60 border border-rose-200/80 rounded-xl flex items-center justify-between">
                  <div className="flex items-center space-x-2.5 mr-2">
                    <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                      <ShieldAlert className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-rose-950">
                        ህጹጽ ምጽራግ (Panic Wipe Protection)
                      </div>
                      <div className="text-[10.5px] text-rose-700 leading-tight">
                        Wipe local offline cache if 5 consecutive failed attempts occur
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={panicWipeEnabled}
                    onClick={() => {
                      const next = !panicWipeEnabled;
                      setPanicWipeEnabled(next);
                      showToast(next ? 'Panic Wipe protection enabled' : 'Panic Wipe disabled');
                    }}
                    className={`w-10 h-5.5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ${
                      panicWipeEnabled ? 'bg-rose-600' : 'bg-stone-300'
                    }`}
                  >
                    <div
                      className={`bg-white w-4.5 h-4.5 rounded-full shadow-md transform transition-transform ${
                        panicWipeEnabled ? 'translate-x-4.5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Hardware Security Specs Info */}
                <div className="p-2.5 bg-stone-100 rounded-xl text-[10.5px] text-stone-600 space-y-1">
                  <div className="font-bold text-stone-800 flex items-center space-x-1.5">
                    <Cpu className="w-3.5 h-3.5 text-stone-600" />
                    <span>Android Hardware Security Specifications</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[10px] text-stone-500 pt-0.5 font-mono">
                    <div>• TEE KeyStore: StrongBox</div>
                    <div>• Biometric API: Class 3</div>
                    <div>• Local Vault: AES-256 GCM</div>
                    <div>• Cloud Sync: Firestore TLS</div>
                  </div>
                </div>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setActiveSubModal('none')}
                  className="w-full py-2.5 bg-stone-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  ተረዲአዮ • ዕጾ (Done & Close)
                </button>
              </div>
            )}

            {/* Sub-Modal 6: Contribute */}
            {activeSubModal === 'contribute' && (
              <div className="space-y-3 text-center">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 mx-auto flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-amber-600" />
                </div>
                <h3 className="text-lg font-black text-slate-900">
                  ኣበርክቶኹም ንፕሮጀክትና
                </h3>
                <p className="text-xs text-stone-600">
                  ንቐጻሊ ምዕባለ ቋንቋ ትግርኛን ቴክኖሎጂን ዝውዕል ደገፍ ንምግባር፡ ናይ ቴሌግራም ወይ ቀጥታዊ ኣበርክቶ መንገዲ ተጠቐሙ።
                </p>
                <button
                  onClick={() => {
                    showToast('Thank you for supporting our project!');
                    setActiveSubModal('none');
                  }}
                  className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs"
                >
                  ደገፍ ኣበርክት (Contribute)
                </button>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
};
