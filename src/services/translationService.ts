import {
  ALL_INTERNATIONAL_LANGUAGES,
  getLanguageCapability,
  LanguageCapabilities,
} from '../utils/languages';
import { AUDIO_TRANSLATION_LANGUAGES } from '../utils/audioTranslationLanguages';
import { base64PcmToWavDataUrl } from '../utils/welcomeAudioService';
import { TranslationResult, UserProfile, WordBreakdown } from '../types';
import { buildAuthorizedTranslatorApiHeaders, OcrOverlayBlock } from './translatorSuiteService';
import {
  isTranslationSubscriptionError,
  PREMIUM_FEATURE_META,
  PremiumTranslationFeature,
  TranslationSubscriptionError,
} from '../lib/translationSubscriptionGuard';
import {
  OfflineTranslationMatch,
  resolveLexiconField,
  translateTextOffline,
} from './offlinePackService';

export interface TranslatorVoiceOption {
  id: string;
  label: string;
  shortLabel: string;
}

export const TRANSLATOR_VOICE_OPTIONS: readonly TranslatorVoiceOption[] = [
  { id: 'Kore', label: 'Kore (Female • Clear)', shortLabel: 'Kore (Female)' },
  { id: 'Aoede', label: 'Aoede (Female • Warm)', shortLabel: 'Aoede (Female)' },
  { id: 'Fenrir', label: 'Fenrir (Male • Deep)', shortLabel: 'Fenrir (Male)' },
  { id: 'Charon', label: 'Charon (Male • Balanced)', shortLabel: 'Charon (Male)' },
] as const;

export const DEFAULT_OFFLINE_LANGUAGES: ReadonlyArray<{
  code: string;
  name: string;
  nativeName: string;
}> = [
  { code: 'ti', name: 'Tigrinya', nativeName: 'ትግርኛ' },
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'am', name: 'Amharic', nativeName: 'አማርኛ' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'zh', name: 'Chinese (Simplified)', nativeName: '简体中文' },
  { code: 'gez', name: "Ge'ez", nativeName: 'ግዕዝ' },
  { code: 'kun', name: 'Kunama', nativeName: 'Kunama (ኩናማ)' },
  { code: 'irob', name: 'Irob', nativeName: 'Saho-Irob (ኢሮብ)' },
] as const;

export type DetectedScript =
  | 'ethiopic'
  | 'arabic'
  | 'cjk'
  | 'cyrillic'
  | 'latin'
  | 'unknown';

export interface DetectedLanguageResult {
  language: string;
  code: string;
  script: DetectedScript;
  confidence: 'high' | 'medium' | 'low';
}

export interface OfflineTranslationWithDetection extends OfflineTranslationMatch {
  detectedSourceLanguage: string;
}

export interface TranslateTextParams {
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
  user?: UserProfile;
  preferOffline?: boolean;
  premiumMode?: boolean;
}

export interface TranslateTextResponse {
  translation: TranslationResult;
  usedOffline: boolean;
  detectedSourceLanguage: string;
  offlineMatch?: OfflineTranslationMatch;
}

export interface ConversationHistorySnippet {
  sourceLanguage: string;
  targetLanguage: string;
  sourceTranscript: string;
  translatedText: string;
}

export interface TranslateVoiceParams {
  prompt?: string;
  audioBase64?: string;
  mimeType?: string;
  sourceLanguage: string;
  targetLanguage: string;
  autoDetectPair?: boolean;
  conversationHistory?: ConversationHistorySnippet[];
  user?: UserProfile;
  preferOffline?: boolean;
}

export interface TranslateVoiceResponse {
  noSpeechDetected: boolean;
  detectedSourceLanguage: string;
  effectiveTargetLanguage: string;
  sourceTranscript: string;
  translatedText: string;
  spokenTargetText: string;
  transliteration: string;
  scriptName: string;
  wordBreakdown: WordBreakdown[];
  culturalContext: string;
  usedOffline: boolean;
}

export interface ScanOcrImageParams {
  imageDataUrl: string;
  targetLanguage: string;
  user?: UserProfile;
  preferOffline?: boolean;
}

