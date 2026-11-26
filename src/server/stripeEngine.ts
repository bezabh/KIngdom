import Stripe from "stripe";
import {
  ALL_PRO_FEATURES,
  paypalUsers,
  paypalSubscriptions,
  paypalPayments,
  paypalEntitlements,
  signEntitlement,
  getSubscriptionStatusForUser,
  type PayPalSubscriptionRecord,
  type PayPalPaymentHistoryRecord,
  type PayPalUserEntitlement,
} from "./paypalEngine.ts";
import {
  upsertFirestoreUser,
  upsertFirestoreSubscription,
  upsertFirestorePaymentHistory,
  upsertFirestoreEntitlement,
  claimWebhookEventIdempotency,
  writePaymentAuditLog,
} from "./firebaseAdmin.ts";
import { updateSaasUserPlan } from "./saasQuotaEngine.ts";

export type StripeMode = "test" | "live";

const DEFAULT_STRIPE_MONTHLY_EUR = 19.9;

function parseMonthlyPriceEur(): number {
  const raw = Number(process.env.STRIPE_PRO_MONTHLY_PRICE_EUR);
  if (Number.isFinite(raw) && raw > 0) {
    return Number(raw.toFixed(2));
  }
  return DEFAULT_STRIPE_MONTHLY_EUR;
}

export function getStripeMonthlyPriceEur(): number {
  return parseMonthlyPriceEur();
}

export function getStripeSecretKey(): string {
  const raw = (process.env.STRIPE_SECRET_KEY || "").trim();
  if (/^(?:sk|rk)_(?:test|live)_[A-Za-z0-9_]{10,}$/.test(raw)) {
    return raw;
  }
  return "";
}

export function getStripePublishableKey(): string | null {
  const key = (process.env.STRIPE_PUBLISHABLE_KEY || "").trim();
  return /^pk_(?:test|live)_[A-Za-z0-9_]{10,}$/.test(key) ? key : null;
}

export function getStripeWebhookSecret(): string {
  const secret = (process.env.STRIPE_WEBHOOK_SECRET || "").trim();
  return /^whsec_[A-Za-z0-9_]{10,}$/.test(secret) ? secret : "";
}

export function getStripeMode(): StripeMode {
  const secret = getStripeSecretKey();
  return secret.startsWith("sk_live_") || secret.startsWith("rk_live_") ? "live" : "test";
}

export function isStripeConfigured(): boolean {
  return Boolean(getStripeSecretKey());
}

let cachedStripeKey = "";
let cachedStripeInstance: Stripe | null = null;

function getStripeClient(): Stripe {
  const secretKey = getStripeSecretKey();
  if (!secretKey) {
    throw new Error(
      "A valid Stripe secret key (sk_test_... or sk_live_...) is not configured on the server."
    );
  }
  if (!cachedStripeInstance || cachedStripeKey !== secretKey) {
    cachedStripeKey = secretKey;
    cachedStripeInstance = new Stripe(secretKey);
  }
  return cachedStripeInstance;
}

export interface StripePublicConfig {
  provider: "stripe";
  configured: boolean;
  mode: StripeMode;
  publishableKey: string | null;
  webhookConfigured: boolean;
  currency: "EUR";
  monthlyPlan: {
    planType: "pro_monthly";
    name: string;
    description: string;
    amount: number;
    currency: "EUR";
    billingFrequency: "MONTH";
    intervalCount: 1;
    features: string[];
  };
}

export function getPublicStripeConfig(): StripePublicConfig {
  const amount = getStripeMonthlyPriceEur();
  return {
    provider: "stripe",
    configured: isStripeConfigured(),
    mode: getStripeMode(),
    publishableKey: getStripePublishableKey(),
    webhookConfigured: Boolean(getStripeWebhookSecret()),
    currency: "EUR",
    monthlyPlan: {
      planType: "pro_monthly",
      name: "Axumite Pro Monthly (Stripe)",
      description: `Monthly recurring access to all 6 Axumite AI Pro features (€${amount.toFixed(2)}/month).`,
      amount,
      currency: "EUR",
      billingFrequency: "MONTH",
      intervalCount: 1,
      features: [...ALL_PRO_FEATURES],
    },
  };
}

