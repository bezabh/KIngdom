import type { NextFunction, Request, Response } from "express";
import {
  getFirestoreEntitlement,
  getFirestoreSubscriptionsForUid,
  isFirestoreUserSuspended,
  verifyFirebaseCaller,
  type FirestoreSubscriptionRecord,
  type FirestoreUserEntitlementRecord,
  type VerifiedCaller,
} from "./firebaseAdmin.ts";
import { getEntitlementForUser } from "./paypalEngine.ts";

export type ServerPremiumTranslationFeature =
  | "voice_translation"
  | "conversation_translation"
  | "call_translation"
  | "ocr_docs"
  | "pronunciation_check"
  | "offline_packs"
  | "video_dubbing"
  | "premium_text_translation";

export interface ServerSubscriptionValidationResult {
  allowed: boolean;
  uid: string;
  feature: ServerPremiumTranslationFeature;
  subscriptionStatus: string;
  expiresAt: string | null;
  source: "firestore" | "paypal_engine_fallback" | "admin_verified" | "none";
  code:
    | "OK"
    | "UNAUTHENTICATED"
    | "ACCOUNT_SUSPENDED"
    | "SUBSCRIPTION_NOT_FOUND"
    | "SUBSCRIPTION_INACTIVE"
    | "SUBSCRIPTION_EXPIRED"
    | "FEATURE_NOT_ENTITLED";
  message: string;
  tigrinyaMessage: string;
}

const FEATURE_LABELS: Record<
  ServerPremiumTranslationFeature,
  { en: string; ti: string; entitlementKey?: string }
> = {
  voice_translation: {
    en: "Voice Translator Pro",
    ti: "ትርጉም ድምጺ ፕሮ",
  },
  conversation_translation: {
    en: "Live Conversation Translator",
    ti: "ቀጥታዊ ትርጉም ዕላል",
  },
  call_translation: {
    en: "Live Call Translation",
    ti: "ቀጥታዊ ትርጉም ጻውዒት",
  },
  ocr_docs: {
    en: "Camera & Screen OCR Translation",
    ti: "ትርጉም ስክሪንን ካሜራን OCR",
    entitlementKey: "ocr_docs",
  },
  pronunciation_check: {
    en: "AI Pronunciation Practice",
    ti: "ናይ AI መምዘኒ ኣደማምጻ",
  },
  offline_packs: {
    en: "Offline Neural Language Packs",
    ti: "ብዘይ ኢንተርነት ዝሰርሑ ፓኬጃት ቋንቋ",
  },
  video_dubbing: {
    en: "AI Video Translation & Dubbing",
    ti: "ትርጉምን ድምጽን ቪድዮ",
    entitlementKey: "video_dubbing",
  },
  premium_text_translation: {
    en: "Pro Neural Text Translation",
    ti: "ፕሮ ኒውራል ትርጉም ጽሑፍ",
  },
};

const NEGATIVE_STATUSES = new Set([
  "EXPIRED",
  "SUSPENDED",
  "PAYMENT_FAILED",
  "REFUNDED",
  "REVERSED",
  "APPROVAL_PENDING",
  "NONE",
  "PAST_DUE",
]);
const CANCELLED_STATUSES = new Set(["CANCELLED", "CANCELED", "CANCELED_PENDING_EXPIRATION"]);
const ACTIVE_STATUSES = new Set(["ACTIVE", "APPROVED"]);

