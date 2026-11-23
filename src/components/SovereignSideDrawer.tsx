import React from 'react';
import {
  Briefcase,
  Building2,
  Camera,
  CheckSquare,
  ChevronRight,
  FileText,
  Film,
  Gift,
  GraduationCap,
  HelpCircle,
  Landmark,
  LayoutDashboard,
  MessageSquare,
  Mic,
  Monitor,
  Palette,
  PenLine,
  PhoneCall,
  Scale,
  Settings,
  Smartphone,
  TrendingUp,
  Video,
  WifiOff,
  X,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { AppTab, UserProfile } from '../types';
import { isAdminOrCreator } from '../lib/permissions';
import type { TranslatorFeatureView } from './translator/TranslationFeatureCardsGrid';

interface SovereignSideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: AppTab;
  onNavigateTab: (tab: AppTab) => void;
  user: UserProfile;
  onOpenUserModal: () => void;
  onOpenSecurityModal: () => void;
  onOpenPremiumModal: () => void;
  onOpenJobSearch: () => void;
  onOpenScholarship?: () => void;
  onOpenLegalAdvisor: () => void;
  onOpenMechanic: () => void;
  onOpenHistory: () => void;
  unreadNotifCount?: number;
  onOpenNotifications?: () => void;
  onOpenVideoTranslator?: () => void;
  onOpenVoiceOverlay?: () => void;
  onOpenFileVault?: () => void;
  onOpenHibernation?: () => void;
  onOpenBiometricLock?: () => void;
  onOpenBugReport?: () => void;
  onOpenTranslatorFeature?: (feature: TranslatorFeatureView) => void;
}

interface DrawerPillItem {
  id: string;
  labelTi: string;
  labelEn: string;
  icon: React.FC<{ className?: string }>;
  onClick: () => void;
  badge?: string;
}

