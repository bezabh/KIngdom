import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  BookOpen,
  Check,
  ChevronDown,
  ChevronUp,
  CloudOff,
  Compass,
  Copy,
  Database,
  Download,
  Eye,
  HardDrive,
  Info,
  Languages,
  Maximize2,
  MessageSquareText,
  Minimize2,
  Palette,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  Wand2,
  WifiOff,
  X,
} from 'lucide-react';
import { AppTab, DictionaryEntry, EritreanLandmark, SavedItem } from '../types';
import { ERITREAN_LANDMARKS, OFFLINE_DICTIONARY } from '../utils/offlineData';
import {
  DownloadedOfflinePack,
  getBrowserStorageEstimate,
  getDownloadedPacks,
  OfflineTranslationMatch,
  translateTextOffline,
} from '../services/offlinePackService';

export interface OfflineModeDashboardProps {
  isOffline: boolean;
  savedItems: SavedItem[];
  onNavigateTab: (tab: AppTab) => void;
  onSaveInsight?: (item: Omit<SavedItem, 'id' | 'createdAt'>) => void;
  onDeleteInsight?: (id: string) => void;
  onRetryConnection: () => Promise<boolean> | boolean;
  onOpenCacheSettings?: () => void;
  isMinimized?: boolean;
  onToggleMinimize?: (minimized: boolean) => void;
}

type DashboardSection = 'dictionaries' | 'insights' | 'guide';
type DictionarySubTab = 'lexicon' | 'landmarks' | 'packs';

const OFFLINE_LOOKUP_LANGUAGES = [
  'English',
  'Tigrinya',
  'Amharic',
  'German',
  'Arabic',
  'French',
  'Spanish',
  'Italian',
  'Portuguese',
  'Chinese',
  "Ge'ez",
  'Kunama',
  'Irob',
];

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatCategoryLabel(category: DictionaryEntry['category']): string {
  switch (category) {
    case 'common':
      return 'Common Phrase';
    case 'proverb':
      return 'Proverb';
    case 'culture':
      return 'Culture';
    case 'geography':
      return 'Geography';
    case 'grammar':
      return 'Grammar';
    default:
      return category;
  }
}

function formatInsightTypeLabel(type: SavedItem['type']): string {
  switch (type) {
    case 'chat':
      return 'Chat';
    case 'translation':
      return 'Translation';
    case 'vision':
      return 'Vision';
    case 'prompt':
      return 'Prompt';
    case 'calligraphy':
      return 'Calligraphy';
    case 'assistance':
      return 'Voice Assist';
    case 'payment':
      return 'Billing';
    default:
      return type;
  }
}

