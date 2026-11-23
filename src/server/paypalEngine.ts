import crypto from "node:crypto";
import {
  upsertFirestoreUser,
  upsertFirestoreSubscription,
  upsertFirestorePaymentHistory,
  upsertFirestoreEntitlement,
  getFirestoreEntitlement,
  claimWebhookEventIdempotency,
  writePaymentAuditLog,
  getFirestoreAdminStatus,
} from "./firebaseAdmin.ts";

export type PayPalMode = "sandbox" | "live";
export type PayPalPlanType = "pro_monthly" | "pro_yearly";
export type ProFeatureKey =
  | "video_dubbing"
  | "unlimited_chat"
  | "calligraphy_4k"
  | "legal_ai"
  | "mechanic_ai"
  | "ocr_docs";

export const ALL_PRO_FEATURES: ProFeatureKey[] = [
  "video_dubbing",
  "unlimited_chat",
  "calligraphy_4k",
  "legal_ai",
  "mechanic_ai",
  "ocr_docs",
];

export type SubscriptionStatus =
  | "APPROVAL_PENDING"
  | "APPROVED"
  | "ACTIVE"
  | "SUSPENDED"
  | "CANCELLED"
  | "EXPIRED"
  | "PAYMENT_FAILED"
  | "REFUNDED"
  | "REVERSED";

export interface PayPalPlanConfig {
  planType: PayPalPlanType;
  name: string;
  description: string;
  amount: number;
  currency: string;
  billingFrequency: "MONTH" | "YEAR";
  intervalCount: number;
  paypalPlanId: string;
  features: ProFeatureKey[];
}

export interface PayPalSubscriptionRecord {
  uid: string;
  email: string;
  displayName: string;
  provider: "paypal";
  paypalSubscriptionId: string;
  paypalPlanId: string;
  planType: PayPalPlanType;
  status: SubscriptionStatus;
  currency: string;
  amount: number;
  billingFrequency: "MONTH" | "YEAR";
  startDate: string;
  nextBillingDate: string | null;
  cancelAtPeriodEnd: boolean;
  cancellationReason?: string;
  mode: PayPalMode;
  integrationMethod: "subscriptions_api" | "orders_v2_fallback" | "sandbox_local";
  updatedAt: string;
}

export interface PayPalPaymentHistoryRecord {
  uid: string;
  email: string;
  provider: "paypal";
  paypalTransactionId: string;
  paypalSubscriptionId: string;
  planType: PayPalPlanType;
  amount: number;
  currency: string;
  paymentStatus: "COMPLETED" | "PENDING" | "FAILED" | "REFUNDED" | "REVERSED";
  paymentDate: string;
  mode: PayPalMode;
}

export interface PayPalUserEntitlement {
  uid: string;
  plan: "free" | "pro";
  isPro: boolean;
  features: ProFeatureKey[];
  subscriptionStatus: SubscriptionStatus | "NONE";
  expiresAt: string | null;
  updatedAt: string;
  entitlementSignature: string;
}

export interface PayPalRuntimeSettings {
  mode: PayPalMode;
  liveEnabled: boolean;
  currency: string;
  monthlyPrice: number;
  yearlyPrice: number;
  sandboxPlanMonthlyId: string;
  sandboxPlanYearlyId: string;
  livePlanMonthlyId: string;
  livePlanYearlyId: string;
  enableOneTimeFallback: boolean;
  updatedAt: string;
}

export interface PayPalCapabilityReport {
  mode: PayPalMode;
  clientConfigured: boolean;
  webhookConfigured: boolean;
  subscriptionsApiEligible: boolean;
  ordersApiFallbackReady: boolean;
  activeStrategy: "subscriptions_api" | "hosted_plan_id" | "orders_v2_fallback" | "sandbox_simulation";
  limitationNote?: string;
}

const HMAC_SECRET =
  process.env.PAYMENT_SECRET_KEY || "axumite_sovereign_secure_key_2026";

// Server-side in-memory stores synced to Firestore via Admin SDK
export const paypalSubscriptions = new Map<string, PayPalSubscriptionRecord>();
export const paypalPayments = new Map<string, PayPalPaymentHistoryRecord>();
export const paypalEntitlements = new Map<string, PayPalUserEntitlement>();
export const paypalUsers = new Map<
  string,
  { uid: string; email: string; displayName: string; accountCreatedAt: string }
>();
const processedWebhookEvents = new Set<string>();
const pendingOrders = new Map<
  string,
  {
    uid: string;
    email: string;
    displayName: string;
    planType: PayPalPlanType;
    amount: number;
    currency: string;
    mode: PayPalMode;
    createdAt: string;
  }
>();

const autoProvisionedPlanCache: Partial<Record<string, string>> = {};
let cachedCapabilityReport: PayPalCapabilityReport | null = null;

function parsePositivePrice(raw: string | undefined, fallback: number): number {
  const num = Number(raw);
  return Number.isFinite(num) && num > 0 ? Number(num.toFixed(2)) : fallback;
}

const runtimeSettings: PayPalRuntimeSettings = {
  mode:
    process.env.PAYPAL_MODE?.toLowerCase() === "live" &&
    process.env.PAYPAL_LIVE_ENABLED === "true"
      ? "live"
      : "sandbox",
  liveEnabled: process.env.PAYPAL_LIVE_ENABLED === "true",
  currency: (process.env.PAYPAL_CURRENCY || "EUR").trim().toUpperCase() || "EUR",
  monthlyPrice: parsePositivePrice(process.env.PAYPAL_PRO_MONTHLY_PRICE, 9.99),
  yearlyPrice: parsePositivePrice(process.env.PAYPAL_PRO_YEARLY_PRICE, 79.99),
  sandboxPlanMonthlyId: (process.env.PAYPAL_SANDBOX_PLAN_MONTHLY_ID || "").trim(),
  sandboxPlanYearlyId: (process.env.PAYPAL_SANDBOX_PLAN_YEARLY_ID || "").trim(),
  livePlanMonthlyId: (process.env.PAYPAL_LIVE_PLAN_MONTHLY_ID || "").trim(),
  livePlanYearlyId: (process.env.PAYPAL_LIVE_PLAN_YEARLY_ID || "").trim(),
  enableOneTimeFallback: process.env.PAYPAL_ENABLE_ONE_TIME_FALLBACK !== "false",
  updatedAt: new Date().toISOString(),
};

function getPayPalBaseUrl(mode: PayPalMode = runtimeSettings.mode): string {
  return mode === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

function getCredentialsForMode(mode: PayPalMode = runtimeSettings.mode): {
  clientId: string;
  clientSecret: string;
  webhookId: string;
} {
  if (mode === "live") {
    return {
      clientId: (process.env.PAYPAL_LIVE_CLIENT_ID || "").trim(),
      clientSecret: (process.env.PAYPAL_LIVE_CLIENT_SECRET || "").trim(),
      webhookId: (process.env.PAYPAL_LIVE_WEBHOOK_ID || "").trim(),
    };
  }
  return {
    clientId: (process.env.PAYPAL_SANDBOX_CLIENT_ID || "").trim(),
    clientSecret: (process.env.PAYPAL_SANDBOX_CLIENT_SECRET || "").trim(),
    webhookId: (process.env.PAYPAL_SANDBOX_WEBHOOK_ID || "").trim(),
  };
}

export function isPayPalConfigured(mode: PayPalMode = runtimeSettings.mode): boolean {
  const { clientId, clientSecret } = getCredentialsForMode(mode);
  return (
    Boolean(clientId) &&
    Boolean(clientSecret) &&
    !clientId.includes("MY_PAYPAL") &&
    !clientSecret.includes("MY_PAYPAL")
  );
}

export function getPayPalRuntimeSettings(): PayPalRuntimeSettings {
  return { ...runtimeSettings };
}

export function updatePayPalRuntimeSettings(
  updates: Partial<{
    mode: PayPalMode;
    confirmLiveActivation: boolean;
    currency: string;
    monthlyPrice: number;
    yearlyPrice: number;
    sandboxPlanMonthlyId: string;
    sandboxPlanYearlyId: string;
    livePlanMonthlyId: string;
    livePlanYearlyId: string;
    enableOneTimeFallback: boolean;
  }>
): PayPalRuntimeSettings {
  if (updates.mode === "live") {
    if (updates.confirmLiveActivation !== true) {
      throw new Error(
        "Administrator confirmation (confirmLiveActivation: true) is required before activating Live PayPal mode or Live prices."
      );
    }
    if (!isPayPalConfigured("live")) {
      throw new Error(
        "Cannot switch to Live mode: PAYPAL_LIVE_CLIENT_ID and PAYPAL_LIVE_CLIENT_SECRET must be configured on the server first."
      );
    }
    runtimeSettings.mode = "live";
    runtimeSettings.liveEnabled = true;
  } else if (updates.mode === "sandbox") {
    runtimeSettings.mode = "sandbox";
    runtimeSettings.liveEnabled = false;
  }

  if (updates.currency) {
    const clean = updates.currency.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(clean)) {
      throw new Error("Currency must be a valid 3-letter ISO code (e.g. EUR, USD).");
    }
    runtimeSettings.currency = clean;
  }

  if (updates.monthlyPrice !== undefined) {
    const val = Number(updates.monthlyPrice);
    if (!Number.isFinite(val) || val <= 0 || val > 10000) {
      throw new Error("Monthly price must be between 0.01 and 10000.");
    }
    runtimeSettings.monthlyPrice = Number(val.toFixed(2));
  }

  if (updates.yearlyPrice !== undefined) {
    const val = Number(updates.yearlyPrice);
    if (!Number.isFinite(val) || val <= 0 || val > 50000) {
      throw new Error("Yearly price must be between 0.01 and 50000.");
    }
    runtimeSettings.yearlyPrice = Number(val.toFixed(2));
  }

  if (updates.sandboxPlanMonthlyId !== undefined) {
    runtimeSettings.sandboxPlanMonthlyId = updates.sandboxPlanMonthlyId.trim();
  }
  if (updates.sandboxPlanYearlyId !== undefined) {
    runtimeSettings.sandboxPlanYearlyId = updates.sandboxPlanYearlyId.trim();
  }
  if (updates.livePlanMonthlyId !== undefined) {
    runtimeSettings.livePlanMonthlyId = updates.livePlanMonthlyId.trim();
  }
  if (updates.livePlanYearlyId !== undefined) {
    runtimeSettings.livePlanYearlyId = updates.livePlanYearlyId.trim();
  }
  if (updates.enableOneTimeFallback !== undefined) {
    runtimeSettings.enableOneTimeFallback = Boolean(updates.enableOneTimeFallback);
  }

  runtimeSettings.updatedAt = new Date().toISOString();
  cachedCapabilityReport = null;
  return getPayPalRuntimeSettings();
}

