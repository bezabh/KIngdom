import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { UserProfile } from '../types';
import { auth } from '../lib/firebase';
import { useAuthUser } from './AuthUserContext';
import { useNetwork } from './NetworkContext';
import { useOptionalSubscription } from './SubscriptionContext';
import {
  invalidateTranslationSubscriptionCache,
  isTranslationSubscriptionError,
  PREMIUM_FEATURE_META,
  PremiumTranslationFeature,
  SubscriptionGuardResult,
  subscribeToTranslationEntitlement,
  TranslationSubscriptionError,
  validateTranslationSubscriptionFromFirestore,
} from '../lib/translationSubscriptionGuard';
import type { OfflinePackMetadata } from '../server/offlineLanguagePacksData';
import {
  DownloadedOfflinePack,
  downloadOfflinePack,
  fetchAvailableOfflinePacks,
  getBrowserStorageEstimate,
  getDownloadedPacks,
  OfflineTranslationMatch,
  removeOfflinePack,
  resolveLexiconField,
} from '../services/offlinePackService';
import {
  CallSessionRecord,
  ConversationSessionRecord,
  ConversationTurnItem,
  deleteCallSession as deleteCallSessionSvc,
  deleteConversationSession as deleteConversationSessionSvc,
  deleteOcrDocument as deleteOcrDocumentSvc,
  loadCallSessions as loadCallSessionsSvc,
  loadConversationSessions as loadConversationSessionsSvc,
  loadOcrDocuments as loadOcrDocumentsSvc,
  OcrDocumentRecord,
  saveCallSession as saveCallSessionSvc,
  saveConversationSession as saveConversationSessionSvc,
  saveOcrDocument as saveOcrDocumentSvc,
} from '../services/translatorSuiteService';
import {
  checkPronunciationApi,
  CheckPronunciationParams,
  DEFAULT_OFFLINE_LANGUAGES,
  DetectedLanguageResult,
  detectLanguageFromText,
  getLanguageCapability,
  isAutoDetectLabel,
  LanguageCapabilities,
  normalizeLanguageName,
  OcrScanResult,
  OfflineTranslationWithDetection,
  PronunciationCheckResult,
  resolveConversationTurnDirection,
  resolveSpeechCode,
  scanOcrImageApi,
  synthesizeSpeechApi,
  translateOfflineWithDetection,
  translateTextApi,
  TranslateTextResponse,
  translateVoiceApi,
  TranslateVoiceResponse,
  ConversationHistorySnippet,
} from '../services/translationService';

export interface StorageStats {
  usedBytes: number;
  quotaBytes: number;
  packBytes: number;
}

export interface OfflinePacksStateValue {
  availablePacks: OfflinePackMetadata[];
  downloadedPacks: DownloadedOfflinePack[];
  downloadedPacksCount: number | null;
  storageStats: StorageStats;
  busyPackCode: string | null;
  offlineError: string | null;
  isOnline: boolean;
  forceOfflineMode: boolean;
  isOfflineActive: boolean;
  offlineLanguageOptions: ReadonlyArray<{ code: string; name: string; nativeName: string }>;
}

export interface TranslationPlaybackStateValue {
  playingAudioId: string | null;
}

export interface TranslationSubscriptionStateValue {
  lastSubscriptionDenial: SubscriptionGuardResult | null;
  isValidatingSubscription: boolean;
}

export interface GuardCheckOptions {
  forceRefresh?: boolean;
  openPaywallOnDeny?: boolean;
}

export interface PlaySpeechOptions {
  voice?: string;
  rate?: number;
  maxChars?: number;
  /** When true, resolves only after playback finishes (for hands-free voice loops). */
  awaitCompletion?: boolean;
}

export interface PlaySpeechResult {
  wavDataUrl?: string;
}

export interface TranslateConversationTurnInput {
  speaker: 'A' | 'B';
  personALang: string;
  personBLang: string;
  autoDetect: boolean;
  prompt?: string;
  audioBase64?: string;
  mimeType?: string;
  conversationHistory?: ConversationHistorySnippet[];
}

export interface TranslateConversationTurnResult {
  noSpeechDetected: boolean;
  turn?: ConversationTurnItem;
  spokenTargetText: string;
  usedOffline: boolean;
}