export interface OcrScanResult {
  detectedLanguage: string;
  targetLanguage: string;
  originalText: string;
  translatedText: string;
  transliteration: string;
  blocks: OcrOverlayBlock[];
}

export interface SynthesizeSpeechParams {
  text: string;
  language: string;
  voice?: string;
  user?: UserProfile;
  preferOffline?: boolean;
  maxChars?: number;
}

export interface SynthesizeSpeechResult {
  wavDataUrl: string;
  sampleRate: number;
}

export interface CheckPronunciationParams {
  audioBase64?: string;
  mimeType?: string;
  spokenTranscript?: string;
  targetPhrase: string;
  targetLanguage: string;
  user?: UserProfile;
}

export interface PronunciationCheckResult {
  accuracyScore: number;
  transcribedSpeech: string;
  phoneticTip: string;
  encouragement: string;
}

// =========================================================================
// CENTRALIZED LANGUAGE DETECTION & LOCALE RESOLUTION
// =========================================================================

const GENERIC_DETECTED_LABELS = new Set([
  '',
  'auto',
  'auto-detect',
  'auto-detected',
  'unknown',
  'source',
]);

export function isAutoDetectLabel(lang?: string): boolean {
  return GENERIC_DETECTED_LABELS.has((lang || '').trim().toLowerCase());
}

export function normalizeLanguageName(input: string, fallback = 'English'): string {
  const clean = (input || '').trim();
  if (!clean) return fallback;
  const lower = clean.toLowerCase();
  if (GENERIC_DETECTED_LABELS.has(lower)) return fallback;

  const exactMatch = ALL_INTERNATIONAL_LANGUAGES.find(
    (l) =>
      l.name.toLowerCase() === lower ||
      l.code.toLowerCase() === lower ||
      l.nativeName.toLowerCase() === lower
  );
  if (exactMatch) return exactMatch.name;

  if (lower.includes('tigrinya') || lower.includes('tigrigna') || lower.includes('ትግርኛ')) {
    return 'Tigrinya';
  }
  if (lower.includes('amharic') || lower.includes('አማርኛ')) return 'Amharic';
  if (lower.includes("ge'ez") || lower.includes('geez') || lower.includes('ግዕዝ')) return "Ge'ez";
  if (lower.includes('kunama') || lower.includes('ኩናማ')) return 'Kunama';
  if (lower.includes('irob') || lower.includes('saho') || lower.includes('ኢሮብ')) return 'Irob';
  if (lower.includes('chinese') || lower.includes('mandarin') || lower.includes('中文')) {
    return 'Chinese (Simplified)';
  }
  if (lower.includes('deutsch') || lower.includes('german')) return 'German';
  if (lower.includes('arabic') || lower.includes('العربية')) return 'Arabic';
  if (lower.includes('french') || lower.includes('français')) return 'French';
  if (lower.includes('spanish') || lower.includes('español')) return 'Spanish';
  if (lower.includes('italian') || lower.includes('italiano')) return 'Italian';
  if (lower.includes('portuguese') || lower.includes('português')) return 'Portuguese';

  const partialMatch = ALL_INTERNATIONAL_LANGUAGES.find(
    (l) => l.name.toLowerCase().includes(lower) || lower.includes(l.name.toLowerCase())
  );
  return partialMatch ? partialMatch.name : clean;
}

const ETHIOPIC_REGEX = /[\u1200-\u137F\u1380-\u139F\u2D80-\u2DDF]/g;
const ARABIC_REGEX = /[\u0600-\u06FF\u0750-\u077F]/g;
const CJK_REGEX = /[\u4E00-\u9FFF\u3400-\u4DBF]/g;
const CYRILLIC_REGEX = /[\u0400-\u04FF]/g;

