import React, { useState, useEffect, useRef, Suspense } from 'react';
import { TranslationResult, SavedItem, UserProfile } from '../types';
import {
  Languages,
  Sparkles,
  Copy,
  Check,
  BookmarkPlus,
  Loader2,
  Volume2,
  BookOpen,
  ArrowRightLeft,
  Globe,
  VolumeX,
  Sun,
  Moon,
  CreditCard,
  ShieldCheck,
  Code2,
  AlertCircle,
  X,
} from 'lucide-react';
import { checkGuestLimit, incrementGuestUsage } from '../utils/guestManager';
import { GuestLimitBanner } from './GuestLimitBanner';
import {
  ALL_INTERNATIONAL_LANGUAGES,
  POPULAR_LANGUAGE_PAIRS,
  LanguageOption,
  getLanguageCapability,
} from '../utils/languages';
import { LiveVoiceTranslationLoop } from './LiveVoiceTranslationLoop';
import { getTranslatorThemeTokens, TranslatorThemeMode } from './translator/translatorTheme';
import { OfflineTranslationPage } from './translator/OfflineTranslationPage';
import {
  TranslationFeatureCardsGrid,
  TranslatorFeatureView,
  TranslatorUiLanguage,
} from './translator/TranslationFeatureCardsGrid';
import { triggerTabTapHaptic } from '../utils/haptics';
import { lazyWithRetry } from './LazyChunkBoundary';
import {
  TranslationServiceProvider,
  useOfflinePacks,
  useTranslationActions,
  useTranslationPlayback,
  useTranslationSubscription,
} from '../context/TranslationServiceContext';

const ConversationTranslatorPage = lazyWithRetry(() =>
  import('./translator/ConversationTranslatorPage').then((m) => ({ default: m.ConversationTranslatorPage }))
);
const ScreenCaptureTranslatorPage = lazyWithRetry(() =>
  import('./translator/ScreenCaptureTranslatorPage').then((m) => ({ default: m.ScreenCaptureTranslatorPage }))
);
const LiveCallTranslatorPage = lazyWithRetry(() =>
  import('./translator/LiveCallTranslatorPage').then((m) => ({ default: m.LiveCallTranslatorPage }))
);
const CameraOcrTranslatorPage = lazyWithRetry(() =>
  import('./translator/CameraOcrTranslatorPage').then((m) => ({ default: m.CameraOcrTranslatorPage }))
);
const VoiceTranslatorProPage = lazyWithRetry(() =>
  import('./translator/VoiceTranslatorProPage').then((m) => ({ default: m.VoiceTranslatorProPage }))
);
const TranslatorSuiteSettingsModal = lazyWithRetry(() =>
  import('./translator/TranslatorSuiteSettingsModal').then((m) => ({ default: m.TranslatorSuiteSettingsModal }))
);

const SubpageFallback = (
  <div className="min-h-[32vh] flex items-center justify-center">
    <Loader2 className="w-6 h-6 text-[#B8860B] animate-spin" />
  </div>
);

interface GeezTranslatorProps {
  onSaveInsight: (item: Omit<SavedItem, 'id' | 'createdAt'>) => void;
  user?: UserProfile;
  onOpenAuthModal?: (mode?: 'login' | 'signup' | 'otp') => void;
  onOpenPaymentCheckout?: () => void;
  initialFeature?: TranslatorFeatureView;
  featureRequestVersion?: number;
  initialInputText?: string;
  onInitialInputConsumed?: () => void;
}

const THEME_STORAGE_KEY = 'axumite_translator_theme_v1';
const UI_LANG_STORAGE_KEY = 'axumite_translator_ui_lang_v1';

const HUB_TTS_PLAYBACK_ID = 'geez_translator_hub_output';

