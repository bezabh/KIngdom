import React, { useMemo, useState, useCallback, useRef, Suspense } from 'react';
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
  CloudDownload,
  Code2,
  Compass,
  Copy,
  Crown,
  FileText,
  Film,
  Flame,
  GraduationCap,
  History,
  Image as ImageIcon,
  Landmark,
  Languages,
  LayoutGrid,
  MessageCircleMore,
  MessagesSquare,
  Mic,
  Palette,
  PenLine,
  PhoneCall,
  Play,
  Presentation,
  Search,
  Sparkles,
  Star,
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

interface DirectoryTool {
  id: string;
  group: 'translation' | 'creative' | 'planned';
  titleEn: string;
  titleTi: string;
  titleDe: string;
  descEn: string;
  descTi: string;
  descDe: string;
  iconBgClass: string;
  icon: React.FC<{ className?: string }>;
  draftPrompt?: string;
  onClick: () => void;
}

const RECENT_TOOLS_KEY = 'axumite_recent_tools_v1';
const FAVORITE_TOOLS_KEY = 'axumite_favorite_tools_v1';
const PLANNED_ALERTS_KEY = 'axumite_planned_tool_alerts_v1';

const DEFAULT_FAVORITES = ['text-translate', 'live-conversation', 'image-generator', 'voice-translator'];

