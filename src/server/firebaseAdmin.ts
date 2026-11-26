import fs from "node:fs";
import path from "node:path";
import type { Request } from "express";
import { initializeApp, getApps, getApp, type App } from "firebase-admin/app";
import { getAuth, type DecodedIdToken } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

interface FirebaseAppletConfig {
  projectId: string;
  firestoreDatabaseId?: string;
}

function loadFirebaseConfig(): FirebaseAppletConfig {
  const candidates = [
    path.resolve(process.cwd(), "firebase-applet-config.json"),
    ...(typeof __dirname === "string"
      ? [
          path.resolve(__dirname, "..", "..", "firebase-applet-config.json"),
          path.resolve(__dirname, "..", "firebase-applet-config.json"),
        ]
      : []),
    ...(process.argv[1]
      ? [
          path.resolve(path.dirname(path.resolve(process.argv[1])), "firebase-applet-config.json"),
          path.resolve(path.dirname(path.resolve(process.argv[1])), "..", "firebase-applet-config.json"),
        ]
      : []),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      try {
        const raw = JSON.parse(fs.readFileSync(candidate, "utf8"));
        if (raw?.projectId) {
          return {
            projectId: String(raw.projectId),
            firestoreDatabaseId: raw.firestoreDatabaseId
              ? String(raw.firestoreDatabaseId)
              : undefined,
          };
        }
      } catch {
        // continue checking fallback candidates
      }
    }
  }
  return {
    projectId: process.env.FIREBASE_PROJECT_ID || "plenary-spark-xw1xt",
    firestoreDatabaseId:
      process.env.FIREBASE_DATABASE_ID ||
      "ai-studio-axumiteai-0ec30b9a-4829-46a4-9a13-462fffecaa5e",
  };
}

const firebaseConfig = loadFirebaseConfig();

let cachedApp: App | null = null;
let cachedDb: Firestore | null = null;
let firestorePermissionWarningShown = false;

export function getFirebaseAdminApp(): App {
  if (cachedApp) return cachedApp;
  cachedApp = getApps().length
    ? getApp()
    : initializeApp({
        projectId: firebaseConfig.projectId,
      });
  return cachedApp;
}

export function getAdminFirestore(): Firestore | null {
  try {
    if (cachedDb) return cachedDb;
    const app = getFirebaseAdminApp();
    const dbId = (firebaseConfig.firestoreDatabaseId || "").trim();
    cachedDb =
      dbId && dbId !== "(default)" ? getFirestore(app, dbId) : getFirestore(app);
    return cachedDb;
  } catch (err: any) {
    console.warn("[FirebaseAdmin] Firestore initialization skipped:", err?.message || err);
    return null;
  }
}

export function getConfiguredProjectMeta() {
  return { ...firebaseConfig };
}

export function getAdminEmails(): string[] {
  const fromEnv = (process.env.ADMIN_EMAILS || "beckylove2004@gmail.com")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (!fromEnv.includes("beckylove2004@gmail.com")) {
    fromEnv.push("beckylove2004@gmail.com");
  }
  return Array.from(new Set(fromEnv));
}

export interface VerifiedCaller {
  authenticated: boolean;
  uid: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
  isAdmin: boolean;
  token?: DecodedIdToken;
  authError?: string;
}

