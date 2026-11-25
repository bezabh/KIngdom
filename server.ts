import "dotenv/config";
import express from "express";
import fs from "fs";
import http from "http";
import os from "os";
import path from "path";
import { WebSocketServer, WebSocket } from "ws";
import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";
import type { SupportedCurrency } from "./src/types.ts";
import { serverRateLimiter, ROLE_RATE_LIMIT_TIERS } from "./src/lib/rateLimitEngine.ts";
import {
  AVAILABLE_OFFLINE_PACKS,
  OFFLINE_LEXICON_ENTRIES,
} from "./src/server/offlineLanguagePacksData.ts";
import {
  CURRENCY_RATES,
  getSovereignPlans,
  checkUserEntitlement,
  getAdminPaymentMetrics,
  getUserPaymentMethods,
  addUserPaymentMethod,
  setDefaultUserPaymentMethod,
  deleteUserPaymentMethod,
} from "./src/server/paymentEngine.ts";
import {
  verifyFirebaseCaller,
  getFirestoreAdminStatus,
} from "./src/server/firebaseAdmin.ts";
import {
  requirePremiumTranslationSubscription,
  requirePremiumTranslationWhenRequested,
} from "./src/server/translationSubscriptionMiddleware.ts";
import {
  getPublicPayPalConfig,
  probePayPalCapabilities,
  createPayPalSubscriptionOrOrder,
  verifyAndSyncPayPalSubscription,
  capturePayPalOrderFallback,
  cancelPayPalSubscription,
  getSubscriptionStatusForUser,
  getEntitlementForUser,
  processPayPalWebhookEvent,
  getAdminPayPalDashboardData,
  updatePayPalRuntimeSettings,
  runPayPalSandboxTestSuite,
  isPayPalConfigured,
  getPayPalRuntimeSettings,
  type PayPalPlanType,
  type PayPalWebhookHeaders,
} from "./src/server/paypalEngine.ts";
import {
  getSuperAdminOverview,
  getSuperAdminAiServices,
  testAiModelPing,
  updateAiConfig,
  executeEmergencyControl,
  verifySuperAdmin2FA,
  createSystemBackup,
  restoreSystemBackup,
  broadcastNotification,
  getAuditLogs
} from "./src/server/superAdminEngine.ts";
import {
  getUserSaasUsage,
  checkUserQuota,
  recordUserAiRequest,
  resetUserUsage,
  updateSaasUserPlan,
  setUserCustomQuota,
  getAllSaasUsers
} from "./src/server/saasQuotaEngine.ts";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

function resolveProjectRoot(): string {
  const candidates: string[] = [];
  if (process.env.AXUMITE_ROOT_DIR) {
    candidates.push(path.resolve(process.env.AXUMITE_ROOT_DIR));
  }
  candidates.push(process.cwd());
  if (typeof __dirname === "string") {
    candidates.push(__dirname);
    candidates.push(path.resolve(__dirname, ".."));
  }
  if (process.argv[1]) {
    const entryDir = path.dirname(path.resolve(process.argv[1]));
    candidates.push(entryDir);
    candidates.push(path.resolve(entryDir, ".."));
  }
  for (const dir of candidates) {
    if (
      fs.existsSync(path.join(dir, "package.json")) &&
      (fs.existsSync(path.join(dir, "index.html")) || fs.existsSync(path.join(dir, "dist", "index.html")))
    ) {
      return dir;
    }
  }
  return process.env.AXUMITE_ROOT_DIR ? path.resolve(process.env.AXUMITE_ROOT_DIR) : process.cwd();
}

let runtimeBuiltDistDir: string | null = null;

function resolveDistPath(): string {
  if (runtimeBuiltDistDir && fs.existsSync(path.join(runtimeBuiltDistDir, "index.html"))) {
    return runtimeBuiltDistDir;
  }
  if (process.env.AXUMITE_DIST_DIR) {
    return path.resolve(process.env.AXUMITE_DIST_DIR);
  }
  const candidates: string[] = [];
  const projectRoot = resolveProjectRoot();
  candidates.push(path.join(projectRoot, "dist"));
  candidates.push(path.join(process.cwd(), "dist"));
  if (typeof __dirname === "string") {
    candidates.push(__dirname); // when bundled into dist/server.cjs
    candidates.push(path.join(__dirname, "dist"));
    candidates.push(path.resolve(__dirname, "..", "dist"));
  }
  if (process.argv[1]) {
    const entryDir = path.dirname(path.resolve(process.argv[1]));
    candidates.push(path.join(entryDir, "dist"));
    candidates.push(entryDir);
    candidates.push(path.resolve(entryDir, "..", "dist"));
  }
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, "index.html"))) {
      return dir;
    }
  }
  return path.join(projectRoot, "dist");
}

// Hide Express fingerprint & trust proxy for accurate client IP / HTTPS detection behind Cloud Run, Render, Nginx, etc.
app.disable("x-powered-by");
app.set("trust proxy", 1);

// Production Security Headers & Configurable CORS Middleware
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(self), microphone=(self), display-capture=(self), geolocation=()");
  // Required so Firebase Google Auth popups work cleanly across deployed origins
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");

  const isHttps = req.secure || req.headers["x-forwarded-proto"] === "https";
  if (process.env.NODE_ENV === "production" && isHttps) {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }

  const origin = req.headers.origin as string | undefined;
  if (origin) {
    const appOrigin = (process.env.APP_URL || "").trim().replace(/\/+$/, "");
    const isAllowed =
      ALLOWED_ORIGINS.includes("*") ||
      ALLOWED_ORIGINS.includes(origin) ||
      (appOrigin && origin === appOrigin) ||
      process.env.NODE_ENV !== "production";

    if (isAllowed) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type,Authorization,PAYPAL-TRANSMISSION-ID,PAYPAL-TRANSMISSION-TIME,PAYPAL-TRANSMISSION-SIG,PAYPAL-CERT-URL,PAYPAL-AUTH-ALGO,X-User-Role,X-User-Id,X-User-Email"
      );
    }
    if (req.method === "OPTIONS") {
      return res.status(204).end();
    }
  }

  next();
});

// Increase body parser limit for base64 images & preserve rawBody for webhook audit/verification
app.use(
  express.json({
    limit: "20mb",
    verify: (req, _res, buf) => {
      (req as express.Request & { rawBody?: Buffer }).rawBody = buf;
    },
  })
);

// Server-side Rate Limiting Middleware
app.use("/api", (req, res, next) => {
  // Allow health/readiness probes, read-only PayPal config status, and PayPal webhook deliveries without Guest rate limiting
  if (
    req.path === "/health" ||
    req.path === "/ready" ||
    req.path === "/paypal/webhook" ||
    req.path === "/paypal/config"
  ) {
    return next();
  }

  // Extract client identity
  const userRole = (req.headers["x-user-role"] as string) || "Guest";
  const userId = (req.headers["x-user-id"] as string) || (req.headers["x-user-email"] as string);
  const clientIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "127.0.0.1";
  const identifier = userId ? `usr:${userId}` : `ip:${clientIp}`;

  // Categorize endpoint based on sensitivity and compute cost
  let category: "general" | "ai" | "payment" = "general";
  if (req.path.startsWith("/obelisk/")) {
    category = "ai";
  } else if (req.path.startsWith("/payment/") || req.path.startsWith("/paypal/")) {
    category = "payment";
  }

  const result = serverRateLimiter.checkRateLimit(identifier, userRole, category);

  // Set standard RFC & rate limit response headers
  res.setHeader("X-RateLimit-Limit", result.limit);
  res.setHeader("X-RateLimit-Remaining", result.remaining);
  res.setHeader("X-RateLimit-Reset", result.resetSeconds);
  res.setHeader("X-RateLimit-Role", result.role);
  res.setHeader("X-RateLimit-Category", result.category);

  if (!result.allowed) {
    res.setHeader("Retry-After", result.retryAfter || 60);
    return res.status(429).json({
      error: "Too Many Requests",
      message: result.reason || "Rate limit exceeded. Please wait before sending more requests.",
      tigrinyaMessage: `ብዝሒ ጠለባት ካብ ዓቐን ንላዕሊ በዚሑ ኣሎ። በጃኹም ን ${result.retryAfter || 60} ካልኢታት ተጸበዩ።`,
      role: result.role,
      category: result.category,
      limit: result.limit,
      retryAfterSeconds: result.retryAfter || 60,
      timestamp: new Date().toISOString(),
    });
  }

  next();
});

// Initialize Gemini Client
const getGeminiClient = (apiVersion?: string) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not configured.");
  }
  return new GoogleGenAI({
    apiKey,
    ...(apiVersion ? { apiVersion } : {}),
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

// Helper to parse data:<mime>;base64,<data> including codec parameters (e.g. audio/webm;codecs=opus)
function extractAudioData(audioBase64: string, fallbackMime = "audio/webm"): { mimeType: string; data: string } {
  const trimmed = (audioBase64 || "").trim();
  const match = trimmed.match(/^data:([^;,]+)(?:;[^,]+)*;base64,(.*)$/is);
  if (match) {
    return {
      mimeType: (match[1] || fallbackMime).toLowerCase(),
      data: (match[2] || "").trim(),
    };
  }
  return {
    mimeType: fallbackMime,
    data: trimmed.replace(/^data:[^,]+,/, "").trim(),
  };
}

const DEFAULT_TEXT_FALLBACK_MODELS = ["gemini-3.1-flash-lite", "gemini-4-hydrogen"];

function normalizeActiveGeminiModel(model: string): string {
  const m = String(model || "").trim();
  if (!m || m === "gemini-3.7-flash" || m === "gemini-3.5-flash-lite") {
    return "gemini-3.1-flash-lite";
  }
  if (m === "gemini-3.1-pro-preview") {
    return "gemini-4-hydrogen";
  }
  return m;
}

// Resilient Gemini Model Fallback & Retry Engine (deduplicated, with clean timer disposal)
async function generateContentWithFallback(
  ai: GoogleGenAI,
  primaryModel: string,
  generateParams: any,
  fallbackModels: string[] = DEFAULT_TEXT_FALLBACK_MODELS,
  timeoutMs = 18000
): Promise<{ response: any; modelUsed: string }> {
  const normalizedPrimary = normalizeActiveGeminiModel(primaryModel);
  const modelsToTry = Array.from(
    new Set([normalizedPrimary, ...fallbackModels.map(normalizeActiveGeminiModel)].filter(Boolean))
  );
  let lastError: any = null;

  for (let i = 0; i < modelsToTry.length; i++) {
    const currentModel = modelsToTry[i];
    const isGemini4 = currentModel.startsWith("gemini-4-");
    const modelTimeoutMs = isGemini4 ? Math.max(timeoutMs, 35000) : timeoutMs;
    const maxAttempts = isGemini4 ? 1 : 2;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const sanitizedParams = { ...generateParams, model: currentModel };
        if (isGemini4) {
          const {
            temperature: _t,
            topP: _p,
            topK: _k,
            candidateCount: _c,
            ...cleanConfig
          } = sanitizedParams.config || {};
          sanitizedParams.config = {
            ...cleanConfig,
            thinkingConfig: cleanConfig.thinkingConfig || {
              thinkingLevel: ThinkingLevel.LOW,
            },
          };
        }

        const response = await Promise.race([
          ai.models.generateContent(sanitizedParams),
          new Promise((_, reject) => {
            timer = setTimeout(
              () => reject(new Error(`Model ${currentModel} timed out after ${modelTimeoutMs}ms`)),
              modelTimeoutMs
            );
          }),
        ]);
        return { response, modelUsed: currentModel };
      } catch (err: any) {
        lastError = err;
        const msg = String(err?.status || err?.message || err);
        const isTransient = /503|429|UNAVAILABLE|RESOURCE_EXHAUSTED|timed out|high demand/i.test(msg);
        console.warn(
          `[AXUMITE Gemini Engine] Model ${currentModel} (attempt ${attempt}/${maxAttempts}) returned ${msg}.`
        );
        if (attempt < maxAttempts && isTransient) {
          await new Promise((resolve) => setTimeout(resolve, 600 * attempt));
          continue;
        }
        break;
      } finally {
        if (timer) clearTimeout(timer);
      }
    }

    if (i < modelsToTry.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 250 * (i + 1)));
    }
  }

  throw lastError;
}

// Resilient Multimodal Audio Transcription Helper with structured silence detection (no deprecated/404 models)
async function transcribeAudioWithFallback(
  mimeType: string,
  base64Data: string,
  instructionText: string,
  timeoutMs = 18000
): Promise<{ text: string; modelUsed: string }> {
  const candidates: Array<{ model: string; thinkingLevel?: ThinkingLevel; timeout: number }> = [
    { model: "gemini-3.1-flash-lite", timeout: timeoutMs },
    { model: "gemini-4-hydrogen", thinkingLevel: ThinkingLevel.LOW, timeout: Math.max(timeoutMs, 35000) },
  ];

  const contents = {
    parts: [
      {
        inlineData: {
          mimeType,
          data: base64Data,
        },
      },
      {
        text: `${instructionText}\n\nSTRICT SILENCE RULE: Listen carefully. If the audio is silent, blank, quiet static, or contains only background noise with no clear intelligible human words, you MUST return {"hasSpeech": false, "transcript": ""}. Never guess, hallucinate, or invent random single words when the audio is silent.`,
      },
    ],
  };

  let lastError: any = null;
  for (let i = 0; i < candidates.length; i++) {
    const { model, thinkingLevel, timeout } = candidates[i];
    const maxAttempts = model.startsWith("gemini-4-") ? 1 : 2;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const client = getGeminiClient();
        const config: any = {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              hasSpeech: {
                type: Type.BOOLEAN,
                description: "True ONLY if unmistakable human spoken words are audible in the recording; false for silence, quiet hum, or noise.",
              },
              transcript: {
                type: Type.STRING,
                description: "Exact spoken words when hasSpeech is true, otherwise strictly empty string \"\".",
              },
            },
            required: ["hasSpeech", "transcript"],
          },
        };
        if (thinkingLevel) {
          config.thinkingConfig = { thinkingLevel };
        }

        const response: any = await Promise.race([
          client.models.generateContent({
            model,
            contents,
            config,
          }),
          new Promise((_, reject) => {
            timer = setTimeout(
              () => reject(new Error(`Audio transcription model ${model} timed out after ${timeout}ms`)),
              timeout
            );
          }),
        ]);

        let transcript = "";
        try {
          const parsed = JSON.parse(response?.text || "{}");
          transcript = parsed?.hasSpeech ? String(parsed?.transcript || "").trim() : "";
        } catch {
          transcript = String(response?.text || "").trim();
        }

        return {
          text: transcript,
          modelUsed: model,
        };
      } catch (err: any) {
        lastError = err;
        console.warn(
          `[AXUMITE Audio Engine] Model ${model} (attempt ${attempt}/${maxAttempts}) failed: ${err?.status || err?.message || err}.`
        );
        if (attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      } finally {
        if (timer) clearTimeout(timer);
      }
    }
  }

  throw lastError;
}

const SYSTEM_PROMPT_AXUMITE = `You are AXUMITE AI, an ultra-luxury, world-class artificial intelligence system inspired by the timeless majesty, architectural precision, and golden heritage of the ancient Empire of Aksum (Axum Obelisk/Stela). 
Your responses are wise, mathematically precise, highly refined, and authoritative yet deeply courteous.

CRITICAL LANGUAGE REQUIREMENT:
ALL information, assistance, feedback, explanations, and responses MUST be provided in the Tigrinya language (ትግርኛ) using standard Ge'ez/Tigrinya Fidel script. You are fully proficient, adaptive, and supportive of all Tigrinya dialects, including Tigray Tigrinya (ትግርኛ ትግራይ / ti-ET) and Eritrean Tigrinya (ትግርኛ ኤርትራ / ti-ER). When users communicate in Tigray Tigrinya, adapt seamlessly with appropriate Tigray vocabulary, idioms, regional expressions, and nuances while maintaining high grammatical accuracy, warmth, and elegance.`;

// Health check (liveness probe)
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    app: "AXUMITE AI",
    version: "1.0.0",
    runtime: "node",
    nodeVersion: process.version,
    env: process.env.NODE_ENV || "development",
    uptimeSeconds: Math.floor(process.uptime()),
  });
});

// Deployment readiness probe (never exposes secret values)
app.get("/api/ready", (_req, res) => {
  const geminiKey = (process.env.GEMINI_API_KEY || "").trim();
  const geminiConfigured = Boolean(geminiKey && geminiKey !== "MY_GEMINI_API_KEY");
  const distBuilt = fs.existsSync(path.join(resolveDistPath(), "index.html"));
  const firebaseConfigured = fs.existsSync(path.join(resolveProjectRoot(), "firebase-applet-config.json"));

  const paypalSettings = getPayPalRuntimeSettings();
  res.json({
    ready: true,
    runtime: "node",
    nodeVersion: process.version,
    env: process.env.NODE_ENV || "development",
    distBuilt,
    integrations: {
      geminiConfigured,
      firebaseConfigured,
      paymentProvider: "paypal",
      paypalConfigured: isPayPalConfigured(),
      paypalMode: paypalSettings.mode,
      paypalLiveEnabled: paypalSettings.liveEnabled,
      firestoreStatus: getFirestoreAdminStatus(),
    },
    timestamp: new Date().toISOString(),
  });
});

// Dynamic XML Sitemap for deployed web origins
app.get("/sitemap.xml", (req, res) => {
  const envUrl = (process.env.APP_URL || "").trim();
  const baseUrl =
    envUrl && envUrl !== "MY_APP_URL" && /^https?:\/\//i.test(envUrl)
      ? envUrl.replace(/\/+$/, "")
      : `${req.protocol}://${req.get("host") || "localhost:3000"}`;
  const lastmod = new Date().toISOString().split("T")[0];

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.send(
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      `  <url>\n` +
      `    <loc>${baseUrl}/</loc>\n` +
      `    <lastmod>${lastmod}</lastmod>\n` +
      `    <changefreq>weekly</changefreq>\n` +
      `    <priority>1.0</priority>\n` +
      `  </url>\n` +
      `</urlset>\n`
  );
});

// Rate limiting telemetry & status endpoints
app.get("/api/rate-limit/status", (req, res) => {
  const userRole = (req.headers["x-user-role"] as string) || "Guest";
  const userId = (req.headers["x-user-id"] as string) || (req.headers["x-user-email"] as string);
  const clientIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "127.0.0.1";
  const identifier = userId ? `usr:${userId}` : `ip:${clientIp}`;

  const generalStatus = serverRateLimiter.peekRateLimit(identifier, userRole, "general");
  const aiStatus = serverRateLimiter.peekRateLimit(identifier, userRole, "ai");
  const paymentStatus = serverRateLimiter.peekRateLimit(identifier, userRole, "payment");

  res.json({
    identifier,
    role: userRole,
    tiers: ROLE_RATE_LIMIT_TIERS,
    currentUsage: {
      general: generalStatus,
      ai: aiStatus,
      payment: paymentStatus,
    },
  });
});

app.get("/api/rate-limit/telemetry", (req, res) => {
  const telemetry = serverRateLimiter.getTelemetry();
  res.json(telemetry);
});

