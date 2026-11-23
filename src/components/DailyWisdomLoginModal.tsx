import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Quote, X, Sparkles, Volume2, VolumeX, RefreshCw, Bookmark, Check,
  Copy, Share2, Flame, Award, ChevronRight, BookOpen, Crown, ExternalLink, Download
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { 
  AxumiteWisdomQuote, 
  AXUMITE_MANUSCRIPT_QUOTES, 
  getDailyWisdomQuote, 
  getRandomAxumiteQuote 
} from '../data/axumiteManuscriptQuotes';
import { 
  DailyWisdomState, 
  getDailyWisdomStats, 
  recordDailyLoginWisdom, 
  saveDailyWisdomStats 
} from '../services/dailyWisdomService';
import { SavedItem, UserProfile } from '../types';
import { playGoldenNotificationChime } from '../services/notificationService';

interface DailyWisdomLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: UserProfile;
  initialQuote?: AxumiteWisdomQuote;
  onSaveInsight?: (item: Omit<SavedItem, 'id' | 'createdAt'>) => void;
  onNavigateToTab?: (tab: any) => void;
}

export const DailyWisdomLoginModal: React.FC<DailyWisdomLoginModalProps> = ({
  isOpen,
  onClose,
  user,
  initialQuote,
  onSaveInsight,
  onNavigateToTab,
}) => {
  const { language } = useLanguage();
  const isTigrinya = language === 'ti' || language === 'ti_tg';

  const [quote, setQuote] = useState<AxumiteWisdomQuote>(() => initialQuote || getDailyWisdomQuote());
  const [stats, setStats] = useState<DailyWisdomState>(() => getDailyWisdomStats());
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const [bonusEarned, setBonusEarned] = useState<{ points: number; tokens: number } | null>(null);
  const [dontShowToday, setDontShowToday] = useState(false);
  const [isShuffling, setIsShuffling] = useState(false);
  const [speechNotice, setSpeechNotice] = useState<string | null>(null);

  // Sync initial quote if provided
  useEffect(() => {
    if (initialQuote) {
      setQuote(initialQuote);
    }
  }, [initialQuote]);

  // When modal opens, record daily login wisdom & award streak points
  useEffect(() => {
    if (isOpen) {
      const result = recordDailyLoginWisdom(user?.id);
      setStats(result.state);
      if (result.bonusPoints > 0 || result.bonusTokens > 0) {
        setBonusEarned({
          points: result.bonusPoints,
          tokens: result.bonusTokens,
        });
      }
      playGoldenNotificationChime();
    } else {
      // Clean up speech synthesis
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        setIsPlayingAudio(false);
      }
    }
  }, [isOpen, user?.id]);

  const handleNextQuote = () => {
    setIsShuffling(true);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
    }
    setTimeout(() => {
      const next = getRandomAxumiteQuote(quote.id);
      setQuote(next);
      setIsShuffling(false);
      setIsSaved(false);
      setShowContext(false);
    }, 180);
  };

  const handleToggleAudio = () => {
    setSpeechNotice(null);
    if (!('speechSynthesis' in window)) {
      setSpeechNotice(isTigrinya ? 'ናይ ድምጺ ንባብ ኣብዚ ብሮውዘር ኣይድገፍን እዩ።' : 'Audio speech not supported on this browser.');
      return;
    }

    if (isPlayingAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
      return;
    }

    window.speechSynthesis.cancel();
    const textToSpeak = isTigrinya
      ? `${quote.tigrinya}. ምንጪ፡ ${quote.source}`
      : `${quote.english}. From: ${quote.sourceEn}`;

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.rate = 0.88;
    utterance.pitch = 1.0;

    utterance.onend = () => setIsPlayingAudio(false);
    utterance.onerror = () => setIsPlayingAudio(false);

    setIsPlayingAudio(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleCopy = async () => {
    const text = `📜 ${isTigrinya ? 'ዕለታዊ ጥበብ ኣክሱም' : 'Axumite Daily Wisdom'}\n\n` +
      `« ${quote.geez} »\n\n` +
      `ትግርኛ: ${quote.tigrinya}\n` +
      `English: "${quote.english}"\n\n` +
      `🏛️ ${quote.sourceEn} (${quote.centuryEn})\n` +
      `AXUMITE AI • https://axumite.ai`;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch (e) {
      console.warn('Copy failed', e);
    }
  };

  const handleSaveInsight = () => {
    if (onSaveInsight) {
      onSaveInsight({
        title: isTigrinya ? `ዕለታዊ ጥበብ፡ ${quote.theme}` : `Daily Wisdom: ${quote.themeEn}`,
        content: `« ${quote.geez} »\n\n${quote.tigrinya}\n\n"${quote.english}"\n\n🏛️ ${quote.sourceEn} (${quote.centuryEn})`,
        category: 'Manuscript Wisdom',
      });
      setIsSaved(true);
    } else {
      setIsSaved(true);
    }
  };

  const handleDismiss = () => {
    if (dontShowToday) {
      const current = getDailyWisdomStats();
      current.hasSeenToday = true;
      saveDailyWisdomStats(current);
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
          className="relative w-full max-w-xl bg-gradient-to-b from-[#14121E] via-[#0E0C18] to-[#08070F] border border-[#8E6D28]/60 rounded-3xl shadow-2xl shadow-amber-950/40 text-slate-100 overflow-hidden my-auto"
        >
          {/* Top Golden Radial Glow */}
          <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-amber-500/20 via-amber-600/5 to-transparent pointer-events-none" />
          
          {/* Subtle Axumite Stela Silhouette pattern */}
          <div className="absolute -right-12 -top-12 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          
          {/* Header Bar */}
          <div className="relative z-10 px-5 pt-5 pb-3 flex items-center justify-between border-b border-amber-900/30">
            <div className="flex items-center space-x-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#F5D880] via-[#C5A059] to-[#8E6D28] p-0.5 shadow-md shadow-amber-950/50">
                <div className="w-full h-full bg-[#181326] rounded-[10px] flex items-center justify-center text-amber-300 font-serif font-black">
                  <Crown className="w-5 h-5 text-amber-400" />
                </div>
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <h2 className="text-base sm:text-lg font-black tracking-tight text-amber-200 font-serif">
                    {isTigrinya ? 'ዕለታዊ ጥበብ ኣክሱም' : 'Axumite Daily Wisdom'}
                  </h2>
                  <span className="px-1.5 py-0.2 text-[9px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-md font-mono">
                    DAILY
                  </span>
                </div>
                <p className="text-[11px] text-amber-300/70 font-medium">
                  {isTigrinya ? 'ናይ ታሪኽን ፍልስፍናን መዘከርታ ንመዓልታዊ ንቕሓት' : 'Ancient proverbs & epigraphy to empower your day'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDismiss}
              className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer border border-white/10"
              aria-label="Close Daily Wisdom"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Daily Streak & Active Reward Banner */}
          <div className="relative z-10 mx-5 mt-4 p-3 rounded-2xl bg-gradient-to-r from-[#241A3A] via-[#1E1630] to-[#2E2010] border border-amber-500/30 flex items-center justify-between shadow-inner">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-md shadow-orange-950/50 shrink-0">
                <Flame className="w-5 h-5 animate-pulse text-amber-200" />
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="text-xs font-bold text-amber-200">
                    {isTigrinya ? `${stats.streakDays} መዓልቲ ተኸታታሊ ንቕሓት` : `${stats.streakDays}-Day Active Wisdom Streak`}
                  </span>
                  <span className="text-[10px] text-orange-400 font-mono font-bold bg-orange-950/70 px-1.5 py-0.5 rounded border border-orange-700/40">
                    🔥 ACTIVE
                  </span>
                </div>
                <p className="text-[11px] text-slate-300">
                  {isTigrinya 
                    ? `+${bonusEarned?.points || 125} ናይ ጥበብ ነጥቢ • +${bonusEarned?.tokens || 500} AI ቶከናት ተወሲኹ` 
                    : `+${bonusEarned?.points || 125} Wisdom XP • +${bonusEarned?.tokens || 500} Tokens Credited`}
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <div className="text-[10px] uppercase font-mono text-amber-400/80 font-bold">
                {isTigrinya ? 'ዝተኣከበ' : 'XP Level'}
              </div>
              <div className="text-sm font-black text-amber-300 font-mono">
                {stats.wisdomPoints} XP
              </div>
            </div>
          </div>

          {/* Quote Monument Container */}
          <div className="relative z-10 p-5 space-y-4">
            {speechNotice && (
              <div className="rounded-xl border border-amber-500/40 bg-amber-950/60 px-3 py-2 text-xs text-amber-200 flex items-center justify-between gap-2">
                <span>{speechNotice}</span>
                <button
                  type="button"
                  onClick={() => setSpeechNotice(null)}
                  className="text-amber-300 hover:text-white font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}
            
            <div className="relative p-5 sm:p-6 rounded-2xl bg-gradient-to-b from-[#1E192E]/90 to-[#120F1D]/95 border border-[#C5A059]/40 shadow-xl overflow-hidden group">
              {/* Decorative Corner Stone Runes */}
              <div className="absolute top-2 left-2 text-amber-500/20 font-serif text-xs select-none">❖</div>
              <div className="absolute top-2 right-2 text-amber-500/20 font-serif text-xs select-none">❖</div>
              <div className="absolute bottom-2 left-2 text-amber-500/20 font-serif text-xs select-none">❖</div>
              <div className="absolute bottom-2 right-2 text-amber-500/20 font-serif text-xs select-none">❖</div>

              {/* Theme & Century Badge */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-300 text-xs font-semibold">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>{isTigrinya ? quote.theme : quote.themeEn}</span>
                </span>

                <span className="text-[11px] font-mono text-amber-200/60">
                  {isTigrinya ? quote.century : quote.centuryEn}
                </span>
              </div>

              {/* Ge'ez Calligraphy Display */}
              <div className="my-3 text-center">
                <p 
                  className={`text-lg sm:text-xl md:text-2xl font-serif font-black leading-relaxed tracking-wide transition-opacity duration-200 ${isShuffling ? 'opacity-30' : 'opacity-100'}`}
                  style={{
                    background: 'linear-gradient(180deg, #FFF9D2 0%, #ECC665 45%, #C5A059 80%, #9C7127 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    filter: 'drop-shadow(0 2px 8px rgba(236,198,101,0.25))',
                  }}
                >
                  « {quote.geez} »
                </p>
              </div>

              {/* Modern Tigrinya Translation */}
              <div className="mt-3 pt-3 border-t border-amber-500/20">
                <div className="text-xs font-bold text-amber-400/90 mb-1 flex items-center space-x-1">
                  <span>ትግርኛ</span>
                </div>
                <p className="text-sm sm:text-base text-slate-200 font-medium leading-relaxed">
                  {quote.tigrinya}
                </p>
              </div>

              {/* English Translation */}
              <div className="mt-2.5 pt-2.5 border-t border-slate-700/40">
                <div className="text-[11px] font-semibold text-slate-400 mb-0.5">
                  English
                </div>
                <p className="text-xs sm:text-sm text-slate-300 italic leading-relaxed">
                  "{quote.english}"
                </p>
              </div>

              {/* Source & Epigraphy Provenance */}
              <div className="mt-3 pt-2.5 border-t border-amber-500/20 flex items-center justify-between text-xs text-amber-300/80">
                <div className="flex items-center space-x-1.5 truncate pr-2">
                  <BookOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="font-semibold truncate">
                    {isTigrinya ? quote.source : quote.sourceEn}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setShowContext(!showContext)}
                  className="text-[11px] text-amber-400 hover:text-amber-200 underline font-semibold shrink-0 cursor-pointer"
                >
                  {showContext 
                    ? (isTigrinya ? 'ሕባእ' : 'Hide Context') 
                    : (isTigrinya ? 'ታሪኻዊ መብርሂ' : 'Historical Context')}
                </button>
              </div>

              {/* Expandable Historical Context */}
              <AnimatePresence>
                {showContext && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 pt-3 border-t border-amber-500/30 text-xs text-slate-300 bg-black/30 p-3 rounded-xl"
                  >
                    <p className="leading-relaxed">
                      {isTigrinya ? quote.historicalContextTi : quote.historicalContextEn}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Interactive Action Ribbon */}
            <div className="flex items-center justify-between gap-2 pt-1">
              
              {/* Left Action Group */}
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={handleToggleAudio}
                  className={`p-2.5 rounded-xl border transition-all flex items-center space-x-1.5 text-xs font-bold cursor-pointer ${
                    isPlayingAudio
                      ? 'bg-amber-500 text-black border-amber-300 shadow-md shadow-amber-500/30'
                      : 'bg-white/5 hover:bg-white/10 text-amber-300 border-amber-500/30'
                  }`}
                  title={isTigrinya ? 'ብድምጺ ስማዕ' : 'Listen with Audio'}
                >
                  {isPlayingAudio ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  <span className="hidden sm:inline">
                    {isPlayingAudio ? (isTigrinya ? 'ዓጽው' : 'Stop') : (isTigrinya ? 'ድምጺ' : 'Audio')}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleNextQuote}
                  disabled={isShuffling}
                  className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-amber-300 border border-amber-500/30 transition-all flex items-center space-x-1.5 text-xs font-bold cursor-pointer active:scale-95 disabled:opacity-50"
                  title={isTigrinya ? 'ካልእ ጥበብ ቀይር' : 'Another Quote'}
                >
                  <RefreshCw className={`w-4 h-4 ${isShuffling ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">
                    {isTigrinya ? 'ካልእ ጥበብ' : 'Shuffle'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleCopy}
                  className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-slate-700/50 hover:text-white transition-all flex items-center space-x-1 text-xs font-medium cursor-pointer"
                  title={isTigrinya ? 'ጽሑፍ ቅዳሕ' : 'Copy Quote'}
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span className="hidden sm:inline">
                    {copied ? (isTigrinya ? 'ተቐዲሑ!' : 'Copied!') : (isTigrinya ? 'ቅዳሕ' : 'Copy')}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveInsight}
                  className={`p-2.5 rounded-xl border transition-all flex items-center space-x-1 text-xs font-medium cursor-pointer ${
                    isSaved
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300 border-slate-700/50'
                  }`}
                  title={isTigrinya ? 'ኣብ ማህደር ኣቐምጥ' : 'Save to Vault'}
                >
                  {isSaved ? <Check className="w-4 h-4 text-emerald-400" /> : <Bookmark className="w-4 h-4" />}
                  <span className="hidden sm:inline">
                    {isSaved ? (isTigrinya ? 'ተዓቂቡ' : 'Saved') : (isTigrinya ? 'ዓቅብ' : 'Save')}
                  </span>
                </button>
              </div>

              {/* View all proverbs link */}
              {onNavigateToTab && (
                <button
                  type="button"
                  onClick={() => {
                    handleDismiss();
                    onNavigateToTab('cultural-explorer');
                  }}
                  className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center space-x-1 cursor-pointer"
                >
                  <span>{isTigrinya ? 'ኩሉ ጥበብ ርአ' : 'All Quotes'}</span>
                  <ChevronRight className="w-3.5 h-3.5 stroke-[3]" />
                </button>
              )}
            </div>

          </div>

          {/* Footer Bar: "Don't show again today" & Primary Action */}
          <div className="relative z-10 px-5 py-4 bg-[#0A0912] border-t border-amber-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            
            <label className="flex items-center space-x-2 text-xs text-slate-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={dontShowToday}
                onChange={(e) => setDontShowToday(e.target.checked)}
                className="w-4 h-4 rounded border-amber-600/50 bg-[#161224] text-amber-500 focus:ring-amber-400 accent-amber-500 cursor-pointer"
              />
              <span>
                {isTigrinya ? 'ሎሚ ደጊምካ ኣይተርእየኒ' : "Don't show again today"}
              </span>
            </label>

            <button
              type="button"
              onClick={handleDismiss}
              className="py-2.5 px-6 rounded-2xl bg-gradient-to-r from-[#D7A23A] via-[#ECC665] to-[#C99127] hover:brightness-110 text-slate-950 font-black text-sm shadow-lg shadow-amber-950/50 flex items-center justify-center space-x-2 active:scale-98 transition-all cursor-pointer border border-amber-300/50"
            >
              <span>{isTigrinya ? 'ቀጽል ናብ ኣክሱማይት AI' : 'Start My Day • Continue'}</span>
              <ChevronRight className="w-4 h-4 stroke-[3]" />
            </button>

          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
};