export function evaluateServerSubscriptionAccess(params: {
  uid: string;
  feature: ServerPremiumTranslationFeature;
  isAdmin?: boolean;
  isSuspended?: boolean;
  entitlement?: Partial<FirestoreUserEntitlementRecord> | null;
  subscriptions?: Partial<FirestoreSubscriptionRecord>[];
  source?: ServerSubscriptionValidationResult["source"];
  nowMs?: number;
}): ServerSubscriptionValidationResult {
  const {
    uid,
    feature,
    isAdmin = false,
    isSuspended = false,
    entitlement = null,
    subscriptions = [],
    source = "firestore",
    nowMs = Date.now(),
  } = params;
  const meta = FEATURE_LABELS[feature];

  if (isSuspended) {
    return {
      allowed: false,
      uid,
      feature,
      subscriptionStatus: "SUSPENDED",
      expiresAt: null,
      source,
      code: "ACCOUNT_SUSPENDED",
      message: `Account is suspended and cannot access ${meta.en}.`,
      tigrinyaMessage: `ኣካውንትኩም ተኣጊዱ ስለ ዘሎ ${meta.ti} ክጥቀሙ ኣይትኽእሉን።`,
    };
  }

  if (!uid) {
    return {
      allowed: false,
      uid: "",
      feature,
      subscriptionStatus: "NONE",
      expiresAt: null,
      source: "none",
      code: "UNAUTHENTICATED",
      message: `Please sign in and activate Axumite Pro via PayPal to use ${meta.en}.`,
      tigrinyaMessage: `${meta.ti} ንምጥቃም በጃኹም ብኣካውንትኩም እተዉ።`,
    };
  }

  if (isAdmin) {
    return {
      allowed: true,
      uid,
      feature,
      subscriptionStatus: "ACTIVE",
      expiresAt: null,
      source: "admin_verified",
      code: "OK",
      message: `Admin access verified for ${meta.en}.`,
      tigrinyaMessage: `${meta.ti} ተፈቒዱ ኣሎ።`,
    };
  }

  const sortedSubs = [...subscriptions].sort((a, b) =>
    String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""))
  );
  const latestSub = sortedSubs[0] || null;

  if (!entitlement && !latestSub) {
    return {
      allowed: false,
      uid,
      feature,
      subscriptionStatus: "NONE",
      expiresAt: null,
      source: "none",
      code: "SUBSCRIPTION_NOT_FOUND",
      message: `Active Axumite Pro PayPal subscription is required for ${meta.en}.`,
      tigrinyaMessage: `${meta.ti} ንምጥቃም ንጡፍ ናይ Axumite Pro PayPal ኣባልነት የድሊ።`,
    };
  }

  const subStatus = String(latestSub?.status || "").trim().toUpperCase();
  const entStatus = String(entitlement?.subscriptionStatus || "").trim().toUpperCase();
  const effectiveStatus = subStatus || entStatus || (entitlement?.isPro ? "ACTIVE" : "NONE");
  const expiresAt = entitlement?.expiresAt ?? latestSub?.nextBillingDate ?? null;
  const expiresMs = expiresAt ? Date.parse(expiresAt) : NaN;

  if (NEGATIVE_STATUSES.has(subStatus) || (!latestSub && NEGATIVE_STATUSES.has(entStatus))) {
    const expired = subStatus === "EXPIRED" || entStatus === "EXPIRED";
    return {
      allowed: false,
      uid,
      feature,
      subscriptionStatus: subStatus || entStatus || "NONE",
      expiresAt,
      source,
      code: expired ? "SUBSCRIPTION_EXPIRED" : "SUBSCRIPTION_INACTIVE",
      message: expired
        ? `Your Axumite Pro subscription expired. Renew via PayPal for ${meta.en}.`
        : `Subscription status (${subStatus || entStatus}) is inactive for ${meta.en}.`,
      tigrinyaMessage: expired
        ? `ናይ Axumite Pro ኣባልነትኩም ግዜኡ ወዲኡ እዩ። ${meta.ti} ንምጥቃም ብ PayPal ኣሐድስዎ።`
        : `ኩነታት ኣባልነትኩም (${subStatus || entStatus}) ንጡፍ ኣይኮነን።`,
    };
  }

  if (CANCELLED_STATUSES.has(effectiveStatus)) {
    const stillPaidThrough = Number.isFinite(expiresMs) && expiresMs > nowMs;
    if (!stillPaidThrough) {
      return {
        allowed: false,
        uid,
        feature,
        subscriptionStatus: "EXPIRED",
        expiresAt,
        source,
        code: "SUBSCRIPTION_EXPIRED",
        message: `Cancelled subscription period has ended. Subscribe again via PayPal for ${meta.en}.`,
        tigrinyaMessage: `ዝተሰረዘ ናይ Axumite Pro ግዜኹም ተወዲኡ እዩ።`,
      };
    }
  } else {
    const statusActive = ACTIVE_STATUSES.has(effectiveStatus) || Boolean(entitlement?.isPro);
    if (!statusActive) {
      return {
        allowed: false,
        uid,
        feature,
        subscriptionStatus: effectiveStatus || "NONE",
        expiresAt,
        source,
        code: "SUBSCRIPTION_INACTIVE",
        message: `Active Axumite Pro PayPal subscription is required for ${meta.en}.`,
        tigrinyaMessage: `${meta.ti} ንምጥቃም ንጡፍ ናይ Axumite Pro ኣባልነት የድሊ።`,
      };
    }

    if (entitlement && entitlement.isPro === false && (!latestSub || !ACTIVE_STATUSES.has(subStatus))) {
      return {
        allowed: false,
        uid,
        feature,
        subscriptionStatus: entStatus || "NONE",
        expiresAt,
        source,
        code: "SUBSCRIPTION_INACTIVE",
        message: `Axumite Pro entitlement is inactive for ${meta.en}.`,
        tigrinyaMessage: `ናይ Axumite Pro ፍቓድ ንጡፍ ኣይኮነን።`,
      };
    }

    if (expiresAt && Number.isFinite(expiresMs) && expiresMs <= nowMs) {
      return {
        allowed: false,
        uid,
        feature,
        subscriptionStatus: "EXPIRED",
        expiresAt,
        source,
        code: "SUBSCRIPTION_EXPIRED",
        message: `Your Axumite Pro subscription expired. Please renew via PayPal to use ${meta.en}.`,
        tigrinyaMessage: `ናይ Axumite Pro ኣባልነትኩም ግዜኡ ወዲኡ እዩ።`,
      };
    }
  }

  if (
    meta.entitlementKey &&
    entitlement &&
    Array.isArray(entitlement.features) &&
    !entitlement.features.includes(meta.entitlementKey)
  ) {
    return {
      allowed: false,
      uid,
      feature,
      subscriptionStatus: effectiveStatus,
      expiresAt,
      source,
      code: "FEATURE_NOT_ENTITLED",
      message: `Current subscription plan does not include ${meta.en}.`,
      tigrinyaMessage: `ሕጂ ዘለኩም መደብ ${meta.ti} ኣየጠቓልልን።`,
    };
  }

  return {
    allowed: true,
    uid,
    feature,
    subscriptionStatus: effectiveStatus,
    expiresAt,
    source,
    code: "OK",
    message: `Subscription verified for ${meta.en}.`,
    tigrinyaMessage: `${meta.ti} ተረጋጊጹ ኣሎ።`,
  };
}

