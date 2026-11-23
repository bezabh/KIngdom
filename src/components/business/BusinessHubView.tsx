import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Briefcase,
  FileText,
  BarChart3,
  Megaphone,
  Calculator,
  Bot,
  LayoutDashboard,
  Crown,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { DashboardLayoutShell, DashboardTabItem } from '../DashboardLayoutShell';
import { BusinessPlanBuilder } from './BusinessPlanBuilder';
import { MarketResearchTool } from './MarketResearchTool';
import { MarketingContentStudio } from './MarketingContentStudio';
import { FinancialBudgetingTool } from './FinancialBudgetingTool';
import { BusinessDocumentGenerator } from './BusinessDocumentGenerator';
import { BusinessDashboard } from './BusinessDashboard';
import { BusinessCopilotChat } from './BusinessCopilotChat';

interface BusinessHubViewProps {
  isPro?: boolean;
  onOpenUpgradeModal?: () => void;
}

export type BusinessSubTab =
  | 'plan_builder'
  | 'market_research'
  | 'marketing_studio'
  | 'financials'
  | 'document_generator'
  | 'dashboard'
  | 'copilot_chat';

export const BusinessHubView: React.FC<BusinessHubViewProps> = ({
  isPro = false,
  onOpenUpgradeModal = () => {},
}) => {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState<BusinessSubTab>('plan_builder');

  const navItems: DashboardTabItem[] = [
    {
      id: 'plan_builder',
      label:
        language === 'ti'
          ? 'ናይ ንግዲ መደብ'
          : language === 'de'
          ? 'Businessplan'
          : 'Business Plan',
      icon: FileText,
    },
    {
      id: 'market_research',
      label:
        language === 'ti'
          ? 'ዕዳጋ ትንታነ'
          : language === 'de'
          ? 'Marktforschung'
          : 'Market Intelligence',
      icon: BarChart3,
    },
    {
      id: 'marketing_studio',
      label:
        language === 'ti'
          ? 'ማርኬቲንግ ስቱድዮ'
          : language === 'de'
          ? 'Marketing-Studio'
          : 'Marketing Studio',
      icon: Megaphone,
    },
    {
      id: 'financials',
      label:
        language === 'ti'
          ? 'ፋይናንስን ባጀትን'
          : language === 'de'
          ? 'Finanzen & Preise'
          : 'Financials & Pricing',
      icon: Calculator,
    },
    {
      id: 'document_generator',
      label:
        language === 'ti'
          ? 'ሰነዳትን ኢንቮይስን'
          : language === 'de'
          ? 'Verträge & Rechnungen'
          : 'Contracts & Invoices',
      icon: Briefcase,
    },
    {
      id: 'dashboard',
      label:
        language === 'ti'
          ? 'CRM ዳሽቦርድ'
          : language === 'de'
          ? 'CRM & Kennzahlen'
          : 'CRM & Performance',
      icon: LayoutDashboard,
    },
    {
      id: 'copilot_chat',
      label:
        language === 'ti'
          ? 'AI አማኻሪ'
          : language === 'de'
          ? 'KI-Unternehmensberater'
          : 'AI Business Advisor',
      icon: Bot,
    },
  ];

  return (
    <DashboardLayoutShell
      sectionLabel={language === 'ti' ? 'ንግድን ትካላትን' : 'Enterprise Suite'}
      title={
        language === 'ti'
          ? 'AI ናይ ንግዲ መሻርኽቲ'
          : language === 'de'
          ? 'KI-Business-Zentrum'
          : 'AI Business Hub & Enterprise Suite'
      }
      subtitleTi={language === 'ti' ? undefined : 'ናይ ንግዲ ማእከል'}
      description={
        language === 'ti'
          ? 'ካብ ሓሳብ ንግዲ ክሳብ ኣህጉራዊ ዕዳጋ፡ ናይ ንግዲ መደባት፡ ትንታነ ዕዳጋ፡ ፋይናንስ፡ ሰነዳትን ናይ ዓማዊል CRMን ብAI ተጠቐሙ።'
          : language === 'de'
          ? 'Von der Geschäftsidee bis zur Skalierung: Businesspläne, Marktanalysen, Finanzmodelle, Verträge und CRM mit modernster KI.'
          : 'Institutional suite for entrepreneurs, startups, and diaspora businesses: strategy, market research, cash flow modeling, legal drafts, and CRM.'
      }
      icon={Briefcase}
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
      onSelectTab={(id) => setActiveTab(id as BusinessSubTab)}
    >
      <AnimatePresence mode="wait">
        {activeTab === 'plan_builder' && (
          <motion.div
            key="plan"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <BusinessPlanBuilder isPro={isPro} onOpenUpgradeModal={onOpenUpgradeModal} />
          </motion.div>
        )}

        {activeTab === 'market_research' && (
          <motion.div
            key="market"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <MarketResearchTool />
          </motion.div>
        )}

        {activeTab === 'marketing_studio' && (
          <motion.div
            key="marketing"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <MarketingContentStudio />
          </motion.div>
        )}

        {activeTab === 'financials' && (
          <motion.div
            key="financials"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <FinancialBudgetingTool />
          </motion.div>
        )}

        {activeTab === 'document_generator' && (
          <motion.div
            key="docs"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <BusinessDocumentGenerator />
          </motion.div>
        )}

        {activeTab === 'dashboard' && (
          <motion.div
            key="dash"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <BusinessDashboard />
          </motion.div>
        )}

        {activeTab === 'copilot_chat' && (
          <motion.div
            key="chat"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <BusinessCopilotChat />
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayoutShell>
  );
};