// Tigrinya-distinctive Ethiopic syllables (ቐ/ኸ series) & high-frequency lexical cues
const TIGRINYA_DISTINCT_CHARS = /[ቐቑቒቓቔቕቖኸኹኺኻኼኽኾ]/g;
const TIGRINYA_MARKERS = [
  'እዩ',
  'እያ',
  'እዮም',
  'የቐንየለይ',
  'ከመይ',
  'ብሩክ',
  'ኣሎ',
  'ኣለኹ',
  'ኣለና',
  'ናይ',
  'ካብ',
  'ምስ',
  'ኣብ',
  'ንስኻ',
  'ትግርኛ',
  'ቀጥታዊ',
  'ደውሊ',
  'በጃኹም',
  'ይበልጽ',
  'ፍልጠት',
];
const AMHARIC_MARKERS = [
  'ነው',
  'ናቸው',
  'አመሰግናለሁ',
  'እንዴት',
  'በጣም',
  'እባክዎ',
  'ነኝ',
  'አማርኛ',
  'ውስጥ',
  'እንደምን',
  'አለ',
  'ይህ',
  'ናት',
];
const GEEZ_MARKERS = [
  'እግዚአብሔር',
  'በስመ',
  'ወወልድ',
  'ሃሌ',
  'ሉያ',
  'ግዕዝ',
  'ዘአብ',
  'መንፈስ',
  'ቅዱስ',
];

interface LatinRule {
  language: string;
  code: string;
  accentRegex?: RegExp;
  words: string[];
}

const LATIN_LANGUAGE_RULES: readonly LatinRule[] = [
  {
    language: 'German',
    code: 'de',
    accentRegex: /[äöüß]/i,
    words: ['ich', 'und', 'nicht', 'danke', 'guten', 'morgen', 'bitte', 'hilfe', 'wasser', 'krankenhaus', 'wie', 'geht', 'der', 'die', 'das'],
  },
  {
    language: 'French',
    code: 'fr',
    accentRegex: /[éèêëàâçùûôîœ]/i,
    words: ['bonjour', 'merci', 'oui', 'non', 'eau', 'aide', 'comment', 'je', 'vous', 'avec', 'pour', 'hôpital', 'paix', 'sagesse'],
  },
  {
    language: 'Spanish',
    code: 'es',
    accentRegex: /[ñ¿¡áéíóú]/i,
    words: ['hola', 'gracias', 'buenos', 'días', 'agua', 'ayuda', 'necesito', 'por', 'favor', 'cómo', 'estás', 'hospital', 'paz'],
  },
  {
    language: 'Italian',
    code: 'it',
    accentRegex: /[àèéìòù]/i,
    words: ['ciao', 'grazie', 'buongiorno', 'acqua', 'aiuto', 'ospedale', 'come', 'stai', 'pace', 'saggezza', 'sono'],
  },
  {
    language: 'Portuguese',
    code: 'pt',
    accentRegex: /[ãõçáéíóúâêô]/i,
    words: ['olá', 'obrigado', 'obrigada', 'bom', 'dia', 'água', 'ajuda', 'preciso', 'você', 'como', 'está', 'paz'],
  },
  {
    language: 'Dutch',
    code: 'nl',
    words: ['hallo', 'dank', 'goedemorgen', 'alsjeblieft', 'water', 'ziekenhuis', 'hoe', 'gaat', 'het', 'met', 'jou'],
  },
  {
    language: 'Swedish',
    code: 'sv',
    accentRegex: /[åäö]/i,
    words: ['hej', 'tack', 'god', 'morgon', 'vatten', 'hjälp', 'sjukhus', 'hur', 'mår', 'du'],
  },
  {
    language: 'Kunama',
    code: 'kun',
    words: ['abish', 'kisha', 'shukra', 'bia', 'anna', 'nna', 'kunama'],
  },
  {
    language: 'Irob',
    code: 'irob',
    words: ['nagay', 'gadda', 'gaddaa', 'irob', 'saho', 'lee'],
  },
];

function countMarkerHits(text: string, markers: readonly string[]): number {
  let score = 0;
  for (const m of markers) {
    if (text.includes(m)) score += 2;
  }
  return score;
}

/**
 * Deterministic client-side script & lexical language detector shared across
 * Offline Translation, Live Conversation, Camera OCR, and Screen Capture.
 */