const GeezTranslatorWorkspace: React.FC<GeezTranslatorProps> = ({
  onSaveInsight,
  user,
  onOpenAuthModal,
  onOpenPaymentCheckout,
  initialFeature = 'hub',
  featureRequestVersion = 0,
  initialInputText = '',
  onInitialInputConsumed,
}) => {
  const [activeFeature, setActiveFeature] = useState<TranslatorFeatureView>(initialFeature);
  const [themeMode, setThemeMode] = useState<TranslatorThemeMode>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'dark' || saved === 'cream') return saved;
    } catch {}
    return 'cream';
  });
  const [uiLang, setUiLang] = useState<TranslatorUiLanguage>(() => {
    try {
      const saved = localStorage.getItem(UI_LANG_STORAGE_KEY);
      if (saved === 'ti' || saved === 'en') return saved;
    } catch {}
    return 'ti';
  });
  const isTi = uiLang === 'ti';

  const handleUiLangChange = (next: TranslatorUiLanguage) => {
    setUiLang(next);
    try {
      localStorage.setItem(UI_LANG_STORAGE_KEY, next);
    } catch {}
  };
  const { downloadedPacksCount, isOfflineActive, forceOfflineMode } = useOfflinePacks();
  const { playingAudioId } = useTranslationPlayback();
  const { lastSubscriptionDenial } = useTranslationSubscription();
  const {
    translateText,
    playTranslatedSpeech,
    stopSpeechPlayback,
    setForceOfflineMode,
    clearSubscriptionDenial,
  } = useTranslationActions();
  const [settingsModalTab, setSettingsModalTab] = useState<'plans' | 'api' | 'privacy' | null>(null);

  const [inputText, setInputText] = useState('');
  const [sourceLang, setSourceLang] = useState('English');
  const [targetLang, setTargetLang] = useState('Tigrinya');
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isVoiceLoopExpanded, setIsVoiceLoopExpanded] = useState(false);
  const [loopPrimaryLang, setLoopPrimaryLang] = useState('Tigrinya');
  const [loopPartnerLang, setLoopPartnerLang] = useState('English');

  const isPlayingAudio = playingAudioId === HUB_TTS_PLAYBACK_ID;

  const voiceLoopSectionRef = useRef<HTMLDivElement>(null);
  const studioTopRef = useRef<HTMLDivElement>(null);
  const hasMountedRef = useRef(false);

  const [guestLimitState, setGuestLimitState] = useState(() =>
    checkGuestLimit('translation', user?.email, user?.role)
  );

  useEffect(() => {
    setGuestLimitState(checkGuestLimit('translation', user?.email, user?.role));
  }, [user]);

  useEffect(() => {
    setActiveFeature(initialFeature);
  }, [initialFeature, featureRequestVersion]);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      if (activeFeature === 'hub') return;
    }
    if (studioTopRef.current) {
      studioTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeFeature]);

  useEffect(() => {
    stopSpeechPlayback();
  }, [activeFeature, stopSpeechPlayback]);

  useEffect(() => {
    const trimmed = initialInputText.trim();
    if (!trimmed) return;
    const hasEthiopic = /[\u1200-\u137F]/.test(trimmed);
    const nextSrc = hasEthiopic ? 'Tigrinya' : 'English';
    const nextTgt = hasEthiopic ? 'English' : 'Tigrinya';
    setSourceLang(nextSrc);
    setTargetLang(nextTgt);
    setInputText(trimmed);
    handleTranslate(trimmed, nextSrc, nextTgt);
    onInitialInputConsumed?.();
  }, [initialInputText]);

  const toggleTheme = () => {
    triggerTabTapHaptic();
    const next: TranslatorThemeMode = themeMode === 'cream' ? 'dark' : 'cream';
    setThemeMode(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {}
  };

  const t = getTranslatorThemeTokens(themeMode);

  // Fidel Punctuation & Numerals Keyboard Shortcuts
  const fidelKeyboard = [
    { label: '፡', desc: 'Word Separator' },
    { label: '፣', desc: 'Comma' },
    { label: '፤', desc: 'Semicolon' },
    { label: '፦', desc: 'Preface' },
    { label: '፨', desc: 'Paragraph' },
    { label: '፩', desc: '1' },
    { label: '፪', desc: '2' },
    { label: '፫', desc: '3' },
    { label: '፬', desc: '4' },
    { label: '፭', desc: '5' },
    { label: '፲', desc: '10' },
    { label: '፻', desc: '100' },
  ];

  const handleTranslate = async (textToUse?: string, srcOverride?: string, tgtOverride?: string) => {
    const text = textToUse !== undefined ? textToUse : inputText;
    const src = srcOverride || sourceLang;
    const tgt = tgtOverride || targetLang;
    if (!text.trim() || isLoading) return;

    // Enforce guest usage limit only for online cloud requests
    if (!isOfflineActive) {
      const currentLimit = checkGuestLimit('translation', user?.email, user?.role);
      if (!currentLimit.allowed) {
        setGuestLimitState(currentLimit);
        setResult({
          sourceText: text,
          translatedText: `⚠️ Guest Translation Limit Reached (${currentLimit.max}/${currentLimit.max}). Please register or sign in for unlimited neural translations.`,
          phoneticGeEz: 'ደረት ጋሻ ተወዲኡ እዩ።',
          transliteration: 'Deret gasha tewedi-u eyu. Please sign in.',
          culturalContext: 'Unlimited translation is available to verified members.',
        });
        return;
      }

      incrementGuestUsage('translation', user?.email, user?.role);
      setGuestLimitState(checkGuestLimit('translation', user?.email, user?.role));
    }

    setIsLoading(true);
    setTranslationError(null);
    try {
      const response = await translateText({
        text,
        sourceLanguage: src,
        targetLanguage: tgt,
      });
      setResult(response.translation);
    } catch (err: any) {
      console.error('Translation error:', err);
      setTranslationError(
        err?.message ||
          (isTi
            ? 'ትርጉም ምርካብ ኣይተኻእለን። በጃኹም እንደገና ፈትኑ።'
            : 'Translation failed. Please verify your connection and try again.')
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwap = () => {
    const temp = sourceLang;
    setSourceLang(targetLang);
    setTargetLang(temp);
  };

  const handleCopy = () => {
    if (result) {
      navigator.clipboard.writeText(`${result.translatedText}\nPhonetic: ${result.transliteration}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSpeakTranslated = async (textToSpeak: string) => {
    if (!textToSpeak) return;
    if (isPlayingAudio) {
      stopSpeechPlayback();
      return;
    }
    await playTranslatedSpeech(textToSpeak, targetLang, HUB_TTS_PLAYBACK_ID, {
      voice: 'Kore',
      maxChars: 300,
    });
  };

  const samplePhrases = [
    {
      label: isTi ? 'ምስላ ባህሊ ትግርኛ' : 'Tigrinya Heritage Proverb',
      text: 'ሰላም፤ ብሩክ መዓልቲ ይግበረልና። ፍልጠት ካብ ወርቂ ይበልጽ።',
    },
    {
      label: isTi ? 'ሰላምታ ንግስነት ኣክሱም' : 'Axum Royalty Greeting (Tigrinya)',
      text: 'ሰላምን ክብርን ንንግስነትን ህዝብን ኣክሱም ይኹን።',
    },
    {
      label: isTi ? 'ጥበብ (እንግሊዝኛ ➔ ትግርኛ)' : 'Wisdom Proverb (English to Tigrinya)',
      text: 'Wisdom is greater than gold, and understanding is a fountain of life.',
    },
    {
      label: isTi ? 'ጽሑፍ ሓወልቲ (ግዕዝ)' : "Stela Dedication (Ge'ez Script)",
      text: 'Built for eternity under the light of the heavens.',
    },
    {
      label: isTi ? 'ዓለማዊ ሓድነት' : 'Global Unity (All Languages)',
      text: 'Technology connects humanity across cultures, languages, and generations.',
    },
  ];

  const categories: Array<LanguageOption['category']> = [
    'Horn of Africa & Semitic',
    'European',
    'Asian & Middle Eastern',
    'African',
    'Classical & Ancient',
  ];

  const targetCap = getLanguageCapability(targetLang);

  return (
    <div
      ref={studioTopRef}
      className={`max-w-6xl mx-auto space-y-5 rounded-3xl p-4 sm:p-6 transition-colors duration-300 scroll-mt-20 ${t.pageShell}`}
    >
      {/* Top Studio Header Bar: Theme Mode + Language + Plans/Privacy/API */}
      <div className={`flex flex-wrap items-center justify-between gap-3 pb-4 border-b ${t.border}`}>
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${t.goldIconBox}`}>
            <Languages className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1
              className={`text-base sm:text-xl font-extrabold tracking-tight leading-snug ${
                isTi ? 'font-ethiopic' : ''
              } ${t.textPrimary}`}
            >
              {isTi ? 'ኣክሱማይት AI ማእከል ትርጉም' : 'Axumite AI Multilingual Translator'}
            </h1>
            <p className={`text-xs leading-relaxed ${isTi ? 'font-ethiopic' : ''} ${t.textMuted}`}>
              {isTi
                ? 'ትግርኛ፡ ግዕዝ፡ ኣምሓርኛ፡ ኩናማ፡ ኢሮብን ኩሎም ዓለማዊ ቋንቋታትን'
                : "Tigrinya, Ge'ez, Amharic, Kunama, Irob & Global AI Translation Suite"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setSettingsModalTab('plans')}
            className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition whitespace-nowrap shrink-0 ${
              isTi ? 'font-ethiopic' : ''
            } ${t.secondaryButton}`}
          >
            <CreditCard className="w-3.5 h-3.5 text-[#B8860B] shrink-0" />
            <span>{isTi ? 'መደባት' : 'Plans'}</span>
          </button>

          <button
            type="button"
            onClick={() => setSettingsModalTab('privacy')}
            className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition whitespace-nowrap shrink-0 ${
              isTi ? 'font-ethiopic' : ''
            } ${t.secondaryButton}`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#B8860B] shrink-0" />
            <span>{isTi ? 'ምስጢራውነት' : 'Privacy'}</span>
          </button>

          <button
            type="button"
            onClick={() => setSettingsModalTab('api')}
            className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition whitespace-nowrap shrink-0 ${
              isTi ? 'font-ethiopic' : ''
            } ${t.secondaryButton}`}
          >
            <Code2 className="w-3.5 h-3.5 text-[#B8860B] shrink-0" />
            <span>{isTi ? 'API መምርሒ' : 'API Docs'}</span>
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition whitespace-nowrap shrink-0 ${
              isTi ? 'font-ethiopic' : ''
            } ${t.goldBadge}`}
            title={
              isTi
                ? 'ኣብ መንጎ ብርሃንን ጸሊም ቅድን ቀይር'
                : 'Switch between Cream-White Light and Sovereign Dark themes'
            }
          >
            {themeMode === 'cream' ? (
              <Moon className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <Sun className="w-3.5 h-3.5 shrink-0" />
            )}
            <span>
              {themeMode === 'cream'
                ? isTi
                  ? 'ጸሊም ቅዲ'
                  : 'Dark Mode'
                : isTi
                  ? 'ብርሃን ቅዲ'
                  : 'Cream Light'}
            </span>
          </button>
        </div>
      </div>

      {lastSubscriptionDenial && (
        <div
          role="alert"
          className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 flex flex-wrap items-center justify-between gap-3"
        >
          <div className="flex items-start gap-2.5 min-w-0">
            <ShieldCheck className="w-5 h-5 text-[#B8860B] shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className={`text-xs sm:text-sm font-bold ${isTi ? 'font-ethiopic' : ''} ${t.textPrimary}`}>
                {isTi ? lastSubscriptionDenial.tigrinyaMessage : lastSubscriptionDenial.message}
              </p>
              <p className={`text-[11px] ${t.textMuted}`}>
                Status: {lastSubscriptionDenial.subscriptionStatus || 'FREE'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {lastSubscriptionDenial.reason === 'UNAUTHENTICATED' && onOpenAuthModal ? (
              <button
                type="button"
                onClick={() => onOpenAuthModal('login')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${t.primaryButton}`}
              >
                {isTi ? 'እተው' : 'Sign In'}
              </button>
            ) : (
              onOpenPaymentCheckout && (
                <button
                  type="button"
                  onClick={onOpenPaymentCheckout}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${t.primaryButton}`}
                >
                  {isTi ? 'ናብ Pro ኣመሓይሽ' : 'Upgrade to Pro'}
                </button>
              )
            )}
            <button
              type="button"
              onClick={clearSubscriptionDenial}
              aria-label="Dismiss subscription notice"
              className={`p-1.5 rounded-lg cursor-pointer ${t.secondaryButton}`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Dedicated Feature Subpages (lazy-loaded on demand; Offline kept static for offline reliability) */}
      <Suspense fallback={SubpageFallback}>
        {activeFeature === 'conversation' && (
          <ConversationTranslatorPage
            theme={themeMode}
            user={user}
            onBack={() => setActiveFeature('hub')}
            onSaveInsight={onSaveInsight}
          />
        )}

        {activeFeature === 'screen-capture' && (
          <ScreenCaptureTranslatorPage
            theme={themeMode}
            user={user}
            onBack={() => setActiveFeature('hub')}
            onSaveInsight={onSaveInsight}
          />
        )}

        {activeFeature === 'call-translation' && (
          <LiveCallTranslatorPage
            theme={themeMode}
            user={user}
            onBack={() => setActiveFeature('hub')}
            onSaveInsight={onSaveInsight}
          />
        )}

        {activeFeature === 'camera-ocr' && (
          <CameraOcrTranslatorPage
            theme={themeMode}
            user={user}
            onBack={() => setActiveFeature('hub')}
            onSaveInsight={onSaveInsight}
          />
        )}

        {activeFeature === 'voice-translation' && (
          <VoiceTranslatorProPage
            theme={themeMode}
            user={user}
            onBack={() => setActiveFeature('hub')}
            onSaveInsight={onSaveInsight}
            onOpenVoiceLoopDashboard={() => {
              setActiveFeature('hub');
              setIsVoiceLoopExpanded(true);
              setTimeout(() => {
                voiceLoopSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }, 80);
            }}
          />
        )}
      </Suspense>

      {activeFeature === 'offline-translation' && (
        <OfflineTranslationPage
          theme={themeMode}
          user={user}
          forceOfflineMode={forceOfflineMode}
          onToggleForceOfflineMode={setForceOfflineMode}
          onBack={() => setActiveFeature('hub')}
        />
      )}

      {/* Main Dashboard: Immediate Translation Box First, Modes & Voice Loop Cleanly Below */}
      {activeFeature === 'hub' && (
        <div className="space-y-6">
          {user?.role === 'Guest' && (
            <GuestLimitBanner
              feature="translation"
              remaining={guestLimitState.remaining}
              max={guestLimitState.max}
              onOpenUpgradeOrAuth={() => {
                if (onOpenAuthModal) onOpenAuthModal('signup');
              }}
            />
          )}

          {/* Popular Fast Language Pairs */}
          <div className={`p-4 rounded-2xl space-y-2.5 ${t.cardBg}`}>
            <div className="flex items-center justify-between gap-2">
              <span
                className={`text-xs font-bold flex items-center space-x-1.5 ${
                  isTi ? 'font-ethiopic' : 'tracking-wide'
                } ${t.goldText}`}
              >
                <Globe className="w-4 h-4 shrink-0" />
                <span>{isTi ? 'ቀልጣፍ መምረጺ ቋንቋታት' : 'Quick Language Pairs'}</span>
              </span>
              <span className={`text-xs ${isTi ? 'font-ethiopic' : ''} ${t.textMuted}`}>
                {isTi ? 'ሓደ ጠውቕ' : '1-Tap Switch'}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {POPULAR_LANGUAGE_PAIRS.map((pair, idx) => {
                const isSelected = sourceLang === pair.source && targetLang === pair.target;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSourceLang(pair.source);
                      setTargetLang(pair.target);
                      if (pair.source === 'Tigrinya' || pair.target === 'Tigrinya') {
                        setLoopPrimaryLang('Tigrinya');
                        setLoopPartnerLang(pair.source === 'Tigrinya' ? pair.target : pair.source);
                      } else {
                        setLoopPrimaryLang(pair.source);
                        setLoopPartnerLang(pair.target);
                      }
                      if (inputText.trim()) {
                        handleTranslate(inputText, pair.source, pair.target);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isSelected ? t.primaryButton : t.secondaryButton
                    }`}
                  >
                    {pair.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dual-Column Text & Ge'ez Fidel Breakdown Workspace */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Input Column */}
            <div className="space-y-4">
              <div className={`rounded-3xl p-5 space-y-4 ${t.cardBg}`}>
                <div className="flex items-center justify-between gap-2">
                  <select
                    value={sourceLang}
                    onChange={(e) => setSourceLang(e.target.value)}
                    className={`flex-1 rounded-xl text-xs p-2.5 focus:outline-none ${t.inputBg}`}
                  >
                    {categories.map((cat) => (
                      <optgroup key={cat} label={`── ${cat} ──`}>
                        {ALL_INTERNATIONAL_LANGUAGES.filter((l) => l.category === cat).map((lang) => (
                          <option key={`src-${lang.code}`} value={lang.name}>
                            {lang.flag ? `${lang.flag} ` : ''}
                            {lang.name} ({lang.nativeName})
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={handleSwap}
                    className={`p-2.5 rounded-xl cursor-pointer ${t.secondaryButton}`}
                    title="Swap Languages"
                  >
                    <ArrowRightLeft className="w-4 h-4" />
                  </button>

                  <select
                    value={targetLang}
                    onChange={(e) => setTargetLang(e.target.value)}
                    className={`flex-1 rounded-xl text-xs p-2.5 focus:outline-none ${t.inputBg}`}
                  >
                    {categories.map((cat) => (
                      <optgroup key={cat} label={`── ${cat} ──`}>
                        {ALL_INTERNATIONAL_LANGUAGES.filter((l) => l.category === cat).map((lang) => (
                          <option key={`tgt-${lang.code}`} value={lang.name}>
                            {lang.flag ? `${lang.flag} ` : ''}
                            {lang.name} ({lang.nativeName})
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                {targetCap.coverageTier === 'community-validated' && (
                  <p className={`text-[11px] px-3 py-1.5 rounded-xl ${t.subCardBg} ${t.textMuted}`}>
                    {targetLang}: {targetCap.coverageNote}
                  </p>
                )}

                <div className="space-y-1.5">
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={
                      isTi
                        ? `ካብ ${sourceLang} ናብ ${targetLang} ንምትርጓም ኣብዚ ጽሓፍ ወይ ለጥፍ...`
                        : `Type or paste text to translate from ${sourceLang} to ${targetLang}...`
                    }
                    className={`w-full rounded-2xl p-3.5 text-sm focus:outline-none min-h-[115px] resize-none font-ethiopic ${t.inputBg}`}
                  />
                </div>

                {/* Fidel Characters Keyboard */}
                <div className="space-y-1.5">
                  <span className={`text-xs font-bold block ${isTi ? 'font-ethiopic' : ''} ${t.goldText}`}>
                    {isTi ? 'ምልክታት ስርዓተ-ነጥብን ኣሃዛት ግዕዝን' : 'Fidel Punctuation & Numerals'}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {fidelKeyboard.map((char, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setInputText((prev) => prev + char.label)}
                        className={`min-w-[34px] min-h-[34px] px-2.5 py-1 text-xs font-bold rounded-lg transition-all font-ethiopic cursor-pointer ${t.secondaryButton}`}
                        title={char.desc}
                      >
                        {char.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleTranslate()}
                  disabled={!inputText.trim() || isLoading}
                  className={`w-full min-h-[44px] flex items-center justify-center space-x-2 py-3 disabled:opacity-40 font-extrabold text-xs sm:text-sm rounded-2xl transition-all cursor-pointer ${
                    isTi ? 'font-ethiopic' : 'tracking-wide'
                  } ${t.primaryButton}`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>
                        {isTi
                          ? `ካብ ${sourceLang} ናብ ${targetLang} ይትርጎም ኣሎ...`
                          : `Translating between ${sourceLang} & ${targetLang}...`}
                      </span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>
                        {isTi
                          ? `${isOfflineActive ? 'ብዘይ ኢንተርነት ተርጉም' : 'ተርጉምን ተንትንን'} (${sourceLang} ➔ ${targetLang})`
                          : `${isOfflineActive ? 'Translate Offline' : 'Translate & Analyze'} (${sourceLang} ➔ ${targetLang})`}
                      </span>
                    </>
                  )}
                </button>
              </div>

              {/* Preset Sample Phrases */}
              <div className={`p-4 rounded-3xl space-y-2.5 ${t.cardBg}`}>
                <span className={`text-xs font-bold block ${isTi ? 'font-ethiopic' : ''} ${t.goldText}`}>
                  {isTi ? 'ናይ ምሳሌ ታሪኻውን ዓለማውን ሓረጋት ፈትን' : 'Try Sample Historical & Global Phrases'}
                </span>
                <div className="space-y-1.5">
                  {samplePhrases.map((sp, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setInputText(sp.text);
                        handleTranslate(sp.text);
                      }}
                      className={`w-full text-left p-2.5 rounded-2xl text-xs transition-all flex items-center justify-between group cursor-pointer ${t.subCardBg}`}
                    >
                      <span className={`font-semibold ${t.goldText}`}>{sp.label}</span>
                      <span className={`text-[11px] truncate ml-2 ${t.textMuted}`}>
                        &ldquo;{sp.text}&rdquo;
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Output Column */}
            <div className={`rounded-3xl p-5 flex flex-col justify-between space-y-4 ${t.cardBg}`}>
              <div>
                <div className={`flex flex-wrap items-center justify-between gap-2 pb-3 border-b ${t.border}`}>
                  <span
                    className={`text-xs sm:text-sm font-bold flex items-center space-x-1.5 ${
                      isTi ? 'font-ethiopic' : 'serif-luxury tracking-wide'
                    } ${t.goldText}`}
                  >
                    <BookOpen className="w-4 h-4 shrink-0" />
                    <span>{isTi ? 'ውጽኢት ትርጉምን ትንታነ ፊደላትን' : 'Translation & Fidel Breakdown'}</span>
                  </span>

                  {result && (
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => handleSpeakTranslated(result.translatedText)}
                        className={`min-h-[34px] flex items-center space-x-1 px-2.5 py-1 text-xs transition-colors cursor-pointer rounded-lg whitespace-nowrap shrink-0 ${
                          isTi ? 'font-ethiopic' : ''
                        } ${t.secondaryButton}`}
                      >
                        {isPlayingAudio ? (
                          <>
                            <VolumeX className="w-3.5 h-3.5 text-rose-500" />
                            <span>{isTi ? 'ጠጠው ኣብል' : 'Stop'}</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3.5 h-3.5" />
                            <span>{isTi ? 'ስማዕ' : 'Listen'}</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleCopy}
                        className={`min-h-[34px] flex items-center space-x-1 px-2.5 py-1 text-xs transition-colors cursor-pointer rounded-lg whitespace-nowrap shrink-0 ${
                          isTi ? 'font-ethiopic' : ''
                        } ${t.secondaryButton}`}
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copied ? (isTi ? 'ተቐዲሑ' : 'Copied') : isTi ? 'ቅዳሕ' : 'Copy'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          onSaveInsight({
                            title: `Translation [${targetLang}]: ${result.translatedText.substring(0, 30)}`,
                            type: 'translation',
                            content: result.translatedText,
                            tags: ['translation', result.scriptName, targetLang],
                            metadata: result,
                          })
                        }
                        className={`min-h-[34px] flex items-center space-x-1 px-2.5 py-1 text-xs transition-colors cursor-pointer rounded-lg whitespace-nowrap shrink-0 ${
                          isTi ? 'font-ethiopic' : ''
                        } ${t.goldBadge}`}
                      >
                        <BookmarkPlus className="w-3.5 h-3.5" />
                        <span>{isTi ? 'ዓቅብ' : 'Save'}</span>
                      </button>
                    </div>
                  )}
                </div>

                {translationError && (
                  <div
                    role="alert"
                    className="mt-3 flex items-start justify-between gap-2 rounded-2xl border border-rose-500/40 bg-rose-950/40 px-3.5 py-2.5 text-xs text-rose-200"
                  >
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>{translationError}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setTranslationError(null)}
                      aria-label="Dismiss error"
                      className="text-rose-300 hover:text-white cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {isLoading ? (
                  <div className="py-16 flex flex-col items-center justify-center space-y-3 text-center">
                    <Loader2 className="w-8 h-8 text-[#B8860B] animate-spin" />
                    <p className={`text-xs font-medium leading-relaxed ${isTi ? 'font-ethiopic' : ''} ${t.textMuted}`}>
                      {isTi
                        ? 'ቃላት፡ ፊደላት ግዕዝን ኣደማምጻን ይትንተን ኣሎ...'
                        : 'Deconstructing linguistics, Fidel root glyphs and phonetic transliteration...'}
                    </p>
                  </div>
                ) : result ? (
                  <div className="mt-4 space-y-4">
                    <div className={`p-4 rounded-2xl text-center space-y-2 ${t.cardElevated}`}>
                      <div className={`flex items-center justify-between text-xs border-b pb-1.5 ${t.border} ${t.goldText}`}>
                        <span>{result.scriptName || `${targetLang} Script`}</span>
                        <span className={isTi ? 'font-ethiopic' : ''}>
                          {isTi ? `ዕላማ: ${targetLang}` : `Target: ${targetLang}`}
                        </span>
                      </div>
                      <p className={`text-xl sm:text-2xl font-bold font-ethiopic leading-relaxed pt-1 ${t.textPrimary}`}>
                        {result.translatedText}
                      </p>
                      {result.transliteration && (
                        <p className={`text-xs font-mono italic ${t.textMuted}`}>
                          {isTi ? 'ኣደማምጻ' : 'Phonetic'}: &ldquo;{result.transliteration}&rdquo;
                        </p>
                      )}
                    </div>

                    {result.wordBreakdown && result.wordBreakdown.length > 0 && (
                      <div className="space-y-2">
                        <span className={`text-xs font-semibold block ${isTi ? 'font-ethiopic' : ''} ${t.textSecondary}`}>
                          {isTi ? 'ትንታነ ቃል ብቃል' : 'Word-by-Word Analysis'}
                        </span>
                        <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                          {result.wordBreakdown.map((wb, idx) => (
                            <div
                              key={idx}
                              className={`p-2.5 rounded-xl flex items-center justify-between text-xs ${t.subCardBg}`}
                            >
                              <div>
                                <span className={`font-bold font-ethiopic mr-2 ${t.goldText}`}>
                                  {wb.translatedWord}
                                </span>
                                {wb.phonetic && (
                                  <span className={`text-[11px] ${t.textMuted}`}>({wb.phonetic})</span>
                                )}
                              </div>
                              <span className={`text-[11px] px-2 py-0.5 rounded-md ${t.cardBg}`}>
                                {wb.meaning}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {result.culturalContext && (
                      <div className={`p-3 rounded-2xl text-xs space-y-1 ${t.subCardBg}`}>
                        <span className={`font-bold text-xs block ${isTi ? 'font-ethiopic' : ''} ${t.goldText}`}>
                          {isTi ? 'ታሪኻውን ባህላውን ትርጉም' : 'Historical & Cultural Context'}
                        </span>
                        <p className={`leading-relaxed text-xs ${t.textMuted}`}>
                          {result.culturalContext}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-16 flex flex-col items-center justify-center text-center space-y-2.5">
                    <Languages className={`w-10 h-10 stroke-[1.5] ${t.textMuted}`} />
                    <p className={`text-xs sm:text-sm font-medium max-w-sm leading-relaxed ${isTi ? 'font-ethiopic' : ''} ${t.textMuted}`}>
                      {isTi
                        ? 'ኣብ ጸጋም ጽሑፍ ኣእቱ እሞ ኣብ መንጎ ትግርኛ፡ ግዕዝን ኩሎም ዓለማዊ ቋንቋታትን ብቕጽበት ተርጉም።'
                        : "Enter phrase on the left to translate between Tigrinya, Ge'ez and all international languages."}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Real-Time Bidirectional Voice Translation Loop */}
          <div ref={voiceLoopSectionRef}>
            <LiveVoiceTranslationLoop
              primaryLanguage={loopPrimaryLang}
              partnerLanguage={loopPartnerLang}
              onChangeLanguages={(primary, partner) => {
                setLoopPrimaryLang(primary);
                setLoopPartnerLang(partner);
                setSourceLang(primary);
                setTargetLang(partner);
              }}
              onSyncTranslationResult={(spokenSourceText, src, tgt, translationData) => {
                setInputText(spokenSourceText);
                setSourceLang(src);
                setTargetLang(tgt);
                setResult(translationData);
              }}
              onSaveInsight={onSaveInsight}
              user={user}
              onOpenAuthModal={onOpenAuthModal}
              onUsageUpdated={() => {
                setGuestLimitState(checkGuestLimit('translation', user?.email, user?.role));
              }}
              isExpanded={isVoiceLoopExpanded}
              onToggleExpand={() => setIsVoiceLoopExpanded((v) => !v)}
            />
          </div>

          {/* 6 Dedicated Translation Feature Modes */}
          <div className="space-y-3">
            <h2 className={`text-sm sm:text-base font-bold ${isTi ? 'font-ethiopic' : ''} ${t.textPrimary}`}>
              {isTi ? 'ካልኦት ናይ ትርጉም መሳርሒታት' : 'Other Translation Modes'}
            </h2>
            <TranslationFeatureCardsGrid
              variant={themeMode}
              language={uiLang}
              onLanguageChange={handleUiLangChange}
              isOfflineActive={isOfflineActive}
              downloadedPacksCount={downloadedPacksCount}
              onSelectFeature={(feature) => setActiveFeature(feature)}
            />
          </div>
        </div>
      )}

      {/* Subscription Plans, Privacy & API Docs Modal (lazy-loaded on demand) */}
      <Suspense fallback={null}>
        {settingsModalTab !== null && (
          <TranslatorSuiteSettingsModal
            isOpen={settingsModalTab !== null}
            initialTab={settingsModalTab || 'plans'}
            theme={themeMode}
            user={user}
            onClose={() => setSettingsModalTab(null)}
            onOpenPaymentCheckout={onOpenPaymentCheckout}
          />
        )}
      </Suspense>
    </div>
  );
};

export const GeezTranslator: React.FC<GeezTranslatorProps> = (props) => (
  <TranslationServiceProvider
    user={props.user}
    onOpenAuthModal={props.onOpenAuthModal}
    onOpenUpgradeModal={() => props.onOpenPaymentCheckout?.()}
  >
    <GeezTranslatorWorkspace {...props} />
  </TranslationServiceProvider>
);
