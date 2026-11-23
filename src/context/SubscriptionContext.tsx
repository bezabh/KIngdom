import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { UserProfile, UserRole, SupportedCurrency } from '../types';
import { isAdminOrCreator } from '../lib/permissions';
import { getFirebaseIdToken } from '../lib/firebase';
import { useAuthUser } from './AuthUserContext';
import {
  authorizedPayPalFetch,
  fetchPayPalPublicConfig,
  type PayPalMode,
  type PayPalPlanType,
  type PayPalPublicConfig,
} from '../lib/paypalClient';

export type SubscriptionTier = 'free' | 'pro';
export type SubscriptionStatus =
  | 'ACTIVE'
  | 'APPROVAL_PENDING'
  | 'APPROVED'
  | 'CANCELED_PENDING_EXPIRATION'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'SUSPENDED'
  | 'PAYMENT_FAILED'
  | 'REFUNDED'
  | 'REVERSED'
  | 'NONE';

export type BillingCycle = 'monthly' | 'yearly' | 'free';
export type PaymentProviderKind = 'paypal';
export type ProFeatureKey =
  | 'video_dubbing'
  | 'unlimited_chat'
  | 'calligraphy_4k'
  | 'legal_ai'
  | 'mechanic_ai'
  | 'ocr_docs';

export interface InvoiceItem {
  id: string;
  invoiceNumber: string;
  orderId: string;
  date: string;
  planName: string;
  billingCycle: BillingCycle;
  amount: number;
  currency: string;
  paymentMethod: string;
  status: 'PAID' | 'REFUNDED' | 'FAILED' | 'PENDING';
  downloadUrl: string;
  vatAmount: number;
  subtotal: number;
  provider: 'paypal';
}

export interface PayPalSubscriptionSnapshot {
  uid: string;
  provider: 'paypal';
  paypalSubscriptionId: string;
  paypalPlanId: string;
  planType: PayPalPlanType;
  status: string;
  currency: string;
  amount: number;
  billingFrequency: 'MONTH' | 'YEAR';
  startDate: string;
  nextBillingDate: string | null;
  cancelAtPeriodEnd: boolean;
  cancellationReason?: string;
  mode: PayPalMode;
  integrationMethod: 'subscriptions_api' | 'orders_v2_fallback' | 'sandbox_local';
  updatedAt: string;
}

export interface PayPalPaymentHistoryItem {
  uid: string;
  email: string;
  provider: 'paypal';
  paypalTransactionId: string;
  paypalSubscriptionId: string;
  planType: PayPalPlanType;
  amount: number;
  currency: string;
  paymentStatus: 'COMPLETED' | 'PENDING' | 'FAILED' | 'REFUNDED' | 'REVERSED';
  paymentDate: string;
  mode: PayPalMode;
}

export interface PayPalEntitlementState {
  uid: string;
  plan: 'free' | 'pro';
  isPro: boolean;
  features: ProFeatureKey[];
  subscriptionStatus: SubscriptionStatus;
  expiresAt: string | null;
  updatedAt: string;
  entitlementSignature: string;
}

export interface SubscriptionState {
  tier: SubscriptionTier;
  planName: string;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  amount: number;
  currency: SupportedCurrency;
  startedAt: string;
  renewsAt: string;
  nextBillingDateIso: string | null;
  trialEndsAt: string | null;
  autoRenew: boolean;
  paypalSubscriptionId: string | null;
  paypalPlanId: string | null;
  paymentMethod: {
    provider: 'paypal';
    label: string;
  };
  entitlementSignature: string;
  invoices: InvoiceItem[];
}

export type PayPalOutcomeView = 'none' | 'confirmed' | 'failed' | 'cancelled';