export function detectLanguageFromText(
  text: string,
  hintLanguages?: string[]
): DetectedLanguageResult {
  const trimmed = (text || '').trim();
  const normalizedHints = (hintLanguages || [])
    .filter((h) => !isAutoDetectLabel(h))
    .map((h) => normalizeLanguageName(h));

  if (!trimmed) {
    const fallback = normalizedHints[0] || 'English';
    const match = ALL_INTERNATIONAL_LANGUAGES.find((l) => l.name === fallback);
    return {
      language: fallback,
      code: match?.code || 'en',
      script: 'unknown',
      confidence: 'low',
    };
  }

  const ethiopicCount = (trimmed.match(ETHIOPIC_REGEX) || []).length;
  const arabicCount = (trimmed.match(ARABIC_REGEX) || []).length;
  const cjkCount = (trimmed.match(CJK_REGEX) || []).length;
  const cyrillicCount = (trimmed.match(CYRILLIC_REGEX) || []).length;

  // 1. Ethiopic / Ge'ez Fidel Script (Tigrinya vs Amharic vs Ge'ez)
  if (ethiopicCount >= 2 && ethiopicCount >= arabicCount && ethiopicCount >= cjkCount) {
    let tiScore = (trimmed.match(TIGRINYA_DISTINCT_CHARS) || []).length * 3 + countMarkerHits(trimmed, TIGRINYA_MARKERS);
    let amScore = countMarkerHits(trimmed, AMHARIC_MARKERS);
    let gezScore = countMarkerHits(trimmed, GEEZ_MARKERS);

    if (normalizedHints.includes('Tigrinya')) tiScore += 1;
    if (normalizedHints.includes('Amharic')) amScore += 1;
    if (normalizedHints.includes("Ge'ez")) gezScore += 1;

    if (gezScore > tiScore && gezScore > amScore) {
      return { language: "Ge'ez", code: 'gez', script: 'ethiopic', confidence: 'medium' };
    }
    if (amScore > tiScore) {
      return {
        language: 'Amharic',
        code: 'am',
        script: 'ethiopic',
        confidence: amScore >= 3 ? 'high' : 'medium',
      };
    }
    return {
      language: 'Tigrinya',
      code: 'ti',
      script: 'ethiopic',
      confidence: tiScore >= 3 ? 'high' : 'medium',
    };
  }

  // 2. Arabic Script
  if (arabicCount >= 2 && arabicCount >= cjkCount) {
    return { language: 'Arabic', code: 'ar', script: 'arabic', confidence: 'high' };
  }

  // 3. Chinese / CJK Script
  if (cjkCount >= 1) {
    return { language: 'Chinese (Simplified)', code: 'zh', script: 'cjk', confidence: 'high' };
  }

  // 4. Cyrillic Script
  if (cyrillicCount >= 2) {
    return { language: 'Russian', code: 'ru', script: 'cyrillic', confidence: 'high' };
  }

  // 5. Latin-script languages
  const lower = trimmed.toLowerCase();
  const tokens = lower.split(/[^a-zA-ZÀ-ÿ]+/).filter(Boolean);
  const tokenSet = new Set(tokens);

  let bestRule: LatinRule | null = null;
  let bestScore = 0;

  for (const rule of LATIN_LANGUAGE_RULES) {
    let score = 0;
    if (rule.accentRegex && rule.accentRegex.test(trimmed)) {
      score += 2;
    }
    for (const w of rule.words) {
      if (tokenSet.has(w)) score += 2;
    }
    if (normalizedHints.includes(rule.language) && score > 0) {
      score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      bestRule = rule;
    }
  }

  if (bestRule && bestScore >= 2) {
    return {
      language: bestRule.language,
      code: bestRule.code,
      script: 'latin',
      confidence: bestScore >= 4 ? 'high' : 'medium',
    };
  }

  const latinHint = normalizedHints.find((h) =>
    ['English', 'German', 'French', 'Spanish', 'Italian', 'Portuguese', 'Dutch', 'Swedish', 'Kunama', 'Irob'].includes(h)
  );
  const fallbackLang = latinHint || 'English';
  const fallbackObj = ALL_INTERNATIONAL_LANGUAGES.find((l) => l.name === fallbackLang);

  return {
    language: fallbackLang,
    code: fallbackObj?.code || 'en',
    script: 'latin',
    confidence: fallbackLang === 'English' ? 'medium' : 'low',
  };
}

