import crypto from "node:crypto";
import type {
  DatabasePaymentRecord,
  DatabaseSubscriptionRecord,
  DatabaseUserAccount,
  SupportedCurrency,
  SavedPaymentMethod,
  AddPaymentMethodInput,
} from "../types.ts";
import {
  paypalUsers,
  paypalSubscriptions,
  paypalPayments,
  paypalEntitlements,
  getPayPalPlans,
  getPayPalRuntimeSettings,
  getAdminPayPalDashboardData,
  runPayPalSandboxTestSuite,
  signEntitlement,
  ALL_PRO_FEATURES,
} from "./paypalEngine.ts";

export interface PlanPricing {
  id: string;
  name: string;
  tier: "free" | "pro";
  billingCycle: "monthly" | "yearly";
  basePriceEUR: number;
  basePriceUSD: number;
  features: string[];
}

export const CURRENCY_RATES: Record<SupportedCurrency, { rate: number; symbol: string }> = {
  EUR: { rate: 1.0, symbol: "€" },
  USD: { rate: 1.08, symbol: "$" },
  ERN: { rate: 16.2, symbol: "Nfk" },
  ETB: { rate: 135.0, symbol: "Br" },
  GBP: { rate: 0.85, symbol: "£" },
  CAD: { rate: 1.48, symbol: "CA$" },
  AUD: { rate: 1.65, symbol: "AU$" },
  JPY: { rate: 164.0, symbol: "¥" },
  CHF: { rate: 0.96, symbol: "CHF" },
};

export function convertPrice(amountEUR: number, currency: SupportedCurrency = "EUR"): number {
  const rate = CURRENCY_RATES[currency]?.rate ?? 1;
  return Number((amountEUR * rate).toFixed(2));
}

export function getSovereignPlans(): Record<string, PlanPricing> {
  const pp = getPayPalPlans();
  return {
    pro_monthly: {
      id: "pro_monthly",
      name: pp.pro_monthly.name,
      tier: "pro",
      billingCycle: "monthly",
      basePriceEUR: pp.pro_monthly.amount,
      basePriceUSD: convertPrice(pp.pro_monthly.amount, "USD"),
      features: [...ALL_PRO_FEATURES],
    },
    pro_yearly: {
      id: "pro_yearly",
      name: pp.pro_yearly.name,
      tier: "pro",
      billingCycle: "yearly",
      basePriceEUR: pp.pro_yearly.amount,
      basePriceUSD: convertPrice(pp.pro_yearly.amount, "USD"),
      features: [...ALL_PRO_FEATURES],
    },
  };
}

export const dbUsers = new Map<string, DatabaseUserAccount>();
export const dbSubscriptions = new Map<string, DatabaseSubscriptionRecord>();
export const dbPayments = new Map<string, DatabasePaymentRecord>();
export const dbPaymentMethods = new Map<string, SavedPaymentMethod[]>();

export function generateCryptographicEntitlement(
  userId: string,
  tier: string,
  expiryTimestamp: number
): string {
  return signEntitlement(
    userId,
    tier === "pro" || tier === "enterprise" ? "pro" : "free",
    expiryTimestamp > 0 ? new Date(expiryTimestamp).toISOString() : null
  );
}

export function checkUserEntitlement(userId: string, signature?: string) {
  const ent = paypalEntitlements.get(userId);
  const sub = Array.from(paypalSubscriptions.values())
    .filter((s) => s.uid === userId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];

  if (ent && ent.isPro) {
    const expired =
      Boolean(ent.expiresAt) && new Date(ent.expiresAt!).getTime() <= Date.now();
    if (!expired) {
      return {
        isPremium: true,
        tier: "pro" as const,
        status: (sub?.status?.toLowerCase() || "active") as any,
        signatureValid: signature ? signature === ent.entitlementSignature : true,
        subscription: sub
          ? {
              id: sub.paypalSubscriptionId,
              user_id: sub.uid,
              user_email: sub.email,
              provider_customer_id: sub.uid,
              provider_subscription_id: sub.paypalSubscriptionId,
              plan: sub.planType,
              status: sub.status.toLowerCase() as any,
              start_date: sub.startDate,
              end_date: sub.nextBillingDate || sub.startDate,
              renewal_date: sub.nextBillingDate || sub.startDate,
              created_at: sub.startDate,
              updated_at: sub.updatedAt,
            }
          : undefined,
      };
    }
  }

  return {
    isPremium: false,
    tier: "free" as const,
    status: (sub?.status?.toLowerCase() || "none") as any,
    signatureValid: true,
    subscription: undefined,
  };
}