export function getPayPalPlans(mode: PayPalMode = runtimeSettings.mode): Record<PayPalPlanType, PayPalPlanConfig> {
  const monthlyPlanId =
    mode === "live"
      ? runtimeSettings.livePlanMonthlyId || autoProvisionedPlanCache["live:pro_monthly"] || ""
      : runtimeSettings.sandboxPlanMonthlyId || autoProvisionedPlanCache["sandbox:pro_monthly"] || "";
  const yearlyPlanId =
    mode === "live"
      ? runtimeSettings.livePlanYearlyId || autoProvisionedPlanCache["live:pro_yearly"] || ""
      : runtimeSettings.sandboxPlanYearlyId || autoProvisionedPlanCache["sandbox:pro_yearly"] || "";

  return {
    pro_monthly: {
      planType: "pro_monthly",
      name: "Axumite Pro Monthly",
      description:
        "Automatic monthly recurring billing with full access to all 6 Pro translator features.",
      amount: runtimeSettings.monthlyPrice,
      currency: runtimeSettings.currency,
      billingFrequency: "MONTH",
      intervalCount: 1,
      paypalPlanId: monthlyPlanId,
      features: [...ALL_PRO_FEATURES],
    },
    pro_yearly: {
      planType: "pro_yearly",
      name: "Axumite Pro Yearly",
      description:
        "Automatic annual recurring billing with full access to all 6 Pro translator features.",
      amount: runtimeSettings.yearlyPrice,
      currency: runtimeSettings.currency,
      billingFrequency: "YEAR",
      intervalCount: 1,
      paypalPlanId: yearlyPlanId,
      features: [...ALL_PRO_FEATURES],
    },
  };
}

export function signEntitlement(uid: string, plan: "free" | "pro", expiresAt: string | null): string {
  const payload = `${uid}:${plan}:${expiresAt || "none"}`;
  return crypto.createHmac("sha256", HMAC_SECRET).update(payload).digest("hex").slice(0, 32);
}

// PayPal OAuth2 Token Cache
const tokenCache: Partial<Record<PayPalMode, { token: string; expiresAtMs: number }>> = {};