/**
 * Single canonical BCP-47 speech recognition & synthesis locale resolver.
 */
export function resolveSpeechCode(languageName: string): string {
  const normalized = normalizeLanguageName(languageName, 'English');
  const lower = normalized.toLowerCase();
  const match = AUDIO_TRANSLATION_LANGUAGES.find(
    (l) => l.name.toLowerCase() === lower || l.nativeName.toLowerCase() === lower
  );
  if (match) return match.speechCode;
  if (lower.includes('tigrinya')) return 'ti-ER';
  if (lower.includes('amharic')) return 'am-ET';
  if (lower.includes("ge'ez") || lower.includes('geez')) return 'am-ET';
  if (lower.includes('arabic')) return 'ar-SA';
  if (lower.includes('german')) return 'de-DE';
  if (lower.includes('french')) return 'fr-FR';
  if (lower.includes('italian')) return 'it-IT';
  if (lower.includes('swedish')) return 'sv-SE';
  if (lower.includes('spanish')) return 'es-ES';
  if (lower.includes('portuguese')) return 'pt-PT';
  if (lower.includes('chinese')) return 'zh-CN';
  if (lower.includes('dutch')) return 'nl-NL';
  if (lower.includes('norwegian')) return 'no-NO';
  return 'en-US';
}

/**
 * Unified two-speaker conversation turn direction resolver (used by Live Conversation
 * & Live Voice Translation Loop).
 */
export function resolveConversationTurnDirection(params: {
  spokenText?: string;
  requestedSpeaker: 'A' | 'B';
  personALang: string;
  personBLang: string;
  autoDetect: boolean;
  serverDetectedSource?: string;
  serverEffectiveTarget?: string;
}): {
  speaker: 'A' | 'B';
  sourceLanguage: string;
  targetLanguage: string;
} {
  const {
    spokenText,
    requestedSpeaker,
    personALang,
    personBLang,
    autoDetect,
    serverDetectedSource,
    serverEffectiveTarget,
  } = params;

  const defaultSrc = requestedSpeaker === 'A' ? personALang : personBLang;
  const defaultTgt = requestedSpeaker === 'A' ? personBLang : personALang;

  let detectedSrc = !isAutoDetectLabel(serverDetectedSource)
    ? normalizeLanguageName(serverDetectedSource || '', defaultSrc)
    : '';

  if (!detectedSrc && spokenText?.trim()) {
    detectedSrc = detectLanguageFromText(spokenText, [personALang, personBLang]).language;
  }
  if (!detectedSrc) {
    detectedSrc = defaultSrc;
  }

  let speaker: 'A' | 'B' = requestedSpeaker;
  if (autoDetect && personALang.toLowerCase() !== personBLang.toLowerCase()) {
    if (detectedSrc.toLowerCase() === personBLang.toLowerCase()) {
      speaker = 'B';
    } else if (detectedSrc.toLowerCase() === personALang.toLowerCase()) {
      speaker = 'A';
    }
  }

  const derivedTarget = speaker === 'A' ? personBLang : personALang;
  const targetLanguage = !isAutoDetectLabel(serverEffectiveTarget)
    ? normalizeLanguageName(serverEffectiveTarget || '', derivedTarget)
    : derivedTarget;

  return {
    speaker,
    sourceLanguage: detectedSrc,
    targetLanguage,
  };
}

// =========================================================================
// CENTRALIZED OFFLINE + API TRANSLATION ORCHESTRATION
// =========================================================================

