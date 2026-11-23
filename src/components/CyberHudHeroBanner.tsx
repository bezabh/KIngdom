import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Pause, Play } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface GreetingPhrase {
  headlineTi: string;
  subtitleTi: string;
  headlineEn: string;
  subtitleEn: string;
}

const GREETING_PHRASES: GreetingPhrase[] = [
  {
    headlineTi: 'ሰላም፡ እንቋዕ ብደሓን መጻእኹም',
    subtitleTi: 'ኣክሱማይት AI — ልዑላዊት ስርዓተ-ኢንተለጀንስ',
    headlineEn: 'Welcome to Axumite AI',
    subtitleEn: 'Sovereign Tigrinya & Multilingual Intelligence',
  },
  {
    headlineTi: 'ብሩኽ መዓልቲ ይግበረልኩም',
    subtitleTi: 'ኦበሊስክ AI — ጥበብ ኣክሱምን ዘመናዊ ቴክኖሎጂን',
    headlineEn: 'Ancient Wisdom, Modern Speed',
    subtitleEn: 'Real-Time Translation, Voice & Knowledge Studio',
  },
  {
    headlineTi: 'ጥንታዊ ታሪክን ዲጂታል ጥበብን',
    subtitleTi: 'ግዕዝን ትግርኛን AI — ምሉእ ባህላዊ ውርሻ',
    headlineEn: "Ge'ez & Tigrinya Heritage AI",
    subtitleEn: 'Cultural Archive, Scholarships & Daily Proverbs',
  },
];

interface CyberHudHeroBannerProps {
  onOpenHibernation?: () => void;
  className?: string;
}