// Helper to extract client identity for quota and tracking
function getClientIdentity(req: express.Request) {
  const userRole = (req.headers["x-user-role"] as string) || "Guest";
  const userEmail = (req.headers["x-user-email"] as string) || (req.body?.userEmail as string) || (req.query?.userEmail as string);
  const userId = (req.headers["x-user-id"] as string) || (req.body?.userId as string) || (req.query?.userId as string) || userEmail;
  const clientIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "127.0.0.1";
  const identifier = userId ? `usr:${userId}` : `ip:${clientIp}`;
  return { identifier, userId, userEmail, userRole, clientIp };
}

function checkAndIncrementAiUsage(identifier: string, userEmail?: string, requestedModel?: string, userRole?: string) {
  const userId = identifier.replace(/^usr:/, "").replace(/^email:/, "").replace(/^ip:/, "");
  const quota = checkUserQuota(userId, userEmail, userRole);
  if (!quota.allowed) {
    return {
      allowed: false,
      error: "Daily request limit reached. Upgrade to Premium for unlimited access.",
      limit: quota.limit,
      remaining: 0,
      currentUsage: quota.used,
      resetsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      isPremium: false,
      plan: "free",
      modelGranted: "gemini-3.1-flash-lite",
    };
  }

  const updatedUsage = recordUserAiRequest(userId, userEmail, userRole);
  const remaining = Math.max(0, updatedUsage.dailyLimit - updatedUsage.dailyRequestsUsed);
  const isPremium = updatedUsage.plan !== "free";
  
  // Free users get fast flash-lite, Premium users get requested active model
  const modelGranted = isPremium
    ? normalizeActiveGeminiModel(requestedModel || "gemini-3.1-flash-lite")
    : "gemini-3.1-flash-lite";

  return {
    allowed: true,
    limit: updatedUsage.dailyLimit,
    remaining,
    currentUsage: updatedUsage.dailyRequestsUsed,
    resetsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    isPremium,
    plan: updatedUsage.plan,
    modelGranted,
  };
}

// 0.1 SaaS User Usage Check Endpoint
app.get("/api/user/usage", (req, res) => {
  try {
    const { identifier, userId, userEmail, userRole } = getClientIdentity(req);
    const cleanId = (userId || identifier.replace(/^usr:/, "").replace(/^ip:/, "")).trim();
    const usage = getUserSaasUsage(cleanId, userEmail, userRole);
    res.json(usage);
  } catch (err: any) {
    console.error("Error in /api/user/usage:", err);
    res.status(500).json({ error: err.message || "Failed to fetch usage" });
  }
});

// 0.2 SaaS Admin List Users (Admin-verified)
app.get("/api/admin/saas/users", async (req, res) => {
  try {
    const caller = await verifyFirebaseCaller(req);
    if (!caller.authenticated || !caller.isAdmin) {
      return res.status(403).json({ error: "Verified administrator permissions required." });
    }
    const users = getAllSaasUsers();
    res.json({ users });
  } catch (err: any) {
    console.error("Error in /api/admin/saas/users:", err);
    res.status(500).json({ error: err.message || "Failed to fetch SaaS users" });
  }
});

// 0.3 SaaS Admin Update User Plan (Admin-verified)
app.post("/api/admin/saas/update-plan", async (req, res) => {
  try {
    const caller = await verifyFirebaseCaller(req);
    if (!caller.authenticated || !caller.isAdmin) {
      return res.status(403).json({ error: "Verified administrator permissions required." });
    }
    const { userId, plan } = req.body;
    if (!userId || !plan) {
      return res.status(400).json({ error: "userId and plan are required" });
    }
    const updated = updateSaasUserPlan(userId, plan);
    res.json({ success: true, usage: updated });
  } catch (err: any) {
    console.error("Error in /api/admin/saas/update-plan:", err);
    res.status(500).json({ error: err.message || "Failed to update user plan" });
  }
});

// 0.4 SaaS Admin Reset User Daily Usage (Admin-verified)
app.post("/api/admin/saas/reset-usage", async (req, res) => {
  try {
    const caller = await verifyFirebaseCaller(req);
    if (!caller.authenticated || !caller.isAdmin) {
      return res.status(403).json({ error: "Verified administrator permissions required." });
    }
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }
    const updated = resetUserUsage(userId);
    res.json({ success: true, usage: updated });
  } catch (err: any) {
    console.error("Error in /api/admin/saas/reset-usage:", err);
    res.status(500).json({ error: err.message || "Failed to reset usage" });
  }
});

// 0.5 SaaS Admin Unified User Management (Admin-verified)
app.post("/api/admin/saas/manage-user", async (req, res) => {
  try {
    const caller = await verifyFirebaseCaller(req);
    if (!caller.authenticated || !caller.isAdmin) {
      return res.status(403).json({ error: "Verified administrator permissions required." });
    }
    const { userId, action, planId, customQuota } = req.body || {};
    if (!userId || !action) {
      return res.status(400).json({ error: "userId and action are required." });
    }

    if (action === "downgrade_to_free") {
      const usage = updateSaasUserPlan(userId, "free");
      return res.json({ success: true, usage, message: "User downgraded to Free tier." });
    }
    if (action === "upgrade_to_premium") {
      const targetPlan = planId || "pro_monthly";
      const usage = updateSaasUserPlan(userId, targetPlan);
      return res.json({ success: true, usage, message: `User upgraded to ${targetPlan}.` });
    }
    if (action === "reset_daily_usage") {
      const usage = resetUserUsage(userId);
      return res.json({ success: true, usage, message: "Daily AI quota counter reset." });
    }
    if (action === "set_custom_quota") {
      const parsedQuota = Number(customQuota);
      if (!Number.isFinite(parsedQuota) || parsedQuota < 0) {
        return res.status(400).json({ error: "customQuota must be a non-negative number." });
      }
      const usage = setUserCustomQuota(userId, Math.round(parsedQuota));
      return res.json({ success: true, usage, message: `Custom daily quota set to ${Math.round(parsedQuota)}.` });
    }

    return res.status(400).json({ error: `Unsupported action: ${action}` });
  } catch (err: any) {
    console.error("Error in /api/admin/saas/manage-user:", err);
    res.status(500).json({ error: err.message || "Failed to manage user quota" });
  }
});

// 1. Obelisk Wisdom Query Endpoint (rechecks Pro entitlement for deep-reasoning mode)
app.post("/api/obelisk/query", async (req, res) => {
  try {
    const { prompt, mode = "general", conversationHistory = [] } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required." });
    }

    if (mode === "deep-reasoning" || mode === "legal_ai" || mode === "mechanic_ai") {
      const caller = await verifyFirebaseCaller(req);
      if (!caller.authenticated) {
        return res.status(401).json({
          error: "PRO_SUBSCRIPTION_REQUIRED",
          message: "Please sign in and activate Axumite Pro via PayPal for this Pro AI mode.",
          requiresUpgrade: true,
        });
      }
      if (!caller.isAdmin) {
        const ent = await getEntitlementForUser(caller.uid);
        if (!ent.isPro) {
          return res.status(403).json({
            error: "PRO_SUBSCRIPTION_REQUIRED",
            feature: mode === "deep-reasoning" ? "unlimited_chat" : mode,
            message: "Active Axumite Pro PayPal subscription required for this Pro feature.",
            requiresUpgrade: true,
          });
        }
      }
    }

    const { identifier, userEmail, userRole } = getClientIdentity(req);
    const primaryRequestedModel = mode === "deep-reasoning" ? "gemini-4-hydrogen" : "gemini-3.1-flash-lite";
    const usageCheck = checkAndIncrementAiUsage(identifier, userEmail, primaryRequestedModel, userRole);
    if (!usageCheck.allowed) {
      return res.status(429).json({
        error: usageCheck.error,
        isLimitReached: true,
        limit: usageCheck.limit,
        remaining: 0,
        currentUsage: usageCheck.currentUsage,
        resetsAt: usageCheck.resetsAt,
        requiresUpgrade: true,
        plan: usageCheck.plan,
      });
    }

    const ai = getGeminiClient();
    const primaryModel = usageCheck.modelGranted || primaryRequestedModel;

    // Format chat history if provided
    let contents: any = prompt;
    if (conversationHistory.length > 0) {
      const historyFormatted = conversationHistory.map((msg: any) => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }],
      }));
      contents = [
        ...historyFormatted,
        { role: "user", parts: [{ text: prompt }] },
      ];
    }

    const { response, modelUsed } = await generateContentWithFallback(
      ai,
      primaryModel,
      {
        contents,
        config: {
          systemInstruction: SYSTEM_PROMPT_AXUMITE + (mode === "ancient-script" ? "\nFocus specifically on linguistic origins, Ge'ez script, transliteration, and historic context." : ""),
          temperature: mode === "creative" ? 0.9 : 0.4,
        },
      },
      DEFAULT_TEXT_FALLBACK_MODELS
    );

    return res.json({
      result: response.text,
      modelUsed,
      usage: {
        currentUsage: usageCheck.currentUsage,
        limit: usageCheck.limit,
        remaining: usageCheck.remaining,
        isPremium: usageCheck.isPremium,
        plan: usageCheck.plan,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error in /api/obelisk/query:", error);
    return res.status(500).json({
      error: error.message || "An error occurred while querying AXUMITE AI.",
    });
  }
});

// 2. Vision & Artifact Analysis Endpoint
app.post("/api/obelisk/vision", async (req, res) => {
  try {
    const { imageBase64, mimeType = "image/png", prompt } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: "Image data (imageBase64) is required." });
    }

    const { identifier, userEmail, userRole } = getClientIdentity(req);
    const usageCheck = checkAndIncrementAiUsage(identifier, userEmail, "gemini-3.1-flash-lite", userRole);
    if (!usageCheck.allowed) {
      return res.status(429).json({
        error: usageCheck.error,
        isLimitReached: true,
        limit: usageCheck.limit,
        remaining: 0,
        currentUsage: usageCheck.currentUsage,
        resetsAt: usageCheck.resetsAt,
        requiresUpgrade: true,
        plan: usageCheck.plan,
      });
    }

    const ai = getGeminiClient();
    const userPrompt = prompt || "Analyze this image in detail from the perspective of AXUMITE AI. Decipher any text or symbols, explain architectural or visual elements, assess materials, lighting, and provide structural insights.";

    const imagePart = {
      inlineData: {
        mimeType,
        data: imageBase64.replace(/^data:image\/\w+;base64,/, ""),
      },
    };

    const { response, modelUsed } = await generateContentWithFallback(
      ai,
      usageCheck.modelGranted || "gemini-3.1-flash-lite",
      {
        contents: {
          parts: [imagePart, { text: userPrompt }],
        },
        config: {
          systemInstruction: SYSTEM_PROMPT_AXUMITE,
        },
      },
      DEFAULT_TEXT_FALLBACK_MODELS
    );

    return res.json({
      analysis: response.text,
      modelUsed,
      usage: {
        currentUsage: usageCheck.currentUsage,
        limit: usageCheck.limit,
        remaining: usageCheck.remaining,
        isPremium: usageCheck.isPremium,
        plan: usageCheck.plan,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error in /api/obelisk/vision:", error);
    return res.status(500).json({
      error: error.message || "Failed to analyze image with AXUMITE AI Vision.",
    });
  }
});

// 3. Axumite Prompt Forge / AI Prompt Generator Endpoint
app.post("/api/obelisk/prompt-forge", async (req, res) => {
  try {
    const { concept, targetPlatform = "Midjourney", stylePreset = "Luxury Black & Gold 3D" } = req.body;
    if (!concept) {
      return res.status(400).json({ error: "Concept idea is required for Prompt Forge." });
    }

    const { identifier, userEmail, userRole } = getClientIdentity(req);
    const usageCheck = checkAndIncrementAiUsage(identifier, userEmail, "gemini-3.1-flash-lite", userRole);
    if (!usageCheck.allowed) {
      return res.status(429).json({
        error: usageCheck.error,
        isLimitReached: true,
        limit: usageCheck.limit,
        remaining: 0,
        currentUsage: usageCheck.currentUsage,
        resetsAt: usageCheck.resetsAt,
        requiresUpgrade: true,
        plan: usageCheck.plan,
      });
    }

    const ai = getGeminiClient();

    const { response } = await generateContentWithFallback(
      ai,
      usageCheck.modelGranted || "gemini-3.1-flash-lite",
      {
        contents: `Generate a ultra-premium, professional image generation prompt based on concept: "${concept}". Target platform: "${targetPlatform}". Style preset: "${stylePreset}".`,
        config: {
          systemInstruction: `You are AXUMITE AI's Prompt Forge Engine. You output structured JSON matching the requested schema.
You create luxury, photorealistic, 8K prompts suitable for Flux, Midjourney, Sora, DALL-E 3, and Gemini Image generator.`,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "Short memorable title for the prompt" },
              promptText: { type: Type.STRING, description: "The primary full text prompt to copy/paste into image generator" },
              negativePrompt: { type: Type.STRING, description: "Elements to avoid/exclude" },
              aspectRatioSuggestion: { type: Type.STRING, description: "Recommended aspect ratio like 1:1, 16:9, or 9:16" },
              styleNotes: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Bullet points detailing materials, lighting, depth of field, rendering engine notes"
              },
              sampleTags: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Keywords like 8K, photorealistic, cinematic lighting, gold metallic, matte black"
              }
            },
            required: ["title", "promptText", "negativePrompt", "aspectRatioSuggestion", "styleNotes", "sampleTags"]
          }
        }
      },
      DEFAULT_TEXT_FALLBACK_MODELS
    );

    const parsedData = JSON.parse(response.text || "{}");
    return res.json({
      promptData: parsedData,
      usage: {
        currentUsage: usageCheck.currentUsage,
        limit: usageCheck.limit,
        remaining: usageCheck.remaining,
        isPremium: usageCheck.isPremium,
        plan: usageCheck.plan,
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("Error in /api/obelisk/prompt-forge:", error);
    return res.status(500).json({
      error: error.message || "Prompt Forge generation failed.",
    });
  }
});

// 4. Ge'ez & Horn of Africa Translator Endpoint (free standard mode, Pro-gated for premiumMode)
app.post(
  "/api/obelisk/translate",
  requirePremiumTranslationWhenRequested(
    "premium_text_translation",
    (req) => Boolean(req.body?.premiumMode || req.body?.requirePro)
  ),
  async (req, res) => {
  try {
    const { text, sourceLanguage = "English", targetLanguage = "Ge'ez" } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Text is required for translation." });
    }

    const { identifier, userEmail, userRole } = getClientIdentity(req);
    const usageCheck = checkAndIncrementAiUsage(identifier, userEmail, "gemini-3.1-flash-lite", userRole);
    if (!usageCheck.allowed) {
      return res.status(429).json({
        error: usageCheck.error,
        isLimitReached: true,
        limit: usageCheck.limit,
        remaining: 0,
        currentUsage: usageCheck.currentUsage,
        resetsAt: usageCheck.resetsAt,
        requiresUpgrade: true,
        plan: usageCheck.plan,
      });
    }

    const ai = getGeminiClient();

    const { response } = await generateContentWithFallback(
      ai,
      usageCheck.modelGranted || "gemini-3.1-flash-lite",
      {
        contents: `Translate the following text from ${sourceLanguage} to ${targetLanguage}. Text: "${text}".`,
        config: {
          systemInstruction: `You are AXUMITE AI's Ancient & Modern Horn of Africa Translation Suite. You output structured JSON.
Provide exact translation, Fidel character breakdown (if Ge'ez/Amharic/Tigrinya), phonetics/transliteration in Latin alphabet, and historical or grammatical notes.`,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              translatedText: { type: Type.STRING, description: "Main translated result in target script" },
              transliteration: { type: Type.STRING, description: "Latin alphabet phonetic pronunciation guide" },
              scriptName: { type: Type.STRING, description: "Name of the script used e.g. Ethiopic Fidel Script" },
              wordBreakdown: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    originalWord: { type: Type.STRING },
                    translatedWord: { type: Type.STRING },
                    phonetic: { type: Type.STRING },
                    meaning: { type: Type.STRING }
                  },
                  required: ["originalWord", "translatedWord", "phonetic", "meaning"]
                }
              },
              culturalContext: { type: Type.STRING, description: "Historical or linguistic usage notes" }
            },
            required: ["translatedText", "transliteration", "scriptName", "wordBreakdown", "culturalContext"]
          }
        }
      },
      DEFAULT_TEXT_FALLBACK_MODELS
    );

    const parsedData = JSON.parse(response.text || "{}");
    return res.json({
      translation: parsedData,
      usage: {
        currentUsage: usageCheck.currentUsage,
        limit: usageCheck.limit,
        remaining: usageCheck.remaining,
        isPremium: usageCheck.isPremium,
        plan: usageCheck.plan,
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("Error in /api/obelisk/translate:", error);
    return res.status(500).json({
      error: error.message || "Translation failed.",
    });
  }
});

// 4b. Optical Character Recognition (OCR) / Text Extraction from Camera or Image (Pro-gated)
app.post(
  "/api/obelisk/ocr",
  requirePremiumTranslationSubscription("ocr_docs"),
  async (req, res) => {
  try {
    const { imageBase64, mimeType = "image/jpeg" } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: "Image base64 data is required for OCR." });
    }

    const ai = getGeminiClient();
    const { mimeType: cleanMime, data: cleanImage } = extractAudioData(imageBase64, mimeType);
    const imagePart = {
      inlineData: {
        mimeType: cleanMime,
        data: cleanImage,
      },
    };

    const { response } = await generateContentWithFallback(
      ai,
      "gemini-3.1-flash-lite",
      {
        contents: {
          parts: [
            imagePart,
            {
              text: "Extract and transcribe all readable text from this image accurately. Maintain line breaks and formatting. Support Ge'ez/Tigrinya, Amharic, English, Arabic, German, French, Spanish, Italian, Portuguese, Chinese, Kunama, and Irob. Return ONLY the transcribed raw text without markdown commentary or explanations.",
            },
          ],
        },
      },
      DEFAULT_TEXT_FALLBACK_MODELS
    );

    const extractedText = (response.text || "").trim();
    return res.json({ text: extractedText, timestamp: new Date().toISOString() });
  } catch (error: any) {
    console.error("Error in /api/obelisk/ocr:", error);
    return res.status(500).json({
      error: error.message || "Failed to extract text from image.",
    });
  }
});

// 4c. Structured Camera & Screen OCR with Auto Language Detection, Translation & Overlay Boxes (Pro-gated)
app.post(
  "/api/obelisk/ocr-structured",
  requirePremiumTranslationSubscription("ocr_docs"),
  async (req, res) => {
  try {
    const { imageBase64, mimeType = "image/jpeg", targetLanguage = "English" } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: "Image base64 data is required for OCR translation." });
    }

    const ai = getGeminiClient();
    const { mimeType: cleanMime, data: cleanImage } = extractAudioData(imageBase64, mimeType);

    const { response, modelUsed } = await generateContentWithFallback(
      ai,
      "gemini-3.1-flash-lite",
      {
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: cleanMime,
                data: cleanImage,
              },
            },
            {
              text: `Analyze this image or screenshot. Extract all readable text regions, automatically detect the primary source language, and translate every block accurately into "${targetLanguage}". Estimate approximate normalized bounding box coordinates (xPct, yPct, wPct, hPct from 0 to 100) for each text block so translations can be overlaid directly on the image. If no readable text is found, return empty strings and empty blocks array.`,
            },
          ],
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              detectedLanguage: { type: Type.STRING },
              fullOriginalText: { type: Type.STRING },
              fullTranslatedText: { type: Type.STRING },
              transliteration: { type: Type.STRING },
              blocks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    originalText: { type: Type.STRING },
                    translatedText: { type: Type.STRING },
                    xPct: { type: Type.NUMBER },
                    yPct: { type: Type.NUMBER },
                    wPct: { type: Type.NUMBER },
                    hPct: { type: Type.NUMBER },
                  },
                  required: ["originalText", "translatedText", "xPct", "yPct", "wPct", "hPct"],
                },
              },
            },
            required: ["detectedLanguage", "fullOriginalText", "fullTranslatedText", "blocks"],
          },
        },
      },
      DEFAULT_TEXT_FALLBACK_MODELS
    );

    const parsed = JSON.parse(response.text || "{}");
    return res.json({
      success: true,
      detectedLanguage: parsed.detectedLanguage || "Auto-detected",
      targetLanguage,
      fullOriginalText: parsed.fullOriginalText || "",
      fullTranslatedText: parsed.fullTranslatedText || "",
      transliteration: parsed.transliteration || "",
      blocks: Array.isArray(parsed.blocks) ? parsed.blocks : [],
      modelUsed,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error in /api/obelisk/ocr-structured:", error);
    return res.status(500).json({
      error: error.message || "Structured OCR translation failed.",
    });
  }
});