export async function translateOfflineWithDetection(
  text: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<OfflineTranslationWithDetection> {
  const resolvedSource = isAutoDetectLabel(sourceLanguage)
    ? detectLanguageFromText(text, [targetLanguage]).language
    : normalizeLanguageName(sourceLanguage);

  const match = await translateTextOffline(text, resolvedSource, targetLanguage);
  return {
    ...match,
    detectedSourceLanguage: resolvedSource,
  };
}

function buildOfflineTranslationResult(
  text: string,
  targetLanguage: string,
  match: OfflineTranslationMatch,
  labelSuffix: string
): TranslationResult {
  return {
    translatedText:
      match.translatedText ||
      `[Offline Pack: ${match.usedOfflinePack}] No glossary match for "${text}". Download packs or reconnect online for neural sentences.`,
    transliteration: match.transliteration || '',
    scriptName: `${targetLanguage} (${labelSuffix})`,
    culturalContext: match.coverageNote,
    wordBreakdown: [],
  };
}

function throwIfSubscriptionDeniedResponse(
  res: Response,
  data: any,
  feature: PremiumTranslationFeature
): void {
  if (
    (res.status === 401 || res.status === 403) &&
    (data?.error === 'PRO_SUBSCRIPTION_REQUIRED' || data?.requiresUpgrade)
  ) {
    const meta = PREMIUM_FEATURE_META[feature];
    const reason =
      res.status === 401 || data?.code === 'UNAUTHENTICATED'
        ? 'UNAUTHENTICATED'
        : data?.code === 'ACCOUNT_SUSPENDED'
          ? 'ACCOUNT_SUSPENDED'
          : data?.code === 'SUBSCRIPTION_EXPIRED'
            ? 'SUBSCRIPTION_EXPIRED'
            : data?.code === 'FEATURE_NOT_ENTITLED'
              ? 'FEATURE_NOT_ENTITLED'
              : 'SUBSCRIPTION_INACTIVE';

    throw new TranslationSubscriptionError({
      allowed: false,
      uid: '',
      feature,
      plan: 'free',
      subscriptionStatus: String(data?.subscriptionStatus || (res.status === 401 ? 'NONE' : 'INACTIVE')),
      expiresAt: null,
      source: 'backend_fallback',
      reason,
      message: data?.message || `Active Axumite Pro subscription required for ${meta.en}.`,
      tigrinyaMessage:
        data?.tigrinyaMessage || `${meta.ti} ንምጥቃም ንጡፍ ናይ Axumite Pro ኣባልነት የድሊ።`,
      checkedAt: new Date().toISOString(),
    });
  }
}

export async function translateTextApi(
  params: TranslateTextParams
): Promise<TranslateTextResponse> {
  const {
    text,
    sourceLanguage,
    targetLanguage,
    user,
    preferOffline = false,
    premiumMode = false,
  } = params;
  const resolvedSource = isAutoDetectLabel(sourceLanguage)
    ? detectLanguageFromText(text, [targetLanguage]).language
    : sourceLanguage;

  if (preferOffline) {
    const offlineMatch = await translateOfflineWithDetection(text, resolvedSource, targetLanguage);
    return {
      translation: buildOfflineTranslationResult(text, targetLanguage, offlineMatch, 'Offline Pack'),
      usedOffline: true,
      detectedSourceLanguage: offlineMatch.detectedSourceLanguage,
      offlineMatch,
    };
  }

  try {
    const headers = await buildAuthorizedTranslatorApiHeaders(user);
    const res = await fetch('/api/obelisk/translate', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        text,
        sourceLanguage: isAutoDetectLabel(sourceLanguage) ? 'Auto-Detect' : sourceLanguage,
        targetLanguage,
        ...(premiumMode ? { premiumMode: true } : {}),
      }),
    });

    const data = await res.json().catch(() => ({} as any));
    if (!res.ok) {
      throwIfSubscriptionDeniedResponse(res, data, 'premium_text_translation');
      throw new Error(
        data?.tigrinyaMessage || data?.message || data?.error || `Translation failed (HTTP ${res.status}).`
      );
    }

    const translation: TranslationResult = data.translation || data;
    return {
      translation,
      usedOffline: false,
      detectedSourceLanguage: resolvedSource,
    };
  } catch (err) {
    if (isTranslationSubscriptionError(err)) {
      throw err;
    }
    const offlineFallback = await translateOfflineWithDetection(text, resolvedSource, targetLanguage);
    if (offlineFallback.translatedText) {
      return {
        translation: buildOfflineTranslationResult(
          text,
          targetLanguage,
          offlineFallback,
          'Offline Fallback'
        ),
        usedOffline: true,
        detectedSourceLanguage: offlineFallback.detectedSourceLanguage,
        offlineMatch: offlineFallback,
      };
    }
    throw err;
  }
}

