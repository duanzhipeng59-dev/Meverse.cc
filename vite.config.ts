import vinext from "vinext";
import { defineConfig } from "vite";
import hostingConfig from "./.openai/hosting.json";
import { sites } from "./build/sites-vite-plugin";

const SITE_CREATOR_PLACEHOLDER_DATABASE_ID =
  "00000000-0000-4000-8000-000000000000";

const { d1, r2 } = hostingConfig;

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === "seatbelt";

const localBindingConfig = {
  main: "./worker/index.ts",
  compatibility_flags: ["nodejs_compat"],
  d1_databases: d1
    ? [
        {
          binding: d1,
          database_name: "site-creator-d1",
          database_id: SITE_CREATOR_PLACEHOLDER_DATABASE_ID,
          migrations_dir: "drizzle",
        },
      ]
    : [],
  r2_buckets: r2
    ? [
        {
          binding: r2,
          bucket_name: "site-creator-r2",
        },
      ]
    : [],
};

export default defineConfig(async () => {
  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= "false";
  process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
  process.env.MINIFLARE_REGISTRY_PATH ??= ".wrangler/registry";

  // Wrangler snapshots its log path while the Cloudflare plugin is imported.
  const { cloudflare } = await import("@cloudflare/vite-plugin");

  // route-css 手改直发样式:dev 的 RSC 沙箱 cwd=/bundle 读不到文件 mtime,版本参数会退化成
  // 固定 v=0 被浏览器长期缓存——开发/预览服务器对这类响应强制 no-cache,按 etag 协商,改样式即生效。
  const routeCssNoCache = {
    name: "route-css-no-cache",
    configureServer(server: { middlewares: { use: (prefix: string, fn: (req: unknown, res: { setHeader: (key: string, value: string) => void }, next: () => void) => void) => void } }) {
      server.middlewares.use("/route-css", (_req, res, next) => { res.setHeader("Cache-Control", "no-cache"); next(); });
    },
    configurePreviewServer(server: { middlewares: { use: (prefix: string, fn: (req: unknown, res: { setHeader: (key: string, value: string) => void }, next: () => void) => void) => void } }) {
      server.middlewares.use("/route-css", (_req, res, next) => { res.setHeader("Cache-Control", "no-cache"); next(); });
    },
  };

  return {
    server: isCodexSeatbeltSandbox
      ? { watch: { useFsEvents: false, usePolling: true } }
      : undefined,
    plugins: [
      vinext(),
      sites(),
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        config: localBindingConfig,
      }),
      routeCssNoCache,
    ],
  };
});