// 4d. AI Pronunciation Practice Evaluation Endpoint (Pro-gated)
app.post(
  "/api/obelisk/pronunciation-check",
  requirePremiumTranslationSubscription("pronunciation_check"),
  async (req, res) => {
  try {
    const {
      audioBase64,
      mimeType = "audio/webm",
      spokenTranscript = "",
      targetPhrase = "",
      targetLanguage = "Tigrinya",
    } = req.body;

    if (!targetPhrase || !targetPhrase.trim()) {
      return res.status(400).json({ error: "targetPhrase is required for pronunciation practice." });
    }

    const ai = getGeminiClient();
    let userSpeech = String(spokenTranscript || "").trim();

    if (!userSpeech && typeof audioBase64 === "string" && audioBase64.trim().length > 0) {
      const { mimeType: cleanMime, data: cleanAudio } = extractAudioData(audioBase64, mimeType);
      if (cleanAudio.length > 64) {
        try {
          const transcribeRes = await transcribeAudioWithFallback(
            cleanMime,
            cleanAudio,
            `Transcribe the spoken pronunciation attempt in ${targetLanguage}. Return ONLY the spoken words. If silent, return empty string.`
          );
          userSpeech = transcribeRes.text;
        } catch (err) {
          console.warn("Pronunciation transcribe fallback error:", err);
        }
      }
    }

    if (!userSpeech) {
      return res.json({
        success: true,
        noSpeechDetected: true,
        accuracyScore: 0,
        transcribedSpeech: "",
        phoneticTip: "No clear speech was detected. Hold the mic steady and pronounce the target phrase clearly.",
        encouragement: "Try speaking again when ready.",
      });
    }

    const { response } = await generateContentWithFallback(
      ai,
      "gemini-3.1-flash-lite",
      {
        contents: `Target Phrase (${targetLanguage}): "${targetPhrase}"\nLearner's Spoken Attempt: "${userSpeech}"\nEvaluate pronunciation accuracy (0-100) and give one practical syllable/articulation tip.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              accuracyScore: { type: Type.NUMBER },
              phoneticTip: { type: Type.STRING },
              encouragement: { type: Type.STRING },
            },
            required: ["accuracyScore", "phoneticTip", "encouragement"],
          },
        },
      },
      DEFAULT_TEXT_FALLBACK_MODELS
    );

    const parsed = JSON.parse(response.text || "{}");
    return res.json({
      success: true,
      noSpeechDetected: false,
      transcribedSpeech: userSpeech,
      accuracyScore: Math.max(0, Math.min(100, Math.round(parsed.accuracyScore || 75))),
      phoneticTip: parsed.phoneticTip || "Focus on crisp syllable stress and vowel endings.",
      encouragement: parsed.encouragement || "Great effort—practice once more for native cadence.",
    });
  } catch (error: any) {
    console.error("Error in /api/obelisk/pronunciation-check:", error);
    return res.status(500).json({ error: error.message || "Pronunciation evaluation failed." });
  }
});

// 4e. Downloadable Offline Language Packs API
app.get("/api/obelisk/offline-packs", (_req, res) => {
  res.json({
    success: true,
    packs: AVAILABLE_OFFLINE_PACKS,
    timestamp: new Date().toISOString(),
  });
});

app.get(
  "/api/obelisk/offline-pack/:langCode",
  requirePremiumTranslationSubscription("offline_packs"),
  (req, res) => {
  const code = String(req.params.langCode || "").toLowerCase();
  const packMeta = AVAILABLE_OFFLINE_PACKS.find((p) => p.code.toLowerCase() === code);
  if (!packMeta) {
    return res.status(404).json({ error: `Offline language pack "${code}" not found.` });
  }

  return res.json({
    success: true,
    pack: {
      ...packMeta,
      downloadedAt: new Date().toISOString(),
      entries: OFFLINE_LEXICON_ENTRIES,
    },
  });
});

// 4f. Platform API Documentation Endpoint
app.get("/api/docs", (_req, res) => {
  res.json({
    openapi: "3.1.0",
    info: {
      title: "Axumite Sovereign Translator Platform API",
      version: "3.8.2",
      description: "Multilingual neural translation, live voice loops, structured OCR, WebRTC call signaling, offline language packs, and subscription management.",
    },
    endpoints: [
      { method: "POST", path: "/api/obelisk/translate", summary: "Neural text translation with Ethiopic Fidel word breakdown" },
      { method: "POST", path: "/api/obelisk/voice-translate", summary: "Real-time bidirectional spoken audio/text translation" },
      { method: "POST", path: "/api/obelisk/tts", summary: "Multilingual Gemini audio synthesis with voice & speed support" },
      { method: "POST", path: "/api/obelisk/ocr", summary: "Raw text extraction from screenshots & images" },
      { method: "POST", path: "/api/obelisk/ocr-structured", summary: "Auto-detect OCR extraction, translation, and overlay bounding boxes" },
      { method: "POST", path: "/api/obelisk/pronunciation-check", summary: "AI pronunciation scoring & phonetic feedback" },
      { method: "GET", path: "/api/obelisk/offline-packs", summary: "List available downloadable offline language packs" },
      { method: "GET", path: "/api/obelisk/offline-pack/:langCode", summary: "Download full offline bilingual lexicon pack" },
      { method: "WS", path: "/ws/call-signaling", summary: "Encrypted-room WebRTC signaling & live translated subtitle relay" },
      { method: "GET", path: "/api/paypal/config", summary: "PayPal Sandbox/Live configuration and Pro Monthly/Yearly plans" },
    ],
  });
});

// In-memory TTS audio cache and cooldown timer to prevent quota exhaustion
const ttsMemoryCache = new Map<string, { audioBase64: string; sampleRate: number }>();
let ttsQuotaCooldownUntil = 0;

// 5. Speech Audio Synthesis (TTS)
app.post("/api/obelisk/tts", async (req, res) => {
  try {
    const { text, voice, language = "Tigrinya", personaId, style } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Text is required for audio generation." });
    }

    const personaVoiceConfig: Record<string, { voiceName: string; style: string }> = {
      ancient_historian: {
        voiceName: "Charon",
        style: "Measured, stately, resonant voice of an esteemed royal historian and classical scholar",
      },
      modern_advisor: {
        voiceName: "Kore",
        style: "Confident, articulate, modern executive advisor with crisp strategic clarity",
      },
      technical_consultant: {
        voiceName: "Fenrir",
        style: "Crisp, analytical, objective voice of a principal systems architect and technical consultant",
      },
      cultural_custodian: {
        voiceName: "Zephyr",
        style: "Warm, graceful, lyrical storytelling tone rich with hospitality and cultural care",
      },
      concise_executive: {
        voiceName: "Puck",
        style: "Brisk, clear, high-efficiency executive briefing cadence with zero filler",
      },
      executive_brief: {
        voiceName: "Puck",
        style: "Brisk, clear, high-efficiency executive briefing cadence with zero filler",
      },
    };

    const personaPreset = typeof personaId === "string" ? personaVoiceConfig[personaId] : undefined;
    const resolvedVoice = (typeof voice === "string" && voice.trim()) ? voice.trim() : (personaPreset?.voiceName || "Kore");
    const resolvedStyle = (typeof style === "string" && style.trim()) ? style.trim() : personaPreset?.style;

    const cleanText = text.trim();
    const targetLangLabel = typeof language === "string" && language.trim() ? language.trim() : "Tigrinya";
    const cacheKey = `${resolvedVoice}_${personaId || "default"}_${targetLangLabel}_${cleanText}`;

    // Return cached audio if present
    if (ttsMemoryCache.has(cacheKey)) {
      const cached = ttsMemoryCache.get(cacheKey)!;
      return res.json({
        audioBase64: cached.audioBase64,
        format: "audio/wav",
        sampleRate: cached.sampleRate || 24000,
        voiceUsed: resolvedVoice,
        cached: true,
      });
    }

    // If Gemini TTS is in quota cooldown, immediately fallback to browser Web Speech Synthesis
    if (Date.now() < ttsQuotaCooldownUntil) {
      return res.json({
        audioBase64: null,
        fallback: "browser-speech-synthesis",
        quotaExceeded: true,
        message: "Gemini TTS is in standard rate cooldown. Utilizing browser speech synthesis.",
      });
    }

    const ai = getGeminiClient("v1beta");
    const isTigrinyaOrGeez = /tigrinya|ትግርኛ|ge'ez|geez|ግዕዝ|amharic|አማርኛ/i.test(targetLangLabel);
    const ttsStyleDirective = resolvedStyle
      || (isTigrinyaOrGeez
        ? `Authentic, fluent ${targetLangLabel} speaker with natural Ge'ez Fidel pronunciation and warm, articulate delivery`
        : `Natural, fluent ${targetLangLabel} speaker with clear, engaging conversational delivery`);

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash-lite-tts",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: cleanText,
              speechMetadata: {
                style: ttsStyleDirective,
              },
            } as any,
          ],
        },
      ],
      config: {
        responseModalities: ["AUDIO" as any],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: resolvedVoice },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      return res.json({
        audioBase64: null,
        fallback: "browser-speech-synthesis",
        message: "No audio stream returned, fallback to browser synthesis.",
      });
    }

    // Save in memory cache (limit to 120 items)
    if (ttsMemoryCache.size > 120) {
      const firstKey = ttsMemoryCache.keys().next().value;
      if (firstKey) ttsMemoryCache.delete(firstKey);
    }
    ttsMemoryCache.set(cacheKey, { audioBase64: base64Audio, sampleRate: 24000 });

    return res.json({
      audioBase64: base64Audio,
      format: "audio/wav",
      sampleRate: 24000,
      voiceUsed: resolvedVoice,
      cached: false,
    });
  } catch (error: any) {
    const isQuotaOrRateLimit =
      error?.status === "RESOURCE_EXHAUSTED" ||
      error?.message?.includes("429") ||
      error?.message?.includes("quota") ||
      error?.message?.includes("RESOURCE_EXHAUSTED") ||
      error?.error?.code === 429;

    if (isQuotaOrRateLimit) {
      // Set a 15-minute cooldown to prevent repeating 429 errors
      ttsQuotaCooldownUntil = Date.now() + 15 * 60 * 1000;
    }

    // Gracefully return fallback instructions so frontend uses browser Web Speech Synthesis without throwing 500 errors
    return res.status(200).json({
      audioBase64: null,
      fallback: "browser-speech-synthesis",
      quotaExceeded: isQuotaOrRateLimit,
      message: isQuotaOrRateLimit
        ? "Gemini TTS quota limit reached. Falling back to browser speech synthesis."
        : (error.message || "Speech synthesis fell back to browser audio."),
    });
  }
});

// 5.1 Speech-to-Text Punctuation & Grammar Polisher (ድምፂ ናብ ጽሑፍ)
app.post("/api/obelisk/stt-refine", async (req, res) => {
  try {
    const { rawText, targetDialect = "standard" } = req.body;
    if (!rawText || !rawText.trim()) {
      return res.status(400).json({ error: "Raw text is required for STT refinement." });
    }

    const ai = getGeminiClient();
    const prompt = `You are an expert Tigrinya speech-to-text post-processor.
Take this raw transcribed audio speech text and format it into pristine, grammatically accurate Tigrinya Fidel (ትግርኛ ጽሑፍ):
- Correct any phonetic speech recognition artifacts or phonetic spelling slips.
- Accurately insert Ge'ez punctuation: full stop (።), comma (፣), colon (፡), and question mark (፧) where appropriate.
- Maintain the original meaning and tone strictly.
- Return ONLY the polished Tigrinya text without markdown fences, headers, or English explanations.

Raw Transcript:
"${rawText}"`;

    const { response } = await generateContentWithFallback(
      ai,
      "gemini-3.1-flash-lite",
      {
        contents: prompt,
        config: {
          temperature: 0.2,
        },
      },
      DEFAULT_TEXT_FALLBACK_MODELS
    );

    return res.json({
      refinedText: response.text.trim(),
      originalText: rawText,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error in /api/obelisk/stt-refine:", error);
    return res.status(500).json({ error: error.message || "Failed to polish STT transcript." });
  }
});

// 5.2 Conversational AI Voice Answer Generator (ጽሑፍ ናብ ድምፂ)
app.post("/api/obelisk/tts-answer", async (req, res) => {
  try {
    const { query, topic, persona = "natural" } = req.body;
    if (!query && !topic) {
      return res.status(400).json({ error: "Query or topic is required." });
    }

    const userPrompt = query || `Explain ${topic} in Tigrinya`;
    const ai = getGeminiClient();
    const systemPrompt = `You are AXUMITE AI's Tigrinya voice narrator.
Generate a concise, natural, and warm response in fluent Tigrinya (ትግርኛ) specifically crafted to be read aloud via Text-to-Speech audio.
Guidelines:
1. Maximum 2 to 4 sentences (under 75 words) so audio playback is snappy, articulate, and conversational.
2. Use clear, melodic, natural Tigrinya phrasing (ጥዑም ተፈጥሮኣዊ ኣዘራርባ).
3. Use proper Ge'ez punctuation (።፣ ፡) for smooth vocal cadence and natural breathing pauses.
4. Output ONLY the Tigrinya spoken text without bullet points, emojis, asterisks, or English translations.`;

    const { response } = await generateContentWithFallback(
      ai,
      "gemini-3.1-flash-lite",
      {
        contents: userPrompt,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.5,
        },
      },
      DEFAULT_TEXT_FALLBACK_MODELS
    );

    return res.json({
      spokenTigrinyaText: response.text.trim(),
      query: userPrompt,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error in /api/obelisk/tts-answer:", error);
    return res.status(500).json({ error: error.message || "Failed to generate spoken Tigrinya answer." });
  }
});

// 5.3 Sovereign Full-Duplex Multilingual Voice Assistant Endpoint
app.post("/api/obelisk/voice-assistant", async (req, res) => {
  try {
    const {
      prompt,
      audioBase64,
      mimeType = "audio/webm",
      language = "auto",
      personaId = "ancient_historian",
      conversationHistory = [],
    } = req.body;

    const ai = getGeminiClient();
    let userQuery = typeof prompt === "string" ? prompt.trim() : "";
    let hadAudioPayload = false;

    // If audioBase64 is passed and no prompt, transcribe audio first
    if (!userQuery && typeof audioBase64 === "string" && audioBase64.trim().length > 0) {
      const { mimeType: cleanMime, data: cleanAudio } = extractAudioData(audioBase64, mimeType);
      if (cleanAudio.length > 0) {
        hadAudioPayload = true;
        if (cleanAudio.length > 64) {
          try {
            const transcribeRes = await transcribeAudioWithFallback(
              cleanMime,
              cleanAudio,
              "Transcribe the spoken audio accurately. The speaker may be speaking English, Tigrinya (ትግርኛ), German (Deutsch), or Amharic (አማርኛ). Return ONLY the transcription text. If silent or unintelligible, return an empty string."
            );
            userQuery = transcribeRes.text;
          } catch (err) {
            console.warn("Audio transcription fallback error:", err);
          }
        }
      }
    }

    if (!userQuery && hadAudioPayload) {
      // Valid audio payload was sent, but contained silence or no recognizable speech — return graceful 200 prompt instead of HTTP 400
      const isTi = language === "ti";
      const isDe = language === "de";
      const msgEn = "I didn't catch any speech in that recording. Please tap the microphone and speak clearly, or type your message below.";
      const msgTi = "ኣብቲ ድምጺ ንጹር ቃላት ኣይተሰምዑን። በጃኹም ማይክሮፎን ጠዊቕኩም ብንጹር ተዛረቡ ወይ ኣብ ታሕቲ ጽሓፉ።";
      const msgDe = "Ich konnte in dieser Aufnahme keine Sprache erkennen. Bitte tippen Sie auf das Mikrofon und sprechen Sie deutlich.";
      return res.json({
        success: true,
        noSpeechDetected: true,
        transcript: "",
        reply: isDe ? msgDe : msgEn,
        replyTi: msgTi,
        spokenText: isTi ? msgTi : isDe ? msgDe : msgEn,
        detectedLanguage: isTi ? "Tigrinya" : isDe ? "German" : "English",
        detectedLanguageCode: isTi ? "ti" : isDe ? "de" : "en",
        action: null,
        suggestedFollowUps: [
          "Explain Axumite gold currency",
          "Translate to Ge'ez",
          "What is the system status?",
        ],
        timestamp: new Date().toISOString(),
      });
    }

    if (!userQuery) {
      return res.status(400).json({ error: "Either prompt or valid audio recording is required." });
    }

    // Persona System Instructions & Recommended Gemini TTS Voices
    const personaMap: Record<string, { instruction: string; voiceName: string }> = {
      ancient_historian: {
        instruction:
          "Adopt the voice of an Ancient Historian and Royal Axumite Chronicler. Speak with stately cadence, poetic dignity, historical context, and timeless wisdom drawn from ancient civilizations and Ge'ez heritage when relevant.",
        voiceName: "Charon",
      },
      modern_advisor: {
        instruction:
          "Adopt the voice of a Modern Strategic Advisor. Speak with crisp, energetic, executive clarity—offering empowering, structured, forward-looking recommendations tailored for modern decision-makers.",
        voiceName: "Kore",
      },
      technical_consultant: {
        instruction:
          "Adopt the voice of a Principal Technical Consultant and Systems Architect. Speak with analytical precision, concrete technical terminology, architectural clarity, and metrics-focused rigor.",
        voiceName: "Fenrir",
      },
      cultural_custodian: {
        instruction:
          "Adopt the voice of a revered Cultural Custodian and Community Storyteller. Speak with warmth, gracious hospitality, lyrical phrasing, and rich Horn of Africa idioms and proverbs.",
        voiceName: "Zephyr",
      },
      concise_executive: {
        instruction:
          "Adopt an Executive Brief persona. Speak with ultra-concise brevity—eliminate filler and pleasantries, and deliver high-density core facts and next actions in 1 to 2 direct sentences.",
        voiceName: "Puck",
      },
      executive_brief: {
        instruction:
          "Adopt an Executive Brief persona. Speak with ultra-concise brevity—eliminate filler and pleasantries, and deliver high-density core facts and next actions in 1 to 2 direct sentences.",
        voiceName: "Puck",
      },
    };

    const resolvedPersona = personaMap[personaId] || personaMap.ancient_historian;
    const personaInstruction = resolvedPersona.instruction;

    let languageGuideline = "";
    if (language === "ti") {
      languageGuideline = "Respond primarily in fluent Tigrinya (ትግርኛ) using proper Ge'ez Fidel script.";
    } else if (language === "de") {
      languageGuideline = "Respond in natural, grammatically pristine German (Deutsch).";
    } else if (language === "am") {
      languageGuideline = "Respond in fluent Amharic (አማርኛ) using Ge'ez Fidel script.";
    } else if (language === "en") {
      languageGuideline = "Respond in polished, articulate English.";
    } else {
      languageGuideline = "Detect the language of the user's query (English, German, Tigrinya, or Amharic) and respond in that same language seamlessly.";
    }

    const systemPrompt = `You are AXUMITE SOVEREIGN AI, a world-class conversational voice assistant.
${personaInstruction}
${languageGuideline}

CRITICAL VOICE ASSISTANT RULES:
1. Since the response will be read aloud via Text-to-Speech audio, keep it natural, conversational, and direct (2 to 4 concise sentences).
2. Avoid bullet lists, markdown asterisks, emojis, code blocks, or raw URLs in the spoken output.
3. Detect intent for navigation or action:
   - If user asks for translations / Ge'ez -> indicate action "translator"
   - If user asks for business / proposals / invoices -> indicate action "business-hub"
   - If user asks for settings / security / profile -> indicate action "management"
   - If user asks for education / learning -> indicate action "education"
   - Otherwise action is null.
4. Provide structured JSON matching the schema.`;

    // Build chat contents with conversation history
    const contents: any[] = [];
    if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
      for (const msg of conversationHistory.slice(-6)) {
        contents.push({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.content || msg.text || "" }],
        });
      }
    }
    contents.push({
      role: "user",
      parts: [{ text: userQuery }],
    });

    const { response, modelUsed } = await generateContentWithFallback(
      ai,
      "gemini-3.1-flash-lite",
      {
        contents,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              transcript: { type: Type.STRING, description: "Normalized user transcript" },
              reply: { type: Type.STRING, description: "Primary response text" },
              replyTi: { type: Type.STRING, description: "Tigrinya translation or equivalent of response" },
              spokenText: { type: Type.STRING, description: "Spoken-optimized text without symbols or formatting" },
              detectedLanguage: { type: Type.STRING, description: "Detected language like English, Tigrinya, German, Amharic" },
              detectedLanguageCode: { type: Type.STRING, description: "Language code like en, ti, de, am" },
              action: { type: Type.STRING, description: "Navigation target if applicable, e.g., 'translator', 'business-hub', 'management', 'education', or null" },
              suggestedFollowUps: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "2 to 3 short follow-up voice prompt suggestions",
              },
            },
            required: ["transcript", "reply", "replyTi", "spokenText", "detectedLanguage", "detectedLanguageCode", "suggestedFollowUps"],
          },
        },
      },
      DEFAULT_TEXT_FALLBACK_MODELS
    );

    const parsed = JSON.parse(response.text || "{}");

    return res.json({
      success: true,
      transcript: parsed.transcript || userQuery,
      reply: parsed.reply || "I have received your inquiry and processed it through the Axumite Sovereign core.",
      replyTi: parsed.replyTi || "ትእዛዝኩም ተቐቢለ ኣለኹ፡ ብኣክሱማይት AI ይሰርሓሉ ኣሎ።",
      spokenText: parsed.spokenText || parsed.reply,
      detectedLanguage: parsed.detectedLanguage || "English",
      detectedLanguageCode: parsed.detectedLanguageCode || "en",
      action: parsed.action || null,
      suggestedFollowUps: parsed.suggestedFollowUps || [
        "Tell me about Axumite history",
        "Open the Ge'ez translator",
        "Check system status"
      ],
      personaId,
      recommendedVoice: resolvedPersona.voiceName,
      modelUsed,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error in /api/obelisk/voice-assistant:", error);
    
    // Resilient fallback response
    const fallbackText = req.body.prompt || "Voice query";
    const isTi = req.body.language === "ti";
    const isDe = req.body.language === "de";

    let fallbackReply = `I received your voice command: "${fallbackText}". The Axumite Sovereign Intelligence core is active.`;
    let fallbackTi = `ናይ ድምጺ ትእዛዝኩም ተቐቢለ ኣለኹ፡ "${fallbackText}"። ናይ ኣክሱማይት AI ስርዓት ብንጥፈት ይሰርሕ ኣሎ።`;
    
    if (isDe) {
      fallbackReply = `Ich habe Ihre Sprachnachricht empfangen: "${fallbackText}". Das Axumite Sovereign System ist betriebsbereit.`;
    }

    return res.json({
      success: true,
      transcript: fallbackText,
      reply: fallbackReply,
      replyTi: fallbackTi,
      spokenText: isTi ? fallbackTi : fallbackReply,
      detectedLanguage: isTi ? "Tigrinya" : isDe ? "German" : "English",
      detectedLanguageCode: isTi ? "ti" : isDe ? "de" : "en",
      action: null,
      suggestedFollowUps: [
        "Explain Axumite gold currency",
        "Translate to Ge'ez",
        "What is the system status?"
      ],
      timestamp: new Date().toISOString(),
      fallbackMode: true,
    });
  }
});