export async function verifyFirebaseCaller(req: Request): Promise<VerifiedCaller> {
  const authHeader = req.headers.authorization || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  const token = match ? match[1].trim() : "";

  if (!token) {
    return {
      authenticated: false,
      uid: "",
      email: "",
      displayName: "",
      emailVerified: false,
      isAdmin: false,
      authError: "Missing Authorization Bearer Firebase ID token.",
    };
  }

  try {
    const app = getFirebaseAdminApp();
    const decoded = await getAuth(app).verifyIdToken(token);
    const email = (decoded.email || "").trim().toLowerCase();
    const emailVerified = Boolean(decoded.email_verified);
    const adminEmails = getAdminEmails();

    let isAdmin =
      Boolean((decoded as Record<string, unknown>).admin === true) ||
      (emailVerified && Boolean(email) && adminEmails.includes(email));

    // Also check Firestore user profile role if available and user is email-verified
    if (!isAdmin && email && emailVerified) {
      try {
        const db = getAdminFirestore();
        if (db) {
          const cleanId = email.replace(/[^a-z0-9]/g, "_");
          const snap = await db.collection("users").doc(cleanId).get();
          const role = snap.exists ? String(snap.data()?.role || "") : "";
          if (role === "Creator" || role === "Admin") {
            isAdmin = true;
          }
        }
      } catch {
        // Ignore IAM errors during role lookup; verified admin emails still pass
      }
    }

    return {
      authenticated: true,
      uid: decoded.uid,
      email,
      displayName:
        (typeof decoded.name === "string" && decoded.name) ||
        email.split("@")[0] ||
        "Axumite Member",
      emailVerified,
      isAdmin,
      token: decoded,
    };
  } catch (err: any) {
    return {
      authenticated: false,
      uid: "",
      email: "",
      displayName: "",
      emailVerified: false,
      isAdmin: false,
      authError: err?.message || "Invalid or expired Firebase ID token.",
    };
  }
}

let lastFirestoreStatus: { available: boolean; lastError?: string } = {
  available: true,
};

export function getFirestoreAdminStatus() {
  return { ...lastFirestoreStatus };
}

function handleFirestoreAdminError(context: string, err: any) {
  const msg = String(err?.message || err || "");
  if (
    msg.includes("PERMISSION_DENIED") ||
    msg.includes("Missing or insufficient permissions") ||
    err?.code === 7
  ) {
    lastFirestoreStatus = {
      available: false,
      lastError:
        "PERMISSION_DENIED: Grant roles/datastore.user to the runtime service account on project " +
        firebaseConfig.projectId,
    };
    if (!firestorePermissionWarningShown) {
      firestorePermissionWarningShown = true;
      console.warn(
        `[FirebaseAdmin:${context}] Firestore Admin SDK returned PERMISSION_DENIED. Grant roles/datastore.user to the Cloud Run / preview service account to persist directly from backend.`
      );
    }
  } else {
    lastFirestoreStatus = {
      available: false,
      lastError: msg,
    };
    console.warn(`[FirebaseAdmin:${context}] Firestore write warning:`, msg);
  }
}

export interface FirestoreUserRecord {
  uid: string;
  email: string;
  displayName: string;
  accountCreatedAt: string;
}

export interface FirestoreSubscriptionRecord {
  uid: string;
  provider: "paypal" | "stripe";
  paypalSubscriptionId: string;
  paypalPlanId: string;
  planType: "pro_monthly" | "pro_yearly";
  status: string;
  currency: string;
  amount: number;
  billingFrequency: "MONTH" | "YEAR";
  startDate: string;
  nextBillingDate: string | null;
  cancelAtPeriodEnd: boolean;
  updatedAt: string;
}

export interface FirestorePaymentHistoryRecord {
  uid: string;
  provider: "paypal" | "stripe";
  paypalTransactionId: string;
  paypalSubscriptionId: string;
  amount: number;
  currency: string;
  paymentStatus: string;
  paymentDate: string;
}

export interface FirestoreUserEntitlementRecord {
  uid: string;
  plan: "free" | "pro";
  isPro: boolean;
  features: string[];
  subscriptionStatus: string;
  expiresAt: string | null;
  updatedAt: string;
}

export async function upsertFirestoreUser(record: FirestoreUserRecord): Promise<void> {
  const db = getAdminFirestore();
  if (!db || !record.uid) return;
  try {
    // Write UID-keyed users doc without overwriting existing profile properties
    await db
      .collection("users")
      .doc(record.uid)
      .set(
        {
          uid: record.uid,
          email: record.email,
          displayName: record.displayName,
          accountCreatedAt: record.accountCreatedAt,
        },
        { merge: true }
      );
    lastFirestoreStatus = { available: true };
  } catch (err) {
    handleFirestoreAdminError("upsertFirestoreUser", err);
  }
}