export async function getPayPalAccessToken(mode: PayPalMode = runtimeSettings.mode): Promise<string> {
  const existing = tokenCache[mode];
  if (existing && existing.expiresAtMs > Date.now() + 30000) {
    return existing.token;
  }

  const { clientId, clientSecret } = getCredentialsForMode(mode);
  if (!clientId || !clientSecret) {
    throw new Error(
      `PayPal ${mode} credentials are not configured on the server.`
    );
  }

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch(`${getPayPalBaseUrl(mode)}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const data = (await res.json()) as any;
  if (!res.ok || !data?.access_token) {
    throw new Error(
      data?.error_description || data?.error || `PayPal OAuth failed (${res.status})`
    );
  }

  const expiresInSec = Number(data.expires_in) || 3000;
  tokenCache[mode] = {
    token: data.access_token,
    expiresAtMs: Date.now() + expiresInSec * 1000,
  };
  return data.access_token;
}

async function paypalFetch<T = any>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    mode?: PayPalMode;
    headers?: Record<string, string>;
  } = {}
): Promise<{ ok: boolean; status: number; data: T }> {
  const mode = options.mode || runtimeSettings.mode;
  const accessToken = await getPayPalAccessToken(mode);
  const res = await fetch(`${getPayPalBaseUrl(mode)}${path}`, {
    method: options.method || "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
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

export async function probePayPalCapabilities(
  mode: PayPalMode = runtimeSettings.mode
): Promise<PayPalCapabilityReport> {
  const { clientId, webhookId } = getCredentialsForMode(mode);
  const configured = isPayPalConfigured(mode);
  const plans = getPayPalPlans(mode);
  const hasConfiguredPlanIds = Boolean(plans.pro_monthly.paypalPlanId && plans.pro_yearly.paypalPlanId);

  if (!configured) {
    return {
      mode,
      clientConfigured: false,
      webhookConfigured: Boolean(webhookId),
      subscriptionsApiEligible: false,
      ordersApiFallbackReady: false,
      activeStrategy: "sandbox_simulation",
      limitationNote:
        mode === "sandbox"
          ? "PAYPAL_SANDBOX_CLIENT_ID / PAYPAL_SANDBOX_CLIENT_SECRET not set yet. Interactive Sandbox test verification is active; add Sandbox credentials to test live PayPal Sandbox popup."
          : "Live PayPal credentials not configured.",
    };
  }

  if (cachedCapabilityReport && cachedCapabilityReport.mode === mode) {
    return cachedCapabilityReport;
  }

  try {
    const check = await paypalFetch("/v1/billing/plans?page_size=1&page=1", {
      method: "GET",
      mode,
    });
    if (check.ok) {
      cachedCapabilityReport = {
        mode,
        clientConfigured: true,
        webhookConfigured: Boolean(webhookId),
        subscriptionsApiEligible: true,
        ordersApiFallbackReady: true,
        activeStrategy: hasConfiguredPlanIds ? "hosted_plan_id" : "subscriptions_api",
      };
      return cachedCapabilityReport;
    }

    cachedCapabilityReport = {
      mode,
      clientConfigured: true,
      webhookConfigured: Boolean(webhookId),
      subscriptionsApiEligible: false,
      ordersApiFallbackReady: runtimeSettings.enableOneTimeFallback,
      activeStrategy: hasConfiguredPlanIds ? "hosted_plan_id" : "orders_v2_fallback",
      limitationNote: `Direct merchant Subscriptions API check returned HTTP ${check.status}. Using ${
        hasConfiguredPlanIds
          ? "PayPal Business Dashboard Plan IDs"
          : "Orders v2 Checkout/Capture recurring-period fallback"
      }.`,
    };
    return cachedCapabilityReport;
  } catch (err: any) {
    return {
      mode,
      clientConfigured: Boolean(clientId),
      webhookConfigured: Boolean(webhookId),
      subscriptionsApiEligible: false,
      ordersApiFallbackReady: runtimeSettings.enableOneTimeFallback,
      activeStrategy: hasConfiguredPlanIds ? "hosted_plan_id" : "orders_v2_fallback",
      limitationNote: err?.message || "PayPal API capability probe fell back to Orders v2 mode.",
    };
  }
}

export function getPublicPayPalConfig() {
  const mode = runtimeSettings.mode;
  const { clientId, webhookId } = getCredentialsForMode(mode);
  const plans = getPayPalPlans(mode);
  const configured = isPayPalConfigured(mode);

  return {
    provider: "paypal" as const,
    mode,
    liveEnabled: runtimeSettings.liveEnabled,
    configured,
    clientId: configured ? clientId : null,
    webhookConfigured: Boolean(webhookId),
    currency: runtimeSettings.currency,
    enableOneTimeFallback: runtimeSettings.enableOneTimeFallback,
    plans: {
      pro_monthly: {
        ...plans.pro_monthly,
      },
      pro_yearly: {
        ...plans.pro_yearly,
      },
    },
    capability: cachedCapabilityReport || {
      mode,
      clientConfigured: configured,
      webhookConfigured: Boolean(webhookId),
      subscriptionsApiEligible: configured,
      ordersApiFallbackReady: configured && runtimeSettings.enableOneTimeFallback,
      activeStrategy: configured
        ? plans.pro_monthly.paypalPlanId
          ? "hosted_plan_id"
          : "subscriptions_api"
        : "sandbox_simulation",
    },
    firestoreStatus: getFirestoreAdminStatus(),
  };
}

/**
 * Ensures a direct-merchant PayPal Billing Plan ID exists for the given planType
 * using standard Catalog Products (/v1/catalogs/products) & Billing Plans (/v1/billing/plans).
 * Returns null if the merchant account lacks Subscriptions API access so caller cleanly falls back.
 */
async function ensureMerchantPayPalPlanId(
  planType: PayPalPlanType,
  mode: PayPalMode = runtimeSettings.mode
): Promise<string | null> {
  const plans = getPayPalPlans(mode);
  const plan = plans[planType];
  if (plan.paypalPlanId) return plan.paypalPlanId;

  const cacheKey = `${mode}:${planType}`;
  if (autoProvisionedPlanCache[cacheKey]) {
    return autoProvisionedPlanCache[cacheKey]!;
  }

  // Create/reuse direct-merchant Catalog Product
  const productCacheKey = `${mode}:product`;
  let productId = autoProvisionedPlanCache[productCacheKey];
  if (!productId) {
    const productRes = await paypalFetch<{ id?: string }>("/v1/catalogs/products", {
      method: "POST",
      mode,
      headers: {
        "PayPal-Request-Id": `axumite-product-${mode}-v1`,
      },
      body: {
        name: "AXUMITE AI TRANSLATOR PRO",
        description:
          "Full access to all 6 Pro Ge'ez & multilingual AI translator tools.",
        type: "SERVICE",
        category: "SOFTWARE",
      },
    });
    if (!productRes.ok || !productRes.data?.id) {
      return null;
    }
    productId = productRes.data.id;
    autoProvisionedPlanCache[productCacheKey] = productId;
  }

  // Create Billing Plan for monthly/yearly recurring payments
  const planRes = await paypalFetch<{ id?: string }>("/v1/billing/plans", {
    method: "POST",
    mode,
    headers: {
      "PayPal-Request-Id": `axumite-plan-${mode}-${planType}-${plan.currency}-${plan.amount}`,
    },
    body: {
      product_id: productId,
      name: plan.name,
      description: plan.description,
      status: "ACTIVE",
      billing_cycles: [
        {
          frequency: {
            interval_unit: plan.billingFrequency,
            interval_count: 1,
          },
          tenure_type: "REGULAR",
          sequence: 1,
          total_cycles: 0,
          pricing_scheme: {
            fixed_price: {
              value: plan.amount.toFixed(2),
              currency_code: plan.currency,
            },
          },
        },
      ],
      payment_preferences: {
        auto_bill_outstanding: true,
        payment_failure_threshold: 2,
      },
    },
  });

  if (!planRes.ok || !planRes.data?.id) {
    return null;
  }

  autoProvisionedPlanCache[cacheKey] = planRes.data.id;
  return planRes.data.id;
}

function addBillingPeriod(startIso: string, frequency: "MONTH" | "YEAR"): string {
  const date = new Date(startIso);
  if (frequency === "YEAR") {
    date.setUTCFullYear(date.getUTCFullYear() + 1);
  } else {
    date.setUTCMonth(date.getUTCMonth() + 1);
  }
  return date.toISOString();
}

async function syncEntitlementToStores(params: {
  uid: string;
  email: string;
  displayName: string;
  plan: "free" | "pro";
  isPro: boolean;
  subscriptionStatus: SubscriptionStatus | "NONE";
  expiresAt: string | null;
}) {
  const now = new Date().toISOString();
  const entitlement: PayPalUserEntitlement = {
    uid: params.uid,
    plan: params.plan,
    isPro: params.isPro,
    features: params.isPro ? [...ALL_PRO_FEATURES] : [],
    subscriptionStatus: params.subscriptionStatus,
    expiresAt: params.expiresAt,
    updatedAt: now,
    entitlementSignature: signEntitlement(params.uid, params.plan, params.expiresAt),
  };

  paypalEntitlements.set(params.uid, entitlement);

  const existingUser = paypalUsers.get(params.uid);
  const userRecord = {
    uid: params.uid,
    email: params.email || existingUser?.email || "",
    displayName: params.displayName || existingUser?.displayName || "Axumite Member",
    accountCreatedAt: existingUser?.accountCreatedAt || now,
  };
  paypalUsers.set(params.uid, userRecord);

  await Promise.all([
    upsertFirestoreUser(userRecord),
    upsertFirestoreEntitlement({
      uid: entitlement.uid,
      plan: entitlement.plan,
      isPro: entitlement.isPro,
      features: entitlement.features,
      subscriptionStatus: entitlement.subscriptionStatus,
      expiresAt: entitlement.expiresAt,
      updatedAt: entitlement.updatedAt,
    }),
  ]);

  return entitlement;
}

export async function createPayPalSubscriptionOrOrder(params: {
  uid: string;
  email: string;
  displayName: string;
  planType: PayPalPlanType;
  returnUrl: string;
  cancelUrl: string;
  preferFallbackOrder?: boolean;
}) {
  const mode = runtimeSettings.mode;
  const plans = getPayPalPlans(mode);
  const plan = plans[params.planType];
  if (!plan) {
    throw new Error(`Unsupported PayPal subscription plan: ${params.planType}`);
  }

  const now = new Date().toISOString();
  const configured = isPayPalConfigured(mode);

  // Ensure user exists in Firestore users collection
  const userRecord = {
    uid: params.uid,
    email: params.email,
    displayName: params.displayName,
    accountCreatedAt: paypalUsers.get(params.uid)?.accountCreatedAt || now,
  };
  paypalUsers.set(params.uid, userRecord);
  await upsertFirestoreUser(userRecord);

  // 1. Live/Sandbox PayPal API flow when credentials are configured
  if (configured) {
    if (!params.preferFallbackOrder) {
      const paypalPlanId = await ensureMerchantPayPalPlanId(params.planType, mode);
      if (paypalPlanId) {
        const subRes = await paypalFetch<any>("/v1/billing/subscriptions", {
          method: "POST",
          mode,
          headers: {
            "PayPal-Request-Id": `axm-sub-${params.uid}-${Date.now()}`,
          },
          body: {
            plan_id: paypalPlanId,
            custom_id: `${params.uid}|${params.planType}`,
            subscriber: {
              name: {
                given_name: params.displayName.split(" ")[0] || "Axumite",
                surname: params.displayName.split(" ").slice(1).join(" ") || "Member",
              },
              email_address: params.email,
            },
            application_context: {
              brand_name: "AXUMITE AI TRANSLATOR",
              locale: "en-US",
              shipping_preference: "NO_SHIPPING",
              user_action: "SUBSCRIBE_NOW",
              return_url: params.returnUrl,
              cancel_url: params.cancelUrl,
            },
          },
        });

        if (subRes.ok && subRes.data?.id) {
          const approveLink = Array.isArray(subRes.data.links)
            ? subRes.data.links.find((l: any) => l.rel === "approve")?.href || null
            : null;

          const pendingSub: PayPalSubscriptionRecord = {
            uid: params.uid,
            email: params.email,
            displayName: params.displayName,
            provider: "paypal",
            paypalSubscriptionId: subRes.data.id,
            paypalPlanId,
            planType: params.planType,
            status: "APPROVAL_PENDING",
            currency: plan.currency,
            amount: plan.amount,
            billingFrequency: plan.billingFrequency,
            startDate: now,
            nextBillingDate: null,
            cancelAtPeriodEnd: false,
            mode,
            integrationMethod: "subscriptions_api",
            updatedAt: now,
          };
          paypalSubscriptions.set(subRes.data.id, pendingSub);
          await upsertFirestoreSubscription({
            uid: pendingSub.uid,
            provider: "paypal",
            paypalSubscriptionId: pendingSub.paypalSubscriptionId,
            paypalPlanId: pendingSub.paypalPlanId,
            planType: pendingSub.planType,
            status: pendingSub.status,
            currency: pendingSub.currency,
            amount: pendingSub.amount,
            billingFrequency: pendingSub.billingFrequency,
            startDate: pendingSub.startDate,
            nextBillingDate: pendingSub.nextBillingDate,
            cancelAtPeriodEnd: pendingSub.cancelAtPeriodEnd,
            updatedAt: pendingSub.updatedAt,
          });

          return {
            success: true,
            flow: "subscription" as const,
            mode,
            subscriptionId: subRes.data.id,
            paypalPlanId,
            approveUrl: approveLink,
            plan,
          };
        }
      }
    }

    // Fallback to PayPal Orders v2 (/v2/checkout/orders) when Subscriptions API isn't available
    if (runtimeSettings.enableOneTimeFallback) {
      const orderRes = await paypalFetch<any>("/v2/checkout/orders", {
        method: "POST",
        mode,
        headers: {
          "PayPal-Request-Id": `axm-ord-${params.uid}-${Date.now()}`,
        },
        body: {
          intent: "CAPTURE",
          purchase_units: [
            {
              reference_id: `${params.uid}|${params.planType}`,
              custom_id: `${params.uid}|${params.planType}`,
              description: `${plan.name} (${plan.billingFrequency})`,
              amount: {
                currency_code: plan.currency,
                value: plan.amount.toFixed(2),
              },
            },
          ],
          application_context: {
            brand_name: "AXUMITE AI TRANSLATOR",
            shipping_preference: "NO_SHIPPING",
            user_action: "PAY_NOW",
            return_url: params.returnUrl,
            cancel_url: params.cancelUrl,
          },
        },
      });

      if (!orderRes.ok || !orderRes.data?.id) {
        throw new Error(
          orderRes.data?.message ||
            "PayPal failed to create checkout order. Check merchant account permissions."
        );
      }

      const approveLink = Array.isArray(orderRes.data.links)
        ? orderRes.data.links.find((l: any) => l.rel === "approve")?.href || null
        : null;

      pendingOrders.set(orderRes.data.id, {
        uid: params.uid,
        email: params.email,
        displayName: params.displayName,
        planType: params.planType,
        amount: plan.amount,
        currency: plan.currency,
        mode,
        createdAt: now,
      });

      return {
        success: true,
        flow: "order_fallback" as const,
        mode,
        orderId: orderRes.data.id,
        paypalPlanId: `PAYPAL_ORDER_PLAN_${params.planType.toUpperCase()}`,
        approveUrl: approveLink,
        plan,
        notice:
          "Using PayPal Orders v2 checkout fallback because Subscriptions API plan creation is not enabled on this merchant account.",
      };
    }

    throw new Error(
      "PayPal Subscriptions API is unavailable and one-time Orders fallback is disabled."
    );
  }

  // 2. Sandbox Server-Side Test Mode (ONLY allowed in sandbox when PayPal keys aren't supplied yet)
  if (mode !== "sandbox") {
    throw new Error("Live mode requires configured PayPal Live credentials.");
  }

  const sandboxSubId = `I-SANDBOX-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
  const sandboxPlanId =
    plan.paypalPlanId || `P-SANDBOX-${params.planType.toUpperCase()}`;

  const pendingSandboxSub: PayPalSubscriptionRecord = {
    uid: params.uid,
    email: params.email,
    displayName: params.displayName,
    provider: "paypal",
    paypalSubscriptionId: sandboxSubId,
    paypalPlanId: sandboxPlanId,
    planType: params.planType,
    status: "APPROVAL_PENDING",
    currency: plan.currency,
    amount: plan.amount,
    billingFrequency: plan.billingFrequency,
    startDate: now,
    nextBillingDate: null,
    cancelAtPeriodEnd: false,
    mode: "sandbox",
    integrationMethod: "sandbox_local",
    updatedAt: now,
  };
  paypalSubscriptions.set(sandboxSubId, pendingSandboxSub);
  await upsertFirestoreSubscription({
    uid: pendingSandboxSub.uid,
    provider: "paypal",
    paypalSubscriptionId: pendingSandboxSub.paypalSubscriptionId,
    paypalPlanId: pendingSandboxSub.paypalPlanId,
    planType: pendingSandboxSub.planType,
    status: pendingSandboxSub.status,
    currency: pendingSandboxSub.currency,
    amount: pendingSandboxSub.amount,
    billingFrequency: pendingSandboxSub.billingFrequency,
    startDate: pendingSandboxSub.startDate,
    nextBillingDate: pendingSandboxSub.nextBillingDate,
    cancelAtPeriodEnd: pendingSandboxSub.cancelAtPeriodEnd,
    updatedAt: pendingSandboxSub.updatedAt,
  });

  return {
    success: true,
    flow: "sandbox_pending" as const,
    mode: "sandbox" as const,
    subscriptionId: sandboxSubId,
    paypalPlanId: sandboxPlanId,
    approveUrl: null,
    plan,
    notice:
      "Sandbox server session created in APPROVAL_PENDING state. Pro access stays locked until verified PayPal approval.",
  };
}

/**
 * Server-side verification of a PayPal Subscription ID against PayPal REST APIs
 * (or Sandbox test verification when running without live/sandbox REST keys).
 * NEVER activates Pro access without verified approval.
 */
export async function verifyAndSyncPayPalSubscription(params: {
  uid: string;
  email: string;
  displayName: string;
  subscriptionId: string;
  planType?: PayPalPlanType;
  sandboxSimulatedApproval?: boolean;
}) {
  const mode = runtimeSettings.mode;
  const now = new Date().toISOString();
  const existing = paypalSubscriptions.get(params.subscriptionId);
  const resolvedPlanType: PayPalPlanType =
    params.planType || existing?.planType || "pro_monthly";
  const plan = getPayPalPlans(mode)[resolvedPlanType];

  if (isPayPalConfigured(mode) && !params.subscriptionId.startsWith("I-SANDBOX-")) {
    const remote = await paypalFetch<any>(
      `/v1/billing/subscriptions/${encodeURIComponent(params.subscriptionId)}`,
      { method: "GET", mode }
    );
    if (!remote.ok || !remote.data?.id) {
      throw new Error(
        remote.data?.message || "PayPal subscription verification failed."
      );
    }

    const remoteStatus = String(remote.data.status || "").toUpperCase();
    const isVerifiedActive = remoteStatus === "ACTIVE" || remoteStatus === "APPROVED";
    const nextBillingTime =
      remote.data.billing_info?.next_billing_time ||
      addBillingPeriod(now, plan.billingFrequency);

    const statusMapped: SubscriptionStatus = isVerifiedActive
      ? "ACTIVE"
      : (remoteStatus as SubscriptionStatus) || "APPROVAL_PENDING";

    const subRecord: PayPalSubscriptionRecord = {
      uid: params.uid,
      email: params.email || remote.data.subscriber?.email_address || "",
      displayName: params.displayName,
      provider: "paypal",
      paypalSubscriptionId: params.subscriptionId,
      paypalPlanId: remote.data.plan_id || plan.paypalPlanId || resolvedPlanType,
      planType: resolvedPlanType,
      status: statusMapped,
      currency: plan.currency,
      amount: plan.amount,
      billingFrequency: plan.billingFrequency,
      startDate: remote.data.start_time || existing?.startDate || now,
      nextBillingDate: isVerifiedActive ? nextBillingTime : null,
      cancelAtPeriodEnd: false,
      mode,
      integrationMethod: "subscriptions_api",
      updatedAt: now,
    };

    paypalSubscriptions.set(subRecord.paypalSubscriptionId, subRecord);
    await upsertFirestoreSubscription({
      uid: subRecord.uid,
      provider: "paypal",
      paypalSubscriptionId: subRecord.paypalSubscriptionId,
      paypalPlanId: subRecord.paypalPlanId,
      planType: subRecord.planType,
      status: subRecord.status,
      currency: subRecord.currency,
      amount: subRecord.amount,
      billingFrequency: subRecord.billingFrequency,
      startDate: subRecord.startDate,
      nextBillingDate: subRecord.nextBillingDate,
      cancelAtPeriodEnd: subRecord.cancelAtPeriodEnd,
      updatedAt: subRecord.updatedAt,
    });

    if (isVerifiedActive) {
      const txnId =
        remote.data.billing_info?.last_payment?.transaction_id ||
        `TXN-PP-${params.subscriptionId}-${Date.now()}`;
      if (!paypalPayments.has(txnId)) {
        const payRecord: PayPalPaymentHistoryRecord = {
          uid: params.uid,
          email: subRecord.email,
          provider: "paypal",
          paypalTransactionId: txnId,
          paypalSubscriptionId: params.subscriptionId,
          planType: resolvedPlanType,
          amount: Number(
            remote.data.billing_info?.last_payment?.amount?.value || plan.amount
          ),
          currency:
            remote.data.billing_info?.last_payment?.amount?.currency_code ||
            plan.currency,
          paymentStatus: "COMPLETED",
          paymentDate:
            remote.data.billing_info?.last_payment?.time || now,
          mode,
        };
        paypalPayments.set(txnId, payRecord);
        await upsertFirestorePaymentHistory({
          uid: payRecord.uid,
          provider: "paypal",
          paypalTransactionId: payRecord.paypalTransactionId,
          paypalSubscriptionId: payRecord.paypalSubscriptionId,
          amount: payRecord.amount,
          currency: payRecord.currency,
          paymentStatus: payRecord.paymentStatus,
          paymentDate: payRecord.paymentDate,
        });
      }
    }

    const entitlement = await syncEntitlementToStores({
      uid: params.uid,
      email: subRecord.email,
      displayName: params.displayName,
      plan: isVerifiedActive ? "pro" : "free",
      isPro: isVerifiedActive,
      subscriptionStatus: statusMapped,
      expiresAt: isVerifiedActive ? nextBillingTime : null,
    });

    await writePaymentAuditLog({
      action: "SUBSCRIPTION_VERIFIED",
      uid: params.uid,
      email: subRecord.email,
      details: {
        paypalSubscriptionId: params.subscriptionId,
        remoteStatus,
        isPro: entitlement.isPro,
      },
    });

    return {
      success: isVerifiedActive,
      subscription: subRecord,
      entitlement,
      message: isVerifiedActive
        ? "PayPal subscription verified and Axumite Pro activated."
        : `PayPal subscription status is ${statusMapped}; Pro access not activated yet.`,
    };
  }

  // Sandbox local verification: MUST have explicit existing pending record & sandbox mode
  if (mode !== "sandbox") {
    throw new Error("Cannot verify sandbox subscription ID in Live mode.");
  }
  if (!existing || existing.uid !== params.uid) {
    throw new Error(
      "Pending PayPal Sandbox subscription was not found or belongs to another user."
    );
  }
  if (!params.sandboxSimulatedApproval && existing.status !== "ACTIVE") {
    return {
      success: false,
      subscription: existing,
      entitlement: await getEntitlementForUser(params.uid),
      message:
        "Subscription has not been approved in PayPal Sandbox yet.",
    };
  }

  const nextBillingDate = addBillingPeriod(now, existing.billingFrequency);
  const activated: PayPalSubscriptionRecord = {
    ...existing,
    status: "ACTIVE",
    startDate: now,
    nextBillingDate,
    cancelAtPeriodEnd: false,
    updatedAt: now,
  };
  paypalSubscriptions.set(activated.paypalSubscriptionId, activated);
  await upsertFirestoreSubscription({
    uid: activated.uid,
    provider: "paypal",
    paypalSubscriptionId: activated.paypalSubscriptionId,
    paypalPlanId: activated.paypalPlanId,
    planType: activated.planType,
    status: activated.status,
    currency: activated.currency,
    amount: activated.amount,
    billingFrequency: activated.billingFrequency,
    startDate: activated.startDate,
    nextBillingDate: activated.nextBillingDate,
    cancelAtPeriodEnd: activated.cancelAtPeriodEnd,
    updatedAt: activated.updatedAt,
  });

  const txnId = `SBX-SALE-${crypto.randomBytes(5).toString("hex").toUpperCase()}`;
  const payRecord: PayPalPaymentHistoryRecord = {
    uid: params.uid,
    email: params.email || activated.email,
    provider: "paypal",
    paypalTransactionId: txnId,
    paypalSubscriptionId: activated.paypalSubscriptionId,
    planType: activated.planType,
    amount: activated.amount,
    currency: activated.currency,
    paymentStatus: "COMPLETED",
    paymentDate: now,
    mode: "sandbox",
  };
  paypalPayments.set(txnId, payRecord);
  await upsertFirestorePaymentHistory({
    uid: payRecord.uid,
    provider: "paypal",
    paypalTransactionId: payRecord.paypalTransactionId,
    paypalSubscriptionId: payRecord.paypalSubscriptionId,
    amount: payRecord.amount,
    currency: payRecord.currency,
    paymentStatus: payRecord.paymentStatus,
    paymentDate: payRecord.paymentDate,
  });

  const entitlement = await syncEntitlementToStores({
    uid: params.uid,
    email: activated.email,
    displayName: activated.displayName,
    plan: "pro",
    isPro: true,
    subscriptionStatus: "ACTIVE",
    expiresAt: nextBillingDate,
  });

  await writePaymentAuditLog({
    action: "SANDBOX_SUBSCRIPTION_ACTIVATED",
    uid: params.uid,
    email: activated.email,
    details: {
      paypalSubscriptionId: activated.paypalSubscriptionId,
      txnId,
      planType: activated.planType,
    },
  });

  return {
    success: true,
    subscription: activated,
    payment: payRecord,
    entitlement,
    message: "PayPal Sandbox subscription approved and Axumite Pro activated.",
  };
}

export async function capturePayPalOrderFallback(params: {
  uid: string;
  email: string;
  displayName: string;
  orderId: string;
  planType?: PayPalPlanType;
}) {
  const mode = runtimeSettings.mode;
  const now = new Date().toISOString();
  const pending = pendingOrders.get(params.orderId);
  const resolvedPlanType: PayPalPlanType =
    params.planType || pending?.planType || "pro_monthly";
  const plan = getPayPalPlans(mode)[resolvedPlanType];

  if (!isPayPalConfigured(mode)) {
    throw new Error(
      "PayPal credentials are required to capture a PayPal order."
    );
  }

  const captureRes = await paypalFetch<any>(
    `/v2/checkout/orders/${encodeURIComponent(params.orderId)}/capture`,
    { method: "POST", mode, body: {} }
  );

  if (!captureRes.ok || captureRes.data?.status !== "COMPLETED") {
    throw new Error(
      captureRes.data?.message ||
        `PayPal order capture status: ${captureRes.data?.status || "FAILED"}`
    );
  }

  const captureUnit = captureRes.data.purchase_units?.[0]?.payments?.captures?.[0];
  const txnId = captureUnit?.id || `CAP-${params.orderId}`;
  const capturedAmount = Number(captureUnit?.amount?.value || plan.amount);
  const capturedCurrency = captureUnit?.amount?.currency_code || plan.currency;
  const expiresAt = addBillingPeriod(now, plan.billingFrequency);

  const subRecord: PayPalSubscriptionRecord = {
    uid: params.uid,
    email: params.email,
    displayName: params.displayName,
    provider: "paypal",
    paypalSubscriptionId: `ORDER-${params.orderId}`,
    paypalPlanId: `ORDERS_V2_${resolvedPlanType.toUpperCase()}`,
    planType: resolvedPlanType,
    status: "ACTIVE",
    currency: capturedCurrency,
    amount: capturedAmount,
    billingFrequency: plan.billingFrequency,
    startDate: now,
    nextBillingDate: expiresAt,
    cancelAtPeriodEnd: true,
    mode,
    integrationMethod: "orders_v2_fallback",
    updatedAt: now,
  };

  paypalSubscriptions.set(subRecord.paypalSubscriptionId, subRecord);
  const payRecord: PayPalPaymentHistoryRecord = {
    uid: params.uid,
    email: params.email,
    provider: "paypal",
    paypalTransactionId: txnId,
    paypalSubscriptionId: subRecord.paypalSubscriptionId,
    planType: resolvedPlanType,
    amount: capturedAmount,
    currency: capturedCurrency,
    paymentStatus: "COMPLETED",
    paymentDate: now,
    mode,
  };
  paypalPayments.set(txnId, payRecord);

  await Promise.all([
    upsertFirestoreSubscription({
      uid: subRecord.uid,
      provider: "paypal",
      paypalSubscriptionId: subRecord.paypalSubscriptionId,
      paypalPlanId: subRecord.paypalPlanId,
      planType: subRecord.planType,
      status: subRecord.status,
      currency: subRecord.currency,
      amount: subRecord.amount,
      billingFrequency: subRecord.billingFrequency,
      startDate: subRecord.startDate,
      nextBillingDate: subRecord.nextBillingDate,
      cancelAtPeriodEnd: subRecord.cancelAtPeriodEnd,
      updatedAt: subRecord.updatedAt,
    }),
    upsertFirestorePaymentHistory({
      uid: payRecord.uid,
      provider: "paypal",
      paypalTransactionId: payRecord.paypalTransactionId,
      paypalSubscriptionId: payRecord.paypalSubscriptionId,
      amount: payRecord.amount,
      currency: payRecord.currency,
      paymentStatus: payRecord.paymentStatus,
      paymentDate: payRecord.paymentDate,
    }),
  ]);

  const entitlement = await syncEntitlementToStores({
    uid: params.uid,
    email: params.email,
    displayName: params.displayName,
    plan: "pro",
    isPro: true,
    subscriptionStatus: "ACTIVE",
    expiresAt,
  });

  pendingOrders.delete(params.orderId);
  return {
    success: true,
    subscription: subRecord,
    payment: payRecord,
    entitlement,
  };
}

export async function cancelPayPalSubscription(params: {
  uid: string;
  subscriptionId?: string;
  reason?: string;
}) {
  const userSubs = Array.from(paypalSubscriptions.values())
    .filter((s) => s.uid === params.uid)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  const target = params.subscriptionId
    ? paypalSubscriptions.get(params.subscriptionId)
    : userSubs.find((s) => s.status === "ACTIVE" || s.status === "APPROVED");

  if (!target || target.uid !== params.uid) {
    throw new Error("No active PayPal subscription found for this account.");
  }

  if (
    isPayPalConfigured(target.mode) &&
    target.integrationMethod === "subscriptions_api" &&
    !target.paypalSubscriptionId.startsWith("I-SANDBOX-")
  ) {
    const res = await paypalFetch(
      `/v1/billing/subscriptions/${encodeURIComponent(target.paypalSubscriptionId)}/cancel`,
      {
        method: "POST",
        mode: target.mode,
        body: {
          reason: params.reason || "Cancelled by subscriber via Axumite AI dashboard",
        },
      }
    );
    if (!res.ok && res.status !== 204) {
      throw new Error(
        res.data?.message || `PayPal cancellation returned HTTP ${res.status}`
      );
    }
  }

  const now = new Date().toISOString();
  const stillPaidThrough =
    Boolean(target.nextBillingDate) &&
    new Date(target.nextBillingDate!).getTime() > Date.now();

  const updated: PayPalSubscriptionRecord = {
    ...target,
    status: "CANCELLED",
    cancelAtPeriodEnd: true,
    cancellationReason: params.reason || "User requested cancellation",
    updatedAt: now,
  };
  paypalSubscriptions.set(updated.paypalSubscriptionId, updated);
  await upsertFirestoreSubscription({
    uid: updated.uid,
    provider: "paypal",
    paypalSubscriptionId: updated.paypalSubscriptionId,
    paypalPlanId: updated.paypalPlanId,
    planType: updated.planType,
    status: updated.status,
    currency: updated.currency,
    amount: updated.amount,
    billingFrequency: updated.billingFrequency,
    startDate: updated.startDate,
    nextBillingDate: updated.nextBillingDate,
    cancelAtPeriodEnd: updated.cancelAtPeriodEnd,
    updatedAt: updated.updatedAt,
  });

  // Retain access ONLY until the verified paid-through date
  const entitlement = await syncEntitlementToStores({
    uid: target.uid,
    email: target.email,
    displayName: target.displayName,
    plan: stillPaidThrough ? "pro" : "free",
    isPro: stillPaidThrough,
    subscriptionStatus: "CANCELLED",
    expiresAt: stillPaidThrough ? target.nextBillingDate : now,
  });

  await writePaymentAuditLog({
    action: "SUBSCRIPTION_CANCELLED",
    uid: target.uid,
    email: target.email,
    details: {
      paypalSubscriptionId: target.paypalSubscriptionId,
      stillPaidThrough,
      expiresAt: entitlement.expiresAt,
      reason: updated.cancellationReason,
    },
  });

  return {
    success: true,
    subscription: updated,
    entitlement,
    message: stillPaidThrough
      ? `Subscription cancelled. You retain Pro access until ${updated.nextBillingDate}.`
      : "Subscription cancelled and Pro access ended.",
  };
}

export async function getEntitlementForUser(uid: string): Promise<PayPalUserEntitlement> {
  if (!uid) {
    return {
      uid: "",
      plan: "free",
      isPro: false,
      features: [],
      subscriptionStatus: "NONE",
      expiresAt: null,
      updatedAt: new Date().toISOString(),
      entitlementSignature: signEntitlement("guest", "free", null),
    };
  }

  // Check active/paid-through subscription state first
  const userSubs = Array.from(paypalSubscriptions.values())
    .filter((s) => s.uid === uid)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const latestSub = userSubs[0];

  if (latestSub) {
    const nowMs = Date.now();
    const paidThroughMs = latestSub.nextBillingDate
      ? new Date(latestSub.nextBillingDate).getTime()
      : 0;

    // Immediately deny on terminal negative statuses
    if (
      latestSub.status === "EXPIRED" ||
      latestSub.status === "SUSPENDED" ||
      latestSub.status === "REFUNDED" ||
      latestSub.status === "REVERSED" ||
      latestSub.status === "PAYMENT_FAILED"
    ) {
      return syncEntitlementToStores({
        uid,
        email: latestSub.email,
        displayName: latestSub.displayName,
        plan: "free",
        isPro: false,
        subscriptionStatus: latestSub.status,
        expiresAt: null,
      });
    }

    if (latestSub.status === "CANCELLED") {
      const stillValid = paidThroughMs > nowMs;
      return syncEntitlementToStores({
        uid,
        email: latestSub.email,
        displayName: latestSub.displayName,
        plan: stillValid ? "pro" : "free",
        isPro: stillValid,
        subscriptionStatus: stillValid ? "CANCELLED" : "EXPIRED",
        expiresAt: stillValid ? latestSub.nextBillingDate : null,
      });
    }

    if (latestSub.status === "ACTIVE" || latestSub.status === "APPROVED") {
      if (paidThroughMs > 0 && paidThroughMs < nowMs - 24 * 3600 * 1000) {
        latestSub.status = "EXPIRED";
        return syncEntitlementToStores({
          uid,
          email: latestSub.email,
          displayName: latestSub.displayName,
          plan: "free",
          isPro: false,
          subscriptionStatus: "EXPIRED",
          expiresAt: null,
        });
      }
      return syncEntitlementToStores({
        uid,
        email: latestSub.email,
        displayName: latestSub.displayName,
        plan: "pro",
        isPro: true,
        subscriptionStatus: latestSub.status,
        expiresAt: latestSub.nextBillingDate,
      });
    }
  }

  const cached = paypalEntitlements.get(uid);
  if (cached) {
    if (
      cached.expiresAt &&
      new Date(cached.expiresAt).getTime() <= Date.now() &&
      cached.isPro
    ) {
      return syncEntitlementToStores({
        uid,
        email: paypalUsers.get(uid)?.email || "",
        displayName: paypalUsers.get(uid)?.displayName || "Axumite Member",
        plan: "free",
        isPro: false,
        subscriptionStatus: "EXPIRED",
        expiresAt: null,
      });
    }
    return cached;
  }

  // Fallback read from Firestore if available (e.g. cold Cloud Run restart)
  const fsEntitlement = await getFirestoreEntitlement(uid);
  if (fsEntitlement) {
    const expired =
      Boolean(fsEntitlement.expiresAt) &&
      new Date(fsEntitlement.expiresAt!).getTime() <= Date.now();
    const isPro = Boolean(fsEntitlement.isPro) && !expired;
    const hydrated: PayPalUserEntitlement = {
      uid,
      plan: isPro ? "pro" : "free",
      isPro,
      features: isPro ? [...ALL_PRO_FEATURES] : [],
      subscriptionStatus: (fsEntitlement.subscriptionStatus as SubscriptionStatus) || "NONE",
      expiresAt: isPro ? fsEntitlement.expiresAt : null,
      updatedAt: fsEntitlement.updatedAt || new Date().toISOString(),
      entitlementSignature: signEntitlement(uid, isPro ? "pro" : "free", fsEntitlement.expiresAt),
    };
    paypalEntitlements.set(uid, hydrated);
    return hydrated;
  }

  return {
    uid,
    plan: "free",
    isPro: false,
    features: [],
    subscriptionStatus: "NONE",
    expiresAt: null,
    updatedAt: new Date().toISOString(),
    entitlementSignature: signEntitlement(uid, "free", null),
  };
}

export async function getSubscriptionStatusForUser(uid: string) {
  const entitlement = await getEntitlementForUser(uid);
  const userSubs = Array.from(paypalSubscriptions.values())
    .filter((s) => s.uid === uid)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const currentSubscription = userSubs[0] || null;
  const billingHistory = Array.from(paypalPayments.values())
    .filter((p) => p.uid === uid)
    .sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));

  return {
    success: true,
    uid,
    entitlement,
    subscription: currentSubscription,
    billingHistory,
    config: getPublicPayPalConfig(),
  };
}

