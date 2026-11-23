import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Landmark, Compass, Coffee, BookOpen, Sparkles, Archive, Crown } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { DashboardLayoutShell, DashboardTabItem } from '../DashboardLayoutShell';
import { HeritageMatrix } from './HeritageMatrix';
import { InteractiveHeritageMap } from './InteractiveHeritageMap';
import { TraditionsAndCustoms } from './TraditionsAndCustoms';
import { ProverbsPoetryExplorer } from './ProverbsPoetryExplorer';
import { CulturalStoryteller } from './CulturalStoryteller';
import { MediaArchiveVault } from './MediaArchiveVault';

interface CulturalExplorerViewProps {
  isPro?: boolean;
  onOpenUpgradeModal?: () => void;
}

export type CulturalSubTab =
  | 'heritage_matrix'
  | 'interactive_map'
  | 'traditions_customs'
  | 'proverbs_poetry'
  | 'storyteller'
  | 'media_archive';

export const CulturalExplorerView: React.FC<CulturalExplorerViewProps> = ({
  isPro = false,
  onOpenUpgradeModal = () => {},
}) => {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState<CulturalSubTab>('heritage_matrix');

  const navItems: DashboardTabItem[] = [
    {
      id: 'heritage_matrix',
      label:
        language === 'ti'
          ? 'ቅርሲታትን ታሪኽን'
          : language === 'de'
          ? 'Welterbestätten'
          : 'Heritage Matrix',
      icon: Landmark,
    },
    {
      id: 'interactive_map',
      label:
        language === 'ti'
          ? 'ካርታ ውርሻታት'
          : language === 'de'
          ? 'Interaktive Karte'
          : 'Interactive Map',
      icon: Compass,
    },
    {
      id: 'traditions_customs',
      label:
        language === 'ti'
          ? 'ስነ-ስርዓት ቡንን ባህልን'
          : language === 'de'
          ? 'Künste & Kaffee'
          : 'Arts & Buna Ritual',
      icon: Coffee,
    },
    {
      id: 'proverbs_poetry',
      label:
        language === 'ti'
          ? 'ምስላታትን ቅኔን'
          : language === 'de'
          ? 'Sprichwörter & Poesie'
          : 'Proverbs & Qene',
      icon: BookOpen,
    },
    {
      id: 'storyteller',
      label:
        language === 'ti'
          ? 'AI ተራኺ ዛንታ'
          : language === 'de'
          ? 'KI-Geschichtenerzähler'
          : 'AI Storyteller',
      icon: Sparkles,
    },
    {
      id: 'media_archive',
      label:
        language === 'ti'
          ? 'ዲጂታል ማህደር'
          : language === 'de'
          ? 'Digitales Archiv'
          : 'Digital Archive',
      icon: Archive,
    },
  ];

  return (
    <DashboardLayoutShell
      sectionLabel={language === 'ti' ? 'ባህላዊ ውርሻ' : 'Living Heritage'}
      title={
        language === 'ti'
          ? 'ባህላውን ታሪኻውን ውርሻ ትግራይ'
          : language === 'de'
          ? 'Kulturerbe Tigray'
          : 'Tigray Cultural AI Experience'
      }
      subtitleTi={language === 'ti' ? undefined : 'ውርሻ ትግራይ'}
      description={
        language === 'ti'
          ? 'ጥንታዊ ስልጣነ ኣክሱም፡ ይሓ፡ ውቕሮ፡ ገራዕልታ፡ መቐለ፡ ምስላታት ትግርኛ፡ ባህላዊ ሙዚቃን ዛንታታትን ብAI ንዘለኣለም ተዓቒቡ ይነብር።'
          : language === 'de'
          ? 'Erleben und bewahren Sie die reiche Geschichte, Architektur, Poesie, Kulinarik und Weisheiten von Tigray und Eritrea mit KI.'
          : 'Preserving millennia of civilization: archaeological monuments, oral wisdom, the Buna coffee ceremony, traditional music, and digital archives.'
      }
      icon={Landmark}
      actions={
        !isPro ? (
          <button
            type="button"
            onClick={onOpenUpgradeModal}
            className="inline-flex items-center gap-2 px-4 min-h-[40px] rounded-xl bg-[#C5A059] hover:bg-[#D5B26B] text-[#09090B] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Crown className="w-3.5 h-3.5 shrink-0" />
            <span>
              {language === 'ti'
                ? 'ናብ Pro ክብ ኣብሉ'
                : language === 'de'
                ? 'Auf Pro upgraden'
                : 'Unlock Sovereign Pro'}
            </span>
          </button>
        ) : undefined
      }
      tabs={navItems}
      activeTabId={activeTab}
      onSelectTab={(id) => setActiveTab(id as CulturalSubTab)}
    >
      <AnimatePresence mode="wait">
        {activeTab === 'heritage_matrix' && (
          <motion.div
            key="matrix"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <HeritageMatrix />
          </motion.div>
        )}

        {activeTab === 'interactive_map' && (
          <motion.div
            key="map"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <InteractiveHeritageMap />
          </motion.div>
        )}

        {activeTab === 'traditions_customs' && (
          <motion.div
            key="traditions"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <TraditionsAndCustoms />
          </motion.div>
        )}

        {activeTab === 'proverbs_poetry' && (
          <motion.div
            key="proverbs"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <ProverbsPoetryExplorer />
          </motion.div>
        )}

        {activeTab === 'storyteller' && (
          <motion.div
            key="storyteller"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <CulturalStoryteller />
          </motion.div>
        )}

        {activeTab === 'media_archive' && (
          <motion.div
            key="archive"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <MediaArchiveVault />
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayoutShell>
  );
};