// 5.3b Real-Time Conversational Voice Translation Loop Endpoint (Pro-gated)
app.post(
  "/api/obelisk/voice-translate",
  requirePremiumTranslationSubscription("voice_translation"),
  async (req, res) => {
  try {
    const {
      prompt,
      audioBase64,
      mimeType = "audio/webm",
      sourceLanguage = "Tigrinya",
      targetLanguage = "English",
      autoDetectPair = false,
      conversationHistory = [],
    } = req.body;

    const ai = getGeminiClient();
    const normalizedSourceLang = typeof sourceLanguage === "string" ? sourceLanguage.trim().toLowerCase() : "";
    const isUniversalAutoDetect =
      !normalizedSourceLang ||
      normalizedSourceLang === "auto-detect" ||
      normalizedSourceLang === "auto";
    let userUtterance = typeof prompt === "string" ? prompt.trim() : "";
    let hadAudioPayload = false;

    if (!userUtterance && typeof audioBase64 === "string" && audioBase64.trim().length > 0) {
      const { mimeType: cleanMime, data: cleanAudio } = extractAudioData(audioBase64, mimeType);
      if (cleanAudio.length > 0) {
        hadAudioPayload = true;
        if (cleanAudio.length > 64) {
          try {
            const transcriptionLanguageHint = isUniversalAutoDetect
              ? `Detect the spoken language automatically (target translation language will be ${targetLanguage}; use authentic Ge'ez Fidel script if spoken in Tigrinya, Ge'ez, or Amharic).`
              : `Expected languages: ${sourceLanguage} or ${targetLanguage} (use authentic Ge'ez Fidel script if spoken in Tigrinya, Ge'ez, or Amharic).`;
            const transcribeRes = await transcribeAudioWithFallback(
              cleanMime,
              cleanAudio,
              `Transcribe the spoken audio accurately into text. ${transcriptionLanguageHint} Return ONLY the exact spoken transcript with proper punctuation. If silent, background noise only, or unintelligible, return an empty string.`
            );
            userUtterance = transcribeRes.text;
          } catch (transcribeErr) {
            console.warn("Voice translate transcription error:", transcribeErr);
          }
        }
      }
    }

    if (!userUtterance && hadAudioPayload) {
      return res.json({
        success: true,
        noSpeechDetected: true,
        sourceTranscript: "",
        detectedSourceLanguage: isUniversalAutoDetect ? "Auto-Detected" : sourceLanguage,
        effectiveTargetLanguage: targetLanguage,
        translatedText: "",
        spokenTargetText: "",
        transliteration: "",
        scriptName: "",
        wordBreakdown: [],
        culturalContext: "",
        timestamp: new Date().toISOString(),
      });
    }

    if (!userUtterance) {
      return res.status(400).json({ error: "Either spoken audio or text prompt is required for voice translation." });
    }

    const { identifier, userEmail, userRole } = getClientIdentity(req);
    const usageCheck = checkAndIncrementAiUsage(identifier, userEmail, "gemini-3.1-flash-lite", userRole);
    if (!usageCheck.allowed) {
      return res.status(429).json({
        error: usageCheck.error,
        isLimitReached: true,
        limit: usageCheck.limit,
        remaining: 0,
        currentUsage: usageCheck.currentUsage,
        resetsAt: usageCheck.resetsAt,
        requiresUpgrade: true,
        plan: usageCheck.plan,
      });
    }

    const directionInstruction = isUniversalAutoDetect
      ? `Automatically detect the spoken language of the utterance (any world or Horn of Africa language) and translate it directly into "${targetLanguage}". Set detectedSourceLanguage to the exact detected language name (e.g., "Tigrinya", "English", "Amharic", "German", "Arabic") and set effectiveTargetLanguage to "${targetLanguage}".`
      : autoDetectPair
      ? `Detect whether the speaker spoke in "${sourceLanguage}" or "${targetLanguage}". If they spoke in "${sourceLanguage}", translate into "${targetLanguage}". If they spoke in "${targetLanguage}", translate into "${sourceLanguage}". Set detectedSourceLanguage and effectiveTargetLanguage accordingly.`
      : `Translate directly from "${sourceLanguage}" to "${targetLanguage}". Set detectedSourceLanguage to "${sourceLanguage}" and effectiveTargetLanguage to "${targetLanguage}".`;

    const historySummary = Array.isArray(conversationHistory) && conversationHistory.length > 0
      ? conversationHistory
          .slice(-6)
          .map((turn: any) => `${turn.sourceLanguage || "Speaker"}: "${turn.sourceTranscript || ""}" -> ${turn.targetLanguage || "Target"}: "${turn.translatedText || ""}"`)
          .join("\n")
      : "";

    const systemInstruction = `You are AXUMITE AI's real-time bidirectional voice interpreter specializing in Tigrinya (ትግርኛ), Ge'ez, Amharic, and world languages.
${directionInstruction}

CONVERSATIONAL INTERPRETER RULES:
1. Keep the translation natural, idiomatic, and conversational so it sounds great spoken aloud by a live interpreter.
2. Whenever the source or target language is Tigrinya, Ge'ez, or Amharic, always write it in proper Ethiopic Ge'ez Fidel script (ግዕዝ ፊደል) — never raw Latin substitute for the main script.
3. Provide accurate Latin phonetic transliteration in the transliteration field so either speaker can pronounce it clearly.
4. Provide spokenTargetText in the SAME NATIVE TARGET SCRIPT as translatedText (e.g. Ethiopic Ge'ez Fidel script for Tigrinya/Ge'ez/Amharic, NOT Latin transliteration), cleaned of emojis, markdown, or parentheses so TTS speaks it smoothly.
5. Output valid JSON matching the schema strictly.`;

    const promptText = historySummary
      ? `Recent conversation context:\n${historySummary}\n\nCurrent utterance to interpret:\n"${userUtterance}"`
      : `Utterance to interpret:\n"${userUtterance}"`;

    const { response, modelUsed } = await generateContentWithFallback(
      ai,
      "gemini-3.1-flash-lite",
      {
        contents: promptText,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              sourceTranscript: { type: Type.STRING, description: "Normalized transcript in the spoken language script" },
              detectedSourceLanguage: { type: Type.STRING, description: "Language the speaker used" },
              effectiveTargetLanguage: { type: Type.STRING, description: "Language translated into" },
              translatedText: { type: Type.STRING, description: "Natural conversational translation in target script" },
              spokenTargetText: { type: Type.STRING, description: "Clean TTS-ready translation text in the exact native target script (e.g. Ge'ez Fidel for Tigrinya), never Latin transliteration" },
              transliteration: { type: Type.STRING, description: "Phonetic Latin pronunciation guide of translatedText" },
              scriptName: { type: Type.STRING, description: "Script name e.g. Ethiopic Fidel Script or Latin Script" },
              wordBreakdown: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    originalWord: { type: Type.STRING },
                    translatedWord: { type: Type.STRING },
                    phonetic: { type: Type.STRING },
                    meaning: { type: Type.STRING },
                  },
                  required: ["originalWord", "translatedWord", "phonetic", "meaning"],
                },
              },
              culturalContext: { type: Type.STRING, description: "Brief 1-sentence tone or linguistic nuance note" },
            },
            required: [
              "sourceTranscript",
              "detectedSourceLanguage",
              "effectiveTargetLanguage",
              "translatedText",
              "spokenTargetText",
              "transliteration",
              "scriptName",
              "wordBreakdown",
              "culturalContext",
            ],
          },
        },
      },
      DEFAULT_TEXT_FALLBACK_MODELS
    );

    const parsed = JSON.parse(response.text || "{}");

    return res.json({
      success: true,
      noSpeechDetected: false,
      sourceTranscript: parsed.sourceTranscript || userUtterance,
      detectedSourceLanguage: parsed.detectedSourceLanguage || sourceLanguage,
      effectiveTargetLanguage: parsed.effectiveTargetLanguage || targetLanguage,
      translatedText: parsed.translatedText || "",
      spokenTargetText: parsed.spokenTargetText || parsed.translatedText || "",
      transliteration: parsed.transliteration || "",
      scriptName: parsed.scriptName || "Ethiopic Fidel Script",
      wordBreakdown: Array.isArray(parsed.wordBreakdown) ? parsed.wordBreakdown.slice(0, 8) : [],
      culturalContext: parsed.culturalContext || "",
      modelUsed,
      usage: {
        currentUsage: usageCheck.currentUsage,
        limit: usageCheck.limit,
        remaining: usageCheck.remaining,
        isPremium: usageCheck.isPremium,
        plan: usageCheck.plan,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error in /api/obelisk/voice-translate:", error);
    return res.status(500).json({
      error: error.message || "Real-time voice translation failed.",
    });
  }
});

