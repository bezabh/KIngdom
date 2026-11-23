import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText,
  Download,
  CheckCircle2,
  Clock,
  BookOpen,
  DollarSign,
  TrendingUp,
  Award,
  Sparkles,
  Volume2,
  VolumeX,
  Share2,
  X,
  Check,
  Calendar,
  Layers,
  ArrowRight,
  ExternalLink,
  GraduationCap,
  Languages,
  Gift,
  CheckCheck
} from 'lucide-react';
import { WeeklySummaryData, UserProfile } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { generateWeeklySummaryPdfReport } from '../utils/weeklySummaryPdfReport';
import { playGoldenNotificationChime } from '../services/notificationService';

interface WeeklySummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  summaryData: WeeklySummaryData;
  user?: Partial<UserProfile>;
  onNavigateTab?: (tab: string) => void;
}

export const WeeklySummaryModal: React.FC<WeeklySummaryModalProps> = ({
  isOpen,
  onClose,
  summaryData,
  user,
  onNavigateTab,
}) => {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState<'overview' | 'topics' | 'savings' | 'socratic'>('overview');
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  if (!isOpen) return null;

  const handleExportPdf = () => {
    setIsExporting(true);
    playGoldenNotificationChime();

    setTimeout(() => {
      try {
        generateWeeklySummaryPdfReport(summaryData, user);
        setExportSuccess(true);
        setTimeout(() => setExportSuccess(false), 4000);
      } catch (err) {
        console.error('Failed to generate weekly summary PDF:', err);
      } finally {
        setIsExporting(false);
      }
    }, 400);
  };

  const handleToggleSpeech = () => {
    if (isSpeaking) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsSpeaking(false);
      return;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const textToSpeak = language === 'ti'
        ? `ናይ ሰሙን ጸብጻብኩም፡ ኣብዚ ዝሓለፈ ሰሙን ${summaryData.totalStudyHours} ሰዓታት ተማሂርኩም፡ ${summaryData.topicsLearnedCount} ኣርእስታት ኣማዕቢልኩም፡ ከምኡውን ${summaryData.totalSavingsUSD} ዶላር ኣድሒንኩም ኣለኹም።`
        : `Weekly Performance Summary: You logged ${summaryData.totalStudyHours} study hours across ${summaryData.topicsLearnedCount} mastered topics, generating ${summaryData.totalSavingsUSD} dollars in estimated savings.`;

      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.rate = 0.95;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-2 sm:p-4 md:p-6">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/85 backdrop-blur-md"
      />

      {/* Modal Container */}
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: 15 }}
        transition={{ type: 'spring', damping: 24, stiffness: 280 }}
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-gradient-to-b from-[#140F22] via-[#0E0A1A] to-[#080510] border-2 border-[#C5A059] rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.9),0_0_35px_rgba(197,160,89,0.2)] overflow-hidden z-10 text-slate-100"
      >
        {/* Top Accent Strip */}
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-[#F3E5AB] to-amber-500" />

        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-[#2D2144] flex flex-wrap items-center justify-between gap-3 bg-[#0B0715]/90">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 p-0.5 shadow-lg shadow-amber-500/20">
              <div className="w-full h-full bg-[#120D20] rounded-[14px] flex items-center justify-center">
                <FileText className="w-6 h-6 text-[#F3E5AB]" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-[#F3E5AB] border border-amber-400/40 text-[10px] font-bold uppercase tracking-wider">
                  {language === 'ti' ? 'ናይ ሰሙን ጸብጻብ' : 'Weekly Intelligence Digest'}
                </span>
                <span className="text-xs text-gray-400 flex items-center space-x-1 font-mono">
                  <Calendar className="w-3 h-3 text-amber-400" />
                  <span>{summaryData.startDate} – {summaryData.endDate}</span>
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white flex items-center space-x-2 pt-0.5">
                <span>{language === 'ti' ? 'ናይ ሰሙን ብቕዓትን ዕቋርን ጸብጻብ' : 'Weekly Performance & Savings Report'}</span>
              </h2>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Audio Readout */}
            <button
              onClick={handleToggleSpeech}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                isSpeaking
                  ? 'bg-amber-500 text-slate-950 border-amber-400'
                  : 'bg-[#1C1530] hover:bg-[#281E44] text-amber-300 border-[#3C2D56]'
              }`}
              title={isSpeaking ? 'Stop Audio' : 'Listen to Weekly Summary'}
            >
              {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Quick Export PDF Button */}
            <button
              onClick={handleExportPdf}
              disabled={isExporting}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 via-[#E1C47D] to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs transition-all shadow-lg shadow-amber-500/25 flex items-center space-x-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {isExporting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                  <span>{language === 'ti' ? 'ይዳሎ ኣሎ...' : 'Generating PDF...'}</span>
                </>
              ) : exportSuccess ? (
                <>
                  <CheckCheck className="w-4 h-4 text-emerald-950" />
                  <span>{language === 'ti' ? 'ተወዲኡ!' : 'PDF Downloaded!'}</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>{language === 'ti' ? 'PDF ጸብጻብ ኣውርድ' : 'Export PDF Report'}</span>
                </>
              )}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-[#1C1530] border border-[#3C2D56] hover:bg-[#281E44] text-gray-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* KPI Highlight Strip (4 Responsive Cards) */}
        <div className="p-4 sm:p-6 bg-[#0E091B]/80 border-b border-[#251A3B]">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Card 1: Study Hours */}
            <div className="p-3.5 rounded-2xl bg-[#140F24] border border-[#2D2144] hover:border-amber-400/50 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between text-gray-400 text-xs">
                <span className="font-bold uppercase tracking-wider text-[10px] text-amber-300/90">
                  {language === 'ti' ? 'ናይ ትምህርቲ ግዜ' : 'Study Time'}
                </span>
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <div className="pt-2">
                <div className="text-xl sm:text-2xl font-black text-white font-mono">
                  {summaryData.totalStudyHours} <span className="text-xs text-amber-300 font-sans font-bold">hrs</span>
                </div>
                <div className="text-[11px] text-gray-400 pt-0.5">
                  {summaryData.completedTasks} {language === 'ti' ? 'ዝተወድኡ ዕማማት' : 'tasks completed'}
                </div>
              </div>
            </div>

            {/* Card 2: Topics Learned */}
            <div className="p-3.5 rounded-2xl bg-[#140F24] border border-[#2D2144] hover:border-amber-400/50 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between text-gray-400 text-xs">
                <span className="font-bold uppercase tracking-wider text-[10px] text-amber-300/90">
                  {language === 'ti' ? 'ዝተማህሩ ኣርእስታት' : 'Topics Mastered'}
                </span>
                <BookOpen className="w-4 h-4 text-sky-400" />
              </div>
              <div className="pt-2">
                <div className="text-xl sm:text-2xl font-black text-white font-mono">
                  {summaryData.topicsLearnedCount} <span className="text-xs text-sky-300 font-sans font-bold">topics</span>
                </div>
                <div className="text-[11px] text-gray-400 pt-0.5">
                  {summaryData.accuracyRate}% {language === 'ti' ? 'ናይ ብቕዓት ውጽኢት' : 'mastery accuracy'}
                </div>
              </div>
            </div>

            {/* Card 3: Economic Savings */}
            <div className="p-3.5 rounded-2xl bg-[#140F24] border border-[#2D2144] hover:border-emerald-400/50 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between text-gray-400 text-xs">
                <span className="font-bold uppercase tracking-wider text-[10px] text-emerald-400">
                  {language === 'ti' ? 'ዝተዓቀበ ወጻኢታት' : 'Economic Savings'}
                </span>
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="pt-2">
                <div className="text-xl sm:text-2xl font-black text-emerald-300 font-mono">
                  ${summaryData.totalSavingsUSD.toFixed(2)}
                </div>
                <div className="text-[11px] text-gray-400 pt-0.5">
                  {language === 'ti' ? 'ናይ ትምህርትን ትርጉምን ዋጋ' : 'Total value delivered'}
                </div>
              </div>
            </div>

            {/* Card 4: Daily Streak & Mining */}
            <div className="p-3.5 rounded-2xl bg-[#140F24] border border-[#2D2144] hover:border-amber-400/50 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between text-gray-400 text-xs">
                <span className="font-bold uppercase tracking-wider text-[10px] text-amber-300/90">
                  {language === 'ti' ? 'ቀጻልነትን ዓስብን' : 'Streak & Rewards'}
                </span>
                <Award className="w-4 h-4 text-amber-400" />
              </div>
              <div className="pt-2">
                <div className="text-xl sm:text-2xl font-black text-amber-300 font-mono">
                  {summaryData.streakDays} <span className="text-xs text-amber-200 font-sans font-bold">days</span>
                </div>
                <div className="text-[11px] text-emerald-400 pt-0.5 font-semibold">
                  +${summaryData.tokenMiningEarningsUSD.toFixed(2)} mined
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section Navigation Tabs */}
        <div className="px-6 pt-3 pb-2 flex items-center space-x-2 border-b border-[#241A37] bg-[#0A0713] overflow-x-auto scrollbar-none">
          {[
            { id: 'overview', labelTi: 'ታሪኽን ንጥፈታትን', labelEn: 'Recent Activity', count: summaryData.recentActivities.length },
            { id: 'topics', labelTi: 'ዝተማህሩ ኣርእስታት', labelEn: 'Learned Topics', count: summaryData.learnedTopics.length },
            { id: 'savings', labelTi: 'ናይ ዕቋር ዝርዝር', labelEn: 'Savings Breakdown', count: `$${summaryData.totalSavingsUSD.toFixed(0)}` },
            { id: 'socratic', labelTi: 'ናይ AI ምኽሪ', labelEn: 'Socratic Tutor Insights', count: undefined },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 whitespace-nowrap ${
                  isActive
                    ? 'bg-amber-500/25 text-[#F3E5AB] border border-amber-400/60 shadow-md'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>{language === 'ti' ? tab.labelTi : tab.labelEn}</span>
                {tab.count !== undefined && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    isActive ? 'bg-amber-400 text-slate-950 font-black' : 'bg-[#1C162A] text-gray-400'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 max-h-[48vh] scrollbar-thin scrollbar-thumb-slate-800">
          
          {/* TAB 1: RECENT ACTIVITY */}
          {activeTab === 'overview' && (
            <div className="space-y-3 animate-fade-in">
              <div className="flex items-center justify-between pb-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center space-x-1.5">
                  <Layers className="w-4 h-4" />
                  <span>{language === 'ti' ? 'ናይዚ ሰሙን ዝተመዝገቡ ንጥፈታት' : 'Recent User Activities & Engagements'}</span>
                </h3>
                <span className="text-[11px] text-gray-400 font-mono">{summaryData.recentActivities.length} Actions Logged</span>
              </div>

              <div className="space-y-2">
                {summaryData.recentActivities.map((act) => (
                  <div
                    key={act.id}
                    className="p-3.5 rounded-2xl bg-[#120D20] border border-[#261B39] hover:border-amber-400/40 transition-all flex flex-wrap items-center justify-between gap-2"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-400/20 text-amber-300">
                        {act.category === 'education' ? <GraduationCap className="w-4 h-4" /> :
                         act.category === 'translation' ? <Languages className="w-4 h-4" /> :
                         act.category === 'wisdom' ? <Sparkles className="w-4 h-4" /> :
                         act.category === 'pro_click' ? <DollarSign className="w-4 h-4" /> :
                         <FileText className="w-4 h-4" />}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white leading-snug">
                          {language === 'ti' ? act.titleTi : act.title}
                        </h4>
                        <div className="flex items-center space-x-2 text-[10.5px] text-gray-400 pt-0.5">
                          <span className="font-mono">{act.date}</span>
                          <span>•</span>
                          <span className="text-amber-200/90 font-medium">{act.durationOrCount}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                        act.status === 'Mastered'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                          : 'bg-sky-500/20 text-sky-300 border-sky-400/40'
                      }`}>
                        {act.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: LEARNED TOPICS */}
          {activeTab === 'topics' && (
            <div className="space-y-3 animate-fade-in">
              <div className="flex items-center justify-between pb-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center space-x-1.5">
                  <BookOpen className="w-4 h-4" />
                  <span>{language === 'ti' ? 'ዝተማህሩ ኣርእስታትን ዝተረኽበ ፍልጠትን' : 'Learned Topics & Competency Mastery'}</span>
                </h3>
                <span className="text-[11px] text-gray-400 font-mono">{summaryData.learnedTopics.length} Disciplines</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {summaryData.learnedTopics.map((topic) => (
                  <div
                    key={topic.id}
                    className="p-4 rounded-2xl bg-[#120D20] border border-[#281E3E] space-y-2.5 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-400/30 text-[10px] font-bold">
                          {language === 'ti' ? topic.fieldTi : topic.field}
                        </span>
                        <span className="text-xs font-mono font-bold text-amber-400">
                          {topic.hoursSpent} hrs
                        </span>
                      </div>

                      <h4 className="text-xs sm:text-sm font-bold text-white pt-2 leading-snug">
                        {language === 'ti' ? topic.topicNameTi : topic.topicName}
                      </h4>

                      <p className="text-[11px] text-gray-300 pt-1 leading-relaxed">
                        {language === 'ti' ? topic.keyTakeawayTi : topic.keyTakeaway}
                      </p>
                    </div>

                    {/* Mastery Bar */}
                    <div className="pt-2 border-t border-[#231835] space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-gray-400">{language === 'ti' ? 'ናይ ብቕዓት ደረጃ' : 'Mastery Progress'}</span>
                        <span className="font-mono font-bold text-amber-300">{topic.masteryScore}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[#201535] overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full"
                          style={{ width: `${topic.masteryScore}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: FINANCIAL SAVINGS */}
          {activeTab === 'savings' && (
            <div className="space-y-3 animate-fade-in">
              <div className="flex items-center justify-between pb-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center space-x-1.5">
                  <DollarSign className="w-4 h-4" />
                  <span>{language === 'ti' ? 'ናይ ሰሙን ናይ ወጻኢታት ዕቋር ሰሌዳ' : 'Weekly Value & Personal Savings Ledger'}</span>
                </h3>
                <span className="text-xs font-mono font-black text-emerald-300 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-500/40">
                  Total: +${summaryData.totalSavingsUSD.toFixed(2)} USD
                </span>
              </div>

              <div className="space-y-2.5">
                {summaryData.savingsBreakdown.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-[#120D20] border border-[#281D3C] flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-400/30 text-emerald-400">
                        {item.icon === 'GraduationCap' ? <GraduationCap className="w-4 h-4" /> :
                         item.icon === 'Languages' ? <Languages className="w-4 h-4" /> :
                         item.icon === 'Gift' ? <Gift className="w-4 h-4" /> :
                         <Sparkles className="w-4 h-4" />}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">
                          {language === 'ti' ? item.categoryTi : item.category}
                        </h4>
                        <p className="text-[11px] text-gray-400 pt-0.5">
                          {language === 'ti' ? item.descriptionTi : item.description}
                        </p>
                      </div>
                    </div>

                    <div className="text-right whitespace-nowrap">
                      <span className="text-sm sm:text-base font-black text-emerald-300 font-mono">
                        +${item.savingsUSD.toFixed(2)}
                      </span>
                      <div className="text-[9.5px] text-gray-500">
                        {language === 'ti' ? 'ዝተዓቀበ' : 'Saved'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total Savings Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-[#1C160B] to-[#120D20] border border-[#C5A059]/60 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-amber-200">
                    {language === 'ti' ? 'ጠቕላላ ግምታዊ ናይዚ ሰሙን ዕቋር' : 'Total Estimated Weekly Economic Benefit'}
                  </h4>
                  <p className="text-[11px] text-gray-400">
                    {language === 'ti' ? 'ብነጻ ትምህርቲ፡ ትርጉምን ማይኒንግን ዝተረኽበ' : 'Calculated vs. standard market tutoring, OCR & translation rates'}
                  </p>
                </div>
                <div className="text-xl sm:text-2xl font-black text-[#F3E5AB] font-mono">
                  ${summaryData.totalSavingsUSD.toFixed(2)} USD
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SOCRATIC TUTOR INSIGHTS */}
          {activeTab === 'socratic' && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-4 rounded-2xl bg-[#140F24] border border-[#2D2144] space-y-3">
                <div className="flex items-center space-x-2 text-amber-300 text-xs font-bold uppercase tracking-wider">
                  <Sparkles className="w-4 h-4" />
                  <span>{language === 'ti' ? 'ናይ AI መምህር ገምጋም (Socratic Evaluation)' : 'Socratic AI Tutor Evaluation'}</span>
                </div>
                <p className="text-xs sm:text-[13px] text-slate-200 leading-relaxed font-sans">
                  {language === 'ti' ? summaryData.aiSocraticInsight.summaryTi : summaryData.aiSocraticInsight.summaryEn}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#100C1E] border border-amber-500/30 space-y-2.5">
                <div className="flex items-center space-x-2 text-[#F3E5AB] text-xs font-bold uppercase tracking-wider">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span>{language === 'ti' ? 'ናይ ዝመጽእ ሰሙን ሸቶታት' : 'Target Goals For Next Week'}</span>
                </div>
                <p className="text-xs sm:text-[13px] text-gray-300 leading-relaxed">
                  {language === 'ti' ? summaryData.aiSocraticInsight.nextWeekGoalTi : summaryData.aiSocraticInsight.nextWeekGoalEn}
                </p>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer & Direct PDF Trigger */}
        <div className="p-4 sm:p-5 border-t border-[#251A3B] bg-[#0A0713] flex flex-wrap items-center justify-between gap-3 text-xs text-gray-400">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-[11px] text-gray-300">
              {language === 'ti' ? 'ናይ ሰሙን ጸብጻብ ብሕጋዊ ምስክርነት ዝተረጋገጸ እዩ' : 'Official certified weekly performance record'}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#1C1530] hover:bg-[#281E44] text-gray-300 hover:text-white border border-[#3C2D56] font-bold text-xs transition-all cursor-pointer"
            >
              {language === 'ti' ? 'ዕጾ' : 'Close'}
            </button>

            <button
              onClick={handleExportPdf}
              disabled={isExporting}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-400 via-[#E1C47D] to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs transition-all shadow-lg shadow-amber-500/25 flex items-center space-x-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {isExporting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                  <span>{language === 'ti' ? 'ይዳሎ ኣሎ...' : 'Generating PDF...'}</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>{language === 'ti' ? 'ናይ ሰሙን PDF ጸብጻብ ኣውርድ' : 'Download Certified PDF'}</span>
                </>
              )}
            </button>
          </div>
        </div>

      </motion.div>
    </div>
  );
};