export async function validateCallerTranslationSubscription(
  caller: VerifiedCaller,
  feature: ServerPremiumTranslationFeature
): Promise<ServerSubscriptionValidationResult> {
  if (!caller.authenticated || !caller.uid) {
    return evaluateServerSubscriptionAccess({ uid: "", feature });
  }

  const isSuspended = await isFirestoreUserSuspended(caller.uid);
  if (isSuspended) {
    return evaluateServerSubscriptionAccess({
      uid: caller.uid,
      feature,
      isSuspended: true,
    });
  }

  if (caller.isAdmin) {
    return evaluateServerSubscriptionAccess({
      uid: caller.uid,
      feature,
      isAdmin: true,
    });
  }

  // Primary check: live Firestore `user_entitlements/{uid}` + `subscriptions`
  const [fsEntitlement, fsSubscriptions] = await Promise.all([
    getFirestoreEntitlement(caller.uid),
    getFirestoreSubscriptionsForUid(caller.uid),
  ]);

  const fsResult = evaluateServerSubscriptionAccess({
    uid: caller.uid,
    feature,
    entitlement: fsEntitlement,
    subscriptions: fsSubscriptions,
    source: "firestore",
  });

  if (fsResult.allowed || fsResult.code !== "SUBSCRIPTION_NOT_FOUND") {
    return fsResult;
  }

  // Fallback ONLY when Firestore has no records yet (e.g. preview container without datastore IAM)
  const engineEnt = await getEntitlementForUser(caller.uid);
  return evaluateServerSubscriptionAccess({
    uid: caller.uid,
    feature,
    entitlement: engineEnt,
    source: "paypal_engine_fallback",
  });
}

export interface RequestWithSubscription extends Request {
  verifiedCaller?: VerifiedCaller;
  verifiedTranslationSubscription?: ServerSubscriptionValidationResult;
}

/**
 * Express middleware that validates Firebase ID token and verifies active Pro subscription
 * from Firestore (`user_entitlements/{uid}` + `subscriptions`) before granting access
 * to premium translation routes.
 */
export function requirePremiumTranslationSubscription(
  feature: ServerPremiumTranslationFeature
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const caller = await verifyFirebaseCaller(req);
      if (!caller.authenticated) {
        const denied = evaluateServerSubscriptionAccess({ uid: "", feature });
        return res.status(401).json({
          error: "PRO_SUBSCRIPTION_REQUIRED",
          code: denied.code,
          feature,
          message: denied.message,
          tigrinyaMessage: denied.tigrinyaMessage,
          requiresUpgrade: true,
        });
      }

      const validation = await validateCallerTranslationSubscription(caller, feature);
      if (!validation.allowed) {
        return res.status(403).json({
          error: "PRO_SUBSCRIPTION_REQUIRED",
          code: validation.code,
          feature,
          subscriptionStatus: validation.subscriptionStatus,
          message: validation.message,
          tigrinyaMessage: validation.tigrinyaMessage,
          requiresUpgrade: validation.code !== "ACCOUNT_SUSPENDED",
        });
      }

      (req as RequestWithSubscription).verifiedCaller = caller;
      (req as RequestWithSubscription).verifiedTranslationSubscription = validation;
      return next();
    } catch (err: any) {
      console.error("[TranslationSubscriptionMiddleware] Error:", err);
      return res.status(500).json({
        error: "SUBSCRIPTION_VALIDATION_FAILED",
        message: "Unable to validate subscription status at this time.",
      });
    }
  };
}

/**
 * Conditional middleware for endpoints with both free and premium modes (e.g. `/api/obelisk/translate`).
 */
export function requirePremiumTranslationWhenRequested(
  feature: ServerPremiumTranslationFeature,
  predicate: (req: Request) => boolean
) {
  const guard = requirePremiumTranslationSubscription(feature);
  return (req: Request, res: Response, next: NextFunction) => {
    if (!predicate(req)) {
      return next();
    }
    return guard(req, res, next);
  };
}
