import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const errors = [];
const warnings = [];

const check = (condition, okMsg, failMsg) => {
  if (condition) {
    console.log(`  [PASS] ${okMsg}`);
  } else {
    console.error(`  [FAIL] ${failMsg}`);
    errors.push(failMsg);
  }
};

console.log("\n=== AXUMITE AI Web Deployment Pre-Flight Verification ===\n");

// 1. Node.js Runtime
const major = Number(process.versions.node.split(".")[0]);
check(major >= 20, `Node.js ${process.version} (>=20 required)`, `Node.js >=20 required, found ${process.version}`);

// 2. Core Deployment Files
const requiredFiles = [
  "server.ts",
  "server.js",
  "Dockerfile",
  "firebase.json",
  "render.yaml",
  "railway.json",
  "firebase-applet-config.json",
  "firestore.rules",
  "dist/index.html",
  "dist/server.cjs",
  "dist/manifest.json",
  "dist/sw.js",
  "dist/robots.txt",
];

for (const rel of requiredFiles) {
  const full = path.join(root, rel);
  check(fs.existsSync(full), `Found ${rel}`, `Missing required deployment artifact: ${rel}`);
}

// 2b. Package Entrypoint & Clean Script Guard
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const mainEntry = pkg.main || "server.js";
check(
  fs.existsSync(path.join(root, mainEntry)),
  `package.json main="${mainEntry}" exists on disk`,
  `package.json main="${mainEntry}" not found`
);
const cleanScript = String(pkg.scripts?.clean || "");
check(
  !cleanScript.includes("server.js") && !cleanScript.includes("server.ts"),
  `clean script ("${cleanScript}") preserves server entrypoints`,
  `clean script ("${cleanScript}") deletes server entrypoint!`
);

// 3. PWA Manifest Verification
const manifestPath = path.join(root, "dist", "manifest.json");
if (fs.existsSync(manifestPath)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  check(
    Boolean(manifest.id && manifest.name && manifest.short_name && manifest.start_url === "/" && manifest.scope === "/"),
    `Manifest complete (name="${manifest.short_name}", display="${manifest.display}")`,
    "Manifest is missing required id, name, short_name, start_url, or scope fields"
  );
  const has192 = manifest.icons?.some((i) => i.sizes === "192x192");
  const has512 = manifest.icons?.some((i) => i.sizes === "512x512");
  const hasCombinedMaskable = manifest.icons?.some((i) => i.purpose === "any maskable");
  check(
    Boolean(has192 && has512 && !hasCombinedMaskable),
    "Manifest icons compliant (192x192, 512x512, separate purposes)",
    "Manifest icons missing 192x192/512x512 or using combined 'any maskable' purpose"
  );
}

// 4. Client Bundle Secret Leak Audit
const assetsDir = path.join(root, "dist", "assets");
const forbiddenPatterns = [
  { label: "STRIPE_SECRET_KEY", regex: /STRIPE_SECRET_KEY/ },
  { label: "STRIPE_WEBHOOK_SECRET", regex: /STRIPE_WEBHOOK_SECRET/ },
  { label: "PAYMENT_SECRET_KEY", regex: /PAYMENT_SECRET_KEY/ },
  { label: "Live/Test Stripe secret token (sk_/rk_)", regex: /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9_-]{12,}\b/ },
  { label: "Stripe webhook secret token (whsec_)", regex: /\bwhsec_[A-Za-z0-9_-]{12,}\b/ },
];
const leaked = [];
if (fs.existsSync(assetsDir)) {
  for (const file of fs.readdirSync(assetsDir)) {
    if (!file.endsWith(".js") && !file.endsWith(".css")) continue;
    const content = fs.readFileSync(path.join(assetsDir, file), "utf8");
    for (const rule of forbiddenPatterns) {
      if (rule.regex.test(content)) {
        leaked.push(`${rule.label} in dist/assets/${file}`);
      }
    }
  }
}
check(
  leaked.length === 0,
  "Client bundle audit passed (0 server secrets leaked into dist/assets)",
  `Secret leak detected in client bundle: ${leaked.join(", ")}`
);

// 5. Runtime Env Var Readiness (informational warnings only)
for (const envName of ["GEMINI_API_KEY", "STRIPE_SECRET_KEY", "STRIPE_PUBLISHABLE_KEY", "STRIPE_WEBHOOK_SECRET"]) {
  const val = (process.env[envName] || "").trim();
  if (!val || val.startsWith("MY_")) {
    warnings.push(`${envName} is not set in local env (configure in deployment host Secrets panel)`);
  }
}

if (warnings.length > 0) {
  console.log("\nEnvironment Notes:");
  for (const w of warnings) {
    console.log(`  [INFO] ${w}`);
  }
}

if (errors.length > 0) {
  console.error(`\nDeployment verification failed with ${errors.length} error(s).\n`);
  process.exit(1);
}

console.log("\nAll web deployment pre-flight checks passed.\n");
