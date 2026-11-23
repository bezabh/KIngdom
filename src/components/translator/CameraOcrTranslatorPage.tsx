import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  BookmarkPlus,
  Camera,
  Check,
  Copy,
  Eye,
  FileDown,
  ImagePlus,
  Layers,
  Loader2,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { ALL_INTERNATIONAL_LANGUAGES } from '../../utils/languages';
import { SavedItem, UserProfile } from '../../types';
import type {
  OcrDocumentRecord,
  OcrOverlayBlock,
} from '../../services/translatorSuiteService';
import { useTranslationActions } from '../../context/TranslationServiceContext';
import { getTranslatorThemeTokens, TranslatorThemeMode } from './translatorTheme';

interface CameraOcrTranslatorPageProps {
  theme: TranslatorThemeMode;
  user?: UserProfile;
  onBack: () => void;
  onSaveInsight: (item: Omit<SavedItem, 'id' | 'createdAt'>) => void;
}

interface ScannedPageItem {
  id: string;
  imageUrl: string;
  detectedLanguage: string;
  targetLanguage: string;
  originalText: string;
  translatedText: string;
  transliteration: string;
  blocks: OcrOverlayBlock[];
}

export const CameraOcrTranslatorPage: React.FC<CameraOcrTranslatorPageProps> = ({
  theme,
  user,
  onBack,
  onSaveInsight,
}) => {
  const t = getTranslatorThemeTokens(theme);
  const { scanOcrImage, loadOcrDocuments, saveOcrDocument, deleteOcrDocument } =
    useTranslationActions();

  const [targetLang, setTargetLang] = useState('Tigrinya');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraActive, setCameraActive] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);
  const [pages, setPages] = useState<ScannedPageItem[]>([]);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [savedDocs, setSavedDocs] = useState<OcrDocumentRecord[]>([]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadOcrDocuments('camera_ocr').then(setSavedDocs);
    return () => {
      stopCamera();
    };
  }, [user?.id, user?.email, loadOcrDocuments]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((tr) => tr.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const startCamera = async (mode: 'environment' | 'user' = facingMode) => {
    stopCamera();
    setErrorMsg(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMsg('Live camera API unavailable on this device. Upload images from gallery below.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 60);
    } catch (err: any) {
      setErrorMsg(
        err?.name === 'NotAllowedError'
          ? 'Camera permission denied. Grant camera permission or upload photos from your gallery.'
          : err?.message || 'Unable to access camera.'
      );
    }
  };

  const processImageDataUrl = async (dataUrl: string) => {
    setIsScanning(true);
    setErrorMsg(null);
    try {
      const scan = await scanOcrImage({
        imageDataUrl: dataUrl,
        targetLanguage: targetLang,
      });

      const newPage: ScannedPageItem = {
        id: `page_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
        imageUrl: dataUrl,
        detectedLanguage: scan.detectedLanguage,
        targetLanguage: scan.targetLanguage,
        originalText: scan.originalText || '(No text extracted)',
        translatedText: scan.translatedText || '',
        transliteration: scan.transliteration || '',
        blocks: scan.blocks,
      };

      setPages((prev) => {
        const next = [...prev, newPage];
        setActivePageIndex(next.length - 1);
        return next;
      });
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to scan document image.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleCaptureCameraFrame = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 1280;
    canvas.height = videoRef.current.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    processImageDataUrl(dataUrl);
  };

  const handleGalleryUpload = async (files: FileList) => {
    for (const file of Array.from(files).slice(0, 6)) {
      if (!file.type.startsWith('image/')) continue;
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : '');
        reader.readAsDataURL(file);
      });
      if (dataUrl) {
        await processImageDataUrl(dataUrl);
      }
    }
  };

  const handleSaveMultiPageDoc = async () => {
    if (pages.length === 0) return;
    const combinedOriginal = pages.map((p, i) => `--- Page ${i + 1} ---\n${p.originalText}`).join('\n\n');
    const combinedTranslated = pages.map((p, i) => `--- Page ${i + 1} ---\n${p.translatedText}`).join('\n\n');
    const record: OcrDocumentRecord = {
      id: `camdoc_${Date.now()}`,
      title: `Camera OCR Scan (${pages.length} page${pages.length > 1 ? 's' : ''} -> ${targetLang})`,
      captureSource: 'camera_ocr',
      detectedLanguage: pages[0]?.detectedLanguage || 'Auto-detected',
      targetLanguage: targetLang,
      originalText: combinedOriginal.slice(0, 3900),
      translatedText: combinedTranslated.slice(0, 3900),
      transliteration: pages[0]?.transliteration || '',
      pageCount: pages.length,
      createdAt: new Date().toISOString(),
    };
    await saveOcrDocument(record);
    setSavedDocs((prev) => [record, ...prev]);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
    onSaveInsight({
      title: record.title,
      type: 'translation',
      content: record.translatedText,
      tags: ['camera-ocr', targetLang],
    });
  };

  const handleExportPdf = async () => {
    if (pages.length === 0) return;
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    pages.forEach((p, idx) => {
      if (idx > 0) pdf.addPage();
      pdf.setFontSize(13);
      pdf.text(`Axumite Camera OCR - Page ${idx + 1} (${p.detectedLanguage} -> ${p.targetLanguage})`, 14, 16);
      const hasImage = Boolean(p.imageUrl);
      if (hasImage) {
        try {
          pdf.addImage(p.imageUrl, 'JPEG', 14, 22, 182, 85, undefined, 'FAST');
        } catch {}
      }
      const transStartY = hasImage ? 116 : 28;
      pdf.setFontSize(10);
      pdf.text('Translated Output:', 14, transStartY);
      const transLines = pdf.splitTextToSize(p.translatedText || '(No text translated)', 180);
      pdf.text(transLines.slice(0, hasImage ? 14 : 26), 14, transStartY + 6);

      const origStartY = hasImage ? 186 : 152;
      pdf.text('Original OCR Text:', 14, origStartY);
      const origLines = pdf.splitTextToSize(p.originalText || '(No text extracted)', 180);
      pdf.text(origLines.slice(0, hasImage ? 14 : 24), 14, origStartY + 6);
    });
    pdf.save(`axumite-camera-ocr-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const activePage = pages[activePageIndex];

  return (
    <div className={`rounded-3xl p-4 sm:p-6 space-y-5 ${t.pageShell}`}>
      {/* Header */}
      <div className={`flex flex-wrap items-center justify-between gap-3 pb-4 border-b ${t.border}`}>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onBack();
            }}
            className={`min-h-[42px] px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer ${t.secondaryButton}`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <div>
            <h2 className={`text-base sm:text-lg font-extrabold tracking-tight ${t.textPrimary}`}>
              Camera Translation
            </h2>
            <p className={`text-xs ${t.textMuted}`}>
              Scan documents and signs, extract text using OCR, and translate text directly from photographs
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold ${t.goldText}`}>Target:</span>
          <select
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value)}
            className={`rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none ${t.inputBg}`}
          >
            {ALL_INTERNATIONAL_LANGUAGES.map((l) => (
              <option key={`cam-${l.code}`} value={l.name}>
                {l.flag ? `${l.flag} ` : ''}{l.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Camera & Gallery Controls */}
      <div className="flex flex-wrap items-center gap-2.5">
        {!cameraActive ? (
          <button
            type="button"
            onClick={() => startCamera()}
            className={`min-h-[46px] px-4 rounded-2xl text-xs font-bold flex items-center gap-2 cursor-pointer ${t.primaryButton}`}
          >
            <Camera className="w-4 h-4" />
            <span>Open Live Camera</span>
          </button>
        ) : (
          <>
            <button
              type="button"
              disabled={isScanning}
              onClick={handleCaptureCameraFrame}
              className={`min-h-[46px] px-5 rounded-2xl text-xs font-bold flex items-center gap-2 cursor-pointer ${t.primaryButton}`}
            >
              <Camera className="w-4 h-4" />
              <span>{isScanning ? 'Scanning...' : 'Scan Frame (+ Add Page)'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const next = facingMode === 'environment' ? 'user' : 'environment';
                setFacingMode(next);
                startCamera(next);
              }}
              className={`min-h-[44px] px-3.5 rounded-2xl text-xs flex items-center gap-1.5 cursor-pointer ${t.secondaryButton}`}
            >
              <RefreshCw className="w-4 h-4" />
              <span>Flip Camera</span>
            </button>
            <button
              type="button"
              onClick={stopCamera}
              className={`min-h-[44px] px-3.5 rounded-2xl text-xs cursor-pointer ${t.dangerButton}`}
            >
              Close Camera
            </button>
          </>
        )}

        <button
          type="button"
          disabled={isScanning}
          onClick={() => galleryInputRef.current?.click()}
          className={`min-h-[46px] px-4 rounded-2xl text-xs font-bold flex items-center gap-2 cursor-pointer ${t.secondaryButton}`}
        >
          <ImagePlus className="w-4 h-4" />
          <span>Upload Photos (Multi-Page)</span>
        </button>
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) handleGalleryUpload(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {errorMsg && (
        <div className={`rounded-2xl p-3.5 text-xs font-semibold text-rose-600 ${t.cardBg}`}>
          {errorMsg}
        </div>
      )}

      {/* Live Camera Viewfinder */}
      {cameraActive && (
        <div className="relative rounded-2xl overflow-hidden bg-black border border-[#C5A059]/45 max-h-[360px] flex items-center justify-center">
          <video ref={videoRef} autoPlay playsInline muted className="w-full max-h-[360px] object-contain" />
        </div>
      )}

      {isScanning && (
        <div className={`rounded-2xl p-4 flex items-center justify-center gap-2.5 text-xs font-semibold ${t.cardElevated}`}>
          <Loader2 className="w-4 h-4 animate-spin text-[#B8860B]" />
          <span>Scanning image with Camera OCR & translating highlighted text regions...</span>
        </div>
      )}

      {/* Scanned Multi-Page Document Queue */}
      {pages.length > 0 && activePage && (
        <div className="space-y-4">
          {/* Page Tabs + Export Actions */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <Layers className={`w-4 h-4 ${t.goldText}`} />
              {pages.map((p, idx) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setActivePageIndex(idx)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                    idx === activePageIndex ? t.primaryButton : t.secondaryButton
                  }`}
                >
                  Page {idx + 1}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowOverlay((v) => !v)}
                className={`px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer ${
                  showOverlay ? t.goldBadge : t.secondaryButton
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{showOverlay ? 'Overlay Highlight: ON' : 'Overlay Highlight: OFF'}</span>
              </button>
              <button
                type="button"
                onClick={handleSaveMultiPageDoc}
                className={`px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer ${t.secondaryButton}`}
              >
                {savedNotice ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <BookmarkPlus className="w-3.5 h-3.5" />}
                <span>{savedNotice ? 'Saved' : 'Save Scan'}</span>
              </button>
              <button
                type="button"
                onClick={handleExportPdf}
                className={`px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer ${t.primaryButton}`}
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>Export PDF ({pages.length} pg)</span>
              </button>
            </div>
          </div>

          {/* Highlighted Translation Overlay + Comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className={`rounded-2xl p-3 space-y-2 ${t.cardBg}`}>
              <div className="flex items-center justify-between text-xs">
                <span className={`font-bold ${t.goldText}`}>
                  Scanned Page {activePageIndex + 1} ({activePage.detectedLanguage} ➔ {activePage.targetLanguage})
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setPages((prev) => prev.filter((_, i) => i !== activePageIndex));
                    setActivePageIndex(0);
                  }}
                  className={`p-1 rounded-lg cursor-pointer ${t.dangerButton}`}
                  title="Remove this page"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {activePage.imageUrl ? (
                <div className="relative rounded-xl overflow-hidden border border-[#C5A059]/30 bg-black">
                  <img src={activePage.imageUrl} alt="Scanned document" className="w-full h-auto block" />
                  {showOverlay &&
                    activePage.blocks.map((blk, bIdx) => (
                      <div
                        key={bIdx}
                        style={{
                          left: `${Math.max(0, Math.min(88, blk.xPct))}%`,
                          top: `${Math.max(0, Math.min(90, blk.yPct))}%`,
                          maxWidth: `${Math.max(18, Math.min(96, blk.wPct || 45))}%`,
                        }}
                        className="absolute px-2 py-0.5 rounded bg-amber-300/95 text-black text-[11px] font-bold shadow border border-amber-700/40 font-ethiopic leading-tight"
                        title={`Original: ${blk.originalText}`}
                      >
                        {blk.translatedText}
                      </div>
                    ))}
                </div>
              ) : (
                <div className={`rounded-xl p-6 text-center text-xs ${t.subCardBg} ${t.textMuted}`}>
                  Restored from saved camera scan archive (text &amp; translation preserved).
                </div>
              )}
            </div>

            <div className={`rounded-2xl p-4 space-y-3 ${t.cardBg}`}>
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-[11px] font-bold uppercase tracking-wider ${t.goldText}`}>
                    Translated Text ({activePage.targetLanguage})
                  </span>
                  <button
                    type="button"
                    disabled={!activePage.translatedText}
                    onClick={() => {
                      navigator.clipboard.writeText(activePage.translatedText);
                      setCopiedText(true);
                      setTimeout(() => setCopiedText(false), 1800);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] flex items-center gap-1 cursor-pointer disabled:opacity-40 ${t.secondaryButton}`}
                  >
                    {copiedText ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedText ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <textarea
                  readOnly
                  value={activePage.translatedText}
                  rows={6}
                  className={`w-full rounded-xl p-3 text-sm font-semibold font-ethiopic focus:outline-none ${t.inputBg}`}
                />
              </div>

              <div className="space-y-1">
                <span className={`text-[11px] font-bold uppercase tracking-wider ${t.textMuted}`}>
                  Original Extracted Text ({activePage.detectedLanguage})
                </span>
                <textarea
                  readOnly
                  value={activePage.originalText}
                  rows={5}
                  className={`w-full rounded-xl p-3 text-xs font-ethiopic focus:outline-none ${t.inputBg}`}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Saved Camera OCR Docs */}
      {savedDocs.length > 0 && (
        <div className="space-y-2 pt-2">
          <h3 className={`text-xs font-bold uppercase tracking-wider ${t.goldText}`}>
            Saved Scanned Documents ({savedDocs.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {savedDocs.slice(0, 6).map((docItem) => (
              <div key={docItem.id} className={`rounded-2xl p-3 flex items-start justify-between gap-2 ${t.subCardBg}`}>
                <button
                  type="button"
                  onClick={() => {
                    setTargetLang(docItem.targetLanguage || 'Tigrinya');
                    setPages([
                      {
                        id: docItem.id,
                        imageUrl: '',
                        detectedLanguage: docItem.detectedLanguage || 'Auto-detected',
                        targetLanguage: docItem.targetLanguage || 'Tigrinya',
                        originalText: docItem.originalText || '',
                        translatedText: docItem.translatedText || '',
                        transliteration: docItem.transliteration || '',
                        blocks: [],
                      },
                    ]);
                    setActivePageIndex(0);
                  }}
                  className="min-w-0 flex-1 text-left cursor-pointer"
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
                  title="Delete saved scan"
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
