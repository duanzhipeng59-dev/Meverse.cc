/** Cloudflare Worker entry point for the MeVerse template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

// vinext 静态资源自带默认 Cache-Control(max-age=3600),而 next.config.ts headers()
// 配置的自定义缓存头会被追加而不是替换,响应里出现两个冲突的 max-age。这里做一次
// 规范化:多个 max-age 时保留时长最长的一个(显式配置必长于默认 3600),其余指令去重。
// Cache-Control 各指令内部不含逗号,指令级重组不会破坏语义。
function dedupeCacheControl(response: Response): Response {
  const combined = response.headers.get("Cache-Control");
  if (!combined) return response;
  const directives = combined.split(",").map((part) => part.trim()).filter(Boolean);
  const maxAges = directives.filter((part) => part.toLowerCase().startsWith("max-age="));
  if (maxAges.length <= 1) return response;
  const longest = maxAges.reduce((a, b) => (Number(a.split("=")[1]) >= Number(b.split("=")[1]) ? a : b));
  const seen = new Set<string>();
  const kept: string[] = [];
  for (const directive of directives) {
    if (directive.toLowerCase().startsWith("max-age=")) continue;
    const key = directive.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    kept.push(directive);
  }
  const headers = new Headers(response.headers);
  headers.delete("Cache-Control");
  headers.set("Cache-Control", [kept.join(", "), longest].filter(Boolean).join(", "));
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    return dedupeCacheControl(await handler.fetch(request, env, ctx));
  },
};

export default worker;
