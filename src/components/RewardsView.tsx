import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Gift, Sparkles, Trophy, Zap, Lock, Star, Link2, 
  CheckCircle2, Clock, RotateCcw, RefreshCw, DollarSign, Wallet, 
  ChevronRight, ExternalLink, Share2, HelpCircle, ShieldCheck, 
  Smartphone, CreditCard, Building2, Send, Check, X, AlertCircle, 
  Coins, MessageSquare, BookOpen, Languages, Palette, Landmark, 
  Flame, Award, Eye, Crown, Users
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { AppTab, UserProfile } from '../types';
import { playGoldenNotificationChime } from '../services/notificationService';
import { CommunityWisdomLeaderboard } from './CommunityWisdomLeaderboard';
import { DashboardLayoutShell, DashboardMetricItem } from './DashboardLayoutShell';

interface RewardsViewProps {
  onBack?: () => void;
  onNavigateTab?: (tab: AppTab) => void;
  user?: UserProfile;
}

interface TaskItem {
  id: string;
  title: string;
  titleTi: string;
  description: string;
  descriptionTi: string;
  reward: number; // in USD (e.g. 0.05)
  category: 'chat' | 'education' | 'translator' | 'calligraphy' | 'vision' | 'culture' | 'daily' | 'referral';
  targetTab?: AppTab;
  completed: boolean;
  repeatable: boolean;
  iconType: 'link' | 'chat' | 'book' | 'translate' | 'palette' | 'culture' | 'flame' | 'share';
}

interface PayoutRequestRecord {
  id: string;
  amount: number;
  currency: string;
  method: 'telebirr' | 'cbe-birr' | 'nakfa-pay' | 'bank-wire' | 'paypal' | 'crypto';
  recipientName: string;
  recipientAccount: string;
  status: 'pending' | 'processing' | 'completed';
  timestamp: string;
  referenceCode: string;
}

const STORAGE_KEY_REWARDS = 'axumite_rewards_data_v1';