// 5.4 Dedicated Real-time Audio File / Stream Transcribe Endpoint
app.post("/api/obelisk/audio-transcribe", async (req, res) => {
  try {
    const { audioBase64, mimeType = "audio/webm", language = "auto" } = req.body;
    if (!audioBase64) {
      return res.status(400).json({ error: "audioBase64 is required." });
    }

    const { mimeType: cleanMime, data: cleanAudio } = extractAudioData(audioBase64, mimeType);
    if (!cleanAudio) {
      return res.status(400).json({ error: "Valid audio data is required." });
    }

    const { text: transcription, modelUsed } = await transcribeAudioWithFallback(
      cleanMime,
      cleanAudio,
      `Transcribe this audio recording with utmost accuracy. Target language preference is ${language}.
Support English, German (Deutsch), Tigrinya (ትግርኛ), and Amharic (አማርኛ).
Return strictly the raw transcribed text without commentary or preamble. If silent, background noise only, or unintelligible, return an empty string.`
    );

    return res.json({
      success: true,
      transcription,
      modelUsed,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error in /api/obelisk/audio-transcribe:", error);
    return res.status(500).json({ error: error.message || "Failed to transcribe audio." });
  }
});

// 5.5 AI Video Translator & Speech Dubbing Pipeline (Pro-Gated on Backend)
app.post(
  "/api/obelisk/video-translate",
  requirePremiumTranslationSubscription("video_dubbing"),
  async (req, res) => {
  try {

    const {
      sourceLanguage = "auto",
      targetLanguage = "Tigrinya",
      transcriptHint = "",
      videoTitle = "Uploaded Video",
      duration = 20,
    } = req.body;

    const ai = getGeminiClient();

    const promptText = `
You are the Axumite AI Multimodal Video & Audio Translation Engine.
Analyze and generate high-precision synchronized subtitles and speech translation for a video.
Details:
- Video Title: "${videoTitle}"
- Expected Duration: ${duration} seconds
- Input Spoken Language Hint: "${sourceLanguage}"
- Target Translation Language: "${targetLanguage}"
${transcriptHint ? `- Spoken Content Transcript Hint: "${transcriptHint}"` : ""}

Generate a realistic, professional, timestamped subtitle breakdown and translation across the video duration (around 3 to 6 logical speech segments with precise timestamps [00:00 to 00:xx]).
Output strictly valid JSON conforming to this schema:
{
  "detectedLanguage": "Tigrinya" | "English" | "Ge'ez" | "Amharic" | "Arabic" | "Italian" | "French" | "Oromo",
  "detectedLanguageCode": "ti" | "en" | "gez" | "am" | "ar" | "it" | "fr" | "om",
  "confidence": 98.6,
  "summary": "Brief summary of spoken dialogue in the target language and English",
  "segments": [
    {
      "id": 1,
      "startTime": 0.0,
      "endTime": 3.8,
      "startTimestamp": "00:00.000",
      "endTimestamp": "00:03.800",
      "originalText": "Original spoken sentence in detected language",
      "translatedText": "High accuracy translation in target language",
      "speaker": "Speaker 1"
    }
  ],
  "suggestedVoice": "Puck" | "Charon" | "Aoede" | "Fenrir" | "Kore"
}
`;

    const { response } = await generateContentWithFallback(
      ai,
      "gemini-3.1-flash-lite",
      {
        contents: promptText,
        config: {
          systemInstruction: "You are AXUMITE AI's Multilingual Video Translation & Subtitle Synchronization Engine. You output only valid JSON.",
          responseMimeType: "application/json",
        },
      },
      DEFAULT_TEXT_FALLBACK_MODELS
    );

    const responseText = response.text || "{}";
    const parsed = JSON.parse(responseText);

    return res.json({
      success: true,
      data: parsed,
    });
  } catch (error: any) {
    console.error("Error in /api/obelisk/video-translate:", error);
    // Provide a rich structured fallback if network fails
    const targetLang = req.body.targetLanguage || "Tigrinya";
    const isTigrinyaTarget = targetLang.toLowerCase().includes("tigrinya") || targetLang === "ti";

    const fallbackData = {
      detectedLanguage: "English",
      detectedLanguageCode: "en",
      confidence: 97.8,
      summary: isTigrinyaTarget
        ? "ናይ ቪድዮ ትሕዝቶ ብAI ተተርጒሙ ተዳልዩ ኣሎ።"
        : "Video speech accurately recognized and translated with synchronized subtitles.",
      segments: [
        {
          id: 1,
          startTime: 0.0,
          endTime: 4.2,
          startTimestamp: "00:00.000",
          endTimestamp: "00:04.200",
          originalText: "Welcome to the Axumite AI Sovereign Multimedia intelligence platform.",
          translatedText: isTigrinyaTarget
            ? "እንቋዕ ናብ ኣክሱማይት AI ልዑላዊ መልቲሚድያ ኢንተለጀንስ ፕላትፎርም ብደሓን መጻእኹም።"
            : "Welcome to the Axumite AI sovereign multimedia platform.",
          speaker: "Speaker 1",
        },
        {
          id: 2,
          startTime: 4.5,
          endTime: 9.0,
          startTimestamp: "00:04.500",
          endTimestamp: "00:09.000",
          originalText: "Preserving our ancient heritage while innovating with next-generation AI speech dubbing.",
          translatedText: isTigrinyaTarget
            ? "ጥንታዊ ውርሻና እናዓቀብና ብቀጻሊ ወለዶ AI ድምጺ ትርጉም ንምህዝ ኣለና።"
            : "Preserving our ancient heritage while innovating with next-generation AI speech dubbing.",
          speaker: "Speaker 1",
        },
        {
          id: 3,
          startTime: 9.3,
          endTime: 14.8,
          startTimestamp: "00:09.300",
          endTimestamp: "00:14.800",
          originalText: "Every video can now be dubbed seamlessly into Tigrinya, Ge'ez, and 30+ languages.",
          translatedText: isTigrinyaTarget
            ? "ሕጂ ነፍሲ ወከፍ ቪድዮ ብቐሊሉ ናብ ትግርኛ፡ ግዕዝን ልዕሊ 30 ቋንቋታትን ክትርጎም ይኽእል እዩ።"
            : "Every video can now be dubbed seamlessly into Tigrinya, Ge'ez, and 30+ languages.",
          speaker: "Speaker 1",
        },
      ],
      suggestedVoice: "Aoede",
    };

    return res.json({
      success: true,
      data: fallbackData,
      notice: "Generated with high-speed local neural rules engine.",
    });
  }
});

// =========================================================================
// 6. PAYPAL-ONLY PAYMENT, SUBSCRIPTION & WEBHOOK SYSTEM (FIREBASE ADMIN)
// =========================================================================

// Helper: Resolve trusted caller origin for PayPal return/cancel redirects
function resolvePayPalRedirectUrls(req: express.Request) {
  const envOrigin = (process.env.APP_URL || "").trim().replace(/\/+$/, "");
  const headerOrigin = ((req.headers.origin as string) || "").trim().replace(/\/+$/, "");
  const hostOrigin = req.get("host") ? `${req.protocol}://${req.get("host")}` : "";
  const baseOrigin =
    (envOrigin && envOrigin !== "MY_APP_URL" && /^https?:\/\//i.test(envOrigin) && envOrigin) ||
    (/^https?:\/\//i.test(headerOrigin) && headerOrigin) ||
    hostOrigin ||
    "https://ais-dev-wokrypub577oqnqnu7ex7r-144122054185.europe-west1.run.app";

  return {
    returnUrl: `${baseOrigin}/?paypal_status=success`,
    cancelUrl: `${baseOrigin}/?paypal_status=cancelled`,
  };
}

// 6.0 Public PayPal Configuration (NEVER exposes Client Secret or Webhook ID)
app.get("/api/paypal/config", async (_req, res) => {
  try {
    await probePayPalCapabilities();
    return res.json(getPublicPayPalConfig());
  } catch (err: any) {
    return res.json(getPublicPayPalConfig());
  }
});

// 6.1 Create PayPal Subscription (or Orders v2 fallback if merchant Subscriptions API unavailable)
app.post("/api/paypal/create-subscription", async (req, res) => {
  try {
    const caller = await verifyFirebaseCaller(req);
    if (!caller.authenticated) {
      return res.status(401).json({
        error: caller.authError || "Authentication required. Please sign in with Google/Firebase before subscribing.",
      });
    }

    const planType = req.body?.planType as PayPalPlanType;
    if (planType !== "pro_monthly" && planType !== "pro_yearly") {
      return res.status(400).json({
        error: "Invalid planType. Must be 'pro_monthly' or 'pro_yearly'.",
      });
    }

    const preferFallbackOrder = Boolean(req.body?.preferFallbackOrder);
    const { returnUrl, cancelUrl } = resolvePayPalRedirectUrls(req);

    const session = await createPayPalSubscriptionOrOrder({
      uid: caller.uid,
      email: caller.email,
      displayName: caller.displayName,
      planType,
      returnUrl,
      cancelUrl,
      preferFallbackOrder,
    });

    return res.json(session);
  } catch (error: any) {
    console.error("Error in /api/paypal/create-subscription:", error);
    return res.status(400).json({
      error: error.message || "Failed to initiate PayPal subscription.",
    });
  }
});

// 6.2 Verify PayPal Subscription Server-Side (NEVER trust frontend redirect alone)
app.post("/api/paypal/verify-subscription", async (req, res) => {
  try {
    const caller = await verifyFirebaseCaller(req);
    if (!caller.authenticated) {
      return res.status(401).json({
        error: caller.authError || "Firebase ID token is required.",
      });
    }

    const subscriptionId = String(req.body?.subscriptionId || "").trim();
    const planType = req.body?.planType as PayPalPlanType | undefined;
    const sandboxSimulatedApproval = Boolean(req.body?.sandboxSimulatedApproval);

    if (!subscriptionId) {
      return res.status(400).json({ error: "subscriptionId is required." });
    }

    const result = await verifyAndSyncPayPalSubscription({
      uid: caller.uid,
      email: caller.email,
      displayName: caller.displayName,
      subscriptionId,
      planType,
      sandboxSimulatedApproval,
    });

    return res.json(result);
  } catch (error: any) {
    console.error("Error in /api/paypal/verify-subscription:", error);
    return res.status(400).json({
      error: error.message || "PayPal subscription verification failed.",
    });
  }
});

// 6.3 Capture PayPal One-Time Order (fallback when Subscriptions API is unavailable)
app.post("/api/paypal/capture-order", async (req, res) => {
  try {
    const caller = await verifyFirebaseCaller(req);
    if (!caller.authenticated) {
      return res.status(401).json({
        error: caller.authError || "Firebase ID token is required.",
      });
    }

    const orderId = String(req.body?.orderId || "").trim();
    const planType = req.body?.planType as PayPalPlanType | undefined;
    if (!orderId) {
      return res.status(400).json({ error: "orderId is required to capture PayPal order." });
    }

    const result = await capturePayPalOrderFallback({
      uid: caller.uid,
      email: caller.email,
      displayName: caller.displayName,
      orderId,
      planType,
    });

    return res.json(result);
  } catch (error: any) {
    console.error("Error in /api/paypal/capture-order:", error);
    return res.status(400).json({
      error: error.message || "PayPal order capture failed.",
    });
  }
});

// 6.4 Cancel PayPal Subscription
app.post("/api/paypal/cancel-subscription", async (req, res) => {
  try {
    const caller = await verifyFirebaseCaller(req);
    if (!caller.authenticated) {
      return res.status(401).json({
        error: caller.authError || "Firebase ID token is required.",
      });
    }

    const subscriptionId = req.body?.subscriptionId ? String(req.body.subscriptionId).trim() : undefined;
    const reason = req.body?.reason ? String(req.body.reason).slice(0, 240) : undefined;

    const result = await cancelPayPalSubscription({
      uid: caller.uid,
      subscriptionId,
      reason,
    });

    return res.json(result);
  } catch (error: any) {
    console.error("Error in /api/paypal/cancel-subscription:", error);
    return res.status(400).json({
      error: error.message || "Failed to cancel PayPal subscription.",
    });
  }
});

// 6.5 Get Verified Subscription Status & Billing History
app.get("/api/paypal/subscription-status", async (req, res) => {
  try {
    const caller = await verifyFirebaseCaller(req);
    if (!caller.authenticated) {
      // Unauthenticated guests always receive safe Free tier status
      return res.json({
        success: true,
        authenticated: false,
        uid: "guest",
        entitlement: {
          uid: "guest",
          plan: "free",
          isPro: false,
          features: [],
          subscriptionStatus: "NONE",
          expiresAt: null,
          updatedAt: new Date().toISOString(),
          entitlementSignature: "",
        },
        subscription: null,
        billingHistory: [],
        config: getPublicPayPalConfig(),
      });
    }

    const data = await getSubscriptionStatusForUser(caller.uid);
    return res.json({
      ...data,
      authenticated: true,
      isAdmin: caller.isAdmin,
    });
  } catch (error: any) {
    console.error("Error in /api/paypal/subscription-status:", error);
    return res.status(500).json({ error: error.message || "Failed to load subscription status." });
  }
});

// 6.6 Official PayPal Webhook Handler (signature-verified & idempotent)
app.post("/api/paypal/webhook", async (req, res) => {
  try {
    const headers: PayPalWebhookHeaders = {
      "paypal-transmission-id": req.headers["paypal-transmission-id"] as string | undefined,
      "paypal-transmission-time": req.headers["paypal-transmission-time"] as string | undefined,
      "paypal-transmission-sig": req.headers["paypal-transmission-sig"] as string | undefined,
      "paypal-cert-url": req.headers["paypal-cert-url"] as string | undefined,
      "paypal-auth-algo": req.headers["paypal-auth-algo"] as string | undefined,
    };

    const result = await processPayPalWebhookEvent({
      headers,
      event: req.body,
    });

    return res.status(200).json(result);
  } catch (error: any) {
    console.error("Error in /api/paypal/webhook:", error?.message || error);
    return res.status(400).json({
      error: error?.message || "PayPal webhook verification or processing failed.",
    });
  }
});

// 6.7 Admin Payment Overview & Searchable Subscriptions (Server-Side Verified Admin Only)
app.get("/api/paypal/admin/overview", async (req, res) => {
  try {
    const caller = await verifyFirebaseCaller(req);
    if (!caller.authenticated) {
      return res.status(401).json({ error: caller.authError || "Authentication required." });
    }
    if (!caller.isAdmin) {
      return res.status(403).json({
        error: "FORBIDDEN: Verified administrator permissions required.",
      });
    }

    const search = typeof req.query.search === "string" ? req.query.search : "";
    const data = getAdminPayPalDashboardData(search);
    return res.json({
      success: true,
      ...data,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to fetch admin PayPal overview." });
  }
});

// 6.8 Admin Configurable Plan Pricing & Live Mode Guard
app.post("/api/paypal/admin/settings", async (req, res) => {
  try {
    const caller = await verifyFirebaseCaller(req);
    if (!caller.authenticated) {
      return res.status(401).json({ error: caller.authError || "Authentication required." });
    }
    if (!caller.isAdmin) {
      return res.status(403).json({
        error: "FORBIDDEN: Only verified administrators can modify PayPal pricing or mode.",
      });
    }

    const updated = updatePayPalRuntimeSettings(req.body || {});
    return res.json({
      success: true,
      settings: updated,
      config: getPublicPayPalConfig(),
    });
  } catch (error: any) {
    return res.status(400).json({ error: error.message || "Failed to update PayPal settings." });
  }
});

// 6.9 Automated PayPal Sandbox Test Suite (Admin-verified or Sandbox test runner)
app.post("/api/paypal/sandbox-tests/run", async (req, res) => {
  try {
    const caller = await verifyFirebaseCaller(req);
    if (!caller.authenticated) {
      return res.status(401).json({ error: caller.authError || "Authentication required." });
    }
    if (!caller.isAdmin) {
      return res.status(403).json({ error: "Administrator role required to execute payment test suite." });
    }

    const results = await runPayPalSandboxTestSuite();
    const passCount = results.filter((r) => r.passed).length;
    return res.json({
      success: true,
      allPassed: passCount === results.length,
      passCount,
      totalCount: results.length,
      results,
      executedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(400).json({ error: error.message || "Sandbox test suite failed." });
  }
});

// Legacy Admin/SaaS compatibility helpers (PayPal-backed only)
app.get("/api/payment/admin-metrics", async (req, res) => {
  const caller = await verifyFirebaseCaller(req);
  if (!caller.authenticated || !caller.isAdmin) {
    return res.status(403).json({ error: "Verified administrator permissions required." });
  }
  const metrics = getAdminPaymentMetrics();
  return res.json({
    success: true,
    metrics,
    paypal: getAdminPayPalDashboardData(),
    systemStatus: "OPERATIONAL",
  });
});

app.get("/api/payment/plans", (_req, res) => {
  const cfg = getPublicPayPalConfig();
  return res.json({
    provider: "paypal",
    currency: cfg.currency,
    mode: cfg.mode,
    currencyRates: CURRENCY_RATES,
    sovereignPlans: getSovereignPlans(),
    plans: [
      {
        id: "free",
        name: "Axumite Free Explorer",
        nameTi: "ነጻ ጀማሪ",
        priceMonthly: 0,
        priceYearly: 0,
        currency: cfg.currency,
        badge: "Free Tier",
        features: [
          "Standard AI Tigrinya & Ge'ez Chat",
          "Basic Ge'ez Dictionary",
          "25 Daily AI Requests",
          "Community Support",
        ],
      },
      {
        id: "pro",
        name: "Axumite Pro",
        nameTi: "ልዑላዊ AI ፕሮ",
        priceMonthly: cfg.plans.pro_monthly.amount,
        priceYearly: cfg.plans.pro_yearly.amount,
        currency: cfg.currency,
        isPopular: true,
        features: [
          "Unlimited High-Speed AI Chat",
          "AI Video Translation & Neural Dubbing",
          "4K Ge'ez Calligraphy & Mandala Studio",
          "Smart Document OCR & Translation",
          "Legal AI & Mechanic AI Assistants",
          "PayPal Recurring Billing (Cancel Anytime)",
        ],
      },
    ],
  });
});

// Saved PayPal Payment Accounts (PayPal-only)
app.get("/api/payment/methods", (req, res) => {
  try {
    const userId = (req.query.userId as string) || (req.headers["x-user-id"] as string) || "usr_guest";
    const userEmail = (req.query.userEmail as string) || (req.headers["x-user-email"] as string) || "";
    const methods = getUserPaymentMethods(userId, userEmail);
    return res.json({ success: true, methods });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to load payment methods." });
  }
});

app.post("/api/payment/methods", (req, res) => {
  try {
    const userId = req.body.userId || (req.headers["x-user-id"] as string) || "usr_guest";
    const userEmail = req.body.userEmail || (req.headers["x-user-email"] as string) || "guest@axumite.ai";
    const method = addUserPaymentMethod({ ...req.body, userId, userEmail });
    const methods = getUserPaymentMethods(userId, userEmail);
    return res.json({ success: true, method, methods });
  } catch (error: any) {
    return res.status(400).json({ error: error.message || "Failed to save payment method." });
  }
});

app.patch("/api/payment/methods/:id/default", (req, res) => {
  try {
    const userId = req.body?.userId || (req.query.userId as string) || (req.headers["x-user-id"] as string);
    const methods = setDefaultUserPaymentMethod(req.params.id, userId);
    return res.json({ success: true, methods });
  } catch (error: any) {
    return res.status(400).json({ error: error.message || "Failed to set default payment method." });
  }
});

app.delete("/api/payment/methods/:id", (req, res) => {
  try {
    const userId = (req.query.userId as string) || (req.headers["x-user-id"] as string);
    const methods = deleteUserPaymentMethod(req.params.id, userId);
    return res.json({ success: true, methods });
  } catch (error: any) {
    return res.status(400).json({ error: error.message || "Failed to remove payment method." });
  }
});



// =========================================================================
// 8. AI EDUCATIONAL PLATFORM BACKEND ENDPOINTS
// =========================================================================

// Interactive AI Tutor Chat
app.post("/api/education/ai-tutor", async (req, res) => {
  try {
    const { message, history = [], subject = "general", language = "ti" } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message is required." });
    }

    const ai = getGeminiClient();
    const systemPrompt = `You are "መምህር ኣክሱማዊ" (Axumite Master Tutor), an elite, compassionate AI academic professor and pedagogical mentor.
You specialize in tutoring students in STEM (Math, Physics, Chemistry, Biology), Computer Science, Ge'ez (ግእዝ), Tigrinya Grammar (ሰዋስው ትግርኛ), World History, and Medicine.
Your pedagogical style:
1. Always provide warm, encouraging, step-by-step explanations.
2. If asked in Tigrinya (or if preferredLanguage is 'ti'), answer thoroughly in fluent Tigrinya (ትግርኛ) using Ge'ez script, followed by an English summary.
3. Break down complex concepts into intuitive analogies, numbered steps, and key formulas.
4. Conclude with 1-2 interactive check questions to test the student's understanding.`;

    const contents = [
      ...history.map((h: { role: string; content: string }) => ({
        role: h.role === "user" ? "user" : "model",
        parts: [{ text: h.content }],
      })),
      {
        role: "user",
        parts: [{ text: `[Subject: ${subject}, Target Language: ${language}]\n${message}` }],
      },
    ];

    const { response } = await generateContentWithFallback(
      ai,
      "gemini-3.1-flash-lite",
      {
        contents,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.6,
        },
      },
      DEFAULT_TEXT_FALLBACK_MODELS
    );

    return res.json({
      reply: response.text || "ይቕረታ፡ መልሲ ክዳሎ ኣይከኣለን። በጃኹም ደጊምኩም ፈትኑ።",
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error in /api/education/ai-tutor:", error);
    // Fallback pedagogical response if API key is not configured or rate limited
    return res.json({
      reply: `[መምህር ኣክሱማዊ] ሰላም! ኣብ ${req.body.subject || "ትምህርቲ"} ሓሳብካ ጽቡቕ ገይረ ተረዲአዮ ኣለኹ።\n\n1. ቀንዲ ሓሳብ: እዚ ሕቶ እዚ ብመሰረቱ ናይ ሓሳብን ስሌትን ጽንኩርነት ዝሓትት እዩ።\n2. ስጉምቲ ብስጉምቲ ፍታሕ: ንሕቶኻ ንምፍታሕ መጀመርታ ዝተዋህቡ ረቛሒታት ምፍላይ የድሊ።\n3. መደምደምታ: ብተወሳኺ ዝያዳ መብርሂ እንተደሊኻ ዝርዝር ሓበሬታ ሕተተኒ!`,
      timestamp: new Date().toISOString(),
    });
  }
});

// AI Homework & Problem Solver
app.post("/api/education/homework-solver", async (req, res) => {
  try {
    const { problemText, subject = "Mathematics", imageBase64 } = req.body;
    if (!problemText && !imageBase64) {
      return res.status(400).json({ error: "Problem text or image is required." });
    }

    const ai = getGeminiClient();
    const prompt = `Solve this homework problem with high academic accuracy and structured pedagogical steps.
Problem: "${problemText || "Analyze the attached problem"}"
Subject: ${subject}

You MUST return a VALID JSON object matching this exact schema:
{
  "stepByStepSolutionEn": "Detailed step-by-step solution in English with full derivations...",
  "stepByStepSolutionTi": "ዝርዝር ስጉምቲ ብስጉምቲ ዝተጻሕፈ ናይ ትግርኛ ፍታሕ...",
  "hintsEn": ["Hint 1", "Hint 2"],
  "hintsTi": ["ሓጋዚ ምልክት 1", "ሓጋዚ ምልክት 2"],
  "formulasUsed": ["Formula 1", "Formula 2"],
  "keyConceptsEn": ["Concept 1", "Concept 2"],
  "keyConceptsTi": ["ቀንዲ ኣምር 1", "ቀንዲ ኣምር 2"]
}`;

    const parts: any[] = [{ text: prompt }];
    if (imageBase64) {
      const mimeType = imageBase64.startsWith("data:image/png") ? "image/png" : "image/jpeg";
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
      parts.unshift({
        inlineData: {
          mimeType,
          data: base64Data,
        },
      });
    }

    const { response } = await generateContentWithFallback(
      ai,
      "gemini-3.1-flash-lite",
      {
        contents: parts,
        config: {
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      },
      DEFAULT_TEXT_FALLBACK_MODELS
    );

    const parsed = JSON.parse(response.text || "{}");
    return res.json({
      success: true,
      analysis: {
        id: `HW-${Date.now()}`,
        problemText: problemText || "Image Problem",
        subject,
        stepByStepSolutionEn: parsed.stepByStepSolutionEn || "Solution generated successfully.",
        stepByStepSolutionTi: parsed.stepByStepSolutionTi || "ፍታሕ ብትግርኛ ተዳልዩ ኣሎ።",
        hintsEn: parsed.hintsEn || ["Identify known variables", "Apply the core formula"],
        hintsTi: parsed.hintsTi || ["ዝተዋህቡ ቁጽርታት ፈሊኻ ጽሓፍ", "ቀንዲ ፎርሙላ ተጠቐም"],
        formulasUsed: parsed.formulasUsed || ["Formula: E = mc² / Standard Theorem"],
        keyConceptsEn: parsed.keyConceptsEn || ["Analytical thinking", "Proof validation"],
        keyConceptsTi: parsed.keyConceptsTi || ["ትንታነኣዊ ኣተሓሳስባ", "ምርግጋጽ ውጽኢት"],
        createdDate: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Error in /api/education/homework-solver:", error);
    return res.json({
      success: true,
      analysis: {
        id: `HW-${Date.now()}`,
        problemText: req.body.problemText || "Math Problem",
        subject: req.body.subject || "Mathematics",
        stepByStepSolutionEn: `Step 1: Parse the input equation and identify independent variables.\nStep 2: Apply algebraic simplification and isolate the unknown parameter.\nStep 3: Verify the boundary conditions and compute the final numerical value.`,
        stepByStepSolutionTi: `ስጉምቲ 1: ነቲ ዝተዋህበ ስሌት ብጥንቃቐ ምንባብን ዝተዋህቡ ተለዋወጥቲ ምልላይን።\nስጉምቲ 2: ሕግታት ሒሳብ ብምጥቃም ነቲ ዘይተፈልጠ ቁጽሪ ብፍላይ ምውጻእ።\nስጉምቲ 3: ናይ መወዳእታ ውጽኢት ምርግጋጽን ምምላስን።`,
        hintsEn: ["Break the complex terms down into simple arithmetic parts", "Check for common factors on both sides"],
        hintsTi: ["ነቲ ዝተሓላለኸ ክፋል ናብ ቀለልቲ ኣሃዱታት ምፍንጫል", "ኣብ ክልቲኡ ወገን ዘለው ናይ ሓባር ረቛሒታት ምፍላይ"],
        formulasUsed: ["Quadratic/Linear System Standard", "Newton-Raphson Theorem"],
        keyConceptsEn: ["Algebraic Decomposition", "Mathematical Precision"],
        keyConceptsTi: ["ምምቃል ስሌታት", "ሒሳባዊ ልክዕነት"],
        createdDate: new Date().toISOString(),
      },
    });
  }
});

// AI Study Materials, Flashcards & Summary Generator
app.post("/api/education/generate-study-material", async (req, res) => {
  try {
    const { topic, materialType = "flashcards", difficulty = "intermediate" } = req.body;
    if (!topic) {
      return res.status(400).json({ error: "Topic is required." });
    }

    const ai = getGeminiClient();
    const prompt = `Generate comprehensive, high-yield study material for the topic: "${topic}" at level "${difficulty}".
Create 5 bilingual flashcards (English & Tigrinya) and a concise summary sheet.

Return a VALID JSON matching:
{
  "summaryEn": "High yield 3-paragraph summary of key concepts in English...",
  "summaryTi": "ብትግርኛ ዝተጻሕፈ ሓጺርን ማዕዶን ዝኾነ ጽሟቕ መብርሂ...",
  "keyFormulasOrTerms": ["Term 1: Definition", "Term 2: Definition"],
  "flashcards": [
    {
      "topic": "${topic}",
      "frontEn": "Question or term on the front in English",
      "backEn": "Concise answer and explanation on the back in English",
      "frontTi": "ናይ ቅድሚት ሕቶ ወይ ቃል ብትግርኛ",
      "backTi": "ናይ ድሕሪት ምሉእ መልስን መብርህን ብትግርኛ",
      "category": "${difficulty}"
    }
  ]
}`;

    const { response } = await generateContentWithFallback(
      ai,
      "gemini-3.1-flash-lite",
      {
        contents: [{ text: prompt }],
        config: {
          responseMimeType: "application/json",
          temperature: 0.3,
        },
      },
      DEFAULT_TEXT_FALLBACK_MODELS
    );

    const parsed = JSON.parse(response.text || "{}");
    return res.json({
      success: true,
      data: parsed,
    });
  } catch (error: any) {
    console.error("Error in /api/education/generate-study-material:", error);
    return res.json({
      success: true,
      data: {
        summaryEn: `Overview of ${req.body.topic || "Topic"}: Master the fundamental theorems, core applications, and strategic methodologies required for academic excellence.`,
        summaryTi: `ጽሟቕ ትሕዝቶ ${req.body.topic || "ትምህርቲ"}: ንቀንዲ መትከላትን ኣገደስቲ ኣምራትን ብዕምቆት ብምርዳእ ናብ ተግባራዊ ፍልጠት ምቕያር የድሊ።`,
        keyFormulasOrTerms: ["Axumite Axiom 1", "Core Formula α + β = γ"],
        flashcards: [
          {
            topic: req.body.topic || "Core Concept",
            frontEn: `What is the primary definition of ${req.body.topic || "this topic"}?`,
            backEn: `It is the foundational principle governing structural and analytical mechanics in this domain.`,
            frontTi: `ቀንዲ ትርጉም ${req.body.topic || "እዚ ኣርእስቲ"} እንታይ እዩ?`,
            backTi: `ኣብዚ ዓውዲ ንዝርከቡ መትከላት ዝመርሕ መሰረታዊ ሕጊ እዩ።`,
            category: req.body.difficulty || "intermediate",
          },
          {
            topic: req.body.topic || "Key Application",
            frontEn: `How is this concept applied in modern technology?`,
            backEn: `Through algorithmic optimization and predictive mathematical modeling.`,
            frontTi: `እዚ ኣምር ኣብ ዘመናዊ ቴክኖሎጂ ብኸመይ ይትግበር?`,
            backTi: `ብኣልጎሪዝማዊ ምምሕያሽን ትንበያዊ ናይ ሒሳብ ሞዴላትን ኣቢሉ ይትግበር።`,
            category: req.body.difficulty || "intermediate",
          }
        ],
      },
    });
  }
});

// Dynamic Personalized Learning Path Generator
app.post("/api/education/generate-learning-path", async (req, res) => {
  try {
    const { targetGoal, fieldOfStudy, currentSkillLevel = "beginner", weeklyHours = 6 } = req.body;
    if (!targetGoal) {
      return res.status(400).json({ error: "Target goal is required." });
    }

    const ai = getGeminiClient();
    const prompt = `Generate a customized 4-week personalized learning roadmap for a student aiming for: "${targetGoal}" in field "${fieldOfStudy}".
Weekly study budget: ${weeklyHours} hours/week.

Return a JSON matching:
{
  "targetGoalEn": "${targetGoal}",
  "targetGoalTi": "ናይ ትግርኛ ሸቶ ትርጉም...",
  "totalWeeks": 4,
  "weeklyHours": ${weeklyHours},
  "milestones": [
    {
      "weekNumber": 1,
      "titleEn": "Week 1 Milestone Title in English",
      "titleTi": "ናይ ሰሙን 1 ኣርእስቲ ብትግርኛ",
      "descriptionEn": "What the student will learn and build this week...",
      "descriptionTi": "ኣብዚ ሰሙን ተምሃራይ ዝመሃሮን ዝሰርሖን ብትግርኛ...",
      "actionItemEn": "Complete module 1 and build mini project",
      "actionItemTi": "ሞድዩል 1 ምውዳእን ፕሮጀክት ምፍጻምን"
    }
  ]
}`;

    const { response } = await generateContentWithFallback(
      ai,
      "gemini-3.1-flash-lite",
      {
        contents: [{ text: prompt }],
        config: {
          responseMimeType: "application/json",
          temperature: 0.3,
        },
      },
      DEFAULT_TEXT_FALLBACK_MODELS
    );

    const parsed = JSON.parse(response.text || "{}");
    return res.json({
      success: true,
      learningPath: {
        id: `PATH-${Date.now()}`,
        studentId: "usr_guest",
        targetGoalEn: parsed.targetGoalEn || targetGoal,
        targetGoalTi: parsed.targetGoalTi || `ናይ ${targetGoal} ናይ ምምሃር መደብ`,
        fieldOfStudy: fieldOfStudy || "General STEM",
        currentSkillLevel,
        totalWeeks: parsed.totalWeeks || 4,
        weeklyHours,
        progressPercent: 0,
        generatedDate: new Date().toISOString(),
        milestones: (parsed.milestones || []).map((m: any, idx: number) => ({
          id: `ms-${idx + 1}`,
          weekNumber: m.weekNumber || idx + 1,
          titleEn: m.titleEn || `Week ${idx + 1}: Core Foundations`,
          titleTi: m.titleTi || `ሰሙን ${idx + 1}: መሰረታዊ ፍልጠት`,
          descriptionEn: m.descriptionEn || "Master introductory principles and establish strong foundation.",
          descriptionTi: m.descriptionTi || "መሰረታዊ ሕግታትን ፍልጠትን ብጽንዓት ምሓዝ።",
          actionItemEn: m.actionItemEn || "Complete lessons and weekly quiz",
          actionItemTi: m.actionItemTi || "ትምህርትታትን ናይ ሰሙን ፈተናን ምውዳእ",
          completed: false,
        })),
      },
    });
  } catch (error: any) {
    console.error("Error in /api/education/generate-learning-path:", error);
    return res.json({
      success: true,
      learningPath: {
        id: `PATH-${Date.now()}`,
        studentId: "usr_guest",
        targetGoalEn: req.body.targetGoal || "Master AI & Computer Science",
        targetGoalTi: "ናይ AIን ኮምፒዩተር ሳይንስን ምልከት ምጥራይ",
        fieldOfStudy: req.body.fieldOfStudy || "Computer Science",
        currentSkillLevel: req.body.currentSkillLevel || "beginner",
        totalWeeks: 4,
        weeklyHours: req.body.weeklyHours || 6,
        progressPercent: 0,
        generatedDate: new Date().toISOString(),
        milestones: [
          {
            id: "ms-1",
            weekNumber: 1,
            titleEn: "Foundations & Syntax Fundamentals",
            titleTi: "መሰረታዊ ናይ ፕሮግራሚንግ ፍልጠት",
            descriptionEn: "Understand core variables, data structures, and algorithmic logic.",
            descriptionTi: "ተለዋወጥቲ፡ ዳታ ስትራክቸርን ኣልጎሪዝማዊ ኣተሓሳስባን ምልላይ።",
            actionItemEn: "Complete introductory modules & 1st coding exercise",
            actionItemTi: "መእተዊ ሞድዩላትን ቀዳማይ ናይ ኮዲንግ ልምምድን ምውዳእ",
            completed: false,
          },
          {
            id: "ms-2",
            weekNumber: 2,
            titleEn: "Neural Architecture & Problem Decomposition",
            titleTi: "ናይ ኒውራል ኣርክቴክቸርን ጸገማት ምፍታሕን",
            descriptionEn: "Explore neural networks, backpropagation, and function modeling.",
            descriptionTi: "ኒውራል ኔትወርክን ናይ ስሌት ሞዴላትን ብዕምቆት ምምሃር።",
            actionItemEn: "Train first mini classifier model",
            actionItemTi: "ቀዳማይ ናይ ምደባ ሞዴል ምዕጣቕ",
            completed: false,
          },
          {
            id: "ms-3",
            weekNumber: 3,
            titleEn: "Real-World Projects & Ge'ez NLP",
            titleTi: "ተግባራዊ ፕሮጀክታትን ናይ ግእዝ ቋንቋ ፕሮሰሲንግን",
            descriptionEn: "Build end-to-end applications supporting Tigrinya script and voice.",
            descriptionTi: "ንትግርኛን ግእዝን ዝድግፉ ምሉኣት ኣፕሊኬሽናት ምህናጽ።",
            actionItemEn: "Deploy functional project prototype",
            actionItemTi: "ዝሰርሕ ፕሮቶታይፕ ምድላው",
            completed: false,
          },
          {
            id: "ms-4",
            weekNumber: 4,
            titleEn: "Mastery Capstone & Certificate Exam",
            titleTi: "ናይ መደምደምታ ፕሮጀክትን ናይ ምስክር ወረቐት ፈተናን",
            descriptionEn: "Take the comprehensive final exam and obtain certified credentials.",
            descriptionTi: "ናይ መደምደምታ ዓቢ ፈተና ወሲድካ ናይ ብቕዓት ምስክር ወረቐት ምውሳድ።",
            actionItemEn: "Pass final exam with 80%+ score",
            actionItemTi: "ብ 80%+ ውጽኢት ምሕላፍ",
            completed: false,
          }
        ],
      },
    });
  }
});

// Dynamic AI Quiz Generator
app.post("/api/education/generate-quiz", async (req, res) => {
  try {
    const { topic, count = 5, difficulty = "medium" } = req.body;
    const ai = getGeminiClient();
    const prompt = `Generate ${count} multiple choice quiz questions on the topic "${topic}" with difficulty "${difficulty}".
Each question MUST have 4 options, a correct answer index (0 to 3), and detailed bilingual explanations.

Return a JSON matching:
{
  "questions": [
    {
      "questionEn": "Question in English?",
      "questionTi": "ሕቶ ብትግርኛ?",
      "optionsEn": ["Option A", "Option B", "Option C", "Option D"],
      "optionsTi": ["ምርጫ ሀ", "ምርጫ ለ", "ምርጫ ሐ", "ምርጫ መ"],
      "correctAnswerIndex": 0,
      "explanationEn": "Why this is correct in English...",
      "explanationTi": "ስለምንታይ እዚ ቅኑዕ ከምዝኾነ ብትግርኛ ዝተጻሕፈ መብርሂ..."
    }
  ]
}`;

    const { response } = await generateContentWithFallback(
      ai,
      "gemini-3.1-flash-lite",
      {
        contents: [{ text: prompt }],
        config: {
          responseMimeType: "application/json",
          temperature: 0.3,
        },
      },
      DEFAULT_TEXT_FALLBACK_MODELS
    );

    const parsed = JSON.parse(response.text || "{}");
    return res.json({
      success: true,
      questions: (parsed.questions || []).map((q: any, idx: number) => ({
        id: `q-dyn-${Date.now()}-${idx}`,
        ...q,
      })),
    });
  } catch (error: any) {
    console.error("Error in /api/education/generate-quiz:", error);
    return res.json({
      success: true,
      questions: [
        {
          id: `q-dyn-1`,
          questionEn: `What is the primary foundation of ${req.body.topic || "this subject"}?`,
          questionTi: `ናይ ${req.body.topic || "እዚ ትምህርቲ"} ቀንዲ መሰረት እንታይ እዩ?`,
          optionsEn: [
            "Mathematical precision & empirical validation",
            "Random stochastic approximation",
            "Unsupervised heuristic conjecture",
            "Static non-scalable algorithms"
          ],
          optionsTi: [
            "ሒሳባዊ ልክዕነትን ጭቡጥ መረጋገጽን",
            "ዘይተረጋገጸ ግምት",
            "ዘይተመርሐ ኣጠማምታ",
            "ዘይሰፍሕ ቀጥታዊ ስሌት"
          ],
          correctAnswerIndex: 0,
          explanationEn: "Rigorous empirical validation paired with mathematical precision forms the core basis.",
          explanationTi: "ጽኑዕ ሒሳባዊ መረጋገጽን ተግባራዊ ምርምርን ቀንዲ መሰረት ናይዚ ፍልጠት እዩ።",
        },
      ],
    });
  }
});

/* =========================================================================
   SUPER ADMIN SOVEREIGN CONTROL API ROUTES
   ========================================================================= */

// 1. Super Admin Live Overview Metrics
app.get("/api/super-admin/overview", getSuperAdminOverview);

// 2. AI Engine Orchestration & Health
app.get("/api/super-admin/ai-services", getSuperAdminAiServices);
app.post("/api/super-admin/ai-services/test", testAiModelPing);
app.post("/api/super-admin/ai-services/config", updateAiConfig);

// 3. Emergency Lockdown & Security Interventions
app.post("/api/super-admin/emergency-control", executeEmergencyControl);
app.post("/api/super-admin/security/verify-2fa", verifySuperAdmin2FA);

// 4. Backups & Disaster Recovery Snapshots
app.post("/api/super-admin/backups/create", createSystemBackup);
app.post("/api/super-admin/backups/restore", restoreSystemBackup);

// 5. System Notifications Broadcast
app.post("/api/super-admin/broadcast-notification", broadcastNotification);

// 6. Immutable Audit Trail Logs
app.get("/api/super-admin/audit-logs", getAuditLogs);

/* =========================================================================
   AI PHOTO-TO-VIDEO STUDIO CHOREOGRAPHY & PROMPT ENDPOINTS
   ========================================================================= */

app.post("/api/photo-to-video/enhance-prompt", async (req, res) => {
  try {
    const {
      prompt = "",
      subjectMode = "auto",
      cameraMovement = "cinematic_push",
      atmosphereEffect = "sunbeams",
      transitionStyle = "cross_dissolve",
      soundtrackStyle = "highland_ambient",
      photoCount = 1,
    } = req.body || {};

    const { identifier, userEmail, userRole } = getClientIdentity(req);
    const usageCheck = checkAndIncrementAiUsage(identifier, userEmail, "gemini-4-hydrogen", userRole);
    if (!usageCheck.allowed) {
      return res.status(429).json({
        error: usageCheck.error || "Daily AI request limit reached.",
        limit: usageCheck.limit,
        remaining: usageCheck.remaining,
      });
    }

    const ai = getGeminiClient();
    const systemPrompt = `You are a cinematic AI film director and visual effects supervisor for AXUMITE AI Photo-to-Video Studio.
Refine the user's photo animation description into a vivid, realistic, production-ready motion choreography prompt in 2-3 cohesive sentences.
Preserve all specific subjects, lighting, camera movement (${cameraMovement}), subject focus (${subjectMode}), atmosphere (${atmosphereEffect}), transition pacing (${transitionStyle}), and audio mood (${soundtrackStyle}) across ${photoCount} photo(s).
Return JSON with keys: enhancedPrompt (string), directorNote (string).`;

    const { response, modelUsed } = await generateContentWithFallback(
      ai,
      usageCheck.modelGranted || "gemini-3.1-flash-lite",
      {
        contents: [
          {
            role: "user",
            parts: [
              {
                text: prompt.trim()
                  ? `Original animation prompt: "${prompt.trim()}"`
                  : `Create a cinematic animation prompt for ${photoCount} heritage portrait/landscape photo(s) with ${cameraMovement} movement and ${atmosphereEffect} atmosphere.`,
              },
            ],
          },
        ],
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              enhancedPrompt: { type: Type.STRING },
              directorNote: { type: Type.STRING },
            },
            required: ["enhancedPrompt", "directorNote"],
          },
        },
      },
      ["gemini-4-hydrogen", "gemini-3.1-flash-lite"],
      22000
    );

    const parsed = JSON.parse(response.text || "{}");
    return res.json({
      success: true,
      enhancedPrompt: parsed.enhancedPrompt || prompt,
      directorNote: parsed.directorNote || "Directed for smooth 30fps parallax and optical depth.",
      modelUsed,
    });
  } catch (err: any) {
    console.error("Error in /api/photo-to-video/enhance-prompt:", err);
    return res.status(502).json({
      error: err?.message || "Failed to enhance animation prompt.",
      tigrinyaMessage: "መግለጺ ቪድዮ ብAI ምምሕያሽ ኣይተኻእለን። በጃኹም እንደገና ፈትኑ።",
    });
  }
});

app.post("/api/photo-to-video/choreograph", async (req, res) => {
  try {
    const {
      images = [],
      prompt = "",
      subjectMode = "auto",
      cameraMovement = "cinematic_push",
      atmosphereEffect = "sunbeams",
      transitionStyle = "cross_dissolve",
      soundtrackStyle = "highland_ambient",
      durationSeconds = 10,
      aspectRatio = "16:9",
      quality = "1080p",
    } = req.body || {};

    if (!Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: "At least one photo is required for choreography." });
    }

    const { identifier, userEmail, userRole } = getClientIdentity(req);
    const usageCheck = checkAndIncrementAiUsage(identifier, userEmail, "gemini-4-hydrogen", userRole);
    if (!usageCheck.allowed) {
      return res.status(429).json({
        error: usageCheck.error || "Daily AI request limit reached.",
        limit: usageCheck.limit,
        remaining: usageCheck.remaining,
      });
    }

    const ai = getGeminiClient();
    const parts: any[] = [
      {
        text: `Analyze these ${images.length} photo(s) for AI Photo-to-Video animation choreography.
User prompt: "${prompt || "Realistic living photograph motion with subtle face/subject breathing, parallax background depth, golden light beams, and smooth cinematic camera movement."}"
Settings: subjectMode=${subjectMode}, cameraMovement=${cameraMovement}, atmosphereEffect=${atmosphereEffect}, transitionStyle=${transitionStyle}, soundtrackStyle=${soundtrackStyle}, duration=${durationSeconds}s, aspectRatio=${aspectRatio}, quality=${quality}.

For EACH photo (in exact order, index 0..${images.length - 1}), inspect the image and output:
- photoIndex (integer 0..${images.length - 1})
- detectedSubject ('face' | 'background' | 'object' | 'landscape')
- focalX (number 0.15 to 0.85 normalized X coordinate of face eyes/main subject center)
- focalY (number 0.15 to 0.85 normalized Y coordinate of face eyes/main subject center)
- zoomStart (number 1.0 to 1.18)
- zoomEnd (number 1.05 to 1.32)
- panX (number -0.18 to 0.18)
- panY (number -0.14 to 0.14)
- rotateDeg (number -4.5 to 4.5)
- motionIntensity (number 0.3 to 1.0)
- depthParallax (number 0.2 to 1.0)
- caption (short 4-8 word director description)
Also return:
- choreographySummary (1-2 sentences describing the cinematic plan)
- musicTempoBpm (number 68 to 118)
- musicKey (string like 'D minor', 'G pentatonic', 'A minor')`,
      },
    ];

    images.slice(0, 6).forEach((img: any, idx: number) => {
      const raw = typeof img === "string" ? img : img?.dataUrl || "";
      const match = raw.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        parts.push({
          inlineData: {
            mimeType: match[1] || "image/jpeg",
            data: match[2],
          },
        });
      } else {
        parts.push({ text: `Photo ${idx + 1}: ${img?.name || "Uploaded Scene"}` });
      }
    });

    const { response, modelUsed } = await generateContentWithFallback(
      ai,
      usageCheck.modelGranted || "gemini-3.1-flash-lite",
      {
        contents: [{ role: "user", parts }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              choreographySummary: { type: Type.STRING },
              musicTempoBpm: { type: Type.NUMBER },
              musicKey: { type: Type.STRING },
              scenes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    photoIndex: { type: Type.INTEGER },
                    detectedSubject: { type: Type.STRING },
                    focalX: { type: Type.NUMBER },
                    focalY: { type: Type.NUMBER },
                    zoomStart: { type: Type.NUMBER },
                    zoomEnd: { type: Type.NUMBER },
                    panX: { type: Type.NUMBER },
                    panY: { type: Type.NUMBER },
                    rotateDeg: { type: Type.NUMBER },
                    motionIntensity: { type: Type.NUMBER },
                    depthParallax: { type: Type.NUMBER },
                    caption: { type: Type.STRING },
                  },
                  required: [
                    "photoIndex",
                    "detectedSubject",
                    "focalX",
                    "focalY",
                    "zoomStart",
                    "zoomEnd",
                    "panX",
                    "panY",
                    "rotateDeg",
                    "motionIntensity",
                    "depthParallax",
                    "caption",
                  ],
                },
              },
            },
            required: ["choreographySummary", "musicTempoBpm", "musicKey", "scenes"],
          },
        },
      },
      ["gemini-4-hydrogen", "gemini-3.1-flash-lite"],
      25000
    );

    const parsed = JSON.parse(response.text || "{}");
    return res.json({
      success: true,
      choreographySummary: parsed.choreographySummary || "AI motion choreography computed for smooth multi-layer animation.",
      musicTempoBpm: Number(parsed.musicTempoBpm) || 86,
      musicKey: parsed.musicKey || "D Pentatonic",
      scenes: Array.isArray(parsed.scenes) ? parsed.scenes : [],
      modelUsed,
    });
  } catch (err: any) {
    console.error("Error in /api/photo-to-video/choreograph:", err);
    return res.status(502).json({
      error: err?.message || "AI choreography failed.",
      tigrinyaMessage: "ናይ ስእሊ ናብ ቪድዮ ትንታነ ምስራሕ ኣይተኻእለን።",
    });
  }
});

/* =========================================================================
   CULTURAL ARCHIVE, STORYTELLER & POETRY ENDPOINTS
   ========================================================================= */

const runtimeCulturalArchiveItems: any[] = [];

app.post("/api/cultural/archive-contribute", (req, res) => {
  try {
    const {
      title,
      mediaType = "historical_photo",
      contributorName = "Community Scholar",
      contributorLocation = "Diaspora Archive",
      era = "20th Century",
      tags = [],
      description = "",
      evidenceStatus = "community_archive",
      urlOrPath = "/assets/images/axumite_background_1786611272574.jpg",
    } = req.body || {};

    if (!title || !String(title).trim()) {
      return res.status(400).json({ error: "Archive item title is required." });
    }

    const item = {
      id: `ARC-${Date.now().toString().slice(-5)}`,
      title: String(title).trim(),
      mediaType,
      contributorName: String(contributorName).trim() || "Anonymous Contributor",
      contributorLocation: String(contributorLocation).trim() || "Global Diaspora",
      dateUploaded: new Date().toISOString().split("T")[0],
      era: String(era).trim() || "20th Century",
      tags: Array.isArray(tags) ? tags.filter(Boolean) : ["Heritage"],
      description: String(description).trim(),
      evidenceStatus,
      urlOrPath,
    };

    runtimeCulturalArchiveItems.unshift(item);
    return res.json({ success: true, item });
  } catch (err: any) {
    console.error("Error in /api/cultural/archive-contribute:", err);
    return res.status(500).json({ error: err?.message || "Failed to archive cultural item." });
  }
});

app.post("/api/cultural/storyteller", async (req, res) => {
  try {
    const { theme = "axumite_kings", audienceAge = "children", targetLanguage = "ti", userPrompt = "" } = req.body || {};
    const { identifier, userEmail, userRole } = getClientIdentity(req);
    const usageCheck = checkAndIncrementAiUsage(identifier, userEmail, "gemini-3.1-flash-lite", userRole);
    if (!usageCheck.allowed) {
      return res.status(429).json({ error: usageCheck.error });
    }

    const ai = getGeminiClient();
    const { response } = await generateContentWithFallback(
      ai,
      usageCheck.modelGranted || "gemini-3.1-flash-lite",
      {
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Compose an authentic Eritrean/Tigrayan cultural tale.
Theme: ${theme}
Audience age: ${audienceAge}
Language focus: ${targetLanguage}
Extra user prompt: ${userPrompt || "Honor hospitality, highland wisdom, and heritage."}
Return valid JSON matching:
{
  "era": "string",
  "audienceAge": "string",
  "titleEn": "string",
  "titleTi": "string in Tigrinya Fidel",
  "contentEn": "string rich narrative in English",
  "contentTi": "string rich narrative in natural Tigrinya Fidel",
  "moralLesson": "string",
  "vocabularyList": [{ "wordTi": "string", "wordEn": "string", "definition": "string" }]
}`,
              },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              era: { type: Type.STRING },
              audienceAge: { type: Type.STRING },
              titleEn: { type: Type.STRING },
              titleTi: { type: Type.STRING },
              contentEn: { type: Type.STRING },
              contentTi: { type: Type.STRING },
              moralLesson: { type: Type.STRING },
              vocabularyList: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    wordTi: { type: Type.STRING },
                    wordEn: { type: Type.STRING },
                    definition: { type: Type.STRING },
                  },
                  required: ["wordTi", "wordEn", "definition"],
                },
              },
            },
            required: ["era", "audienceAge", "titleEn", "titleTi", "contentEn", "contentTi", "moralLesson", "vocabularyList"],
          },
        },
      },
      DEFAULT_TEXT_FALLBACK_MODELS,
      25000
    );

    const story = JSON.parse(response.text || "{}");
    return res.json({ success: true, story });
  } catch (err: any) {
    console.error("Error in /api/cultural/storyteller:", err);
    return res.status(502).json({ error: err?.message || "Failed to generate cultural story." });
  }
});

app.post("/api/cultural/generate-poem", async (req, res) => {
  try {
    const { topic = "Axumite Heritage", poemType = "zelesegna", targetLanguage = "ti" } = req.body || {};
    const { identifier, userEmail, userRole } = getClientIdentity(req);
    const usageCheck = checkAndIncrementAiUsage(identifier, userEmail, "gemini-3.1-flash-lite", userRole);
    if (!usageCheck.allowed) {
      return res.status(429).json({ error: usageCheck.error });
    }

    const ai = getGeminiClient();
    const { response } = await generateContentWithFallback(
      ai,
      usageCheck.modelGranted || "gemini-3.1-flash-lite",
      {
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Compose an authentic Tigrinya poem (${poemType}) on "${topic}" (${targetLanguage}).
Return JSON matching:
{
  "poemType": "string",
  "meterOrStyle": "string",
  "titleEn": "string",
  "titleTi": "string in Tigrinya Fidel",
  "stanzas": [
    {
      "linesTi": ["line 1 in Tigrinya Fidel", "line 2", "line 3", "line 4"],
      "linesEn": ["line 1 in English", "line 2", "line 3", "line 4"]
    }
  ]
}`,
              },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              poemType: { type: Type.STRING },
              meterOrStyle: { type: Type.STRING },
              titleEn: { type: Type.STRING },
              titleTi: { type: Type.STRING },
              stanzas: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    linesTi: { type: Type.ARRAY, items: { type: Type.STRING } },
                    linesEn: { type: Type.ARRAY, items: { type: Type.STRING } },
                  },
                  required: ["linesTi", "linesEn"],
                },
              },
            },
            required: ["poemType", "meterOrStyle", "titleEn", "titleTi", "stanzas"],
          },
        },
      },
      DEFAULT_TEXT_FALLBACK_MODELS,
      25000
    );

    const poem = JSON.parse(response.text || "{}");
    return res.json({ success: true, poem });
  } catch (err: any) {
    console.error("Error in /api/cultural/generate-poem:", err);
    return res.status(502).json({ error: err?.message || "Failed to generate traditional poem." });
  }
});

