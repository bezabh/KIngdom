/**
 * AXUMITE AI - Node.js Entrypoint (server.js)
 *
 * Production & Development Node.js launcher for the Express + WebSocket server:
 * - In production (after `npm run build`), runs the compiled Node.js bundle (`dist/server.cjs`)
 *   directly without requiring TypeScript tooling at runtime.
 * - If `dist/server.cjs` is absent or `NODE_ENV=development`, boots `server.ts` directly
 *   via Node.js 22+ native TypeScript support, with an automatic `tsx` fallback for Node.js 20.
 *
 * Usage:
 *   npm run build && npm start     (runs `node server.js` in production mode)
 *   node server.js                 (auto-detects production bundle or server.ts)
 */

import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (!process.env.AXUMITE_ROOT_DIR) {
  process.env.AXUMITE_ROOT_DIR = __dirname;
}

const compiledServerPath = path.join(__dirname, "dist", "server.cjs");
const distIndexPath = path.join(__dirname, "dist", "index.html");

async function startNodeServer() {
  const explicitDev =
    process.env.NODE_ENV === "development" ||
    process.env.npm_lifecycle_event === "dev" ||
    process.env.DISABLE_HMR === "true";
  const hasCompiledBundle = fs.existsSync(compiledServerPath);
  const hasDistBuild = fs.existsSync(distIndexPath);

  if (!explicitDev && !process.env.NODE_ENV && hasDistBuild) {
    process.env.NODE_ENV = "production";
  }

  if (hasCompiledBundle && !explicitDev) {
    const require = createRequire(import.meta.url);
    require(compiledServerPath);
    return;
  }

  // Prefer Node.js 22+ native TypeScript execution so production hosts without `tsx` work cleanly
  try {
    await import("./server.ts");
    return;
  } catch (nativeErr) {
    // Fall back to `tsx` on older Node.js 20 runtimes where native `.ts` import is unavailable
    try {
      const { tsImport } = await import("tsx/esm/api");
      await tsImport("./server.ts", import.meta.url);
      return;
    } catch (tsxErr) {
      const nativeMsg = nativeErr instanceof Error ? nativeErr.message : String(nativeErr);
      const tsxMsg = tsxErr instanceof Error ? tsxErr.message : String(tsxErr);
      console.error(
        `[server.js] Unable to start Node.js server.\n` +
          `  - Native server.ts import failed: ${nativeMsg}\n` +
          `  - tsx fallback failed: ${tsxMsg}\n` +
          `Run "npm run build" first to generate dist/server.cjs, or use Node.js 22+.`
      );
      process.exit(1);
    }
  }
}

startNodeServer();