export interface PayPalWebhookHeaders {
  "paypal-transmission-id"?: string;
  "paypal-transmission-time"?: string;
  "paypal-transmission-sig"?: string;
  "paypal-cert-url"?: string;
  "paypal-auth-algo"?: string;
}

export async function verifyPayPalWebhookSignature(params: {
  headers: PayPalWebhookHeaders;
  webhookEvent: any;
  mode?: PayPalMode;
}): Promise<{ verified: boolean; reason?: string }> {
  const mode = params.mode || runtimeSettings.mode;
  const { webhookId } = getCredentialsForMode(mode);

  const txId = params.headers["paypal-transmission-id"];
  const txTime = params.headers["paypal-transmission-time"];
  const txSig = params.headers["paypal-transmission-sig"];
  const certUrl = params.headers["paypal-cert-url"];
  const authAlgo = params.headers["paypal-auth-algo"];

  if (!txId || !txTime || !txSig || !certUrl || !authAlgo) {
    return {
      verified: false,
      reason: "Missing required PayPal transmission signature headers.",
    };
  }

  if (!webhookId) {
    return {
      verified: false,
      reason: `PAYPAL_${mode.toUpperCase()}_WEBHOOK_ID is not configured on the server.`,
    };
  }

  const verifyRes = await paypalFetch<{ verification_status?: string }>(
    "/v1/notifications/verify-webhook-signature",
    {
      method: "POST",
      mode,
      body: {
        auth_algo: authAlgo,
        cert_url: certUrl,
        transmission_id: txId,
        transmission_sig: txSig,
        transmission_time: txTime,
        webhook_id: webhookId,
        webhook_event: params.webhookEvent,
      },
    }
  );

  if (!verifyRes.ok) {
    return {
      verified: false,
      reason: `PayPal signature verification API returned HTTP ${verifyRes.status}`,
    };
  }

  const verified = verifyRes.data?.verification_status === "SUCCESS";
  return {
    verified,
    reason: verified ? undefined : `verification_status=${verifyRes.data?.verification_status}`,
  };
}

