import { loadScript, type PayPalNamespace } from '@paypal/paypal-js';
import { getFirebaseIdToken } from './firebase';

export type PayPalPlanType = 'pro_monthly' | 'pro_yearly';
export type PayPalMode = 'sandbox' | 'live';

export interface PayPalPlanInfo {
  planType: PayPalPlanType;
  name: string;
  description: string;
  amount: number;
  currency: string;
  billingFrequency: 'MONTH' | 'YEAR';
  intervalCount: number;
  paypalPlanId: string;
  features: string[];
}

export interface PayPalPublicConfig {
  provider: 'paypal';
  mode: PayPalMode;
  liveEnabled: boolean;
  configured: boolean;
  clientId: string | null;
  webhookConfigured: boolean;
  currency: string;
  enableOneTimeFallback: boolean;
  plans: {
    pro_monthly: PayPalPlanInfo;
    pro_yearly: PayPalPlanInfo;
  };
  capability: {
    mode: PayPalMode;
    clientConfigured: boolean;
    webhookConfigured: boolean;
    subscriptionsApiEligible: boolean;
    ordersApiFallbackReady: boolean;
    activeStrategy:
      | 'subscriptions_api'
      | 'hosted_plan_id'
      | 'orders_v2_fallback'
      | 'sandbox_simulation';
    limitationNote?: string;
  };
  firestoreStatus?: {
    available: boolean;
    lastError?: string;
  };
}

let cachedPayPalSdkPromise: Promise<PayPalNamespace | null> | null = null;
let cachedSdkKey = '';

export async function authorizedPayPalFetch<T = any>(
  url: string,
  init: RequestInit = {}
): Promise<{ ok: boolean; status: number; data: T }> {
  const token = await getFirebaseIdToken();
  const headers = new Headers(init.headers || {});
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(url, {
    ...init,
    headers,
  });
  const text = await res.text();
  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  return { ok: res.ok, status: res.status, data };
}

export async function fetchPayPalPublicConfig(): Promise<PayPalPublicConfig> {
  const res = await fetch('/api/paypal/config');
  if (!res.ok) {
    throw new Error(`PayPal config unavailable (HTTP ${res.status})`);
  }
  return (await res.json()) as PayPalPublicConfig;
}

/**
 * Loads the official PayPal JavaScript SDK using non-secret public Client ID only.
 * Supports Subscriptions API (`vault: true, intent: 'subscription'`) and Orders v2 fallback (`intent: 'capture'`).
 */
export async function getPayPalJsSdk(options: {
  clientId: string;
  currency: string;
  intent: 'subscription' | 'capture';
}): Promise<PayPalNamespace | null> {
  const key = `${options.clientId}:${options.currency}:${options.intent}`;
  if (cachedPayPalSdkPromise && cachedSdkKey === key) {
    return cachedPayPalSdkPromise;
  }

  cachedSdkKey = key;
  cachedPayPalSdkPromise = loadScript({
    clientId: options.clientId,
    currency: options.currency,
    vault: options.intent === 'subscription',
    intent: options.intent,
    components: 'buttons',
  }).catch((err) => {
    console.warn('PayPal JS SDK load notice:', err);
    cachedPayPalSdkPromise = null;
    return null;
  });

  return cachedPayPalSdkPromise;
}
