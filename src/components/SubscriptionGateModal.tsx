import React, { useState } from 'react';
import { X, Crown, Check, ArrowRight, ShieldCheck, CreditCard } from 'lucide-react';
import { useSubscription } from '../context/SubscriptionContext';
import { useLanguage } from '../context/LanguageContext';

interface SubscriptionGateModalProps {
  onOpenPricingPlans: () => void;
}

export const SubscriptionGateModal: React.FC<SubscriptionGateModalProps> = ({
  onOpenPricingPlans,
}) => {
  const {
    activePaywallFeature,
    closePaywall,
    paypalConfig,
    stripeConfig,
    createStripeMonthlyCheckout,
  } = useSubscription();
  const { language } = useLanguage();
  const [isStripeStarting, setIsStripeStarting] = useState(false);
  const [stripeError, setStripeError] = useState<string | null>(null);

  if (!activePaywallFeature) return null;

  const monthly = paypalConfig.plans.pro_monthly;
  const yearly = paypalConfig.plans.pro_yearly;
  const stripeMonthlyAmount = stripeConfig.monthlyPlan.amount.toFixed(2);

  const handleUpgradeClick = () => {
    setStripeError(null);
    closePaywall();
    onOpenPricingPlans();
  };

  const handleStripeMonthlyClick = async () => {
    setIsStripeStarting(true);
    setStripeError(null);
    try {
      const res = await createStripeMonthlyCheckout();
      if (res.success && res.checkoutUrl && res.checkoutUrl.startsWith('https://')) {
        window.location.assign(res.checkoutUrl);
        return;
      }
      if (res.error?.toLowerCase().includes('sign in') || res.error?.toLowerCase().includes('auth')) {
        closePaywall();
        onOpenPricingPlans();
        return;
      }
      setStripeError(res.error || 'Could not start Stripe monthly checkout. Please open full billing options.');
    } finally {
      setIsStripeStarting(false);
    }
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
            AXUMITE PRO • STRIPE & PAYPAL
          </span>

          <h2 className="text-xl sm:text-2xl font-bold font-cinzel text-white leading-tight">
            {activePaywallFeature}
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-sm mx-auto leading-relaxed">
            {language === 'ti'
              ? `እዚ ፍሉይ መሳርሒ ኣብ Axumite Pro ጥራይ ይርከብ። ብStripe (€${stripeMonthlyAmount}/ወርሒ) ወይ PayPal ብቕጽበት ክፈትዎ።`
              : `Unlock all 6 Pro translator & AI tools with Stripe (€${stripeMonthlyAmount}/mo) or PayPal (€${monthly.amount.toFixed(2)}/mo or €${yearly.amount.toFixed(2)}/yr).`}
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
              <span>Verified Stripe & PayPal Recurring Billing — Cancel Anytime</span>
            </div>
          </div>

          {stripeError && (
            <div className="mb-3 rounded-xl bg-rose-950/60 border border-rose-500/40 px-3 py-2 text-xs text-rose-200">
              {stripeError}
            </div>
          )}

          <div className="space-y-2.5">
            <button
              id="btn-gate-stripe-monthly"
              type="button"
              disabled={isStripeStarting}
              onClick={handleStripeMonthlyClick}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#635BFF] via-[#554CFF] to-[#463DF2] hover:brightness-110 text-white font-bold text-sm shadow-lg transition-all cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-60"
            >
              <CreditCard className="w-4 h-4" />
              <span>
                {isStripeStarting
                  ? 'Connecting to Stripe...'
                  : language === 'ti'
                  ? `ብStripe ናብ PRO ዕበ (€${stripeMonthlyAmount}/ወርሒ)`
                  : `Subscribe Monthly — €${stripeMonthlyAmount}/mo with Stripe`}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleUpgradeClick}
              className="w-full py-3 px-6 rounded-2xl bg-gradient-to-r from-[#003087] via-[#0070BA] to-[#005EA6] hover:brightness-110 text-white font-bold text-xs shadow-lg transition-all cursor-pointer flex items-center justify-center space-x-2"
            >
              <span>
                {language === 'ti'
                  ? 'ብPayPal ናብ PRO ዕበ'
                  : `Or Upgrade via PayPal (€${monthly.amount.toFixed(2)}/mo)`}
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
            <span>Verified Stripe & PayPal Checkout & Server-Side Entitlements</span>
          </div>
        </div>
      </div>
    </div>
  );
};
