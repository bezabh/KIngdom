import React, { useState, useEffect, useRef } from 'react';
import {
  Check,
  Sparkles,
  Shield,
  RefreshCw,
  FileText,
  Lock,
  AlertCircle,
  Globe,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  Crown,
  XCircle,
  Calendar,
  ExternalLink,
  Info,
  LogIn,
} from 'lucide-react';
import { UserProfile } from '../types';
import { InvoiceReceiptModal } from './InvoiceReceiptModal';
import { useSubscription, InvoiceItem } from '../context/SubscriptionContext';
import { useLanguage } from '../context/LanguageContext';
import { getPayPalJsSdk, type PayPalPlanType } from '../lib/paypalClient';

export type PaymentSystemSubTab =
  | 'saas-plans'
  | 'checkout'
  | 'mobile-checkout'
  | 'payment-methods'
  | 'subscription'
  | 'invoices'
  | 'bank-portal'
  | 'pro-earnings'
  | 'diagnostics';

interface PaymentSystemProps {
  onSaveInsight?: (item: any) => void;
  user?: UserProfile;
  onOpenAuthModal?: (mode: 'login' | 'signup' | 'verify', reason?: string) => void;
  initialSubTab?: PaymentSystemSubTab;
}

const PRO_FEATURE_LIST = [
  { id: 'video_dubbing', label: 'AI Video Translator & Speech Dubbing', labelTi: 'AI ቪድዮ ትርጉምን ድምጺ ደቢንግን' },
  { id: 'unlimited_chat', label: 'Unlimited High-Speed AI & Deep Reasoning Chat', labelTi: 'ደረት ኣልቦ AI ዝርርብን ዕሙቕ ትንታነን' },
  { id: 'calligraphy_4k', label: '4K Ge\'ez Calligraphy & Photo-to-Video Studio', labelTi: '4K ግእዝ ጽሕፈትን ስእሊ ናብ ቪድዮ ስቱድዮን' },
  { id: 'legal_ai', label: 'Legal & Immigration Document AI Assistant', labelTi: 'ናይ ሕግን ሰነዳትን AI ሓጋዚ' },
  { id: 'mechanic_ai', label: 'Automotive Mechanic & Engineering AI Suite', labelTi: 'ናይ መካኒክን ቴክኒክን AI ሓጋዚ' },
  { id: 'ocr_docs', label: 'Smart Camera & Document OCR Translator', labelTi: 'ብካሜራ ሰነዳት OCR መተርጎሚ' },
];

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency || 'EUR'} ${amount.toFixed(2)}`;
  }
}

export const PaymentSystem: React.FC<PaymentSystemProps> = ({
  user,
  onOpenAuthModal,
  initialSubTab,
}) => {
  const { language } = useLanguage();
  const isTigrinya = language === 'ti' || language === 'ti_tg';

  const {
    subscription,
    paypalConfig,
    paypalEntitlement,
    paypalSubscription,
    billingHistory,
    selectedPlanType,
    setSelectedPlanType,
    isProOrHigher,
    isLoadingStatus,
    lastPaymentError,
    clearPaymentError,
    paypalOutcomeView,
    setPayPalOutcomeView,
    createPayPalCheckout,
    verifyPayPalSubscription,
    capturePayPalOrder,
    cancelSubscription,
    refreshSubscriptionStatus,
  } = useSubscription();

  const normalizeInitialTab = (tab?: PaymentSystemSubTab): 'checkout' | 'subscription' | 'invoices' => {
    if (tab === 'subscription') return 'subscription';
    if (tab === 'invoices') return 'invoices';
    return 'checkout';
  };

  const [activeTab, setActiveTab] = useState<'checkout' | 'subscription' | 'invoices'>(() =>
    normalizeInitialTab(initialSubTab)
  );
  const [preferFallbackOrder, setPreferFallbackOrder] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [pendingApproval, setPendingApproval] = useState<{
    subscriptionId?: string | null;
    orderId?: string | null;
    approvalUrl?: string | null;
    strategy: 'subscriptions_api' | 'orders_v2_fallback' | 'sandbox_simulation';
    planType: PayPalPlanType;
  } | null>(null);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [sdkRenderError, setSdkRenderError] = useState<string | null>(null);
  const paypalButtonsContainerRef = useRef<HTMLDivElement | null>(null);

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('No longer needed at this time');
  const [isCanceling, setIsCanceling] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceItem | null>(null);

  useEffect(() => {
    if (initialSubTab) {
      setActiveTab(normalizeInitialTab(initialSubTab));
    }
  }, [initialSubTab]);

  const activePlan = paypalConfig.plans[selectedPlanType];
  const monthlyPlan = paypalConfig.plans.pro_monthly;
  const yearlyPlan = paypalConfig.plans.pro_yearly;
  const yearlySavingsPct = Math.max(
    0,
    Math.round((1 - yearlyPlan.amount / (monthlyPlan.amount * 12)) * 100)
  );

  // Render real PayPal JavaScript SDK buttons whenever clientId is configured
  useEffect(() => {
    let cancelled = false;
    const container = paypalButtonsContainerRef.current;
    if (!container || activeTab !== 'checkout' || !paypalConfig.clientId || !user?.isLoggedIn) {
      setSdkLoaded(false);
      return;
    }

    container.innerHTML = '';
    setSdkRenderError(null);

    const intent: 'subscription' | 'capture' =
      preferFallbackOrder || !activePlan.paypalPlanId ? 'capture' : 'subscription';

    getPayPalJsSdk({
      clientId: paypalConfig.clientId,
      currency: paypalConfig.currency || 'EUR',
      intent,
    }).then((paypal) => {
      if (cancelled || !paypal || !paypal.Buttons || !paypalButtonsContainerRef.current) {
        if (!cancelled && paypalConfig.clientId) {
          setSdkRenderError('PayPal Smart Buttons could not initialize in this browser. Use the secure PayPal checkout button below.');
        }
        return;
      }

      try {
        const buttonConfig: any = {
          style: {
            shape: 'rect',
            color: 'gold',
            layout: 'vertical',
            label: intent === 'subscription' ? 'subscribe' : 'paypal',
            height: 44,
          },
          onCancel: () => {
            setPayPalOutcomeView('cancelled');
            setStatusMessage({
              type: 'info',
              text: 'PayPal checkout was cancelled. No charges were made.',
            });
          },
          onError: (err: any) => {
            const msg = err?.message || 'PayPal checkout encountered an error.';
            setPayPalOutcomeView('failed');
            setStatusMessage({ type: 'error', text: msg });
          },
        };

        if (intent === 'subscription' && activePlan.paypalPlanId) {
          buttonConfig.createSubscription = (_data: any, actions: any) =>
            actions.subscription.create({ plan_id: activePlan.paypalPlanId });
          buttonConfig.onApprove = async (data: any) => {
            setIsProcessing(true);
            try {
              const res = await verifyPayPalSubscription({
                subscriptionId: data.subscriptionID,
                planType: selectedPlanType,
              });
              if (res.success) {
                setStatusMessage({
                  type: 'success',
                  text: 'PayPal subscription verified! Axumite Pro features are now unlocked.',
                });
              } else {
                setStatusMessage({
                  type: 'error',
                  text: res.error || 'PayPal subscription verification did not confirm active billing.',
                });
              }
            } finally {
              setIsProcessing(false);
            }
          };
        } else {
          buttonConfig.createOrder = async () => {
            const session = await createPayPalCheckout({
              planType: selectedPlanType,
              preferFallbackOrder: true,
            });
            if (!session.success || !session.orderId) {
              throw new Error(session.error || 'Failed to create PayPal order.');
            }
            return session.orderId;
          };
          buttonConfig.onApprove = async (data: any) => {
            setIsProcessing(true);
            try {
              const res = await capturePayPalOrder({
                orderId: data.orderID,
                planType: selectedPlanType,
              });
              if (res.success) {
                setStatusMessage({
                  type: 'success',
                  text: 'PayPal payment captured and verified! Axumite Pro features are now unlocked.',
                });
              } else {
                setStatusMessage({
                  type: 'error',
                  text: res.error || 'Failed to capture PayPal payment.',
                });
              }
            } finally {
              setIsProcessing(false);
            }
          };
        }

        const instance = paypal.Buttons(buttonConfig);
        if (instance.isEligible && !instance.isEligible()) {
          setSdkLoaded(false);
          return;
        }
        instance.render(paypalButtonsContainerRef.current).then(() => {
          if (!cancelled) setSdkLoaded(true);
        });
      } catch (err: any) {
        if (!cancelled) {
          setSdkRenderError(err?.message || 'Unable to render PayPal button.');
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, [
    activeTab,
    paypalConfig.clientId,
    paypalConfig.currency,
    activePlan.paypalPlanId,
    selectedPlanType,
    preferFallbackOrder,
    user?.isLoggedIn,
    createPayPalCheckout,
    verifyPayPalSubscription,
    capturePayPalOrder,
    setPayPalOutcomeView,
  ]);

  const handleStartServerCheckout = async () => {
    if (!user?.isLoggedIn) {
      onOpenAuthModal?.('login', 'Sign in with Google/Firebase before subscribing with PayPal.');
      return;
    }

    setIsProcessing(true);
    setStatusMessage(null);
    clearPaymentError();
    setPayPalOutcomeView('none');

    try {
      const res = await createPayPalCheckout({
        planType: selectedPlanType,
        preferFallbackOrder,
      });

      if (!res.success) {
        setPayPalOutcomeView('failed');
        setStatusMessage({
          type: 'error',
          text: res.error || 'Failed to start PayPal checkout.',
        });
        return;
      }

      if (res.approvalUrl && res.approvalUrl.startsWith('https://')) {
        // Real PayPal approval redirect URL from Subscriptions API or Orders v2
        setPendingApproval({
          subscriptionId: res.subscriptionId,
          orderId: res.orderId,
          approvalUrl: res.approvalUrl,
          strategy: res.strategy || 'subscriptions_api',
          planType: selectedPlanType,
        });
        window.location.assign(res.approvalUrl);
        return;
      }

      // Sandbox simulation when PayPal merchant REST credentials aren't configured in env yet
      setPendingApproval({
        subscriptionId: res.subscriptionId,
        orderId: res.orderId,
        approvalUrl: null,
        strategy: res.strategy || 'sandbox_simulation',
        planType: selectedPlanType,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmSandboxApproval = async () => {
    if (!pendingApproval?.subscriptionId) return;
    setIsProcessing(true);
    setStatusMessage(null);
    try {
      const res = await verifyPayPalSubscription({
        subscriptionId: pendingApproval.subscriptionId,
        planType: pendingApproval.planType,
        sandboxSimulatedApproval: pendingApproval.strategy === 'sandbox_simulation',
      });
      if (res.success) {
        setPendingApproval(null);
        setStatusMessage({
          type: 'success',
          text: 'PayPal Sandbox subscription verified on backend and synced to Firestore!',
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: res.error || 'PayPal verification failed.',
        });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelSubscriptionConfirm = async () => {
    setIsCanceling(true);
    setStatusMessage(null);
    try {
      const res = await cancelSubscription(cancelReason);
      if (res.success) {
        setIsCancelModalOpen(false);
        setStatusMessage({
          type: 'info',
          text:
            res.message ||
            'Your PayPal subscription has been cancelled. Verified Pro access remains active until your paid-through date.',
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: res.error || 'Failed to cancel subscription.',
        });
      }
    } finally {
      setIsCanceling(false);
    }
  };

  const renderStatusBadge = (status: string) => {
    const normalized = status.toUpperCase();
    if (normalized === 'ACTIVE') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-950/70 text-emerald-300 border border-emerald-500/40">
          <CheckCircle2 className="w-3 h-3" /> ACTIVE PRO
        </span>
      );
    }
    if (normalized === 'CANCELED_PENDING_EXPIRATION' || normalized === 'CANCELLED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-950/70 text-amber-300 border border-amber-500/40">
          <Calendar className="w-3 h-3" /> CANCELLED (PAID-THROUGH)
        </span>
      );
    }
    if (
      normalized === 'PAYMENT_FAILED' ||
      normalized === 'SUSPENDED' ||
      normalized === 'EXPIRED' ||
      normalized === 'REFUNDED' ||
      normalized === 'REVERSED'
    ) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-950/70 text-rose-300 border border-rose-500/40">
          <XCircle className="w-3 h-3" /> {normalized}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
        FREE TIER
      </span>
    );
  };

  return (
    <div id="payment-system-root" className="w-full space-y-6 text-slate-100">
      {/* Top Branded Header */}
      <div className="bg-[#121422] border border-[#8E6D28]/40 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#003087] via-[#0070BA] to-[#009CDE] flex items-center justify-center text-white shadow-md shrink-0">
            <Crown className="w-5 h-5 text-[#F3E5AB]" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-cinzel text-lg sm:text-xl font-black text-[#F3E5AB] tracking-wide">
                {isTigrinya ? 'ልዑላዊ ክፍሊት ብPayPal' : 'Axumite Pro PayPal Billing'}
              </h2>
              <span
                className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                  paypalConfig.mode === 'live'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                }`}
              >
                {paypalConfig.mode === 'live' ? 'PayPal Live' : 'PayPal Sandbox Mode'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {isTigrinya
                ? 'ዓለምለኻዊ ውሑስ ወርሓውን ዓመታውን ምዝገባ ብPayPal ጥራይ።'
                : 'Verified recurring Pro subscriptions powered exclusively by PayPal & Firebase Admin.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void refreshSubscriptionStatus()}
          disabled={isLoadingStatus}
          className="px-3.5 py-2 rounded-xl bg-[#1A1E33] hover:bg-[#242945] border border-slate-700 text-xs font-bold text-slate-200 flex items-center gap-2 cursor-pointer transition-colors disabled:opacity-60"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isLoadingStatus ? 'animate-spin' : ''}`} />
          <span>{isLoadingStatus ? 'Syncing...' : 'Sync Status'}</span>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5 overflow-x-auto">
        <button
          id="tab-paypal-upgrade"
          type="button"
          onClick={() => setActiveTab('checkout')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer shrink-0 ${
            activeTab === 'checkout'
              ? 'bg-gradient-to-r from-[#8E6D28] to-[#C5A059] text-black shadow-lg shadow-amber-500/20'
              : 'bg-[#151828] text-slate-300 hover:bg-[#1E2338]'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>{isTigrinya ? 'ናብ PRO ዕበ (Upgrade)' : 'Upgrade to Pro'}</span>
        </button>

        <button
          id="tab-paypal-subscription"
          type="button"
          onClick={() => setActiveTab('subscription')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer shrink-0 ${
            activeTab === 'subscription'
              ? 'bg-gradient-to-r from-[#8E6D28] to-[#C5A059] text-black shadow-lg shadow-amber-500/20'
              : 'bg-[#151828] text-slate-300 hover:bg-[#1E2338]'
          }`}
        >
          <Crown className="w-4 h-4" />
          <span>{isTigrinya ? 'ምዝገባይ (Manage Plan)' : 'Manage Subscription'}</span>
          {isProOrHigher && <span className="w-2 h-2 rounded-full bg-emerald-400" />}
        </button>

        <button
          id="tab-paypal-history"
          type="button"
          onClick={() => setActiveTab('invoices')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer shrink-0 ${
            activeTab === 'invoices'
              ? 'bg-gradient-to-r from-[#8E6D28] to-[#C5A059] text-black shadow-lg shadow-amber-500/20'
              : 'bg-[#151828] text-slate-300 hover:bg-[#1E2338]'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>{isTigrinya ? 'ታሪኽ ክፍሊት (Billing History)' : 'Billing History'}</span>
          {billingHistory.length > 0 && (
            <span className="bg-[#1A1E33] text-[#F3E5AB] text-[10px] font-mono px-1.5 py-0.2 rounded-full">
              {billingHistory.length}
            </span>
          )}
        </button>
      </div>

      {/* Confirmation Screen after Verified PayPal Activation */}
      {paypalOutcomeView === 'confirmed' && (
        <div
          id="paypal-confirmation-card"
          className="bg-emerald-950/50 border border-emerald-500/50 rounded-2xl p-6 space-y-4 shadow-xl"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white font-cinzel">
                  Subscription Confirmed & Verified
                </h3>
                <p className="text-xs text-emerald-200">
                  PayPal payment confirmed on our server. All 6 Axumite Pro translator features are unlocked.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPayPalOutcomeView('none')}
              className="text-xs text-slate-400 hover:text-white cursor-pointer"
            >
              Dismiss
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-[#0B1410]/80 p-4 rounded-xl border border-emerald-500/20">
            <div>
              <span className="text-slate-400 block">Plan</span>
              <strong className="text-white">{subscription.planName}</strong>
            </div>
            <div>
              <span className="text-slate-400 block">PayPal Subscription ID</span>
              <strong className="font-mono text-emerald-300">
                {paypalSubscription?.paypalSubscriptionId || 'Verified'}
              </strong>
            </div>
            <div>
              <span className="text-slate-400 block">Next Billing Date</span>
              <strong className="text-white">{subscription.renewsAt}</strong>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setPayPalOutcomeView('none');
                setActiveTab('subscription');
              }}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
            >
              View Subscription Details
            </button>
            <button
              type="button"
              onClick={() => {
                setPayPalOutcomeView('none');
                setActiveTab('invoices');
              }}
              className="px-4 py-2 rounded-xl bg-[#151828] hover:bg-[#1E2338] border border-slate-700 text-slate-200 text-xs font-bold cursor-pointer"
            >
              View Billing History
            </button>
          </div>
        </div>
      )}

      {/* Payment Failed / Cancelled Recovery Screen */}
      {(paypalOutcomeView === 'failed' || paypalOutcomeView === 'cancelled') && (
        <div
          id="paypal-failed-card"
          className="bg-rose-950/40 border border-rose-500/50 rounded-2xl p-6 space-y-4 shadow-xl"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-400/40 flex items-center justify-center">
                <AlertCircle className="w-7 h-7 text-rose-400" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white font-cinzel">
                  {paypalOutcomeView === 'cancelled'
                    ? 'PayPal Checkout Cancelled'
                    : 'PayPal Payment Verification Failed'}
                </h3>
                <p className="text-xs text-rose-200 mt-0.5">
                  {lastPaymentError ||
                    'No verified PayPal payment was completed. Pro access was not activated.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setPayPalOutcomeView('none');
                clearPaymentError();
              }}
              className="text-xs text-slate-400 hover:text-white cursor-pointer"
            >
              Dismiss
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              setPayPalOutcomeView('none');
              clearPaymentError();
              setActiveTab('checkout');
            }}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#0070BA] to-[#005EA6] text-white text-xs font-bold cursor-pointer inline-flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry PayPal Checkout</span>
          </button>
        </div>
      )}

      {/* Status Toast */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between space-x-3 text-xs ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-200'
              : statusMessage.type === 'error'
              ? 'bg-rose-950/70 border-rose-500/50 text-rose-200'
              : 'bg-sky-950/70 border-sky-500/50 text-sky-200'
          }`}
        >
          <div className="flex items-center space-x-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-slate-400 hover:text-white cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* ===================================================================== */}
      {/* VIEW 1: UPGRADE TO PRO & PAYPAL CHECKOUT                              */}
      {/* ===================================================================== */}
      {activeTab === 'checkout' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
          {/* Left Column: Plan Selection + Pro Features */}
          <div className="lg:col-span-7 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Plan 1: Axumite Pro Monthly */}
              <button
                id="plan-card-pro-monthly"
                type="button"
                onClick={() => setSelectedPlanType('pro_monthly')}
                className={`text-left rounded-2xl p-5 border transition-all cursor-pointer flex flex-col justify-between ${
                  selectedPlanType === 'pro_monthly'
                    ? 'bg-gradient-to-b from-[#1C182F] to-[#120F20] border-[#C5A059] ring-2 ring-amber-500/40 shadow-xl'
                    : 'bg-[#0E101D] border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                      Monthly Recurring
                    </span>
                    {selectedPlanType === 'pro_monthly' && (
                      <CheckCircle2 className="w-4 h-4 text-amber-400" />
                    )}
                  </div>
                  <h3 className="font-cinzel text-lg font-black text-[#F3E5AB]">
                    {monthlyPlan.name}
                  </h3>
                  <div className="flex items-baseline gap-1 pt-1">
                    <span className="text-3xl font-black text-white font-mono">
                      {formatMoney(monthlyPlan.amount, monthlyPlan.currency)}
                    </span>
                    <span className="text-xs text-slate-400">/ month</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Automatic monthly PayPal billing. Cancel anytime before renewal.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-emerald-400 font-semibold">
                  All 6 Pro Translator Features Included
                </div>
              </button>

              {/* Plan 2: Axumite Pro Yearly */}
              <button
                id="plan-card-pro-yearly"
                type="button"
                onClick={() => setSelectedPlanType('pro_yearly')}
                className={`relative text-left rounded-2xl p-5 border transition-all cursor-pointer flex flex-col justify-between ${
                  selectedPlanType === 'pro_yearly'
                    ? 'bg-gradient-to-b from-[#1C182F] to-[#120F20] border-[#C5A059] ring-2 ring-amber-500/40 shadow-xl'
                    : 'bg-[#0E101D] border-slate-800 hover:border-slate-700'
                }`}
              >
                <span className="absolute -top-2.5 right-4 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow">
                  Save {yearlySavingsPct}%
                </span>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                      Annual Recurring
                    </span>
                    {selectedPlanType === 'pro_yearly' && (
                      <CheckCircle2 className="w-4 h-4 text-amber-400" />
                    )}
                  </div>
                  <h3 className="font-cinzel text-lg font-black text-[#F3E5AB]">
                    {yearlyPlan.name}
                  </h3>
                  <div className="flex items-baseline gap-1 pt-1">
                    <span className="text-3xl font-black text-white font-mono">
                      {formatMoney(yearlyPlan.amount, yearlyPlan.currency)}
                    </span>
                    <span className="text-xs text-slate-400">/ year</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Best value: {formatMoney(yearlyPlan.amount / 12, yearlyPlan.currency)}/mo billed annually via PayPal.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-emerald-400 font-semibold">
                  Priority Pro Routing + Full Suite
                </div>
              </button>
            </div>

            {/* 6 Pro Features Card */}
            <div className="bg-[#0E101D] border border-slate-800 rounded-2xl p-5 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#F3E5AB]">
                Included in Axumite Pro (Monthly & Yearly)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-200">
                {PRO_FEATURE_LIST.map((feat) => (
                  <div key={feat.id} className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{isTigrinya ? feat.labelTi : feat.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: PayPal Checkout Box & Instructions */}
          <div className="lg:col-span-5 bg-[#121422] border border-[#8E6D28]/40 rounded-2xl p-5 sm:p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
              <div>
                <h3 className="text-base font-bold font-cinzel text-[#F3E5AB] flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-400" />
                  <span>PayPal Checkout</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {activePlan.name} —{' '}
                  <strong className="text-emerald-300 font-mono">
                    {formatMoney(activePlan.amount, activePlan.currency)}
                  </strong>{' '}
                  / {activePlan.billingFrequency === 'YEAR' ? 'year' : 'month'}
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-[#003087]/40 border border-[#0070BA]/50 text-[#7AD0FF] text-[10px] font-black uppercase">
                PayPal Only
              </span>
            </div>

            {!user?.isLoggedIn && (
              <div className="bg-amber-950/40 border border-amber-500/40 rounded-xl p-4 space-y-3">
                <p className="text-xs text-amber-200 leading-relaxed">
                  Sign in with your Google / Firebase account before completing PayPal checkout so your subscription can be securely bound to your account UID.
                </p>
                <button
                  type="button"
                  onClick={() =>
                    onOpenAuthModal?.('login', 'Sign in to link your PayPal Pro subscription to your account.')
                  }
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#8E6D28] to-[#C5A059] text-black text-xs font-black flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In to Continue with PayPal</span>
                </button>
              </div>
            )}

            {/* Official PayPal JS SDK Buttons container when client ID is configured */}
            {user?.isLoggedIn && paypalConfig.clientId && (
              <div className="space-y-2">
                <div ref={paypalButtonsContainerRef} id="paypal-smart-buttons-container" className="min-h-[48px]" />
                {!sdkLoaded && sdkRenderError && (
                  <p className="text-[11px] text-amber-300">{sdkRenderError}</p>
                )}
              </div>
            )}

            {/* Merchant API / Fallback Strategy Notice */}
            {paypalConfig.capability.limitationNote && (
              <div className="bg-sky-950/40 border border-sky-500/30 rounded-xl p-3 text-[11px] text-sky-200 flex items-start gap-2">
                <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <span>{paypalConfig.capability.limitationNote}</span>
              </div>
            )}

            {paypalConfig.enableOneTimeFallback && (
              <label className="flex items-center justify-between gap-2 bg-[#0E101D] border border-slate-800 rounded-xl px-3.5 py-2.5 cursor-pointer text-xs">
                <span className="text-slate-300">
                  Use one-time PayPal Orders fallback (if recurring Subscriptions API is restricted)
                </span>
                <input
                  type="checkbox"
                  checked={preferFallbackOrder}
                  onChange={(e) => setPreferFallbackOrder(e.target.checked)}
                  className="rounded text-sky-500 cursor-pointer"
                />
              </label>
            )}

            {/* Server-Initiated PayPal Checkout Button */}
            <button
              id="btn-paypal-subscribe"
              type="button"
              disabled={isProcessing}
              onClick={handleStartServerCheckout}
              className="w-full py-3.5 px-5 rounded-xl bg-gradient-to-r from-[#003087] via-[#0070BA] to-[#005EA6] hover:brightness-110 text-white font-black text-sm shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-60"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Connecting to PayPal...</span>
                </>
              ) : (
                <>
                  <span>
                    {selectedPlanType === 'pro_yearly'
                      ? `Subscribe Yearly via PayPal (${formatMoney(yearlyPlan.amount, yearlyPlan.currency)}/yr)`
                      : `Subscribe Monthly via PayPal (${formatMoney(monthlyPlan.amount, monthlyPlan.currency)}/mo)`}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Pending Sandbox Approval Step (requires explicit approval + server verification) */}
            {pendingApproval && !pendingApproval.approvalUrl && (
              <div
                id="paypal-sandbox-approval-box"
                className="bg-[#0B1220] border border-sky-500/50 rounded-xl p-4 space-y-3"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-sky-300">PayPal Sandbox Approval Session</span>
                  <span className="font-mono text-[10px] text-slate-400">
                    {pendingApproval.subscriptionId || pendingApproval.orderId}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Approve this Sandbox checkout to trigger server-side PayPal subscription verification and Firestore entitlement synchronization.
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    id="btn-confirm-sandbox-paypal"
                    type="button"
                    disabled={isProcessing}
                    onClick={handleConfirmSandboxApproval}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer disabled:opacity-60"
                  >
                    Approve & Verify in Sandbox
                  </button>
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => {
                      setPendingApproval(null);
                      setPayPalOutcomeView('cancelled');
                    }}
                    className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Secure Checkout Instructions */}
            <div className="bg-[#0E101D] border border-slate-800 rounded-xl p-4 space-y-2 text-[11px] text-slate-400">
              <div className="flex items-center gap-1.5 text-slate-200 font-bold">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Secure Checkout Instructions</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 leading-relaxed">
                <li>Select Monthly ({formatMoney(monthlyPlan.amount, monthlyPlan.currency)}/mo) or Yearly ({formatMoney(yearlyPlan.amount, yearlyPlan.currency)}/yr).</li>
                <li>Authorize payment securely through PayPal. Private credentials never leave our server.</li>
                <li>Pro access unlocks only after server verification with PayPal or a signed PayPal webhook event.</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* VIEW 2: MANAGE SUBSCRIPTION                                           */}
      {/* ===================================================================== */}
      {activeTab === 'subscription' && (
        <div className="bg-[#121422] border border-[#8E6D28]/40 rounded-2xl p-6 space-y-6 shadow-xl animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400">
                Current Plan & PayPal Status
              </span>
              <div className="flex flex-wrap items-center gap-3 mt-1">
                <h3 className="font-cinzel text-xl font-black text-[#F3E5AB]">
                  {subscription.planName}
                </h3>
                {renderStatusBadge(subscription.status)}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!isProOrHigher ? (
                <button
                  type="button"
                  onClick={() => setActiveTab('checkout')}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#8E6D28] to-[#C5A059] text-black text-xs font-black cursor-pointer"
                >
                  Upgrade to Pro
                </button>
              ) : (
                subscription.autoRenew && (
                  <button
                    id="btn-open-cancel-subscription"
                    type="button"
                    onClick={() => setIsCancelModalOpen(true)}
                    className="px-4 py-2.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/70 border border-rose-500/40 text-rose-200 text-xs font-bold cursor-pointer"
                  >
                    Cancel Subscription
                  </button>
                )
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="bg-[#0E101D] border border-slate-800 rounded-xl p-4 space-y-1">
              <span className="text-slate-400 block">Billing Amount</span>
              <strong className="text-base font-mono text-white">
                {subscription.amount > 0
                  ? `${formatMoney(subscription.amount, subscription.currency)} / ${
                      subscription.billingCycle === 'yearly' ? 'year' : 'month'
                    }`
                  : 'Free'}
              </strong>
            </div>
            <div className="bg-[#0E101D] border border-slate-800 rounded-xl p-4 space-y-1">
              <span className="text-slate-400 block">
                {subscription.status === 'CANCELED_PENDING_EXPIRATION' || subscription.status === 'CANCELLED'
                  ? 'Paid-Through Date'
                  : 'Next Billing Date'}
              </span>
              <strong className="text-base text-white">{subscription.renewsAt}</strong>
            </div>
            <div className="bg-[#0E101D] border border-slate-800 rounded-xl p-4 space-y-1">
              <span className="text-slate-400 block">PayPal Subscription ID</span>
              <strong className="font-mono text-amber-300 break-all">
                {subscription.paypalSubscriptionId || 'None'}
              </strong>
            </div>
            <div className="bg-[#0E101D] border border-slate-800 rounded-xl p-4 space-y-1">
              <span className="text-slate-400 block">Active Pro Entitlements</span>
              <strong className="text-emerald-300">
                {paypalEntitlement.isPro ? `${paypalEntitlement.features.length} / 6 Unlocked` : 'Free Features Only'}
              </strong>
            </div>
          </div>

          {paypalSubscription?.cancelAtPeriodEnd && paypalEntitlement.isPro && (
            <div className="bg-amber-950/40 border border-amber-500/40 rounded-xl p-4 text-xs text-amber-200 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                Your subscription is cancelled and will not renew. Pro access remains active through{' '}
                <strong>{subscription.renewsAt}</strong>.
              </span>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* VIEW 3: BILLING HISTORY                                               */}
      {/* ===================================================================== */}
      {activeTab === 'invoices' && (
        <div className="bg-[#121422] border border-[#8E6D28]/40 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-cinzel text-base font-bold text-[#F3E5AB]">PayPal Billing History</h3>
              <p className="text-xs text-slate-400">
                Verified PayPal payments & webhook settlement ledger for your account.
              </p>
            </div>
          </div>

          {subscription.invoices.length === 0 ? (
            <div className="bg-[#0E101D] border border-slate-800 rounded-xl p-8 text-center text-xs text-slate-400">
              No PayPal transactions recorded for this account yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-200">
                <thead className="bg-[#0E101D] border-b border-slate-800 text-[10px] uppercase tracking-wider text-amber-300">
                  <tr>
                    <th className="py-3 px-4">Transaction ID</th>
                    <th className="py-3 px-4">Plan</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {subscription.invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-[#171A2C]">
                      <td className="py-3 px-4 font-mono text-[11px] text-[#F3E5AB]">{inv.invoiceNumber}</td>
                      <td className="py-3 px-4 font-semibold">{inv.planName}</td>
                      <td className="py-3 px-4 text-slate-400">{inv.date}</td>
                      <td className="py-3 px-4 font-mono font-bold text-white">
                        {formatMoney(inv.amount, inv.currency)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            inv.status === 'PAID'
                              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                              : inv.status === 'FAILED' || inv.status === 'REFUNDED'
                              ? 'bg-rose-950/60 text-rose-300 border-rose-500/40'
                              : 'bg-amber-950/60 text-amber-300 border-amber-500/40'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedInvoice(inv)}
                          className="px-2.5 py-1 rounded-lg bg-[#1A1E33] hover:bg-[#252A47] border border-slate-700 text-xs text-slate-200 cursor-pointer inline-flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Cancel Subscription Confirmation Modal */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121422] border border-rose-500/50 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-rose-400" />
              <span>Cancel PayPal Subscription</span>
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Your recurring PayPal billing will stop immediately. If your current period is already paid, your Pro access remains active through{' '}
              <strong className="text-white">{subscription.renewsAt}</strong>.
            </p>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Cancellation Reason</label>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full bg-[#0E101D] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold cursor-pointer"
              >
                Keep Subscription
              </button>
              <button
                id="btn-confirm-cancel-subscription"
                type="button"
                disabled={isCanceling}
                onClick={handleCancelSubscriptionConfirm}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer disabled:opacity-60"
              >
                {isCanceling ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedInvoice && (
        <InvoiceReceiptModal
          isOpen={Boolean(selectedInvoice)}
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
      )}
    </div>
  );
};
