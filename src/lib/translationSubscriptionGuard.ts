import {
  collection,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  getDocsFromServer,
  limit,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import {
  auth,
  db,
  getFirebaseIdToken,
  handleFirestoreError,
  OperationType,
  SUPERADMIN_EMAIL,
} from './firebase';
import { UserProfile } from '../types';

export type PremiumTranslationFeature =
  | 'voice_translation'
  | 'conversation_translation'
  | 'call_translation'
  | 'ocr_translation'
  | 'pronunciation_check'
  | 'offline_packs'
  | 'video_translation'
  | 'premium_text_translation';

export type SubscriptionDenialReason =
  | 'UNAUTHENTICATED'
  | 'ACCOUNT_SUSPENDED'
  | 'SUBSCRIPTION_NOT_FOUND'
  | 'SUBSCRIPTION_INACTIVE'
  | 'SUBSCRIPTION_EXPIRED'
  | 'FEATURE_NOT_ENTITLED'
  | 'VALIDATION_ERROR';

export interface FirestoreEntitlementDoc {
  uid?: string;
  plan?: string;
  isPro?: boolean;
  features?: string[];
  subscriptionStatus?: string;
  expiresAt?: string | null;
  updatedAt?: string;
}

export interface FirestoreSubscriptionDoc {
  uid?: string;
  user_id?: string;
  provider?: string;
  paypalSubscriptionId?: string;
  planType?: string;
  status?: string;
  nextBillingDate?: string | null;
  cancelAtPeriodEnd?: boolean;
  updatedAt?: string;
}

export interface SubscriptionGuardResult {
  allowed: boolean;
  uid: string;
  feature: PremiumTranslationFeature;
  plan: 'free' | 'pro';
  subscriptionStatus: string;
  expiresAt: string | null;
  source: 'firestore' | 'firestore_cache' | 'backend_fallback' | 'admin_verified' | 'none';
  reason?: SubscriptionDenialReason;
  message: string;
  tigrinyaMessage: string;
  checkedAt: string;
}

export const PREMIUM_FEATURE_META: Record<
  PremiumTranslationFeature,
  { en: string; ti: string; entitlementKey?: string }
> = {
  voice_translation: {
    en: 'Voice Translator Pro',
    ti: 'ትርጉም ድምጺ ፕሮ',
  },
  conversation_translation: {
    en: 'Live Two-Person Conversation Translation',
    ti: 'ቀጥታዊ ትርጉም ዕላል ክልተ ሰባት',
  },
  call_translation: {
    en: 'Live Call Translation & Subtitles',
    ti: 'ቀጥታዊ ትርጉም ጻውዒትን ንኡስ ጽሑፍን',
  },
  ocr_translation: {
    en: 'Camera & Screen OCR Translation',
    ti: 'ትርጉም ስክሪንን ካሜራን OCR',
    entitlementKey: 'ocr_docs',
  },
  pronunciation_check: {
    en: 'AI Pronunciation Coaching',
    ti: 'ናይ AI መምዘኒ ኣደማምጻ',
  },
  offline_packs: {
    en: 'Offline Neural Language Packs',
    ti: 'ብዘይ ኢንተርነት ዝሰርሑ ፓኬጃት ቋንቋ',
  },
  video_translation: {
    en: 'AI Video Translation & Dubbing',
    ti: 'ትርጉምን ድምጽን ቪድዮ',
    entitlementKey: 'video_dubbing',
  },
  premium_text_translation: {
    en: 'Pro Neural Text Translation',
    ti: 'ፕሮ ኒውራል ትርጉም ጽሑፍ',
  },
};

export class TranslationSubscriptionError extends Error {
  readonly code: SubscriptionDenialReason;
  readonly feature: PremiumTranslationFeature;
  readonly subscriptionStatus: string;
  readonly requiresAuth: boolean;
  readonly requiresUpgrade: boolean;
  readonly tigrinyaMessage: string;
  readonly guardResult: SubscriptionGuardResult;

  constructor(result: SubscriptionGuardResult) {
    super(result.message);
    this.name = 'TranslationSubscriptionError';
    this.code = result.reason || 'SUBSCRIPTION_INACTIVE';
    this.feature = result.feature;
    this.subscriptionStatus = result.subscriptionStatus;
    this.requiresAuth = result.reason === 'UNAUTHENTICATED';
    this.requiresUpgrade = result.reason !== 'ACCOUNT_SUSPENDED';
    this.tigrinyaMessage = result.tigrinyaMessage;
    this.guardResult = result;
  }
}

export function isTranslationSubscriptionError(err: unknown): err is TranslationSubscriptionError {
  return (
    err instanceof TranslationSubscriptionError ||
    (typeof err === 'object' &&
      err !== null &&
      (err as { name?: string }).name === 'TranslationSubscriptionError')
  );
}

const NEGATIVE_STATUSES = new Set([
  'EXPIRED',
  'SUSPENDED',
  'PAYMENT_FAILED',
  'REFUNDED',
  'REVERSED',
  'APPROVAL_PENDING',
  'NONE',
  'PAST_DUE',
]);

const CANCELLED_STATUSES = new Set(['CANCELLED', 'CANCELED', 'CANCELED_PENDING_EXPIRATION']);
const ACTIVE_STATUSES = new Set(['ACTIVE', 'APPROVED']);

const GUARD_CACHE_TTL_MS = 10_000;
const guardCache = new Map<string, { result: SubscriptionGuardResult; cachedAt: number }>();

export function invalidateTranslationSubscriptionCache(uid?: string): void {
  if (!uid) {
    guardCache.clear();
    return;
  }
  const prefix = `${uid}:`;
  for (const key of Array.from(guardCache.keys())) {
    if (key.startsWith(prefix)) {
      guardCache.delete(key);
    }
  }
}

function buildDeniedResult(params: {
  uid: string;
  feature: PremiumTranslationFeature;
  subscriptionStatus: string;
  expiresAt?: string | null;
  source?: SubscriptionGuardResult['source'];
  reason: SubscriptionDenialReason;
  message: string;
  tigrinyaMessage: string;
}): SubscriptionGuardResult {
  return {
    allowed: false,
    uid: params.uid,
    feature: params.feature,
    plan: 'free',
    subscriptionStatus: params.subscriptionStatus,
    expiresAt: params.expiresAt ?? null,
    source: params.source || 'firestore',
    reason: params.reason,
    message: params.message,
    tigrinyaMessage: params.tigrinyaMessage,
    checkedAt: new Date().toISOString(),
  };
}

/**
 * Pure, deterministic evaluator for Firestore `user_entitlements/{uid}` + `subscriptions`
 * records. Shared by unit tests and the live Firestore guard.
 */
export function evaluateFirestoreSubscriptionRecord(params: {
  uid: string;
  feature: PremiumTranslationFeature;
  isAdmin?: boolean;
  isSuspended?: boolean;
  entitlementDoc?: FirestoreEntitlementDoc | null;
  subscriptionDocs?: FirestoreSubscriptionDoc[];
  source?: SubscriptionGuardResult['source'];
  nowMs?: number;
}): SubscriptionGuardResult {
  const {
    uid,
    feature,
    isAdmin = false,
    isSuspended = false,
    entitlementDoc = null,
    subscriptionDocs = [],
    source = 'firestore',
    nowMs = Date.now(),
  } = params;

  const meta = PREMIUM_FEATURE_META[feature];
  const checkedAt = new Date(nowMs).toISOString();

  if (isSuspended) {
    return buildDeniedResult({
      uid,
      feature,
      subscriptionStatus: 'SUSPENDED',
      source,
      reason: 'ACCOUNT_SUSPENDED',
      message: `Your account is suspended and cannot access ${meta.en}.`,
      tigrinyaMessage: `ኣካውንትኩም ተኣጊዱ ስለ ዘሎ ${meta.ti} ክጥቀሙ ኣይትኽእሉን።`,
    });
  }

  if (!uid) {
    return buildDeniedResult({
      uid: '',
      feature,
      subscriptionStatus: 'NONE',
      source: 'none',
      reason: 'UNAUTHENTICATED',
      message: `Please sign in and activate Axumite Pro via PayPal to use ${meta.en}.`,
      tigrinyaMessage: `${meta.ti} ንምጥቃም በጃኹም መጀመርታ ብኣካውንትኩም እተዉ።`,
    });
  }

  if (isAdmin) {
    return {
      allowed: true,
      uid,
      feature,
      plan: 'pro',
      subscriptionStatus: 'ACTIVE',
      expiresAt: null,
      source: 'admin_verified',
      message: `Verified administrator access granted for ${meta.en}.`,
      tigrinyaMessage: `${meta.ti} ተፈቒዱ ኣሎ።`,
      checkedAt,
    };
  }

  const sortedSubs = [...subscriptionDocs].sort((a, b) =>
    String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''))
  );
  const latestSub = sortedSubs[0] || null;

  if (!entitlementDoc && !latestSub) {
    return buildDeniedResult({
      uid,
      feature,
      subscriptionStatus: 'NONE',
      source: 'none',
      reason: 'SUBSCRIPTION_NOT_FOUND',
      message: `An active Axumite Pro PayPal subscription is required for ${meta.en}.`,
      tigrinyaMessage: `${meta.ti} ንምጥቃም ንጡፍ ናይ Axumite Pro PayPal ኣባልነት የድሊ።`,
    });
  }

  const subStatusRaw = String(latestSub?.status || '').trim().toUpperCase();
  const entStatusRaw = String(entitlementDoc?.subscriptionStatus || '').trim().toUpperCase();
  const effectiveStatus = subStatusRaw || entStatusRaw || (entitlementDoc?.isPro ? 'ACTIVE' : 'NONE');
  const paidThroughIso = entitlementDoc?.expiresAt || latestSub?.nextBillingDate || null;
  const paidThroughMs = paidThroughIso ? Date.parse(paidThroughIso) : NaN;

  // Immediate denial on terminal negative statuses from either subscriptions or entitlements
  if (NEGATIVE_STATUSES.has(subStatusRaw) || (!latestSub && NEGATIVE_STATUSES.has(entStatusRaw))) {
    const expired = subStatusRaw === 'EXPIRED' || entStatusRaw === 'EXPIRED';
    return buildDeniedResult({
      uid,
      feature,
      subscriptionStatus: subStatusRaw || entStatusRaw || 'NONE',
      expiresAt: paidThroughIso,
      source,
      reason: expired ? 'SUBSCRIPTION_EXPIRED' : 'SUBSCRIPTION_INACTIVE',
      message: expired
        ? `Your Axumite Pro subscription has expired. Renew via PayPal to continue using ${meta.en}.`
        : `Your subscription status is ${subStatusRaw || entStatusRaw}. Active Axumite Pro access is required for ${meta.en}.`,
      tigrinyaMessage: expired
        ? `ናይ Axumite Pro ኣባልነትኩም ግዜኡ ወዲኡ እዩ። ${meta.ti} ንምቕጻል ብ PayPal ኣሐድስዎ።`
        : `ኩነታት ኣባልነትኩም (${subStatusRaw || entStatusRaw}) ንጡፍ ስለ ዘይኮነ ${meta.ti} ተዓጽዩ ኣሎ።`,
    });
  }

  // Cancelled subscriptions keep access ONLY until the verified paid-through date
  if (CANCELLED_STATUSES.has(effectiveStatus)) {
    const stillPaidThrough = Number.isFinite(paidThroughMs) && paidThroughMs > nowMs;
    if (!stillPaidThrough) {
      return buildDeniedResult({
        uid,
        feature,
        subscriptionStatus: 'EXPIRED',
        expiresAt: paidThroughIso,
        source,
        reason: 'SUBSCRIPTION_EXPIRED',
        message: `Your cancelled Axumite Pro period ended on ${paidThroughIso || 'record'}. Subscribe again via PayPal for ${meta.en}.`,
        tigrinyaMessage: `ዝተሰረዘ ናይ Axumite Pro ግዜኹም ተወዲኡ እዩ። ${meta.ti} ንምጥቃም እንደገና ብ PayPal ኣባልነት ጀምሩ።`,
      });
    }
  } else {
    // Active / Approved check
    const statusOk = ACTIVE_STATUSES.has(effectiveStatus) || Boolean(entitlementDoc?.isPro);
    if (!statusOk) {
      return buildDeniedResult({
        uid,
        feature,
        subscriptionStatus: effectiveStatus || 'NONE',
        expiresAt: paidThroughIso,
        source,
        reason: 'SUBSCRIPTION_INACTIVE',
        message: `Active Axumite Pro subscription is required for ${meta.en}.`,
        tigrinyaMessage: `${meta.ti} ንምጥቃም ንጡፍ ናይ Axumite Pro ኣባልነት የድሊ።`,
      });
    }

    if (entitlementDoc && entitlementDoc.isPro === false && (!latestSub || !ACTIVE_STATUSES.has(subStatusRaw))) {
      return buildDeniedResult({
        uid,
        feature,
        subscriptionStatus: entStatusRaw || 'NONE',
        expiresAt: paidThroughIso,
        source,
        reason: 'SUBSCRIPTION_INACTIVE',
        message: `Axumite Pro entitlement is not active for ${meta.en}. Upgrade via PayPal to unlock.`,
        tigrinyaMessage: `ናይ Axumite Pro ፍቓድ ንጡፍ ኣይኮነን። ${meta.ti} ንምኽፋት ናብ Pro ኣመሓይሹ።`,
      });
    }

    if (paidThroughIso && Number.isFinite(paidThroughMs) && paidThroughMs <= nowMs) {
      return buildDeniedResult({
        uid,
        feature,
        subscriptionStatus: 'EXPIRED',
        expiresAt: paidThroughIso,
        source,
        reason: 'SUBSCRIPTION_EXPIRED',
        message: `Your Axumite Pro subscription expired. Please renew via PayPal to use ${meta.en}.`,
        tigrinyaMessage: `ናይ Axumite Pro ኣባልነትኩም ግዜኡ ወዲኡ እዩ። ${meta.ti} ንምጥቃም ብ PayPal ኣሐድስዎ።`,
      });
    }
  }

  // Feature-specific entitlement verification (when Firestore features array is explicitly populated)
  if (
    meta.entitlementKey &&
    entitlementDoc &&
    Array.isArray(entitlementDoc.features) &&
    !entitlementDoc.features.includes(meta.entitlementKey)
  ) {
    return buildDeniedResult({
      uid,
      feature,
      subscriptionStatus: effectiveStatus,
      expiresAt: paidThroughIso,
      source,
      reason: 'FEATURE_NOT_ENTITLED',
      message: `Your current plan does not include ${meta.en}. Upgrade to Axumite Pro to unlock.`,
      tigrinyaMessage: `ሕጂ ዘለኩም መደብ ${meta.ti} ኣየጠቓልልን። ናብ Axumite Pro ኣመሓይሹ።`,
    });
  }

  return {
    allowed: true,
    uid,
    feature,
    plan: 'pro',
    subscriptionStatus: effectiveStatus === 'CANCELLED' ? 'CANCELED_PENDING_EXPIRATION' : effectiveStatus,
    expiresAt: paidThroughIso,
    source,
    message: `Subscription verified for ${meta.en}.`,
    tigrinyaMessage: `${meta.ti} ተረጋጊጹ ተኸፊቱ ኣሎ።`,
    checkedAt,
  };
}

