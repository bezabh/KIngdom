import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  CheckCircle2,
  Zap,
  ArrowRight,
  Crown,
  Lock,
  AlertCircle,
  Check,
  ShieldCheck,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useSubscription } from '../context/SubscriptionContext';
import { UserProfile } from '../types';

interface SaasUserRecord {
  userId: string;
  userEmail?: string;
  plan: 'free' | 'premium' | 'enterprise';
  dailyRequestsUsed: number;
  dailyLimit: number;
  totalRequestsLifetime: number;
  lastResetDate: string;
  status: 'active' | 'canceled' | 'past_due';
}

interface SaasSubscriptionSystemProps {
  user?: UserProfile;
  onNavigateTab?: (tab: string) => void;
  onOpenPricingModal?: () => void;
  standalone?: boolean;
}

export const SaasSubscriptionSystem: React.FC<SaasSubscriptionSystemProps> = ({
  user,
  onNavigateTab,
  onOpenPricingModal,
}) => {
  const { language } = useLanguage();
  const { isProOrHigher, paypalConfig, setSelectedPlanType, openPaywall } = useSubscription();
  const isTigrinya = language === 'ti' || language === 'ti_tg';

  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [userUsage, setUserUsage] = useState<SaasUserRecord | null>(null);
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const fetchUserUsage = useCallback(async () => {
    try {
      const uid = user?.id || 'usr_guest';
      const email = user?.email || '';
      const role = user?.role || 'Guest';
      const res = await fetch(
        `/api/user/usage?userId=${encodeURIComponent(uid)}&userEmail=${encodeURIComponent(email)}&userRole=${encodeURIComponent(role)}`
      );
      if (res.ok) {
        const data = await res.json();
        setUserUsage(data);
      }
    } catch {
      // Ignore transient telemetry fetch errors
    }
  }, [user]);

  useEffect(() => {
    void fetchUserUsage();
  }, [fetchUserUsage]);

  const handleGoToPayPal = (cycle: 'monthly' | 'yearly') => {
    setSelectedPlanType(cycle === 'yearly' ? 'pro_yearly' : 'pro_monthly');
    if (onOpenPricingModal) {
      onOpenPricingModal();
    } else if (onNavigateTab) {
      onNavigateTab('payment');
    } else {
      openPaywall(cycle === 'yearly' ? 'Axumite Pro Yearly (PayPal)' : 'Axumite Pro Monthly (PayPal)');
    }
    setActionNotice({
      type: 'info',
      text: 'Continue checkout securely with PayPal to activate Axumite Pro.',
    });
  };

  const monthlyAmount = paypalConfig.plans.pro_monthly.amount.toFixed(2);
  const yearlyAmount = paypalConfig.plans.pro_yearly.amount.toFixed(2);
  const currency = paypalConfig.currency || 'EUR';

  return (
    <div className="w-full space-y-6 text-slate-100">
      <div className="bg-[#121422] border border-[#8E6D28]/40 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#003087] to-[#0070BA] flex items-center justify-center text-white">
            <Crown className="w-5 h-5 text-[#F3E5AB]" />
          </div>
          <div>
            <h3 className="font-cinzel text-lg font-black text-[#F3E5AB]">
              {isTigrinya ? 'Axumite AI Pro (PayPal)' : 'Axumite AI Free vs Pro'}
            </h3>
            <p className="text-xs text-slate-400">
              {userUsage
                ? `Daily Usage: ${userUsage.dailyRequestsUsed} / ${userUsage.dailyLimit} requests`
                : 'Verified PayPal recurring subscription plans.'}
            </p>
          </div>
        </div>

        <div className="flex items-center bg-[#0E101D] border border-slate-800 rounded-xl p-1 text-xs">
          <button
            type="button"
            onClick={() => setBillingCycle('monthly')}
            className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer ${
              billingCycle === 'monthly' ? 'bg-[#C5A059] text-black' : 'text-slate-400'
            }`}
          >
            Monthly (€{monthlyAmount})
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle('yearly')}
            className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer ${
              billingCycle === 'yearly' ? 'bg-[#C5A059] text-black' : 'text-slate-400'
            }`}
          >
            Yearly (€{yearlyAmount})
          </button>
        </div>
      </div>

      {actionNotice && (
        <div className="p-3.5 rounded-xl bg-sky-950/60 border border-sky-500/40 text-sky-200 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{actionNotice.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-[#0E101D] border border-slate-800 rounded-2xl p-6 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-slate-400">Free Plan</span>
              {!isProOrHigher && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-200">
                  Current Plan
                </span>
              )}
            </div>
            <h4 className="text-xl font-black text-white">Axumite Free Explorer</h4>
            <div className="text-3xl font-black font-mono text-white">
              0.00 {currency} <span className="text-xs text-slate-400 font-normal">/ forever</span>
            </div>
            <ul className="space-y-2 text-xs text-slate-300 pt-2 border-t border-slate-800">
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /><span>Standard Ge&apos;ez & Tigrinya translation</span></li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /><span>Basic dictionary & daily free AI quota</span></li>
              <li className="flex items-center gap-2 text-slate-500"><Lock className="w-4 h-4" /><span>Pro Video Dubbing, Legal AI & 4K Calligraphy locked</span></li>
            </ul>
          </div>
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-slate-500" />
            <span>No credit card required</span>
          </div>
        </div>

        <div className="bg-gradient-to-b from-[#1C182F] to-[#110E1E] border border-[#C5A059] rounded-2xl p-6 flex flex-col justify-between space-y-4 shadow-xl">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-amber-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Recommended
              </span>
              {isProOrHigher && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Active Pro
                </span>
              )}
            </div>
            <h4 className="text-xl font-black text-[#F3E5AB] font-cinzel">
              {billingCycle === 'yearly' ? 'Axumite Pro Yearly' : 'Axumite Pro Monthly'}
            </h4>
            <div className="text-3xl font-black font-mono text-white">
              {billingCycle === 'yearly' ? yearlyAmount : monthlyAmount} {currency}{' '}
              <span className="text-xs text-slate-400 font-normal">
                / {billingCycle === 'yearly' ? 'year' : 'month'}
              </span>
            </div>
            <ul className="space-y-2 text-xs text-slate-200 pt-2 border-t border-slate-800">
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /><span>All 6 Pro Translator & AI Studio features unlocked</span></li>
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /><span>Unlimited high-speed Gemini Pro chat</span></li>
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /><span>Recurring PayPal billing with anytime cancellation</span></li>
            </ul>
          </div>

          <button
            type="button"
            onClick={() => handleGoToPayPal(billingCycle)}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#003087] to-[#0070BA] hover:brightness-110 text-white text-xs font-black flex items-center justify-center gap-2 cursor-pointer"
          >
            <Zap className="w-4 h-4 text-amber-300" />
            <span>{isProOrHigher ? 'Manage PayPal Plan' : 'Subscribe with PayPal'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