export const CyberHudHeroBanner: React.FC<CyberHudHeroBannerProps> = ({
  onOpenHibernation,
  className = '',
}) => {
  const { language } = useLanguage();
  const isTigrinya = language === 'ti' || language === 'ti_tg';

  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [isHibernating, setIsHibernating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Rolling phrase cycle
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setCurrentPhraseIndex((prev) => (prev + 1) % GREETING_PHRASES.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [isPaused]);

  // Periodic text hibernation pulse (sleep-wake neon breathing)
  useEffect(() => {
    let wakeTimer: ReturnType<typeof setTimeout> | null = null;
    const hibernationInterval = setInterval(() => {
      setIsHibernating(true);
      wakeTimer = setTimeout(() => {
        setIsHibernating(false);
      }, 2400);
    }, 5800);

    return () => {
      clearInterval(hibernationInterval);
      if (wakeTimer) clearTimeout(wakeTimer);
    };
  }, []);

  const currentPhrase = GREETING_PHRASES[currentPhraseIndex];
  const headlineText = isTigrinya ? currentPhrase.headlineTi : currentPhrase.headlineEn;
  const subtitleText = isTigrinya ? currentPhrase.subtitleTi : currentPhrase.subtitleEn;

  return (
    <section
      aria-label={isTigrinya ? 'ናይ መእተዊ ሓበሬታ' : 'Welcome Hero Banner'}
      className={`relative w-full overflow-hidden select-none ${className}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Ambient Cyber Glows */}
      <div
        className={`absolute -top-12 left-1/2 -translate-x-1/2 w-4/5 h-24 bg-cyan-500/20 blur-3xl pointer-events-none rounded-full transition-all duration-1000 ${
          isHibernating ? 'opacity-90 scale-110 bg-cyan-400/30' : 'opacity-45 scale-100'
        }`}
        aria-hidden="true"
      />

      {/* Main HUD Motherboard Chassis */}
      <div className="relative rounded-[28px] sm:rounded-[32px] bg-[#050E17]/95 backdrop-blur-xl border-2 border-cyan-500/50 px-4 py-5 sm:px-8 sm:py-6 shadow-[0_12px_36px_rgba(6,182,212,0.22),inset_0_0_24px_rgba(6,182,212,0.12)]">
        {/* Inset HUD Frame */}
        <div className="absolute inset-1.5 sm:inset-2 rounded-[22px] sm:rounded-[26px] border border-cyan-400/25 pointer-events-none" />

        {/* Top & Bottom Neon Accents */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-44 sm:w-64 h-[2.5px] bg-gradient-to-r from-transparent via-[#C084FC] to-transparent shadow-[0_0_12px_#C084FC]" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-44 sm:w-64 h-[2.5px] bg-gradient-to-r from-transparent via-[#38BDF8] to-transparent shadow-[0_0_12px_#38BDF8]" />

        {/* Circuitry Motherboard SVG Overlay */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none opacity-45 sm:opacity-65"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 700 280"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="cyberCyan" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#0284C7" stopOpacity="0.3" />
            </linearGradient>
          </defs>

          {/* Left IC & Bus Traces */}
          <rect x="24" y="28" width="38" height="22" rx="3" fill="#082032" stroke="#22D3EE" strokeWidth="1" />
          <path d="M 62 39 H 138 L 164 65 V 92" fill="none" stroke="url(#cyberCyan)" strokeWidth="1.2" />
          <circle cx="164" cy="92" r="2.5" fill="#22D3EE" className={isHibernating ? 'animate-pulse' : ''} />

          {/* Top Right Circuit Bus */}
          <path d="M 520 26 H 612 L 648 62 V 105" fill="none" stroke="#22D3EE" strokeWidth="1.4" strokeDasharray="5 2" />
          <path d="M 490 40 H 582 L 618 76 V 126" fill="none" stroke="#38BDF8" strokeWidth="1.1" />
          <circle cx="648" cy="105" r="2.5" fill="#22D3EE" className="animate-pulse" />

          {/* Bottom Left Motherboard Traces */}
          <path d="M 180 256 H 90 L 45 212 V 155" fill="none" stroke="#2DD4BF" strokeWidth="1.4" strokeDasharray="6 3" />
          <path d="M 210 242 H 120 L 75 198 V 142" fill="none" stroke="#C084FC" strokeWidth="1" />
          <circle cx="45" cy="155" r="2.5" fill="#2DD4BF" />

          {/* Bottom Right Diagonal Traces */}
          <line x1="565" y1="248" x2="605" y2="208" stroke="#38BDF8" strokeWidth="1.4" />
          <line x1="582" y1="252" x2="622" y2="212" stroke="#38BDF8" strokeWidth="1.4" />
          <line x1="599" y1="256" x2="639" y2="216" stroke="#38BDF8" strokeWidth="1.4" />
        </svg>

        {/* Top Bar Inside HUD: Interactive Hibernation Status + Pause Toggle (No Header Chrome Clutter) */}
        <div className="relative z-10 flex items-center justify-between mb-2">
          <button
            type="button"
            onClick={() => (onOpenHibernation ? onOpenHibernation() : setIsHibernating((prev) => !prev))}
            className="inline-flex items-center gap-1.5 text-[10px] font-mono tracking-wider text-cyan-300/85 hover:text-cyan-200 font-bold uppercase cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400 rounded px-1 py-0.5"
            title={isTigrinya ? 'መቆጻጸሪ ድቃስን ንቕሓትን' : 'Toggle Hibernation Pulse'}
          >
            <span
              className={`w-2 h-2 rounded-full transition-all duration-700 ${
                isHibernating
                  ? 'bg-purple-400 shadow-[0_0_8px_#C084FC] scale-125'
                  : 'bg-cyan-400 shadow-[0_0_8px_#22D3EE]'
              }`}
              aria-hidden="true"
            />
            <span>{isHibernating ? 'HIBERNATION PULSE' : 'CORE ACTIVE'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsPaused((prev) => !prev)}
            className="w-8 h-8 rounded-lg bg-[#0B2233]/80 hover:bg-[#103047] border border-cyan-400/35 text-cyan-300/85 hover:text-cyan-200 flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400"
            title={isPaused ? (isTigrinya ? 'ቀጽል' : 'Resume greeting rotation') : (isTigrinya ? 'ኣዕርፍ' : 'Pause greeting rotation')}
            aria-label={isPaused ? 'Resume greeting rotation' : 'Pause greeting rotation'}
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Centerpiece: 3D Rolling & Hibernation Neon Typography */}
        <div className="relative z-10 text-center py-2 sm:py-3 px-2 flex flex-col items-center justify-center min-h-[100px] sm:min-h-[116px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${currentPhraseIndex}-${isTigrinya ? 'ti' : 'en'}`}
              initial={{
                opacity: 0,
                y: 16,
                rotateX: -24,
                scale: 0.97,
                filter: 'blur(3px)',
              }}
              animate={{
                opacity: 1,
                y: 0,
                rotateX: 0,
                scale: isHibernating ? 1.015 : 1,
                filter: 'blur(0px)',
              }}
              exit={{
                opacity: 0,
                y: -16,
                rotateX: 24,
                scale: 0.97,
                filter: 'blur(3px)',
              }}
              transition={{
                duration: 0.55,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="flex flex-col items-center justify-center space-y-1.5 max-w-2xl"
            >
              <motion.h1
                animate={{
                  opacity: isHibernating ? [0.6, 1, 0.65] : [0.9, 1, 0.9],
                  textShadow: isHibernating
                    ? [
                        '0 0 10px rgba(94, 234, 212, 0.45), 0 0 22px rgba(34, 211, 238, 0.35)',
                        '0 0 22px rgba(94, 234, 212, 1), 0 0 42px rgba(34, 211, 238, 0.9), 0 0 64px rgba(6, 182, 212, 0.7)',
                        '0 0 12px rgba(94, 234, 212, 0.55), 0 0 24px rgba(34, 211, 238, 0.4)',
                      ]
                    : [
                        '0 0 10px rgba(94, 234, 212, 0.7), 0 0 20px rgba(34, 211, 238, 0.45)',
                        '0 0 16px rgba(94, 234, 212, 0.95), 0 0 30px rgba(34, 211, 238, 0.7), 0 0 44px rgba(6, 182, 212, 0.45)',
                        '0 0 10px rgba(94, 234, 212, 0.7), 0 0 20px rgba(34, 211, 238, 0.45)',
                      ],
                }}
                transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
                className={`text-xl sm:text-2xl md:text-3xl font-extrabold tracking-wide text-[#5EEAD4] sm:text-[#67E8F9] leading-tight text-balance ${
                  isTigrinya ? 'font-ethiopic' : ''
                }`}
              >
                {headlineText}
              </motion.h1>

              <motion.p
                animate={{
                  opacity: isHibernating ? [0.65, 1, 0.7] : [0.9, 1, 0.9],
                  textShadow: isHibernating
                    ? [
                        '0 0 8px rgba(233, 213, 255, 0.45), 0 0 16px rgba(192, 132, 252, 0.3)',
                        '0 0 16px rgba(233, 213, 255, 1), 0 0 34px rgba(192, 132, 252, 0.85)',
                        '0 0 9px rgba(233, 213, 255, 0.5), 0 0 18px rgba(192, 132, 252, 0.35)',
                      ]
                    : [
                        '0 0 8px rgba(233, 213, 255, 0.65), 0 0 16px rgba(192, 132, 252, 0.4)',
                        '0 0 13px rgba(233, 213, 255, 0.9), 0 0 24px rgba(192, 132, 252, 0.65)',
                        '0 0 8px rgba(233, 213, 255, 0.65), 0 0 16px rgba(192, 132, 252, 0.4)',
                      ],
                }}
                transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
                className={`text-xs sm:text-base font-bold text-[#E9D5FF] leading-snug ${
                  isTigrinya ? 'font-ethiopic' : 'font-sans'
                }`}
              >
                {subtitleText}
              </motion.p>
            </motion.div>
          </AnimatePresence>

          {/* Slide Pagination Dots */}
          <div className="flex items-center gap-1.5 mt-3">
            {GREETING_PHRASES.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentPhraseIndex(idx)}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  idx === currentPhraseIndex
                    ? 'w-5 bg-cyan-300 shadow-[0_0_8px_#22D3EE]'
                    : 'w-1.5 bg-cyan-900/70 hover:bg-cyan-700'
                }`}
                aria-label={`Slide ${idx + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Corner Sparkle Accent */}
        <div className="absolute bottom-3 right-4 sm:bottom-4 sm:right-5 pointer-events-none opacity-80" aria-hidden="true">
          <Sparkles className="w-4 h-4 text-cyan-300 drop-shadow-[0_0_8px_#67E8F9]" />
        </div>
      </div>
    </section>
  );
};
