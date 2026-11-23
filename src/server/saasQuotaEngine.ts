import { dbUsers, dbSubscriptions, checkUserEntitlement } from "./paymentEngine.ts";

export interface SaasUserUsage {
  userId: string;
  userEmail: string;
  email: string;
  plan: "free" | "premium" | "enterprise";
  planName: string;
  isPremium: boolean;
  dailyRequestsUsed: number;
  dailyLimit: number;
  remainingToday: number;
  lastResetDate: string; // YYYY-MM-DD
  totalRequestsLifetime: number;
  totalLifetimeRequests: number;
  customQuotaOverride: number | null;
  status: "active" | "trialing" | "canceled" | "past_due" | "none";
  paypalCustomerId?: string;
  subscriptionId?: string;
  renewalDate?: string;
  joinedAt: string;
  lastActive: string;
}

const DEFAULT_FREE_DAILY_LIMIT = 25;

function resolvePlanDisplayName(plan: "free" | "premium" | "enterprise"): string {
  if (plan === "enterprise") return "Enterprise Sovereign";
  if (plan === "premium") return "Premium Pro";
  return "Free Tier";
}

function syncDerivedUsageFields(usage: SaasUserUsage): SaasUserUsage {
  const isPremium = usage.plan !== "free";
  const effectiveLimit =
    usage.customQuotaOverride !== null && usage.customQuotaOverride > 0
      ? usage.customQuotaOverride
      : isPremium
      ? 1000
      : DEFAULT_FREE_DAILY_LIMIT;
  usage.dailyLimit = effectiveLimit;
  usage.isPremium = isPremium;
  usage.planName = resolvePlanDisplayName(usage.plan);
  usage.email = usage.userEmail;
  usage.remainingToday = Math.max(0, effectiveLimit - usage.dailyRequestsUsed);
  usage.totalLifetimeRequests = usage.totalRequestsLifetime;
  return usage;
}

// In-memory persistent map of user usage per day
const userDailyUsageMap = new Map<string, SaasUserUsage>();

