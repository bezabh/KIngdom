import React, { useMemo, useState, useEffect, useCallback, Suspense } from 'react';
import { AppTab, SavedItem, UserProfile } from '../types';
import {
  ArrowRight,
  Bell,
  BellRing,
  Bot,
  Briefcase,
  Building2,
  Camera,
  Check,
  ChevronRight,
  Clock,
  CloudDownload,
  Code2,
  Compass,
  Copy,
  Crown,
  FileText,
  Film,
  Flame,
  GraduationCap,
  Image as ImageIcon,
  Landmark,
  Languages,
  MessagesSquare,
  Mic,
  Palette,
  PenLine,
  PhoneCall,
  Play,
  Presentation,
  Search,
  Sparkles,
  Video,
  Wand2,
  X,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { lazyWithRetry } from './LazyChunkBoundary';
import { triggerTabTapHaptic } from '../utils/haptics';
import type { TranslatorFeatureView } from './translator/TranslationFeatureCardsGrid';

const DocumentAiModal = lazyWithRetry(() =>
  import('./DocumentAiModal').then((m) => ({ default: m.DocumentAiModal }))
);
const WrittenChatModal = lazyWithRetry(() =>
  import('./WrittenChatModal').then((m) => ({ default: m.WrittenChatModal }))
);

export type ToolCategoryId = 'all' | 'translation' | 'media' | 'writing-code' | 'research-pro';

interface EritreanPremiereViewProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  homeTheme?: 'light' | 'dark';
  onToggleHomeTheme?: () => void;
  user: UserProfile;
  onUpdateUser: (user: Partial<UserProfile>) => void;
  onSaveInsight: (item: Omit<SavedItem, 'id' | 'createdAt'>) => void;
  onOpenAuthModal?: (mode: 'login' | 'signup') => void;
  onOpenUserModal: () => void;
  onOpenOnboardingModal: () => void;
  onOpenSecurityModal?: () => void;
  onOpenJobSearch?: () => void;
  onOpenScholarship?: () => void;
  onOpenLegalAdvisor?: () => void;
  onOpenMechanic?: () => void;
  onOpenHistory?: () => void;
  onOpenPremiumModal?: () => void;
  onOpenDrawer?: () => void;
  unreadNotifCount?: number;
  onOpenNotifications?: () => void;
  onOpenVideoTranslator?: () => void;
  onOpenVoiceOverlay?: () => void;
  onOpenHibernation?: () => void;
  onOpenBiometricLock?: () => void;
  onOpenBugReport?: () => void;
  onOpenDailyWisdom?: () => void;
  onOpenTranslatorFeature?: (feature: TranslatorFeatureView) => void;
  onOpenTranslatorWithText?: (text: string) => void;
  onSelectPromptForChat?: (prompt: string) => void;
  isOffline?: boolean;
}

interface PrimaryToolCard {
  id: string;
  category: ToolCategoryId;
  titleEn: string;
  titleTi: string;
  titleDe: string;
  descEn: string;
  descTi: string;
  descDe: string;
  cardBgClass: string;
  iconBgClass: string;
  arrowClass: string;
  icon: React.FC<{ className?: string }>;
  onClick: () => void;
}

interface PopularToolCard {
  id: string;
  category: ToolCategoryId;
  labelEn: string;
  labelTi: string;
  labelDe: string;
  tileBgClass: string;
  iconBgClass: string;
  icon: React.FC<{ className?: string }>;
  onClick: () => void;
}

interface DiscoveryToolCard {
  id: string;
  category: ToolCategoryId;
  titleEn: string;
  titleTi: string;
  titleDe: string;
  descEn: string;
  descTi: string;
  descDe: string;
  status: 'live' | 'planned';
  iconBgClass: string;
  icon: React.FC<{ className?: string }>;
  draftPrompt?: string;
  onClick: () => void;
}

const RECENT_TOOLS_KEY = 'axumite_recent_tools_v1';
const PLANNED_ALERTS_KEY = 'axumite_planned_tool_alerts_v1';

const HeroIllustrationSvg: React.FC = () => (
  <svg
    viewBox="0 0 280 200"
    fill="none"
    className="w-full h-full select-none pointer-events-none"
    aria-hidden="true"
  >
    <defs>
      <radialGradient id="globeGlow2" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.65" />
        <stop offset="60%" stopColor="#3B82F6" stopOpacity="0.24" />
        <stop offset="100%" stopColor="#1E1B4B" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="botShell2" x1="140" y1="22" x2="245" y2="180" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="55%" stopColor="#E2E8F0" />
        <stop offset="100%" stopColor="#CBD5E1" />
      </linearGradient>
      <linearGradient id="botChestA2" x1="184" y1="126" x2="212" y2="152" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#22D3EE" />
        <stop offset="50%" stopColor="#8B5CF6" />
        <stop offset="100%" stopColor="#EC4899" />
      </linearGradient>
    </defs>

    {/* Subtle Neural Network Links */}
    <g className="motion-safe:animate-pulse" opacity="0.55">
      <line x1="24" y1="36" x2="62" y2="54" stroke="#67E8F9" strokeWidth="1" strokeDasharray="3 3" />
      <line x1="62" y1="54" x2="128" y2="42" stroke="#818CF8" strokeWidth="1" />
      <line x1="34" y1="148" x2="78" y2="128" stroke="#38BDF8" strokeWidth="1" strokeDasharray="3 3" />
      <line x1="122" y1="142" x2="158" y2="126" stroke="#A78BFA" strokeWidth="1" />
      <circle cx="24" cy="36" r="2.6" fill="#22D3EE" />
      <circle cx="62" cy="54" r="3" fill="#67E8F9" />
      <circle cx="128" cy="42" r="2.5" fill="#C4B5FD" />
      <circle cx="34" cy="148" r="2.5" fill="#38BDF8" />
    </g>

    {/* Glowing Holographic Globe */}
    <circle cx="94" cy="100" r="78" fill="url(#globeGlow2)" />
    <circle cx="94" cy="100" r="56" stroke="#38BDF8" strokeOpacity="0.52" strokeWidth="1.2" />
    <ellipse cx="94" cy="100" rx="56" ry="22" stroke="#60A5FA" strokeOpacity="0.4" strokeWidth="1" />
    <ellipse cx="94" cy="100" rx="28" ry="56" stroke="#60A5FA" strokeOpacity="0.4" strokeWidth="1" />
    <path d="M42 78C70 88 118 88 146 78" stroke="#7DD3FC" strokeOpacity="0.38" strokeWidth="1" />
    <path d="M42 122C70 112 118 112 146 122" stroke="#7DD3FC" strokeOpacity="0.38" strokeWidth="1" />
    <ellipse
      cx="126"
      cy="104"
      rx="94"
      ry="36"
      transform="rotate(-14 126 104)"
      stroke="#22D3EE"
      strokeOpacity="0.6"
      strokeWidth="1.4"
    />

    {/* Futuristic 3D-style AI Robot */}
    <rect x="148" y="54" width="12" height="28" rx="6" fill="#0284C7" />
    <rect x="236" y="54" width="12" height="28" rx="6" fill="#0284C7" />
    <circle cx="154" cy="68" r="4" fill="#22D3EE" />
    <circle cx="242" cy="68" r="4" fill="#22D3EE" />
    <path d="M156 56C162 30 234 30 240 56" stroke="#38BDF8" strokeWidth="4" strokeLinecap="round" />

    <rect x="158" y="38" width="80" height="58" rx="24" fill="url(#botShell2)" />
    <rect x="166" y="48" width="64" height="36" rx="14" fill="#06122E" />
    <path d="M179 65C181.5 60 187.5 60 190 65" stroke="#22D3EE" strokeWidth="4" strokeLinecap="round" />
    <path d="M206 65C208.5 60 214.5 60 217 65" stroke="#22D3EE" strokeWidth="4" strokeLinecap="round" />
    <path d="M192 74C196 77.5 200 77.5 204 74" stroke="#38BDF8" strokeWidth="2.4" strokeLinecap="round" />

    <rect x="189" y="96" width="18" height="10" rx="4" fill="#1E3A8A" />
    <path
      d="M166 112C166 104 174 102 198 102C222 102 230 104 230 112L236 168C237 178 230 184 218 184H178C166 184 159 178 160 168L166 112Z"
      fill="url(#botShell2)"
    />

    <circle cx="198" cy="138" r="16" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1" />
    <path d="M197 126L208 148H202.5L200 143H194L191.5 148H186L197 126Z" fill="url(#botChestA2)" />
    <path d="M194.5 139.5H199.5L197 134L194.5 139.5Z" fill="#FFFFFF" />

    <path d="M166 122C152 128 142 120 136 110" stroke="url(#botShell2)" strokeWidth="13" strokeLinecap="round" />
    <rect x="126" y="92" width="14" height="19" rx="7" fill="url(#botShell2)" />
    <rect x="130" y="83" width="6" height="12" rx="3" fill="#FFFFFF" />
    <path d="M230 122C243 132 248 148 244 164" stroke="url(#botShell2)" strokeWidth="13" strokeLinecap="round" />
  </svg>
);