export const RewardsView: React.FC<RewardsViewProps> = ({
  onBack,
  onNavigateTab,
  user,
}) => {
  const { language } = useLanguage();
  const isTigrinya = language === 'ti' || language === 'ti_tg';

  // Initial State matching exact screenshot defaults ($10.00, 200 tasks done, Payout requested)
  const [activeTabMode, setActiveTabMode] = useState<'tasks' | 'wisdom'>('tasks');
  const [unpaidBalance, setUnpaidBalance] = useState<number>(10.00);
  const [tasksDone, setTasksDone] = useState<number>(200);
  const [payoutRequested, setPayoutRequested] = useState<boolean>(true);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState<boolean>(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);
  const [floatingReward, setFloatingReward] = useState<{ amount: number; title: string; id: number } | null>(null);

  // Payout Form State
  const [payoutMethod, setPayoutMethod] = useState<'telebirr' | 'cbe-birr' | 'nakfa-pay' | 'bank-wire' | 'paypal' | 'crypto'>('telebirr');
  const [recipientName, setRecipientName] = useState(user?.name || 'Axumite Sovereign User');
  const [recipientAccount, setRecipientAccount] = useState(user?.phoneNumber || '+251 91 123 4567');
  const [payoutHistory, setPayoutHistory] = useState<PayoutRequestRecord[]>([
    {
      id: 'pay_req_9921',
      amount: 10.00,
      currency: 'USD',
      method: 'telebirr',
      recipientName: 'Axumite User',
      recipientAccount: '+251 91 123 4567',
      status: 'pending',
      timestamp: '2026-08-23 18:42',
      referenceCode: 'AXM-PAY-884920'
    }
  ]);

  // Task list definitions matching screenshot exactly + Axumite AI integrations
  const [tasks, setTasks] = useState<TaskItem[]>([
    {
      id: 'task_visit_ai',
      title: 'Visit the AI Assistant',
      titleTi: 'ናብ AI ሓጋዚ ኪድ',
      description: 'Engage in a session with the Obelisk AI Assistant.',
      descriptionTi: 'ምስ ኦበሊስክ AI ሓጋዚ ዕላል ጀምር።',
      reward: 0.05,
      category: 'chat',
      targetTab: 'chat',
      completed: false,
      repeatable: true,
      iconType: 'link',
    },
    {
      id: 'task_open_lesson',
      title: 'Open a lesson',
      titleTi: 'ትምህርቲ ክፈት',
      description: 'Explore a Socratic AI lesson or Tigrinya Fidel tutorial.',
      descriptionTi: 'ናይ ፊደል ወይ ናይ ቋንቋ ትምህርቲ ጀምር።',
      reward: 0.05,
      category: 'education',
      targetTab: 'education',
      completed: false,
      repeatable: true,
      iconType: 'link',
    },
    {
      id: 'task_translate_phrase',
      title: 'Translate a phrase',
      titleTi: 'ሓረግ ተርጉም',
      description: 'Use the Ge\'ez & Tigrinya Neural Translator to convert text.',
      descriptionTi: 'ብተርጓሚ ግዕዝን ትግርኛን ጽሑፍ ተርጉም።',
      reward: 0.05,
      category: 'translator',
      targetTab: 'translator',
      completed: false,
      repeatable: true,
      iconType: 'link',
    },
    {
      id: 'task_calligraphy',
      title: 'Try Ge\'ez Calligraphy Studio',
      titleTi: 'ኪነ-ጽሕፈት ግዕዝ ፈትን',
      description: 'Generate sacred Harag calligraphy illuminated manuscripts.',
      descriptionTi: 'ቅዱስ ሓረግን ስነ-ጽሕፈት ግዕዝን ኣመንጭው።',
      reward: 0.05,
      category: 'calligraphy',
      targetTab: 'calligraphy',
      completed: false,
      repeatable: true,
      iconType: 'link',
    },
    {
      id: 'task_vision_art',
      title: 'Generate an AI Vision Masterpiece',
      titleTi: 'ናይ AI ስእሊ ኣመንጭው',
      description: 'Render high-resolution Tigray & Eritrea cultural artifacts in 4K.',
      descriptionTi: 'ናይ ባህላዊ ውርሻታት 4K ስእሊ ብ AI ኣመንጭው።',
      reward: 0.05,
      category: 'vision',
      targetTab: 'vision',
      completed: false,
      repeatable: true,
      iconType: 'link',
    },
    {
      id: 'task_culture_explore',
      title: 'Explore Cultural Heritage Monuments',
      titleTi: 'ታሪኻዊ ቅርሲታት ጐብንይ',
      description: 'Discover Axum Obelisks, Debre Damo, and ancient Geez scrolls.',
      descriptionTi: 'ሓወልቲ ኣክሱም፡ ደብረ ዳሞን ጥንታዊ ጽሑፋትን ጐብንይ።',
      reward: 0.05,
      category: 'culture',
      targetTab: 'cultural-explorer',
      completed: false,
      repeatable: true,
      iconType: 'link',
    },
    {
      id: 'task_daily_checkin',
      title: 'Daily Active Check-in',
      titleTi: 'ናይ መዓልቲ ተሳትፎ ቦነስ',
      description: 'Claim your daily loyalty reward for learning with Axumite AI.',
      descriptionTi: 'ናይ መዓልታዊ ምብጻሕ ቐጻልነት ዓስብኻ ተቐበል።',
      reward: 0.10,
      category: 'daily',
      completed: false,
      repeatable: true,
      iconType: 'flame',
    },
    {
      id: 'task_refer_friend',
      title: 'Invite a Friend to Axumite AI',
      titleTi: 'ንፈታዊኻ ዓድም',
      description: 'Share Axumite AI with friends or diaspora community members.',
      descriptionTi: 'ንፈተውትኻ ናብ ኣክሱማይት AI ብምዕዳም $1.00 ረከብ።',
      reward: 1.00,
      category: 'referral',
      completed: false,
      repeatable: true,
      iconType: 'share',
    },
  ]);

  // Load persistence
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_REWARDS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.unpaidBalance === 'number') setUnpaidBalance(parsed.unpaidBalance);
        if (typeof parsed.tasksDone === 'number') setTasksDone(parsed.tasksDone);
        if (typeof parsed.payoutRequested === 'boolean') setPayoutRequested(parsed.payoutRequested);
        if (Array.isArray(parsed.payoutHistory)) setPayoutHistory(parsed.payoutHistory);
      }
    } catch (e) {
      console.warn('Failed to parse saved rewards data', e);
    }
  }, []);

  // Save persistence
  const persistState = (newBalance: number, newDone: number, newRequested: boolean, newHistory?: PayoutRequestRecord[]) => {
    try {
      localStorage.setItem(STORAGE_KEY_REWARDS, JSON.stringify({
        unpaidBalance: newBalance,
        tasksDone: newDone,
        payoutRequested: newRequested,
        payoutHistory: newHistory || payoutHistory,
      }));
    } catch (e) {
      console.warn('Failed to save rewards data', e);
    }
  };

  const payoutThreshold = 10.00;
  const progressPercent = Math.min(100, Math.round((unpaidBalance / payoutThreshold) * 100));

  // Handle task execution & earning
  const handleExecuteTask = (task: TaskItem) => {
    playGoldenNotificationChime();
    const newBalance = parseFloat((unpaidBalance + task.reward).toFixed(2));
    const newDone = tasksDone + 1;
    setUnpaidBalance(newBalance);
    setTasksDone(newDone);
    persistState(newBalance, newDone, payoutRequested);

    // Show floating reward celebration
    setFloatingReward({
      amount: task.reward,
      title: isTigrinya ? task.titleTi : task.title,
      id: Date.now()
    });
    setTimeout(() => {
      setFloatingReward(null);
    }, 2800);

    // If task has a target tab, give user option or navigate smoothly
    if (task.targetTab && onNavigateTab) {
      setTimeout(() => {
        onNavigateTab(task.targetTab!);
      }, 600);
    }
  };

  // Handle bonus earned from contributing to the community wisdom knowledge base
  const handleEarnWisdomBonus = (amount: number, reason: string) => {
    playGoldenNotificationChime();
    const newBalance = parseFloat((unpaidBalance + amount).toFixed(2));
    const newDone = tasksDone + 1;
    setUnpaidBalance(newBalance);
    setTasksDone(newDone);
    persistState(newBalance, newDone, payoutRequested);

    setFloatingReward({
      amount,
      title: reason,
      id: Date.now(),
    });
    setTimeout(() => {
      setFloatingReward(null);
    }, 2800);
  };

  // Submit Payout Request
  const handleSubmitPayout = (e: React.FormEvent) => {
    e.preventDefault();
    if (unpaidBalance < payoutThreshold) return;

    playGoldenNotificationChime();
    const refCode = `AXM-PAY-${Math.floor(100000 + Math.random() * 900000)}`;
    const newRecord: PayoutRequestRecord = {
      id: `pay_req_${Date.now()}`,
      amount: unpaidBalance,
      currency: 'USD',
      method: payoutMethod,
      recipientName,
      recipientAccount,
      status: 'pending',
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      referenceCode: refCode,
    };

    const newHistory = [newRecord, ...payoutHistory];
    setPayoutHistory(newHistory);
    setPayoutRequested(true);
    persistState(unpaidBalance, tasksDone, true, newHistory);
    setIsWithdrawModalOpen(false);
  };

  // Quick Demo Simulator to test states
  const handleSetSampleBalance = (val: number, req: boolean) => {
    setUnpaidBalance(val);
    setPayoutRequested(req);
    persistState(val, tasksDone, req);
  };

  const rewardsMetrics: DashboardMetricItem[] = [
    {
      id: 'balance',
      label: isTigrinya ? 'ዘይተኸፍለ ሚዛን' : 'Unpaid Balance',
      value: `$${unpaidBalance.toFixed(2)}`,
      sublabel: isTigrinya ? 'ዝተዋህለለ ዓስቢ' : 'Available earnings',
      accent: 'gold',
    },
    {
      id: 'tasks',
      label: isTigrinya ? 'ዝተፈጸሙ ዕማማት' : 'Tasks Completed',
      value: tasksDone,
      sublabel: isTigrinya ? 'ጠቕላላ ዝተዛዘሙ' : 'Verified completions',
      accent: 'neutral',
    },
    {
      id: 'progress',
      label: isTigrinya ? `ናብ $${payoutThreshold.toFixed(2)} ክፍሊት` : `Toward $${payoutThreshold.toFixed(2)} Payout`,
      value: `${progressPercent}%`,
      sublabel:
        unpaidBalance >= payoutThreshold
          ? isTigrinya
            ? 'ደረት ተበጺሑ'
            : 'Threshold reached'
          : isTigrinya
          ? `ተወሳኺ $${(payoutThreshold - unpaidBalance).toFixed(2)} የድሊ`
          : `$${(payoutThreshold - unpaidBalance).toFixed(2)} remaining`,
      accent: unpaidBalance >= payoutThreshold ? 'emerald' : 'sky',
    },
    {
      id: 'status',
      label: isTigrinya ? 'ኩነታት ክፍሊት' : 'Payout Status',
      value: payoutRequested
        ? isTigrinya
          ? 'ተሓቲቱ'
          : 'Requested'
        : unpaidBalance >= payoutThreshold
        ? isTigrinya
          ? 'ድሉው'
          : 'Ready'
        : isTigrinya
        ? 'ኣብ መስርሕ'
        : 'In Progress',
      sublabel: payoutRequested
        ? isTigrinya
          ? 'ታሪኽ ርአ'
          : 'Click to inspect status'
        : isTigrinya
        ? 'Telebirr · CBE · Stripe'
        : 'Telebirr · CBE · Stripe',
      accent: payoutRequested || unpaidBalance >= payoutThreshold ? 'emerald' : 'neutral',
      onClick: () => {
        if (payoutRequested) setIsHistoryModalOpen(true);
        else if (unpaidBalance >= payoutThreshold) setIsWithdrawModalOpen(true);
      },
    },
  ];

  return (
    <>
      {/* Floating Reward Celebration Toast */}
      {floatingReward && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
          <div className="px-4 py-2.5 rounded-xl bg-[#C5A059] text-[#09090B] font-semibold text-xs shadow-2xl flex items-center gap-2">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span className="tabular-nums">+${floatingReward.amount.toFixed(2)} EARNED</span>
            <span className="opacity-80">· {floatingReward.title}</span>
          </div>
        </div>
      )}

      <DashboardLayoutShell
        sectionLabel={isTigrinya ? 'ዓስብን ማሕበረሰብን' : 'Rewards & Community'}
        title={isTigrinya ? 'ዓስብን ቦነስን (Rewards)' : 'Rewards & Wisdom Hub'}
        subtitleTi={isTigrinya ? undefined : 'ዓስብን ቦነስን'}
        description={
          isTigrinya
            ? 'ዕማማት ፈጽም እሞ ገንዘብ ረከብ። ብTelebirr፣ CBE Birr ወይ Stripe ብቐጥታ ኣውጽእ።'
            : 'Complete sovereign learning and community tasks, climb the Community Wisdom leaderboard, and cash out directly via Telebirr, CBE Birr, or Stripe.'
        }
        icon={Gift}
        actions={
          <>
            {(onBack || onNavigateTab) && (
              <button
                type="button"
                onClick={() => {
                  if (onBack) onBack();
                  else if (onNavigateTab) onNavigateTab('premiere');
                }}
                className="inline-flex items-center gap-1.5 px-3.5 min-h-[40px] rounded-xl border border-[#8E6D28]/35 bg-[#121318] hover:border-[#C5A059]/60 text-slate-200 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-[#E1C47D]" />
                <span>{isTigrinya ? 'ተመለስ' : 'Back to Hub'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsHistoryModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 min-h-[40px] rounded-xl border border-[#8E6D28]/35 bg-[#121318] hover:border-[#C5A059]/60 text-slate-200 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
              title="Payout History & Details"
            >
              <Clock className="w-3.5 h-3.5 text-[#E1C47D]" />
              <span>{isTigrinya ? 'ታሪኽ ክፍሊት' : 'Payout History'}</span>
            </button>

            {unpaidBalance >= payoutThreshold && !payoutRequested && (
              <button
                type="button"
                onClick={() => setIsWithdrawModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 min-h-[40px] rounded-xl bg-[#C5A059] hover:bg-[#D5B26B] text-[#09090B] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>{isTigrinya ? 'ክፍሊት ሕተት ($10.00)' : 'Request Payout'}</span>
              </button>
            )}
          </>
        }
        metrics={rewardsMetrics}
        tabs={[
          {
            id: 'tasks',
            label: isTigrinya ? 'ዕማማትን ክፍሊትን' : 'Tasks & Cashout',
            icon: DollarSign,
            count: tasks.length,
          },
          {
            id: 'wisdom',
            label: isTigrinya ? 'ናይ ጥበብ መሪሕነት' : 'Community Wisdom',
            icon: Trophy,
          },
        ]}
        activeTabId={activeTabMode}
        onSelectTab={(id) => setActiveTabMode(id as 'tasks' | 'wisdom')}
      >
        {activeTabMode === 'wisdom' ? (
          <CommunityWisdomLeaderboard
            user={user}
            onEarnWisdomBonus={handleEarnWisdomBonus}
            onNavigateTab={onNavigateTab}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left 5 Columns: Balance Progress, Payout Control & Community Spotlight */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-[#0C0D11] border border-[#8E6D28]/30 rounded-2xl p-5 sm:p-6 space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs text-slate-400 font-medium">
                      {isTigrinya ? 'ዘይተኸፍለ ሚዛን' : 'Unpaid Balance'}
                    </p>
                    <p className="mt-1 text-3xl sm:text-4xl font-bold text-[#F3E5AB] tabular-nums tracking-tight">
                      ${unpaidBalance.toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400 font-medium">
                      {isTigrinya ? 'ዝተፈጸሙ ዕማማት' : 'Tasks Done'}
                    </p>
                    <p className="mt-1 text-3xl sm:text-4xl font-bold text-slate-100 tabular-nums tracking-tight">
                      {tasksDone}
                    </p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">
                      {isTigrinya
                        ? `ናብ $${payoutThreshold.toFixed(2)} ክፍሊት`
                        : `Toward $${payoutThreshold.toFixed(2)} payout`}
                    </span>
                    <span className="text-[#E1C47D] font-semibold font-mono tabular-nums">
                      {progressPercent}%
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#181A22] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#8E6D28] via-[#C5A059] to-[#F3E5AB] transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Primary Cashout CTA */}
                <div>
                  {unpaidBalance < payoutThreshold ? (
                    <div className="w-full min-h-[44px] px-4 rounded-xl bg-[#121318] border border-[#8E6D28]/20 text-slate-400 font-medium text-xs flex items-center justify-center gap-2">
                      <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>
                        {isTigrinya
                          ? `ንምውጻእ ናብ $${payoutThreshold.toFixed(2)} ብጻሕ`
                          : `Reach $${payoutThreshold.toFixed(2)} to unlock withdrawal`}
                      </span>
                    </div>
                  ) : payoutRequested ? (
                    <button
                      type="button"
                      onClick={() => setIsHistoryModalOpen(true)}
                      className="w-full min-h-[44px] px-4 rounded-xl bg-[#121318] hover:bg-[#191B23] border border-[#C5A059]/50 text-[#F3E5AB] font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                    >
                      <CheckCircle2 className="w-4 h-4 text-[#E1C47D] shrink-0" />
                      <span>
                        {isTigrinya
                          ? 'ክፍሊት ተሓቲቱ ($10.00) · ኩነታት ርአ'
                          : 'Payout Requested ($10.00) · View Status'}
                      </span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsWithdrawModalOpen(true)}
                      className="w-full min-h-[44px] px-4 rounded-xl bg-[#C5A059] hover:bg-[#D5B26B] text-[#09090B] font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                    >
                      <DollarSign className="w-4 h-4 shrink-0" />
                      <span>
                        {isTigrinya ? 'ክፍሊት ሕተት ($10.00)' : 'Request $10.00 Payout Now'}
                      </span>
                    </button>
                  )}
                </div>

                {/* Community Wisdom Shortcut */}
                <button
                  type="button"
                  onClick={() => setActiveTabMode('wisdom')}
                  className="w-full pt-4 border-t border-[#8E6D28]/20 flex items-center justify-between gap-3 text-left group cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#121318] border border-[#8E6D28]/30 flex items-center justify-center text-[#E1C47D] shrink-0">
                      <Trophy className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-100 group-hover:text-[#F3E5AB] transition-colors truncate">
                        {isTigrinya ? 'ዓለማዊ ናይ ማሕበረሰብ ጥበብ' : 'Community Wisdom Leaderboard'}
                      </p>
                      <p className="text-xs text-slate-400 truncate">
                        {isTigrinya
                          ? 'ፍልጠት ኣበርክት፡ ነጥብታት ኣክብ፡ ዓስቢ ረከብ'
                          : 'Rank #14 · Contribute proverbs & earn bonus rewards'}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-[#E1C47D] shrink-0" />
                </button>
              </div>

              {/* Balance Preview Controls */}
              <div className="bg-[#0C0D11] border border-[#8E6D28]/25 rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="inline-flex items-center gap-1.5 font-medium text-slate-300">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#E1C47D]" />
                    <span>Payout State Preview</span>
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">Simulator</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleSetSampleBalance(10.0, true)}
                    className="px-2.5 py-1.5 rounded-lg bg-[#121318] hover:bg-[#191B23] border border-[#8E6D28]/30 text-[#F3E5AB] text-[11px] font-medium cursor-pointer whitespace-nowrap"
                  >
                    $10.00 Requested
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetSampleBalance(10.0, false)}
                    className="px-2.5 py-1.5 rounded-lg bg-[#121318] hover:bg-[#191B23] border border-emerald-500/35 text-emerald-300 text-[11px] font-medium cursor-pointer whitespace-nowrap"
                  >
                    $10.00 Ready
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetSampleBalance(4.5, false)}
                    className="px-2.5 py-1.5 rounded-lg bg-[#121318] hover:bg-[#191B23] border border-slate-700/60 text-slate-300 text-[11px] font-medium cursor-pointer whitespace-nowrap"
                  >
                    $4.50 Locked
                  </button>
                </div>
              </div>
            </div>

            {/* Right 7 Columns: Hairline-Divided Earning Tasks */}
            <div className="lg:col-span-7 bg-[#0C0D11] border border-[#8E6D28]/30 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-[#8E6D28]/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-[#E1C47D]" />
                  <h2 className="text-sm font-semibold text-slate-100">
                    {isTigrinya ? 'ንጡፋት ዕማማት (Available Tasks)' : 'Available Earning Tasks'}
                  </h2>
                </div>
                <span className="text-xs text-slate-400 tabular-nums">
                  {tasks.length} tasks
                </span>
              </div>

              <div className="divide-y divide-[#8E6D28]/15">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="px-5 py-4 hover:bg-[#111218] transition-colors flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[#121318] border border-[#8E6D28]/25 flex items-center justify-center shrink-0">
                        {task.iconType === 'flame' ? (
                          <Flame className="w-4 h-4 text-[#E1C47D]" />
                        ) : task.iconType === 'share' ? (
                          <Share2 className="w-4 h-4 text-sky-400" />
                        ) : (
                          <Link2 className="w-4 h-4 text-[#C5A059]" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-100 truncate">
                          {isTigrinya ? task.titleTi : task.title}
                        </p>
                        <p className="text-xs text-slate-400 line-clamp-1">
                          {isTigrinya ? task.descriptionTi : task.description}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleExecuteTask(task)}
                      className="px-3.5 min-h-[36px] rounded-xl bg-[#C5A059] hover:bg-[#D5B26B] text-[#09090B] font-semibold text-xs tabular-nums transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    >
                      {isTigrinya
                        ? `ረከብ $${task.reward.toFixed(2)}`
                        : `Earn $${task.reward.toFixed(2)}`}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </DashboardLayoutShell>

      {/* ========================================================================= */}
      {/* 4. WITHDRAWAL & PAYOUT MODAL                                              */}
      {/* ========================================================================= */}
      {isWithdrawModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0F0C1E] border border-[#8E6D28]/60 rounded-3xl p-5 sm:p-6 shadow-2xl text-white space-y-5 animate-in fade-in zoom-in-95">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Wallet className="w-5 h-5 text-[#E1C47D]" />
                <h3 className="text-lg font-black text-white">
                  {isTigrinya ? 'ክፍሊት ምውጻእ' : 'Request Payout'}
                </h3>
              </div>
              <button
                onClick={() => setIsWithdrawModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#181329] text-slate-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-[#151028] border border-[#8E6D28]/30 flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-400 uppercase font-mono">Withdrawal Amount</div>
                <div className="text-2xl font-black text-[#E1C47D]">${unpaidBalance.toFixed(2)} USD</div>
              </div>
              <div className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-bold font-mono">
                100% REACHED
              </div>
            </div>

            <form onSubmit={handleSubmitPayout} className="space-y-4">
              {/* Payout Method Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Choose Payout Method</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'telebirr', name: 'Telebirr (ETB)', icon: Smartphone },
                    { id: 'cbe-birr', name: 'CBE Birr', icon: Building2 },
                    { id: 'nakfa-pay', name: 'Nakfa Mobile Pay', icon: Coins },
                    { id: 'bank-wire', name: 'Bank Wire (IBAN)', icon: CreditCard },
                    { id: 'paypal', name: 'PayPal (Global)', icon: Send },
                    { id: 'crypto', name: 'USDT (TRC20)', icon: Sparkles },
                  ].map(m => {
                    const IconComponent = m.icon;
                    return (
                      <button
                        type="button"
                        key={m.id}
                        onClick={() => setPayoutMethod(m.id as any)}
                        className={`p-2.5 rounded-xl border text-left flex items-center space-x-2 transition-all cursor-pointer ${
                          payoutMethod === m.id
                            ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                            : 'bg-[#151028] border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <IconComponent className="w-4 h-4 text-[#E1C47D]" />
                        <span className="text-xs font-bold">{m.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Beneficiary Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Full Beneficiary Name</label>
                <input
                  type="text"
                  required
                  value={recipientName}
                  onChange={e => setRecipientName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#16112C] border border-slate-700 text-sm text-white focus:outline-none focus:border-amber-400"
                  placeholder="e.g. Abebe Bikila"
                />
              </div>

              {/* Account / Phone / Wallet */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Phone / Account / Wallet Address</label>
                <input
                  type="text"
                  required
                  value={recipientAccount}
                  onChange={e => setRecipientAccount(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#16112C] border border-slate-700 text-sm text-white focus:outline-none focus:border-amber-400"
                  placeholder="e.g. +251 91 123 4567 or Email"
                />
              </div>

              <div className="text-[11px] text-slate-400 flex items-center space-x-1.5 pt-1">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Processed securely via Axumite Financial Clearinghouse within 24 hours.</span>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#8E6D28] via-[#E1C47D] to-[#C5A059] text-black font-black text-sm uppercase tracking-wider shadow-lg hover:brightness-110 active:scale-95 cursor-pointer"
              >
                Confirm & Request ${unpaidBalance.toFixed(2)} Payout
              </button>
            </form>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. PAYOUT STATUS & HISTORY MODAL                                          */}
      {/* ========================================================================= */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0F0C1E] border border-[#8E6D28]/60 rounded-3xl p-5 sm:p-6 shadow-2xl text-white space-y-5 animate-in fade-in zoom-in-95 max-h-[85vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-[#E1C47D]" />
                <h3 className="text-lg font-black text-white">
                  {isTigrinya ? 'ታሪኽ ክፍሊትን ኩነታትን' : 'Payout Status & History'}
                </h3>
              </div>
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#181329] text-slate-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Active Payout Request Tracker */}
            {payoutRequested && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-[#17122B] via-[#24173D] to-[#17122B] border border-amber-500/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-200 uppercase font-mono">Current Request</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold font-mono">
                    IN REVIEW
                  </span>
                </div>
                <div className="text-2xl font-black text-[#F3E5AB]">
                  ${unpaidBalance.toFixed(2)} USD
                </div>
                <div className="text-xs text-slate-300">
                  Beneficiary: <span className="text-white font-semibold">{recipientName}</span> ({recipientAccount})
                </div>
                <div className="flex items-center space-x-2 text-[11px] text-slate-400 font-mono">
                  <span>Ref: AXM-PAY-884920</span>
                  <span>•</span>
                  <span>Telebirr / Mobile Money</span>
                </div>
              </div>
            )}

            {/* Historical Ledger List */}
            <div className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">Past Transactions</div>
              {payoutHistory.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs">No past payouts yet.</div>
              ) : (
                payoutHistory.map(rec => (
                  <div key={rec.id} className="p-3 rounded-xl bg-[#141026] border border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-white">${rec.amount.toFixed(2)} {rec.currency}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{rec.timestamp} • {rec.referenceCode}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold font-mono">
                      {rec.status.toUpperCase()}
                    </span>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => setIsHistoryModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-[#1C1733] hover:bg-[#282147] border border-slate-700 text-slate-200 text-xs font-bold cursor-pointer"
            >
              Close
            </button>

          </div>
        </div>
      )}

    </>
  );
};