interface SubscriptionContextType {
  subscription: SubscriptionState;
  paypalConfig: PayPalPublicConfig;
  paypalEntitlement: PayPalEntitlementState;
  paypalSubscription: PayPalSubscriptionSnapshot | null;
  billingHistory: PayPalPaymentHistoryItem[];
  selectedPlanType: PayPalPlanType;
  setSelectedPlanType: (planType: PayPalPlanType) => void;
  selectedCurrency: SupportedCurrency;
  setSelectedCurrency: (currency: SupportedCurrency) => void;
  isProOrHigher: boolean;
  isEnterprise: boolean;
  isTrialing: boolean;
  isLoadingStatus: boolean;
  lastPaymentError: string | null;
  clearPaymentError: () => void;
  paypalOutcomeView: PayPalOutcomeView;
  setPayPalOutcomeView: (view: PayPalOutcomeView) => void;
  canAccess: (feature: ProFeatureKey) => boolean;
  createPayPalCheckout: (params: {
    planType: PayPalPlanType;
    preferFallbackOrder?: boolean;
  }) => Promise<{
    success: boolean;
    mode?: PayPalMode;
    strategy?: 'subscriptions_api' | 'orders_v2_fallback' | 'sandbox_simulation';
    subscriptionId?: string | null;
    orderId?: string | null;
    paypalPlanId?: string;
    approvalUrl?: string | null;
    amount?: number;
    currency?: string;
    error?: string;
  }>;
  verifyPayPalSubscription: (params: {
    subscriptionId: string;
    planType?: PayPalPlanType;
    sandboxSimulatedApproval?: boolean;
  }) => Promise<{ success: boolean; error?: string }>;
  capturePayPalOrder: (params: {
    orderId: string;
    planType?: PayPalPlanType;
  }) => Promise<{ success: boolean; error?: string }>;
  cancelSubscription: (reason?: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  refreshSubscriptionStatus: () => Promise<boolean>;
  verifyBackendEntitlement: () => Promise<boolean>;
  restorePurchases: () => Promise<{ success: boolean; restoredCount: number; message: string }>;
  activePaywallFeature: string | null;
  openPaywall: (featureName?: string) => void;
  closePaywall: () => void;
}

const DEFAULT_PAYPAL_CONFIG: PayPalPublicConfig = {
  provider: 'paypal',
  mode: 'sandbox',
  liveEnabled: false,
  configured: false,
  clientId: null,
  webhookConfigured: false,
  currency: 'EUR',
  enableOneTimeFallback: true,
  plans: {
    pro_monthly: {
      planType: 'pro_monthly',
      name: 'Axumite Pro Monthly',
      description: 'Monthly recurring access to all 6 Axumite AI Pro features.',
      amount: 9.99,
      currency: 'EUR',
      billingFrequency: 'MONTH',
      intervalCount: 1,
      paypalPlanId: '',
      features: ['video_dubbing', 'unlimited_chat', 'calligraphy_4k', 'legal_ai', 'mechanic_ai', 'ocr_docs'],
    },
    pro_yearly: {
      planType: 'pro_yearly',
      name: 'Axumite Pro Yearly',
      description: 'Annual recurring access to all 6 Axumite AI Pro features.',
      amount: 79.99,
      currency: 'EUR',
      billingFrequency: 'YEAR',
      intervalCount: 1,
      paypalPlanId: '',
      features: ['video_dubbing', 'unlimited_chat', 'calligraphy_4k', 'legal_ai', 'mechanic_ai', 'ocr_docs'],
    },
  },
  capability: {
    mode: 'sandbox',
    clientConfigured: false,
    webhookConfigured: false,
    subscriptionsApiEligible: false,
    ordersApiFallbackReady: true,
    activeStrategy: 'sandbox_simulation',
  },
};

const DEFAULT_ENTITLEMENT: PayPalEntitlementState = {
  uid: 'guest',
  plan: 'free',
  isPro: false,
  features: [],
  subscriptionStatus: 'NONE',
  expiresAt: null,
  updatedAt: new Date().toISOString(),
  entitlementSignature: '',
};

const DEFAULT_FREE_SUBSCRIPTION: SubscriptionState = {
  tier: 'free',
  planName: 'Axumite Free Explorer',
  status: 'NONE',
  billingCycle: 'free',
  amount: 0,
  currency: 'EUR',
  startedAt: new Date().toISOString(),
  renewsAt: 'Free Tier',
  nextBillingDateIso: null,
  trialEndsAt: null,
  autoRenew: false,
  paypalSubscriptionId: null,
  paypalPlanId: null,
  paymentMethod: {
    provider: 'paypal',
    label: 'PayPal Account',
  },
  entitlementSignature: '',
  invoices: [],
};

const CURRENCY_STORAGE_KEY = 'axumite_selected_currency_v2';
const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

function mapBillingStatus(rawStatus: string | undefined, cancelAtPeriodEnd?: boolean): SubscriptionStatus {
  const s = (rawStatus || 'NONE').toUpperCase();
  if (s === 'ACTIVE' && cancelAtPeriodEnd) return 'CANCELED_PENDING_EXPIRATION';
  if (
    s === 'ACTIVE' ||
    s === 'APPROVAL_PENDING' ||
    s === 'APPROVED' ||
    s === 'CANCELLED' ||
    s === 'EXPIRED' ||
    s === 'SUSPENDED' ||
    s === 'PAYMENT_FAILED' ||
    s === 'REFUNDED' ||
    s === 'REVERSED'
  ) {
    return s;
  }
  return 'NONE';
}

function mapHistoryToInvoices(history: PayPalPaymentHistoryItem[]): InvoiceItem[] {
  return history.map((item, idx) => {
    const amount = Number(item.amount || 0);
    const subtotal = Number((amount * 0.85).toFixed(2));
    const vatAmount = Number((amount - subtotal).toFixed(2));
    const statusMap: Record<PayPalPaymentHistoryItem['paymentStatus'], InvoiceItem['status']> = {
      COMPLETED: 'PAID',
      REFUNDED: 'REFUNDED',
      REVERSED: 'REFUNDED',
      FAILED: 'FAILED',
      PENDING: 'PENDING',
    };
    return {
      id: item.paypalTransactionId || `pp-inv-${idx}`,
      invoiceNumber: item.paypalTransactionId || `PP-${idx + 1}`,
      orderId: item.paypalSubscriptionId,
      date: new Date(item.paymentDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
      planName: item.planType === 'pro_yearly' ? 'Axumite Pro Yearly' : 'Axumite Pro Monthly',
      billingCycle: item.planType === 'pro_yearly' ? 'yearly' : 'monthly',
      amount,
      currency: item.currency || 'EUR',
      paymentMethod: `PayPal (${item.mode.toUpperCase()})`,
      status: statusMap[item.paymentStatus] || 'PENDING',
      downloadUrl: `#paypal-receipt-${item.paypalTransactionId}`,
      vatAmount,
      subtotal,
      provider: 'paypal',
    };
  });
}

export const SubscriptionProvider: React.FC<{
  children: React.ReactNode;
  user?: UserProfile;
  onUpdateUserRole?: (role: UserRole) => void;
}> = ({ children, user: propUser, onUpdateUserRole }) => {
  const { user: authUser } = useAuthUser();
  const user = propUser ?? authUser;

  const [selectedPlanType, setSelectedPlanType] = useState<PayPalPlanType>('pro_monthly');
  const [selectedCurrency, setSelectedCurrencyState] = useState<SupportedCurrency>(() => {
    try {
      const stored = localStorage.getItem(CURRENCY_STORAGE_KEY);
      if (stored) return stored as SupportedCurrency;
    } catch {}
    return 'EUR';
  });

  const setSelectedCurrency = useCallback((c: SupportedCurrency) => {
    setSelectedCurrencyState(c);
    try {
      localStorage.setItem(CURRENCY_STORAGE_KEY, c);
    } catch {}
  }, []);

  const [paypalConfig, setPayPalConfig] = useState<PayPalPublicConfig>(DEFAULT_PAYPAL_CONFIG);
  const [paypalEntitlement, setPayPalEntitlement] = useState<PayPalEntitlementState>(DEFAULT_ENTITLEMENT);
  const [paypalSubscription, setPayPalSubscription] = useState<PayPalSubscriptionSnapshot | null>(null);
  const [billingHistory, setBillingHistory] = useState<PayPalPaymentHistoryItem[]>([]);
  const [isLoadingStatus, setIsLoadingStatus] = useState<boolean>(false);
  const [lastPaymentError, setLastPaymentError] = useState<string | null>(null);
  const [paypalOutcomeView, setPayPalOutcomeView] = useState<PayPalOutcomeView>('none');
  const [activePaywallFeature, setActivePaywallFeature] = useState<string | null>(null);

  const userRef = useRef(user);
  userRef.current = user;

  const clearPaymentError = useCallback(() => setLastPaymentError(null), []);

  const applyServerSnapshot = useCallback((data: any) => {
    if (data?.config) {
      setPayPalConfig(data.config);
      if (data.config.currency) {
        setSelectedCurrencyState((data.config.currency as SupportedCurrency) || 'EUR');
      }
    }
    if (data?.entitlement) {
      setPayPalEntitlement({
        uid: data.entitlement.uid || 'guest',
        plan: data.entitlement.plan === 'pro' ? 'pro' : 'free',
        isPro: Boolean(data.entitlement.isPro),
        features: Array.isArray(data.entitlement.features) ? data.entitlement.features : [],
        subscriptionStatus: mapBillingStatus(
          data.entitlement.subscriptionStatus,
          data.subscription?.cancelAtPeriodEnd
        ),
        expiresAt: data.entitlement.expiresAt || null,
        updatedAt: data.entitlement.updatedAt || new Date().toISOString(),
        entitlementSignature: data.entitlement.entitlementSignature || '',
      });
    }
    if ('subscription' in (data || {})) {
      setPayPalSubscription(data.subscription || null);
    }
    if (Array.isArray(data?.billingHistory)) {
      setBillingHistory(data.billingHistory);
    }
  }, []);

  const refreshSubscriptionStatus = useCallback(async (): Promise<boolean> => {
    setIsLoadingStatus(true);
    try {
      const token = await getFirebaseIdToken();
      if (!token) {
        const cfg = await fetchPayPalPublicConfig();
        setPayPalConfig(cfg);
        setPayPalEntitlement(DEFAULT_ENTITLEMENT);
        setPayPalSubscription(null);
        setBillingHistory([]);
        return false;
      }

      const { ok, data } = await authorizedPayPalFetch('/api/paypal/subscription-status');
      if (ok && data?.success) {
        applyServerSnapshot(data);
        return Boolean(data.entitlement?.isPro);
      }
      return false;
    } catch (err) {
      console.warn('Could not refresh PayPal subscription status:', err);
      return false;
    } finally {
      setIsLoadingStatus(false);
    }
  }, [applyServerSnapshot]);

  // Initial config + authenticated entitlement sync
  useEffect(() => {
    let active = true;
    fetchPayPalPublicConfig()
      .then((cfg) => {
        if (active) setPayPalConfig(cfg);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    void refreshSubscriptionStatus();
  }, [user?.id, user?.email, user?.isLoggedIn, refreshSubscriptionStatus]);

  // Handle PayPal redirect return parameters (`?paypal_status=success&subscription_id=...` or `&token=...` for Orders v2)
  useEffect(() => {
    if (typeof window === 'undefined' || !user?.isLoggedIn) return;
    const urlParams = new URLSearchParams(window.location.search);
    const ppStatus = urlParams.get('paypal_status');
    if (!ppStatus) return;

    const subscriptionId = urlParams.get('subscription_id');
    const orderToken = urlParams.get('token');

    const cleanUrl = () => {
      const nextUrl = window.location.pathname + (window.location.hash || '');
      window.history.replaceState({}, document.title, nextUrl);
    };

    if (ppStatus === 'cancelled') {
      setPayPalOutcomeView('cancelled');
      setLastPaymentError('PayPal checkout was cancelled before approval.');
      cleanUrl();
      return;
    }

    if (ppStatus === 'success') {
      if (subscriptionId) {
        void authorizedPayPalFetch('/api/paypal/verify-subscription', {
          method: 'POST',
          body: JSON.stringify({ subscriptionId }),
        })
          .then(({ ok, data }) => {
            if (ok && data?.success) {
              applyServerSnapshot(data);
              setPayPalOutcomeView(data.entitlement?.isPro ? 'confirmed' : 'failed');
              if (!data.entitlement?.isPro) {
                setLastPaymentError('PayPal subscription is not active yet. Please verify payment status.');
              } else {
                setLastPaymentError(null);
              }
            } else {
              setPayPalOutcomeView('failed');
              setLastPaymentError(data?.error || 'Could not verify PayPal subscription.');
            }
          })
          .finally(cleanUrl);
      } else if (orderToken) {
        void authorizedPayPalFetch('/api/paypal/capture-order', {
          method: 'POST',
          body: JSON.stringify({ orderId: orderToken }),
        })
          .then(({ ok, data }) => {
            if (ok && data?.success) {
              applyServerSnapshot(data);
              setPayPalOutcomeView(data.entitlement?.isPro ? 'confirmed' : 'failed');
              setLastPaymentError(null);
            } else {
              setPayPalOutcomeView('failed');
              setLastPaymentError(data?.error || 'PayPal order capture failed.');
            }
          })
          .finally(cleanUrl);
      } else {
        cleanUrl();
      }
    }
  }, [user?.isLoggedIn, applyServerSnapshot]);

  // Sync user role badge when verified entitlement changes
  useEffect(() => {
    if (!onUpdateUserRole) return;
    if (paypalEntitlement.isPro && user?.role !== 'Axumite Sovereign Scholar' && user?.role !== 'Creator' && user?.role !== 'Super Admin') {
      onUpdateUserRole('ኣክሱማይት AI Pro');
    }
  }, [paypalEntitlement.isPro, user?.role, onUpdateUserRole]);

  const createPayPalCheckout = useCallback(async (params: {
    planType: PayPalPlanType;
    preferFallbackOrder?: boolean;
  }) => {
    setLastPaymentError(null);
    const token = await getFirebaseIdToken();
    if (!token) {
      const msg = 'Please sign in with Google/Firebase before starting a PayPal subscription.';
      setLastPaymentError(msg);
      return { success: false, error: msg };
    }

    const { ok, data } = await authorizedPayPalFetch('/api/paypal/create-subscription', {
      method: 'POST',
      body: JSON.stringify({
        planType: params.planType,
        preferFallbackOrder: Boolean(params.preferFallbackOrder),
      }),
    });

    if (!ok || !data?.success) {
      const msg = data?.error || 'Failed to initiate PayPal checkout.';
      setLastPaymentError(msg);
      return { success: false, error: msg };
    }

    return {
      success: true,
      mode: data.mode,
      strategy: data.strategy,
      subscriptionId: data.subscriptionId,
      orderId: data.orderId,
      paypalPlanId: data.paypalPlanId,
      approvalUrl: data.approvalUrl,
      amount: data.amount,
      currency: data.currency,
    };
  }, []);

  const verifyPayPalSubscription = useCallback(
    async (params: {
      subscriptionId: string;
      planType?: PayPalPlanType;
      sandboxSimulatedApproval?: boolean;
    }): Promise<{ success: boolean; error?: string }> => {
      setLastPaymentError(null);
      const { ok, data } = await authorizedPayPalFetch('/api/paypal/verify-subscription', {
        method: 'POST',
        body: JSON.stringify(params),
      });

      if (!ok || !data?.success) {
        const msg = data?.error || 'PayPal subscription verification failed.';
        setLastPaymentError(msg);
        setPayPalOutcomeView('failed');
        return { success: false, error: msg };
      }

      applyServerSnapshot(data);
      if (data.entitlement?.isPro) {
        setPayPalOutcomeView('confirmed');
        setActivePaywallFeature(null);
        return { success: true };
      }

      const msg = `Subscription status is ${data.subscription?.status || 'NOT_ACTIVE'}.`;
      setLastPaymentError(msg);
      setPayPalOutcomeView('failed');
      return { success: false, error: msg };
    },
    [applyServerSnapshot]
  );

  const capturePayPalOrder = useCallback(
    async (params: { orderId: string; planType?: PayPalPlanType }): Promise<{ success: boolean; error?: string }> => {
      setLastPaymentError(null);
      const { ok, data } = await authorizedPayPalFetch('/api/paypal/capture-order', {
        method: 'POST',
        body: JSON.stringify(params),
      });

      if (!ok || !data?.success) {
        const msg = data?.error || 'PayPal order capture failed.';
        setLastPaymentError(msg);
        setPayPalOutcomeView('failed');
        return { success: false, error: msg };
      }

      applyServerSnapshot(data);
      if (data.entitlement?.isPro) {
        setPayPalOutcomeView('confirmed');
        setActivePaywallFeature(null);
        return { success: true };
      }

      const msg = 'Payment was not completed.';
      setLastPaymentError(msg);
      setPayPalOutcomeView('failed');
      return { success: false, error: msg };
    },
    [applyServerSnapshot]
  );

  const cancelSubscription = useCallback(
    async (reason: string = 'User requested cancellation'): Promise<{ success: boolean; error?: string; message?: string }> => {
      setLastPaymentError(null);
      const { ok, data } = await authorizedPayPalFetch('/api/paypal/cancel-subscription', {
        method: 'POST',
        body: JSON.stringify({
          subscriptionId: paypalSubscription?.paypalSubscriptionId,
          reason,
        }),
      });

      if (!ok || !data?.success) {
        const msg = data?.error || 'Failed to cancel PayPal subscription.';
        setLastPaymentError(msg);
        return { success: false, error: msg };
      }

      applyServerSnapshot(data);
      return { success: true, message: data.message };
    },
    [paypalSubscription?.paypalSubscriptionId, applyServerSnapshot]
  );

  const subscription = useMemo<SubscriptionState>(() => {
    if (!paypalSubscription && !paypalEntitlement.isPro) {
      return {
        ...DEFAULT_FREE_SUBSCRIPTION,
        currency: (paypalConfig.currency as SupportedCurrency) || 'EUR',
      };
    }

    const planType = paypalSubscription?.planType || 'pro_monthly';
    const nextIso = paypalSubscription?.nextBillingDate || paypalEntitlement.expiresAt || null;
    const formattedRenew = nextIso
      ? new Date(nextIso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : 'Never';

    return {
      tier: paypalEntitlement.isPro ? 'pro' : 'free',
      planName: planType === 'pro_yearly' ? 'Axumite Pro Yearly' : 'Axumite Pro Monthly',
      status: mapBillingStatus(
        paypalSubscription?.status || paypalEntitlement.subscriptionStatus,
        paypalSubscription?.cancelAtPeriodEnd
      ),
      billingCycle: planType === 'pro_yearly' ? 'yearly' : 'monthly',
      amount: paypalSubscription?.amount ?? (planType === 'pro_yearly' ? paypalConfig.plans.pro_yearly.amount : paypalConfig.plans.pro_monthly.amount),
      currency: ((paypalSubscription?.currency || paypalConfig.currency || 'EUR') as SupportedCurrency),
      startedAt: paypalSubscription?.startDate || paypalEntitlement.updatedAt,
      renewsAt: formattedRenew,
      nextBillingDateIso: nextIso,
      trialEndsAt: null,
      autoRenew: Boolean(paypalSubscription && !paypalSubscription.cancelAtPeriodEnd && paypalSubscription.status === 'ACTIVE'),
      paypalSubscriptionId: paypalSubscription?.paypalSubscriptionId || null,
      paypalPlanId: paypalSubscription?.paypalPlanId || null,
      paymentMethod: {
        provider: 'paypal',
        label: `PayPal (${(paypalSubscription?.mode || paypalConfig.mode).toUpperCase()})`,
      },
      entitlementSignature: paypalEntitlement.entitlementSignature,
      invoices: mapHistoryToInvoices(billingHistory),
    };
  }, [paypalSubscription, paypalEntitlement, paypalConfig, billingHistory]);

  const hasVerifiedAdminPrivilege = Boolean(user?.isLoggedIn) && isAdminOrCreator(user);
  const notExpired =
    !paypalEntitlement.expiresAt || new Date(paypalEntitlement.expiresAt).getTime() > Date.now();
  const isProOrHigher =
    user?.role !== 'Suspended' &&
    (hasVerifiedAdminPrivilege || (paypalEntitlement.isPro && notExpired));
  const isEnterprise =
    user?.role !== 'Suspended' &&
    Boolean(user?.isLoggedIn) &&
    (isAdminOrCreator(user) || user?.role === 'Axumite Sovereign Scholar');
  const isTrialing = false;

  const canAccess = useCallback(
    (feature: ProFeatureKey): boolean => {
      if (user?.role === 'Suspended') return false;
      if (hasVerifiedAdminPrivilege) return true;
      if (!paypalEntitlement.isPro || !notExpired) return false;
      const status = paypalEntitlement.subscriptionStatus;
      if (
        status === 'EXPIRED' ||
        status === 'SUSPENDED' ||
        status === 'PAYMENT_FAILED' ||
        status === 'REFUNDED' ||
        status === 'REVERSED'
      ) {
        return false;
      }
      return paypalEntitlement.features.includes(feature);
    },
    [user?.role, hasVerifiedAdminPrivilege, paypalEntitlement, notExpired]
  );

  const openPaywall = useCallback((featureName: string = 'Axumite Pro Feature') => {
    setActivePaywallFeature(featureName);
  }, []);

  const closePaywall = useCallback(() => {
    setActivePaywallFeature(null);
  }, []);

  const restorePurchases = useCallback(async () => {
    const active = await refreshSubscriptionStatus();
    return {
      success: true,
      restoredCount: active ? 1 : 0,
      message: active
        ? 'Verified PayPal Pro subscription restored from server.'
        : 'No active PayPal subscription found for this account.',
    };
  }, [refreshSubscriptionStatus]);

  const value = useMemo<SubscriptionContextType>(
    () => ({
      subscription,
      paypalConfig,
      paypalEntitlement,
      paypalSubscription,
      billingHistory,
      selectedPlanType,
      setSelectedPlanType,
      selectedCurrency,
      setSelectedCurrency,
      isProOrHigher,
      isEnterprise,
      isTrialing,
      isLoadingStatus,
      lastPaymentError,
      clearPaymentError,
      paypalOutcomeView,
      setPayPalOutcomeView,
      canAccess,
      createPayPalCheckout,
      verifyPayPalSubscription,
      capturePayPalOrder,
      cancelSubscription,
      refreshSubscriptionStatus,
      verifyBackendEntitlement: refreshSubscriptionStatus,
      restorePurchases,
      activePaywallFeature,
      openPaywall,
      closePaywall,
    }),
    [
      subscription,
      paypalConfig,
      paypalEntitlement,
      paypalSubscription,
      billingHistory,
      selectedPlanType,
      selectedCurrency,
      setSelectedCurrency,
      isProOrHigher,
      isEnterprise,
      isTrialing,
      isLoadingStatus,
      lastPaymentError,
      clearPaymentError,
      paypalOutcomeView,
      canAccess,
      createPayPalCheckout,
      verifyPayPalSubscription,
      capturePayPalOrder,
      cancelSubscription,
      refreshSubscriptionStatus,
      restorePurchases,
      activePaywallFeature,
      openPaywall,
      closePaywall,
    ]
  );

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

export const useOptionalSubscription = (): SubscriptionContextType | null => {
  return useContext(SubscriptionContext) ?? null;
};