export type TranslationSubscriptionValidator = (params: {
  feature: PremiumTranslationFeature;
  user?: UserProfile;
  forceRefresh?: boolean;
}) => Promise<SubscriptionGuardResult>;

export interface TranslationActionsValue {
  // Subscription validation guard / middleware helpers
  validatePremiumFeature: (
    feature: PremiumTranslationFeature,
    options?: GuardCheckOptions
  ) => Promise<SubscriptionGuardResult>;
  requirePremiumFeature: (
    feature: PremiumTranslationFeature,
    options?: GuardCheckOptions
  ) => Promise<SubscriptionGuardResult>;
  clearSubscriptionDenial: () => void;

  // Unified translation operations
  translateText: (params: {
    text: string;
    sourceLanguage: string;
    targetLanguage: string;
    preferOffline?: boolean;
    requirePro?: boolean;
  }) => Promise<TranslateTextResponse>;
  translateVoice: (params: {
    prompt?: string;
    audioBase64?: string;
    mimeType?: string;
    sourceLanguage: string;
    targetLanguage: string;
    autoDetectPair?: boolean;
    conversationHistory?: ConversationHistorySnippet[];
    preferOffline?: boolean;
    feature?: Extract<PremiumTranslationFeature, 'voice_translation' | 'call_translation'>;
  }) => Promise<TranslateVoiceResponse>;
  translateConversationTurn: (
    params: TranslateConversationTurnInput
  ) => Promise<TranslateConversationTurnResult>;
  scanOcrImage: (params: {
    imageDataUrl: string;
    targetLanguage: string;
  }) => Promise<OcrScanResult>;
  checkPronunciation: (
    params: Omit<CheckPronunciationParams, 'user'>
  ) => Promise<PronunciationCheckResult>;
  translateOffline: (
    text: string,
    sourceLanguage: string,
    targetLanguage: string
  ) => Promise<OfflineTranslationWithDetection>;

  // Centralized audio synthesis & playback
  playTranslatedSpeech: (
    text: string,
    languageName: string,
    playbackId: string,
    options?: PlaySpeechOptions
  ) => Promise<PlaySpeechResult>;
  stopSpeechPlayback: () => void;

  // Offline language pack lifecycle
  refreshOfflinePacks: (includeCatalog?: boolean) => Promise<void>;
  downloadPack: (langCode: string) => Promise<DownloadedOfflinePack>;
  removePack: (langCode: string) => Promise<void>;
  setForceOfflineMode: (val: boolean) => void;
  clearOfflineError: () => void;

  // Centralized language detection & capability helpers
  detectLanguage: (text: string, hintLanguages?: string[]) => DetectedLanguageResult;
  normalizeLanguageName: (input: string, fallback?: string) => string;
  isAutoDetectLabel: (lang?: string) => boolean;
  resolveSpeechCode: (languageName: string) => string;
  resolveConversationDirection: typeof resolveConversationTurnDirection;
  getLanguageCapability: (languageName: string) => LanguageCapabilities;
  resolveLexiconField: typeof resolveLexiconField;

  // Shared persistence helpers (Firestore + localStorage via translatorSuiteService)
  loadConversationSessions: () => Promise<ConversationSessionRecord[]>;
  saveConversationSession: (record: ConversationSessionRecord) => Promise<void>;
  deleteConversationSession: (id: string) => Promise<void>;
  loadOcrDocuments: (
    filter?: 'camera_ocr' | 'screen_and_upload'
  ) => Promise<OcrDocumentRecord[]>;
  saveOcrDocument: (record: OcrDocumentRecord) => Promise<void>;
  deleteOcrDocument: (id: string) => Promise<void>;
  loadCallSessions: () => Promise<CallSessionRecord[]>;
  saveCallSession: (record: CallSessionRecord) => Promise<void>;
  deleteCallSession: (id: string) => Promise<void>;
}

export type TranslationServiceContextValue = OfflinePacksStateValue &
  TranslationPlaybackStateValue &
  TranslationSubscriptionStateValue &
  TranslationActionsValue;

const OfflinePacksContext = createContext<OfflinePacksStateValue | undefined>(undefined);
const TranslationPlaybackContext = createContext<TranslationPlaybackStateValue | undefined>(undefined);
const TranslationSubscriptionContext = createContext<TranslationSubscriptionStateValue | undefined>(
  undefined
);
const TranslationActionsContext = createContext<TranslationActionsValue | undefined>(undefined);

