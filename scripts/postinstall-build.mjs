/**
 * AXUMITE AI - Safe Postinstall Production Builder
 *
 * Ensures cloud hosts that skip `npm run build` for Express/Node.js apps
 * (such as Hostinger's Express preset) automatically have `dist/` (Vite SPA)
 * and `dist/server.cjs` (Express server bundle) compiled right after `npm install`.
 *
 * Safely skips in:
 * - AI Studio dev workspace (DISABLE_HMR=true)
 * - Explicit opt-out (SKIP_POSTINSTALL_BUILD=true)
 * - Docker dependency-only layers where `index.html` / `src/main.tsx` are not copied yet
 * - Repeat installs where `dist/index.html` and `dist/server.cjs` already exist
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function copyDirSafe(srcDir, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const srcEntry = path.join(srcDir, entry.name);
    const destEntry = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyDirSafe(srcEntry, destEntry);
    } else {
      try {
        fs.copyFileSync(srcEntry, destEntry);
      } catch (err) {
        if (err && (err.code === "EEXIST" || err.code === "EPERM")) {
          try {
            fs.rmSync(destEntry, { force: true });
          } catch {}
          fs.copyFileSync(srcEntry, destEntry);
        } else {
          throw err;
        }
      }
    }
  }
}

async function runPostinstallBuild() {
  if (
    process.env.DISABLE_HMR === "true" ||
    process.env.SKIP_POSTINSTALL_BUILD === "true"
  ) {
    return;
  }

  const hasSourceFiles =
    fs.existsSync(path.join(root, "index.html")) &&
    fs.existsSync(path.join(root, "src", "main.tsx")) &&
    fs.existsSync(path.join(root, "vite.config.ts"));

  if (!hasSourceFiles) {
    return;
  }

  const distDir = path.join(root, "dist");
  const distIndex = path.join(distDir, "index.html");
  const distServer = path.join(distDir, "server.cjs");

  if (fs.existsSync(distIndex) && fs.existsSync(distServer)) {
    return;
  }

  const stamp = `${process.pid}-${Date.now()}`;
  const isolatedCacheDir = path.join(os.tmpdir(), `axumite-postinstall-cache-${stamp}`);
  const stagingOutDir = path.join(os.tmpdir(), `axumite-postinstall-dist-${stamp}`);

  try {
    if (!fs.existsSync(distIndex)) {
      console.log("[postinstall] Building AXUMITE AI frontend bundle (dist/)...");
      const [{ build: viteBuild }, reactModule, tailwindModule] = await Promise.all([
        import("vite"),
        import("@vitejs/plugin-react"),
        import("@tailwindcss/vite"),
      ]);
      const reactPlugin = reactModule.default || reactModule;
      const tailwindPlugin = tailwindModule.default || tailwindModule;

      await viteBuild({
        configFile: false,
        root,
        cacheDir: isolatedCacheDir,
        plugins: [reactPlugin(), tailwindPlugin()],
        resolve: {
          alias: {
            "@": root,
          },
        },
        build: {
          outDir: stagingOutDir,
          emptyOutDir: true,
          sourcemap: false,
          chunkSizeWarningLimit: 1000,
        },
        logLevel: "warn",
      });

      copyDirSafe(stagingOutDir, distDir);
    }

    if (!fs.existsSync(distServer) && fs.existsSync(path.join(root, "server.ts"))) {
      console.log("[postinstall] Bundling AXUMITE AI server (dist/server.cjs)...");
      fs.mkdirSync(distDir, { recursive: true });
      const esbuild = await import("esbuild");
      await esbuild.build({
        entryPoints: [path.join(root, "server.ts")],
        bundle: true,
        platform: "node",
        format: "cjs",
        packages: "external",
        sourcemap: true,
        outfile: distServer,
      });
    }

    console.log("[postinstall] Production artifacts ready in dist/.");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(
      `[postinstall] Non-fatal build notice: ${message}. Run "npm run build" or allow server startup auto-build.`
    );
  } finally {
    try {
      fs.rmSync(isolatedCacheDir, { recursive: true, force: true });
      fs.rmSync(stagingOutDir, { recursive: true, force: true });
    } catch {}
  }
}

await runPostinstallBuild();