export function getAdminPaymentMetrics() {
  const data = getAdminPayPalDashboardData();
  const s = data.summary;
  return {
    totalRevenueUSD: s.verifiedRevenue,
    monthlyRecurringRevenueUSD: Number((s.monthlySubscribers * getPayPalRuntimeSettings().monthlyPrice).toFixed(2)),
    activeSubscriptions: s.totalActiveProSubscribers,
    churnRatePercent:
      s.totalActiveProSubscribers + s.cancelledSubscriptions > 0
        ? Number(
            (
              (s.cancelledSubscriptions /
                (s.totalActiveProSubscribers + s.cancelledSubscriptions)) *
              100
            ).toFixed(1)
          )
        : 0,
    failedPaymentsCount: s.failedPayments,
    refundedPaymentsCount: data.recentPayments.filter(
      (p) => p.paymentStatus === "REFUNDED" || p.paymentStatus === "REVERSED"
    ).length,
    totalUsersCount: Math.max(paypalUsers.size, dbUsers.size),
    recentTransactions: data.recentPayments.map((p) => ({
      id: p.paypalTransactionId,
      user_id: p.uid,
      user_email: p.email,
      provider_payment_id: p.paypalTransactionId,
      amount: p.amount,
      currency: p.currency,
      status: p.paymentStatus.toLowerCase(),
      payment_date: p.paymentDate,
      receipt_url: "",
      plan_id: p.planType,
      invoice_number: p.paypalTransactionId,
      payment_method_label: "PayPal",
      created_at: p.paymentDate,
    })),
    currencyBreakdown: [
      { currency: s.currency, amount: s.verifiedRevenue, count: s.successfulPayments },
    ],
  };
}

export async function runFullPaymentTestSuite() {
  return runPayPalSandboxTestSuite();
}

export function getUserPaymentMethods(userId?: string, userEmail?: string): SavedPaymentMethod[] {
  const key = userId || (userEmail ? `usr_${userEmail.toLowerCase().replace(/[^a-z0-9]/g, "_")}` : "usr_guest");
  const list = dbPaymentMethods.get(key) || [];
  if (list.length > 0) return list;
  const email = (userEmail || "").trim();
  if (!email || email === "guest@axumite.ai") return [];
  return [
    {
      id: `pm_paypal_${crypto.createHash("sha256").update(email).digest("hex").slice(0, 8)}`,
      userId: key,
      userEmail: email,
      type: "paypal",
      label: `PayPal (${email})`,
      providerBadge: "PayPal",
      email,
      currency: getPayPalRuntimeSettings().currency as SupportedCurrency,
      isDefault: true,
      isVerified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
}

export function addUserPaymentMethod(input: AddPaymentMethodInput): SavedPaymentMethod {
  if (input.type !== "paypal") {
    throw new Error("Only PayPal payment accounts are supported.");
  }
  const userId = input.userId || "usr_guest";
  const userEmail = (input.userEmail || input.email || "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail)) {
    throw new Error("Please enter a valid PayPal email address.");
  }
  const now = new Date().toISOString();
  const currentList = [...(dbPaymentMethods.get(userId) || [])].map((m) => ({
    ...m,
    isDefault: input.setAsDefault ? false : m.isDefault,
  }));
  const record: SavedPaymentMethod = {
    id: `pm_paypal_${Date.now()}`,
    userId,
    ...(input.authUid ? { authUid: input.authUid } : {}),
    userEmail,
    type: "paypal",
    label: input.label?.trim() || `PayPal (${userEmail})`,
    providerBadge: "PayPal",
    email: (input.email || userEmail).trim(),
    currency: (input.currency || getPayPalRuntimeSettings().currency) as SupportedCurrency,
    isDefault: input.setAsDefault ?? currentList.length === 0,
    isVerified: true,
    createdAt: now,
    updatedAt: now,
  };
  currentList.unshift(record);
  dbPaymentMethods.set(userId, currentList);
  return record;
}

export function setDefaultUserPaymentMethod(methodId: string, userId?: string): SavedPaymentMethod[] {
  const key = userId || "usr_guest";
  const list = (dbPaymentMethods.get(key) || []).map((m) => ({
    ...m,
    isDefault: m.id === methodId,
    updatedAt: new Date().toISOString(),
  }));
  dbPaymentMethods.set(key, list);
  return list;
}

export function deleteUserPaymentMethod(methodId: string, userId?: string): SavedPaymentMethod[] {
  const key = userId || "usr_guest";
  const list = (dbPaymentMethods.get(key) || []).filter((m) => m.id !== methodId);
  dbPaymentMethods.set(key, list);
  return list;
}

export { paypalSubscriptions, paypalPayments };
