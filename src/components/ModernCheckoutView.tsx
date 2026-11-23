import React, { useState } from 'react';
import { ArrowLeft, Lock, ShieldCheck, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useSubscription } from '../context/SubscriptionContext';
import { SupportedCurrency, UserProfile } from '../types';

interface ModernCheckoutViewProps {
  onBack?: () => void;
  user?: UserProfile;
  planName?: string;
  planId?: string;
  amountFormatted?: string;
  rawAmount?: number;
  currency?: SupportedCurrency;
  billingCycle?: 'monthly' | 'yearly' | 'one_time';
  withTrial?: boolean;
  onSuccess?: (receipt?: any) => void;
  onManageOtherMethods?: () => void;
}

export const ModernCheckoutView: React.FC<ModernCheckoutViewProps> = ({
  onBack,
  planName,
  billingCycle = 'monthly',
  onSuccess,
}) => {
  const { language } = useLanguage();
  const isTigrinya = language === 'ti' || language === 'ti_tg';
  const { paypalConfig, createPayPalCheckout, verifyPayPalSubscription } = useSubscription();

  const planType = billingCycle === 'yearly' ? 'pro_yearly' : 'pro_monthly';
  const plan = paypalConfig.plans[planType];

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [pendingSandboxSubId, setPendingSandboxSubId] = useState<string | null>(null);

  const handlePayPalCheckout = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setIsProcessing(true);
    try {
      const res = await createPayPalCheckout({ planType });
      if (!res.success) {
        setErrorMsg(res.error || 'Could not start PayPal checkout.');
        return;
      }
      if (res.approvalUrl && res.approvalUrl.startsWith('https://')) {
        window.location.assign(res.approvalUrl);
        return;
      }
      if (res.subscriptionId) {
        setPendingSandboxSubId(res.subscriptionId);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVerifySandbox = async () => {
    if (!pendingSandboxSubId) return;
    setIsProcessing(true);
    setErrorMsg('');
    try {
      const res = await verifyPayPalSubscription({
        subscriptionId: pendingSandboxSubId,
        planType,
        sandboxSimulatedApproval: true,
      });
      if (res.success) {
        setPendingSandboxSubId(null);
        setSuccessMsg('PayPal subscription verified and activated!');
        onSuccess?.();
      } else {
        setErrorMsg(res.error || 'Verification failed.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full flex justify-center py-2 px-2">
      <div className="w-full max-w-[440px] bg-[#0E1015] rounded-3xl border border-slate-800 shadow-2xl p-6 text-white space-y-5">
        <div className="flex items-center justify-between">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="p-2 -ml-2 rounded-full text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : (
            <div />
          )}
          <h2 className="text-base font-bold font-cinzel text-[#F3E5AB]">
            {isTigrinya ? 'ብPayPal ክፍሊት' : 'PayPal Secure Checkout'}
          </h2>
          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
            {paypalConfig.mode}
          </span>
        </div>

        <div className="bg-[#151822] border border-[#8E6D28]/40 rounded-2xl p-4 space-y-1.5">
          <div className="text-xs text-slate-400">Selected Plan</div>
          <div className="text-lg font-black text-white">{planName || plan.name}</div>
          <div className="text-2xl font-black font-mono text-emerald-400">
            {plan.amount.toFixed(2)} {plan.currency}{' '}
            <span className="text-xs text-slate-400 font-normal">
              / {plan.billingFrequency === 'YEAR' ? 'year' : 'month'}
            </span>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {!pendingSandboxSubId ? (
          <button
            type="button"
            disabled={isProcessing}
            onClick={handlePayPalCheckout}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#003087] to-[#0070BA] hover:brightness-110 text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Connecting to PayPal...</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>Continue to PayPal</span>
              </>
            )}
          </button>
        ) : (
          <button
            type="button"
            disabled={isProcessing}
            onClick={handleVerifySandbox}
            className="w-full py-3.5 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Approve & Verify in Sandbox</span>
          </button>
        )}

        <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
          <ShieldCheck className="w-4 h-4 text-sky-400" />
          <span>Verified PayPal Subscriptions & Server Entitlements</span>
        </div>
      </div>
    </div>
  );
};