export const SovereignSideDrawer: React.FC<SovereignSideDrawerProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
  user,
  onOpenUserModal,
  onOpenSecurityModal,
  onOpenJobSearch,
  onOpenScholarship,
  onOpenLegalAdvisor,
  onOpenHistory,
  onOpenVideoTranslator,
  onOpenVoiceOverlay,
  onOpenTranslatorFeature,
}) => {
  const { language } = useLanguage();
  const isTigrinya = language === 'ti' || language === 'ti_tg';

  if (!isOpen) return null;

  const handleSelectTool = (action: () => void) => {
    action();
    onClose();
  };

  const openTranslator = (feature: TranslatorFeatureView) => {
    handleSelectTool(() => {
      if (onOpenTranslatorFeature) {
        onOpenTranslatorFeature(feature);
      } else {
        onNavigateTab('translator');
      }
    });
  };

  const translationItems: DrawerPillItem[] = [
    {
      id: 'text-translate',
      labelTi: 'ትርጉም ብጽሑፍ',
      labelEn: 'Text Translate',
      icon: FileText,
      onClick: () => openTranslator('hub'),
    },
    {
      id: 'voice-translate',
      labelTi: 'ትርጉም ብድምጺ',
      labelEn: 'Voice Translate',
      icon: Mic,
      onClick: () => openTranslator('voice-translation'),
    },
    {
      id: 'call-translate',
      labelTi: 'ጻውዒት ስልክ',
      labelEn: 'Call Translate',
      icon: PhoneCall,
      onClick: () => openTranslator('call-translation'),
    },
    {
      id: 'screen-translate',
      labelTi: 'ስክሪን',
      labelEn: 'Screen OCR',
      icon: Monitor,
      onClick: () => openTranslator('screen-capture'),
    },
    {
      id: 'camera-ocr',
      labelTi: 'ካሜራ OCR',
      labelEn: 'Camera OCR',
      icon: Camera,
      onClick: () => openTranslator('camera-ocr'),
    },
    {
      id: 'offline-packs',
      labelTi: 'ብዘይ ኢንተርነት',
      labelEn: 'Offline Mode',
      icon: WifiOff,
      onClick: () => openTranslator('offline-translation'),
    },
  ];

  const toolsItems: DrawerPillItem[] = [
    {
      id: 'assistant-chat',
      labelTi: 'ሓጋዚ',
      labelEn: 'AI Chat',
      icon: MessageSquare,
      onClick: () => handleSelectTool(() => onNavigateTab('chat')),
    },
    {
      id: 'voice-ai',
      labelTi: 'ድምጺ AI',
      labelEn: 'Voice AI',
      icon: Mic,
      onClick: () =>
        handleSelectTool(() =>
          onOpenVoiceOverlay ? onOpenVoiceOverlay() : onNavigateTab('voice-assistant')
        ),
    },
    {
      id: 'education',
      labelTi: 'ትምህርቲ',
      labelEn: 'Education',
      icon: GraduationCap,
      onClick: () => handleSelectTool(() => onNavigateTab('education')),
    },
    {
      id: 'create',
      labelTi: 'ፍጠር',
      labelEn: 'Create Studio',
      icon: PenLine,
      onClick: () => handleSelectTool(() => onNavigateTab('vision')),
    },
    {
      id: 'jobs',
      labelTi: 'ምርካብ',
      labelEn: 'Job Finder',
      icon: CheckSquare,
      onClick: () => handleSelectTool(onOpenJobSearch),
    },
    {
      id: 'business-ai',
      labelTi: 'ንግዲ AI',
      labelEn: 'Business AI',
      icon: Briefcase,
      onClick: () => handleSelectTool(() => onNavigateTab('business-hub')),
    },
    {
      id: 'heritage',
      labelTi: 'ውርሻ',
      labelEn: 'Heritage',
      icon: Landmark,
      onClick: () => handleSelectTool(() => onNavigateTab('cultural-explorer')),
    },
    {
      id: 'calligraphy',
      labelTi: 'ኪነ-ጽሕፈት',
      labelEn: 'Calligraphy',
      icon: Palette,
      onClick: () => handleSelectTool(() => onNavigateTab('calligraphy')),
    },
  ];

  if (onOpenVideoTranslator) {
    toolsItems.push({
      id: 'video-dub',
      labelTi: 'ቪድዮ AI',
      labelEn: 'Video Dub',
      icon: Video,
      onClick: () => handleSelectTool(onOpenVideoTranslator),
    });
  }

  toolsItems.push(
    {
      id: 'photo-to-video',
      labelTi: 'ስእሊ ናብ ቪድዮ',
      labelEn: 'Photo-to-Video',
      icon: Film,
      badge: 'AI',
      onClick: () => handleSelectTool(() => onNavigateTab('photo-to-video')),
    },
    {
      id: 'prompt-forge',
      labelTi: 'ፕሮምፕት AI',
      labelEn: 'Prompt Studio',
      icon: Building2,
      onClick: () => handleSelectTool(() => onNavigateTab('prompt-forge')),
    }
  );

  const accountItems: DrawerPillItem[] = [
    {
      id: 'rewards',
      labelTi: 'ሽልማት',
      labelEn: 'Rewards',
      icon: Gift,
      onClick: () => handleSelectTool(() => onNavigateTab('rewards')),
    },
    {
      id: 'progress',
      labelTi: 'ዕቤት ቋንቋ',
      labelEn: 'History & Saved',
      icon: TrendingUp,
      onClick: () => handleSelectTool(onOpenHistory),
    },
    {
      id: 'settings',
      labelTi: 'ምድላው',
      labelEn: 'Profile & Setup',
      icon: Settings,
      onClick: () => handleSelectTool(onOpenUserModal),
    },
    {
      id: 'help',
      labelTi: 'ሓገዝ',
      labelEn: 'Legal & Help',
      icon: HelpCircle,
      onClick: () => handleSelectTool(onOpenLegalAdvisor),
    },
    {
      id: 'security',
      labelTi: 'ድሕነት',
      labelEn: 'Security',
      icon: Scale,
      onClick: () => handleSelectTool(onOpenSecurityModal),
    },
  ];

  if (isAdminOrCreator(user) || user?.role === 'Admin' || user?.role === 'Creator') {
    accountItems.push({
      id: 'management',
      labelTi: 'ምሕደራ Admin',
      labelEn: 'Management',
      icon: LayoutDashboard,
      onClick: () => handleSelectTool(() => onNavigateTab('management')),
    });
  }

  accountItems.push({
    id: 'android-hub',
    labelTi: 'ኣንድሮይድ ሃብ',
    labelEn: 'Android App',
    icon: Smartphone,
    onClick: () => handleSelectTool(() => onNavigateTab('android-app')),
  });

  const renderSection = (titleTi: string, titleEn: string, items: DrawerPillItem[]) => (
    <div className="space-y-2.5">
      <div className="text-xs font-bold text-[#6E6045] px-1 font-ethiopic">
        {isTigrinya ? titleTi : titleEn}
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={item.onClick}
              className="group bg-white hover:bg-[#FBF7ED] border border-[#EAE2D0] hover:border-[#D4AF37]/75 rounded-2xl px-3 py-2.5 flex items-center gap-2.5 shadow-[0_2px_8px_rgba(36,28,15,0.03)] active:scale-[0.98] transition-all cursor-pointer text-left min-h-[48px]"
            >
              <div className="w-8 h-8 rounded-full bg-[#FBF4E2] border border-[#EFE2BE] text-[#B5891B] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform relative">
                <Icon className="w-4 h-4" />
                {item.badge && (
                  <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] px-1 rounded-full bg-[#C89B2B] text-[#1E1505] text-[9px] font-black flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[13px] font-semibold text-[#241C0F] leading-tight font-ethiopic">
                {isTigrinya ? item.labelTi : item.labelEn}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Soft Blurred Backdrop */}
      <div
        className="fixed inset-0 bg-black/25 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Clean White Slide-Out Drawer (Image 1: ኣገልግሎት) */}
      <div className="fixed inset-y-0 left-0 max-w-full flex pr-10 sm:pr-14">
        <div className="w-screen max-w-sm bg-white text-[#241C0F] border-r border-[#E6D9BB] shadow-2xl flex flex-col h-full overflow-hidden">
          {/* Top Header */}
          <div className="px-5 pt-5 pb-3.5 flex items-center justify-between">
            <h2 className="text-xl font-black text-[#1E1912] font-ethiopic">
              {isTigrinya ? 'ኣገልግሎት' : 'Services'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-[#F7F4EC] hover:bg-[#EFE8D6] border border-[#EAE2CF] text-[#241C0F] flex items-center justify-center transition-all cursor-pointer active:scale-95"
              aria-label="Close Drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable Categorized Body */}
          <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-5">
            {/* Highlighted Gold Banner CTA (ስኮላርሺፕ) */}
            <button
              type="button"
              onClick={() =>
                handleSelectTool(() =>
                  onOpenScholarship ? onOpenScholarship() : onNavigateTab('education')
                )
              }
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#DFB749] to-[#C89B2B] hover:brightness-105 text-[#1E1505] font-bold flex items-center justify-between shadow-sm active:scale-[0.98] transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <GraduationCap className="w-5 h-5" />
                <span className="text-[15px] font-bold font-ethiopic">
                  {isTigrinya ? 'ስኮላርሺፕ' : 'Scholarships'}
                </span>
              </div>
              <ChevronRight className="w-4 h-4 stroke-[2.5]" />
            </button>

            {renderSection('ትርጉም', 'Translation', translationItems)}
            {renderSection('መሳርሒታት', 'Tools', toolsItems)}
            {renderSection('ሒሳብ', 'Account', accountItems)}

            <div className="pt-2 border-t border-[#EFE8D8] text-center text-xs text-[#78694E] font-medium font-ethiopic">
              {isTigrinya ? 'ኣክሱማይት AI' : 'Axumite AI'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