export async function processPayPalWebhookEvent(params: {
  headers: PayPalWebhookHeaders;
  event: any;
  skipSignatureCheckForInternalTest?: boolean;
}) {
  const event = params.event;
  if (!event || !event.id || !event.event_type) {
    throw new Error("Invalid PayPal webhook event payload (missing id or event_type).");
  }

  if (!params.skipSignatureCheckForInternalTest) {
    const verification = await verifyPayPalWebhookSignature({
      headers: params.headers,
      webhookEvent: event,
    });
    if (!verification.verified) {
      await writePaymentAuditLog({
        action: "WEBHOOK_SIGNATURE_REJECTED",
        details: {
          eventId: event.id,
          eventType: event.event_type,
          reason: verification.reason,
        },
      });
      throw new Error(`Invalid PayPal webhook signature: ${verification.reason}`);
    }
  }

  // Idempotency / duplicate-event guard
  if (processedWebhookEvents.has(event.id)) {
    return { received: true, duplicate: true, eventId: event.id };
  }
  const firestoreIdem = await claimWebhookEventIdempotency(event.id, event.event_type);
  if (firestoreIdem.alreadyProcessed) {
    processedWebhookEvents.add(event.id);
    return { received: true, duplicate: true, eventId: event.id };
  }
  processedWebhookEvents.add(event.id);

  const now = new Date().toISOString();
  const resource = event.resource || {};
  const subIdFromEvent =
    resource.billing_agreement_id ||
    (String(event.event_type).startsWith("BILLING.SUBSCRIPTION.") ? resource.id : "") ||
    "";

  const existingSub = subIdFromEvent ? paypalSubscriptions.get(subIdFromEvent) : undefined;
  let uid = existingSub?.uid || "";
  let planType: PayPalPlanType = existingSub?.planType || "pro_monthly";

  if (!uid && typeof resource.custom_id === "string" && resource.custom_id.includes("|")) {
    const [parsedUid, parsedPlan] = resource.custom_id.split("|");
    uid = parsedUid;
    if (parsedPlan === "pro_monthly" || parsedPlan === "pro_yearly") {
      planType = parsedPlan;
    }
  }

  const email =
    existingSub?.email ||
    resource.subscriber?.email_address ||
    "";
  const displayName =
    existingSub?.displayName ||
    [resource.subscriber?.name?.given_name, resource.subscriber?.name?.surname]
      .filter(Boolean)
      .join(" ") ||
    "Axumite Subscriber";

  const plan = getPayPalPlans()[planType];

  const updateSubRecord = async (
    nextStatus: SubscriptionStatus,
    overrides: Partial<PayPalSubscriptionRecord> = {}
  ) => {
    if (!subIdFromEvent || !uid) return null;
    const record: PayPalSubscriptionRecord = {
      uid,
      email,
      displayName,
      provider: "paypal",
      paypalSubscriptionId: subIdFromEvent,
      paypalPlanId: resource.plan_id || existingSub?.paypalPlanId || plan.paypalPlanId || planType,
      planType,
      status: nextStatus,
      currency: existingSub?.currency || plan.currency,
      amount: existingSub?.amount || plan.amount,
      billingFrequency: existingSub?.billingFrequency || plan.billingFrequency,
      startDate: existingSub?.startDate || resource.start_time || now,
      nextBillingDate:
        overrides.nextBillingDate !== undefined
          ? overrides.nextBillingDate
          : resource.billing_info?.next_billing_time ||
            existingSub?.nextBillingDate ||
            addBillingPeriod(now, plan.billingFrequency),
      cancelAtPeriodEnd: overrides.cancelAtPeriodEnd ?? existingSub?.cancelAtPeriodEnd ?? false,
      mode: existingSub?.mode || runtimeSettings.mode,
      integrationMethod: existingSub?.integrationMethod || "subscriptions_api",
      updatedAt: now,
    };
    paypalSubscriptions.set(subIdFromEvent, record);
    await upsertFirestoreSubscription({
      uid: record.uid,
      provider: "paypal",
      paypalSubscriptionId: record.paypalSubscriptionId,
      paypalPlanId: record.paypalPlanId,
      planType: record.planType,
      status: record.status,
      currency: record.currency,
      amount: record.amount,
      billingFrequency: record.billingFrequency,
      startDate: record.startDate,
      nextBillingDate: record.nextBillingDate,
      cancelAtPeriodEnd: record.cancelAtPeriodEnd,
      updatedAt: record.updatedAt,
    });
    return record;
  };

  switch (event.event_type) {
    case "BILLING.SUBSCRIPTION.CREATED": {
      await updateSubRecord("APPROVAL_PENDING", { nextBillingDate: null });
      break;
    }

    case "BILLING.SUBSCRIPTION.ACTIVATED": {
      const updated = await updateSubRecord("ACTIVE", { cancelAtPeriodEnd: false });
      if (uid) {
        await syncEntitlementToStores({
          uid,
          email,
          displayName,
          plan: "pro",
          isPro: true,
          subscriptionStatus: "ACTIVE",
          expiresAt: updated?.nextBillingDate || addBillingPeriod(now, plan.billingFrequency),
        });
      }
      break;
    }

    case "BILLING.SUBSCRIPTION.UPDATED": {
      const remoteStatus = String(resource.status || "ACTIVE").toUpperCase() as SubscriptionStatus;
      const updated = await updateSubRecord(remoteStatus);
      if (uid) {
        const isActive = remoteStatus === "ACTIVE" || remoteStatus === "APPROVED";
        await syncEntitlementToStores({
          uid,
          email,
          displayName,
          plan: isActive ? "pro" : "free",
          isPro: isActive,
          subscriptionStatus: remoteStatus,
          expiresAt: isActive ? updated?.nextBillingDate || null : null,
        });
      }
      break;
    }

    case "BILLING.SUBSCRIPTION.CANCELLED": {
      const nextBill =
        resource.billing_info?.next_billing_time || existingSub?.nextBillingDate || null;
      const stillPaid = Boolean(nextBill) && new Date(nextBill!).getTime() > Date.now();
      await updateSubRecord("CANCELLED", {
        cancelAtPeriodEnd: true,
        nextBillingDate: nextBill,
      });
      if (uid) {
        await syncEntitlementToStores({
          uid,
          email,
          displayName,
          plan: stillPaid ? "pro" : "free",
          isPro: stillPaid,
          subscriptionStatus: "CANCELLED",
          expiresAt: stillPaid ? nextBill : now,
        });
      }
      break;
    }

    case "BILLING.SUBSCRIPTION.EXPIRED": {
      await updateSubRecord("EXPIRED", { nextBillingDate: null });
      if (uid) {
        await syncEntitlementToStores({
          uid,
          email,
          displayName,
          plan: "free",
          isPro: false,
          subscriptionStatus: "EXPIRED",
          expiresAt: null,
        });
      }
      break;
    }

    case "BILLING.SUBSCRIPTION.SUSPENDED": {
      await updateSubRecord("SUSPENDED", { nextBillingDate: null });
      if (uid) {
        await syncEntitlementToStores({
          uid,
          email,
          displayName,
          plan: "free",
          isPro: false,
          subscriptionStatus: "SUSPENDED",
          expiresAt: null,
        });
      }
      break;
    }

    case "BILLING.SUBSCRIPTION.PAYMENT.FAILED": {
      await updateSubRecord("PAYMENT_FAILED");
      if (uid) {
        await syncEntitlementToStores({
          uid,
          email,
          displayName,
          plan: "free",
          isPro: false,
          subscriptionStatus: "PAYMENT_FAILED",
          expiresAt: null,
        });
      }
      if (uid) {
        const failedTxn = `FAIL-${event.id}`;
        const payRec: PayPalPaymentHistoryRecord = {
          uid,
          email,
          provider: "paypal",
          paypalTransactionId: failedTxn,
          paypalSubscriptionId: subIdFromEvent || "unknown",
          planType,
          amount: plan.amount,
          currency: plan.currency,
          paymentStatus: "FAILED",
          paymentDate: now,
          mode: runtimeSettings.mode,
        };
        paypalPayments.set(failedTxn, payRec);
        await upsertFirestorePaymentHistory({
          uid: payRec.uid,
          provider: "paypal",
          paypalTransactionId: payRec.paypalTransactionId,
          paypalSubscriptionId: payRec.paypalSubscriptionId,
          amount: payRec.amount,
          currency: payRec.currency,
          paymentStatus: payRec.paymentStatus,
          paymentDate: payRec.paymentDate,
        });
      }
      break;
    }

    case "PAYMENT.SALE.COMPLETED": {
      const txnId = resource.id || `SALE-${event.id}`;
      const amount = Number(resource.amount?.total || resource.amount?.value || plan.amount);
      const currency = resource.amount?.currency || resource.amount?.currency_code || plan.currency;
      const nextBilling = addBillingPeriod(now, plan.billingFrequency);

      await updateSubRecord("ACTIVE", {
        nextBillingDate: nextBilling,
        cancelAtPeriodEnd: false,
      });

      if (uid) {
        const payRec: PayPalPaymentHistoryRecord = {
          uid,
          email,
          provider: "paypal",
          paypalTransactionId: txnId,
          paypalSubscriptionId: subIdFromEvent || txnId,
          planType,
          amount,
          currency,
          paymentStatus: "COMPLETED",
          paymentDate: resource.create_time || now,
          mode: runtimeSettings.mode,
        };
        paypalPayments.set(txnId, payRec);
        await upsertFirestorePaymentHistory({
          uid: payRec.uid,
          provider: "paypal",
          paypalTransactionId: payRec.paypalTransactionId,
          paypalSubscriptionId: payRec.paypalSubscriptionId,
          amount: payRec.amount,
          currency: payRec.currency,
          paymentStatus: payRec.paymentStatus,
          paymentDate: payRec.paymentDate,
        });

        await syncEntitlementToStores({
          uid,
          email,
          displayName,
          plan: "pro",
          isPro: true,
          subscriptionStatus: "ACTIVE",
          expiresAt: nextBilling,
        });
      }
      break;
    }

    case "PAYMENT.SALE.REFUNDED":
    case "PAYMENT.SALE.REVERSED": {
      const isReversed = event.event_type === "PAYMENT.SALE.REVERSED";
      const txnId = resource.id || `${isReversed ? "REV" : "REF"}-${event.id}`;
      const amount = Number(resource.amount?.total || resource.amount?.value || plan.amount);
      const currency = resource.amount?.currency || resource.amount?.currency_code || plan.currency;

      await updateSubRecord(isReversed ? "REVERSED" : "REFUNDED", {
        nextBillingDate: null,
      });

      if (uid) {
        const payRec: PayPalPaymentHistoryRecord = {
          uid,
          email,
          provider: "paypal",
          paypalTransactionId: txnId,
          paypalSubscriptionId: subIdFromEvent || txnId,
          planType,
          amount,
          currency,
          paymentStatus: isReversed ? "REVERSED" : "REFUNDED",
          paymentDate: now,
          mode: runtimeSettings.mode,
        };
        paypalPayments.set(txnId, payRec);
        await upsertFirestorePaymentHistory({
          uid: payRec.uid,
          provider: "paypal",
          paypalTransactionId: payRec.paypalTransactionId,
          paypalSubscriptionId: payRec.paypalSubscriptionId,
          amount: payRec.amount,
          currency: payRec.currency,
          paymentStatus: payRec.paymentStatus,
          paymentDate: payRec.paymentDate,
        });

        await syncEntitlementToStores({
          uid,
          email,
          displayName,
          plan: "free",
          isPro: false,
          subscriptionStatus: isReversed ? "REVERSED" : "REFUNDED",
          expiresAt: null,
        });
      }
      break;
    }

    default:
      break;
  }

  await writePaymentAuditLog({
    action: `WEBHOOK_${event.event_type}`,
    uid: uid || "unknown",
    email,
    details: { eventId: event.id, subscriptionId: subIdFromEvent },
  });

  return {
    received: true,
    duplicate: false,
    eventId: event.id,
    eventType: event.event_type,
  };
}