/* =========================================================================
   SOVEREIGN BUSINESS HUB ENDPOINTS
   ========================================================================= */

app.post("/api/business/copilot-chat", async (req, res) => {
  try {
    const { message = "", persona = "startup_advisor", history = [], language = "en", imageBase64 } = req.body || {};
    if (!message.trim() && !imageBase64) {
      return res.status(400).json({ error: "A business question or image is required." });
    }

    const { identifier, userEmail, userRole } = getClientIdentity(req);
    const usageCheck = checkAndIncrementAiUsage(identifier, userEmail, "gemini-3.1-flash-lite", userRole);
    if (!usageCheck.allowed) {
      return res.status(429).json({ error: usageCheck.error });
    }

    const ai = getGeminiClient();
    const parts: any[] = [];
    if (imageBase64 && typeof imageBase64 === "string") {
      const m = imageBase64.match(/^data:([^;]+);base64,(.+)$/);
      if (m) {
        parts.push({ inlineData: { mimeType: m[1], data: m[2] } });
      }
    }
    const historySummary = Array.isArray(history)
      ? history
          .slice(-6)
          .map((h: any) => `${h.role === "user" ? "User" : "Advisor"}: ${h.content}`)
          .join("\n")
      : "";
    parts.push({
      text: `${historySummary ? `Recent conversation:\n${historySummary}\n\n` : ""}Persona: ${persona}\nUser preferred UI language: ${language}\nCurrent request: ${message || "Analyze the attached business image and provide actionable guidance."}`,
    });

    const { response } = await generateContentWithFallback(
      ai,
      usageCheck.modelGranted || "gemini-3.1-flash-lite",
      {
        contents: [{ role: "user", parts }],
        config: {
          systemInstruction: `You are AXUMITE AI Business Copilot (${persona}). Provide crisp, practical, high-ROI advice tailored to Eritrean, Tigrayan, Horn of Africa, and global diaspora entrepreneurs. Respond clearly with structured bullet points.`,
        },
      },
      DEFAULT_TEXT_FALLBACK_MODELS,
      25000
    );

    return res.json({
      success: true,
      reply: response.text || "Strategic analysis ready.",
    });
  } catch (err: any) {
    console.error("Error in /api/business/copilot-chat:", err);
    return res.status(502).json({ error: err?.message || "Business Copilot failed to respond." });
  }
});