export async function translateVoiceApi(
  params: TranslateVoiceParams
): Promise<TranslateVoiceResponse> {
  const {
    prompt,
    audioBase64,
    mimeType,
    sourceLanguage,
    targetLanguage,
    autoDetectPair = false,
    conversationHistory,
    user,
    preferOffline = false,
  } = params;

  // Seamless offline fallback for typed turns in Conversation, Voice, or Call modes
  if (preferOffline) {
    if (prompt && prompt.trim()) {
      const hints = autoDetectPair ? [sourceLanguage, targetLanguage] : [sourceLanguage];
      const detected = isAutoDetectLabel(sourceLanguage) || autoDetectPair
        ? detectLanguageFromText(prompt, hints).language
        : sourceLanguage;
      const effectiveTarget =
        autoDetectPair &&
        detected.toLowerCase() === targetLanguage.toLowerCase() &&
        !isAutoDetectLabel(sourceLanguage)
          ? sourceLanguage
          : targetLanguage;

      const offlineMatch = await translateTextOffline(prompt, detected, effectiveTarget);
      if (offlineMatch.translatedText) {
        return {
          noSpeechDetected: false,
          detectedSourceLanguage: detected,
          effectiveTargetLanguage: effectiveTarget,
          sourceTranscript: prompt,
          translatedText: offlineMatch.translatedText,
          spokenTargetText: offlineMatch.translatedText,
          transliteration: offlineMatch.transliteration || '',
          scriptName: `${effectiveTarget} (Offline Pack)`,
          wordBreakdown: [],
          culturalContext: offlineMatch.coverageNote,
          usedOffline: true,
        };
      }
      throw new Error(
        offlineMatch.coverageNote ||
          'Offline mode active: download a language pack or reconnect online for full speech translation.'
      );
    }
    throw new Error(
      'Offline mode is active. Live microphone speech recognition requires internet—type a phrase to use downloaded offline packs.'
    );
  }

  const headers = await buildAuthorizedTranslatorApiHeaders(user);
  const res = await fetch('/api/obelisk/voice-translate', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      ...(prompt ? { prompt } : {}),
      ...(audioBase64 ? { audioBase64 } : {}),
      ...(mimeType ? { mimeType } : {}),
      sourceLanguage,
      targetLanguage,
      autoDetectPair,
      ...(conversationHistory && conversationHistory.length > 0 ? { conversationHistory } : {}),
    }),
  });

  const data = await res.json().catch(() => ({} as any));
  if (!res.ok) {
    throwIfSubscriptionDeniedResponse(res, data, 'voice_translation');
    throw new Error(
      data?.tigrinyaMessage ||
        data?.message ||
        data?.error ||
        `Voice translation failed (HTTP ${res.status}).`
    );
  }

  const transcript = data.sourceTranscript || prompt || '';
  const detectedSourceLanguage = !isAutoDetectLabel(data.detectedSourceLanguage)
    ? normalizeLanguageName(data.detectedSourceLanguage, sourceLanguage)
    : transcript
      ? detectLanguageFromText(
          transcript,
          autoDetectPair ? [sourceLanguage, targetLanguage] : [sourceLanguage]
        ).language
      : isAutoDetectLabel(sourceLanguage)
        ? 'Auto-Detected'
        : sourceLanguage;

  const effectiveTargetLanguage = !isAutoDetectLabel(data.effectiveTargetLanguage)
    ? normalizeLanguageName(data.effectiveTargetLanguage, targetLanguage)
    : targetLanguage;

  const translatedText = data.translatedText || '';
  return {
    noSpeechDetected: Boolean(data.noSpeechDetected || !translatedText),
    detectedSourceLanguage,
    effectiveTargetLanguage,
    sourceTranscript: transcript,
    translatedText,
    spokenTargetText: data.spokenTargetText || translatedText,
    transliteration: data.transliteration || '',
    scriptName: data.scriptName || `${effectiveTargetLanguage} Script`,
    wordBreakdown: Array.isArray(data.wordBreakdown) ? data.wordBreakdown : [],
    culturalContext: data.culturalContext || '',
    usedOffline: false,
  };
}