function addOneMonthIso(fromDate = new Date()): string {
  const next = new Date(fromDate);
  next.setMonth(next.getMonth() + 1);
  return next.toISOString();
}

function mapStripeSubscriptionStatus(
  rawStatus: string | undefined
): PayPalSubscriptionRecord["status"] {
  const normalized = (rawStatus || "").toLowerCase();
  if (normalized === "active" || normalized === "trialing") return "ACTIVE";
  if (normalized === "canceled") return "CANCELLED";
  if (normalized === "past_due" || normalized === "unpaid") return "PAYMENT_FAILED";
  if (normalized === "incomplete" || normalized === "incomplete_expired") return "EXPIRED";
  if (normalized === "paused") return "SUSPENDED";
  return "APPROVAL_PENDING";
}

async function persistStripeSubscriptionState(params: {
  uid: string;
  email: string;
  displayName: string;
  stripeSubscriptionId: string;
  stripePriceId: string;
  transactionId: string;
  status: PayPalSubscriptionRecord["status"];
  amount: number;
  currency: string;
  startDate: string;
  nextBillingDate: string | null;
  cancelAtPeriodEnd: boolean;
  recordPayment?: boolean;
  paymentStatus?: PayPalPaymentHistoryRecord["paymentStatus"];
}) {
  const now = new Date().toISOString();
  const mode = getStripeMode();

  if (!paypalUsers.has(params.uid)) {
    const userObj = {
      uid: params.uid,
      email: params.email,
      displayName: params.displayName,
      accountCreatedAt: now,
    };
    paypalUsers.set(params.uid, userObj);
    await upsertFirestoreUser(userObj);
  }

  const subRecord: PayPalSubscriptionRecord = {
    uid: params.uid,
    email: params.email,
    displayName: params.displayName,
    provider: "stripe",
    paypalSubscriptionId: params.stripeSubscriptionId,
    paypalPlanId: params.stripePriceId,
    planType: "pro_monthly",
    status: params.status,
    currency: params.currency.toUpperCase(),
    amount: params.amount,
    billingFrequency: "MONTH",
    startDate: params.startDate,
    nextBillingDate: params.nextBillingDate,
    cancelAtPeriodEnd: params.cancelAtPeriodEnd,
    mode: mode === "live" ? "live" : "sandbox",
    integrationMethod: "subscriptions_api",
    updatedAt: now,
  };
  paypalSubscriptions.set(params.stripeSubscriptionId, subRecord);

  await upsertFirestoreSubscription({
    uid: params.uid,
    provider: "stripe",
    paypalSubscriptionId: params.stripeSubscriptionId,
    paypalPlanId: params.stripePriceId,
    planType: "pro_monthly",
    status: params.status,
    currency: params.currency.toUpperCase(),
    amount: params.amount,
    billingFrequency: "MONTH",
    startDate: params.startDate,
    nextBillingDate: params.nextBillingDate,
    cancelAtPeriodEnd: params.cancelAtPeriodEnd,
    updatedAt: now,
  });

  if (params.recordPayment && params.transactionId) {
    const paymentStatus = params.paymentStatus || "COMPLETED";
    const paymentRecord: PayPalPaymentHistoryRecord = {
      uid: params.uid,
      email: params.email,
      provider: "stripe",
      paypalTransactionId: params.transactionId,
      paypalSubscriptionId: params.stripeSubscriptionId,
      planType: "pro_monthly",
      amount: params.amount,
      currency: params.currency.toUpperCase(),
      paymentStatus,
      paymentDate: now,
      mode: mode === "live" ? "live" : "sandbox",
    };
    paypalPayments.set(params.transactionId, paymentRecord);

    await upsertFirestorePaymentHistory({
      uid: params.uid,
      provider: "stripe",
      paypalTransactionId: params.transactionId,
      paypalSubscriptionId: params.stripeSubscriptionId,
      amount: params.amount,
      currency: params.currency.toUpperCase(),
      paymentStatus,
      paymentDate: now,
    });
  }

  const paidThroughNotExpired =
    Boolean(params.nextBillingDate) &&
    new Date(params.nextBillingDate!).getTime() > Date.now();
  const isPro =
    params.status === "ACTIVE" ||
    (params.status === "CANCELLED" && params.cancelAtPeriodEnd && paidThroughNotExpired);

  const plan: "free" | "pro" = isPro ? "pro" : "free";
  const entitlement: PayPalUserEntitlement = {
    uid: params.uid,
    plan,
    isPro,
    features: isPro ? [...ALL_PRO_FEATURES] : [],
    subscriptionStatus: params.status,
    expiresAt: params.nextBillingDate,
    updatedAt: now,
    entitlementSignature: signEntitlement(params.uid, plan, params.nextBillingDate),
  };

  paypalEntitlements.set(params.uid, entitlement);
  await upsertFirestoreEntitlement({
    uid: params.uid,
    plan,
    isPro,
    features: entitlement.features,
    subscriptionStatus: params.status,
    expiresAt: params.nextBillingDate,
    updatedAt: now,
  });

  updateSaasUserPlan(params.uid, isPro ? "premium" : "free");
}

