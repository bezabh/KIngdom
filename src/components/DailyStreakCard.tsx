import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Flame, Sparkles, Trophy, CheckCircle2, Lock, Gift, 
  ChevronRight, ArrowRight, Zap, Star, ShieldCheck, 
  MessageSquare, Languages, Palette, Mic, FileText, Image as ImageIcon
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { 
  DailyStreakState, 
  getDailyStreakState, 
  claimDailyStreakReward, 
  subscribeToStreak,
  recordToolUsage 
} from '../services/dailyStreakService';
import { AppTab } from '../types';

interface DailyStreakCardProps {
  onNavigateTab?: (tab: AppTab) => void;
  onOpenTool?: (toolName: string) => void;
  variant?: 'premiere-hero' | 'compact' | 'rewards-embed';
}

const AI_TOOLS_TRACKED = [
  { key: 'chat', label: 'AI Chat', labelTi: 'AI ዕላል', icon: MessageSquare, tab: 'chat' as AppTab },
  { key: 'translator', label: 'Translator', labelTi: 'ተርጓሚ', icon: Languages, tab: 'translator' as AppTab },
  { key: 'speech', label: 'Voice AI', labelTi: 'ድምጺ AI', icon: Mic, tab: 'voice-assistant' as AppTab },
  { key: 'vision', label: 'Vision Art', labelTi: 'ስእሊ AI', icon: ImageIcon, tab: 'vision' as AppTab },
  { key: 'calligraphy', label: 'Calligraphy', labelTi: 'ኪነ-ጽሕፈት', icon: Palette, tab: 'calligraphy' as AppTab },
  { key: 'document', label: 'Document AI', labelTi: 'ሰነድ AI', icon: FileText, tab: 'education' as AppTab },
];

