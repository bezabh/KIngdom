import React, { useState, useEffect } from 'react';
import { 
  Trophy, Crown, Medal, Award, Sparkles, Star, Flame, ThumbsUp, 
  Search, Filter, Globe, BookOpen, Landmark, Languages, MessageSquarePlus, 
  CheckCircle2, Plus, ArrowUpRight, Share2, ShieldCheck, Heart, User,
  ChevronRight, X, Info, Zap, BookMarked
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { AppTab, UserProfile } from '../types';
import { playGoldenNotificationChime } from '../services/notificationService';

export interface WisdomContributor {
  id: string;
  rank: number;
  name: string;
  nameTi: string;
  handle: string;
  location: string;
  countryCode: string;
  avatarUrl?: string;
  wisdomScore: number; // Knowledge points
  contributionsCount: number; // e.g. 48 verified entries
  helpfulVotes: number;
  streakDays: number;
  badgeTitle: string;
  badgeTitleTi: string;
  badgeType: 'grand-sage' | 'master-lexicographer' | 'cultural-custodian' | 'socratic-sage' | 'knowledge-pioneer';
  specialization: string;
  specializationTi: string;
  recentContribution: string;
  recentContributionTi: string;
  isCurrentUser?: boolean;
}

interface CommunityWisdomLeaderboardProps {
  user?: UserProfile;
  onEarnWisdomBonus?: (amount: number, reason: string) => void;
  onNavigateTab?: (tab: AppTab) => void;
}

const STORAGE_KEY_WISDOM_BOARD = 'axumite_community_wisdom_leaderboard_v1';
const STORAGE_KEY_USER_CONTRIBUTIONS = 'axumite_user_wisdom_contributions_v1';

const INITIAL_CONTRIBUTORS: WisdomContributor[] = [
  {
    id: 'contrib-1',
    rank: 1,
    name: 'Dr. Yared Tesfamariam',
    nameTi: 'ዶ/ር ያሬድ ተስፋማርያም',
    handle: '@yared_geez_lexicon',
    location: 'Asmara, Eritrea',
    countryCode: 'ER',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    wisdomScore: 14850,
    contributionsCount: 182,
    helpfulVotes: 940,
    streakDays: 45,
    badgeTitle: 'Grand Scholar of Ge\'ez',
    badgeTitleTi: 'ሊቀ ምሁር ግዕዝን ትግርኛን',
    badgeType: 'grand-sage',
    specialization: 'Classical Ge\'ez & Ancient Manuscripts',
    specializationTi: 'ጥንታዊ ቅዱስ ጽሑፋት ግዕዝን ስነ-ቓላትን',
    recentContribution: 'Verified 64 ancient Aksumite liturgical terms & root verb conjugations.',
    recentContributionTi: '64 ጥንታዎት ናይ ግዕዝ ግስታትን ሱር-ቃላትን ኣረዲኡ።',
  },
  {
    id: 'contrib-2',
    rank: 2,
    name: 'Saba Kidane-Maryam',
    nameTi: 'ሳባ ኪዳነማርያም',
    handle: '@saba_culture_archivist',
    location: 'Mekelle, Tigray',
    countryCode: 'ET',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    wisdomScore: 12400,
    contributionsCount: 146,
    helpfulVotes: 812,
    streakDays: 38,
    badgeTitle: 'Master Cultural Custodian',
    badgeTitleTi: 'ሓላዊት ባህላውን ታሪኻውን ቅርሲ',
    badgeType: 'cultural-custodian',
    specialization: 'Monuments of Yeha, Debre Damo & Metera',
    specializationTi: 'ታሪኽ ይሓ፡ ደብረ ዳሞ፡ መተራን ጥንታዊ ስልጣነን',
    recentContribution: 'Mapped 18 archaeological architectural patterns for Axumite Obelisk preservation.',
    recentContributionTi: 'ናይ ሓወልቲ ኣክሱም ስነ-ህንጻዊ ቅርጺ ብስእልን መግለጽን ኣስፊራ።',
  },
  {
    id: 'contrib-3',
    rank: 3,
    name: 'Filmon Ghebrehiwet',
    nameTi: 'ፍልሞን ገብረሂወት',
    handle: '@filmon_fidel_tech',
    location: 'London, UK',
    countryCode: 'GB',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    wisdomScore: 10920,
    contributionsCount: 118,
    helpfulVotes: 685,
    streakDays: 29,
    badgeTitle: 'Master Lexicographer',
    badgeTitleTi: 'ዋዕሮ ስነ-ቓላትን ትርጉምን',
    badgeType: 'master-lexicographer',
    specialization: 'Modern Technical & Computing Tigrinya Vocabulary',
    specializationTi: 'ናይ ኮምፒተርን ቴክኖሎጂን ትግርኛ መዝገበ-ቃላት',
    recentContribution: 'Standardized 95 AI and Neural Computing terms into authentic Tigrinya.',
    recentContributionTi: '95 ናይ AIን ኮምፒተርን ስነ-ቓላት ብትግርኛ ኣዋሃሂዱ።',
  },
  {
    id: 'contrib-4',
    rank: 4,
    name: 'Helen Berhe',
    nameTi: 'ሄለን በርሀ',
    handle: '@helen_proverbs',
    location: 'Frankfurt, Germany',
    countryCode: 'DE',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    wisdomScore: 8750,
    contributionsCount: 94,
    helpfulVotes: 520,
    streakDays: 22,
    badgeTitle: 'Socratic Sage & Mentor',
    badgeTitleTi: 'መምህር ሶክራታዊ ፍልስፍናን ምሳሌን',
    badgeType: 'socratic-sage',
    specialization: 'Tigrinya Proverbs & Philosophical Wisdom',
    specializationTi: 'ምስላታትን ጥበብ ቀዳሞትን ትንታነታትን',
    recentContribution: 'Documented 40 philosophical Tigrinya proverbs with English allegorical parallels.',
    recentContributionTi: '40 ባህላውያን ምስላታት ብዕምቆት ትርጉሞም ኣስፊራ።',
  },
  {
    id: 'contrib-5',
    rank: 5,
    name: 'Habteab Woldu',
    nameTi: 'ሃብተኣብ ወልዱ',
    handle: '@habteab_calligraphy',
    location: 'Washington D.C., USA',
    countryCode: 'US',
    avatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
    wisdomScore: 7600,
    contributionsCount: 82,
    helpfulVotes: 430,
    streakDays: 17,
    badgeTitle: 'Harag Calligraphy Master',
    badgeTitleTi: 'ኪነ-ጽሕፈት ቅዱስ ሓረግ',
    badgeType: 'knowledge-pioneer',
    specialization: 'Harag Illumination & Ethiopic Script Vectorization',
    specializationTi: 'ስነ-ጥበብ ሓረግን ቅዱስ ስእልታትን',
    recentContribution: 'Contributed 14 high-precision vector flourishes for Ge\'ez Fidel typography.',
    recentContributionTi: '14 ናይ ሓረግ ስነ-ጽሕፈት ሞዴላት ንስቱድዮ ኣበርኪቱ።',
  },
  {
    id: 'contrib-6',
    rank: 6,
    name: 'Rahel Zerom',
    nameTi: 'ራሄል ዘርኦም',
    handle: '@rahel_stockholm',
    location: 'Stockholm, Sweden',
    countryCode: 'SE',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    wisdomScore: 6150,
    contributionsCount: 65,
    helpfulVotes: 365,
    streakDays: 14,
    badgeTitle: 'Knowledge Pioneer',
    badgeTitleTi: 'ፈላሚት ናይ ፍልጠት ማሕበረሰብ',
    badgeType: 'knowledge-pioneer',
    specialization: 'Diaspora Language Teaching & Socratic Q&A',
    specializationTi: 'ናይ ዲያስፖራ ቋንቋ ምምሃርን ሕቶታትን',
    recentContribution: 'Created interactive conversational drills for Tigrinya diaspora learners.',
    recentContributionTi: 'ንጀመርቲ ዲያስፖራ ዘገልግሉ ናይ ዕላል ትምህርትታት ኣበርኪታ።',
  },
  {
    id: 'contrib-7',
    rank: 7,
    name: 'Aron Meles',
    nameTi: 'ኣሮን መለስ',
    handle: '@aron_addis_nlp',
    location: 'Addis Ababa, Ethiopia',
    countryCode: 'ET',
    avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
    wisdomScore: 5400,
    contributionsCount: 58,
    helpfulVotes: 290,
    streakDays: 11,
    badgeTitle: 'Knowledge Pioneer',
    badgeTitleTi: 'ተመራማሪ ቋንቋን AIን',
    badgeType: 'knowledge-pioneer',
    specialization: 'Tigrinya Semantic Grammar Rules',
    specializationTi: 'ስዋሰው ትግርኛን ስነ-ፍልጠት ምዕባለን',
    recentContribution: 'Refined 120 grammatical syntax rules for AI conversational parsing.',
    recentContributionTi: '120 ናይ ሰዋስው ሕግታት ን AI ትርጉም ኣመሓይሹ።',
  },
];

export const CommunityWisdomLeaderboard: React.FC<CommunityWisdomLeaderboardProps> = ({
  user,
  onEarnWisdomBonus,
  onNavigateTab,
}) => {
  const { language } = useLanguage();
  const isTigrinya = language === 'ti' || language === 'ti_tg';

  const [contributors, setContributors] = useState<WisdomContributor[]>(INITIAL_CONTRIBUTORS);
  const [timeframe, setTimeframe] = useState<'all-time' | 'month' | 'week'>('all-time');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [cheeredIds, setCheeredIds] = useState<Record<string, boolean>>({});
  
  // User contribution modal state
  const [isContributeModalOpen, setIsContributeModalOpen] = useState(false);
  const [contributionCategory, setContributionCategory] = useState<'proverb' | 'lexicon' | 'monument' | 'grammar'>('proverb');
  const [contributionTitle, setContributionTitle] = useState('');
  const [contributionContent, setContributionContent] = useState('');
  const [contributionSource, setContributionSource] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userWisdomScore, setUserWisdomScore] = useState(1450);
  const [userContributionsCount, setUserContributionsCount] = useState(12);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load persistence
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_WISDOM_BOARD);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setContributors(parsed);
        }
      }

      const savedUserContribs = localStorage.getItem(STORAGE_KEY_USER_CONTRIBUTIONS);
      if (savedUserContribs) {
        const parsedUser = JSON.parse(savedUserContribs);
        if (parsedUser.score) setUserWisdomScore(parsedUser.score);
        if (parsedUser.count) setUserContributionsCount(parsedUser.count);
      }
    } catch (e) {
      console.warn('Failed to load wisdom leaderboard data', e);
    }
  }, []);

  const persistContributors = (updated: WisdomContributor[]) => {
    setContributors(updated);
    try {
      localStorage.setItem(STORAGE_KEY_WISDOM_BOARD, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to persist contributors', e);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Handle cheer / upvote contributor
  const handleCheerContributor = (id: string, name: string) => {
    playGoldenNotificationChime();
    setCheeredIds(prev => ({ ...prev, [id]: true }));

    const updated = contributors.map(c => {
      if (c.id === id) {
        return {
          ...c,
          helpfulVotes: c.helpfulVotes + 1,
          wisdomScore: c.wisdomScore + 10,
        };
      }
      return c;
    });

    persistContributors(updated);
    showToast(isTigrinya ? `ን${name} ሞራልን ነጥብን ሂብካዮ!` : `Cheered ${name}! +10 Wisdom Points awarded.`);
  };

  // Submit User Wisdom Contribution
  const handleSubmitContribution = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contributionTitle.trim() || !contributionContent.trim()) return;

    setIsSubmitting(true);
    playGoldenNotificationChime();

    setTimeout(() => {
      const newScore = userWisdomScore + 50;
      const newCount = userContributionsCount + 1;
      setUserWisdomScore(newScore);
      setUserContributionsCount(newCount);

      // Save user state
      try {
        localStorage.setItem(STORAGE_KEY_USER_CONTRIBUTIONS, JSON.stringify({
          score: newScore,
          count: newCount,
        }));
      } catch {}

      // If callback to rewards system is provided, award extra monetary/task bonus
      if (onEarnWisdomBonus) {
        onEarnWisdomBonus(0.10, isTigrinya ? 'ናይ ፍልጠት ኣበርክቶ ቦነስ' : 'Community Wisdom Contribution Bonus');
      }

      setIsSubmitting(false);
      setIsContributeModalOpen(false);
      setContributionTitle('');
      setContributionContent('');
      setContributionSource('');
      showToast(isTigrinya ? 'ናይ ፍልጠት ኣበርክቶኻ ተቐቢልናዮ! +50 ነጥቢ ረኺብካ' : 'Knowledge contribution submitted! +50 Wisdom Points & +$0.10 awarded.');
    }, 600);
  };

  // Filter contributors
  const filteredContributors = contributors.filter(c => {
    const matchesSearch = 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.nameTi.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.handle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.specialization.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.location.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (categoryFilter === 'geez') {
      return c.specialization.toLowerCase().includes('ge\'ez') || c.specialization.toLowerCase().includes('manuscript');
    }
    if (categoryFilter === 'culture') {
      return c.specialization.toLowerCase().includes('monument') || c.specialization.toLowerCase().includes('proverb') || c.specialization.toLowerCase().includes('calligraphy');
    }
    if (categoryFilter === 'lexicon') {
      return c.specialization.toLowerCase().includes('vocabulary') || c.specialization.toLowerCase().includes('lexicon') || c.specialization.toLowerCase().includes('grammar');
    }

    return true;
  });

  const top3 = filteredContributors.slice(0, 3);
  const remaining = filteredContributors.slice(3);

  const getBadgeIcon = (type: string) => {
    switch (type) {
      case 'grand-sage':
        return <Crown className="w-3.5 h-3.5 text-amber-400" />;
      case 'cultural-custodian':
        return <Landmark className="w-3.5 h-3.5 text-emerald-400" />;
      case 'master-lexicographer':
        return <Languages className="w-3.5 h-3.5 text-cyan-400" />;
      case 'socratic-sage':
        return <BookOpen className="w-3.5 h-3.5 text-purple-400" />;
      default:
        return <Star className="w-3.5 h-3.5 text-amber-400" />;
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-bounce">
          <div className="px-4 py-2 rounded-2xl bg-slate-900 border border-amber-400 text-[#F3E5AB] font-bold text-xs shadow-2xl flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div 
        className="rounded-3xl p-5 bg-gradient-to-b from-[#1E163B] via-[#140F28] to-[#0D091B] border border-[#3E2B6B]/60 relative overflow-hidden shadow-2xl"
        style={{
          boxShadow: '0 0 35px rgba(90, 45, 140, 0.2), inset 0 1px 1px rgba(255, 255, 255, 0.1)'
        }}
      >
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex items-start justify-between gap-3">
          <div className="space-y-1.5 flex-1">
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-300 text-[10px] font-bold uppercase tracking-wider font-mono">
              <Trophy className="w-3 h-3 text-amber-400" />
              <span>{isTigrinya ? 'ዓለማዊ ናይ ፍልጠት መሪሕነት' : 'Global Knowledge Base'}</span>
            </div>
            
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center space-x-2">
              <span>{isTigrinya ? 'ናይ ማሕበረሰብ ጥበብ መሪሕነት' : 'Community Wisdom Leaderboard'}</span>
            </h2>

            <p className="text-xs text-slate-300 leading-relaxed max-w-md">
              {isTigrinya
                ? 'ንትግርኛ፡ ግዕዝ፡ ባህላዊ ቅርሲታትን ሶክራታዊ ትምህርትን ብምምሕያሽ ንዝተሳተፉ ምሁራትን ኣበርከትትን ዝወሃብ ወግዓዊ ክብሪ።'
                : 'Recognizing global scholars, linguists, and community guardians enriching the Tigrinya, Ge\'ez, and cultural repository.'}
            </p>
          </div>

          <button
            onClick={() => setIsContributeModalOpen(true)}
            className="px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:brightness-110 active:scale-95 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/25 flex items-center space-x-1.5 shrink-0 cursor-pointer transition-all"
          >
            <Plus className="w-4 h-4 text-slate-950" />
            <span>{isTigrinya ? 'ፍልጠት ኣበርክት' : 'Contribute'}</span>
          </button>
        </div>

        {/* Current User Quick Standing Bar */}
        <div className="mt-4 pt-3.5 border-t border-white/10 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-purple-600 flex items-center justify-center font-black text-white text-xs border border-white/20">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <div className="font-bold text-white flex items-center space-x-1.5">
                <span>{user?.name || (isTigrinya ? 'ስኻ (Your Standing)' : 'You (Current Standing)')}</span>
                <span className="text-[10px] px-1.5 py-0.2 bg-amber-400/20 text-amber-300 rounded font-mono font-bold">#14</span>
              </div>
              <div className="text-[10.5px] text-slate-400">
                {userWisdomScore.toLocaleString()} {isTigrinya ? 'ነጥቢ ጥበብ' : 'Wisdom Pts'} • {userContributionsCount} {isTigrinya ? 'ኣበርክቶታት' : 'Contributions'}
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsContributeModalOpen(true)}
            className="text-[11px] font-bold text-amber-300 hover:text-amber-200 flex items-center space-x-1 cursor-pointer"
          >
            <span>{isTigrinya ? '+50 ነጥቢ ረከብ' : 'Earn +50 Pts'}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="space-y-2.5">
        
        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={isTigrinya ? 'ብሽም፡ ብሃገር ወይ ብዓውዲ ድለ...' : 'Search by name, country, or specialty...'}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[#120E22] border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/80 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 text-[11px] font-semibold no-scrollbar">
          <div className="flex items-center space-x-1.5 shrink-0">
            {[
              { id: 'all', labelEn: 'All Domains', labelTi: 'ኩሉ ዓውዲ' },
              { id: 'geez', labelEn: 'Ge\'ez & Manuscripts', labelTi: 'ግዕዝን ቅዱስ ጽሑፋትን' },
              { id: 'culture', labelEn: 'Monuments & Heritage', labelTi: 'ቅርሲታትን ታሪኽን' },
              { id: 'lexicon', labelEn: 'Lexicon & Grammar', labelTi: 'መዝገበ-ቃላትን ሰዋስውን' },
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                  categoryFilter === cat.id
                    ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
                    : 'bg-[#151028] text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {isTigrinya ? cat.labelTi : cat.labelEn}
              </button>
            ))}
          </div>

          {/* Timeframe selector */}
          <div className="flex items-center bg-[#151028] p-0.5 rounded-xl border border-slate-800 shrink-0">
            <button
              onClick={() => setTimeframe('all-time')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                timeframe === 'all-time' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              {isTigrinya ? 'ኩሉ ግዜ' : 'All-Time'}
            </button>
            <button
              onClick={() => setTimeframe('month')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                timeframe === 'month' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              {isTigrinya ? 'ወርሒ' : 'Month'}
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TOP 3 PODIUM DISPLAY                                                      */}
      {/* ========================================================================= */}
      {top3.length >= 3 && !searchQuery && categoryFilter === 'all' && (
        <div className="pt-4 pb-2">
          <div className="grid grid-cols-3 gap-2.5 sm:gap-4 items-end max-w-md mx-auto">
            
            {/* Rank 2 (Silver) */}
            <div className="order-1 flex flex-col items-center">
              <div className="relative mb-2">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full p-0.5 bg-gradient-to-tr from-slate-300 via-slate-100 to-slate-400 shadow-md">
                  <img
                    src={top3[1].avatarUrl}
                    alt={top3[1].name}
                    className="w-full h-full rounded-full object-cover"
                  />
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-slate-200 text-slate-900 font-black text-[10px] flex items-center justify-center border border-white shadow">
                  2
                </div>
              </div>
              <div className="w-full rounded-2xl p-2.5 bg-[#120E24] border border-slate-700/80 text-center space-y-1 shadow-lg">
                <div className="font-bold text-xs text-white truncate">{isTigrinya ? top3[1].nameTi : top3[1].name}</div>
                <div className="text-[10px] text-amber-300 font-mono font-bold">{top3[1].wisdomScore.toLocaleString()} pts</div>
                <button
                  onClick={() => handleCheerContributor(top3[1].id, top3[1].name)}
                  className="w-full py-1 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] font-bold text-slate-300 flex items-center justify-center space-x-1 transition-all active:scale-95"
                >
                  <ThumbsUp className={`w-2.5 h-2.5 ${cheeredIds[top3[1].id] ? 'text-amber-400 fill-amber-400' : ''}`} />
                  <span>{top3[1].helpfulVotes}</span>
                </button>
              </div>
            </div>

            {/* Rank 1 (Gold Champion) */}
            <div className="order-2 flex flex-col items-center -mt-3">
              <div className="relative mb-2">
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-amber-400 animate-bounce">
                  <Crown className="w-5 h-5 drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
                </div>
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full p-1 bg-gradient-to-tr from-amber-400 via-amber-200 to-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.4)] ring-2 ring-amber-300/40">
                  <img
                    src={top3[0].avatarUrl}
                    alt={top3[0].name}
                    className="w-full h-full rounded-full object-cover"
                  />
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black text-xs flex items-center justify-center border-2 border-slate-900 shadow">
                  1
                </div>
              </div>
              <div className="w-full rounded-2xl p-3 bg-gradient-to-b from-[#231A45] to-[#140F2A] border border-amber-400/60 text-center space-y-1 shadow-xl">
                <div className="font-black text-xs sm:text-sm text-amber-200 truncate">{isTigrinya ? top3[0].nameTi : top3[0].name}</div>
                <div className="text-[11px] text-amber-400 font-mono font-black">{top3[0].wisdomScore.toLocaleString()} pts</div>
                <button
                  onClick={() => handleCheerContributor(top3[0].id, top3[0].name)}
                  className="w-full py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-[10px] font-black flex items-center justify-center space-x-1 transition-all active:scale-95 shadow-xs"
                >
                  <Sparkles className="w-3 h-3 text-slate-950" />
                  <span>{top3[0].helpfulVotes} {isTigrinya ? 'ሞራል' : 'Cheers'}</span>
                </button>
              </div>
            </div>

            {/* Rank 3 (Bronze) */}
            <div className="order-3 flex flex-col items-center">
              <div className="relative mb-2">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full p-0.5 bg-gradient-to-tr from-amber-700 via-amber-600 to-amber-800 shadow-md">
                  <img
                    src={top3[2].avatarUrl}
                    alt={top3[2].name}
                    className="w-full h-full rounded-full object-cover"
                  />
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-700 text-white font-black text-[10px] flex items-center justify-center border border-white shadow">
                  3
                </div>
              </div>
              <div className="w-full rounded-2xl p-2.5 bg-[#120E24] border border-slate-700/80 text-center space-y-1 shadow-lg">
                <div className="font-bold text-xs text-white truncate">{isTigrinya ? top3[2].nameTi : top3[2].name}</div>
                <div className="text-[10px] text-amber-300 font-mono font-bold">{top3[2].wisdomScore.toLocaleString()} pts</div>
                <button
                  onClick={() => handleCheerContributor(top3[2].id, top3[2].name)}
                  className="w-full py-1 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] font-bold text-slate-300 flex items-center justify-center space-x-1 transition-all active:scale-95"
                >
                  <ThumbsUp className={`w-2.5 h-2.5 ${cheeredIds[top3[2].id] ? 'text-amber-400 fill-amber-400' : ''}`} />
                  <span>{top3[2].helpfulVotes}</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DETAILED RANKING LIST                                                     */}
      {/* ========================================================================= */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider font-mono px-1">
          <span>{isTigrinya ? `ደረጃታት (${filteredContributors.length} ምሁራት)` : `Rankings (${filteredContributors.length} Contributors)`}</span>
          <span>{isTigrinya ? 'ነጥቢ ጥበብ' : 'Wisdom Score'}</span>
        </div>

        <div className="space-y-2">
          {filteredContributors.map((c) => (
            <div
              key={c.id}
              className={`p-3.5 rounded-2xl border transition-all flex items-start justify-between gap-3 group ${
                c.rank === 1
                  ? 'bg-gradient-to-r from-[#1E1738] via-[#16112C] to-[#120D22] border-amber-500/40 shadow-md'
                  : 'bg-[#120E22] hover:bg-[#18132E] border-slate-800/80 hover:border-purple-500/40'
              }`}
            >
              <div className="flex items-start space-x-3 min-w-0">
                {/* Rank Number */}
                <div className="w-7 h-7 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center font-black text-xs text-slate-300 shrink-0 mt-0.5">
                  {c.rank === 1 ? <Crown className="w-3.5 h-3.5 text-amber-400" /> : `#${c.rank}`}
                </div>

                {/* Avatar */}
                <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10 shrink-0">
                  <img
                    src={c.avatarUrl}
                    alt={c.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Metadata & Specialization */}
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center space-x-1.5 flex-wrap">
                    <span className="font-bold text-xs sm:text-sm text-white group-hover:text-amber-300 transition-colors">
                      {isTigrinya ? c.nameTi : c.name}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">{c.handle}</span>
                  </div>

                  <div className="flex items-center space-x-1.5 text-[10.5px]">
                    <span className="inline-flex items-center space-x-1 text-amber-300/90 font-medium">
                      {getBadgeIcon(c.badgeType)}
                      <span>{isTigrinya ? c.badgeTitleTi : c.badgeTitle}</span>
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className="text-slate-400">{c.location}</span>
                  </div>

                  <p className="text-[11px] text-slate-300 line-clamp-1 leading-snug pt-0.5">
                    {isTigrinya ? c.recentContributionTi : c.recentContribution}
                  </p>

                  <div className="flex items-center space-x-3 text-[10px] text-slate-400 pt-1 font-mono">
                    <span>{c.contributionsCount} {isTigrinya ? 'ኣበርክቶታት' : 'entries'}</span>
                    <span>•</span>
                    <span className="flex items-center space-x-0.5 text-amber-400/90">
                      <Flame className="w-3 h-3 text-amber-400" />
                      <span>{c.streakDays}d {isTigrinya ? 'ቐጻልነት' : 'streak'}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Side: Score & Upvote Action */}
              <div className="flex flex-col items-end space-y-1.5 shrink-0">
                <div className="text-right">
                  <div className="text-sm font-black text-[#F3E5AB] font-mono">
                    {c.wisdomScore.toLocaleString()}
                  </div>
                  <div className="text-[9px] text-slate-400 uppercase font-mono">
                    {isTigrinya ? 'ነጥቢ' : 'Wisdom Pts'}
                  </div>
                </div>

                <button
                  onClick={() => handleCheerContributor(c.id, c.name)}
                  className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold flex items-center space-x-1 transition-all active:scale-95 cursor-pointer ${
                    cheeredIds[c.id]
                      ? 'bg-amber-400 text-slate-950 font-black'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                  }`}
                  title="Cheer contributor and upvote their wisdom contribution"
                >
                  <ThumbsUp className="w-3 h-3" />
                  <span>{c.helpfulVotes}</span>
                </button>
              </div>

            </div>
          ))}

          {filteredContributors.length === 0 && (
            <div className="text-center py-10 rounded-2xl bg-[#120E22] border border-slate-800 p-4 text-xs text-slate-400 space-y-2">
              <BookOpen className="w-8 h-8 text-slate-600 mx-auto" />
              <div>{isTigrinya ? 'ዝተረኽበ ምሁር ወይ ኣበርካቲ የለን።' : 'No contributors matched your search filter.'}</div>
              <button
                onClick={() => { setSearchQuery(''); setCategoryFilter('all'); }}
                className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg font-bold"
              >
                {isTigrinya ? 'ኩሉ ኣርእይ' : 'Reset Filters'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CONTRIBUTE WISDOM MODAL                                                   */}
      {/* ========================================================================= */}
      {isContributeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#0F0C1E] border border-amber-500/50 rounded-3xl p-5 sm:p-6 shadow-2xl text-white space-y-4 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 flex items-center justify-center font-black">
                  <MessageSquarePlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    {isTigrinya ? 'ናይ ማሕበረሰብ ፍልጠት ኣበርክት' : 'Contribute Community Wisdom'}
                  </h3>
                  <p className="text-[11px] text-amber-300 font-mono">
                    {isTigrinya ? '+50 ነጥቢ ጥበብን $0.10 ዓስብን ተቐበል' : 'Earn +50 Wisdom Points & +$0.10 Reward'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsContributeModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#181329] text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitContribution} className="space-y-3.5">
              {/* Category Selector */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">
                  {isTigrinya ? 'ዓይነት ፍልጠት (Category)' : 'Knowledge Domain'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'proverb', nameEn: 'Tigrinya Proverb / Wisdom', nameTi: 'ምስላ ትግርኛ' },
                    { id: 'lexicon', nameEn: 'Ge\'ez / Tigrinya Term', nameTi: 'ግዕዝ / ትግርኛ ቃል' },
                    { id: 'monument', nameEn: 'Historical Monument / Story', nameTi: 'ታሪኽ ቅርሲ / ሓወልቲ' },
                    { id: 'grammar', nameEn: 'Grammar / Linguistic Rule', nameTi: 'ሰዋስው / ናይ ቋንቋ ሕጊ' },
                  ].map(c => (
                    <button
                      type="button"
                      key={c.id}
                      onClick={() => setContributionCategory(c.id as any)}
                      className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer ${
                        contributionCategory === c.id
                          ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                          : 'bg-[#151028] border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {isTigrinya ? c.nameTi : c.nameEn}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title / Headword */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">
                  {isTigrinya ? 'ርእሲ / ቃል / ምስላ (Title or Phrase)' : 'Title / Headword / Proverb'}
                </label>
                <input
                  type="text"
                  required
                  value={contributionTitle}
                  onChange={e => setContributionTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#16112C] border border-slate-700 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-400 placeholder-slate-500"
                  placeholder={
                    contributionCategory === 'proverb'
                      ? 'e.g. ንፋስ ዝዘርአ ማዕበል ይዓጽድ'
                      : contributionCategory === 'lexicon'
                      ? 'e.g. ግእዝ፡ ሱር-ቃል፡ ኣዕማድ'
                      : 'e.g. Yeha Temple Architecture'
                  }
                />
              </div>

              {/* Detailed Description */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">
                  {isTigrinya ? 'መግለጺ፡ ትርጉምን ምኽንያትን (Explanation & Etymology)' : 'Explanation, Meaning & Etymology'}
                </label>
                <textarea
                  required
                  rows={3}
                  value={contributionContent}
                  onChange={e => setContributionContent(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#16112C] border border-slate-700 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-400 placeholder-slate-500"
                  placeholder={isTigrinya ? 'ናይቲ ቃል ወይ ምስላ ትርጉምን ኣጠቓቕማን ብዝርዝር ግለጽ...' : 'Provide complete historical context, literal translation, or grammatical nuance...'}
                />
              </div>

              {/* Source Reference */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">
                  {isTigrinya ? 'መወከሲ / ምንጪ (Source or Reference - Optional)' : 'Reference / Book / Elder Source (Optional)'}
                </label>
                <input
                  type="text"
                  value={contributionSource}
                  onChange={e => setContributionSource(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#16112C] border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400 placeholder-slate-500"
                  placeholder="e.g. Traditional oral folklore or Geez Grammar (መጽሓፈ ሰዋስው)"
                />
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200 flex items-start space-x-2">
                <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  {isTigrinya
                    ? 'ኩሉ ኣበርክቶታት ብAIን ብማሕበረሰብ ምሁራትን ይረጋገጽ። ዝተረጋገጸ ኣበርክቶ ኣብ መዝገበ-ፍልጠት ኣክሱማይት AI ይስፈር።'
                    : 'Contributions are cross-verified by linguistic neural models and community curators to update the permanent Ge\'ez and Tigrinya repository.'}
                </span>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-slate-950 font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg hover:brightness-110 active:scale-95 cursor-pointer disabled:opacity-50 transition-all flex items-center justify-center space-x-2"
              >
                <Sparkles className="w-4 h-4 text-slate-950" />
                <span>{isSubmitting ? (isTigrinya ? 'ይጸዓን ኣሎ...' : 'Submitting...') : (isTigrinya ? 'ኣበርክቶ ኣረጋግጽ (+50 ነጥቢ)' : 'Submit Contribution (+50 Pts)')}</span>
              </button>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