export async function createStripeMonthlyCheckoutSession(params: {
  uid: string;
  email: string;
  displayName: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<{
  success: boolean;
  configured: boolean;
  mode: StripeMode;
  sessionId: string;
  checkoutUrl: string;
  amount: number;
  currency: "EUR";
}> {
  const stripe = getStripeClient();
  const amountEur = getStripeMonthlyPriceEur();
  const unitAmountCents = Math.round(amountEur * 100);
  const configuredPriceId = (process.env.STRIPE_PRO_MONTHLY_PRICE_ID || "").trim();

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = configuredPriceId
    ? [{ price: configuredPriceId, quantity: 1 }]
    : [
        {
          price_data: {
            currency: "eur",
            unit_amount: unitAmountCents,
            recurring: {
              interval: "month",
              interval_count: 1,
            },
            product_data: {
              name: "Axumite AI Pro — Monthly Subscription",
              description:
                "Monthly recurring subscription unlocking all 6 Axumite AI Pro tools.",
            },
          },
          quantity: 1,
        },
      ];

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    client_reference_id: params.uid,
    customer_email: params.email || undefined,
    line_items: lineItems,
    metadata: {
      uid: params.uid,
      planType: "pro_monthly",
      provider: "stripe",
    },
    subscription_data: {
      metadata: {
        uid: params.uid,
        planType: "pro_monthly",
        provider: "stripe",
      },
    },
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
  });

  if (!session.url) {
    throw new Error("Stripe Checkout Session did not return a redirect URL.");
  }

  await writePaymentAuditLog({
    action: "stripe_checkout_session_created",
    uid: params.uid,
    email: params.email,
    details: {
      sessionId: session.id,
      amountEur,
      currency: "EUR",
      mode: getStripeMode(),
    },
  });

  return {
    success: true,
    configured: true,
    mode: getStripeMode(),
    sessionId: session.id,
    checkoutUrl: session.url,
    amount: amountEur,
    currency: "EUR",
  };
}