export const OfflineModeDashboard: React.FC<OfflineModeDashboardProps> = ({
  isOffline,
  savedItems,
  onNavigateTab,
  onSaveInsight,
  onDeleteInsight,
  onRetryConnection,
  onOpenCacheSettings,
  isMinimized = false,
  onToggleMinimize,
}) => {
  const [activeSection, setActiveSection] = useState<DashboardSection>('dictionaries');
  const [dictSubTab, setDictSubTab] = useState<DictionarySubTab>('lexicon');

  // Dictionary search & filters
  const [dictQuery, setDictQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedDictId, setExpandedDictId] = useState<string | null>(OFFLINE_DICTIONARY[0]?.id ?? null);

  // Saved insights search & filters
  const [insightQuery, setInsightQuery] = useState('');
  const [selectedInsightType, setSelectedInsightType] = useState<string>('all');
  const [expandedInsightId, setExpandedInsightId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // IndexedDB downloaded language packs & local storage state
  const [downloadedPacks, setDownloadedPacks] = useState<DownloadedOfflinePack[]>([]);
  const [isLoadingPacks, setIsLoadingPacks] = useState<boolean>(true);
  const [storageEstimate, setStorageEstimate] = useState<{
    usedBytes: number;
    quotaBytes: number;
    packBytes: number;
  }>({ usedBytes: 0, quotaBytes: 0, packBytes: 0 });

  // Quick offline pack translator state
  const [lookupInput, setLookupInput] = useState('');
  const [lookupSourceLang, setLookupSourceLang] = useState('English');
  const [lookupTargetLang, setLookupTargetLang] = useState('Tigrinya');
  const [lookupResult, setLookupResult] = useState<OfflineTranslationMatch | null>(null);
  const [isTranslatingOffline, setIsTranslatingOffline] = useState(false);

  // UI feedback states
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [savedEntryIds, setSavedEntryIds] = useState<Record<string, boolean>>({});
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);
  const [connectionFeedback, setConnectionFeedback] = useState<string | null>(null);

  // Load locally cached IndexedDB packs & browser storage whenever offline mode activates
  useEffect(() => {
    if (!isOffline) return;
    let active = true;

    const loadLocalCache = async () => {
      setIsLoadingPacks(true);
      try {
        const [packs, estimate] = await Promise.all([
          getDownloadedPacks(),
          getBrowserStorageEstimate(),
        ]);
        if (!active) return;
        setDownloadedPacks(packs);
        setStorageEstimate(estimate);
      } catch {
        if (!active) return;
        setDownloadedPacks([]);
      } finally {
        if (active) setIsLoadingPacks(false);
      }
    };

    loadLocalCache();
    return () => {
      active = false;
    };
  }, [isOffline]);

  const totalPackPhrases = useMemo(
    () => downloadedPacks.reduce((sum, pack) => sum + (pack.entries?.length || pack.entryCount || 0), 0),
    [downloadedPacks]
  );

  const filteredDictionary = useMemo(() => {
    const q = dictQuery.trim().toLowerCase();
    return OFFLINE_DICTIONARY.filter((entry) => {
      const matchesCat = selectedCategory === 'all' || entry.category === selectedCategory;
      if (!matchesCat) return false;
      if (!q) return true;
      return (
        entry.tigrinya.toLowerCase().includes(q) ||
        entry.geezScript.toLowerCase().includes(q) ||
        entry.phonetic.toLowerCase().includes(q) ||
        entry.english.toLowerCase().includes(q) ||
        entry.explanation.toLowerCase().includes(q) ||
        (entry.exampleSentence || '').toLowerCase().includes(q)
      );
    });
  }, [dictQuery, selectedCategory]);

  const filteredLandmarks = useMemo(() => {
    const q = dictQuery.trim().toLowerCase();
    if (!q) return ERITREAN_LANDMARKS;
    return ERITREAN_LANDMARKS.filter(
      (landmark) =>
        landmark.name.toLowerCase().includes(q) ||
        landmark.tigrinyaName.toLowerCase().includes(q) ||
        landmark.region.toLowerCase().includes(q) ||
        landmark.historicalEra.toLowerCase().includes(q) ||
        landmark.description.toLowerCase().includes(q) ||
        landmark.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [dictQuery]);

  const filteredInsights = useMemo(() => {
    const q = insightQuery.trim().toLowerCase();
    return savedItems.filter((item) => {
      const matchesType = selectedInsightType === 'all' || item.type === selectedInsightType;
      if (!matchesType) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.content.toLowerCase().includes(q) ||
        item.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [savedItems, insightQuery, selectedInsightType]);

  if (!isOffline) return null;

  const handleCopy = (id: string, text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setCopiedId(id);
    window.setTimeout(() => {
      setCopiedId((prev) => (prev === id ? null : prev));
    }, 1800);
  };

  const handleRetry = async () => {
    setIsCheckingConnection(true);
    setConnectionFeedback(null);
    try {
      const restored = await onRetryConnection();
      if (!restored) {
        setConnectionFeedback('Still offline. Local dictionaries and saved insights remain available.');
      }
    } catch {
      setConnectionFeedback('Still offline. Local dictionaries and saved insights remain available.');
    } finally {
      setIsCheckingConnection(false);
    }
  };

  const handleBookmarkDictionaryEntry = (entry: DictionaryEntry) => {
    if (!onSaveInsight) return;
    onSaveInsight({
      title: `${entry.tigrinya} (${entry.phonetic})`,
      type: 'translation',
      content: `${entry.tigrinya} — ${entry.english}\nPhonetic: ${entry.phonetic}\n\n${entry.explanation}${
        entry.exampleSentence ? `\n\nExample: ${entry.exampleSentence}` : ''
      }`,
      tags: ['offline-dictionary', entry.category, 'tigrinya'],
    });
    setSavedEntryIds((prev) => ({ ...prev, [entry.id]: true }));
  };

  const handleBookmarkLandmark = (landmark: EritreanLandmark) => {
    if (!onSaveInsight) return;
    onSaveInsight({
      title: `${landmark.name} — ${landmark.tigrinyaName}`,
      type: 'chat',
      content: `${landmark.name} (${landmark.tigrinyaName})\nRegion: ${landmark.region}\nEra: ${landmark.historicalEra}\n\n${landmark.description}`,
      tags: ['offline-heritage', ...landmark.tags.map((t) => t.toLowerCase())],
    });
    setSavedEntryIds((prev) => ({ ...prev, [landmark.id]: true }));
  };

  const handleOfflinePhraseTranslate = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = lookupInput.trim();
    if (!cleaned) return;
    setIsTranslatingOffline(true);
    try {
      const res = await translateTextOffline(cleaned, lookupSourceLang, lookupTargetLang);
      setLookupResult(res);
    } catch {
      setLookupResult({
        translatedText: '',
        transliteration: '',
        matchedMode: 'no-match',
        coverageTier: 'community-validated',
        coverageNote: 'Unable to read local pack index. Please try another phrase.',
        usedOfflinePack: 'local',
      });
    } finally {
      setIsTranslatingOffline(false);
    }
  };

  const handleExportInsightsJson = () => {
    const payload = JSON.stringify(savedItems, null, 2);
    const blob = new Blob([payload], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `axumite-offline-insights-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleLaunchTab = (tab: AppTab) => {
    onToggleMinimize?.(true);
    onNavigateTab(tab);
  };

  const renderInsightIcon = (type: SavedItem['type']) => {
    switch (type) {
      case 'chat':
        return <MessageSquareText className="w-4 h-4 text-[#E1C47D] shrink-0" />;
      case 'translation':
        return <Languages className="w-4 h-4 text-sky-400 shrink-0" />;
      case 'vision':
        return <Eye className="w-4 h-4 text-emerald-400 shrink-0" />;
      case 'prompt':
        return <Wand2 className="w-4 h-4 text-violet-400 shrink-0" />;
      case 'calligraphy':
        return <Palette className="w-4 h-4 text-amber-300 shrink-0" />;
      default:
        return <BookmarkCheck className="w-4 h-4 text-[#C5A059] shrink-0" />;
    }
  };

  // Compact top bar mode when user minimizes the Offline Mode Dashboard to browse tabs
  if (isMinimized) {
    return (
      <div
        role="region"
        aria-label="Offline mode status bar"
        className="w-full bg-[#0E0D0A] border-b border-[#C5A059]/35 px-4 sm:px-6 py-2.5 text-slate-100 z-30"
      >
        <div className="max-w-[1360px] mx-auto flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <WifiOff className="w-4 h-4 text-[#E1C47D] shrink-0" />
            <p className="text-xs sm:text-sm font-medium text-slate-100 truncate">
              <span className="font-ethiopic text-[#F3E5AB]">ብዘይ ኢንተርነት</span>
              <span className="mx-1.5 text-slate-500">·</span>
              <span>Offline Mode</span>
              <span className="hidden md:inline text-slate-400 font-normal">
                {' '}
                — <span className="tabular-nums">{OFFLINE_DICTIONARY.length}</span> cached terms ·{' '}
                <span className="tabular-nums">{savedItems.length}</span> saved insights ready
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleRetry}
              disabled={isCheckingConnection}
              className="inline-flex items-center gap-1.5 px-3 min-h-[36px] rounded-lg border border-slate-700 bg-[#161511] hover:border-[#C5A059]/60 text-xs font-medium text-slate-200 transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#E1C47D] ${isCheckingConnection ? 'animate-spin' : ''}`} />
              <span>{isCheckingConnection ? 'Checking...' : 'Retry'}</span>
            </button>
            <button
              type="button"
              onClick={() => onToggleMinimize?.(false)}
              className="inline-flex items-center gap-1.5 px-3.5 min-h-[36px] rounded-lg bg-[#C5A059] hover:bg-[#D4B06A] text-[#09090B] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Offline Dashboard</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section
      aria-label="Offline Mode Dashboard"
      className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-28 sm:pb-32 text-slate-100 relative z-20"
    >
      {/* Top Workspace Header */}
      <div className="bg-[#0C0D11] border border-[#8E6D28]/30 rounded-2xl overflow-hidden">
        <div className="px-5 sm:px-7 py-5 sm:py-6 border-b border-[#8E6D28]/20 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <WifiOff className="w-3.5 h-3.5 text-[#E1C47D] shrink-0" />
              <span>Axumite Sovereign</span>
              <span className="text-slate-600">/</span>
              <span className="text-[#E1C47D] font-medium">Offline Workspace</span>
            </div>

            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h1 className="serif-luxury text-xl sm:text-2xl font-bold text-[#F3E5AB] tracking-tight">
                Offline Mode Dashboard
              </h1>
              <span className="font-ethiopic text-sm text-[#C5A059]">
                ብዘይ ኢንተርነት ዝሰርሕ ማእከል
              </span>
            </div>

            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
              Your device is currently disconnected. Locally cached Tigrinya dictionaries, downloaded IndexedDB language packs, and your Saved Insights remain immediately accessible with zero network required.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleRetry}
              disabled={isCheckingConnection}
              className="inline-flex items-center justify-center gap-2 px-4 min-h-[44px] rounded-xl bg-[#C5A059] hover:bg-[#D5B26B] text-[#09090B] text-xs sm:text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap"
            >
              <RefreshCw className={`w-4 h-4 ${isCheckingConnection ? 'animate-spin' : ''}`} />
              <span>{isCheckingConnection ? 'Checking Network...' : 'Retry Connection'}</span>
            </button>

            {onToggleMinimize && (
              <button
                type="button"
                onClick={() => onToggleMinimize(true)}
                className="inline-flex items-center justify-center gap-2 px-4 min-h-[44px] rounded-xl border border-[#8E6D28]/35 bg-[#121318] hover:border-[#C5A059]/60 text-slate-200 text-xs sm:text-sm font-medium transition-colors cursor-pointer whitespace-nowrap"
              >
                <Minimize2 className="w-4 h-4 text-[#E1C47D]" />
                <span>Browse App Tabs</span>
              </button>
            )}
          </div>
        </div>

        {/* Inline Reconnect Check Feedback */}
        {connectionFeedback && (
          <div
            role="status"
            className="px-5 sm:px-7 py-2.5 bg-[#15120B] border-b border-[#8E6D28]/25 flex items-center justify-between gap-3 text-xs text-amber-200"
          >
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-[#E1C47D] shrink-0" />
              <span>{connectionFeedback}</span>
            </div>
            <button
              type="button"
              onClick={() => setConnectionFeedback(null)}
              aria-label="Dismiss status message"
              className="p-1 text-slate-400 hover:text-slate-100 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Real Local Metrics Summary Grid (Single-Elevation Hairline Grid, Tabular Numerals) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 divide-x divide-[#8E6D28]/20 bg-[#090A0E]">
          <div className="px-5 py-4">
            <p className="text-xs text-slate-400 font-medium">Cached Lexicon</p>
            <p className="mt-1 text-xl sm:text-2xl font-semibold text-slate-100 tabular-nums">
              {OFFLINE_DICTIONARY.length + ERITREAN_LANDMARKS.length}
            </p>
            <p className="mt-0.5 text-xs text-slate-500 tabular-nums">
              {OFFLINE_DICTIONARY.length} terms · {ERITREAN_LANDMARKS.length} heritage sites
            </p>
          </div>

          <div className="px-5 py-4">
            <p className="text-xs text-slate-400 font-medium">Downloaded Packs</p>
            <p className="mt-1 text-xl sm:text-2xl font-semibold text-slate-100 tabular-nums">
              {isLoadingPacks ? '—' : downloadedPacks.length}
            </p>
            <p className="mt-0.5 text-xs text-slate-500 tabular-nums">
              {isLoadingPacks
                ? 'Reading IndexedDB...'
                : downloadedPacks.length > 0
                ? `${totalPackPhrases} indexed phrases`
                : 'Built-in lexicon active'}
            </p>
          </div>

          <div className="px-5 py-4">
            <p className="text-xs text-slate-400 font-medium">Saved Insights</p>
            <p className="mt-1 text-xl sm:text-2xl font-semibold text-slate-100 tabular-nums">
              {savedItems.length}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Stored in local device vault
            </p>
          </div>

          <div className="px-5 py-4">
            <p className="text-xs text-slate-400 font-medium">Local Cache Storage</p>
            <p className="mt-1 text-xl sm:text-2xl font-semibold text-slate-100 tabular-nums">
              {isLoadingPacks ? '—' : formatBytes(storageEstimate.packBytes || storageEstimate.usedBytes)}
            </p>
            <p className="mt-0.5 text-xs text-slate-500 tabular-nums">
              {storageEstimate.quotaBytes > 0
                ? `of ${formatBytes(storageEstimate.quotaBytes)} browser quota`
                : 'Device local storage'}
            </p>
          </div>
        </div>

        {/* Segmented Primary Navigation Bar */}
        <div
          role="tablist"
          aria-label="Offline dashboard sections"
          className="px-5 sm:px-7 py-3 bg-[#0C0D11] border-t border-[#8E6D28]/20 flex items-center gap-2 overflow-x-auto"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeSection === 'dictionaries'}
            onClick={() => setActiveSection('dictionaries')}
            className={`inline-flex items-center gap-2 px-4 min-h-[44px] rounded-xl text-xs sm:text-sm font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              activeSection === 'dictionaries'
                ? 'bg-[#C5A059]/15 text-[#F3E5AB] border border-[#C5A059]/50'
                : 'text-slate-400 hover:text-slate-100 border border-transparent hover:bg-white/[0.03]'
            }`}
          >
            <BookOpen className="w-4 h-4 shrink-0" />
            <span>Cached Dictionaries</span>
            <span className="text-xs text-slate-400 tabular-nums">
              ({OFFLINE_DICTIONARY.length})
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeSection === 'insights'}
            onClick={() => setActiveSection('insights')}
            className={`inline-flex items-center gap-2 px-4 min-h-[44px] rounded-xl text-xs sm:text-sm font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              activeSection === 'insights'
                ? 'bg-[#C5A059]/15 text-[#F3E5AB] border border-[#C5A059]/50'
                : 'text-slate-400 hover:text-slate-100 border border-transparent hover:bg-white/[0.03]'
            }`}
          >
            <BookmarkCheck className="w-4 h-4 shrink-0" />
            <span>Saved Insights</span>
            <span className="text-xs text-slate-400 tabular-nums">({savedItems.length})</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeSection === 'guide'}
            onClick={() => setActiveSection('guide')}
            className={`inline-flex items-center gap-2 px-4 min-h-[44px] rounded-xl text-xs sm:text-sm font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              activeSection === 'guide'
                ? 'bg-[#C5A059]/15 text-[#F3E5AB] border border-[#C5A059]/50'
                : 'text-slate-400 hover:text-slate-100 border border-transparent hover:bg-white/[0.03]'
            }`}
          >
            <Compass className="w-4 h-4 shrink-0" />
            <span>Available Features Guide</span>
          </button>
        </div>
      </div>

      {/* SECTION 1: CACHED DICTIONARIES, HERITAGE LANDMARKS & OFFLINE PACKS */}
      {activeSection === 'dictionaries' && (
        <div className="mt-5 bg-[#0C0D11] border border-[#8E6D28]/25 rounded-2xl overflow-hidden">
          {/* Sub-navigation & Search Controls */}
          <div className="px-5 sm:px-6 py-4 border-b border-[#8E6D28]/20 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-1.5 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setDictSubTab('lexicon')}
                  className={`px-3.5 min-h-[40px] rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    dictSubTab === 'lexicon'
                      ? 'bg-[#1A1710] text-[#F3E5AB] border border-[#C5A059]/45'
                      : 'text-slate-400 hover:text-slate-100 border border-transparent'
                  }`}
                >
                  Tigrinya & Ge&apos;ez Lexicon ({OFFLINE_DICTIONARY.length})
                </button>
                <button
                  type="button"
                  onClick={() => setDictSubTab('landmarks')}
                  className={`px-3.5 min-h-[40px] rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    dictSubTab === 'landmarks'
                      ? 'bg-[#1A1710] text-[#F3E5AB] border border-[#C5A059]/45'
                      : 'text-slate-400 hover:text-slate-100 border border-transparent'
                  }`}
                >
                  Heritage Sites ({ERITREAN_LANDMARKS.length})
                </button>
                <button
                  type="button"
                  onClick={() => setDictSubTab('packs')}
                  className={`px-3.5 min-h-[40px] rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    dictSubTab === 'packs'
                      ? 'bg-[#1A1710] text-[#F3E5AB] border border-[#C5A059]/45'
                      : 'text-slate-400 hover:text-slate-100 border border-transparent'
                  }`}
                >
                  Downloaded Packs ({isLoadingPacks ? '…' : downloadedPacks.length})
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleLaunchTab('translator')}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#E1C47D] hover:text-[#F3E5AB] transition-colors cursor-pointer self-start sm:self-auto whitespace-nowrap"
              >
                <span>Open Full Translator Suite</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {dictSubTab !== 'packs' && (
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={dictQuery}
                    onChange={(e) => setDictQuery(e.target.value)}
                    placeholder={
                      dictSubTab === 'lexicon'
                        ? "Search Tigrinya (ሰላም), phonetic (Selam), or English meaning..."
                        : 'Search landmarks, regions, or historical eras...'
                    }
                    className="w-full min-h-[44px] bg-[#07080B] border border-[#8E6D28]/30 focus:border-[#C5A059] rounded-xl pl-10 pr-9 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
                  />
                  {dictQuery && (
                    <button
                      type="button"
                      onClick={() => setDictQuery('')}
                      aria-label="Clear search"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-100 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {dictSubTab === 'lexicon' && (
                  <div className="flex items-center gap-1.5 overflow-x-auto">
                    {(['all', 'common', 'proverb', 'culture', 'geography'] as const).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3 min-h-[40px] rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                          selectedCategory === cat
                            ? 'bg-[#C5A059]/18 text-[#F3E5AB] border border-[#C5A059]/45'
                            : 'bg-[#07080B] text-slate-400 hover:text-slate-200 border border-[#8E6D28]/20'
                        }`}
                      >
                        {cat === 'all' ? 'All' : formatCategoryLabel(cat)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Lexicon Rows */}
          {dictSubTab === 'lexicon' && (
            <>
              {filteredDictionary.length === 0 ? (
                <div className="px-6 py-12 text-center space-y-3">
                  <BookOpen className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-sm font-medium text-slate-200">
                    No cached dictionary terms match &ldquo;{dictQuery}&rdquo;.
                  </p>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Try another keyword in Tigrinya, phonetic spelling, or English, or switch to Downloaded Packs for bilingual phrase lookups.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setDictQuery('');
                      setSelectedCategory('all');
                    }}
                    className="inline-flex items-center gap-1.5 px-4 min-h-[40px] rounded-lg border border-[#C5A059]/40 text-xs font-medium text-[#F3E5AB] hover:bg-[#C5A059]/10 cursor-pointer"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-[#8E6D28]/15">
                  {filteredDictionary.map((entry) => {
                    const isExpanded = expandedDictId === entry.id;
                    const isCopied = copiedId === entry.id;
                    const isSaved = !!savedEntryIds[entry.id];

                    return (
                      <div key={entry.id} className="transition-colors hover:bg-white/[0.015]">
                        <button
                          type="button"
                          onClick={() => setExpandedDictId(isExpanded ? null : entry.id)}
                          aria-expanded={isExpanded}
                          className="w-full text-left px-5 sm:px-6 py-4 flex items-center justify-between gap-4 cursor-pointer"
                        >
                          <div className="min-w-0 flex-1 grid grid-cols-1 md:grid-cols-12 gap-1 md:gap-4 md:items-center">
                            <div className="md:col-span-4 flex items-baseline gap-2.5 min-w-0">
                              <span className="font-ethiopic text-base sm:text-lg font-semibold text-[#F3E5AB] truncate">
                                {entry.tigrinya}
                              </span>
                              <span className="text-xs text-[#C5A059] font-medium shrink-0">
                                {entry.phonetic}
                              </span>
                            </div>

                            <div className="md:col-span-5 text-sm text-slate-200 truncate">
                              {entry.english}
                            </div>

                            <div className="md:col-span-3 md:text-right text-xs text-slate-400">
                              {formatCategoryLabel(entry.category)} · Local Cache
                            </div>
                          </div>

                          <span className="text-slate-400 shrink-0">
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-[#E1C47D]" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </span>
                        </button>

                        {isExpanded && (
                          <div className="px-5 sm:px-6 pb-5 pt-1 bg-[#090A0E]/80 border-t border-[#8E6D28]/10 space-y-3">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-2">
                              <div className="lg:col-span-2 space-y-2">
                                <p className="text-xs text-slate-400 font-medium">
                                  Meaning & Cultural Context
                                </p>
                                <p className="text-sm text-slate-200 leading-relaxed">
                                  {entry.explanation}
                                </p>
                              </div>

                              <div className="space-y-1.5">
                                <p className="text-xs text-slate-400 font-medium">
                                  Ge&apos;ez Script & Pronunciation
                                </p>
                                <p className="font-ethiopic text-base text-[#F3E5AB]">
                                  {entry.geezScript}
                                </p>
                                <p className="text-xs text-slate-400">
                                  Phonetic: <span className="text-slate-200">{entry.phonetic}</span>
                                </p>
                              </div>
                            </div>

                            {entry.exampleSentence && (
                              <div className="pt-2 border-t border-[#8E6D28]/15">
                                <p className="text-xs text-slate-400 mb-1">
                                  Example Usage (ኣብነታዊ ሓሳብ)
                                </p>
                                <p className="font-ethiopic text-sm sm:text-base text-slate-100 leading-relaxed">
                                  &ldquo;{entry.exampleSentence}&rdquo;
                                </p>
                              </div>
                            )}

                            <div className="pt-2 flex flex-wrap items-center gap-2.5">
                              <button
                                type="button"
                                onClick={() =>
                                  handleCopy(
                                    entry.id,
                                    `${entry.tigrinya} (${entry.phonetic}) — ${entry.english}${
                                      entry.exampleSentence ? `\n${entry.exampleSentence}` : ''
                                    }`
                                  )
                                }
                                className="inline-flex items-center gap-1.5 px-3.5 min-h-[40px] rounded-lg border border-[#8E6D28]/30 bg-[#121318] hover:border-[#C5A059] text-xs font-medium text-slate-200 transition-colors cursor-pointer"
                              >
                                {isCopied ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                    <span className="text-emerald-300">Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5 text-[#E1C47D]" />
                                    <span>Copy Entry</span>
                                  </>
                                )}
                              </button>

                              {onSaveInsight && (
                                <button
                                  type="button"
                                  onClick={() => handleBookmarkDictionaryEntry(entry)}
                                  disabled={isSaved}
                                  className="inline-flex items-center gap-1.5 px-3.5 min-h-[40px] rounded-lg border border-[#8E6D28]/30 bg-[#121318] hover:border-[#C5A059] text-xs font-medium text-slate-200 transition-colors cursor-pointer disabled:opacity-75"
                                >
                                  {isSaved ? (
                                    <>
                                      <BookmarkCheck className="w-3.5 h-3.5 text-emerald-400" />
                                      <span className="text-emerald-300">Saved to Vault</span>
                                    </>
                                  ) : (
                                    <>
                                      <Bookmark className="w-3.5 h-3.5 text-[#E1C47D]" />
                                      <span>Save to Insights</span>
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Heritage Landmarks Rows */}
          {dictSubTab === 'landmarks' && (
            <>
              {filteredLandmarks.length === 0 ? (
                <div className="px-6 py-12 text-center space-y-3">
                  <Compass className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-sm font-medium text-slate-200">
                    No cached heritage sites match &ldquo;{dictQuery}&rdquo;.
                  </p>
                  <button
                    type="button"
                    onClick={() => setDictQuery('')}
                    className="inline-flex items-center gap-1.5 px-4 min-h-[40px] rounded-lg border border-[#C5A059]/40 text-xs font-medium text-[#F3E5AB] hover:bg-[#C5A059]/10 cursor-pointer"
                  >
                    Clear Search
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-[#8E6D28]/15">
                  {filteredLandmarks.map((landmark) => {
                    const isCopied = copiedId === landmark.id;
                    const isSaved = !!savedEntryIds[landmark.id];
                    return (
                      <div
                        key={landmark.id}
                        className="px-5 sm:px-6 py-4 space-y-2.5 hover:bg-white/[0.015] transition-colors"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
                          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                            <h3 className="text-sm sm:text-base font-semibold text-[#F3E5AB]">
                              {landmark.name}
                            </h3>
                            <span className="font-ethiopic text-sm text-[#C5A059]">
                              {landmark.tigrinyaName}
                            </span>
                          </div>
                          <span className="text-xs text-slate-400">
                            {landmark.region} · {landmark.historicalEra}
                          </span>
                        </div>

                        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                          {landmark.description}
                        </p>

                        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                          <p className="text-xs text-slate-500">
                            {landmark.tags.join(' · ')}
                          </p>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                handleCopy(
                                  landmark.id,
                                  `${landmark.name} (${landmark.tigrinyaName}) — ${landmark.region}\n${landmark.description}`
                                )
                              }
                              className="inline-flex items-center gap-1.5 px-3 min-h-[38px] rounded-lg border border-[#8E6D28]/30 bg-[#121318] hover:border-[#C5A059] text-xs font-medium text-slate-200 transition-colors cursor-pointer"
                            >
                              {isCopied ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5 text-[#E1C47D]" />
                              )}
                              <span>{isCopied ? 'Copied' : 'Copy'}</span>
                            </button>

                            {onSaveInsight && (
                              <button
                                type="button"
                                onClick={() => handleBookmarkLandmark(landmark)}
                                disabled={isSaved}
                                className="inline-flex items-center gap-1.5 px-3 min-h-[38px] rounded-lg border border-[#8E6D28]/30 bg-[#121318] hover:border-[#C5A059] text-xs font-medium text-slate-200 transition-colors cursor-pointer disabled:opacity-75"
                              >
                                {isSaved ? (
                                  <BookmarkCheck className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Bookmark className="w-3.5 h-3.5 text-[#E1C47D]" />
                                )}
                                <span>{isSaved ? 'Saved' : 'Save'}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Downloaded Language Packs & Instant IndexedDB Phrase Lookup */}
          {dictSubTab === 'packs' && (
            <div className="divide-y divide-[#8E6D28]/20">
              {isLoadingPacks ? (
                <div className="px-5 sm:px-6 py-6 space-y-3" aria-busy="true">
                  <div className="h-10 rounded-lg bg-slate-800/50 animate-pulse" />
                  <div className="h-10 rounded-lg bg-slate-800/50 animate-pulse" />
                  <div className="h-10 rounded-lg bg-slate-800/50 animate-pulse" />
                </div>
              ) : downloadedPacks.length === 0 ? (
                <div className="px-6 py-12 text-center space-y-3">
                  <Database className="w-9 h-9 text-slate-600 mx-auto" />
                  <h3 className="text-sm sm:text-base font-semibold text-slate-200">
                    No Downloaded Language Packs Found on This Device
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
                    Your built-in Tigrinya & Ge&apos;ez Lexicon and Heritage Sites work offline automatically. Once internet returns, you can download additional bilingual IndexedDB language packs in the Translator suite.
                  </p>
                  <div className="pt-2 flex flex-wrap items-center justify-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setDictSubTab('lexicon')}
                      className="inline-flex items-center gap-2 px-4 min-h-[44px] rounded-xl bg-[#C5A059] hover:bg-[#D5B26B] text-[#09090B] text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <BookOpen className="w-4 h-4" />
                      <span>Browse Built-in Lexicon</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLaunchTab('translator')}
                      className="inline-flex items-center gap-2 px-4 min-h-[44px] rounded-xl border border-[#8E6D28]/35 bg-[#121318] hover:border-[#C5A059] text-slate-200 text-xs font-medium transition-colors cursor-pointer"
                    >
                      <span>Open Translator Offline Packs</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Quick Offline Phrase Lookup Engine */}
                  <div className="px-5 sm:px-6 py-5 bg-[#090A0E] space-y-4">
                    <div>
                      <h3 className="text-sm font-semibold text-[#F3E5AB]">
                        Quick Offline Phrase Translator
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Translates directly against your locally stored IndexedDB language packs with zero network traffic.
                      </p>
                    </div>

                    <form onSubmit={handleOfflinePhraseTranslate} className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label className="block space-y-1">
                          <span className="text-xs text-slate-400">From</span>
                          <select
                            value={lookupSourceLang}
                            onChange={(e) => setLookupSourceLang(e.target.value)}
                            className="w-full min-h-[44px] bg-[#0C0D11] border border-[#8E6D28]/30 focus:border-[#C5A059] rounded-xl px-3 text-sm text-slate-100 focus:outline-none"
                          >
                            {OFFLINE_LOOKUP_LANGUAGES.map((lang) => (
                              <option key={lang} value={lang}>
                                {lang}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="block space-y-1">
                          <span className="text-xs text-slate-400">To</span>
                          <select
                            value={lookupTargetLang}
                            onChange={(e) => setLookupTargetLang(e.target.value)}
                            className="w-full min-h-[44px] bg-[#0C0D11] border border-[#8E6D28]/30 focus:border-[#C5A059] rounded-xl px-3 text-sm text-slate-100 focus:outline-none"
                          >
                            {OFFLINE_LOOKUP_LANGUAGES.map((lang) => (
                              <option key={lang} value={lang}>
                                {lang}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2.5">
                        <input
                          type="text"
                          value={lookupInput}
                          onChange={(e) => setLookupInput(e.target.value)}
                          placeholder="Enter a phrase (e.g., Hello, Thank you, Good morning, ሰላም)..."
                          className="flex-1 min-h-[44px] bg-[#0C0D11] border border-[#8E6D28]/30 focus:border-[#C5A059] rounded-xl px-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
                        />
                        <button
                          type="submit"
                          disabled={isTranslatingOffline || !lookupInput.trim()}
                          className="inline-flex items-center justify-center gap-2 px-5 min-h-[44px] rounded-xl bg-[#C5A059] hover:bg-[#D5B26B] text-[#09090B] text-xs sm:text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
                        >
                          <Languages className="w-4 h-4" />
                          <span>{isTranslatingOffline ? 'Translating...' : 'Translate Offline'}</span>
                        </button>
                      </div>
                    </form>

                    {lookupResult && (
                      <div className="pt-3 border-t border-[#8E6D28]/20 space-y-2">
                        {lookupResult.translatedText ? (
                          <>
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-1">
                                <p className="font-ethiopic text-lg font-semibold text-[#F3E5AB]">
                                  {lookupResult.translatedText}
                                </p>
                                {lookupResult.transliteration && (
                                  <p className="text-xs text-slate-300">
                                    Phonetic / Reference: {lookupResult.transliteration}
                                  </p>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => handleCopy('offline-lookup-result', lookupResult.translatedText)}
                                className="inline-flex items-center gap-1.5 px-3 min-h-[38px] rounded-lg border border-[#8E6D28]/30 bg-[#121318] hover:border-[#C5A059] text-xs text-slate-200 cursor-pointer shrink-0"
                              >
                                {copiedId === 'offline-lookup-result' ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5 text-[#E1C47D]" />
                                )}
                                <span>{copiedId === 'offline-lookup-result' ? 'Copied' : 'Copy'}</span>
                              </button>
                            </div>
                            <p className="text-xs text-slate-400">
                              {lookupResult.coverageNote} · Source pack: {lookupResult.usedOfflinePack}
                            </p>
                          </>
                        ) : (
                          <p className="text-xs text-amber-200/90 leading-relaxed">
                            {lookupResult.coverageNote}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Installed Packs Table */}
                  <div className="divide-y divide-[#8E6D28]/15">
                    {downloadedPacks.map((pack) => (
                      <div
                        key={pack.code}
                        className="px-5 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                      >
                        <div>
                          <div className="flex items-baseline gap-2.5">
                            <span className="text-sm font-semibold text-slate-100">{pack.name}</span>
                            <span className="font-ethiopic text-xs text-[#C5A059]">{pack.nativeName}</span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5 tabular-nums">
                            v{pack.version} · {pack.entries?.length || pack.entryCount} phrases ·{' '}
                            {formatBytes(pack.estimatedBytes)}
                          </p>
                        </div>

                        <div className="flex items-center gap-4 text-xs">
                          <span className="text-emerald-400 font-medium">Installed Locally</span>
                          <button
                            type="button"
                            onClick={() => {
                              setLookupTargetLang(pack.name);
                              setLookupInput('Hello');
                            }}
                            className="text-[#E1C47D] hover:text-[#F3E5AB] font-medium cursor-pointer"
                          >
                            Test Pack
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: SAVED INSIGHTS VAULT */}
      {activeSection === 'insights' && (
        <div className="mt-5 bg-[#0C0D11] border border-[#8E6D28]/25 rounded-2xl overflow-hidden">
          <div className="px-5 sm:px-6 py-4 border-b border-[#8E6D28]/20 flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-sm sm:text-base font-semibold text-[#F3E5AB]">
                  Locally Preserved Saved Insights
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  All bookmarked chats, translations, prompts, and dictionary entries stored in this browser.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {savedItems.length > 0 && (
                  <button
                    type="button"
                    onClick={handleExportInsightsJson}
                    className="inline-flex items-center gap-1.5 px-3.5 min-h-[40px] rounded-lg border border-[#8E6D28]/35 bg-[#121318] hover:border-[#C5A059] text-xs font-medium text-slate-200 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-[#E1C47D]" />
                    <span>Export JSON</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleLaunchTab('saved')}
                  className="inline-flex items-center gap-1.5 px-3.5 min-h-[40px] rounded-lg border border-[#8E6D28]/35 bg-[#121318] hover:border-[#C5A059] text-xs font-medium text-[#F3E5AB] transition-colors cursor-pointer"
                >
                  <span>Open Full Vault</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {savedItems.length > 0 && (
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={insightQuery}
                    onChange={(e) => setInsightQuery(e.target.value)}
                    placeholder="Filter saved titles, content, or tags..."
                    className="w-full min-h-[44px] bg-[#07080B] border border-[#8E6D28]/30 focus:border-[#C5A059] rounded-xl pl-10 pr-9 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
                  />
                  {insightQuery && (
                    <button
                      type="button"
                      onClick={() => setInsightQuery('')}
                      aria-label="Clear saved insights filter"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-100 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto">
                  {(['all', 'translation', 'chat', 'vision', 'prompt', 'calligraphy'] as const).map((typeKey) => (
                    <button
                      key={typeKey}
                      type="button"
                      onClick={() => setSelectedInsightType(typeKey)}
                      className={`px-3 min-h-[40px] rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                        selectedInsightType === typeKey
                          ? 'bg-[#C5A059]/18 text-[#F3E5AB] border border-[#C5A059]/45'
                          : 'bg-[#07080B] text-slate-400 hover:text-slate-200 border border-[#8E6D28]/20'
                      }`}
                    >
                      {typeKey === 'all' ? 'All' : formatInsightTypeLabel(typeKey)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {savedItems.length === 0 ? (
            <div className="px-6 py-12 text-center space-y-3">
              <BookmarkCheck className="w-9 h-9 text-slate-600 mx-auto" />
              <h3 className="text-sm sm:text-base font-semibold text-slate-200">
                No Saved Insights Yet
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
                Any chat response, translation, prompt, or cached dictionary entry you save is stored locally on your device for instant offline reading.
              </p>
              <button
                type="button"
                onClick={() => {
                  setActiveSection('dictionaries');
                  setDictSubTab('lexicon');
                }}
                className="inline-flex items-center gap-2 px-4 min-h-[44px] rounded-xl bg-[#C5A059] hover:bg-[#D5B26B] text-[#09090B] text-xs font-semibold transition-colors cursor-pointer"
              >
                <BookOpen className="w-4 h-4" />
                <span>Bookmark from Cached Dictionary</span>
              </button>
            </div>
          ) : filteredInsights.length === 0 ? (
            <div className="px-6 py-12 text-center space-y-3">
              <Search className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-sm text-slate-300">No saved insights match your current filter.</p>
              <button
                type="button"
                onClick={() => {
                  setInsightQuery('');
                  setSelectedInsightType('all');
                }}
                className="inline-flex items-center px-4 min-h-[40px] rounded-lg border border-[#C5A059]/40 text-xs font-medium text-[#F3E5AB] hover:bg-[#C5A059]/10 cursor-pointer"
              >
                Reset Filter
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[#8E6D28]/15">
              {filteredInsights.map((item) => {
                const isExpanded = expandedInsightId === item.id;
                const isCopied = copiedId === item.id;
                const isConfirmingDelete = confirmDeleteId === item.id;

                return (
                  <article
                    key={item.id}
                    className="px-5 sm:px-6 py-4 space-y-2.5 hover:bg-white/[0.015] transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <button
                        type="button"
                        onClick={() => setExpandedInsightId(isExpanded ? null : item.id)}
                        className="flex items-start gap-2.5 text-left min-w-0 flex-1 cursor-pointer"
                      >
                        <span className="mt-0.5">{renderInsightIcon(item.type)}</span>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-semibold text-[#F3E5AB] truncate">
                            {item.title}
                          </h3>
                          <p className="text-xs text-slate-400 mt-0.5 tabular-nums">
                            {formatInsightTypeLabel(item.type)} · {item.createdAt}
                          </p>
                        </div>
                      </button>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCopy(item.id, item.content)}
                          aria-label={`Copy ${item.title}`}
                          className="inline-flex items-center gap-1.5 px-3 min-h-[38px] rounded-lg border border-[#8E6D28]/25 bg-[#121318] hover:border-[#C5A059] text-xs text-slate-300 cursor-pointer"
                        >
                          {isCopied ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 text-[#E1C47D]" />
                          )}
                          <span className="hidden sm:inline">{isCopied ? 'Copied' : 'Copy'}</span>
                        </button>

                        {onDeleteInsight && !isConfirmingDelete && (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(item.id)}
                            aria-label={`Delete ${item.title}`}
                            className="inline-flex items-center justify-center w-9 min-h-[38px] rounded-lg border border-[#8E6D28]/25 bg-[#121318] hover:border-rose-500/60 hover:text-rose-300 text-slate-400 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {onDeleteInsight && isConfirmingDelete && (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteInsight(item.id);
                                setConfirmDeleteId(null);
                              }}
                              className="px-2.5 min-h-[38px] rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold cursor-pointer"
                            >
                              Delete
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2.5 min-h-[38px] rounded-lg border border-slate-700 text-slate-300 text-xs cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {item.metadata?.thumbnailUrl && (
                      <div className="rounded-xl overflow-hidden border border-[#8E6D28]/20 max-h-44 bg-black/60 inline-flex">
                        <img
                          src={item.metadata.thumbnailUrl}
                          alt={item.title}
                          className="h-44 w-auto object-contain"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}

                    <p
                      className={`text-xs sm:text-sm text-slate-300 whitespace-pre-wrap leading-relaxed font-ethiopic ${
                        isExpanded ? '' : 'line-clamp-3'
                      }`}
                    >
                      {item.content}
                    </p>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <p className="text-xs text-slate-500">
                        {item.tags.length > 0 ? item.tags.map((t) => `#${t}`).join('  ') : 'Saved locally'}
                      </p>

                      {item.content.length > 160 && (
                        <button
                          type="button"
                          onClick={() => setExpandedInsightId(isExpanded ? null : item.id)}
                          className="text-xs font-medium text-[#E1C47D] hover:text-[#F3E5AB] cursor-pointer"
                        >
                          {isExpanded ? 'Show less' : 'Read full insight'}
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SECTION 3: BRIEF GUIDE ON AVAILABLE VS ONLINE-ONLY FEATURES */}
      {activeSection === 'guide' && (
        <div className="mt-5 bg-[#0C0D11] border border-[#8E6D28]/25 rounded-2xl overflow-hidden">
          <div className="px-5 sm:px-6 py-4 border-b border-[#8E6D28]/20">
            <h2 className="text-sm sm:text-base font-semibold text-[#F3E5AB]">
              Offline Capabilities Guide
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              A quick overview of what works immediately without internet and which cloud tools pause automatically until connectivity returns.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-[#8E6D28]/20">
            {/* Available Offline Column */}
            <div className="p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[#8E6D28]/15 pb-3">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-semibold text-slate-100">Available Right Now</h3>
                </div>
                <span className="text-xs font-medium text-emerald-400">Works Offline</span>
              </div>

              <ul className="divide-y divide-[#8E6D28]/15">
                <li className="py-3.5 first:pt-0 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-100">
                      Tigrinya & Ge&apos;ez Cached Dictionary
                    </p>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Search built-in Tigrinya terms, phonetics, proverbs, cultural notes, and historical Eritrean landmarks locally.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveSection('dictionaries');
                      setDictSubTab('lexicon');
                    }}
                    className="px-3 min-h-[36px] rounded-lg border border-[#8E6D28]/35 bg-[#121318] hover:border-[#C5A059] text-xs font-medium text-[#F3E5AB] whitespace-nowrap cursor-pointer shrink-0"
                  >
                    Open
                  </button>
                </li>

                <li className="py-3.5 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-100">
                      Offline Language Packs & Ge&apos;ez Fidel Keyboard
                    </p>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Translate phrases against downloaded IndexedDB language packs and compose Tigrinya or Ge&apos;ez script offline.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleLaunchTab('translator')}
                    className="px-3 min-h-[36px] rounded-lg border border-[#8E6D28]/35 bg-[#121318] hover:border-[#C5A059] text-xs font-medium text-[#F3E5AB] whitespace-nowrap cursor-pointer shrink-0"
                  >
                    Translator
                  </button>
                </li>

                <li className="py-3.5 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-100">
                      Saved Insights Vault & Local Export
                    </p>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Read, filter, copy, bookmark, delete, or export your saved insights as JSON directly from local storage.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveSection('insights')}
                    className="px-3 min-h-[36px] rounded-lg border border-[#8E6D28]/35 bg-[#121318] hover:border-[#C5A059] text-xs font-medium text-[#F3E5AB] whitespace-nowrap cursor-pointer shrink-0"
                  >
                    View Vault
                  </button>
                </li>

                <li className="py-3.5 last:pb-0 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-100">
                      Local Heritage Chat Fallback
                    </p>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Obelisk Chat automatically switches to its local knowledge matcher for Tigrinya definitions and landmark queries.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleLaunchTab('chat')}
                    className="px-3 min-h-[36px] rounded-lg border border-[#8E6D28]/35 bg-[#121318] hover:border-[#C5A059] text-xs font-medium text-[#F3E5AB] whitespace-nowrap cursor-pointer shrink-0"
                  >
                    Open Chat
                  </button>
                </li>
              </ul>
            </div>

            {/* Online-Only Column */}
            <div className="p-5 sm:p-6 space-y-4 bg-[#090A0E]/60">
              <div className="flex items-center justify-between border-b border-[#8E6D28]/15 pb-3">
                <div className="flex items-center gap-2">
                  <CloudOff className="w-4 h-4 text-slate-400" />
                  <h3 className="text-sm font-semibold text-slate-100">Paused Until Online</h3>
                </div>
                <span className="text-xs font-medium text-slate-400">Requires Internet</span>
              </div>

              <ul className="divide-y divide-[#8E6D28]/15">
                <li className="py-3.5 first:pt-0 space-y-1">
                  <p className="text-sm font-medium text-slate-200">
                    Cloud Neural AI Chat & Long-Form Translation
                  </p>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Complex multi-sentence syntax, deep reasoning, and full conversational AI require an active server connection.
                  </p>
                </li>

                <li className="py-3.5 space-y-1">
                  <p className="text-sm font-medium text-slate-200">
                    Live Voice Loops & In-App Translated Calls
                  </p>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Two-way WebRTC call signaling, cloud speech recognition, and neural voice synthesis resume automatically once online.
                  </p>
                </li>

                <li className="py-3.5 space-y-1">
                  <p className="text-sm font-medium text-slate-200">
                    Camera OCR, Screen Capture OCR & Vision Studio
                  </p>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Cloud visual text extraction and multi-page document analysis require connectivity to reach the AI vision service.
                  </p>
                </li>

                <li className="py-3.5 last:pb-0 space-y-1">
                  <p className="text-sm font-medium text-slate-200">
                    Cloud Account Sync, Pack Downloads & Billing
                  </p>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Downloading new language packs, syncing profile changes to Firestore, and payment checkout stay paused to protect your data.
                  </p>
                </li>
              </ul>
            </div>
          </div>

          {/* Concise Local Cache Footer */}
          <div className="px-5 sm:px-6 py-4 bg-[#090A0E] border-t border-[#8E6D28]/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-start sm:items-center gap-2.5 text-xs text-slate-400">
              <Sparkles className="w-4 h-4 text-[#E1C47D] shrink-0 mt-0.5 sm:mt-0" />
              <span>
                Tip: When back online, download additional packs in <strong className="text-slate-200 font-medium">Translator → Offline Translation</strong> to expand offline bilingual coverage.
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {onOpenCacheSettings && (
                <button
                  type="button"
                  onClick={onOpenCacheSettings}
                  className="px-3.5 min-h-[40px] rounded-lg border border-[#8E6D28]/35 bg-[#121318] hover:border-[#C5A059] text-xs font-medium text-slate-200 cursor-pointer whitespace-nowrap"
                >
                  Cache & Profile Settings
                </button>
              )}
              <button
                type="button"
                onClick={handleRetry}
                disabled={isCheckingConnection}
                className="inline-flex items-center gap-1.5 px-3.5 min-h-[40px] rounded-lg bg-[#C5A059] hover:bg-[#D5B26B] text-[#09090B] text-xs font-semibold cursor-pointer disabled:opacity-60 whitespace-nowrap"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCheckingConnection ? 'animate-spin' : ''}`} />
                <span>Check Connection</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