export const DailyStreakCard: React.FC<DailyStreakCardProps> = ({
  onNavigateTab,
  onOpenTool,
  variant = 'premiere-hero',
}) => {
  const { language } = useLanguage();
  const isTigrinya = language === 'ti' || language === 'ti_tg';

  const [streakState, setStreakState] = useState<DailyStreakState>(() => getDailyStreakState());
  const [celebrationReward, setCelebrationReward] = useState<{ credits: number; cash: number } | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToStreak((newState) => {
      setStreakState(newState);
    });
    return unsubscribe;
  }, []);

  const handleClaim = () => {
    if (streakState.todayClaimed || isClaiming) return;
    setIsClaiming(true);

    const result = claimDailyStreakReward();
    if (result.success) {
      setCelebrationReward({
        credits: result.rewardEarned.credits,
        cash: result.rewardEarned.cash,
      });
      setTimeout(() => {
        setCelebrationReward(null);
      }, 3500);
    }
    setIsClaiming(false);
  };

  const handleToolClick = (tool: typeof AI_TOOLS_TRACKED[0]) => {
    recordToolUsage(tool.key);
    if (onOpenTool) {
      onOpenTool(tool.key);
    } else if (onNavigateTab) {
      onNavigateTab(tool.tab);
    }
  };

  const currentDayIndex = ((streakState.streakDays - 1) % 7) + 1;
  const currentTier = streakState.weeklyProgress.find(p => p.isCurrentDay) || streakState.weeklyProgress[0];
  const nextMilestoneCredits = Math.round(currentTier.credits * streakState.streakMultiplier);
  const nextMilestoneCash = (currentTier.cash * streakState.streakMultiplier).toFixed(2);

  // Rewards Embed Variant (inside RewardsView)
  if (variant === 'rewards-embed') {
    return (
      <div className="rounded-3xl p-5 bg-gradient-to-br from-[#1C1433] via-[#150F28] to-[#0D0A1A] border border-amber-500/40 shadow-xl relative overflow-hidden text-white">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-44 h-44 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
        
        {/* Header */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-md shadow-orange-950/50">
              <Flame className="w-5 h-5 animate-pulse text-amber-200" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <h3 className="text-sm font-black tracking-tight text-amber-200">
                  {isTigrinya ? `${streakState.streakDays} መዓልቲ ተኸታታሊ ንቕሓት` : `${streakState.streakDays}-Day Active Streak`}
                </h3>
                <span className="px-1.5 py-0.2 text-[9px] font-black uppercase bg-orange-950 text-orange-400 border border-orange-600/40 rounded font-mono">
                  {streakState.streakMultiplier}x BOOST
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                {isTigrinya ? 'መዓልታዊ ብምጥቃም ተወሳኺ ክሬዲትን ገንዘብን ኣክብ' : 'Log in & use AI tools daily for extra credits & cash'}
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[10px] text-amber-400/80 font-mono uppercase font-bold block">
              {isTigrinya ? 'ዝተዓቀበ' : 'Total Earned'}
            </span>
            <span className="text-xs font-mono font-black text-amber-300">
              +{streakState.bonusCreditsEarnedTotal} Cr (${streakState.bonusCashEarnedTotal.toFixed(2)})
            </span>
          </div>
        </div>

        {/* 7-Day Road */}
        <div className="grid grid-cols-7 gap-1.5 my-3">
          {streakState.weeklyProgress.map((day) => {
            const isToday = day.isCurrentDay;
            const isClaimed = day.claimed;
            return (
              <div
                key={day.dayIndex}
                className={`flex flex-col items-center justify-center p-2 rounded-xl text-center border transition-all ${
                  isToday
                    ? 'bg-gradient-to-b from-amber-500/20 to-orange-500/20 border-amber-400 shadow-md shadow-amber-500/20 ring-1 ring-amber-400'
                    : isClaimed
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                      : 'bg-white/5 border-white/10 text-slate-400'
                }`}
              >
                <span className="text-[9px] font-black uppercase font-mono">
                  {isTigrinya ? `መ${day.dayIndex}` : `D${day.dayIndex}`}
                </span>
                
                <div className="my-1">
                  {isClaimed ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : isToday ? (
                    <Flame className="w-3.5 h-3.5 text-orange-400 animate-pulse" />
                  ) : (
                    <Star className="w-3.5 h-3.5 text-slate-500" />
                  )}
                </div>

                <span className="text-[8.5px] font-mono font-bold text-amber-300">
                  +{day.credits}
                </span>
              </div>
            );
          })}
        </div>

        {/* Action Button */}
        <div className="mt-3">
          {streakState.todayClaimed ? (
            <div className="py-2.5 px-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center justify-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>
                {isTigrinya 
                  ? `ናይ ሎሚ ተወሳኺ ክሬዲት ተወሲዱ (${nextMilestoneCredits} Cr / $${nextMilestoneCash})` 
                  : `Today's Streak Bonus Claimed (+${nextMilestoneCredits} Credits)`}
              </span>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleClaim}
              disabled={isClaiming}
              className="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-[#D7A23A] via-[#ECC665] to-[#C99127] hover:brightness-110 active:scale-98 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center space-x-2 shadow-lg shadow-amber-950/40 border border-amber-300/50 cursor-pointer transition-all"
            >
              <Gift className="w-4 h-4 text-slate-950" />
              <span>
                {isTigrinya 
                  ? `ናይ ${currentDayIndex}ይ መዓልቲ ቦነስ ተቐበል (+${nextMilestoneCredits} Cr / +$${nextMilestoneCash})` 
                  : `Claim Day ${currentDayIndex} Bonus (+${nextMilestoneCredits} Credits & +$${nextMilestoneCash})`}
              </span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // Primary Premiere Hero Card
  return (
    <div className="relative rounded-3xl p-4 sm:p-5 bg-gradient-to-r from-[#121B33] via-[#1A2548] to-[#2B1B15] text-white border border-[#C5A059]/60 shadow-xl shadow-blue-950/30 overflow-hidden group">
      
      {/* Floating Animated Celebration Banner */}
      <AnimatePresence>
        {celebrationReward && (
          <motion.div
            initial={{ opacity: 0, y: -15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute top-2 inset-x-2 z-30 p-2.5 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-slate-950 font-black text-xs shadow-xl flex items-center justify-between border border-white"
          >
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-slate-950 animate-spin" />
              <span>
                {isTigrinya 
                  ? `+${celebrationReward.credits} ናይ AI ክሬዲትን +$${celebrationReward.cash.toFixed(2)} ገንዘብን ተወሲኹ!` 
                  : `+${celebrationReward.credits} Free AI Credits & +$${celebrationReward.cash.toFixed(2)} Cash Credited!`}
              </span>
            </div>
            <span className="text-[10px] font-mono bg-slate-950 text-amber-300 px-2 py-0.5 rounded-full">
              CLAIMED
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ambient Radial Glow */}
      <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-orange-500/15 via-amber-500/10 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-48 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Top Banner Row */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3.5">
        <div className="flex items-start sm:items-center space-x-3.5 min-w-0">
          {/* Flame Icon Hexagon */}
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#ECC665] via-[#E19C24] to-[#B34509] p-0.5 shadow-lg shadow-orange-950/40 shrink-0 group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-[#140F24] rounded-[14px] flex items-center justify-center text-amber-300">
              <Flame className="w-6 h-6 text-amber-400 animate-pulse" />
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex items-center space-x-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-black tracking-tight text-amber-200">
                {isTigrinya ? `${streakState.streakDays} መዓልቲ ተኸታታሊ ንቕሓት` : `${streakState.streakDays}-Day Daily Streak`}
              </h3>
              <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-orange-950 text-orange-400 border border-orange-600/40 rounded-full font-mono flex items-center space-x-1">
                <span>🔥 {streakState.streakMultiplier}x MULTIPLIER</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-300 font-medium mt-0.5">
              {isTigrinya 
                ? `መዓልታዊ ብምጥቃም +${nextMilestoneCredits} ነጻ ክሬዲት ረከብ` 
                : `Consecutive daily tool usage earns extra AI credits & cash rewards`}
            </p>
          </div>
        </div>

        {/* View All Rewards button */}
        {onNavigateTab && (
          <button
            type="button"
            onClick={() => onNavigateTab('rewards')}
            className="self-start sm:self-center py-1.5 px-3 rounded-full bg-white/10 hover:bg-white/20 text-amber-300 hover:text-amber-200 text-xs font-bold flex items-center space-x-1 transition-all cursor-pointer border border-white/10 shrink-0"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>{isTigrinya ? 'ናይ ዓስቢ ማእከል' : 'Rewards Hub'}</span>
            <ChevronRight className="w-3 h-3 stroke-[3]" />
          </button>
        )}
      </div>

      {/* 7-Day Weekly Streak Roadmap */}
      <div className="relative z-10 grid grid-cols-7 gap-1.5 sm:gap-2 my-3">
        {streakState.weeklyProgress.map((day) => {
          const isToday = day.isCurrentDay;
          const isClaimed = day.claimed;
          return (
            <div
              key={day.dayIndex}
              className={`flex flex-col items-center justify-between p-1.5 sm:p-2 rounded-xl text-center border transition-all relative ${
                isToday
                  ? 'bg-gradient-to-b from-amber-500/25 via-orange-500/20 to-[#2A180E] border-amber-400 shadow-md shadow-amber-500/30 ring-2 ring-amber-400/80 scale-[1.03]'
                  : isClaimed
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                    : 'bg-white/5 border-white/10 text-slate-400'
              }`}
            >
              {isToday && (
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-1 text-[7.5px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 rounded font-mono shadow-xs">
                  TODAY
                </span>
              )}

              <span className={`text-[8.5px] sm:text-[9.5px] font-black font-mono ${isToday ? 'text-amber-200 mt-1' : ''}`}>
                {isTigrinya ? day.dayLabelTi : day.dayLabel}
              </span>
              
              <div className="my-1 sm:my-1.5">
                {isClaimed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 fill-emerald-400/20" />
                ) : isToday ? (
                  <Flame className="w-4 h-4 text-orange-400 animate-pulse" />
                ) : (
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                )}
              </div>

              <div className="text-[8px] sm:text-[9px] font-mono font-bold text-amber-300/90 leading-tight">
                +{day.credits}
              </div>
            </div>
          );
        })}
      </div>

      {/* Daily AI Tools Activity Multiplier Bar */}
      <div className="relative z-10 mt-3 pt-3 border-t border-slate-700/50">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-slate-300 font-semibold flex items-center space-x-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>{isTigrinya ? 'ናይ ሎሚ AI መሳርሕታት ተሳትፎ' : 'Today’s AI Tool Activity'}</span>
          </span>
          <span className="text-[11px] font-mono text-amber-300 font-bold">
            {streakState.toolsUsedToday.length}/{AI_TOOLS_TRACKED.length} {isTigrinya ? 'ተጠቒምካ' : 'Used'} (+{Math.min(streakState.toolsUsedToday.length * 10, 50)}% XP)
          </span>
        </div>

        {/* Tools Pill List */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {AI_TOOLS_TRACKED.map((tool) => {
            const isUsed = streakState.toolsUsedToday.includes(tool.key);
            const Icon = tool.icon;
            return (
              <button
                key={tool.key}
                type="button"
                onClick={() => handleToolClick(tool)}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold flex items-center space-x-1.5 border transition-all cursor-pointer ${
                  isUsed
                    ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200'
                    : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300 hover:text-white'
                }`}
                title={isUsed ? 'Used today!' : `Click to use ${tool.label}`}
              >
                <Icon className={`w-3 h-3 ${isUsed ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span>{isTigrinya ? tool.labelTi : tool.label}</span>
                {isUsed && <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400 ml-0.5" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Claim Action Button */}
      <div className="relative z-10 mt-3 pt-2">
        {streakState.todayClaimed ? (
          <div className="py-2.5 px-4 rounded-2xl bg-emerald-950/70 border border-emerald-500/50 text-emerald-200 font-bold text-xs flex items-center justify-between shadow-inner">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>
                {isTigrinya 
                  ? `ናይ ሎሚ ${currentDayIndex}ይ መዓልቲ ዓስቢ ተወሲዱ (+${nextMilestoneCredits} Cr & +$${nextMilestoneCash})` 
                  : `Day ${currentDayIndex} Streak Reward Claimed (+${nextMilestoneCredits} Credits)`}
              </span>
            </div>
            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab('rewards')}
                className="text-[11px] text-amber-300 hover:underline font-bold flex items-center space-x-1 cursor-pointer"
              >
                <span>{isTigrinya ? 'ሚዛን ርአ' : 'View Balance'}</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={handleClaim}
            disabled={isClaiming}
            className="w-full py-3 px-5 rounded-2xl bg-gradient-to-r from-[#D7A23A] via-[#ECC665] to-[#C99127] hover:brightness-110 active:scale-[0.99] text-slate-950 font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center space-x-2 shadow-lg shadow-amber-950/50 border border-amber-300/60 cursor-pointer transition-all"
          >
            <Gift className="w-4 h-4 text-slate-950 animate-bounce" />
            <span>
              {isTigrinya 
                ? `ናይ ${currentDayIndex}ይ መዓልቲ ቦነስ ተቐበል (+${nextMilestoneCredits} ክሬዲት & +$${nextMilestoneCash})` 
                : `Claim Day ${currentDayIndex} Streak Reward (+${nextMilestoneCredits} Free Credits & +$${nextMilestoneCash})`}
            </span>
          </button>
        )}
      </div>

    </div>
  );
};
