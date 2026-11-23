import React from 'react';
import { X, Crown, Check, ArrowRight, ShieldCheck } from 'lucide-react';
import { useSubscription } from '../context/SubscriptionContext';
import { useLanguage } from '../context/LanguageContext';

interface SubscriptionGateModalProps {
  onOpenPricingPlans: () => void;
}

export const SubscriptionGateModal: React.FC<SubscriptionGateModalProps> = ({
  onOpenPricingPlans,
}) => {
  const { activePaywallFeature, closePaywall, paypalConfig } = useSubscription();
  const { language } = useLanguage();

  if (!activePaywallFeature) return null;

  const monthly = paypalConfig.plans.pro_monthly;
  const yearly = paypalConfig.plans.pro_yearly;

  const handleUpgradeClick = () => {
    closePaywall();
    onOpenPricingPlans();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="bg-gradient-to-b from-[#14121E] via-[#0E0D17] to-[#0A0A0F] border border-[#C5A059]/50 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative text-white">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-32 bg-amber-500/15 blur-3xl pointer-events-none rounded-full" />

        <button
          type="button"
          onClick={closePaywall}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 transition-colors z-10 cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6 sm:p-8 relative z-10 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-400 to-amber-600 text-slate-950 shadow-xl shadow-amber-500/25 mb-5 ring-4 ring-amber-500/20">
            <Crown className="w-8 h-8" />
          </div>

          <span className="inline-block px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-widest bg-amber-500/20 text-amber-300 border border-amber-500/30 mb-2">
            AXUMITE PRO • PAYPAL SUBSCRIPTION
          </span>

          <h2 className="text-xl sm:text-2xl font-bold font-cinzel text-white leading-tight">
            {activePaywallFeature}
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-sm mx-auto leading-relaxed">
            {language === 'ti'
              ? 'እዚ ፍሉይ መሳርሒ ኣብ Axumite Pro ጥራይ ይርከብ። ብPayPal ብቕጽበት ክፈትዎ።'
              : `Unlock all 6 Pro translator & AI tools with PayPal (€${monthly.amount.toFixed(2)}/mo or €${yearly.amount.toFixed(2)}/yr).`}
          </p>

          <div className="bg-[#191826]/80 rounded-2xl p-4 my-5 border border-slate-800 text-left space-y-2 text-xs">
            <div className="flex items-center space-x-2.5 text-slate-200">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>AI Video Translation & Speech Dubbing</span>
            </div>
            <div className="flex items-center space-x-2.5 text-slate-200">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Unlimited AI Chat & Deep Reasoning + 4K Calligraphy</span>
            </div>
            <div className="flex items-center space-x-2.5 text-slate-200">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Smart OCR Documents, Legal AI & Mechanic AI</span>
            </div>
            <div className="flex items-center space-x-2.5 text-slate-200">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Verified PayPal Recurring Billing — Cancel Anytime</span>
            </div>
          </div>

          <div className="space-y-2.5">
            <button
              type="button"
              onClick={handleUpgradeClick}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#003087] via-[#0070BA] to-[#005EA6] hover:brightness-110 text-white font-bold text-sm shadow-lg transition-all cursor-pointer flex items-center justify-center space-x-2"
            >
              <span>
                {language === 'ti'
                  ? 'ብPayPal ናብ PRO ዕበ'
                  : `Upgrade to Pro via PayPal (€${monthly.amount.toFixed(2)}/mo)`}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={closePaywall}
              className="w-full py-2.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer font-medium"
            >
              {language === 'ti' ? 'ደሓር (Maybe Later)' : 'Maybe Later'}
            </button>
          </div>

          <div className="mt-4 flex items-center justify-center space-x-2 text-[10px] text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-sky-400/80" />
            <span>Verified PayPal Checkout & Server-Side Entitlements</span>
          </div>
        </div>
      </div>
    </div>
  );
};