export async function upsertFirestoreSubscription(
  record: FirestoreSubscriptionRecord
): Promise<void> {
  const db = getAdminFirestore();
  if (!db || !record.paypalSubscriptionId) return;
  try {
    await db
      .collection("subscriptions")
      .doc(record.paypalSubscriptionId)
      .set(record, { merge: true });
    lastFirestoreStatus = { available: true };
  } catch (err) {
    handleFirestoreAdminError("upsertFirestoreSubscription", err);
  }
}

export async function upsertFirestorePaymentHistory(
  record: FirestorePaymentHistoryRecord
): Promise<void> {
  const db = getAdminFirestore();
  if (!db || !record.paypalTransactionId) return;
  try {
    await db
      .collection("payment_history")
      .doc(record.paypalTransactionId)
      .set(record, { merge: true });
    lastFirestoreStatus = { available: true };
  } catch (err) {
    handleFirestoreAdminError("upsertFirestorePaymentHistory", err);
  }
}

export async function upsertFirestoreEntitlement(
  record: FirestoreUserEntitlementRecord
): Promise<void> {
  const db = getAdminFirestore();
  if (!db || !record.uid) return;
  try {
    await db
      .collection("user_entitlements")
      .doc(record.uid)
      .set(record, { merge: true });
    lastFirestoreStatus = { available: true };
  } catch (err) {
    handleFirestoreAdminError("upsertFirestoreEntitlement", err);
  }
}

export async function getFirestoreEntitlement(
  uid: string
): Promise<FirestoreUserEntitlementRecord | null> {
  const db = getAdminFirestore();
  if (!db || !uid) return null;
  try {
    const snap = await db.collection("user_entitlements").doc(uid).get();
    lastFirestoreStatus = { available: true };
    if (!snap.exists) return null;
    return snap.data() as FirestoreUserEntitlementRecord;
  } catch (err) {
    handleFirestoreAdminError("getFirestoreEntitlement", err);
    return null;
  }
}

export async function getFirestoreSubscriptionsForUid(
  uid: string
): Promise<FirestoreSubscriptionRecord[]> {
  const db = getAdminFirestore();
  if (!db || !uid) return [];
  try {
    const snap = await db
      .collection("subscriptions")
      .where("uid", "==", uid)
      .limit(10)
      .get();
    lastFirestoreStatus = { available: true };
    const rows = snap.docs.map((d) => d.data() as FirestoreSubscriptionRecord);
    return rows.sort((a, b) =>
      String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""))
    );
  } catch (err) {
    handleFirestoreAdminError("getFirestoreSubscriptionsForUid", err);
    return [];
  }
}

export async function isFirestoreUserSuspended(uid: string): Promise<boolean> {
  const db = getAdminFirestore();
  if (!db || !uid) return false;
  try {
    const snap = await db.collection("users").doc(uid).get();
    if (!snap.exists) return false;
    return String(snap.data()?.role || "") === "Suspended";
  } catch {
    return false;
  }
}

export async function claimWebhookEventIdempotency(
  eventId: string,
  eventType: string
): Promise<{ alreadyProcessed: boolean }> {
  const db = getAdminFirestore();
  if (!db || !eventId) return { alreadyProcessed: false };
  try {
    const ref = db.collection("paypal_webhook_events").doc(eventId);
    const snap = await ref.get();
    if (snap.exists) {
      return { alreadyProcessed: true };
    }
    await ref.set({
      eventId,
      eventType,
      processedAt: new Date().toISOString(),
    });
    lastFirestoreStatus = { available: true };
    return { alreadyProcessed: false };
  } catch (err) {
    handleFirestoreAdminError("claimWebhookEventIdempotency", err);
    return { alreadyProcessed: false };
  }
}

export async function writePaymentAuditLog(entry: {
  action: string;
  uid?: string;
  email?: string;
  details: Record<string, unknown>;
}): Promise<void> {
  const db = getAdminFirestore();
  if (!db) return;
  try {
    const logId = `paypal_audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await db.collection("audit_logs").doc(logId).set({
      id: logId,
      category: "paypal_billing",
      action: entry.action,
      uid: entry.uid || "system",
      email: entry.email || "",
      details: entry.details,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreAdminError("writePaymentAuditLog", err);
  }
}