export async function scanOcrImageApi(params: ScanOcrImageParams): Promise<OcrScanResult> {
  const { imageDataUrl, targetLanguage, user, preferOffline = false } = params;

  if (preferOffline) {
    throw new Error(
      'Offline mode is active. Reconnect to the internet (or switch off Force Offline Mode) to run Camera & Screen OCR.'
    );
  }

  const mimeType = imageDataUrl.split(';')[0]?.replace('data:', '') || 'image/jpeg';
  const headers = await buildAuthorizedTranslatorApiHeaders(user);
  const res = await fetch('/api/obelisk/ocr-structured', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      imageBase64: imageDataUrl,
      mimeType,
      targetLanguage,
    }),
  });

  const data = await res.json().catch(() => ({} as any));
  if (!res.ok) {
    throwIfSubscriptionDeniedResponse(res, data, 'ocr_translation');
    throw new Error(
      data?.tigrinyaMessage ||
        data?.message ||
        data?.error ||
        `OCR image extraction failed (HTTP ${res.status}).`
    );
  }

  const originalText: string = data.fullOriginalText || '';
  const detectedLanguage = !isAutoDetectLabel(data.detectedLanguage)
    ? normalizeLanguageName(data.detectedLanguage)
    : originalText.trim()
      ? detectLanguageFromText(originalText).language
      : 'Auto-detected';

  return {
    detectedLanguage,
    targetLanguage,
    originalText,
    translatedText: data.fullTranslatedText || '',
    transliteration: data.transliteration || '',
    blocks: Array.isArray(data.blocks) ? data.blocks : [],
  };
}

export async function synthesizeSpeechApi(
  params: SynthesizeSpeechParams
): Promise<SynthesizeSpeechResult | null> {
  const { text, language, voice = 'Kore', user, preferOffline = false, maxChars = 320 } = params;
  const trimmed = (text || '').trim().slice(0, maxChars);
  if (!trimmed || preferOffline) return null;

  try {
    const headers = await buildAuthorizedTranslatorApiHeaders(user);
    const res = await fetch('/api/obelisk/tts', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        text: trimmed,
        voice,
        language,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.audioBase64) return null;
    const sampleRate = data.sampleRate || 24000;
    return {
      wavDataUrl: base64PcmToWavDataUrl(data.audioBase64, sampleRate),
      sampleRate,
    };
  } catch {
    return null;
  }
}

export async function checkPronunciationApi(
  params: CheckPronunciationParams
): Promise<PronunciationCheckResult> {
  const { audioBase64, mimeType, spokenTranscript, targetPhrase, targetLanguage, user } = params;
  const headers = await buildAuthorizedTranslatorApiHeaders(user);
  const res = await fetch('/api/obelisk/pronunciation-check', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      ...(audioBase64 ? { audioBase64 } : {}),
      ...(mimeType ? { mimeType } : {}),
      ...(spokenTranscript ? { spokenTranscript } : {}),
      targetPhrase,
      targetLanguage,
    }),
  });
  const data = await res.json().catch(() => ({} as any));
  if (!res.ok) {
    throwIfSubscriptionDeniedResponse(res, data, 'pronunciation_check');
    throw new Error(
      data?.tigrinyaMessage ||
        data?.message ||
        data?.error ||
        `Pronunciation check failed (HTTP ${res.status}).`
    );
  }
  return {
    accuracyScore: data.accuracyScore ?? 0,
    transcribedSpeech: data.transcribedSpeech || spokenTranscript || '',
    phoneticTip: data.phoneticTip || '',
    encouragement: data.encouragement || '',
  };
}

export { getLanguageCapability, resolveLexiconField };
export type { LanguageCapabilities, OfflineTranslationMatch };