export async function verifyStripeCheckoutSession(params: {
  uid: string;
  email: string;
  displayName: string;
  sessionId: string;
}) {
  const stripe = getStripeClient();
  const session = await stripe.checkout.sessions.retrieve(params.sessionId, {
    expand: ["subscription", "subscription.items.data.price"],
  });

  const sessionOwnerUid = session.client_reference_id || session.metadata?.uid || "";
  if (!sessionOwnerUid || sessionOwnerUid !== params.uid) {
    throw new Error("Stripe Checkout Session does not belong to the authenticated user.");
  }

  const isComplete = session.status === "complete";
  const isPaid =
    session.payment_status === "paid" ||
    session.payment_status === "no_payment_required";

  if (!isComplete || !isPaid) {
    throw new Error(
      `Stripe payment has not completed (status=${session.status}, payment_status=${session.payment_status}).`
    );
  }

  const expandedSub =
    typeof session.subscription === "object" && session.subscription !== null
      ? (session.subscription as Stripe.Subscription)
      : null;

  const subscriptionId =
    expandedSub?.id ||
    (typeof session.subscription === "string" ? session.subscription : session.id);
  const priceId =
    expandedSub?.items?.data?.[0]?.price?.id ||
    (process.env.STRIPE_PRO_MONTHLY_PRICE_ID || "stripe_pro_monthly_eur");
  const periodEndUnix = (expandedSub as unknown as { current_period_end?: number })?.current_period_end;
  const nextBillingDate = periodEndUnix
    ? new Date(periodEndUnix * 1000).toISOString()
    : addOneMonthIso();
  const mappedStatus = expandedSub
    ? mapStripeSubscriptionStatus(expandedSub.status)
    : "ACTIVE";

  const amountEur =
    typeof session.amount_total === "number" && session.amount_total > 0
      ? Number((session.amount_total / 100).toFixed(2))
      : getStripeMonthlyPriceEur();

  await persistStripeSubscriptionState({
    uid: params.uid,
    email: params.email || session.customer_details?.email || "",
    displayName: params.displayName || session.customer_details?.name || "Axumite Member",
    stripeSubscriptionId: subscriptionId,
    stripePriceId: priceId,
    transactionId: session.id,
    status: mappedStatus,
    amount: amountEur,
    currency: (session.currency || "eur").toUpperCase(),
    startDate: new Date((session.created || Math.floor(Date.now() / 1000)) * 1000).toISOString(),
    nextBillingDate,
    cancelAtPeriodEnd: Boolean(expandedSub?.cancel_at_period_end),
    recordPayment: true,
    paymentStatus: "COMPLETED",
  });

  await writePaymentAuditLog({
    action: "stripe_checkout_verified",
    uid: params.uid,
    email: params.email,
    details: {
      sessionId: session.id,
      subscriptionId,
      amountEur,
      status: mappedStatus,
    },
  });

  const statusPayload = await getSubscriptionStatusForUser(params.uid);
  return {
    ...statusPayload,
    provider: "stripe" as const,
    sessionId: session.id,
  };
}

export async function cancelStripeSubscription(params: {
  uid: string;
  subscriptionId?: string;
  reason?: string;
}) {
  const existing = params.subscriptionId
    ? paypalSubscriptions.get(params.subscriptionId)
    : Array.from(paypalSubscriptions.values()).find(
        (s) => s.uid === params.uid && s.provider === "stripe"
      );

  if (!existing || existing.uid !== params.uid || existing.provider !== "stripe") {
    throw new Error("Stripe subscription not found for this account.");
  }

  const stripe = getStripeClient();
  const updatedSub = await stripe.subscriptions.update(existing.paypalSubscriptionId, {
    cancel_at_period_end: true,
    metadata: {
      cancel_reason: (params.reason || "User requested cancellation").slice(0, 240),
    },
  });

  const periodEndUnix = (updatedSub as unknown as { current_period_end?: number })?.current_period_end;
  const nextBillingDate = periodEndUnix
    ? new Date(periodEndUnix * 1000).toISOString()
    : existing.nextBillingDate;

  await persistStripeSubscriptionState({
    uid: existing.uid,
    email: existing.email,
    displayName: existing.displayName,
    stripeSubscriptionId: existing.paypalSubscriptionId,
    stripePriceId: existing.paypalPlanId,
    transactionId: "",
    status: "CANCELLED",
    amount: existing.amount,
    currency: existing.currency,
    startDate: existing.startDate,
    nextBillingDate,
    cancelAtPeriodEnd: true,
    recordPayment: false,
  });

  await writePaymentAuditLog({
    action: "stripe_subscription_cancelled",
    uid: params.uid,
    email: existing.email,
    details: {
      subscriptionId: existing.paypalSubscriptionId,
      reason: params.reason || "User requested cancellation",
      paidThrough: nextBillingDate,
    },
  });

  const statusPayload = await getSubscriptionStatusForUser(params.uid);
  return {
    ...statusPayload,
    message:
      "Your Stripe monthly subscription will not renew. Pro access remains active until the end of the current billing period.",
  };
}

const processedStripeEvents = new Set<string>();

