import React from 'react';
import { Gem, CheckCircle2, Sparkles, Star, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useSubscription } from '../context/SubscriptionContext';

export interface AiAssistantDailyLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgradeSuccess?: () => void;
  onOpenFullPricing?: () => void;
  remainingQueries?: number;
  totalFreeQueries?: number;
}

export const AiAssistantDailyLimitModal: React.FC<AiAssistantDailyLimitModalProps> = ({
  isOpen,
  onClose,
  onOpenFullPricing,
}) => {
  const { language } = useLanguage();
  const { paypalConfig, openPaywall } = useSubscription();

  if (!isOpen) return null;

  const isTigrinya = language === 'ti' || language === 'ti_tg';
  const monthlyPrice = paypalConfig.plans.pro_monthly.amount.toFixed(2);

  const handleUpgradeClick = () => {
    onClose();
    if (onOpenFullPricing) {
      onOpenFullPricing();
    } else {
      openPaywall('Axumite Pro Unlimited AI Access');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-white rounded-t-[36px] sm:rounded-[32px] overflow-hidden shadow-2xl relative animate-in slide-in-from-bottom-8 duration-300 flex flex-col text-slate-800"
        style={{ maxHeight: '92vh' }}
      >
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-slate-300" />
        </div>

        <div className="p-6 sm:p-7 overflow-y-auto max-h-[85vh] flex flex-col items-center text-center">
          <div className="relative mb-4 mt-1">
            <div className="w-20 h-20 rounded-full bg-amber-50 border-4 border-amber-100/80 flex items-center justify-center shadow-inner ring-8 ring-amber-50/50">
              <Gem className="w-10 h-10 text-amber-500 fill-amber-400/30" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center border-2 border-white shadow-md">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
            {isTigrinya ? 'ናይ ሎሚ ደረትካ ወዲእካዮ ⏳' : 'Daily Limit Reached ⏳'}
          </h2>

          <p className="text-xs sm:text-[13px] text-slate-600 font-medium mt-2 mb-5 leading-relaxed max-w-xs sm:max-w-sm">
            {isTigrinya ? (
              <>
                ክቡር ዓሚል፡ ናይ ሎሚ ነጻ ኣገልግሎት ወዲእካ ኣለኻ። ደረት-ኣልቦ ንምጥቃም ብPayPal ናብ <strong className="text-slate-900 font-bold">PRO</strong> ዕበ።
              </>
            ) : (
              <>
                You have used today&apos;s free query quota. Upgrade to <strong className="text-slate-900 font-bold">Axumite Pro</strong> via PayPal (€{monthlyPrice}/mo) for unlimited access.
              </>
            )}
          </p>

          <div className="w-full bg-[#F4F9F8] border border-emerald-900/10 rounded-2xl p-4 sm:p-5 text-left space-y-3 mb-4">
            <div className="flex items-start space-x-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span className="text-xs sm:text-[13px] font-bold text-slate-800 leading-tight">
                {isTigrinya ? 'ደረት ኣልቦ ተጠቃምነት' : 'Unlimited AI usage & requests'}
              </span>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span className="text-xs sm:text-[13px] font-bold text-slate-800 leading-tight">
                {isTigrinya ? 'AI ቪድዮ ትርጉምን ደቢንግን' : 'AI Video Dubbing, OCR, Legal & Mechanic AI'}
              </span>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span className="text-xs sm:text-[13px] font-bold text-slate-800 leading-tight">
                {isTigrinya ? 'ብPayPal ውሑስ ክፍሊት — ኣብ ዝደለኻዮ ሰዓት ኣቋርጽ' : 'Verified PayPal billing — cancel anytime'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleUpgradeClick}
            className="w-full py-4 px-6 rounded-2xl bg-[#003087] hover:bg-[#002569] text-white font-black text-sm sm:text-base flex items-center justify-center space-x-2 transition-all shadow-lg cursor-pointer"
          >
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
            <span>{isTigrinya ? 'ብPayPal ናብ PRO ዕበ' : 'Continue to PayPal Checkout'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="mt-3.5 py-1.5 px-4 text-xs sm:text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
          >
            {isTigrinya ? 'ደሓር (Maybe Later)' : 'Maybe Later'}
          </button>

          <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Server-verified PayPal Entitlements</span>
          </div>
        </div>
      </div>
    </div>
  );
};