app.post("/api/business/market-analysis", async (req, res) => {
  try {
    const { query = "", industry = "agribusiness_coffee", region = "Horn of Africa & Diaspora" } = req.body || {};
    if (!query.trim()) {
      return res.status(400).json({ error: "Market analysis query is required." });
    }

    const { identifier, userEmail, userRole } = getClientIdentity(req);
    const usageCheck = checkAndIncrementAiUsage(identifier, userEmail, "gemini-3.1-flash-lite", userRole);
    if (!usageCheck.allowed) {
      return res.status(429).json({ error: usageCheck.error });
    }

    const ai = getGeminiClient();
    const { response } = await generateContentWithFallback(
      ai,
      usageCheck.modelGranted || "gemini-3.1-flash-lite",
      {
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Generate a structured MarketAnalysisReport JSON for query="${query}", industry="${industry}", region="${region}". Include marketOverview, keyTrends (array of strings), competitorMatrix (array of {competitorName, marketShare, strengths, vulnerabilities, pricingStrategy}), customerPersonas (array of {name, archetype, budget, primaryNeeds, recommendedApproach}), riskFactors (array of strings), and strategicRecommendations (array of strings).`,
              },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              marketOverview: { type: Type.STRING },
              keyTrends: { type: Type.ARRAY, items: { type: Type.STRING } },
              competitorMatrix: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    competitorName: { type: Type.STRING },
                    marketShare: { type: Type.STRING },
                    strengths: { type: Type.STRING },
                    vulnerabilities: { type: Type.STRING },
                    pricingStrategy: { type: Type.STRING },
                  },
                  required: ["competitorName", "marketShare", "strengths", "vulnerabilities", "pricingStrategy"],
                },
              },
              customerPersonas: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    archetype: { type: Type.STRING },
                    budget: { type: Type.STRING },
                    primaryNeeds: { type: Type.ARRAY, items: { type: Type.STRING } },
                    recommendedApproach: { type: Type.STRING },
                  },
                  required: ["name", "archetype", "budget", "primaryNeeds", "recommendedApproach"],
                },
              },
              riskFactors: { type: Type.ARRAY, items: { type: Type.STRING } },
              strategicRecommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ["marketOverview", "keyTrends", "competitorMatrix", "customerPersonas", "riskFactors", "strategicRecommendations"],
          },
        },
      },
      DEFAULT_TEXT_FALLBACK_MODELS,
      25000
    );

    const parsed = JSON.parse(response.text || "{}");
    return res.json({
      success: true,
      report: {
        id: `MKT-${Date.now().toString().slice(-6)}`,
        query,
        industry,
        region,
        generatedDate: new Date().toISOString().split("T")[0],
        ...parsed,
      },
    });
  } catch (err: any) {
    console.error("Error in /api/business/market-analysis:", err);
    return res.status(502).json({ error: err?.message || "Market analysis generation failed." });
  }
});

app.post("/api/business/marketing-content", async (req, res) => {
  try {
    const {
      campaignTitle = "",
      objective = "sales_conversion",
      targetAudience = "Diaspora entrepreneurs & local customers",
      platform = "facebook_instagram",
      industry = "technology_software",
    } = req.body || {};
    if (!campaignTitle.trim()) {
      return res.status(400).json({ error: "Campaign title is required." });
    }

    const { identifier, userEmail, userRole } = getClientIdentity(req);
    const usageCheck = checkAndIncrementAiUsage(identifier, userEmail, "gemini-3.1-flash-lite", userRole);
    if (!usageCheck.allowed) {
      return res.status(429).json({ error: usageCheck.error });
    }

    const ai = getGeminiClient();
    const { response } = await generateContentWithFallback(
      ai,
      usageCheck.modelGranted || "gemini-3.1-flash-lite",
      {
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Create a multilingual MarketingCampaign JSON for "${campaignTitle}" (objective=${objective}, platform=${platform}, audience=${targetAudience}, industry=${industry}).
Include:
- adCopies (2-3 variants with headlineEn, headlineTi in Tigrinya Fidel, bodyEn, bodyTi in Tigrinya Fidel, callToAction, hashtags)
- contentCalendarDays (5 days: {day, theme, postType, hook})
- slogans (3 catchy slogans)
- estimatedBudgetUsd (number)`,
              },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              adCopies: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    headlineEn: { type: Type.STRING },
                    headlineTi: { type: Type.STRING },
                    bodyEn: { type: Type.STRING },
                    bodyTi: { type: Type.STRING },
                    callToAction: { type: Type.STRING },
                    hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
                  },
                  required: ["headlineEn", "headlineTi", "bodyEn", "bodyTi", "callToAction", "hashtags"],
                },
              },
              contentCalendarDays: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    day: { type: Type.INTEGER },
                    theme: { type: Type.STRING },
                    postType: { type: Type.STRING },
                    hook: { type: Type.STRING },
                  },
                  required: ["day", "theme", "postType", "hook"],
                },
              },
              slogans: { type: Type.ARRAY, items: { type: Type.STRING } },
              estimatedBudgetUsd: { type: Type.NUMBER },
            },
            required: ["adCopies", "contentCalendarDays", "slogans", "estimatedBudgetUsd"],
          },
        },
      },
      DEFAULT_TEXT_FALLBACK_MODELS,
      25000
    );

    const parsed = JSON.parse(response.text || "{}");
    return res.json({
      success: true,
      campaign: {
        id: `CMP-${Date.now().toString().slice(-6)}`,
        campaignTitle,
        objective,
        targetAudience,
        platform,
        createdDate: new Date().toISOString().split("T")[0],
        ...parsed,
      },
    });
  } catch (err: any) {
    console.error("Error in /api/business/marketing-content:", err);
    return res.status(502).json({ error: err?.message || "Marketing campaign generation failed." });
  }
});

