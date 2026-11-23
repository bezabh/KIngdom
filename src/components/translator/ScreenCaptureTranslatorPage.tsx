import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  BookmarkPlus,
  Check,
  Copy,
  Download,
  ImagePlus,
  Loader2,
  Monitor,
  RefreshCw,
  Share2,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { ALL_INTERNATIONAL_LANGUAGES } from '../../utils/languages';
import { SavedItem, UserProfile } from '../../types';
import type { OcrDocumentRecord } from '../../services/translatorSuiteService';
import { useTranslationActions } from '../../context/TranslationServiceContext';
import { getTranslatorThemeTokens, TranslatorThemeMode } from './translatorTheme';

interface ScreenCaptureTranslatorPageProps {
  theme: TranslatorThemeMode;
  user?: UserProfile;
  onBack: () => void;
  onSaveInsight: (item: Omit<SavedItem, 'id' | 'createdAt'>) => void;
}

export const ScreenCaptureTranslatorPage: React.FC<ScreenCaptureTranslatorPageProps> = ({
  theme,
  user,
  onBack,
  onSaveInsight,
}) => {
  const t = getTranslatorThemeTokens(theme);
  const {
    scanOcrImage,
    translateText,
    loadOcrDocuments,
    saveOcrDocument,
    deleteOcrDocument,
  } = useTranslationActions();

  const [targetLang, setTargetLang] = useState('Tigrinya');
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [captureKind, setCaptureKind] = useState<'screen_capture' | 'image_upload'>('screen_capture');
  const [detectedLanguage, setDetectedLanguage] = useState('');
  const [originalText, setOriginalText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [transliteration, setTransliteration] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [savedDocs, setSavedDocs] = useState<OcrDocumentRecord[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadOcrDocuments('screen_and_upload').then(setSavedDocs);
  }, [user?.id, user?.email, loadOcrDocuments]);

  const runStructuredOcr = async (
    dataUrl: string,
    sourceKind: 'screen_capture' | 'image_upload'
  ) => {
    setImagePreviewUrl(dataUrl);
    setCaptureKind(sourceKind);
    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const scan = await scanOcrImage({
        imageDataUrl: dataUrl,
        targetLanguage: targetLang,
      });

      setDetectedLanguage(scan.detectedLanguage);
      setOriginalText(scan.originalText);
      setTranslatedText(scan.translatedText);
      setTransliteration(scan.transliteration);

      if (!scan.originalText) {
        setErrorMsg('No readable text detected in the captured image. Try capturing a clearer region.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to process screenshot.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRetranslateText = async () => {
    const cleanText = originalText.trim();
    if (!cleanText || isProcessing) return;
    setIsProcessing(true);
    setErrorMsg(null);
    try {
      const response = await translateText({
        text: cleanText,
        sourceLanguage: detectedLanguage || 'Auto-Detect',
        targetLanguage: targetLang,
      });
      setTranslatedText(response.translation.translatedText || '');
      setTransliteration(response.translation.transliteration || '');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to re-translate extracted text.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCaptureScreen = async () => {
    setErrorMsg(null);
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setErrorMsg(
        'Direct browser screen capture is unavailable on this device. Upload a screenshot image below or use the Android MediaProjection companion.'
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' } as any,
        audio: false,
      });

      const video = document.createElement('video');
      video.srcObject = stream;
      video.muted = true;
      await video.play();

      await new Promise((r) => setTimeout(r, 200));

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }

      // Immediately release screen capture tracks after capturing single user-approved frame
      stream.getTracks().forEach((tr) => tr.stop());
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      await runStructuredOcr(dataUrl, 'screen_capture');
    } catch (err: any) {
      setErrorMsg(
        err?.name === 'NotAllowedError'
          ? 'Screen capture permission was cancelled or denied by the user.'
          : err?.message || 'Failed to capture screen.'
      );
    }
  };

  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid screenshot image (PNG, JPG, WebP).');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        runStructuredOcr(reader.result, 'image_upload');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleShare = async () => {
    if (!translatedText) return;
    const shareText = `[${detectedLanguage} ➔ ${targetLang}]\n\nTranslated:\n${translatedText}\n\nOriginal:\n${originalText}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Axumite Screen Translation', text: shareText });
        return;
      } catch {}
    }
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleDownload = () => {
    if (!translatedText) return;
    const body = `AXUMITE SCREEN TRANSLATION\nDetected: ${detectedLanguage}\nTarget: ${targetLang}\n\n--- TRANSLATED ---\n${translatedText}\n\n--- ORIGINAL ---\n${originalText}${
      transliteration ? `\n\n--- PHONETIC ---\n${transliteration}` : ''
    }`;
    const blob = new Blob([body], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `screen-translation-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSaveRecord = async () => {
    if (!originalText || !translatedText) return;
    const record: OcrDocumentRecord = {
      id: `scr_${Date.now()}`,
      title: `Screen Capture (${detectedLanguage} ➔ ${targetLang})`,
      captureSource: captureKind,
      detectedLanguage: detectedLanguage || 'Auto-detected',
      targetLanguage: targetLang,
      originalText: originalText.slice(0, 3900),
      translatedText: translatedText.slice(0, 3900),
      transliteration,
      pageCount: 1,
      createdAt: new Date().toISOString(),
    };
    await saveOcrDocument(record);
    setSavedDocs((prev) => [record, ...prev]);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
    onSaveInsight({
      title: record.title,
      type: 'translation',
      content: `${record.translatedText}\n\nOriginal:\n${record.originalText}`,
      tags: ['screen-capture', targetLang],
    });
  };

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
              Screen Translation
            </h2>
            <p className={`text-xs ${t.textMuted}`}>
              Capture and translate screen content from supported applications using OCR technology
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold ${t.goldText}`}>Translate to:</span>
          <select
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value)}
            className={`rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none ${t.inputBg}`}
          >
            {ALL_INTERNATIONAL_LANGUAGES.map((l) => (
              <option key={`scr-${l.code}`} value={l.name}>
                {l.flag ? `${l.flag} ` : ''}{l.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Explicit Permission Notice + Android MediaProjection Companion Info */}
      <div className={`rounded-2xl p-3.5 flex items-start gap-3 text-xs ${t.subCardBg}`}>
        <ShieldCheck className={`w-5 h-5 shrink-0 mt-0.5 ${t.goldText}`} />
        <div className="space-y-1">
          <p className={`font-bold ${t.textPrimary}`}>
            User-Approved Capture Only (Android MediaProjection & Browser Display Permission)
          </p>
          <p className={t.textMuted}>
            Screenshots are only taken after explicit system prompt approval. On Android, the native companion uses{' '}
            <code className="font-mono">MediaProjectionManager</code> foreground-service consent—never background capture.
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          disabled={isProcessing}
          onClick={handleCaptureScreen}
          className={`min-h-[50px] rounded-2xl px-4 py-3 text-sm font-bold flex items-center justify-center gap-2 cursor-pointer transition ${t.primaryButton}`}
        >
          <Monitor className="w-4 h-4" />
          <span>Capture Screen Window (With Permission)</span>
        </button>

        <button
          type="button"
          disabled={isProcessing}
          onClick={() => fileInputRef.current?.click()}
          className={`min-h-[50px] rounded-2xl px-4 py-3 text-sm font-bold flex items-center justify-center gap-2 cursor-pointer transition ${t.secondaryButton}`}
        >
          <ImagePlus className="w-4 h-4" />
          <span>Upload Screenshot or Image</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileUpload(file);
            e.target.value = '';
          }}
        />
      </div>

      {isProcessing && (
        <div className={`rounded-2xl p-5 flex items-center justify-center gap-3 text-xs font-semibold ${t.cardElevated}`}>
          <Loader2 className="w-5 h-5 animate-spin text-[#B8860B]" />
          <span>Extracting screen text via OCR, auto-detecting language, and translating to {targetLang}...</span>
        </div>
      )}

      {errorMsg && (
        <div className={`rounded-2xl p-3.5 text-xs font-semibold text-rose-600 ${t.cardBg}`}>
          {errorMsg}
        </div>
      )}

      {/* Results Comparison */}
      {(imagePreviewUrl || originalText || translatedText) && (
        <div className="space-y-4">
          {imagePreviewUrl && (
            <div className={`rounded-2xl p-3 space-y-2 ${t.cardBg}`}>
              <div className="flex items-center justify-between text-xs">
                <span className={`font-bold ${t.goldText}`}>Captured Image Preview</span>
                {detectedLanguage && (
                  <span className={`px-2.5 py-0.5 rounded-lg text-[11px] font-semibold ${t.goldBadge}`}>
                    Detected: {detectedLanguage} ➔ {targetLang}
                  </span>
                )}
              </div>
              <img
                src={imagePreviewUrl}
                alt="Captured screen preview"
                className="max-h-72 mx-auto rounded-xl object-contain border border-[#C5A059]/30"
              />
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Original Text */}
            <div className={`rounded-2xl p-4 space-y-2 ${t.cardBg}`}>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className={`text-xs font-bold uppercase tracking-wider ${t.textMuted}`}>
                  Original Extracted Text ({detectedLanguage || 'Source'})
                </h3>
                <button
                  type="button"
                  disabled={isProcessing || !originalText.trim()}
                  onClick={handleRetranslateText}
                  className={`px-2.5 py-1 rounded-lg text-[11px] flex items-center gap-1 cursor-pointer disabled:opacity-40 ${t.secondaryButton}`}
                >
                  <RefreshCw className={`w-3 h-3 ${isProcessing ? 'animate-spin' : ''}`} />
                  <span>Re-translate to {targetLang}</span>
                </button>
              </div>
              <textarea
                value={originalText}
                onChange={(e) => setOriginalText(e.target.value)}
                rows={7}
                className={`w-full rounded-xl p-3 text-xs font-ethiopic focus:outline-none ${t.inputBg}`}
              />
            </div>

            {/* Translated Text */}
            <div className={`rounded-2xl p-4 space-y-2 ${t.cardBg}`}>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className={`text-xs font-bold uppercase tracking-wider ${t.goldText}`}>
                  Translated Result ({targetLang})
                </h3>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={!translatedText.trim()}
                    onClick={() => {
                      navigator.clipboard.writeText(translatedText);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1800);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] flex items-center gap-1 cursor-pointer disabled:opacity-40 ${t.secondaryButton}`}
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                  <button
                    type="button"
                    disabled={!translatedText.trim()}
                    onClick={handleShare}
                    className={`px-2.5 py-1 rounded-lg text-[11px] flex items-center gap-1 cursor-pointer disabled:opacity-40 ${t.secondaryButton}`}
                  >
                    <Share2 className="w-3 h-3" />
                    <span>Share</span>
                  </button>
                  <button
                    type="button"
                    disabled={!translatedText.trim()}
                    onClick={handleDownload}
                    className={`px-2.5 py-1 rounded-lg text-[11px] flex items-center gap-1 cursor-pointer disabled:opacity-40 ${t.secondaryButton}`}
                  >
                    <Download className="w-3 h-3" />
                    <span>Download</span>
                  </button>
                  <button
                    type="button"
                    disabled={!originalText.trim() || !translatedText.trim()}
                    onClick={handleSaveRecord}
                    className={`px-2.5 py-1 rounded-lg text-[11px] flex items-center gap-1 cursor-pointer disabled:opacity-40 ${t.primaryButton}`}
                  >
                    {savedNotice ? <Check className="w-3 h-3" /> : <BookmarkPlus className="w-3 h-3" />}
                    <span>{savedNotice ? 'Saved' : 'Save'}</span>
                  </button>
                </div>
              </div>
              <textarea
                value={translatedText}
                onChange={(e) => setTranslatedText(e.target.value)}
                rows={7}
                className={`w-full rounded-xl p-3 text-sm font-semibold font-ethiopic focus:outline-none ${t.inputBg}`}
              />
              {transliteration && (
                <p className={`text-xs font-mono italic ${t.textMuted}`}>
                  Phonetic: {transliteration}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Saved Screen Captures */}
      {savedDocs.length > 0 && (
        <div className="space-y-2 pt-2">
          <h3 className={`text-xs font-bold uppercase tracking-wider ${t.goldText}`}>
            Saved Screen Captures ({savedDocs.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {savedDocs.slice(0, 6).map((docItem) => (
              <div key={docItem.id} className={`rounded-2xl p-3 flex items-start justify-between gap-2 ${t.subCardBg}`}>
                <button
                  type="button"
                  onClick={() => {
                    setDetectedLanguage(docItem.detectedLanguage);
                    setTargetLang(docItem.targetLanguage);
                    setOriginalText(docItem.originalText);
                    setTranslatedText(docItem.translatedText);
                    setTransliteration(docItem.transliteration || '');
                  }}
                  className="text-left flex-1 cursor-pointer"
                >
                  <p className={`text-xs font-bold ${t.textPrimary}`}>{docItem.title}</p>
                  <p className={`text-[11px] truncate ${t.textMuted}`}>{docItem.translatedText}</p>
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await deleteOcrDocument(docItem.id);
                    setSavedDocs((prev) => prev.filter((d) => d.id !== docItem.id));
                  }}
                  className={`p-1.5 rounded-lg cursor-pointer ${t.dangerButton}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
