import { getFirebaseIdToken } from './firebase';

export interface StripePublicConfig {
  provider: 'stripe';
  configured: boolean;
  mode: 'test' | 'live';
  publishableKey: string | null;
  webhookConfigured: boolean;
  currency: 'EUR';
  monthlyPlan: {
    planType: 'pro_monthly';
    name: string;
    description: string;
    amount: number;
    currency: 'EUR';
    billingFrequency: 'MONTH';
    intervalCount: 1;
    features: string[];
  };
}

export const DEFAULT_STRIPE_CONFIG: StripePublicConfig = {
  provider: 'stripe',
  configured: false,
  mode: 'test',
  publishableKey: null,
  webhookConfigured: false,
  currency: 'EUR',
  monthlyPlan: {
    planType: 'pro_monthly',
    name: 'Axumite Pro Monthly (Stripe)',
    description: 'Monthly recurring access to all 6 Axumite AI Pro features (€19.90/month).',
    amount: 19.9,
    currency: 'EUR',
    billingFrequency: 'MONTH',
    intervalCount: 1,
    features: [
      'video_dubbing',
      'unlimited_chat',
      'calligraphy_4k',
      'legal_ai',
      'mechanic_ai',
      'ocr_docs',
    ],
  },
};

let cachedStripeConfigPromise: Promise<StripePublicConfig> | null = null;
let cachedStripeConfigAt = 0;

export async function authorizedStripeFetch<T = any>(
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

export async function fetchStripePublicConfig(): Promise<StripePublicConfig> {
  const now = Date.now();
  if (cachedStripeConfigPromise && now - cachedStripeConfigAt < 30_000) {
    return cachedStripeConfigPromise;
  }
  cachedStripeConfigAt = now;
  cachedStripeConfigPromise = fetch('/api/stripe/config')
    .then(async (res) => {
      if (!res.ok) {
        throw new Error(`Stripe config unavailable (HTTP ${res.status})`);
      }
      return (await res.json()) as StripePublicConfig;
    })
    .catch((err) => {
      cachedStripeConfigPromise = null;
      cachedStripeConfigAt = 0;
      throw err;
    });
  return cachedStripeConfigPromise;
}
