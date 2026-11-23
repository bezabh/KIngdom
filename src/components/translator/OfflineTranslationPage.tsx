import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRightLeft,
  CheckCircle2,
  Download,
  HardDrive,
  Loader2,
  RefreshCw,
  Trash2,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { CORE_SUPPORTED_LANGUAGES } from '../../utils/languages';
import { UserProfile } from '../../types';
import type { OfflineTranslationWithDetection } from '../../services/translationService';
import {
  useOfflinePacks,
  useTranslationActions,
} from '../../context/TranslationServiceContext';
import { getTranslatorThemeTokens, TranslatorThemeMode } from './translatorTheme';

interface OfflineTranslationPageProps {
  theme: TranslatorThemeMode;
  user?: UserProfile;
  forceOfflineMode: boolean;
  onToggleForceOfflineMode: (val: boolean) => void;
  onBack: () => void;
}

const OFFLINE_SAMPLES = ['hello', 'good morning', 'thank you', 'water', 'hospital', 'i need help', 'peace', 'wisdom'];

export const OfflineTranslationPage: React.FC<OfflineTranslationPageProps> = ({
  theme,
  forceOfflineMode,
  onToggleForceOfflineMode,
  onBack,
}) => {
  const t = getTranslatorThemeTokens(theme);

  const {
    availablePacks,
    downloadedPacks,
    storageStats,
    busyPackCode,
    offlineError: errorMsg,
    isOfflineActive: effectiveOffline,
    offlineLanguageOptions: offlineLangOptions,
  } = useOfflinePacks();
  const {
    refreshOfflinePacks,
    downloadPack,
    removePack,
    translateOffline,
    getLanguageCapability,
  } = useTranslationActions();

  // Offline translator test console
  const [sourceLang, setSourceLang] = useState('English');
  const [targetLang, setTargetLang] = useState('Tigrinya');
  const [testPhrase, setTestPhrase] = useState('thank you');
  const [offlineResult, setOfflineResult] = useState<OfflineTranslationWithDetection | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    refreshOfflinePacks(true);
  }, [refreshOfflinePacks]);

  const handleDownloadOrUpdate = async (code: string) => {
    try {
      await downloadPack(code);
    } catch {
      // Error surfaced via centralized offlineError state
    }
  };

  const handleDeletePack = async (code: string) => {
    try {
      await removePack(code);
    } catch {
      // Error surfaced via centralized offlineError state
    }
  };

  const handleRunOfflineTranslate = async (phraseOverride?: string) => {
    const input = phraseOverride !== undefined ? phraseOverride : testPhrase;
    if (!input.trim()) return;
    setLocalError(null);
    try {
      const match = await translateOffline(input, sourceLang, targetLang);
      setOfflineResult(match);
    } catch (err: any) {
      setLocalError(err?.message || 'Active Axumite Pro subscription is required for offline translation.');
    }
  };

  const formatKb = (bytes: number) => `${Math.max(1, Math.round(bytes / 1024))} KB`;
  const formatMb = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

  return (
    <div className={`rounded-3xl p-4 sm:p-6 space-y-5 ${t.pageShell}`}>
      {/* Header */}
      <div className={`flex flex-wrap items-center justify-between gap-3 pb-4 border-b ${t.border}`}>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className={`min-h-[42px] px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer ${t.secondaryButton}`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <div>
            <h2 className={`text-base sm:text-lg font-extrabold tracking-tight ${t.textPrimary}`}>
              Offline Translation
            </h2>
            <p className={`text-xs ${t.textMuted}`}>
              Download language packages, translate without internet, and manage downloaded languages
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
              effectiveOffline ? t.goldBadge : t.secondaryButton
            }`}
          >
            {effectiveOffline ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5 text-emerald-500" />}
            <span>{effectiveOffline ? 'Offline Engine Active' : 'Online Connected'}</span>
          </span>

          <button
            type="button"
            onClick={() => onToggleForceOfflineMode(!forceOfflineMode)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer ${
              forceOfflineMode ? t.primaryButton : t.secondaryButton
            }`}
          >
            {forceOfflineMode ? 'Switch to Auto Network' : 'Use Offline Mode'}
          </button>
        </div>
      </div>

      {/* Browser Storage Meter */}
      <div className={`rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 ${t.cardBg}`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${t.goldIconBox}`}>
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <p className={`text-xs font-bold ${t.textPrimary}`}>
              Device Offline Storage: {downloadedPacks.length} Pack{downloadedPacks.length === 1 ? '' : 's'} Installed ({formatKb(storageStats.packBytes)})
            </p>
            <p className={`text-[11px] ${t.textMuted}`}>
              Browser origin quota: {formatMb(storageStats.usedBytes)} used of {formatMb(storageStats.quotaBytes)} available
            </p>
          </div>
        </div>
      </div>

      {(localError || errorMsg) && (
        <div className={`rounded-2xl p-3 text-xs font-semibold text-rose-600 ${t.cardBg}`}>
          {localError || errorMsg}
        </div>
      )}

      {/* Offline Phrasebook / Lexicon Translator Test */}
      <div className={`rounded-2xl p-4 space-y-3 ${t.cardBg}`}>
        <h3 className={`text-xs font-bold uppercase tracking-wider ${t.goldText}`}>
          Instant Offline Translation Tester (Works Without Internet)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-2.5 items-center">
          <select
            value={sourceLang}
            onChange={(e) => setSourceLang(e.target.value)}
            aria-label="Offline source language"
            className={`rounded-xl px-3 py-2 text-xs focus:outline-none ${t.inputBg}`}
          >
            <option value="Auto-Detect">✨ Auto-Detect Language</option>
            {offlineLangOptions.map((l) => (
              <option key={`ofs-${l.code}`} value={l.name}>
                {l.name} ({l.nativeName})
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              if (sourceLang === 'Auto-Detect') {
                const resolved = offlineResult?.detectedSourceLanguage;
                const nextTarget =
                  resolved && resolved !== targetLang
                    ? resolved
                    : targetLang === 'English'
                      ? 'Tigrinya'
                      : 'English';
                setSourceLang(targetLang);
                setTargetLang(nextTarget);
                return;
              }
              const prevSrc = sourceLang;
              setSourceLang(targetLang);
              setTargetLang(prevSrc);
            }}
            aria-label="Swap offline languages"
            title="Swap offline source and target languages"
            className={`p-2 rounded-xl justify-self-center cursor-pointer ${t.secondaryButton}`}
          >
            <ArrowRightLeft className="w-4 h-4" />
          </button>
          <select
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value)}
            aria-label="Offline target language"
            className={`rounded-xl px-3 py-2 text-xs focus:outline-none ${t.inputBg}`}
          >
            {offlineLangOptions.map((l) => (
              <option key={`oft-${l.code}`} value={l.name}>
                {l.name} ({l.nativeName})
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {OFFLINE_SAMPLES.map((sample) => (
            <button
              key={sample}
              type="button"
              onClick={() => {
                setTestPhrase(sample);
                handleRunOfflineTranslate(sample);
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] cursor-pointer ${t.secondaryButton}`}
            >
              {sample}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleRunOfflineTranslate();
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={testPhrase}
            onChange={(e) => setTestPhrase(e.target.value)}
            placeholder="Enter phrase to translate using downloaded IndexedDB packs..."
            className={`flex-1 rounded-xl px-3 py-2 text-xs focus:outline-none ${t.inputBg}`}
          />
          <button
            type="submit"
            className={`min-h-[40px] px-4 rounded-xl text-xs cursor-pointer ${t.primaryButton}`}
          >
            Translate Offline
          </button>
        </form>

        {offlineResult && (
          <div className={`rounded-xl p-3.5 space-y-1.5 ${t.subCardBg}`}>
            <div className="flex items-center justify-between text-[11px]">
              <span className={`font-bold ${t.goldText}`}>
                {sourceLang === 'Auto-Detect' ? `Detected: ${offlineResult.detectedSourceLanguage} • ` : ''}
                Pack: {offlineResult.usedOfflinePack} • Mode: {offlineResult.matchedMode}
              </span>
              <span className={t.textMuted}>{offlineResult.coverageTier}</span>
            </div>
            {offlineResult.translatedText ? (
              <>
                <p className={`text-base font-bold font-ethiopic ${t.textPrimary}`}>
                  {offlineResult.translatedText}
                </p>
                {offlineResult.transliteration && (
                  <p className={`text-xs font-mono italic ${t.textMuted}`}>
                    Phonetic: {offlineResult.transliteration}
                  </p>
                )}
              </>
            ) : (
              <p className="text-xs text-amber-600 font-semibold">{offlineResult.coverageNote}</p>
            )}
          </div>
        )}
      </div>

      {/* Downloadable Language Packs Manager */}
      <div className="space-y-3">
        <h3 className={`text-xs font-bold uppercase tracking-wider ${t.goldText}`}>
          Manage Offline Language Packs ({availablePacks.length})
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {availablePacks.map((pack) => {
            const installed = downloadedPacks.find((d) => d.code === pack.code);
            const busy = busyPackCode === pack.code;
            return (
              <div key={pack.code} className={`rounded-2xl p-4 space-y-3 ${t.cardBg}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className={`text-sm font-extrabold ${t.textPrimary}`}>
                      {pack.name} ({pack.nativeName})
                    </h4>
                    <p className={`text-[11px] ${t.textMuted}`}>
                      v{pack.version} • {pack.entryCount} curated phrases • {formatKb(pack.estimatedBytes)}
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${t.goldBadge}`}>
                    {pack.coverageTier === 'community-validated' ? 'Community' : 'Full'}
                  </span>
                </div>

                {installed ? (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Installed</span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleDownloadOrUpdate(pack.code)}
                        className={`px-2.5 py-1.5 rounded-xl text-[11px] flex items-center gap-1 cursor-pointer ${t.secondaryButton}`}
                      >
                        {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                        <span>Update</span>
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleDeletePack(pack.code)}
                        className={`px-2.5 py-1.5 rounded-xl text-[11px] flex items-center gap-1 cursor-pointer ${t.dangerButton}`}
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleDownloadOrUpdate(pack.code)}
                    className={`w-full min-h-[38px] rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer ${t.primaryButton}`}
                  >
                    {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                    <span>Download Pack ({formatKb(pack.estimatedBytes)})</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Honest Language Support & Capability Matrix */}
      <div className={`rounded-2xl p-4 space-y-3 ${t.cardBg}`}>
        <h3 className={`text-xs font-bold uppercase tracking-wider ${t.goldText}`}>
          Supported Language Capability Matrix (Honest Mode Coverage)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {CORE_SUPPORTED_LANGUAGES.map((langName) => {
            const cap = getLanguageCapability(langName);
            return (
              <div key={langName} className={`rounded-xl p-2.5 text-xs space-y-1 ${t.subCardBg}`}>
                <div className="flex items-center justify-between">
                  <span className={`font-bold ${t.textPrimary}`}>{langName}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${t.goldBadge}`}>
                    {cap.coverageTier === 'community-validated' ? 'Community-Validated' : 'Full Neural'}
                  </span>
                </div>
                <p className={`text-[10.5px] ${t.textMuted}`}>
                  Text: {cap.text ? 'Yes' : 'No'} • Voice In: {cap.voiceInput ? 'Yes' : 'No'} • Voice Out:{' '}
                  {cap.voiceOutput ? 'Neural TTS' : 'Phonetic Guide'} • OCR: {cap.ocr ? 'Yes' : 'No'}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