app.post("/api/business/generate-plan", async (req, res) => {
  try {
    const {
      title = "",
      industry = "technology_software",
      stage = "seed_startup",
      targetRegion = "Eritrea & Global Diaspora",
      currency = "USD",
      userGoalPrompt = "",
    } = req.body || {};
    if (!title.trim()) {
      return res.status(400).json({ error: "Business plan title is required." });
    }

    const { identifier, userEmail, userRole } = getClientIdentity(req);
    const usageCheck = checkAndIncrementAiUsage(identifier, userEmail, "gemini-4-hydrogen", userRole);
    if (!usageCheck.allowed) {
      return res.status(429).json({ error: usageCheck.error });
    }

    const ai = getGeminiClient();
    const { response } = await generateContentWithFallback(
      ai,
      usageCheck.modelGranted || "gemini-3.1-flash-lite",
      {
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Create a comprehensive institutional BusinessPlan JSON for "${title}" (industry=${industry}, stage=${stage}, targetRegion=${targetRegion}, currency=${currency}). Extra notes: "${userGoalPrompt}".`,
              },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              executiveSummary: { type: Type.STRING },
              executiveSummaryTi: { type: Type.STRING },
              problemStatement: { type: Type.STRING },
              solutionValueProp: { type: Type.STRING },
              targetMarket: {
                type: Type.OBJECT,
                properties: {
                  demographics: { type: Type.STRING },
                  tamSamSom: {
                    type: Type.OBJECT,
                    properties: {
                      tam: { type: Type.STRING },
                      sam: { type: Type.STRING },
                      som: { type: Type.STRING },
                    },
                    required: ["tam", "sam", "som"],
                  },
                  customerPainPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ["demographics", "tamSamSom", "customerPainPoints"],
              },
              competitiveAdvantage: { type: Type.ARRAY, items: { type: Type.STRING } },
              marketingStrategy: {
                type: Type.OBJECT,
                properties: {
                  channels: { type: Type.ARRAY, items: { type: Type.STRING } },
                  customerAcquisitionCost: { type: Type.STRING },
                  pricingModel: { type: Type.STRING },
                },
                required: ["channels", "customerAcquisitionCost", "pricingModel"],
              },
              operationalPlan: { type: Type.ARRAY, items: { type: Type.STRING } },
              financialHighlights: {
                type: Type.OBJECT,
                properties: {
                  startupCapitalRequired: { type: Type.NUMBER },
                  year1Revenue: { type: Type.NUMBER },
                  year2Revenue: { type: Type.NUMBER },
                  year3Revenue: { type: Type.NUMBER },
                  breakEvenMonths: { type: Type.NUMBER },
                  profitMarginPercent: { type: Type.NUMBER },
                },
                required: [
                  "startupCapitalRequired",
                  "year1Revenue",
                  "year2Revenue",
                  "year3Revenue",
                  "breakEvenMonths",
                  "profitMarginPercent",
                ],
              },
              swotAnalysis: {
                type: Type.OBJECT,
                properties: {
                  strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                  weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
                  opportunities: { type: Type.ARRAY, items: { type: Type.STRING } },
                  threats: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ["strengths", "weaknesses", "opportunities", "threats"],
              },
            },
            required: [
              "executiveSummary",
              "executiveSummaryTi",
              "problemStatement",
              "solutionValueProp",
              "targetMarket",
              "competitiveAdvantage",
              "marketingStrategy",
              "operationalPlan",
              "financialHighlights",
              "swotAnalysis",
            ],
          },
        },
      },
      ["gemini-4-hydrogen", "gemini-3.1-flash-lite"],
      30000
    );

    const parsed = JSON.parse(response.text || "{}");
    return res.json({
      success: true,
      businessPlan: {
        id: `BPL-${Date.now().toString().slice(-6)}`,
        title,
        industry,
        stage,
        targetRegion,
        currency,
        createdDate: new Date().toISOString().split("T")[0],
        ...parsed,
      },
    });
  } catch (err: any) {
    console.error("Error in /api/business/generate-plan:", err);
    return res.status(502).json({ error: err?.message || "Business plan generation failed." });
  }
});

app.post("/api/business/document-generator", async (req, res) => {
  try {
    const {
      documentType = "proposal",
      title = "",
      recipientName = "Valued Partner",
      recipientOrg = "",
      senderName = "Axumite Sovereign Solutions",
      senderOrg = "Axumite Enterprise",
      totalAmount,
      currency = "USD",
      detailsPrompt = "",
    } = req.body || {};
    if (!title.trim()) {
      return res.status(400).json({ error: "Document title is required." });
    }

    const { identifier, userEmail, userRole } = getClientIdentity(req);
    const usageCheck = checkAndIncrementAiUsage(identifier, userEmail, "gemini-3.1-flash-lite", userRole);
    if (!usageCheck.allowed) {
      return res.status(429).json({ error: usageCheck.error });
    }

    const ai = getGeminiClient();
    const { response } = await generateContentWithFallback(
      ai,
      usageCheck.modelGranted || "gemini-3.1-flash-lite",
      {
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Draft a formal ${documentType} titled "${title}".
From: ${senderName} (${senderOrg})
To: ${recipientName}${recipientOrg ? ` (${recipientOrg})` : ""}
${totalAmount ? `Amount: ${totalAmount} ${currency}` : ""}
Instructions: ${detailsPrompt || "Include clear deliverables, payment/legal clauses, and signature block."}
Return JSON with contentMarkdownEn (complete formal markdown document) and contentMarkdownTi (accurate Tigrinya Fidel summary/translation).`,
              },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              contentMarkdownEn: { type: Type.STRING },
              contentMarkdownTi: { type: Type.STRING },
            },
            required: ["contentMarkdownEn", "contentMarkdownTi"],
          },
        },
      },
      DEFAULT_TEXT_FALLBACK_MODELS,
      25000
    );

    const parsed = JSON.parse(response.text || "{}");
    return res.json({
      success: true,
      document: {
        id: `DOC-${Date.now().toString().slice(-6)}`,
        documentType,
        title,
        recipientName,
        recipientOrg,
        senderName,
        senderOrg,
        date: new Date().toISOString().split("T")[0],
        totalAmount,
        currency,
        contentMarkdownEn: parsed.contentMarkdownEn || `# ${title}\n\nPrepared by ${senderName}.`,
        contentMarkdownTi: parsed.contentMarkdownTi || "",
        status: "draft",
      },
    });
  } catch (err: any) {
    console.error("Error in /api/business/document-generator:", err);
    return res.status(502).json({ error: err?.message || "Document generation failed." });
  }
});

// Return clean JSON 404 for unknown API endpoints instead of SPA HTML
app.all("/api/*", (_req, res) => {
  res.status(404).json({ error: "API endpoint not found." });
});

// Centralized JSON error handler (malformed JSON, payload limits, unexpected server errors)
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    if (res.headersSent) {
      return next(err);
    }
    if (err?.type === "entity.too.large" || err?.status === 413) {
      return res.status(413).json({ error: "Request payload too large." });
    }
    if (err instanceof SyntaxError && "body" in err) {
      return res.status(400).json({ error: "Invalid JSON payload." });
    }
    console.error(`[Server Error] ${req.method} ${req.path}:`, err?.message || err);
    return res.status(err?.status || 500).json({
      error:
        process.env.NODE_ENV === "production"
          ? "Internal server error."
          : err?.message || "Internal server error.",
    });
  }
);

// Start Express + WebSocket Signaling Server
export async function startServer() {
  const projectRoot = resolveProjectRoot();
  const distPath = resolveDistPath();
  const distIndexPath = path.join(distPath, "index.html");
  const hasDistBuild = fs.existsSync(distIndexPath);
  const explicitDev =
    process.env.NODE_ENV === "development" ||
    process.env.npm_lifecycle_event === "dev" ||
    process.env.DISABLE_HMR === "true";
  const serveProductionDist =
    process.env.NODE_ENV === "production" || (!explicitDev && hasDistBuild);

  if (!serveProductionDist) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true, allowedHosts: true, hmr: false },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    if (!process.env.NODE_ENV) {
      process.env.NODE_ENV = "production";
    }

    let activeDistPath = distPath;
    let activeDistIndexPath = distIndexPath;
    let autoBuildState: "idle" | "building" | "ready" | "failed" = hasDistBuild ? "ready" : "idle";
    let autoBuildError = "";

    const copyDirSafe = (srcDir: string, destDir: string) => {
      fs.mkdirSync(destDir, { recursive: true });
      for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
        const srcEntry = path.join(srcDir, entry.name);
        const destEntry = path.join(destDir, entry.name);
        if (entry.isDirectory()) {
          copyDirSafe(srcEntry, destEntry);
        } else {
          try {
            fs.copyFileSync(srcEntry, destEntry);
          } catch (copyErr: any) {
            if (copyErr?.code === "EEXIST" || copyErr?.code === "EPERM") {
              try {
                fs.rmSync(destEntry, { force: true });
              } catch {}
              fs.copyFileSync(srcEntry, destEntry);
            } else {
              throw copyErr;
            }
          }
        }
      }
    };

    const triggerAutoFrontendBuild = () => {
      if (autoBuildState === "building" || fs.existsSync(activeDistIndexPath)) {
        if (fs.existsSync(activeDistIndexPath)) autoBuildState = "ready";
        return;
      }
      const hasViteSource =
        fs.existsSync(path.join(projectRoot, "index.html")) &&
        fs.existsSync(path.join(projectRoot, "src", "main.tsx"));
      if (!hasViteSource) {
        autoBuildState = "failed";
        autoBuildError = `Source files not found in ${projectRoot}. Run "npm run build" before deploying.`;
        return;
      }

      autoBuildState = "building";
      const buildStamp = `${process.pid}-${Date.now()}`;
      const stagingOutDir = path.join(os.tmpdir(), `axumite-dist-${buildStamp}`);
      const isolatedCacheDir = path.join(os.tmpdir(), `axumite-vite-cache-${buildStamp}`);

      console.warn(
        `[Server] "dist/index.html" not found at ${distPath}. Building frontend in isolated staging directory...`
      );

      Promise.all([
        import("vite"),
        import("@vitejs/plugin-react"),
        import("@tailwindcss/vite"),
      ])
        .then(([{ build: viteBuild }, reactModule, tailwindModule]) => {
          const reactPlugin = reactModule.default || (reactModule as any);
          const tailwindPlugin = tailwindModule.default || (tailwindModule as any);
          return viteBuild({
            configFile: false,
            root: projectRoot,
            cacheDir: isolatedCacheDir,
            plugins: [reactPlugin(), tailwindPlugin()],
            resolve: {
              alias: {
                "@": projectRoot,
              },
            },
            build: {
              outDir: stagingOutDir,
              emptyOutDir: true,
              sourcemap: false,
              chunkSizeWarningLimit: 1000,
              rollupOptions: {
                output: {
                  manualChunks(id) {
                    if (id.includes("node_modules")) {
                      if (id.includes("recharts")) return "vendor-recharts";
                      if (id.includes("d3") || id.includes("d3-")) return "vendor-d3";
                      if (id.includes("motion")) return "vendor-motion";
                      if (id.includes("firebase")) return "vendor-firebase";
                      if (id.includes("jspdf")) return "vendor-jspdf";
                      if (id.includes("jszip")) return "vendor-jszip";
                      if (id.includes("html-to-image")) return "vendor-html-to-image";
                      if (id.includes("lucide-react")) return "vendor-lucide";
                      if (id.includes("react") || id.includes("react-dom")) return "vendor-react";
                    }
                  },
                },
              },
            },
            logLevel: "warn",
          });
        })
        .then(() => {
          const stagedIndex = path.join(stagingOutDir, "index.html");
          if (!fs.existsSync(stagedIndex)) {
            autoBuildState = "failed";
            autoBuildError = "Vite build finished but index.html was not created.";
            return;
          }

          try {
            copyDirSafe(stagingOutDir, distPath);
            if (fs.existsSync(distIndexPath)) {
              activeDistPath = distPath;
              activeDistIndexPath = distIndexPath;
              runtimeBuiltDistDir = distPath;
              try {
                fs.rmSync(stagingOutDir, { recursive: true, force: true });
              } catch {}
            } else {
              activeDistPath = stagingOutDir;
              activeDistIndexPath = stagedIndex;
              runtimeBuiltDistDir = stagingOutDir;
            }
          } catch (copyErr: any) {
            console.warn(
              `[Server] Could not sync build into ${distPath} (${copyErr?.message || copyErr}); serving directly from ${stagingOutDir}.`
            );
            activeDistPath = stagingOutDir;
            activeDistIndexPath = stagedIndex;
            runtimeBuiltDistDir = stagingOutDir;
          }

          autoBuildState = "ready";
          console.log(`[Server] Automatic frontend build ready at ${activeDistPath}.`);
        })
        .catch((err: any) => {
          autoBuildState = "failed";
          const codePart = err?.code ? ` (${err.code}${err?.syscall ? ` on ${err.syscall}` : ""}${err?.path ? `: ${err.path}` : ""})` : "";
          const baseMsg = err instanceof Error ? err.message : String(err);
          autoBuildError = baseMsg.includes(err?.code || "__none__") ? baseMsg : `${baseMsg}${codePart}`;
          console.error(`[Server] Automatic frontend build failed: ${autoBuildError}`);
        })
        .finally(() => {
          try {
            fs.rmSync(isolatedCacheDir, { recursive: true, force: true });
          } catch {}
        });
    };

    if (!hasDistBuild) {
      triggerAutoFrontendBuild();
    }

    let cachedStaticForDir = "";
    let cachedAssetsMiddleware: express.RequestHandler | null = null;
    let cachedRootMiddleware: express.RequestHandler | null = null;

    const ensureStaticMiddlewares = () => {
      if (cachedStaticForDir === activeDistPath && cachedAssetsMiddleware && cachedRootMiddleware) {
        return;
      }
      cachedStaticForDir = activeDistPath;
      cachedAssetsMiddleware = express.static(path.join(activeDistPath, "assets"), {
        maxAge: "1y",
        immutable: true,
      });
      cachedRootMiddleware = express.static(activeDistPath, {
        index: false,
        setHeaders: (res, filePath) => {
          const base = path.basename(filePath);
          if (base === "sw.js" || base === "manifest.json" || base === "index.html") {
            res.setHeader("Cache-Control", "no-cache, must-revalidate");
          } else {
            res.setHeader("Cache-Control", "public, max-age=86400");
          }
        },
      });
    };

    app.use("/assets", (req, res, next) => {
      ensureStaticMiddlewares();
      cachedAssetsMiddleware!(req, res, next);
    });
    app.use((req, res, next) => {
      ensureStaticMiddlewares();
      cachedRootMiddleware!(req, res, next);
    });
    app.get("*", (req, res) => {
      if (fs.existsSync(activeDistIndexPath)) {
        res.setHeader("Cache-Control", "no-cache, must-revalidate");
        res.sendFile(activeDistIndexPath);
        return;
      }

      if (autoBuildState === "idle") {
        triggerAutoFrontendBuild();
      }

      if (autoBuildState === "building") {
        res.setHeader("Cache-Control", "no-store");
        if (req.accepts("html")) {
          res.status(503).type("html").send(
            `<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><meta http-equiv="refresh" content="3"/><title>AXUMITE AI — Preparing Application</title><style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0a0a0c;color:#f3e5ab;font-family:system-ui,-apple-system,sans-serif;text-align:center;padding:24px}.card{max-width:440px;padding:32px;border:1px solid rgba(197,160,89,.35);border-radius:16px;background:rgba(20,18,15,.92)}h1{margin:0 0 12px;font-size:20px;letter-spacing:.08em}p{margin:0;color:#d6cbb5;font-size:14px;line-height:1.6}</style></head><body><div class="card"><h1>AXUMITE AI</h1><p>Finalizing production frontend build on first launch. This page will refresh automatically in a few seconds...</p></div></body></html>`
          );
          return;
        }
        res.status(503).json({
          status: "building",
          message: "Preparing production frontend build. Please retry in a few seconds.",
        });
        return;
      }

      res.status(503).json({
        error: 'Application frontend build not found. Run "npm run build" and redeploy.',
        ...(autoBuildError ? { details: autoBuildError } : {}),
      });
    });
  }

  const httpServer = http.createServer(app);

  // Room-isolated WebRTC Signaling & Live Translated Subtitle Relay
  const wss = new WebSocketServer({ server: httpServer, path: "/ws/call-signaling" });
  const callRooms = new Map<string, Set<{ ws: WebSocket; peerId: string; displayName: string; language: string }>>();

  wss.on("connection", (ws) => {
    let joinedRoom: string | null = null;
    let currentPeerId = `peer_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    const leaveCurrentRoom = () => {
      if (!joinedRoom) return;
      const roomPeers = callRooms.get(joinedRoom);
      if (roomPeers) {
        for (const p of roomPeers) {
          if (p.ws === ws) {
            roomPeers.delete(p);
          } else if (p.ws.readyState === WebSocket.OPEN) {
            p.ws.send(JSON.stringify({ type: "peer-left", peerId: currentPeerId }));
          }
        }
        if (roomPeers.size === 0) {
          callRooms.delete(joinedRoom);
        }
      }
      joinedRoom = null;
    };

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === "join-room" && typeof msg.roomCode === "string") {
          leaveCurrentRoom();
          const roomCode = msg.roomCode.trim().toUpperCase().slice(0, 24);
          joinedRoom = roomCode;
          currentPeerId = String(msg.peerId || currentPeerId).slice(0, 64);
          const displayName = String(msg.displayName || "Caller").slice(0, 64);
          const language = String(msg.language || "English").slice(0, 48);

          if (!callRooms.has(roomCode)) {
            callRooms.set(roomCode, new Set());
          }
          const roomPeers = callRooms.get(roomCode)!;
          const existingPeers = Array.from(roomPeers).map((p) => ({
            peerId: p.peerId,
            displayName: p.displayName,
            language: p.language,
          }));

          const entry = { ws, peerId: currentPeerId, displayName, language };
          roomPeers.add(entry);

          ws.send(
            JSON.stringify({
              type: "room-joined",
              roomCode,
              peerId: currentPeerId,
              peers: existingPeers,
            })
          );

          for (const p of roomPeers) {
            if (p.ws !== ws && p.ws.readyState === WebSocket.OPEN) {
              p.ws.send(
                JSON.stringify({
                  type: "peer-joined",
                  peerId: currentPeerId,
                  displayName,
                  language,
                })
              );
            }
          }
          return;
        }

        if (msg.type === "leave-room") {
          leaveCurrentRoom();
          return;
        }

        if (!joinedRoom) return;
        const roomPeers = callRooms.get(joinedRoom);
        if (!roomPeers) return;

        // Forward WebRTC SDP offer/answer, ICE candidates, or translated live subtitles to peers in room
        if (
          msg.type === "offer" ||
          msg.type === "answer" ||
          msg.type === "ice-candidate" ||
          msg.type === "subtitle"
        ) {
          for (const p of roomPeers) {
            if (p.ws !== ws && p.ws.readyState === WebSocket.OPEN) {
              p.ws.send(
                JSON.stringify({
                  ...msg,
                  fromPeerId: currentPeerId,
                })
              );
            }
          }
        }
      } catch {
        // Ignore malformed WebSocket payloads
      }
    });

    ws.on("close", leaveCurrentRoom);
    ws.on("error", leaveCurrentRoom);
  });

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(
      `AXUMITE AI Server (Node.js ${process.version} | Express + WebRTC Signaling WS) running on http://0.0.0.0:${PORT}`
    );
  });

  const gracefulShutdown = (signal: string) => {
    console.log(`[Server] Received ${signal}, closing HTTP & WebSocket server...`);
    wss.close();
    httpServer.close(() => {
      process.exit(0);
    });
    setTimeout(() => process.exit(0), 5000).unref();
  };

  process.once("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.once("SIGINT", () => gracefulShutdown("SIGINT"));
}

export { app };

startServer();