interface TranslationServiceProviderProps {
  user?: UserProfile;
  onOpenAuthModal?: (mode?: 'login' | 'signup' | 'otp') => void;
  onOpenUpgradeModal?: (featureName?: string) => void;
  /** Optional custom Firestore validator (defaults to real live Firestore guard). */
  subscriptionValidator?: TranslationSubscriptionValidator;
  children: React.ReactNode;
}

const DEFAULT_STORAGE_STATS: StorageStats = {
  usedBytes: 0,
  quotaBytes: 512 * 1024 * 1024,
  packBytes: 0,
};

export const TranslationServiceProvider: React.FC<TranslationServiceProviderProps> = ({
  user: userProp,
  onOpenAuthModal,
  onOpenUpgradeModal,
  subscriptionValidator,
  children,
}) => {
  const { user: authUser } = useAuthUser();
  const effectiveUser = userProp ?? authUser ?? undefined;
  const { isOnline, forceOfflineMode, setForceOfflineMode } = useNetwork();
  const subscriptionCtx = useOptionalSubscription();
  const isOfflineActive = !isOnline || forceOfflineMode;

  // Shared Offline Pack State
  const [availablePacks, setAvailablePacks] = useState<OfflinePackMetadata[]>([]);
  const [downloadedPacks, setDownloadedPacks] = useState<DownloadedOfflinePack[]>([]);
  const [downloadedPacksCount, setDownloadedPacksCount] = useState<number | null>(null);
  const [storageStats, setStorageStats] = useState<StorageStats>(DEFAULT_STORAGE_STATS);
  const [busyPackCode, setBusyPackCode] = useState<string | null>(null);
  const [offlineError, setOfflineError] = useState<string | null>(null);

  // Shared Audio Playback State
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  // Firestore Subscription Guard State
  const [lastSubscriptionDenial, setLastSubscriptionDenial] =
    useState<SubscriptionGuardResult | null>(null);
  const [isValidatingSubscription, setIsValidatingSubscription] = useState<boolean>(false);

  // Stable refs so action callbacks never churn when state updates
  const userRef = useRef<UserProfile | undefined>(effectiveUser);
  const offlineActiveRef = useRef<boolean>(isOfflineActive);
  const subscriptionCtxRef = useRef(subscriptionCtx);
  const onOpenAuthModalRef = useRef(onOpenAuthModal);
  const onOpenUpgradeModalRef = useRef(onOpenUpgradeModal);
  const validatorRef = useRef<TranslationSubscriptionValidator>(
    subscriptionValidator ?? validateTranslationSubscriptionFromFirestore
  );
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const playbackTokenRef = useRef<number>(0);
  const pendingPlaybackResolveRef = useRef<(() => void) | null>(null);
  const isMountedRef = useRef<boolean>(true);

  userRef.current = effectiveUser;
  offlineActiveRef.current = isOfflineActive;
  subscriptionCtxRef.current = subscriptionCtx;
  onOpenAuthModalRef.current = onOpenAuthModal;
  onOpenUpgradeModalRef.current = onOpenUpgradeModal;
  validatorRef.current = subscriptionValidator ?? validateTranslationSubscriptionFromFirestore;

  // Keep Firestore entitlement cache synchronized with Auth UID & SubscriptionContext updates
  const activeAuthUid = auth.currentUser && !auth.currentUser.isAnonymous ? auth.currentUser.uid : '';
  useEffect(() => {
    invalidateTranslationSubscriptionCache();
    setLastSubscriptionDenial(null);
  }, [
    effectiveUser?.id,
    effectiveUser?.authUid,
    effectiveUser?.role,
    subscriptionCtx?.paypalEntitlement?.updatedAt,
    subscriptionCtx?.paypalEntitlement?.isPro,
    subscriptionCtx?.paypalEntitlement?.subscriptionStatus,
    subscriptionCtx?.paypalSubscription?.status,
    activeAuthUid,
  ]);

  // Listen to live Firestore `user_entitlements/{uid}` updates when signed in
  useEffect(() => {
    if (!activeAuthUid) return;
    const unsubscribe = subscribeToTranslationEntitlement(activeAuthUid, (entDoc) => {
      if (!isMountedRef.current) return;
      if (entDoc && entDoc.isPro) {
        setLastSubscriptionDenial(null);
      }
    });
    return () => {
      unsubscribe();
    };
  }, [activeAuthUid]);

  const clearSubscriptionDenial = useCallback(() => {
    setLastSubscriptionDenial(null);
  }, []);

  const handleDeniedAccess = useCallback(
    (guard: SubscriptionGuardResult, options?: GuardCheckOptions) => {
      if (isMountedRef.current) {
        setLastSubscriptionDenial(guard);
      }
      if (options?.openPaywallOnDeny === false) return;

      if (guard.reason === 'UNAUTHENTICATED') {
        if (onOpenAuthModalRef.current) {
          onOpenAuthModalRef.current('login');
          return;
        }
      }

      if (guard.reason !== 'ACCOUNT_SUSPENDED') {
        const featureTitle = PREMIUM_FEATURE_META[guard.feature].en;
        if (subscriptionCtxRef.current?.openPaywall) {
          subscriptionCtxRef.current.openPaywall(featureTitle);
        } else if (onOpenUpgradeModalRef.current) {
          onOpenUpgradeModalRef.current(featureTitle);
        }
      }
    },
    []
  );

  /**
   * Non-throwing guard check: validates live subscription status in Firestore.
   */
  const validatePremiumFeature = useCallback(
    async (
      feature: PremiumTranslationFeature,
      options?: GuardCheckOptions
    ): Promise<SubscriptionGuardResult> => {
      if (isMountedRef.current) setIsValidatingSubscription(true);
      try {
        const result = await validatorRef.current({
          feature,
          user: userRef.current,
          forceRefresh: options?.forceRefresh,
        });
        if (!result.allowed) {
          handleDeniedAccess(result, options);
        } else if (isMountedRef.current) {
          setLastSubscriptionDenial((prev) => (prev?.feature === feature ? null : prev));
        }
        return result;
      } finally {
        if (isMountedRef.current) setIsValidatingSubscription(false);
      }
    },
    [handleDeniedAccess]
  );

  /**
   * Throwing guard check: validates live subscription status in Firestore and
   * throws `TranslationSubscriptionError` if access is denied.
   */
  const requirePremiumFeature = useCallback(
    async (
      feature: PremiumTranslationFeature,
      options?: GuardCheckOptions
    ): Promise<SubscriptionGuardResult> => {
      const result = await validatePremiumFeature(feature, options);
      if (!result.allowed) {
        throw new TranslationSubscriptionError(result);
      }
      return result;
    },
    [validatePremiumFeature]
  );

  /**
   * Middleware wrapper executed before any premium translation operation.
   */
  const runWithSubscriptionGuard = useCallback(
    async <T,>(
      feature: PremiumTranslationFeature,
      operation: () => Promise<T>,
      options?: GuardCheckOptions
    ): Promise<T> => {
      await requirePremiumFeature(feature, options);
      try {
        return await operation();
      } catch (err) {
        if (isTranslationSubscriptionError(err)) {
          invalidateTranslationSubscriptionCache();
          handleDeniedAccess(err.guardResult, options);
        }
        throw err;
      }
    },
    [requirePremiumFeature, handleDeniedAccess]
  );

  const stopSpeechPlayback = useCallback(() => {
    playbackTokenRef.current += 1;
    if (activeAudioRef.current) {
      try {
        activeAudioRef.current.onended = null;
        activeAudioRef.current.onerror = null;
        activeAudioRef.current.pause();
        activeAudioRef.current.currentTime = 0;
      } catch {}
      activeAudioRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    if (pendingPlaybackResolveRef.current) {
      const resolvePending = pendingPlaybackResolveRef.current;
      pendingPlaybackResolveRef.current = null;
      resolvePending();
    }
    if (isMountedRef.current) {
      setPlayingAudioId(null);
    }
  }, []);

  const refreshOfflinePacks = useCallback(async (includeCatalog = false) => {
    try {
      const [dl, est, avail] = await Promise.all([
        getDownloadedPacks(),
        getBrowserStorageEstimate(),
        includeCatalog ? fetchAvailableOfflinePacks() : Promise.resolve(null),
      ]);
      if (!isMountedRef.current) return;
      setDownloadedPacks(dl);
      setDownloadedPacksCount(dl.length);
      setStorageStats(est);
      if (avail) {
        setAvailablePacks(avail);
      }
    } catch {
      if (isMountedRef.current) {
        setDownloadedPacksCount((prev) => (prev === null ? 0 : prev));
      }
    }
  }, []);

  // Load downloaded packs count immediately on mount & clean up audio on unmount
  useEffect(() => {
    isMountedRef.current = true;
    refreshOfflinePacks(false);
    return () => {
      isMountedRef.current = false;
      stopSpeechPlayback();
    };
  }, [refreshOfflinePacks, stopSpeechPlayback]);

  const downloadPack = useCallback(
    async (langCode: string): Promise<DownloadedOfflinePack> => {
      setBusyPackCode(langCode);
      setOfflineError(null);
      try {
        return await runWithSubscriptionGuard('offline_packs', async () => {
          const pack = await downloadOfflinePack(langCode, userRef.current);
          await refreshOfflinePacks(true);
          return pack;
        });
      } catch (err: any) {
        const msg = err?.message || `Failed to download offline pack "${langCode}".`;
        if (isMountedRef.current) setOfflineError(msg);
        throw err;
      } finally {
        if (isMountedRef.current) setBusyPackCode(null);
      }
    },
    [refreshOfflinePacks, runWithSubscriptionGuard]
  );

  const removePack = useCallback(
    async (langCode: string): Promise<void> => {
      setBusyPackCode(langCode);
      setOfflineError(null);
      try {
        await removeOfflinePack(langCode);
        await refreshOfflinePacks(true);
      } catch (err: any) {
        const msg = err?.message || `Failed to delete offline pack "${langCode}".`;
        if (isMountedRef.current) setOfflineError(msg);
        throw err;
      } finally {
        if (isMountedRef.current) setBusyPackCode(null);
      }
    },
    [refreshOfflinePacks]
  );

  const clearOfflineError = useCallback(() => {
    setOfflineError(null);
  }, []);

  const playTranslatedSpeech = useCallback(
    async (
      text: string,
      languageName: string,
      playbackId: string,
      options: PlaySpeechOptions = {}
    ): Promise<PlaySpeechResult> => {
      const cleanText = (text || '').trim().slice(0, options.maxChars ?? 320);
      if (!cleanText) return {};

      stopSpeechPlayback();
      const token = playbackTokenRef.current;
      const rate = options.rate ?? 1.0;
      const voice = options.voice ?? 'Kore';
      const awaitCompletion = Boolean(options.awaitCompletion);

      if (isMountedRef.current) {
        setPlayingAudioId(playbackId);
      }

      const synthResult = await synthesizeSpeechApi({
        text: cleanText,
        language: languageName,
        voice,
        user: userRef.current,
        preferOffline: offlineActiveRef.current,
        maxChars: options.maxChars ?? 320,
      });

      if (!isMountedRef.current || playbackTokenRef.current !== token) {
        return {};
      }

      const playBrowserFallback = (onFinish: () => void) => {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          try {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(cleanText.slice(0, 300));
            utterance.lang = resolveSpeechCode(languageName);
            utterance.rate = rate;
            let settled = false;
            const finishOnce = () => {
              if (settled) return;
              settled = true;
              if (playbackTokenRef.current === token && isMountedRef.current) {
                setPlayingAudioId(null);
              }
              onFinish();
            };
            utterance.onend = finishOnce;
            utterance.onerror = finishOnce;
            window.speechSynthesis.speak(utterance);
            if (awaitCompletion) {
              setTimeout(finishOnce, Math.min(9000, Math.max(2000, cleanText.length * 75)));
            }
            return;
          } catch {}
        }
        if (playbackTokenRef.current === token && isMountedRef.current) {
          setPlayingAudioId(null);
        }
        onFinish();
      };

      if (synthResult?.wavDataUrl) {
        const audio = new Audio(synthResult.wavDataUrl);
        audio.playbackRate = rate;
        activeAudioRef.current = audio;

        if (awaitCompletion) {
          await new Promise<void>((resolve) => {
            let settled = false;
            const finishOnce = () => {
              if (settled) return;
              settled = true;
              if (pendingPlaybackResolveRef.current === finishOnce) {
                pendingPlaybackResolveRef.current = null;
              }
              if (playbackTokenRef.current === token && isMountedRef.current) {
                setPlayingAudioId(null);
              }
              resolve();
            };
            pendingPlaybackResolveRef.current = finishOnce;
            audio.onended = finishOnce;
            audio.onerror = () => playBrowserFallback(finishOnce);
            audio.play().catch(() => playBrowserFallback(finishOnce));
          });
          return { wavDataUrl: synthResult.wavDataUrl };
        }

        audio.onended = () => {
          if (playbackTokenRef.current === token && isMountedRef.current) {
            setPlayingAudioId(null);
          }
        };
        audio.onerror = () => playBrowserFallback(() => {});
        try {
          await audio.play();
        } catch {
          playBrowserFallback(() => {});
        }
        return { wavDataUrl: synthResult.wavDataUrl };
      }

      if (awaitCompletion) {
        await new Promise<void>((resolve) => {
          let settled = false;
          const finishOnce = () => {
            if (settled) return;
            settled = true;
            if (pendingPlaybackResolveRef.current === finishOnce) {
              pendingPlaybackResolveRef.current = null;
            }
            resolve();
          };
          pendingPlaybackResolveRef.current = finishOnce;
          playBrowserFallback(finishOnce);
        });
      } else {
        playBrowserFallback(() => {});
      }
      return {};
    },
    [stopSpeechPlayback]
  );

  // Unified API methods (with Firestore subscription guard middleware on all premium translation features)
  const translateText = useCallback(
    async (params: {
      text: string;
      sourceLanguage: string;
      targetLanguage: string;
      preferOffline?: boolean;
      requirePro?: boolean;
    }): Promise<TranslateTextResponse> => {
      const execute = () =>
        translateTextApi({
          text: params.text,
          sourceLanguage: params.sourceLanguage,
          targetLanguage: params.targetLanguage,
          user: userRef.current,
          preferOffline: params.preferOffline ?? offlineActiveRef.current,
          premiumMode: Boolean(params.requirePro),
        });

      if (params.requirePro) {
        return runWithSubscriptionGuard('premium_text_translation', execute);
      }
      return execute();
    },
    [runWithSubscriptionGuard]
  );

  const translateVoice = useCallback(
    async (params: {
      prompt?: string;
      audioBase64?: string;
      mimeType?: string;
      sourceLanguage: string;
      targetLanguage: string;
      autoDetectPair?: boolean;
      conversationHistory?: ConversationHistorySnippet[];
      preferOffline?: boolean;
      feature?: Extract<PremiumTranslationFeature, 'voice_translation' | 'call_translation'>;
    }): Promise<TranslateVoiceResponse> => {
      const featureKey: PremiumTranslationFeature = params.feature || 'voice_translation';
      return runWithSubscriptionGuard(featureKey, () =>
        translateVoiceApi({
          prompt: params.prompt,
          audioBase64: params.audioBase64,
          mimeType: params.mimeType,
          sourceLanguage: params.sourceLanguage,
          targetLanguage: params.targetLanguage,
          autoDetectPair: params.autoDetectPair,
          conversationHistory: params.conversationHistory,
          user: userRef.current,
          preferOffline: params.preferOffline ?? offlineActiveRef.current,
        })
      );
    },
    [runWithSubscriptionGuard]
  );

  const translateConversationTurn = useCallback(
    async (
      params: TranslateConversationTurnInput
    ): Promise<TranslateConversationTurnResult> => {
      return runWithSubscriptionGuard('conversation_translation', async () => {
        const srcLang = params.speaker === 'A' ? params.personALang : params.personBLang;
        const tgtLang = params.speaker === 'A' ? params.personBLang : params.personALang;

        const voiceRes = await translateVoiceApi({
          prompt: params.prompt,
          audioBase64: params.audioBase64,
          mimeType: params.mimeType,
          sourceLanguage: srcLang,
          targetLanguage: tgtLang,
          autoDetectPair: params.autoDetect,
          conversationHistory: params.conversationHistory,
          user: userRef.current,
          preferOffline: offlineActiveRef.current,
        });

        if (voiceRes.noSpeechDetected || !voiceRes.translatedText) {
          return {
            noSpeechDetected: true,
            spokenTargetText: '',
            usedOffline: voiceRes.usedOffline,
          };
        }

        const direction = resolveConversationTurnDirection({
          spokenText: voiceRes.sourceTranscript || params.prompt,
          requestedSpeaker: params.speaker,
          personALang: params.personALang,
          personBLang: params.personBLang,
          autoDetect: params.autoDetect,
          serverDetectedSource: voiceRes.detectedSourceLanguage,
          serverEffectiveTarget: voiceRes.effectiveTargetLanguage,
        });

        const turn: ConversationTurnItem = {
          id: `conv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          speaker: direction.speaker,
          sourceLanguage: direction.sourceLanguage,
          targetLanguage: direction.targetLanguage,
          originalText: voiceRes.sourceTranscript || params.prompt || '',
          translatedText: voiceRes.translatedText,
          transliteration: voiceRes.transliteration || '',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        return {
          noSpeechDetected: false,
          turn,
          spokenTargetText: voiceRes.spokenTargetText || voiceRes.translatedText,
          usedOffline: voiceRes.usedOffline,
        };
      });
    },
    [runWithSubscriptionGuard]
  );

  const scanOcrImage = useCallback(
    async (params: { imageDataUrl: string; targetLanguage: string }): Promise<OcrScanResult> => {
      return runWithSubscriptionGuard('ocr_translation', () =>
        scanOcrImageApi({
          imageDataUrl: params.imageDataUrl,
          targetLanguage: params.targetLanguage,
          user: userRef.current,
          preferOffline: offlineActiveRef.current,
        })
      );
    },
    [runWithSubscriptionGuard]
  );

  const checkPronunciation = useCallback(
    async (params: Omit<CheckPronunciationParams, 'user'>): Promise<PronunciationCheckResult> => {
      return runWithSubscriptionGuard('pronunciation_check', () =>
        checkPronunciationApi({
          ...params,
          user: userRef.current,
        })
      );
    },
    [runWithSubscriptionGuard]
  );

  const translateOffline = useCallback(
    async (
      text: string,
      sourceLanguage: string,
      targetLanguage: string
    ): Promise<OfflineTranslationWithDetection> => {
      return runWithSubscriptionGuard('offline_packs', () =>
        translateOfflineWithDetection(text, sourceLanguage, targetLanguage)
      );
    },
    [runWithSubscriptionGuard]
  );

  // Shared persistence helpers
  const loadConversationSessions = useCallback(
    () => loadConversationSessionsSvc(userRef.current),
    []
  );
  const saveConversationSession = useCallback(
    (record: ConversationSessionRecord) => saveConversationSessionSvc(record, userRef.current),
    []
  );
  const deleteConversationSession = useCallback(
    (id: string) => deleteConversationSessionSvc(id, userRef.current),
    []
  );

  const loadOcrDocuments = useCallback(
    async (filter?: 'camera_ocr' | 'screen_and_upload'): Promise<OcrDocumentRecord[]> => {
      const rows = await loadOcrDocumentsSvc(userRef.current);
      if (filter === 'camera_ocr') return rows.filter((r) => r.captureSource === 'camera_ocr');
      if (filter === 'screen_and_upload') return rows.filter((r) => r.captureSource !== 'camera_ocr');
      return rows;
    },
    []
  );
  const saveOcrDocument = useCallback(
    (record: OcrDocumentRecord) => saveOcrDocumentSvc(record, userRef.current),
    []
  );
  const deleteOcrDocument = useCallback(
    (id: string) => deleteOcrDocumentSvc(id, userRef.current),
    []
  );

  const loadCallSessions = useCallback(() => loadCallSessionsSvc(userRef.current), []);
  const saveCallSession = useCallback(
    (record: CallSessionRecord) => saveCallSessionSvc(record, userRef.current),
    []
  );
  const deleteCallSession = useCallback(
    (id: string) => deleteCallSessionSvc(id, userRef.current),
    []
  );

  const offlineLanguageOptions = useMemo(
    () => (availablePacks.length > 0 ? availablePacks : DEFAULT_OFFLINE_LANGUAGES),
    [availablePacks]
  );

  const offlineStateValue = useMemo<OfflinePacksStateValue>(
    () => ({
      availablePacks,
      downloadedPacks,
      downloadedPacksCount,
      storageStats,
      busyPackCode,
      offlineError,
      isOnline,
      forceOfflineMode,
      isOfflineActive,
      offlineLanguageOptions,
    }),
    [
      availablePacks,
      downloadedPacks,
      downloadedPacksCount,
      storageStats,
      busyPackCode,
      offlineError,
      isOnline,
      forceOfflineMode,
      isOfflineActive,
      offlineLanguageOptions,
    ]
  );

  const playbackStateValue = useMemo<TranslationPlaybackStateValue>(
    () => ({ playingAudioId }),
    [playingAudioId]
  );

  const subscriptionStateValue = useMemo<TranslationSubscriptionStateValue>(
    () => ({
      lastSubscriptionDenial,
      isValidatingSubscription,
    }),
    [lastSubscriptionDenial, isValidatingSubscription]
  );

  const actionsValue = useMemo<TranslationActionsValue>(
    () => ({
      validatePremiumFeature,
      requirePremiumFeature,
      clearSubscriptionDenial,
      translateText,
      translateVoice,
      translateConversationTurn,
      scanOcrImage,
      checkPronunciation,
      translateOffline,
      playTranslatedSpeech,
      stopSpeechPlayback,
      refreshOfflinePacks,
      downloadPack,
      removePack,
      setForceOfflineMode,
      clearOfflineError,
      detectLanguage: detectLanguageFromText,
      normalizeLanguageName,
      isAutoDetectLabel,
      resolveSpeechCode,
      resolveConversationDirection: resolveConversationTurnDirection,
      getLanguageCapability,
      resolveLexiconField,
      loadConversationSessions,
      saveConversationSession,
      deleteConversationSession,
      loadOcrDocuments,
      saveOcrDocument,
      deleteOcrDocument,
      loadCallSessions,
      saveCallSession,
      deleteCallSession,
    }),
    [
      validatePremiumFeature,
      requirePremiumFeature,
      clearSubscriptionDenial,
      translateText,
      translateVoice,
      translateConversationTurn,
      scanOcrImage,
      checkPronunciation,
      translateOffline,
      playTranslatedSpeech,
      stopSpeechPlayback,
      refreshOfflinePacks,
      downloadPack,
      removePack,
      setForceOfflineMode,
      clearOfflineError,
      loadConversationSessions,
      saveConversationSession,
      deleteConversationSession,
      loadOcrDocuments,
      saveOcrDocument,
      deleteOcrDocument,
      loadCallSessions,
      saveCallSession,
      deleteCallSession,
    ]
  );

  return (
    <TranslationActionsContext.Provider value={actionsValue}>
      <TranslationSubscriptionContext.Provider value={subscriptionStateValue}>
        <OfflinePacksContext.Provider value={offlineStateValue}>
          <TranslationPlaybackContext.Provider value={playbackStateValue}>
            {children}
          </TranslationPlaybackContext.Provider>
        </OfflinePacksContext.Provider>
      </TranslationSubscriptionContext.Provider>
    </TranslationActionsContext.Provider>
  );
};

export function useOfflinePacks(): OfflinePacksStateValue {
  const ctx = useContext(OfflinePacksContext);
  if (!ctx) {
    throw new Error('useOfflinePacks must be used within a TranslationServiceProvider');
  }
  return ctx;
}

export function useTranslationPlayback(): TranslationPlaybackStateValue {
  const ctx = useContext(TranslationPlaybackContext);
  if (!ctx) {
    throw new Error('useTranslationPlayback must be used within a TranslationServiceProvider');
  }
  return ctx;
}

export function useTranslationSubscription(): TranslationSubscriptionStateValue {
  const ctx = useContext(TranslationSubscriptionContext);
  if (!ctx) {
    throw new Error('useTranslationSubscription must be used within a TranslationServiceProvider');
  }
  return ctx;
}

export function useTranslationActions(): TranslationActionsValue {
  const ctx = useContext(TranslationActionsContext);
  if (!ctx) {
    throw new Error('useTranslationActions must be used within a TranslationServiceProvider');
  }
  return ctx;
}

export function useTranslationService(): TranslationServiceContextValue {
  const offline = useOfflinePacks();
  const playback = useTranslationPlayback();
  const subscription = useTranslationSubscription();
  const actions = useTranslationActions();
  return useMemo(
    () => ({ ...offline, ...playback, ...subscription, ...actions }),
    [offline, playback, subscription, actions]
  );
}

export function useOptionalTranslationActions(): TranslationActionsValue | null {
  return useContext(TranslationActionsContext) ?? null;
}

export {
  TranslationSubscriptionError,
  isTranslationSubscriptionError,
  PREMIUM_FEATURE_META,
  validateTranslationSubscriptionFromFirestore,
};
export type {
  OfflineTranslationMatch,
  PremiumTranslationFeature,
  SubscriptionGuardResult,
};