export async function processStripeWebhookEvent(params: {
  rawBody: Buffer | undefined;
  signature: string | undefined;
}): Promise<{ received: boolean; duplicate?: boolean; eventType: string }> {
  const webhookSecret = getStripeWebhookSecret();
  if (!webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not configured on the server.");
  }
  if (!params.signature || !params.rawBody) {
    throw new Error("Missing Stripe-Signature header or raw request body.");
  }

  const stripe = getStripeClient();
  const event = stripe.webhooks.constructEvent(
    params.rawBody,
    params.signature,
    webhookSecret
  );

  if (processedStripeEvents.has(event.id)) {
    return { received: true, duplicate: true, eventType: event.type };
  }

  const idempotency = await claimWebhookEventIdempotency(event.id, event.type);
  if (idempotency.alreadyProcessed) {
    processedStripeEvents.add(event.id);
    return { received: true, duplicate: true, eventType: event.type };
  }
  processedStripeEvents.add(event.id);

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const uid = session.client_reference_id || session.metadata?.uid;
      if (uid && (session.payment_status === "paid" || session.payment_status === "no_payment_required")) {
        const subId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id || session.id;
        const amountEur =
          typeof session.amount_total === "number" && session.amount_total > 0
            ? Number((session.amount_total / 100).toFixed(2))
            : getStripeMonthlyPriceEur();
        await persistStripeSubscriptionState({
          uid,
          email: session.customer_details?.email || "",
          displayName: session.customer_details?.name || "Axumite Member",
          stripeSubscriptionId: subId,
          stripePriceId: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || "stripe_pro_monthly_eur",
          transactionId: session.id,
          status: "ACTIVE",
          amount: amountEur,
          currency: (session.currency || "eur").toUpperCase(),
          startDate: new Date().toISOString(),
          nextBillingDate: addOneMonthIso(),
          cancelAtPeriodEnd: false,
          recordPayment: true,
          paymentStatus: "COMPLETED",
        });
      }
      break;
    }

    case "invoice.payment_succeeded":
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const rawSub = (invoice as unknown as { subscription?: string | { id?: string } }).subscription;
      const subId = typeof rawSub === "string" ? rawSub : rawSub?.id;
      const existing = subId ? paypalSubscriptions.get(subId) : undefined;
      if (existing) {
        const failed = event.type === "invoice.payment_failed";
        const amountEur =
          typeof invoice.amount_paid === "number" && invoice.amount_paid > 0
            ? Number((invoice.amount_paid / 100).toFixed(2))
            : existing.amount;
        await persistStripeSubscriptionState({
          uid: existing.uid,
          email: existing.email,
          displayName: existing.displayName,
          stripeSubscriptionId: existing.paypalSubscriptionId,
          stripePriceId: existing.paypalPlanId,
          transactionId: invoice.id,
          status: failed ? "PAYMENT_FAILED" : "ACTIVE",
          amount: amountEur,
          currency: (invoice.currency || "eur").toUpperCase(),
          startDate: existing.startDate,
          nextBillingDate: failed ? null : addOneMonthIso(),
          cancelAtPeriodEnd: existing.cancelAtPeriodEnd,
          recordPayment: true,
          paymentStatus: failed ? "FAILED" : "COMPLETED",
        });
      }
      break;
    }

    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const existing = paypalSubscriptions.get(sub.id);
      const uid = existing?.uid || sub.metadata?.uid;
      if (uid) {
        const periodEndUnix = (sub as unknown as { current_period_end?: number })?.current_period_end;
        const nextBillingDate = periodEndUnix
          ? new Date(periodEndUnix * 1000).toISOString()
          : existing?.nextBillingDate || null;
        await persistStripeSubscriptionState({
          uid,
          email: existing?.email || "",
          displayName: existing?.displayName || "Axumite Member",
          stripeSubscriptionId: sub.id,
          stripePriceId:
            sub.items?.data?.[0]?.price?.id ||
            existing?.paypalPlanId ||
            "stripe_pro_monthly_eur",
          transactionId: "",
          status:
            event.type === "customer.subscription.deleted"
              ? "EXPIRED"
              : mapStripeSubscriptionStatus(sub.status),
          amount: existing?.amount || getStripeMonthlyPriceEur(),
          currency: (sub.currency || existing?.currency || "eur").toUpperCase(),
          startDate: existing?.startDate || new Date().toISOString(),
          nextBillingDate:
            event.type === "customer.subscription.deleted" ? null : nextBillingDate,
          cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
          recordPayment: false,
        });
      }
      break;
    }

    default:
      break;
  }

  return { received: true, eventType: event.type };
}