function getTodayKey(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Get or initialize user's SaaS usage status for today
 */
export function getUserSaasUsage(userId: string, userEmail?: string, userRole?: string): SaasUserUsage {
  const today = getTodayKey();
  const cleanId = userId || (userEmail ? userEmail.toLowerCase().replace(/[^a-z0-9]/g, "_") : "usr_guest");
  
  // Check entitlement from paymentEngine
  const entitlement = checkUserEntitlement(cleanId);
  const isSuperAdmin = userEmail?.toLowerCase() === "beckylove2004@gmail.com" || userRole === "Creator" || userRole === "Admin";
  
  let currentPlan: "free" | "premium" | "enterprise" = "free";
  if (isSuperAdmin) {
    currentPlan = "enterprise";
  } else if (entitlement.isPremium || entitlement.tier === "pro" || userRole === "ኣክሱማይት AI Pro") {
    currentPlan = "premium";
  }

  const dailyLimit = currentPlan === "free" ? DEFAULT_FREE_DAILY_LIMIT : 1000;

  const existing = userDailyUsageMap.get(cleanId);
  if (existing) {
    // Check if day changed
    if (existing.lastResetDate !== today) {
      existing.dailyRequestsUsed = 0;
      existing.lastResetDate = today;
    }
    existing.plan = currentPlan;
    if (existing.customQuotaOverride === null) {
      existing.dailyLimit = dailyLimit;
    }
    existing.status = (entitlement.status as any) || existing.status || "none";
    if (userEmail && (!existing.userEmail || existing.userEmail === "guest@axumite.ai")) {
      existing.userEmail = userEmail;
    }
    if (entitlement.subscription) {
      existing.renewalDate = entitlement.subscription.renewal_date;
      existing.subscriptionId = entitlement.subscription.provider_subscription_id;
      existing.paypalCustomerId = entitlement.subscription.provider_customer_id;
    }
    return syncDerivedUsageFields(existing);
  }

  const sub = entitlement.subscription;
  const nowIso = new Date().toISOString();
  const resolvedEmail = userEmail || "guest@axumite.ai";
  const newUsage: SaasUserUsage = {
    userId: cleanId,
    userEmail: resolvedEmail,
    email: resolvedEmail,
    plan: currentPlan,
    planName: resolvePlanDisplayName(currentPlan),
    isPremium: currentPlan !== "free",
    dailyRequestsUsed: 0,
    dailyLimit,
    remainingToday: dailyLimit,
    lastResetDate: today,
    totalRequestsLifetime: 0,
    totalLifetimeRequests: 0,
    customQuotaOverride: null,
    status: (entitlement.status as any) || "none",
    renewalDate: sub?.renewal_date,
    subscriptionId: sub?.provider_subscription_id,
    paypalCustomerId: sub?.provider_customer_id,
    joinedAt: nowIso,
    lastActive: nowIso,
  };

  userDailyUsageMap.set(cleanId, newUsage);
  return newUsage;
}

/**
 * Check if the user is allowed to make an AI request
 */
export function checkUserQuota(
  userId: string,
  userEmail?: string,
  userRole?: string
): {
  allowed: boolean;
  remaining: number;
  limit: number;
  used: number;
  plan: "free" | "premium" | "enterprise";
  isPremium: boolean;
  message?: string;
} {
  const usage = getUserSaasUsage(userId, userEmail, userRole);
  const isPremium = usage.plan !== "free";
  const remaining = Math.max(0, usage.dailyLimit - usage.dailyRequestsUsed);

  if (usage.plan === "free" && usage.dailyRequestsUsed >= usage.dailyLimit) {
    return {
      allowed: false,
      remaining: 0,
      limit: usage.dailyLimit,
      used: usage.dailyRequestsUsed,
      plan: usage.plan,
      isPremium: false,
      message: "Daily request limit reached. Upgrade to Premium for unlimited access.",
    };
  }

  return {
    allowed: true,
    remaining,
    limit: usage.dailyLimit,
    used: usage.dailyRequestsUsed,
    plan: usage.plan,
    isPremium,
  };
}

/**
 * Increment user's AI request usage
 */
export function recordUserAiRequest(
  userId: string,
  userEmail?: string,
  userRole?: string
): SaasUserUsage {
  const usage = getUserSaasUsage(userId, userEmail, userRole);
  usage.dailyRequestsUsed += 1;
  usage.totalRequestsLifetime += 1;
  usage.lastActive = new Date().toISOString();
  syncDerivedUsageFields(usage);
  userDailyUsageMap.set(usage.userId, usage);
  return usage;
}

/**
 * Reset daily usage count for a user (Admin action or test)
 */
export function resetUserUsage(userId: string): SaasUserUsage {
  const usage = getUserSaasUsage(userId);
  usage.dailyRequestsUsed = 0;
  usage.lastResetDate = getTodayKey();
  syncDerivedUsageFields(usage);
  userDailyUsageMap.set(userId, usage);
  return usage;
}

/**
 * Set custom daily quota override for a user (Admin action)
 */
export function setUserCustomQuota(userId: string, customQuota: number | null): SaasUserUsage {
  const usage = getUserSaasUsage(userId);
  usage.customQuotaOverride =
    customQuota !== null && Number.isFinite(customQuota) && customQuota > 0
      ? Math.round(customQuota)
      : null;
  syncDerivedUsageFields(usage);
  userDailyUsageMap.set(userId, usage);
  return usage;
}

/**
 * Update user's plan manually from Admin Dashboard
 */
export function updateSaasUserPlan(
  userId: string,
  newPlan: "free" | "premium" | "enterprise"
): SaasUserUsage {
  const usage = getUserSaasUsage(userId);
  usage.plan = newPlan;
  if (usage.customQuotaOverride === null) {
    usage.dailyLimit = newPlan === "free" ? DEFAULT_FREE_DAILY_LIMIT : 1000;
  }
  if (newPlan !== "free") {
    usage.status = "active";
  } else {
    usage.status = "none";
  }
  syncDerivedUsageFields(usage);
  userDailyUsageMap.set(userId, usage);

  // Sync to dbUsers
  const user = dbUsers.get(userId);
  if (user) {
    user.account_type = newPlan;
    user.role = newPlan === "enterprise" ? "Axumite Sovereign Scholar" : newPlan === "premium" ? "ኣክሱማይት AI Pro" : "Free Member";
    dbUsers.set(userId, user);
  }

  return usage;
}

/**
 * Get all SaaS users for Admin Dashboard view
 */
export function getAllSaasUsers(): SaasUserUsage[] {
  const result: SaasUserUsage[] = [];
  const today = getTodayKey();

  // Add all tracked users
  for (const usage of userDailyUsageMap.values()) {
    result.push(usage);
  }

  // Ensure all known DB users are included
  for (const user of dbUsers.values()) {
    if (!result.some((r) => r.userId === user.id)) {
      const u = getUserSaasUsage(user.id, user.email, user.role);
      result.push(u);
    }
  }

  // Ensure default demo users are visible for testing
  if (result.length < 3) {
    const seed1 = getUserSaasUsage("usr_superadmin_becky", "beckylove2004@gmail.com", "Admin");
    const seed2 = getUserSaasUsage("usr_guest_demo", "guest@axumite.ai", "Free Member");
    const seed3 = getUserSaasUsage("usr_amanuel_01", "amanuel.t@axumite.ai", "ኣክሱማይት AI Pro");
    if (!result.some(r => r.userId === seed1.userId)) result.push(seed1);
    if (!result.some(r => r.userId === seed2.userId)) result.push(seed2);
    if (!result.some(r => r.userId === seed3.userId)) result.push(seed3);
  }

  return result;
}