function isNetworkOrOfflineError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err || '').toLowerCase();
  return (
    msg.includes('offline') ||
    msg.includes('unavailable') ||
    msg.includes('network') ||
    msg.includes('timeout') ||
    msg.includes('backend didn\'t respond')
  );
}

async function verifySubscriptionWithBackendFallback(
  uid: string,
  feature: PremiumTranslationFeature
): Promise<SubscriptionGuardResult | null> {
  if (typeof fetch !== 'function') return null;
  try {
    const token = await getFirebaseIdToken();
    if (!token) return null;
    const res = await fetch('/api/paypal/subscription-status', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const ent = data?.entitlement as FirestoreEntitlementDoc | undefined;
    const sub = data?.subscription as FirestoreSubscriptionDoc | null | undefined;
    if (!ent && !sub) return null;

    return evaluateFirestoreSubscriptionRecord({
      uid,
      feature,
      entitlementDoc: ent || null,
      subscriptionDocs: sub ? [sub] : [],
      source: 'backend_fallback',
    });
  } catch {
    return null;
  }
}

/**
 * Guard function that validates the active user's subscription status directly
 * from Firestore (`user_entitlements/{uid}` + `subscriptions`) before granting
 * access to premium translation features within `TranslationServiceProvider`.
 */
export async function validateTranslationSubscriptionFromFirestore(params: {
  feature: PremiumTranslationFeature;
  user?: UserProfile;
  forceRefresh?: boolean;
}): Promise<SubscriptionGuardResult> {
  const { feature, user, forceRefresh = false } = params;
  const currentUser = auth.currentUser;

  if (user?.role === 'Suspended') {
    return evaluateFirestoreSubscriptionRecord({
      uid: currentUser?.uid || user?.authUid || user?.id || '',
      feature,
      isSuspended: true,
    });
  }

  if (!currentUser || currentUser.isAnonymous) {
    return evaluateFirestoreSubscriptionRecord({
      uid: '',
      feature,
    });
  }

  const uid = currentUser.uid;
  const emailLower = (currentUser.email || '').trim().toLowerCase();
  const isVerifiedSuperAdmin = Boolean(currentUser.emailVerified) && emailLower === SUPERADMIN_EMAIL;

  if (isVerifiedSuperAdmin) {
    return evaluateFirestoreSubscriptionRecord({
      uid,
      feature,
      isAdmin: true,
    });
  }

  const cacheKey = `${uid}:${feature}`;
  const nowMs = Date.now();
  if (!forceRefresh) {
    const cached = guardCache.get(cacheKey);
    if (cached && nowMs - cached.cachedAt < GUARD_CACHE_TTL_MS) {
      const expMs = cached.result.expiresAt ? Date.parse(cached.result.expiresAt) : NaN;
      const stillValidTimestamp = !cached.result.expiresAt || !Number.isFinite(expMs) || expMs > nowMs;
      if (stillValidTimestamp) {
        return cached.result;
      }
      guardCache.delete(cacheKey);
    }
  }

  let entitlementDoc: FirestoreEntitlementDoc | null = null;
  let subscriptionDocs: FirestoreSubscriptionDoc[] = [];
  let source: SubscriptionGuardResult['source'] = 'firestore';

  // 1. Read `user_entitlements/{uid}` directly from Firestore (server first, cache fallback if offline)
  const entPath = `user_entitlements/${uid}`;
  const entRef = doc(db, 'user_entitlements', uid);
  try {
    const entSnap = await getDocFromServer(entRef);
    if (entSnap.exists()) {
      entitlementDoc = entSnap.data() as FirestoreEntitlementDoc;
    }
  } catch (err) {
    if (isNetworkOrOfflineError(err)) {
      try {
        const cachedSnap = await getDoc(entRef);
        source = 'firestore_cache';
        if (cachedSnap.exists()) {
          entitlementDoc = cachedSnap.data() as FirestoreEntitlementDoc;
        }
      } catch (cacheErr) {
        handleFirestoreError(cacheErr, OperationType.GET, entPath);
      }
    } else {
      handleFirestoreError(err, OperationType.GET, entPath);
    }
  }

  // 2. Cross-check `subscriptions` collection (`where('uid', '==', uid)`) directly in Firestore
  const subsPath = `subscriptions?uid=${uid}`;
  const subsQuery = query(collection(db, 'subscriptions'), where('uid', '==', uid), limit(10));
  try {
    const subsSnap = await getDocsFromServer(subsQuery);
    subscriptionDocs = subsSnap.docs.map((d) => d.data() as FirestoreSubscriptionDoc);
  } catch (err) {
    if (isNetworkOrOfflineError(err)) {
      try {
        const cachedSubs = await getDocs(subsQuery);
        source = 'firestore_cache';
        subscriptionDocs = cachedSubs.docs.map((d) => d.data() as FirestoreSubscriptionDoc);
      } catch (cacheErr) {
        handleFirestoreError(cacheErr, OperationType.LIST, subsPath);
      }
    } else {
      handleFirestoreError(err, OperationType.LIST, subsPath);
    }
  }

  let evaluation = evaluateFirestoreSubscriptionRecord({
    uid,
    feature,
    entitlementDoc,
    subscriptionDocs,
    source,
    nowMs,
  });

  // 3. Only when Firestore has NO entitlement or subscription docs (e.g. preview runtime without Admin Firestore IAM write access),
  // consult backend PayPal entitlement status with verified Firebase ID token.
  // Never fall back when Firestore explicitly returned a negative, expired, or inactive state!
  if (!evaluation.allowed && evaluation.reason === 'SUBSCRIPTION_NOT_FOUND') {
    const backendFallback = await verifySubscriptionWithBackendFallback(uid, feature);
    if (backendFallback) {
      evaluation = backendFallback;
    }
  }

  if (evaluation.allowed) {
    guardCache.set(cacheKey, { result: evaluation, cachedAt: Date.now() });
  } else {
    guardCache.delete(cacheKey);
  }

  return evaluation;
}

/**
 * Throws `TranslationSubscriptionError` if Firestore subscription validation fails.
 */
export async function assertTranslationSubscription(params: {
  feature: PremiumTranslationFeature;
  user?: UserProfile;
  forceRefresh?: boolean;
}): Promise<SubscriptionGuardResult> {
  const result = await validateTranslationSubscriptionFromFirestore(params);
  if (!result.allowed) {
    throw new TranslationSubscriptionError(result);
  }
  return result;
}

/**
 * Subscribes to live Firestore entitlement updates for `uid` so cache stays fresh
 * whenever PayPal webhooks or verification update `user_entitlements/{uid}`.
 */
export function subscribeToTranslationEntitlement(
  uid: string,
  onEntitlementChange: (docData: FirestoreEntitlementDoc | null) => void
): () => void {
  if (!uid) return () => {};
  const entRef = doc(db, 'user_entitlements', uid);
  return onSnapshot(
    entRef,
    (snap) => {
      invalidateTranslationSubscriptionCache(uid);
      onEntitlementChange(snap.exists() ? (snap.data() as FirestoreEntitlementDoc) : null);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, `user_entitlements/${uid}`);
    }
  );
}