const MiniPointingBotSvg: React.FC = () => (
  <svg
    viewBox="0 0 112 108"
    fill="none"
    className="w-full h-full select-none pointer-events-none drop-shadow-[0_8px_16px_rgba(6,18,56,0.35)]"
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="miniBotBody" x1="20" y1="12" x2="88" y2="104" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="58%" stopColor="#E2E8F0" />
        <stop offset="100%" stopColor="#94A3B8" />
      </linearGradient>
      <linearGradient id="miniBotHeadset" x1="12" y1="20" x2="88" y2="62" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#38BDF8" />
        <stop offset="100%" stopColor="#1D4ED8" />
      </linearGradient>
    </defs>

    {/* Soft cyan glow halo */}
    <circle cx="50" cy="54" r="44" fill="#38BDF8" fillOpacity="0.16" />

    {/* Headset earcups & band */}
    <path d="M22 44C25 18 75 18 78 44" stroke="url(#miniBotHeadset)" strokeWidth="4.5" strokeLinecap="round" />
    <rect x="13" y="37" width="10" height="22" rx="5" fill="#0284C7" />
    <circle cx="18" cy="48" r="3" fill="#67E8F9" />
    <rect x="77" y="37" width="10" height="22" rx="5" fill="#0284C7" />
    <circle cx="82" cy="48" r="3" fill="#67E8F9" />

    {/* Head */}
    <rect x="20" y="24" width="60" height="44" rx="19" fill="url(#miniBotBody)" />
    <rect x="26" y="31" width="48" height="28" rx="12" fill="#07122E" />
    {/* Glowing cyan eyes */}
    <ellipse cx="41" cy="44" rx="4.2" ry="5.5" fill="#22D3EE" />
    <ellipse cx="59" cy="44" rx="4.2" ry="5.5" fill="#22D3EE" />
    <circle cx="42" cy="42.5" r="1.4" fill="#FFFFFF" />
    <circle cx="60" cy="42.5" r="1.4" fill="#FFFFFF" />
    <path d="M45 52.5C48 55 52 55 55 52.5" stroke="#38BDF8" strokeWidth="2.1" strokeLinecap="round" />

    {/* Neck + Torso */}
    <rect x="43" y="67" width="14" height="7" rx="3" fill="#1E3A8A" />
    <path
      d="M27 77C27 72 34 71 50 71C66 71 73 72 73 77L77 104H23L27 77Z"
      fill="url(#miniBotBody)"
    />
    {/* Chest core light */}
    <circle cx="50" cy="87" r="6" fill="#0EA5E9" fillOpacity="0.22" stroke="#38BDF8" strokeWidth="1.5" />
    <circle cx="50" cy="87" r="3" fill="#67E8F9" />

    {/* Left resting arm */}
    <path d="M27 81C19 85 16 94 18 103" stroke="url(#miniBotBody)" strokeWidth="9" strokeLinecap="round" />

    {/* Right pointing arm */}
    <path d="M72 80C82 78 90 71 96 63" stroke="url(#miniBotBody)" strokeWidth="9" strokeLinecap="round" />
    <circle cx="96.5" cy="62" r="5" fill="#FFFFFF" />
    <path d="M98 60L106 52" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" />
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
  onOpenHistory,
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

  const [askInput, setAskInput] = useState('');
  const askInputRef = useRef<HTMLInputElement | null>(null);
  const [showAllTools, setShowAllTools] = useState(false);
  const [allToolsSearch, setAllToolsSearch] = useState('');
  const [isFavoritesModalOpen, setIsFavoritesModalOpen] = useState(false);
  const [isWrittenChatModalOpen, setIsWrittenChatModalOpen] = useState(false);
  const [isDocumentAiModalOpen, setIsDocumentAiModalOpen] = useState(false);
  const [plannedModalTool, setPlannedModalTool] = useState<DirectoryTool | null>(null);

  const [recentToolIds, setRecentToolIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(RECENT_TOOLS_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });

  const [favoriteToolIds, setFavoriteToolIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(FAVORITE_TOOLS_KEY);
      return raw ? (JSON.parse(raw) as string[]) : DEFAULT_FAVORITES;
    } catch {
      return DEFAULT_FAVORITES;
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

  const toggleFavoriteTool = useCallback((toolId: string) => {
    triggerTabTapHaptic();
    setFavoriteToolIds((prev) => {
      const exists = prev.includes(toolId);
      const next = exists ? prev.filter((id) => id !== toolId) : [...prev, toolId];
      try {
        localStorage.setItem(FAVORITE_TOOLS_KEY, JSON.stringify(next));
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

  // Clean user first-name greeting
  const greetingFirstName = useMemo(() => {
    const rawName = (user.name || '').trim();
    const isGuest =
      !user.isLoggedIn ||
      user.email?.trim().toLowerCase() === 'guest@axumite.ai' ||
      !rawName ||
      rawName.toLowerCase().includes('guest') ||
      rawName.startsWith('ጋሻ');
    if (isGuest) {
      return isTigrinya ? 'ጋሻ' : isGerman ? 'Freund' : 'Friend';
    }
    return rawName.split(/\s+/)[0];
  }, [isGerman, isTigrinya, user.email, user.isLoggedIn, user.name]);

  const isProSubscribed = Boolean(
    user.isSubscribed || user.plan === 'Pro' || user.plan === 'Enterprise'
  );

  const handleAskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    triggerTabTapHaptic();
    recordToolVisit('ai-chat');
    const rawValue = askInput || askInputRef.current?.value || '';
    const trimmed = rawValue.trim();
    if (trimmed && onSelectPromptForChat) {
      setAskInput('');
      if (askInputRef.current) askInputRef.current.value = '';
      onSelectPromptForChat(trimmed);
    } else {
      setActiveTab('chat');
    }
  };

  // 1. FOUR MINIMAL QUICK-LAUNCH CARDS
  const quickCards = useMemo(
    () => [
      {
        id: 'ai-chat',
        label: pickLabel('Chat', 'ቻት', 'Chat'),
        ariaLabel: pickLabel('Open AI Chat', 'AI ቻት ክፈት', 'KI-Chat öffnen'),
        icon: MessageCircleMore,
        iconColorClass: 'text-[#0284C7] dark:text-sky-400',
        iconWrapClass: 'bg-sky-100/80 dark:bg-sky-500/20',
        onClick: () => {
          triggerTabTapHaptic();
          recordToolVisit('ai-chat');
          setActiveTab('chat');
        },
      },
      {
        id: 'text-translate',
        label: pickLabel('Translate', 'ትርጉም', 'Übersetzen'),
        ariaLabel: pickLabel('Open Translator', 'ተርጓሚ ክፈት', 'Übersetzer öffnen'),
        icon: Languages,
        iconColorClass: 'text-[#4F46E5] dark:text-indigo-400',
        iconWrapClass: 'bg-indigo-100/80 dark:bg-indigo-500/20',
        onClick: () => openTranslator('hub', 'text-translate'),
      },
      {
        id: 'image-generator',
        label: pickLabel('Image', 'ምስሊ', 'Bild'),
        ariaLabel: pickLabel('Open Image Studio', 'ምስሊ AI ክፈት', 'Bild-Studio öffnen'),
        icon: ImageIcon,
        iconColorClass: 'text-[#0EA5E9] dark:text-cyan-400',
        iconWrapClass:
          'bg-gradient-to-br from-amber-100 via-emerald-100 to-sky-100 dark:from-amber-500/20 dark:via-emerald-500/20 dark:to-sky-500/20',
        onClick: () => {
          triggerTabTapHaptic();
          recordToolVisit('image-generator');
          setActiveTab('vision');
        },
      },
      {
        id: 'video-generator',
        label: pickLabel('Video', 'ቪድዮ', 'Video'),
        ariaLabel: pickLabel('Open Video Studio', 'ቪድዮ AI ክፈት', 'Video-Studio öffnen'),
        icon: Video,
        iconColorClass: 'text-[#7C3AED] dark:text-purple-400',
        iconWrapClass: 'bg-purple-100/85 dark:bg-purple-500/20',
        onClick: () => {
          triggerTabTapHaptic();
          recordToolVisit('video-generator');
          setActiveTab('photo-to-video');
        },
      },
    ],
    [openTranslator, pickLabel, recordToolVisit, setActiveTab]
  );

  // 2. FOUR POPULAR TOOLS INSIDE THE FROSTED BAR
  const popularBarTools = useMemo(
    () => [
      {
        id: 'image-generator',
        label: pickLabel('Text-to-Image', 'ጽሑፍ-ምስሊ', 'Text-zu-Bild'),
        icon: Wand2,
        tileClass:
          'bg-gradient-to-br from-[#F3E8FF] to-[#E9D5FF] dark:from-purple-500/20 dark:to-violet-500/20 text-[#7C3AED] dark:text-purple-300',
        onClick: () => {
          triggerTabTapHaptic();
          recordToolVisit('image-generator');
          setActiveTab('vision');
        },
      },
      {
        id: 'video-generator',
        label: pickLabel('Text-to-Video', 'ጽሑፍ-ቪድዮ', 'Text-zu-Video'),
        icon: Play,
        tileClass:
          'bg-gradient-to-br from-[#FB923C] to-[#EA580C] text-white shadow-[0_6px_14px_rgba(234,88,12,0.28)]',
        onClick: () => {
          triggerTabTapHaptic();
          recordToolVisit('video-generator');
          setActiveTab('photo-to-video');
        },
      },
      {
        id: 'voice-translator',
        label: pickLabel('Voice Translator', 'ድምጺ ትርጉም', 'Sprach-KI'),
        icon: Mic,
        tileClass:
          'bg-[#ECFDF5] dark:bg-emerald-500/20 text-[#059669] dark:text-emerald-300',
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
        label: pickLabel('AI Writer', 'ጸሓፊ AI', 'KI-Autor'),
        icon: FileText,
        tileClass:
          'bg-gradient-to-br from-[#3B82F6] to-[#1D4ED8] text-white shadow-[0_6px_14px_rgba(29,78,216,0.28)]',
        onClick: () => {
          triggerTabTapHaptic();
          recordToolVisit('ai-writing');
          setIsDocumentAiModalOpen(true);
        },
      },
    ],
    [onOpenVoiceOverlay, openTranslator, pickLabel, recordToolVisit, setActiveTab]
  );

  // 3. FULL TOOL DIRECTORY (Preserves all 6 Primary Translation Tools + AI Studios)
  const directoryTools: DirectoryTool[] = useMemo(
    () => [
      {
        id: 'text-translate',
        group: 'translation',
        titleEn: 'Text Translate',
        titleTi: 'ትርጉም ጽሑፍ',
        titleDe: 'Textübersetzer',
        descEn: 'Translate text easily',
        descTi: 'ጽሑፍ ብቐሊሉ ተርጉም',
        descDe: 'Texte einfach übersetzen',
        iconBgClass: 'bg-gradient-to-br from-[#38BDF8] to-[#2563EB]',
        icon: Languages,
        onClick: () => openTranslator('hub', 'text-translate'),
      },
      {
        id: 'live-conversation',
        group: 'translation',
        titleEn: 'Live Conversation',
        titleTi: 'ቀጥታዊ ዕላል',
        titleDe: 'Live-Gespräch',
        descEn: 'Speak & translate live',
        descTi: 'ዘራረብን ተርጉምን',
        descDe: 'Live sprechen & übersetzen',
        iconBgClass: 'bg-gradient-to-br from-[#C084FC] to-[#7C3AED]',
        icon: MessagesSquare,
        onClick: () => openTranslator('conversation', 'live-conversation'),
      },
      {
        id: 'floating-translate',
        group: 'translation',
        titleEn: 'Floating Translate',
        titleTi: 'ተንሳፋፊ ትርጉም',
        titleDe: 'Schwebende Übersetzung',
        descEn: 'Translate anywhere',
        descTi: 'ኣብ ዝኾነ ቦታ ተርጉም',
        descDe: 'Überall übersetzen',
        iconBgClass: 'bg-gradient-to-br from-[#34D399] to-[#059669]',
        icon: Copy,
        onClick: () => openTranslator('screen-capture', 'floating-translate'),
      },
      {
        id: 'live-call-translate',
        group: 'translation',
        titleEn: 'Live Call Translate',
        titleTi: 'ትርጉም ጻውዒት',
        titleDe: 'Live-Anruf',
        descEn: 'Translate calls live',
        descTi: 'ጻውዒት ብቐጥታ ተርጉም',
        descDe: 'Anrufe live übersetzen',
        iconBgClass: 'bg-gradient-to-br from-[#FBBF24] to-[#EA580C]',
        icon: PhoneCall,
        onClick: () => openTranslator('call-translation', 'live-call-translate'),
      },
      {
        id: 'offline-neural',
        group: 'translation',
        titleEn: 'Offline Neural',
        titleTi: 'ኦፍላይን ኒውራል',
        titleDe: 'Offline-KI',
        descEn: 'Translate offline',
        descTi: 'ብዘይ ኢንተርነት ተርጉም',
        descDe: 'Offline übersetzen',
        iconBgClass: 'bg-gradient-to-br from-[#818CF8] to-[#4338CA]',
        icon: CloudDownload,
        onClick: () => openTranslator('offline-translation', 'offline-neural'),
      },
      {
        id: 'camera-ocr',
        group: 'translation',
        titleEn: 'Camera OCR',
        titleTi: 'ካሜራ OCR',
        titleDe: 'Kamera-OCR',
        descEn: 'Scan & extract text',
        descTi: 'ስእሊ ስካን ተርጉም',
        descDe: 'Text scannen & übersetzen',
        iconBgClass: 'bg-gradient-to-br from-[#4ADE80] to-[#15803D]',
        icon: Camera,
        onClick: () => openTranslator('camera-ocr', 'camera-ocr'),
      },
      {
        id: 'ai-chat',
        group: 'creative',
        titleEn: 'AI Chat',
        titleTi: 'AI ቻት',
        titleDe: 'KI-Chat',
        descEn: 'Intelligent assistant',
        descTi: 'ብልሒ AI ኣማኻሪ',
        descDe: 'KI-Assistent',
        iconBgClass: 'bg-gradient-to-br from-[#38BDF8] to-[#0284C7]',
        icon: Bot,
        onClick: () => {
          triggerTabTapHaptic();
          recordToolVisit('ai-chat');
          setActiveTab('chat');
        },
      },
      {
        id: 'image-generator',
        group: 'creative',
        titleEn: 'AI Photo & Image',
        titleTi: 'ምስሊን ኣርትዖትን',
        titleDe: 'KI-Bildstudio',
        descEn: 'Create & edit photos',
        descTi: 'ስእሊ ፍጠርን ኣመሓይሽን',
        descDe: 'Fotos generieren',
        iconBgClass: 'bg-gradient-to-br from-[#EC4899] to-[#9333EA]',
        icon: ImageIcon,
        onClick: () => {
          triggerTabTapHaptic();
          recordToolVisit('image-generator');
          setActiveTab('vision');
        },
      },
      {
        id: 'video-generator',
        group: 'creative',
        titleEn: 'Photo to Video',
        titleTi: 'ስእሊ ናብ ቪድዮ',
        titleDe: 'Foto zu Video',
        descEn: 'Turn photos into video',
        descTi: 'ስእሊ ናብ HD ቪድዮ ቀይር',
        descDe: 'Fotos animieren',
        iconBgClass: 'bg-gradient-to-br from-[#F43F5E] to-[#DC2626]',
        icon: Film,
        onClick: () => {
          triggerTabTapHaptic();
          recordToolVisit('video-generator');
          setActiveTab('photo-to-video');
        },
      },
      {
        id: 'voice-translator',
        group: 'creative',
        titleEn: 'Voice Translator',
        titleTi: 'ድምጺ AI',
        titleDe: 'Sprach-Übersetzer',
        descEn: 'Live voice translation',
        descTi: 'ድምጻዊ ትርጉም AI',
        descDe: 'Sprache übersetzen',
        iconBgClass: 'bg-gradient-to-br from-[#34D399] to-[#059669]',
        icon: Mic,
        onClick: () => {
          triggerTabTapHaptic();
          recordToolVisit('voice-translator');
          if (onOpenVoiceOverlay) onOpenVoiceOverlay();
          else openTranslator('voice-translation', 'voice-translator');
        },
      },
      {
        id: 'ai-writing',
        group: 'creative',
        titleEn: 'AI Writer & Docs',
        titleTi: 'ጸሓፊ ሰነዳት AI',
        titleDe: 'Dokument-Assistent',
        descEn: 'Draft & summarize docs',
        descTi: 'ሰነድ ጽሓፍን ኣሕጽርን',
        descDe: 'Dokumente schreiben',
        iconBgClass: 'bg-gradient-to-br from-[#6366F1] to-[#4338CA]',
        icon: FileText,
        onClick: () => {
          triggerTabTapHaptic();
          recordToolVisit('ai-writing');
          setIsDocumentAiModalOpen(true);
        },
      },
      {
        id: 'ai-coding',
        group: 'creative',
        titleEn: 'AI Code & Prompts',
        titleTi: 'ኮድን ፕሮምፕትን',
        titleDe: 'Code-Assistent',
        descEn: 'Write code & prompts',
        descTi: 'ኮድን ፕሮምፕትን ፍጠር',
        descDe: 'Code erstellen',
        iconBgClass: 'bg-gradient-to-br from-[#2563EB] to-[#1E40AF]',
        icon: Code2,
        onClick: () => {
          triggerTabTapHaptic();
          recordToolVisit('ai-coding');
          setActiveTab('prompt-forge');
        },
      },
      {
        id: 'video-dubbing',
        group: 'creative',
        titleEn: 'Video Dubbing',
        titleTi: 'ተርጓሚ ቪድዮ',
        titleDe: 'Video-Dubbing',
        descEn: 'Dub videos with AI',
        descTi: 'ቪድዮ ብድምጺ ተርጉም',
        descDe: 'Videos synchronisieren',
        iconBgClass: 'bg-gradient-to-br from-[#FB7185] to-[#BE123C]',
        icon: Video,
        onClick: () => {
          recordToolVisit('video-dubbing');
          onOpenVideoTranslator?.();
        },
      },
      {
        id: 'geez-calligraphy',
        group: 'creative',
        titleEn: "Ge'ez Calligraphy",
        titleTi: 'ኪነ-ጽሕፈት ግዕዝ',
        titleDe: 'Ge’ez-Kalligrafie',
        descEn: 'Ancient script art',
        descTi: 'ጥበባዊ ጽሕፈት ግዕዝ',
        descDe: 'Schriftkunst',
        iconBgClass: 'bg-gradient-to-br from-[#FBBF24] to-[#B45309]',
        icon: Palette,
        onClick: () => {
          recordToolVisit('geez-calligraphy');
          setActiveTab('calligraphy');
        },
      },
      {
        id: 'business-hub',
        group: 'creative',
        titleEn: 'Business Hub',
        titleTi: 'ንግዲ AI',
        titleDe: 'Business-Hub',
        descEn: 'Strategy & finance',
        descTi: 'ንግዳዊ ስትራተጂ',
        descDe: 'Unternehmensplanung',
        iconBgClass: 'bg-gradient-to-br from-[#6366F1] to-[#312E81]',
        icon: Building2,
        onClick: () => {
          recordToolVisit('business-hub');
          setActiveTab('business-hub');
        },
      },
      {
        id: 'scholarships',
        group: 'creative',
        titleEn: 'Scholarships',
        titleTi: 'ስኮላርሺፕ',
        titleDe: 'Stipendien',
        descEn: 'Academic grants',
        descTi: 'ዕድላት ትምህርቲ',
        descDe: 'Studienförderung',
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
        group: 'creative',
        titleEn: 'Job Finder',
        titleTi: 'ምርካብ ስራሕ',
        titleDe: 'Jobfinder',
        descEn: 'Career matching',
        descTi: 'ዕድላት ስራሕ',
        descDe: 'Karrieresuche',
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
        group: 'creative',
        titleEn: 'Legal AI',
        titleTi: 'ኣማኻሪ ሕጊ',
        titleDe: 'Rechts-KI',
        descEn: 'Legal guidance',
        descTi: 'ሕጋዊ ምኽሪ',
        descDe: 'Rechtshinweise',
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
        group: 'creative',
        titleEn: 'Cultural Archive',
        titleTi: 'ባህላዊ ቅርሲ',
        titleDe: 'Kulturarchiv',
        descEn: 'Heritage & history',
        descTi: 'ታሪኽን ቅርስን',
        descDe: 'Geschichte & Erbe',
        iconBgClass: 'bg-gradient-to-br from-[#14B8A6] to-[#0F766E]',
        icon: Landmark,
        onClick: () => {
          recordToolVisit('cultural-archive');
          setActiveTab('cultural-explorer');
        },
      },
      {
        id: 'quick-ask',
        group: 'creative',
        titleEn: 'Quick Ask AI',
        titleTi: 'ቅጽበታዊ ሕቶ',
        titleDe: 'Schnellfrage',
        descEn: 'Instant Q&A modal',
        descTi: 'ቀልጢፍካ ሕተት',
        descDe: 'Direkt fragen',
        iconBgClass: 'bg-gradient-to-br from-[#64748B] to-[#334155]',
        icon: PenLine,
        onClick: () => {
          recordToolVisit('quick-ask');
          setIsWrittenChatModalOpen(true);
        },
      },
      {
        id: 'daily-wisdom',
        group: 'creative',
        titleEn: 'Daily Wisdom',
        titleTi: 'ዕለታዊ ጥበብ',
        titleDe: 'Tagesweisheit',
        descEn: 'Tigrinya proverbs',
        descTi: 'ምስላታት ኣበው',
        descDe: 'Weisheiten',
        iconBgClass: 'bg-gradient-to-br from-[#FB923C] to-[#C2410C]',
        icon: Flame,
        onClick: () => {
          recordToolVisit('daily-wisdom');
          if (onOpenDailyWisdom) onOpenDailyWisdom();
          else setActiveTab('cultural-explorer');
        },
      },
      {
        id: 'text-to-video-planned',
        group: 'planned',
        titleEn: 'Text to Video',
        titleTi: 'ጽሑፍ ናብ ቪድዮ',
        titleDe: 'Text zu Video',
        descEn: 'Text prompts to video',
        descTi: 'ካብ ጽሑፍ ቪድዮ ፍጠር',
        descDe: 'Text zu Video erzeugen',
        iconBgClass: 'bg-gradient-to-br from-[#FB7185] to-[#BE123C]',
        icon: Video,
        draftPrompt: isTigrinya
          ? 'ን Text-to-Video ስክሪፕትን ትርኢታትን ብዝርዝር ኣዳልወለይ፡ '
          : 'Write a detailed scene-by-scene video storyboard & narration script for: ',
        onClick: () => {},
      },
      {
        id: 'ai-cartoon-creator',
        group: 'planned',
        titleEn: 'AI Cartoon Creator',
        titleTi: 'ፈጣሪ ካርቱን AI',
        titleDe: 'Cartoon-Creator',
        descEn: 'Stylized cartoon art',
        descTi: 'ስእሊ ናብ ካርቱን ቀይር',
        descDe: 'Cartoon-Kunst erstellen',
        iconBgClass: 'bg-gradient-to-br from-[#A855F7] to-[#7E22CE]',
        icon: Palette,
        draftPrompt: isTigrinya
          ? 'ን AI ካርቱን ስእሊ ዝኸውን ዝርዝር ስነ-ጥበባዊ መግለጺ ፍጠረለይ፡ '
          : 'Design an illustrated cartoon character & scene art prompt for: ',
        onClick: () => {},
      },
      {
        id: 'ai-presentation-maker',
        group: 'planned',
        titleEn: 'AI Presentation Maker',
        titleTi: 'መዳለዊ ፕረዘንተሽን AI',
        titleDe: 'Präsentationsstudio',
        descEn: 'Build AI slide decks',
        descTi: 'ስላይድ ፕረዘንተሽን ኣዳሉ',
        descDe: 'Foliensätze erstellen',
        iconBgClass: 'bg-gradient-to-br from-[#F59E0B] to-[#D97706]',
        icon: Presentation,
        draftPrompt: isTigrinya
          ? '10 ስላይድ ዘለዎ ፕረዘንተሽን ምስ ነጥብታቱ ኣዳልወለይ፡ '
          : 'Create a 10-slide presentation outline with headlines and speaker notes for: ',
        onClick: () => {},
      },
    ],
    [
      isTigrinya,
      onOpenDailyWisdom,
      onOpenJobSearch,
      onOpenLegalAdvisor,
      onOpenScholarship,
      onOpenVideoTranslator,
      onOpenVoiceOverlay,
      openTranslator,
      recordToolVisit,
      setActiveTab,
    ]
  );

  const normalizedToolSearch = allToolsSearch.trim().toLowerCase();
  const visibleDirectoryTools = useMemo(() => {
    if (!normalizedToolSearch) return directoryTools;
    return directoryTools.filter(
      (tool) =>
        tool.titleEn.toLowerCase().includes(normalizedToolSearch) ||
        tool.titleTi.toLowerCase().includes(normalizedToolSearch) ||
        tool.descEn.toLowerCase().includes(normalizedToolSearch)
    );
  }, [directoryTools, normalizedToolSearch]);

  const favoriteToolsList = useMemo(
    () => directoryTools.filter((t) => favoriteToolIds.includes(t.id)),
    [directoryTools, favoriteToolIds]
  );

  const recentToolsList = useMemo(
    () =>
      recentToolIds
        .map((id) => directoryTools.find((t) => t.id === id))
        .filter((t): t is DirectoryTool => Boolean(t)),
    [directoryTools, recentToolIds]
  );

  return (
    <div
      id="premiere-view-root"
      className="min-h-screen font-sans pb-24 sm:pb-28 pt-3 sm:pt-5 px-3.5 sm:px-6 relative overflow-x-hidden"
    >
      <div className="max-w-3xl mx-auto space-y-4 sm:space-y-5 relative z-10">
        {/* ===================================================================== */}
        {/* 1. PERSONALIZED GREETING                                              */}
        {/* ===================================================================== */}
        <section
          aria-label={isTigrinya ? 'ሰላምታ ተጠቃሚ' : 'Personal greeting'}
          className="px-0.5 space-y-0.5"
        >
          <h1 className="text-[20px] sm:text-[26px] font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight font-ethiopic">
            {pickLabel('Hello,', 'ሰላም', 'Hallo,')} {greetingFirstName}{' '}
            <span aria-hidden="true">👋</span>
          </h1>
          <p className="text-[12px] sm:text-[13.5px] font-medium text-slate-600 dark:text-slate-300 font-ethiopic">
            {pickLabel(
              'What would you like to do today?',
              'ሎሚ እንታይ ክትሰርሑ ትደልዩ?',
              'Was möchten Sie heute tun?'
            )}
          </p>
        </section>

        {/* ===================================================================== */}
        {/* 2. FLOATING GLASS ASK BAR ("Ask AXUMITE AI anything...")              */}
        {/* ===================================================================== */}
        <form
          onSubmit={handleAskSubmit}
          aria-label={isTigrinya ? 'ን AXUMITE AI ሕተት' : 'Ask AXUMITE AI'}
          className="relative flex items-center gap-2 h-12 sm:h-13 pl-3 pr-1.5 rounded-full bg-white/95 dark:bg-[#0F172A]/95 border border-indigo-100/90 dark:border-indigo-500/30 shadow-[0_8px_26px_rgba(37,99,235,0.09)] dark:shadow-[0_10px_28px_rgba(2,6,23,0.45)] focus-within:ring-2 focus-within:ring-blue-500/60 transition-all"
        >
          <span
            aria-hidden="true"
            className="w-8 h-8 rounded-full bg-sky-50 dark:bg-sky-500/15 flex items-center justify-center shrink-0"
          >
            <Sparkles className="w-4 h-4 text-[#2563EB] dark:text-sky-400" />
          </span>

          <input
            ref={askInputRef}
            id="axumite-home-ask-input"
            type="text"
            value={askInput}
            onChange={(e) => setAskInput(e.target.value)}
            placeholder={pickLabel(
              'Ask AXUMITE AI anything...',
              'ን AXUMITE AI ዝኾነ ሕተቱ...',
              'Fragen Sie AXUMITE AI etwas...'
            )}
            aria-label={pickLabel(
              'Ask AXUMITE AI anything',
              'ን AXUMITE AI ዝኾነ ሕተቱ',
              'Fragen Sie AXUMITE AI etwas'
            )}
            className="flex-1 min-w-0 bg-transparent text-[12px] sm:text-[13px] font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none font-ethiopic"
          />

          <button
            type="submit"
            id="axumite-home-ask-submit"
            aria-label={pickLabel('Send prompt to AI Chat', 'ናብ AI ቻት ስደድ', 'An KI-Chat senden')}
            className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#06B6D4] via-[#3B82F6] to-[#8B5CF6] hover:brightness-110 text-white flex items-center justify-center shadow-[0_6px_16px_rgba(59,130,246,0.4)] cursor-pointer active:scale-95 transition-all shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            <ArrowRight className="w-4 h-4 stroke-[2.4]" aria-hidden="true" />
          </button>
        </form>

        {/* ===================================================================== */}
        {/* 3. FOUR MINIMAL QUICK-LAUNCH CARDS (Chat, Translate, Image, Video)    */}
        {/* ===================================================================== */}
        <section aria-label={isTigrinya ? 'ቀንዲ መተግበሪታት' : 'Quick actions'}>
          <div className="grid grid-cols-4 gap-2 sm:gap-3.5">
            {quickCards.map((card) => {
              const Icon = card.icon;
              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={card.onClick}
                  aria-label={card.ariaLabel}
                  className="group flex flex-col items-center justify-center rounded-2xl bg-white/95 dark:bg-[#0F172A]/90 border border-indigo-100/80 dark:border-indigo-500/20 p-2.5 sm:p-3.5 shadow-[0_6px_20px_rgba(30,58,138,0.06)] dark:shadow-[0_8px_22px_rgba(2,6,23,0.4)] hover:border-blue-300 dark:hover:border-sky-400/50 hover:-translate-y-0.5 active:scale-95 transition-all cursor-pointer min-h-[76px] sm:min-h-[88px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <div
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform ${card.iconWrapClass}`}
                  >
                    <Icon className={`w-4.5 h-4.5 sm:w-5 sm:h-5 stroke-[2.2] ${card.iconColorClass}`} aria-hidden="true" />
                  </div>
                  <span className="text-[10px] sm:text-[11.5px] font-semibold text-slate-800 dark:text-slate-100 leading-tight text-center font-ethiopic">
                    {card.label}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* ===================================================================== */}
        {/* 4. COMPACT "UNLOCK MORE WITH PRO" GRADIENT BANNER                     */}
        {/* ===================================================================== */}
        <section
          aria-label={isTigrinya ? 'ኣክሱማይት Pro' : 'Axumite Pro Membership'}
          className="relative rounded-[22px] overflow-hidden bg-gradient-to-r from-[#0EA5E9] via-[#2563EB] to-[#7C3AED] shadow-[0_12px_30px_rgba(37,99,235,0.28)] px-3 py-2.5 sm:px-5 sm:py-3"
        >
          <div
            aria-hidden="true"
            className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-purple-400/25 blur-2xl pointer-events-none"
          />
          <div
            aria-hidden="true"
            className="absolute left-20 -bottom-10 w-32 h-32 rounded-full bg-cyan-300/20 blur-2xl pointer-events-none"
          />

          <div className="relative z-10 flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 -my-1 -ml-1">
                <MiniPointingBotSvg />
              </div>

              <div className="min-w-0 space-y-0.5">
                <h2 className="flex items-center gap-1 text-[12px] sm:text-[14px] font-extrabold text-white leading-tight font-ethiopic truncate">
                  {isProSubscribed ? (
                    <>
                      <span>{pickLabel('Pro Plan', 'Pro ሕሳብ', 'Pro-Abo')}</span>
                      <span className="text-[#FDE047]">
                        {pickLabel('Active', 'ንጡፍ', 'Aktiv')}
                      </span>
                    </>
                  ) : (
                    <>
                      <span>{pickLabel('Unlock More with', 'ተወሳኺ ምስ', 'Mehr freischalten mit')}</span>
                      <span className="text-[#FDE047]">Pro</span>
                    </>
                  )}
                  <Crown className="w-3.5 h-3.5 text-[#FDE047] fill-[#FDE047] shrink-0" aria-hidden="true" />
                </h2>

                <p className="text-[9.5px] sm:text-[11px] font-medium text-sky-100/95 leading-snug line-clamp-2 font-ethiopic">
                  {isProSubscribed
                    ? pickLabel(
                        'Unlimited neural translation & studio tools.',
                        'ምሉእ ኒውራል ትርጉምን AI ስቱድዮን ተኸፊቱ።',
                        'Unbegrenzte Übersetzung & KI-Studios aktiv.'
                      )
                    : pickLabel(
                        'Get advanced features & more limits.',
                        'ዝለዓለ ብቕዓትን ተወሳኺ ዓቕምን ርኸቡ።',
                        'Erweiterte Funktionen & höhere Limits.'
                      )}
                </p>
              </div>
            </div>

            <button
              type="button"
              id="axumite-pro-banner-cta"
              onClick={() => {
                triggerTabTapHaptic();
                recordToolVisit('upgrade-pro');
                setActiveTab('payment');
              }}
              className="inline-flex items-center gap-1 h-8 sm:h-9 px-3 sm:px-4 rounded-full bg-white hover:bg-slate-50 text-slate-900 font-bold text-[10.5px] sm:text-xs shadow-md cursor-pointer active:scale-95 transition-all shrink-0 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <span className="font-ethiopic">
                {isProSubscribed
                  ? pickLabel('Manage', 'ኣመሓድር', 'Verwalten')
                  : pickLabel('Upgrade', 'ኣዕቢ', 'Upgrade')}
              </span>
              <ArrowRight className="w-3 h-3 stroke-[2.5]" aria-hidden="true" />
            </button>
          </div>
        </section>

        {/* ===================================================================== */}
        {/* 5. POPULAR TOOLS BOX (4-Column Glass Card + "See All ->")             */}
        {/* ===================================================================== */}
        <section
          id="popular-tools-section"
          aria-labelledby="popular-tools-heading"
          className="space-y-2.5"
        >
          <div className="flex items-center justify-between px-0.5">
            <h2
              id="popular-tools-heading"
              className="flex items-center gap-1.5 text-[13px] sm:text-sm font-extrabold text-slate-900 dark:text-white font-ethiopic"
            >
              <LayoutGrid className="w-4 h-4 text-[#2563EB] dark:text-sky-400 shrink-0" aria-hidden="true" />
              <span>{pickLabel('Popular Tools', 'ፍቱዋት መሳርሒታት', 'Beliebte Tools')}</span>
            </h2>

            <button
              type="button"
              id="axumite-see-all-tools-btn"
              onClick={() => {
                triggerTabTapHaptic();
                setShowAllTools((prev) => !prev);
              }}
              aria-expanded={showAllTools}
              className="inline-flex items-center gap-1 text-[10.5px] sm:text-xs font-bold text-[#2563EB] dark:text-sky-400 hover:text-blue-700 cursor-pointer px-2 py-1 rounded-lg hover:bg-blue-50/80 dark:hover:bg-slate-800/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <span className="font-ethiopic whitespace-nowrap">
                {showAllTools
                  ? pickLabel('Show Less', 'ንእሽቶ ኣርኢ', 'Weniger')
                  : pickLabel('See All', 'ኩሉ ርኣይ', 'Alle ansehen')}
              </span>
              <ArrowRight
                className={`w-3 h-3 transition-transform ${showAllTools ? 'rotate-90' : ''}`}
                aria-hidden="true"
              />
            </button>
          </div>

          <div className="rounded-[22px] bg-white/95 dark:bg-[#0F172A]/90 border border-indigo-100/80 dark:border-indigo-500/20 shadow-[0_8px_24px_rgba(30,58,138,0.06)] dark:shadow-[0_10px_28px_rgba(2,6,23,0.45)] p-2 sm:p-3 grid grid-cols-4 divide-x divide-slate-100 dark:divide-slate-800">
            {popularBarTools.map((tool) => {
              const Icon = tool.icon;
              return (
                <button
                  key={tool.id}
                  type="button"
                  onClick={tool.onClick}
                  className="group flex flex-col items-center justify-center text-center px-1 py-1.5 sm:py-2 hover:bg-slate-50/80 dark:hover:bg-slate-800/60 first:rounded-l-xl last:rounded-r-xl transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <div
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform ${tool.tileClass}`}
                  >
                    <Icon className="w-4.5 h-4.5 sm:w-5 sm:h-5" aria-hidden="true" />
                  </div>
                  <span className="text-[9.5px] sm:text-[11px] font-semibold text-slate-800 dark:text-slate-100 leading-tight line-clamp-2 font-ethiopic">
                    {tool.label}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* ===================================================================== */}
        {/* 6. RECENT & FAVORITES COMPACT ROW                                     */}
        {/* ===================================================================== */}
        <section aria-label={isTigrinya ? 'ቀረባን ፍቱዋትን' : 'Recent and Favorites'}>
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5">
            <button
              type="button"
              id="axumite-home-recent-btn"
              onClick={() => {
                triggerTabTapHaptic();
                if (onOpenHistory) onOpenHistory();
                else setActiveTab('saved');
              }}
              className="group text-left rounded-[20px] bg-white/95 dark:bg-[#0F172A]/90 border border-indigo-100/80 dark:border-indigo-500/20 hover:border-violet-300 dark:hover:border-violet-400/50 p-2.5 sm:p-3.5 shadow-[0_6px_20px_rgba(30,58,138,0.05)] dark:shadow-[0_8px_22px_rgba(2,6,23,0.4)] hover:-translate-y-0.5 active:scale-[0.985] transition-all cursor-pointer flex items-center justify-between gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#F3E8FF] dark:bg-violet-500/20 text-[#7C3AED] dark:text-violet-300 flex items-center justify-center shrink-0">
                  <History className="w-4.5 h-4.5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <span className="block text-[11.5px] sm:text-xs font-bold text-slate-900 dark:text-white leading-tight font-ethiopic">
                    {pickLabel('Recent', 'ቀረባ', 'Verlauf')}
                  </span>
                  <span className="block text-[9.5px] sm:text-[10.5px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5 truncate font-ethiopic">
                    {recentToolsList.length > 0
                      ? recentToolsList[0][isTigrinya ? 'titleTi' : isGerman ? 'titleDe' : 'titleEn']
                      : pickLabel('Continue your work', 'ስራሕካ ቀጽል', 'Weiterarbeiten')}
                  </span>
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-violet-600 dark:group-hover:text-violet-300 shrink-0" aria-hidden="true" />
            </button>

            <button
              type="button"
              id="axumite-home-favorites-btn"
              onClick={() => {
                triggerTabTapHaptic();
                setIsFavoritesModalOpen(true);
              }}
              className="group text-left rounded-[20px] bg-white/95 dark:bg-[#0F172A]/90 border border-emerald-100/90 dark:border-emerald-500/20 hover:border-emerald-300 dark:hover:border-emerald-400/50 p-2.5 sm:p-3.5 shadow-[0_6px_20px_rgba(30,58,138,0.05)] dark:shadow-[0_8px_22px_rgba(2,6,23,0.4)] hover:-translate-y-0.5 active:scale-[0.985] transition-all cursor-pointer flex items-center justify-between gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#ECFDF5] dark:bg-emerald-500/20 text-[#10B981] dark:text-emerald-300 flex items-center justify-center shrink-0">
                  <Star className="w-4.5 h-4.5 fill-current" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <span className="block text-[11.5px] sm:text-xs font-bold text-slate-900 dark:text-white leading-tight font-ethiopic">
                    {pickLabel('Favorites', 'ፍቱዋት', 'Favoriten')}
                  </span>
                  <span className="block text-[9.5px] sm:text-[10.5px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5 truncate font-ethiopic">
                    {pickLabel(
                      `${favoriteToolsList.length} favorite tools`,
                      `${favoriteToolsList.length} ፍቱዋት መሳርሒታት`,
                      `${favoriteToolsList.length} Favoriten`
                    )}
                  </span>
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-300 shrink-0" aria-hidden="true" />
            </button>
          </div>
        </section>

        {/* ===================================================================== */}
        {/* 7. EXPANDABLE "ALL AI & TRANSLATION TOOLS" PANEL (On "See All ->")    */}
        {/* ===================================================================== */}
        {showAllTools && (
          <section
            id="all-tools-expanded-section"
            aria-label={isTigrinya ? 'ኩሎም መሳርሒታት AI' : 'All AI and Translation Tools'}
            className="rounded-[22px] bg-white/95 dark:bg-[#0F172A]/95 border border-indigo-100/90 dark:border-indigo-500/25 p-3 sm:p-4 shadow-[0_10px_28px_rgba(30,58,138,0.08)] space-y-3"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-xs sm:text-[13px] font-extrabold text-slate-900 dark:text-white font-ethiopic">
                {pickLabel(
                  'All Translation & AI Studios',
                  'ኩሎም መሳርሒታት ትርጉምን AIን',
                  'Alle Übersetzungs- & KI-Tools'
                )}
              </h3>

              <div className="relative flex items-center sm:w-56">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" aria-hidden="true" />
                <input
                  type="search"
                  value={allToolsSearch}
                  onChange={(e) => setAllToolsSearch(e.target.value)}
                  placeholder={pickLabel('Filter tools...', 'መሳርሒ ድለይ...', 'Tools filtern...')}
                  aria-label={pickLabel('Filter tools', 'መሳርሒ ድለይ', 'Tools filtern')}
                  className="w-full h-8 pl-8 pr-7 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                />
                {allToolsSearch && (
                  <button
                    type="button"
                    onClick={() => setAllToolsSearch('')}
                    aria-label="Clear filter"
                    className="absolute right-2 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {visibleDirectoryTools.map((tool) => {
                const Icon = tool.icon;
                const isPlanned = tool.group === 'planned';
                const isFav = favoriteToolIds.includes(tool.id);

                return (
                  <div
                    key={tool.id}
                    className="relative group rounded-2xl bg-slate-50/90 dark:bg-slate-800/75 border border-slate-200/80 dark:border-slate-700/80 hover:border-blue-400 dark:hover:border-sky-400/60 p-2.5 transition-all flex items-start gap-2"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (isPlanned) {
                          triggerTabTapHaptic();
                          setPlannedModalTool(tool);
                        } else {
                          tool.onClick();
                        }
                      }}
                      className="flex-1 min-w-0 flex items-start gap-2 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-xl"
                    >
                      <div
                        className={`w-8.5 h-8.5 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs ${tool.iconBgClass}`}
                      >
                        <Icon className="w-4 h-4" aria-hidden="true" />
                      </div>
                      <div className="min-w-0 flex-1 pr-5">
                        <p className="text-[10.5px] sm:text-[11px] font-bold text-slate-900 dark:text-white leading-tight font-ethiopic">
                          {pickLabel(tool.titleEn, tool.titleTi, tool.titleDe)}
                        </p>
                        <p className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5 truncate font-ethiopic">
                          {isPlanned
                            ? pickLabel('Planned', 'ተመዲቡ', 'Geplant')
                            : pickLabel(tool.descEn, tool.descTi, tool.descDe)}
                        </p>
                      </div>
                    </button>

                    {!isPlanned && (
                      <button
                        type="button"
                        onClick={() => toggleFavoriteTool(tool.id)}
                        aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
                        aria-pressed={isFav}
                        className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-amber-500 cursor-pointer transition-colors"
                      >
                        <Star
                          className={`w-3.5 h-3.5 ${
                            isFav ? 'text-amber-400 fill-amber-400' : 'text-slate-300 dark:text-slate-600'
                          }`}
                        />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {/* ===================================================================== */}
      {/* FAVORITE TOOLS DIALOG                                                 */}
      {/* ===================================================================== */}
      {isFavoritesModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="favorites-dialog-title"
          onClick={() => setIsFavoritesModalOpen(false)}
        >
          <div
            className="w-full sm:max-w-lg max-h-[82vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-2xl space-y-3.5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 flex items-center justify-center">
                  <Star className="w-4 h-4 fill-current" aria-hidden="true" />
                </div>
                <div>
                  <h3
                    id="favorites-dialog-title"
                    className="text-sm font-extrabold text-slate-900 dark:text-white font-ethiopic"
                  >
                    {pickLabel('Favorite AI Tools', 'ፍቱዋት መሳርሒታት', 'Favorisierte Tools')}
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    {pickLabel(
                      'Tap a tool to launch or star to pin',
                      'ንምኽፋት ጠውቑ ወይ ኮኾብ ኣንብሩ',
                      'Zum Starten antippen oder anheften'
                    )}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsFavoritesModalOpen(false)}
                aria-label="Close"
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {directoryTools
                .filter((t) => t.group !== 'planned')
                .map((tool) => {
                  const Icon = tool.icon;
                  const isFav = favoriteToolIds.includes(tool.id);
                  return (
                    <div
                      key={tool.id}
                      className={`flex items-center justify-between gap-2 rounded-2xl border p-2 transition-colors ${
                        isFav
                          ? 'bg-emerald-50/70 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30'
                          : 'bg-slate-50/80 dark:bg-slate-800/70 border-slate-200/80 dark:border-slate-700/70'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setIsFavoritesModalOpen(false);
                          tool.onClick();
                        }}
                        className="flex-1 min-w-0 flex items-center gap-2 text-left cursor-pointer"
                      >
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 ${tool.iconBgClass}`}
                        >
                          <Icon className="w-4 h-4" aria-hidden="true" />
                        </div>
                        <div className="min-w-0">
                          <span className="block text-[11px] font-bold text-slate-900 dark:text-white truncate font-ethiopic">
                            {pickLabel(tool.titleEn, tool.titleTi, tool.titleDe)}
                          </span>
                          <span className="block text-[9.5px] text-slate-500 dark:text-slate-400 truncate font-ethiopic">
                            {pickLabel(tool.descEn, tool.descTi, tool.descDe)}
                          </span>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleFavoriteTool(tool.id)}
                        aria-label={isFav ? 'Unpin favorite' : 'Pin favorite'}
                        aria-pressed={isFav}
                        className="w-7 h-7 rounded-full flex items-center justify-center cursor-pointer shrink-0 hover:bg-white dark:hover:bg-slate-700"
                      >
                        <Star
                          className={`w-4 h-4 ${
                            isFav ? 'text-amber-400 fill-amber-400' : 'text-slate-300 dark:text-slate-600'
                          }`}
                        />
                      </button>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* PLANNED TOOL PREVIEW & NOTIFY / DRAFT DIALOG                          */}
      {/* ===================================================================== */}
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
                    {plannedNotifyIds.length ? (
                      <BellRing className="w-3.5 h-3.5" />
                    ) : (
                      <Bell className="w-3.5 h-3.5" />
                    )}
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

      {/* ===================================================================== */}
      {/* PRESERVED LAZY MODALS                                                 */}
      {/* ===================================================================== */}
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