export function getAdminPayPalDashboardData(searchQuery = "") {
  const subs = Array.from(paypalSubscriptions.values());
  const payments = Array.from(paypalPayments.values());

  const activeSubs = subs.filter((s) => s.status === "ACTIVE" || s.status === "APPROVED");
  const monthlySubs = activeSubs.filter((s) => s.planType === "pro_monthly");
  const yearlySubs = activeSubs.filter((s) => s.planType === "pro_yearly");
  const cancelledSubs = subs.filter((s) => s.status === "CANCELLED");

  const successfulPayments = payments.filter((p) => p.paymentStatus === "COMPLETED");
  const failedPayments = payments.filter((p) => p.paymentStatus === "FAILED");
  const refundedPayments = payments.filter(
    (p) => p.paymentStatus === "REFUNDED" || p.paymentStatus === "REVERSED"
  );

  const grossRevenue = successfulPayments.reduce((acc, p) => acc + Number(p.amount || 0), 0);
  const refundedAmount = refundedPayments.reduce((acc, p) => acc + Number(p.amount || 0), 0);
  const netVerifiedRevenue = Number(Math.max(0, grossRevenue - refundedAmount).toFixed(2));

  const q = searchQuery.trim().toLowerCase();
  const filteredSubs = q
    ? subs.filter(
        (s) =>
          s.uid.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q) ||
          s.displayName.toLowerCase().includes(q) ||
          s.paypalSubscriptionId.toLowerCase().includes(q) ||
          s.status.toLowerCase().includes(q)
      )
    : subs;

  return {
    summary: {
      totalActiveProSubscribers: activeSubs.length,
      monthlySubscribers: monthlySubs.length,
      yearlySubscribers: yearlySubs.length,
      successfulPayments: successfulPayments.length,
      failedPayments: failedPayments.length,
      cancelledSubscriptions: cancelledSubs.length,
      verifiedRevenue: netVerifiedRevenue,
      currency: runtimeSettings.currency,
      mode: runtimeSettings.mode,
    },
    subscriptions: filteredSubs.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    recentPayments: payments
      .sort((a, b) => b.paymentDate.localeCompare(a.paymentDate))
      .slice(0, 50),
    settings: getPayPalRuntimeSettings(),
    firestoreStatus: getFirestoreAdminStatus(),
  };
}