export const EritreanPremiereView: React.FC<EritreanPremiereViewProps> = ({
  setActiveTab,
  user,
  onSaveInsight,
  onOpenAuthModal,
  onOpenScholarship,
  onOpenJobSearch,
  onOpenLegalAdvisor,
  onOpenVideoTranslator,
  onOpenVoiceOverlay,
  onOpenDailyWisdom,
  onOpenTranslatorFeature,
  onSelectPromptForChat,
}) => {
  const { language } = useLanguage();
  const isTigrinya = language === 'ti' || language === 'ti_tg';
  const isGerman = language === 'de';

  const pickLabel = useCallback(
    (en: string, ti: string, de?: string) => (isTigrinya ? ti : isGerman && de ? de : en),
    [isTigrinya, isGerman]
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ToolCategoryId>('all');
  const [isFilteringSkeleton, setIsFilteringSkeleton] = useState(false);
  const [showAllDiscovery, setShowAllDiscovery] = useState(false);

  const [isWrittenChatModalOpen, setIsWrittenChatModalOpen] = useState(false);
  const [isDocumentAiModalOpen, setIsDocumentAiModalOpen] = useState(false);
  const [plannedModalTool, setPlannedModalTool] = useState<DiscoveryToolCard | null>(null);

  const [recentToolIds, setRecentToolIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(RECENT_TOOLS_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });

  const [plannedNotifyIds, setPlannedNotifyIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(PLANNED_ALERTS_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });

  const recordToolVisit = useCallback((toolId: string) => {
    setRecentToolIds((prev) => {
      const next = [toolId, ...prev.filter((id) => id !== toolId)].slice(0, 6);
      try {
        localStorage.setItem(RECENT_TOOLS_KEY, JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }, []);

  const togglePlannedAlert = useCallback((toolId: string) => {
    triggerTabTapHaptic();
    setPlannedNotifyIds((prev) => {
      const exists = prev.includes(toolId);
      const next = exists ? prev.filter((id) => id !== toolId) : [...prev, toolId];
      try {
        localStorage.setItem(PLANNED_ALERTS_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const openTranslator = useCallback(
    (feature: TranslatorFeatureView = 'hub', trackId?: string) => {
      triggerTabTapHaptic();
      if (trackId) recordToolVisit(trackId);
      if (onOpenTranslatorFeature) {
        onOpenTranslatorFeature(feature);
      } else {
        setActiveTab('translator');
      }
    },
    [onOpenTranslatorFeature, recordToolVisit, setActiveTab]
  );

  // Brief smooth skeleton feedback on category switching
  useEffect(() => {
    if (selectedCategory === 'all' && !searchQuery.trim()) {
      setIsFilteringSkeleton(false);
      return;
    }
    setIsFilteringSkeleton(true);
    const timer = window.setTimeout(() => setIsFilteringSkeleton(false), 140);
    return () => window.clearTimeout(timer);
  }, [selectedCategory, searchQuery]);

  // 1. EXACT SIX PRIMARY AI TOOLS (Unclipped mobile-first layout)
  const primaryTools: PrimaryToolCard[] = useMemo(
    () => [
      {
        id: 'text-translate',
        category: 'translation',
        titleEn: 'Text Translate',
        titleTi: 'ትርጉም ጽሑፍ',
        titleDe: 'Textübersetzer',
        descEn: 'Translate text easily',
        descTi: 'ጽሑፍ ብቐሊሉ ተርጉም',
        descDe: 'Texte einfach übersetzen',
        cardBgClass:
          'bg-gradient-to-br from-[#F2F7FF] via-white to-[#EAF2FF] dark:from-[#0F1B3D] dark:via-[#131F44] dark:to-[#101C3B] border-sky-200/80 dark:border-sky-500/25 hover:border-blue-400 dark:hover:border-sky-400/60',
        iconBgClass:
          'bg-gradient-to-br from-[#38BDF8] via-[#0EA5E9] to-[#2563EB] shadow-[0_8px_18px_rgba(37,99,235,0.34)] ring-1 ring-white/40',
        arrowClass:
          'bg-sky-100/90 dark:bg-sky-500/15 text-blue-700 dark:text-sky-300 group-hover:bg-blue-600 group-hover:text-white',
        icon: Languages,
        onClick: () => openTranslator('hub', 'text-translate'),
      },
      {
        id: 'live-conversation',
        category: 'translation',
        titleEn: 'Live Conversation',
        titleTi: 'ቀጥታዊ ዕላል',
        titleDe: 'Live-Gespräch',
        descEn: 'Speak & translate live',
        descTi: 'ዘራረብን ተርጉምን',
        descDe: 'Live sprechen & übersetzen',
        cardBgClass:
          'bg-gradient-to-br from-[#F8F3FF] via-white to-[#F2EAFF] dark:from-[#1B133D] dark:via-[#1D1542] dark:to-[#161035] border-purple-200/80 dark:border-purple-500/25 hover:border-purple-400 dark:hover:border-purple-400/60',
        iconBgClass:
          'bg-gradient-to-br from-[#C084FC] via-[#9333EA] to-[#6D28D9] shadow-[0_8px_18px_rgba(124,58,237,0.34)] ring-1 ring-white/40',
        arrowClass:
          'bg-purple-100/90 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300 group-hover:bg-purple-600 group-hover:text-white',
        icon: MessagesSquare,
        onClick: () => openTranslator('conversation', 'live-conversation'),
      },
      {
        id: 'floating-translate',
        category: 'translation',
        titleEn: 'Floating Translate',
        titleTi: 'ተንሳፋፊ ትርጉም',
        titleDe: 'Schwebende Übersetzung',
        descEn: 'Translate anywhere',
        descTi: 'ኣብ ዝኾነ ቦታ ተርጉም',
        descDe: 'Überall übersetzen',
        cardBgClass:
          'bg-gradient-to-br from-[#EDFCF5] via-white to-[#E5F9EE] dark:from-[#0C2626] dark:via-[#0F2A2A] dark:to-[#0A2022] border-emerald-200/80 dark:border-emerald-500/25 hover:border-emerald-400 dark:hover:border-emerald-400/60',
        iconBgClass:
          'bg-gradient-to-br from-[#34D399] via-[#10B981] to-[#059669] shadow-[0_8px_18px_rgba(16,185,129,0.32)] ring-1 ring-white/40',
        arrowClass:
          'bg-emerald-100/90 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 group-hover:bg-emerald-600 group-hover:text-white',
        icon: Copy,
        onClick: () => openTranslator('screen-capture', 'floating-translate'),
      },
      {
        id: 'live-call-translate',
        category: 'translation',
        titleEn: 'Live Call Translate',
        titleTi: 'ትርጉም ጻውዒት',
        titleDe: 'Live-Anruf',
        descEn: 'Translate calls live',
        descTi: 'ጻውዒት ብቐጥታ ተርጉም',
        descDe: 'Anrufe live übersetzen',
        cardBgClass:
          'bg-gradient-to-br from-[#FFF7ED] via-white to-[#FFEDD8] dark:from-[#2B1712] dark:via-[#2A1914] dark:to-[#22120E] border-orange-200/80 dark:border-orange-500/25 hover:border-orange-400 dark:hover:border-orange-400/60',
        iconBgClass:
          'bg-gradient-to-br from-[#FBBF24] via-[#F97316] to-[#EA580C] shadow-[0_8px_18px_rgba(234,88,12,0.32)] ring-1 ring-white/40',
        arrowClass:
          'bg-orange-100/90 dark:bg-orange-500/15 text-orange-700 dark:text-orange-300 group-hover:bg-orange-500 group-hover:text-white',
        icon: PhoneCall,
        onClick: () => openTranslator('call-translation', 'live-call-translate'),
      },
      {
        id: 'offline-neural',
        category: 'translation',
        titleEn: 'Offline Neural',
        titleTi: 'ኦፍላይን ኒውራል',
        titleDe: 'Offline-KI',
        descEn: 'Translate offline',
        descTi: 'ብዘይ ኢንተርነት ተርጉም',
        descDe: 'Offline übersetzen',
        cardBgClass:
          'bg-gradient-to-br from-[#F3F1FF] via-white to-[#EAE6FF] dark:from-[#15183F] dark:via-[#191B45] dark:to-[#121436] border-indigo-200/80 dark:border-indigo-500/25 hover:border-indigo-400 dark:hover:border-indigo-400/60',
        iconBgClass:
          'bg-gradient-to-br from-[#818CF8] via-[#6366F1] to-[#4338CA] shadow-[0_8px_18px_rgba(79,70,229,0.34)] ring-1 ring-white/40',
        arrowClass:
          'bg-indigo-100/90 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 group-hover:bg-indigo-600 group-hover:text-white',
        icon: CloudDownload,
        onClick: () => openTranslator('offline-translation', 'offline-neural'),
      },
      {
        id: 'camera-ocr',
        category: 'translation',
        titleEn: 'Camera OCR',
        titleTi: 'ካሜራ OCR',
        titleDe: 'Kamera-OCR',
        descEn: 'Scan & extract text',
        descTi: 'ስእሊ ስካን ተርጉም',
        descDe: 'Text scannen & übersetzen',
        cardBgClass:
          'bg-gradient-to-br from-[#EEFCF3] via-white to-[#E2FBE9] dark:from-[#0C2618] dark:via-[#0E291A] dark:to-[#0A2014] border-green-200/80 dark:border-green-500/25 hover:border-green-400 dark:hover:border-green-400/60',
        iconBgClass:
          'bg-gradient-to-br from-[#4ADE80] via-[#22C55E] to-[#15803D] shadow-[0_8px_18px_rgba(22,163,74,0.32)] ring-1 ring-white/40',
        arrowClass:
          'bg-green-100/90 dark:bg-green-500/15 text-green-700 dark:text-green-300 group-hover:bg-green-600 group-hover:text-white',
        icon: Camera,
        onClick: () => openTranslator('camera-ocr', 'camera-ocr'),
      },
    ],
    [openTranslator]
  );

  // 2. SIX POPULAR TOOLS (Horizontal 3-card mobile carousel + responsive desktop grid)
  const popularTools: PopularToolCard[] = useMemo(
    () => [
      {
        id: 'ai-chat',
        category: 'research-pro',
        labelEn: 'AI Chat',
        labelTi: 'AI ቻት',
        labelDe: 'KI-Chat',
        tileBgClass:
          'bg-white/95 dark:bg-slate-900/90 border-sky-100/90 dark:border-sky-500/20 hover:border-sky-300 dark:hover:border-sky-400/60',
        iconBgClass: 'bg-gradient-to-br from-[#38BDF8] to-[#0284C7] shadow-[0_6px_14px_rgba(2,132,199,0.28)] ring-1 ring-white/35',
        icon: Bot,
        onClick: () => {
          triggerTabTapHaptic();
          recordToolVisit('ai-chat');
          setActiveTab('chat');
        },
      },
      {
        id: 'image-generator',
        category: 'media',
        labelEn: 'Image Generator',
        labelTi: 'ምስሊ AI',
        labelDe: 'Bild-Studio',
        tileBgClass:
          'bg-white/95 dark:bg-slate-900/90 border-purple-100/90 dark:border-purple-500/20 hover:border-purple-300 dark:hover:border-purple-400/60',
        iconBgClass: 'bg-gradient-to-br from-[#C084FC] to-[#7C3AED] shadow-[0_6px_14px_rgba(124,58,237,0.28)] ring-1 ring-white/35',
        icon: ImageIcon,
        onClick: () => {
          triggerTabTapHaptic();
          recordToolVisit('image-generator');
          setActiveTab('vision');
        },
      },
      {
        id: 'video-generator',
        category: 'media',
        labelEn: 'Video Generator',
        labelTi: 'ቪድዮ AI',
        labelDe: 'Video-KI',
        tileBgClass:
          'bg-white/95 dark:bg-slate-900/90 border-rose-100/90 dark:border-rose-500/20 hover:border-rose-300 dark:hover:border-rose-400/60',
        iconBgClass: 'bg-gradient-to-br from-[#F87171] to-[#DC2626] shadow-[0_6px_14px_rgba(220,38,38,0.28)] ring-1 ring-white/35',
        icon: Play,
        onClick: () => {
          triggerTabTapHaptic();
          recordToolVisit('video-generator');
          setActiveTab('photo-to-video');
        },
      },
      {
        id: 'voice-translator',
        category: 'translation',
        labelEn: 'Voice Translator',
        labelTi: 'ድምጺ AI',
        labelDe: 'Sprach-KI',
        tileBgClass:
          'bg-white/95 dark:bg-slate-900/90 border-emerald-100/90 dark:border-emerald-500/20 hover:border-emerald-300 dark:hover:border-emerald-400/60',
        iconBgClass: 'bg-gradient-to-br from-[#34D399] to-[#059669] shadow-[0_6px_14px_rgba(5,150,105,0.28)] ring-1 ring-white/35',
        icon: Mic,
        onClick: () => {
          triggerTabTapHaptic();
          recordToolVisit('voice-translator');
          if (onOpenVoiceOverlay) {
            onOpenVoiceOverlay();
          } else {
            openTranslator('voice-translation', 'voice-translator');
          }
        },
      },
      {
        id: 'ai-writing',
        category: 'writing-code',
        labelEn: 'AI Writing',
        labelTi: 'ጽሕፈት AI',
        labelDe: 'KI-Schreiben',
        tileBgClass:
          'bg-white/95 dark:bg-slate-900/90 border-violet-100/90 dark:border-violet-500/20 hover:border-violet-300 dark:hover:border-violet-400/60',
        iconBgClass: 'bg-gradient-to-br from-[#A855F7] to-[#6366F1] shadow-[0_6px_14px_rgba(99,102,241,0.28)] ring-1 ring-white/35',
        icon: Wand2,
        onClick: () => {
          triggerTabTapHaptic();
          recordToolVisit('ai-writing');
          setIsDocumentAiModalOpen(true);
        },
      },
      {
        id: 'ai-coding',
        category: 'writing-code',
        labelEn: 'AI Coding',
        labelTi: 'ኮድ AI',
        labelDe: 'KI-Code',
        tileBgClass:
          'bg-white/95 dark:bg-slate-900/90 border-blue-100/90 dark:border-blue-500/20 hover:border-blue-300 dark:hover:border-blue-400/60',
        iconBgClass: 'bg-gradient-to-br from-[#3B82F6] to-[#1D4ED8] shadow-[0_6px_14px_rgba(29,78,216,0.28)] ring-1 ring-white/35',
        icon: Code2,
        onClick: () => {
          triggerTabTapHaptic();
          recordToolVisit('ai-coding');
          setActiveTab('prompt-forge');
        },
      },
    ],
    [onOpenVoiceOverlay, openTranslator, recordToolVisit, setActiveTab]
  );

  // 3. DISCOVER MORE WITH AXUMITE AI (Live existing tools + clearly marked Planned tools)
  const discoveryTools: DiscoveryToolCard[] = useMemo(
    () => [
      {
        id: 'ai-photo-editor',
        category: 'media',
        titleEn: 'AI Photo Editor',
        titleTi: 'መመሓየሺ ስእሊ AI',
        titleDe: 'KI-Fotoeditor',
        descEn: 'Enhance & edit photos',
        descTi: 'ስእሊ መርምርን ኣመሓይሽን',
        descDe: 'Fotos verbessern',
        status: 'live',
        iconBgClass: 'bg-gradient-to-br from-[#EC4899] to-[#9333EA]',
        icon: ImageIcon,
        onClick: () => {
          triggerTabTapHaptic();
          recordToolVisit('ai-photo-editor');
          setActiveTab('vision');
        },
      },
      {
        id: 'photo-to-video',
        category: 'media',
        titleEn: 'Photo to Video',
        titleTi: 'ስእሊ ናብ ቪድዮ',
        titleDe: 'Foto zu Video',
        descEn: 'Turn photos into video',
        descTi: 'ስእሊ ናብ HD ቪድዮ ቀይር',
        descDe: 'Fotos in Video wandeln',
        status: 'live',
        iconBgClass: 'bg-gradient-to-br from-[#F43F5E] to-[#DC2626]',
        icon: Film,
        onClick: () => {
          triggerTabTapHaptic();
          recordToolVisit('photo-to-video');
          setActiveTab('photo-to-video');
        },
      },
      {
        id: 'ai-document-assistant',
        category: 'writing-code',
        titleEn: 'AI Document Assistant',
        titleTi: 'ሓጋዚ ሰነዳት AI',
        titleDe: 'Dokument-Assistent',
        descEn: 'Draft & summarize docs',
        descTi: 'ሰነድ ጽሓፍን ኣሕጽርን',
        descDe: 'Dokumente entwerfen',
        status: 'live',
        iconBgClass: 'bg-gradient-to-br from-[#6366F1] to-[#4338CA]',
        icon: FileText,
        onClick: () => {
          triggerTabTapHaptic();
          recordToolVisit('ai-document-assistant');
          setIsDocumentAiModalOpen(true);
        },
      },
      {
        id: 'ai-research-assistant',
        category: 'research-pro',
        titleEn: 'AI Research Assistant',
        titleTi: 'ሓጋዚ መጽናዕቲ AI',
        titleDe: 'Recherche-Assistent',
        descEn: 'Deep AI research brief',
        descTi: 'ዓሚቝ መጽናዕቲ ብ AI',
        descDe: 'Tiefgehende Recherche',
        status: 'live',
        iconBgClass: 'bg-gradient-to-br from-[#0EA5E9] to-[#0369A1]',
        icon: Compass,
        onClick: () => {
          triggerTabTapHaptic();
          recordToolVisit('ai-research-assistant');
          if (onSelectPromptForChat) {
            onSelectPromptForChat(
              isTigrinya
                ? 'ብዛዕባዚ ርእሲ ብዝርዝር መጽናዕታዊ ትንተናን ቀንዲ ነጥብታትን ሃበኒ፡ '
                : 'Conduct a structured deep-reasoning research brief with key findings on: '
            );
          } else {
            setActiveTab('chat');
          }
        },
      },
      {
        id: 'ai-code-assistant',
        category: 'writing-code',
        titleEn: 'AI Code Assistant',
        titleTi: 'ሓጋዚ ኮድ AI',
        titleDe: 'Code-Assistent',
        descEn: 'Write code & prompts',
        descTi: 'ኮድን ፕሮምፕትን ፍጠር',
        descDe: 'Code & Prompts schreiben',
        status: 'live',
        iconBgClass: 'bg-gradient-to-br from-[#2563EB] to-[#1E40AF]',
        icon: Code2,
        onClick: () => {
          triggerTabTapHaptic();
          recordToolVisit('ai-code-assistant');
          setActiveTab('prompt-forge');
        },
      },
      {
        id: 'text-to-video',
        category: 'media',
        titleEn: 'Text to Video',
        titleTi: 'ጽሑፍ ናብ ቪድዮ',
        titleDe: 'Text zu Video',
        descEn: 'Text prompts to video',
        descTi: 'ካብ ጽሑፍ ቪድዮ ፍጠር',
        descDe: 'Text zu Video erzeugen',
        status: 'planned',
        iconBgClass: 'bg-gradient-to-br from-[#FB7185] to-[#BE123C]',
        icon: Video,
        draftPrompt: isTigrinya
          ? 'ን Text-to-Video ስክሪፕትን ትርኢታትን ብዝርዝር ኣዳልወለይ፡ '
          : 'Write a detailed scene-by-scene video storyboard & narration script for: ',
        onClick: () => {},
      },
      {
        id: 'ai-cartoon-creator',
        category: 'media',
        titleEn: 'AI Cartoon Creator',
        titleTi: 'ፈጣሪ ካርቱን AI',
        titleDe: 'Cartoon-Creator',
        descEn: 'Stylized cartoon art',
        descTi: 'ስእሊ ናብ ካርቱን ቀይር',
        descDe: 'Cartoon-Kunst erstellen',
        status: 'planned',
        iconBgClass: 'bg-gradient-to-br from-[#A855F7] to-[#7E22CE]',
        icon: Palette,
        draftPrompt: isTigrinya
          ? 'ን AI ካርቱን ስእሊ ዝኸውን ዝርዝር ስነ-ጥበባዊ መግለጺ ፍጠረለይ፡ '
          : 'Design an illustrated cartoon character & scene art prompt for: ',
        onClick: () => {},
      },
      {
        id: 'ai-presentation-maker',
        category: 'writing-code',
        titleEn: 'AI Presentation Maker',
        titleTi: 'መዳለዊ ፕረዘንተሽን AI',
        titleDe: 'Präsentationsstudio',
        descEn: 'Build AI slide decks',
        descTi: 'ስላይድ ፕረዘንተሽን ኣዳሉ',
        descDe: 'Foliensätze erstellen',
        status: 'planned',
        iconBgClass: 'bg-gradient-to-br from-[#F59E0B] to-[#D97706]',
        icon: Presentation,
        draftPrompt: isTigrinya
          ? '10 ስላይድ ዘለዎ ፕረዘንተሽን ምስ ነጥብታቱ ኣዳልወለይ፡ '
          : 'Create a 10-slide presentation outline with headlines and speaker notes for: ',
        onClick: () => {},
      },
    ],
    [isTigrinya, onSelectPromptForChat, recordToolVisit, setActiveTab]
  );

  // Additional existing platform studios unlocked via "View All"
  const additionalExistingStudios = useMemo(
    () => [
      {
        id: 'video-dubbing',
        category: 'media' as ToolCategoryId,
        labelEn: 'Video Dubbing',
        labelTi: 'ተርጓሚ ቪድዮ',
        iconBgClass: 'bg-gradient-to-br from-[#FB7185] to-[#BE123C]',
        icon: Video,
        onClick: () => {
          recordToolVisit('video-dubbing');
          onOpenVideoTranslator?.();
        },
      },
      {
        id: 'geez-calligraphy',
        category: 'media' as ToolCategoryId,
        labelEn: "Ge'ez Calligraphy",
        labelTi: 'ኪነ-ጽሕፈት ግዕዝ',
        iconBgClass: 'bg-gradient-to-br from-[#FBBF24] to-[#B45309]',
        icon: Palette,
        onClick: () => {
          recordToolVisit('geez-calligraphy');
          setActiveTab('calligraphy');
        },
      },
      {
        id: 'business-hub',
        category: 'research-pro' as ToolCategoryId,
        labelEn: 'Business Hub',
        labelTi: 'ንግዲ AI',
        iconBgClass: 'bg-gradient-to-br from-[#6366F1] to-[#312E81]',
        icon: Building2,
        onClick: () => {
          recordToolVisit('business-hub');
          setActiveTab('business-hub');
        },
      },
      {
        id: 'scholarships',
        category: 'research-pro' as ToolCategoryId,
        labelEn: 'Scholarships',
        labelTi: 'ስኮላርሺፕ',
        iconBgClass: 'bg-gradient-to-br from-[#10B981] to-[#047857]',
        icon: GraduationCap,
        onClick: () => {
          recordToolVisit('scholarships');
          if (onOpenScholarship) onOpenScholarship();
          else setActiveTab('education');
        },
      },
      {
        id: 'job-finder',
        category: 'research-pro' as ToolCategoryId,
        labelEn: 'Job Finder',
        labelTi: 'ምርካብ ስራሕ',
        iconBgClass: 'bg-gradient-to-br from-[#0EA5E9] to-[#0369A1]',
        icon: Briefcase,
        onClick: () => {
          recordToolVisit('job-finder');
          if (onOpenJobSearch) onOpenJobSearch();
          else setActiveTab('chat');
        },
      },
      {
        id: 'legal-advisor',
        category: 'research-pro' as ToolCategoryId,
        labelEn: 'Legal AI',
        labelTi: 'ኣማኻሪ ሕጊ',
        iconBgClass: 'bg-gradient-to-br from-[#F59E0B] to-[#92400E]',
        icon: Compass,
        onClick: () => {
          recordToolVisit('legal-advisor');
          if (onOpenLegalAdvisor) onOpenLegalAdvisor();
          else setActiveTab('chat');
        },
      },
      {
        id: 'cultural-archive',
        category: 'research-pro' as ToolCategoryId,
        labelEn: 'Cultural Archive',
        labelTi: 'ባህላዊ ቅርሲ',
        iconBgClass: 'bg-gradient-to-br from-[#14B8A6] to-[#0F766E]',
        icon: Landmark,
        onClick: () => {
          recordToolVisit('cultural-archive');
          setActiveTab('cultural-explorer');
        },
      },
      {
        id: 'quick-ask',
        category: 'writing-code' as ToolCategoryId,
        labelEn: 'Quick Ask AI',
        labelTi: 'ቅጽበታዊ ሕቶ',
        iconBgClass: 'bg-gradient-to-br from-[#64748B] to-[#334155]',
        icon: PenLine,
        onClick: () => {
          recordToolVisit('quick-ask');
          setIsWrittenChatModalOpen(true);
        },
      },
      {
        id: 'daily-wisdom',
        category: 'research-pro' as ToolCategoryId,
        labelEn: 'Daily Wisdom',
        labelTi: 'ዕለታዊ ጥበብ',
        iconBgClass: 'bg-gradient-to-br from-[#FB923C] to-[#C2410C]',
        icon: Flame,
        onClick: () => {
          recordToolVisit('daily-wisdom');
          if (onOpenDailyWisdom) onOpenDailyWisdom();
          else setActiveTab('cultural-explorer');
        },
      },
      {
        id: 'upgrade-pro',
        category: 'research-pro' as ToolCategoryId,
        labelEn: 'PayPal Pro',
        labelTi: 'ክፍሊት Pro',
        iconBgClass: 'bg-gradient-to-br from-[#FBBF24] to-[#D97706]',
        icon: Crown,
        onClick: () => {
          recordToolVisit('upgrade-pro');
          setActiveTab('payment');
        },
      },
    ],
    [
      onOpenDailyWisdom,
      onOpenJobSearch,
      onOpenLegalAdvisor,
      onOpenScholarship,
      onOpenVideoTranslator,
      recordToolVisit,
      setActiveTab,
    ]
  );

  // Unified lookup map for Recent / Favorites / Recommendations
  const toolQuickLookup = useMemo(() => {
    const map = new Map<
      string,
      { id: string; label: string; icon: React.FC<{ className?: string }>; onClick: () => void; iconBg: string }
    >();
    primaryTools.forEach((t) =>
      map.set(t.id, {
        id: t.id,
        label: pickLabel(t.titleEn, t.titleTi, t.titleDe),
        icon: t.icon,
        onClick: t.onClick,
        iconBg: t.iconBgClass,
      })
    );
    popularTools.forEach((t) =>
      map.set(t.id, {
        id: t.id,
        label: pickLabel(t.labelEn, t.labelTi, t.labelDe),
        icon: t.icon,
        onClick: t.onClick,
        iconBg: t.iconBgClass,
      })
    );
    discoveryTools.forEach((t) =>
      map.set(t.id, {
        id: t.id,
        label: pickLabel(t.titleEn, t.titleTi, t.titleDe),
        icon: t.icon,
        onClick: () => (t.status === 'planned' ? setPlannedModalTool(t) : t.onClick()),
        iconBg: t.iconBgClass,
      })
    );
    return map;
  }, [discoveryTools, pickLabel, popularTools, primaryTools]);

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredPrimaryTools = useMemo(
    () =>
      primaryTools.filter((t) => {
        const catOk = selectedCategory === 'all' || t.category === selectedCategory;
        if (!catOk) return false;
        if (!normalizedQuery) return true;
        return (
          t.titleEn.toLowerCase().includes(normalizedQuery) ||
          t.titleTi.toLowerCase().includes(normalizedQuery) ||
          t.descEn.toLowerCase().includes(normalizedQuery) ||
          t.descTi.toLowerCase().includes(normalizedQuery)
        );
      }),
    [normalizedQuery, primaryTools, selectedCategory]
  );

  const filteredPopularTools = useMemo(
    () =>
      popularTools.filter((t) => {
        const catOk = selectedCategory === 'all' || t.category === selectedCategory;
        if (!catOk) return false;
        if (!normalizedQuery) return true;
        return (
          t.labelEn.toLowerCase().includes(normalizedQuery) ||
          t.labelTi.toLowerCase().includes(normalizedQuery)
        );
      }),
    [normalizedQuery, popularTools, selectedCategory]
  );

  const filteredDiscoveryTools = useMemo(
    () =>
      discoveryTools.filter((t) => {
        const catOk = selectedCategory === 'all' || t.category === selectedCategory;
        if (!catOk) return false;
        if (!normalizedQuery) return true;
        return (
          t.titleEn.toLowerCase().includes(normalizedQuery) ||
          t.titleTi.toLowerCase().includes(normalizedQuery) ||
          t.descEn.toLowerCase().includes(normalizedQuery) ||
          t.descTi.toLowerCase().includes(normalizedQuery)
        );
      }),
    [discoveryTools, normalizedQuery, selectedCategory]
  );

  const visibleDiscoveryTools = filteredDiscoveryTools;

  const categories: { id: ToolCategoryId; labelEn: string; labelTi: string; labelDe: string }[] = [
    { id: 'all', labelEn: 'All', labelTi: 'ኩሉ', labelDe: 'Alle' },
    { id: 'translation', labelEn: 'Translation', labelTi: 'ትርጉም', labelDe: 'Übersetzung' },
    { id: 'media', labelEn: 'Create & Media', labelTi: 'ምስልን ቪድዮን', labelDe: 'Medien' },
    { id: 'writing-code', labelEn: 'Writing & Code', labelTi: 'ጽሕፈትን ኮድን', labelDe: 'Text & Code' },
    { id: 'research-pro', labelEn: 'Research & Pro', labelTi: 'መጽናዕትን Pro', labelDe: 'Recherche' },
  ];

  const hasAnySearchOrFilter = Boolean(normalizedQuery) || selectedCategory !== 'all';
  const totalSearchMatches =
    filteredPrimaryTools.length + filteredPopularTools.length + filteredDiscoveryTools.length;

  return (
    <div
      id="premiere-view-root"
      className="min-h-screen font-sans pb-24 sm:pb-28 pt-2.5 sm:pt-4 px-3 sm:px-6 relative overflow-x-hidden"
    >
      <div className="max-w-6xl mx-auto space-y-5 sm:space-y-6 relative z-10">
        {/* ===================================================================== */}
        {/* 1. COMPACT PREMIUM HERO BANNER                                        */}
        {/* ===================================================================== */}
        <section
          aria-label={isTigrinya ? 'ናይ መእተዊ ባነር' : 'Welcome Hero Banner'}
          className="relative rounded-[24px] sm:rounded-[28px] overflow-hidden bg-gradient-to-br from-[#07143F] via-[#1B2276] to-[#3B1D8E] shadow-[0_14px_38px_rgba(27,34,118,0.28)] px-4 py-4 sm:px-8 sm:py-6"
        >
          <div
            className="absolute -left-16 -bottom-20 w-72 h-72 bg-cyan-400/20 blur-3xl rounded-full pointer-events-none"
            aria-hidden="true"
          />
          <div
            className="absolute right-8 -top-14 w-64 h-64 bg-purple-400/20 blur-3xl rounded-full pointer-events-none"
            aria-hidden="true"
          />

          <div className="relative z-10 grid grid-cols-12 items-center gap-2 sm:gap-5">
            <div className="col-span-7 sm:col-span-8 space-y-2 sm:space-y-2.5">
              <div className="space-y-0.5">
                <p className="text-[10.5px] sm:text-xs font-bold text-cyan-200/95 leading-tight font-ethiopic">
                  {pickLabel('Welcome to', 'እንቋዕ ብደሓን መጻእኩም', 'Willkommen bei')}
                </p>
                <h1 className="text-[19px] sm:text-[30px] font-black tracking-tight leading-none text-balance">
                  <span className="text-white">AXUMITE </span>
                  <span className="bg-gradient-to-r from-[#22D3EE] via-[#A78BFA] to-[#EC4899] bg-clip-text text-transparent">
                    AI
                  </span>
                </h1>
                <p className="text-[11px] sm:text-sm font-semibold text-white/95 leading-snug font-ethiopic">
                  {pickLabel(
                    'Your All-in-One Intelligent AI Platform',
                    'ኩሉ ዘጠቓልል ብልሒ AI መድረኽ',
                    'Ihre All-in-One KI-Plattform'
                  )}
                </p>
              </div>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => {
                    triggerTabTapHaptic();
                    setShowAllDiscovery(true);
                    document
                      .getElementById('primary-tools-section')
                      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className="inline-flex items-center gap-1.5 h-8 sm:h-9 px-3.5 sm:px-4 rounded-full bg-gradient-to-r from-[#22D3EE] via-[#0EA5E9] to-[#4F46E5] hover:brightness-110 text-white font-bold text-[10.5px] sm:text-xs shadow-[0_8px_22px_rgba(14,165,233,0.42)] cursor-pointer active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                >
                  <span className="font-ethiopic whitespace-nowrap">
                    {pickLabel('Explore AI Tools', 'መሳርሒታት AI ርኣዩ', 'KI-Tools entdecken')}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="col-span-5 sm:col-span-4 flex items-center justify-end">
              <div className="w-full max-w-[148px] sm:max-w-[215px] aspect-[280/200]">
                <HeroIllustrationSvg />
              </div>
            </div>
          </div>
        </section>

        {/* ===================================================================== */}
        {/* 2. SIX PRIMARY AI TOOLS (Unclipped Mobile-First Two-Column Cards)     */}
        {/* ===================================================================== */}
        <section
          id="primary-tools-section"
          aria-label={isTigrinya ? 'ቀንዲ ናይ ትርጉም መሳርሒታት' : 'Primary AI Translation Tools'}
        >
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
            {filteredPrimaryTools.map((card) => {
              const Icon = card.icon;
              const title = pickLabel(card.titleEn, card.titleTi, card.titleDe);
              const desc = pickLabel(card.descEn, card.descTi, card.descDe);

              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={card.onClick}
                  className={`group text-left rounded-[18px] sm:rounded-[22px] border p-2.5 sm:p-3.5 shadow-[0_6px_20px_rgba(30,58,138,0.06)] dark:shadow-[0_10px_28px_rgba(2,6,23,0.45)] hover:shadow-[0_12px_28px_rgba(37,99,235,0.14)] hover:-translate-y-0.5 active:scale-[0.985] transition-all duration-200 cursor-pointer flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${card.cardBgClass}`}
                >
                  {/* Mobile top row: 3D Icon + Right Arrow | Desktop left: 3D Icon */}
                  <div className="flex items-center justify-between sm:justify-start gap-2.5 w-full sm:w-auto">
                    <div
                      className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform duration-150 ${card.iconBgClass}`}
                    >
                      <Icon className="w-4.5 h-4.5 sm:w-5 sm:h-5 stroke-[2.2]" aria-hidden="true" />
                    </div>

                    <span
                      aria-hidden="true"
                      className={`flex sm:hidden w-6 h-6 rounded-full items-center justify-center shrink-0 transition-colors ${card.arrowClass}`}
                    >
                      <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
                    </span>
                  </div>

                  {/* Full Unclipped Compact Title + Micro Subtitle */}
                  <div className="flex-1 min-w-0">
                    <h2 className="text-[11.5px] sm:text-[13px] font-bold text-slate-900 dark:text-white leading-tight break-words font-ethiopic">
                      {title}
                    </h2>
                    <p className="text-[9.5px] sm:text-[10.5px] text-slate-600 dark:text-slate-300 leading-tight mt-0.5 line-clamp-1 font-ethiopic">
                      {desc}
                    </p>
                  </div>

                  {/* Desktop/Tablet Right Arrow */}
                  <span
                    aria-hidden="true"
                    className={`hidden sm:flex w-7 h-7 rounded-full items-center justify-center shrink-0 transition-colors ${card.arrowClass}`}
                  >
                    <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* ===================================================================== */}
        {/* 3. POPULAR TOOLS (Mobile Horizontal 3-Card Carousel + Desktop Grid)   */}
        {/* ===================================================================== */}
        <section
          id="popular-tools-section"
          aria-labelledby="popular-tools-heading"
          className="space-y-2.5"
        >
          <div className="flex items-center justify-between px-0.5">
            <h2
              id="popular-tools-heading"
              className="flex items-center gap-1.5 text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white font-ethiopic"
            >
              <Flame className="w-4 h-4 text-orange-500 fill-orange-400 shrink-0" aria-hidden="true" />
              <span>{pickLabel('Popular Tools', 'ፍቱዋት መሳርሒታት', 'Beliebte Tools')}</span>
            </h2>

            <button
              type="button"
              onClick={() => {
                setShowAllDiscovery(true);
                document
                  .getElementById('discover-more-section')
                  ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className="inline-flex items-center gap-1 text-[10.5px] sm:text-[11px] font-bold text-[#2563EB] dark:text-sky-400 hover:text-blue-700 cursor-pointer px-2 py-1 rounded-lg hover:bg-blue-50/80 dark:hover:bg-slate-800/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <span className="font-ethiopic whitespace-nowrap">
                {pickLabel('View All', 'ኩሉ ርኣይ', 'Alle ansehen')}
              </span>
              <ArrowRight className="w-3 h-3" aria-hidden="true" />
            </button>
          </div>

          {filteredPopularTools.length > 0 && (
            <div className="flex overflow-x-auto snap-x snap-mandatory gap-2 scrollbar-none pb-1 sm:grid sm:grid-cols-3 lg:grid-cols-6 sm:gap-2.5 sm:overflow-visible">
              {filteredPopularTools.map((tool) => {
                const Icon = tool.icon;
                return (
                  <button
                    key={tool.id}
                    type="button"
                    onClick={tool.onClick}
                    className={`group flex flex-col items-center justify-center text-center rounded-2xl border p-2 sm:p-2.5 shadow-[0_6px_18px_rgba(30,58,138,0.05)] dark:shadow-[0_8px_22px_rgba(2,6,23,0.4)] hover:shadow-[0_10px_24px_rgba(37,99,235,0.12)] hover:-translate-y-0.5 active:scale-95 transition-all cursor-pointer min-h-[82px] sm:min-h-[90px] w-[31%] min-w-[98px] shrink-0 snap-start sm:w-auto sm:min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${tool.tileBgClass}`}
                  >
                    <div
                      className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-white mb-1.5 group-hover:scale-105 transition-transform ${tool.iconBgClass}`}
                    >
                      <Icon className="w-4.5 h-4.5 sm:w-5 sm:h-5" aria-hidden="true" />
                    </div>
                    <span className="text-[10px] sm:text-[11px] font-semibold text-slate-800 dark:text-slate-100 leading-tight line-clamp-2 font-ethiopic">
                      {pickLabel(tool.labelEn, tool.labelTi, tool.labelDe)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* ===================================================================== */}
        {/* 4. TOOL SEARCH & CATEGORY FILTER BAR                                  */}
        {/* ===================================================================== */}
        <section
          aria-label={isTigrinya ? 'መባጽሒን ምድላይን መሳርሒታት' : 'Quick Access and Tool Search'}
          className="space-y-3"
        >
          <div className="rounded-2xl bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border border-indigo-100/90 dark:border-slate-800 p-2.5 sm:p-3 shadow-[0_6px_22px_rgba(30,58,138,0.05)] space-y-2.5">
            <div className="relative flex items-center">
              <Search
                className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-3 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={pickLabel(
                  'Search AI tools...',
                  'መሳርሒ AI ድለይ...',
                  'KI-Tools suchen...'
                )}
                aria-label={pickLabel('Search AI tools', 'መሳርሒ AI ድለይ', 'KI-Tools suchen')}
                className="w-full h-9 pl-9 pr-8 rounded-xl bg-slate-50/90 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 text-[11px] sm:text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 dark:focus:border-sky-400 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="absolute right-2 w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Segmented Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
              {categories.map((cat) => {
                const active = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    aria-pressed={active}
                    className={`px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer min-h-[30px] ${
                      active
                        ? 'bg-[#2563EB] text-white shadow-xs'
                        : 'bg-slate-100/90 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700'
                    }`}
                  >
                    {pickLabel(cat.labelEn, cat.labelTi, cat.labelDe)}
                  </button>
                );
              })}
            </div>

            {/* Recent Tools Strip (Only shown once user opens tools) */}
            {!hasAnySearchOrFilter && recentToolIds.length > 0 && (
              <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-1.5 text-[10px] sm:text-[11px]">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 shrink-0">
                  <Clock className="w-3 h-3 text-blue-600 dark:text-sky-400" aria-hidden="true" />
                  <span>{pickLabel('Recent:', 'ቀረባ:', 'Zuletzt:')}</span>
                </span>

                {recentToolIds.slice(0, 4).map((toolId) => {
                  const item = toolQuickLookup.get(toolId);
                  if (!item) return null;
                  const ItemIcon = item.icon;
                  return (
                    <button
                      key={toolId}
                      type="button"
                      onClick={item.onClick}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-50 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700 hover:border-blue-400 dark:hover:border-sky-400 text-slate-700 dark:text-slate-200 font-medium cursor-pointer transition-colors"
                    >
                      <ItemIcon className="w-3 h-3 text-blue-600 dark:text-sky-400 shrink-0" aria-hidden="true" />
                      <span className="truncate max-w-[120px] font-ethiopic">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Skeleton Loading State when Switching Filters/Search */}
          {isFilteringSkeleton && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3" aria-hidden="true">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-20 rounded-2xl bg-white/70 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 animate-pulse"
                />
              ))}
            </div>
          )}

          {hasAnySearchOrFilter && !isFilteringSkeleton && totalSearchMatches === 0 && (
            <div className="rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 p-5 text-center space-y-2">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                {pickLabel('No matching tools found', 'ዝሰማማዕ መሳርሒ ኣይተረኽበን', 'Keine passenden Tools gefunden')}
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-blue-600 text-white text-[10.5px] font-bold cursor-pointer"
              >
                {pickLabel('Reset Filters', 'ኩሉ ኣርኢ', 'Zurücksetzen')}
              </button>
            </div>
          )}
        </section>

        {/* ===================================================================== */}
        {/* 5. DISCOVER MORE WITH AXUMITE AI                                      */}
        {/* ===================================================================== */}
        <section
          id="discover-more-section"
          aria-labelledby="discover-more-heading"
          className="space-y-2.5 sm:space-y-3"
        >
          <div className="flex items-center justify-between px-0.5">
            <h2
              id="discover-more-heading"
              className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white font-ethiopic"
            >
              {pickLabel(
                'Discover More with AXUMITE AI',
                'ተወሳኺ ምስ AXUMITE AI ርኣዩ',
                'Mehr entdecken mit AXUMITE AI'
              )}
            </h2>

            <button
              type="button"
              onClick={() => setShowAllDiscovery((prev) => !prev)}
              className="inline-flex items-center gap-1 text-[10.5px] sm:text-[11px] font-bold text-[#2563EB] dark:text-sky-400 hover:text-blue-700 cursor-pointer px-2 py-1 rounded-lg hover:bg-blue-50/80 dark:hover:bg-slate-800/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <span className="font-ethiopic whitespace-nowrap">
                {showAllDiscovery
                  ? pickLabel('Show Less', 'ንእሽቶ ኣርኢ', 'Weniger')
                  : pickLabel('View All', 'ኩሉ ርኣይ', 'Alle ansehen')}
              </span>
              <ArrowRight className="w-3 h-3" aria-hidden="true" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            {visibleDiscoveryTools.map((item) => {
              const Icon = item.icon;
              const isPlanned = item.status === 'planned';
              const isNotified = plannedNotifyIds.includes(item.id);

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (isPlanned) {
                      triggerTabTapHaptic();
                      setPlannedModalTool(item);
                    } else {
                      item.onClick();
                    }
                  }}
                  className="group text-left rounded-2xl bg-white/95 dark:bg-slate-900/90 border border-slate-200/85 dark:border-slate-800 hover:border-blue-400 dark:hover:border-sky-400/60 p-2.5 sm:p-3 shadow-[0_6px_18px_rgba(30,58,138,0.05)] dark:shadow-[0_8px_22px_rgba(2,6,23,0.4)] hover:-translate-y-0.5 active:scale-[0.985] transition-all cursor-pointer flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <div className="flex items-center justify-between sm:justify-start w-full sm:w-auto">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs group-hover:scale-105 transition-transform ${item.iconBgClass}`}
                    >
                      <Icon className="w-4.5 h-4.5" aria-hidden="true" />
                    </div>
                    <ChevronRight
                      className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-sky-400 shrink-0 sm:hidden"
                      aria-hidden="true"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1.5">
                      <h3 className="text-[11px] sm:text-xs font-bold text-slate-900 dark:text-white leading-tight break-words font-ethiopic">
                        {pickLabel(item.titleEn, item.titleTi, item.titleDe)}
                      </h3>
                      <ChevronRight
                        className="hidden sm:block w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-sky-400 shrink-0"
                        aria-hidden="true"
                      />
                    </div>
                    <p className="text-[9.5px] sm:text-[10.5px] text-slate-600 dark:text-slate-300 mt-0.5 leading-tight line-clamp-1 font-ethiopic">
                      {pickLabel(item.descEn, item.descTi, item.descDe)}
                    </p>
                    {isPlanned && (
                      <p className="mt-1 text-[9.5px] font-semibold text-amber-700 dark:text-amber-300">
                        {isNotified
                          ? pickLabel('Planned · Alert on', 'ተመዲቡ · መፍለጢ ተኸፊቱ', 'Geplant · Aktiv')
                          : pickLabel('Planned', 'ተመዲቡ', 'Geplant')}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Full Studio Directory revealed on View All */}
          {showAllDiscovery && (
            <div className="pt-2 space-y-2">
              <p className="text-[10.5px] sm:text-xs font-bold text-slate-600 dark:text-slate-300 px-0.5">
                {pickLabel(
                  'More Live AXUMITE AI Studios',
                  'ተወሳኺ ህሉዋት መድረኻት AXUMITE AI',
                  'Weitere verfügbare AXUMITE AI Studios'
                )}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-2.5">
                {additionalExistingStudios.map((studio) => {
                  const Icon = studio.icon;
                  return (
                    <button
                      key={studio.id}
                      type="button"
                      onClick={studio.onClick}
                      className="group flex items-center sm:flex-col sm:justify-center sm:text-center gap-2 rounded-2xl bg-white/95 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 hover:border-blue-400 dark:hover:border-sky-400/60 p-2.5 shadow-[0_6px_18px_rgba(30,58,138,0.05)] hover:-translate-y-0.5 active:scale-95 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                      <div
                        className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 text-white shadow-xs ${studio.iconBgClass}`}
                      >
                        <Icon className="w-4 h-4 sm:w-4.5 sm:h-4.5" aria-hidden="true" />
                      </div>
                      <span className="text-[10px] sm:text-[11px] font-semibold text-slate-800 dark:text-slate-100 leading-tight text-left sm:text-center font-ethiopic">
                        {pickLabel(studio.labelEn, studio.labelTi)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Planned Tool Preview & Notify / Draft Prompt Dialog */}
      {plannedModalTool && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="planned-tool-dialog-title"
          onClick={() => setPlannedModalTool(null)}
        >
          <div
            className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white shrink-0 ${plannedModalTool.iconBgClass}`}
                >
                  <plannedModalTool.icon className="w-5 h-5" aria-hidden="true" />
                </div>
                <div>
                  <h3
                    id="planned-tool-dialog-title"
                    className="text-sm font-extrabold text-slate-900 dark:text-white font-ethiopic"
                  >
                    {pickLabel(
                      plannedModalTool.titleEn,
                      plannedModalTool.titleTi,
                      plannedModalTool.titleDe
                    )}
                  </h3>
                  <p className="text-[10.5px] text-amber-700 dark:text-amber-300 font-semibold">
                    {pickLabel('Planned', 'ተመዲቡ', 'Geplant')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPlannedModalTool(null)}
                aria-label="Close"
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-ethiopic">
              {pickLabel(
                plannedModalTool.descEn,
                plannedModalTool.descTi,
                plannedModalTool.descDe
              )}
            </p>

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                type="button"
                onClick={() => togglePlannedAlert(plannedModalTool.id)}
                className={`flex-1 h-9 px-3.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                  plannedNotifyIds.includes(plannedModalTool.id)
                    ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {plannedNotifyIds.includes(plannedModalTool.id) ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>{pickLabel('Alert Saved', 'መፍለጢ ተዓቂቡ', 'Aktiv')}</span>
                  </>
                ) : (
                  <>
                    {plannedNotifyIds.length ? <BellRing className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
                    <span>{pickLabel('Notify Me', 'ኣፍልጠኒ', 'Benachrichtigen')}</span>
                  </>
                )}
              </button>

              {plannedModalTool.draftPrompt && (
                <button
                  type="button"
                  onClick={() => {
                    const prompt = plannedModalTool.draftPrompt || '';
                    setPlannedModalTool(null);
                    if (onSelectPromptForChat) {
                      onSelectPromptForChat(prompt);
                    } else {
                      setActiveTab('chat');
                    }
                  }}
                  className="flex-1 h-9 px-3.5 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#4F46E5] text-white text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer hover:brightness-110 transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{pickLabel('Draft in AI Chat', 'ብ AI ቻት ጀምር', 'Im KI-Chat entwerfen')}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* On-Demand Lazy Modals Preserved */}
      <Suspense fallback={null}>
        {isWrittenChatModalOpen && (
          <WrittenChatModal
            isOpen={isWrittenChatModalOpen}
            onClose={() => setIsWrittenChatModalOpen(false)}
            user={user}
            onSaveInsight={onSaveInsight}
            onOpenAuthModal={onOpenAuthModal}
          />
        )}

        {isDocumentAiModalOpen && (
          <DocumentAiModal
            isOpen={isDocumentAiModalOpen}
            onClose={() => setIsDocumentAiModalOpen(false)}
            user={user}
            onNavigateToChat={() => setActiveTab('chat')}
          />
        )}
      </Suspense>
    </div>
  );
};
