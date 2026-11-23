import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, X, Sparkles, MoveHorizontal } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const TUTORIAL_STORAGE_KEY = 'axumite_swipe_tutorial_seen';

interface SwipeNavigationTutorialProps {
  onDismiss?: () => void;
  activeTab?: string;
  hasSwiped?: boolean;
}

export const SwipeNavigationTutorial: React.FC<SwipeNavigationTutorialProps> = ({
  onDismiss,
  activeTab = 'premiere',
  hasSwiped = false,
}) => {
  const { language } = useLanguage();
  const isTigrinya = language === 'ti' || language === 'ti_tg';
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already seen the swipe tutorial
    try {
      const hasSeen = localStorage.getItem(TUTORIAL_STORAGE_KEY);
      if (!hasSeen) {
        // Delay appearance slightly for a graceful, non-intrusive first session intro
        const timer = setTimeout(() => {
          setIsVisible(true);
        }, 1600);
        return () => clearTimeout(timer);
      }
    } catch {
      // Storage unavailable fallback
    }
  }, []);

  // If user performs an actual swipe, automatically dismiss and mark as completed
  useEffect(() => {
    if (hasSwiped && isVisible) {
      handleDismiss();
    }
  }, [hasSwiped]);

  const handleDismiss = () => {
    setIsVisible(false);
    try {
      localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
    } catch {
      // Ignore localStorage error
    }
    if (onDismiss) {
      onDismiss();
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-20 sm:bottom-22 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md pointer-events-auto select-none"
        >
          <div className="relative rounded-2xl bg-slate-950/92 backdrop-blur-xl border border-amber-400/40 p-3.5 shadow-[0_12px_36px_rgba(0,0,0,0.45)] text-slate-100 ring-1 ring-white/10">
            {/* Ambient decorative glowing accent */}
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-24 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent rounded-full blur-[1px]" />

            <div className="flex items-start justify-between gap-2.5">
              {/* Animated Gesture Demo Visual */}
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-400/30 flex items-center justify-center shrink-0 relative overflow-hidden mt-0.5">
                <motion.div
                  animate={{
                    x: [-8, 8, -8],
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 1.8,
                    ease: 'easeInOut',
                  }}
                  className="flex items-center text-amber-400"
                >
                  <MoveHorizontal className="w-5 h-5 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                </motion.div>
              </div>

              {/* Tooltip Content */}
              <div className="flex-1 min-w-0 pr-1">
                <div className="flex items-center space-x-1.5 mb-0.5">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-400/20 flex items-center space-x-1">
                    <Sparkles className="w-2.5 h-2.5" />
                    <span>{isTigrinya ? 'ናይ ስዋይፕ መምርሒ' : 'Swipe Gesture'}</span>
                  </span>
                </div>

                <h4 className="text-xs font-bold text-white tracking-tight">
                  {isTigrinya
                    ? 'ናብ ካልእ ገጽ ንምሕላፍ ስዋይፕ ግበር'
                    : 'Swipe left or right to switch tabs'}
                </h4>

                <p className="text-[11px] text-slate-300 leading-snug mt-0.5">
                  {isTigrinya
                    ? 'ኣብ ማእከል ስክሪን ብጸጋም ወይ ብየማን ብምስሓብ ብቐሊሉ ኣብ መንጎ ገጻት ክትዘውር ትኽእል።'
                    : 'Gliding left or right on the screen effortlessly navigates between all apps.'}
                </p>

                {/* Animated Direction Arrows Cue */}
                <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-white/10 text-[10.5px]">
                  <div className="flex items-center space-x-2 text-amber-300/90 font-medium">
                    <div className="flex items-center space-x-0.5 bg-white/5 px-2 py-0.5 rounded-lg border border-white/10">
                      <ChevronLeft className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                      <span>{isTigrinya ? 'ናብ ጸጋም' : 'Prev'}</span>
                    </div>
                    <span className="text-slate-500">•</span>
                    <div className="flex items-center space-x-0.5 bg-white/5 px-2 py-0.5 rounded-lg border border-white/10">
                      <span>{isTigrinya ? 'ናብ የማን' : 'Next'}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleDismiss}
                    className="px-2.5 py-1 bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer shadow-sm shadow-amber-500/20"
                  >
                    {isTigrinya ? 'ተረዲኡኒ' : 'Got it'}
                  </button>
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={handleDismiss}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
                title="Dismiss guide"
                aria-label="Dismiss tutorial"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