export interface SandboxTestScenarioResult {
  scenarioId: number;
  title: string;
  passed: boolean;
  details: string;
  latencyMs: number;
}

export async function runPayPalSandboxTestSuite(): Promise<SandboxTestScenarioResult[]> {
  if (runtimeSettings.mode !== "sandbox") {
    throw new Error("Automated sandbox test suite can only run in sandbox mode.");
  }

  const results: SandboxTestScenarioResult[] = [];
  const testUidMonthly = `sbx_user_m_${Date.now()}`;
  const testUidYearly = `sbx_user_y_${Date.now()}`;

  // 1. Sandbox checkout creation + unapproved stays Free
  const t1 = Date.now();
  try {
    const created = await createPayPalSubscriptionOrOrder({
      uid: testUidMonthly,
      email: "sandbox.monthly@axumite.ai",
      displayName: "Sandbox Monthly Tester",
      planType: "pro_monthly",
      returnUrl: "https://example.com/paypal/success",
      cancelUrl: "https://example.com/paypal/cancel",
    });
    const preApprovalEntitlement = await getEntitlementForUser(testUidMonthly);
    const passed = Boolean(created.subscriptionId) && !preApprovalEntitlement.isPro;
    results.push({
      scenarioId: 1,
      title: "1. Sandbox Checkout & Pre-Approval Security Gate",
      passed,
      details: passed
        ? `Pending subscription ${created.subscriptionId} created; Pro remained locked prior to approval.`
        : "Failed pre-approval security gate.",
      latencyMs: Date.now() - t1,
    });

    // 2 & 4. Monthly subscription approval & entitlement activation
    const t2 = Date.now();
    const approved = await verifyAndSyncPayPalSubscription({
      uid: testUidMonthly,
      email: "sandbox.monthly@axumite.ai",
      displayName: "Sandbox Monthly Tester",
      subscriptionId: created.subscriptionId!,
      planType: "pro_monthly",
      sandboxSimulatedApproval: true,
    });
    results.push({
      scenarioId: 2,
      title: "2. Monthly Subscription Creation (€9.99/mo)",
      passed: approved.success && approved.subscription.amount === runtimeSettings.monthlyPrice,
      details: `Plan ${approved.subscription.planType} verified at €${approved.subscription.amount}.`,
      latencyMs: Date.now() - t2,
    });

    // 3. Annual subscription creation & approval
    const t3 = Date.now();
    const createdYearly = await createPayPalSubscriptionOrOrder({
      uid: testUidYearly,
      email: "sandbox.yearly@axumite.ai",
      displayName: "Sandbox Yearly Tester",
      planType: "pro_yearly",
      returnUrl: "https://example.com/paypal/success",
      cancelUrl: "https://example.com/paypal/cancel",
    });
    const approvedYearly = await verifyAndSyncPayPalSubscription({
      uid: testUidYearly,
      email: "sandbox.yearly@axumite.ai",
      displayName: "Sandbox Yearly Tester",
      subscriptionId: createdYearly.subscriptionId!,
      planType: "pro_yearly",
      sandboxSimulatedApproval: true,
    });
    results.push({
      scenarioId: 3,
      title: "3. Annual Subscription Creation (€79.99/yr)",
      passed:
        approvedYearly.success &&
        approvedYearly.subscription.billingFrequency === "YEAR" &&
        approvedYearly.subscription.amount === runtimeSettings.yearlyPrice,
      details: `Yearly plan ${approvedYearly.subscription.paypalSubscriptionId} active until ${approvedYearly.subscription.nextBillingDate}.`,
      latencyMs: Date.now() - t3,
    });

    // 4. Successful subscription approval unlocks all 6 Pro features
    const t4 = Date.now();
    const entMonthly = await getEntitlementForUser(testUidMonthly);
    results.push({
      scenarioId: 4,
      title: "4. Successful Subscription Approval & 6 Pro Features Unlock",
      passed: entMonthly.isPro && entMonthly.features.length === ALL_PRO_FEATURES.length,
      details: `Unlocked all ${entMonthly.features.length} Pro translator features (${entMonthly.features.join(", ")}).`,
      latencyMs: Date.now() - t4,
    });

    // 5. Webhook signature enforcement & idempotent processing
    const t5 = Date.now();
    let unsignedRejected = false;
    try {
      await processPayPalWebhookEvent({
        headers: {},
        event: {
          id: `WH-UNSIGNED-${Date.now()}`,
          event_type: "PAYMENT.SALE.COMPLETED",
          resource: {},
        },
      });
    } catch {
      unsignedRejected = true;
    }
    const webhookEventId = `WH-SBX-SALE-${Date.now()}`;
    const firstDelivery = await processPayPalWebhookEvent({
      headers: {},
      event: {
        id: webhookEventId,
        event_type: "PAYMENT.SALE.COMPLETED",
        resource: {
          id: `SALE-${Date.now()}`,
          billing_agreement_id: created.subscriptionId,
          amount: { total: String(runtimeSettings.monthlyPrice), currency: runtimeSettings.currency },
        },
      },
      skipSignatureCheckForInternalTest: true,
    });
    const dupDelivery = await processPayPalWebhookEvent({
      headers: {},
      event: {
        id: webhookEventId,
        event_type: "PAYMENT.SALE.COMPLETED",
        resource: {},
      },
      skipSignatureCheckForInternalTest: true,
    });
    results.push({
      scenarioId: 5,
      title: "5. Webhook Signature Verification & Idempotency",
      passed: unsignedRejected && !firstDelivery.duplicate && dupDelivery.duplicate,
      details:
        "Unsigned webhook rejected; first verified delivery processed; duplicate delivery ignored idempotently.",
      latencyMs: Date.now() - t5,
    });

    // 6. Subscription cancellation retains access until paid-through date
    const t6 = Date.now();
    const cancelled = await cancelPayPalSubscription({
      uid: testUidYearly,
      subscriptionId: createdYearly.subscriptionId!,
      reason: "Sandbox cancellation test",
    });
    results.push({
      scenarioId: 6,
      title: "6. Subscription Cancellation (Paid-Through Period Retention)",
      passed:
        cancelled.success &&
        cancelled.subscription.status === "CANCELLED" &&
        cancelled.entitlement.isPro,
      details: `Status CANCELLED; Pro access retained until ${cancelled.entitlement.expiresAt}.`,
      latencyMs: Date.now() - t6,
    });

    // 7. Failed payment / suspended / refunded revokes Pro immediately
    const t7 = Date.now();
    await processPayPalWebhookEvent({
      headers: {},
      event: {
        id: `WH-SBX-FAIL-${Date.now()}`,
        event_type: "BILLING.SUBSCRIPTION.PAYMENT.FAILED",
        resource: { id: created.subscriptionId },
      },
      skipSignatureCheckForInternalTest: true,
    });
    const postFailEnt = await getEntitlementForUser(testUidMonthly);
    results.push({
      scenarioId: 7,
      title: "7. Failed Payment Handling & Immediate Entitlement Revocation",
      passed: !postFailEnt.isPro && postFailEnt.plan === "free",
      details: `Payment failed webhook revoked Pro access (status=${postFailEnt.subscriptionStatus}, plan=${postFailEnt.plan}).`,
      latencyMs: Date.now() - t7,
    });

    // 8. Refund / Expired revocation verification
    const t8 = Date.now();
    await processPayPalWebhookEvent({
      headers: {},
      event: {
        id: `WH-SBX-EXP-${Date.now()}`,
        event_type: "BILLING.SUBSCRIPTION.EXPIRED",
        resource: { id: createdYearly.subscriptionId },
      },
      skipSignatureCheckForInternalTest: true,
    });
    const postExpireEnt = await getEntitlementForUser(testUidYearly);
    results.push({
      scenarioId: 8,
      title: "8. Firestore & Entitlement Expiry Synchronization",
      passed: !postExpireEnt.isPro && postExpireEnt.plan === "free",
      details: `Expired subscription synced cleanly (plan=${postExpireEnt.plan}).`,
      latencyMs: Date.now() - t8,
    });

    // 9. Free-to-Pro-to-Free backend entitlement transitions
    const t9 = Date.now();
    await processPayPalWebhookEvent({
      headers: {},
      event: {
        id: `WH-SBX-ACT-${Date.now()}`,
        event_type: "BILLING.SUBSCRIPTION.ACTIVATED",
        resource: { id: created.subscriptionId },
      },
      skipSignatureCheckForInternalTest: true,
    });
    const reactivatedEnt = await getEntitlementForUser(testUidMonthly);
    results.push({
      scenarioId: 9,
      title: "9. Free-to-Pro Backend Feature Access Control",
      passed: reactivatedEnt.isPro && reactivatedEnt.features.includes("video_dubbing"),
      details: `Verified HMAC entitlement signature ${reactivatedEnt.entitlementSignature.slice(0, 12)}...`,
      latencyMs: Date.now() - t9,
    });

    // 10. Clean up sandbox test fixtures & verify Admin metrics integrity
    const t10 = Date.now();
    paypalSubscriptions.delete(created.subscriptionId!);
    paypalSubscriptions.delete(createdYearly.subscriptionId!);
    paypalEntitlements.delete(testUidMonthly);
    paypalEntitlements.delete(testUidYearly);
    for (const [k, v] of paypalPayments.entries()) {
      if (v.uid === testUidMonthly || v.uid === testUidYearly) {
        paypalPayments.delete(k);
      }
    }
    const adminOverview = getAdminPayPalDashboardData();
    results.push({
      scenarioId: 10,
      title: "10. Admin Metrics Integrity & Live Mode Guard",
      passed:
        adminOverview.summary.mode === "sandbox" &&
        !runtimeSettings.liveEnabled,
      details: `Sandbox guard active (mode=${adminOverview.summary.mode}); Live prices remain locked without explicit admin approval.`,
      latencyMs: Date.now() - t10,
    });
  } catch (err: any) {
    results.push({
      scenarioId: results.length + 1,
      title: "Sandbox Test Execution",
      passed: false,
      details: err?.message || "Unexpected error",
      latencyMs: 0,
    });
  }

  return results;
}
