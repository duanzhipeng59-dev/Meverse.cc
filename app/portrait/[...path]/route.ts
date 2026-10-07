import { NextResponse, type NextRequest } from "next/server";

// 肖像同源代理:把 Supabase Storage 的图片转换请求改走本站 /portrait/ 路径,
// 让 Cloudflare 边缘缓存它(直连 supabase.co 的网络路径对部分访客极慢,实测 2.4~3s/张)。
// 只允许自家 bucket 前缀与白名单转换参数,杜绝开放代理。

const ALLOWED_PREFIX = "celebrity-portraits/";
const ALLOWED_PARAMS = ["width", "height", "resize", "quality", "format"] as const;
// 正常图片内容不变,可永久缓存;stale-while-revalidate 让过期缓存也能先快速返回。
const IMMUTABLE = "public, max-age=31536000, immutable, stale-while-revalidate=86400";
const UPSTREAM_TIMEOUT_MS = 3000;

function supabaseOrigin() {
  const url = process.env.SUPABASE_URL;
  if (url && /^https:\/\//u.test(url)) return new URL(url).origin;
  return "https://jhsoksaxkpujbcludxyw.supabase.co";
}

// 缓存键只保留白名单参数并固定顺序,避免同图因参数串不同而缓存多份。
function cacheKeyFor(request: NextRequest, objectPath: string) {
  const key = new URL(`/portrait/${objectPath}`, request.nextUrl.origin);
  for (const name of ALLOWED_PARAMS) {
    const value = request.nextUrl.searchParams.get(name);
    if (value !== null) key.searchParams.set(name, value);
  }
  return key.toString();
}

function notCacheable(body: string, status: number) {
  return new NextResponse(body, {
    status,
    headers: { "cache-control": "no-store", "x-content-type-options": "nosniff" },
  });
}

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const objectPath = path.map(decodeURIComponent).join("/");
  if (!objectPath.startsWith(ALLOWED_PREFIX) || objectPath.includes("..")) {
    return notCacheable("Not found", 404);
  }

  // Cloudflare Workers 提供 caches.default;本地 Node 环境没有,退化为直接代理并依赖 HTTP 缓存头。
  const cache = (globalThis as unknown as { caches?: { default: Cache } }).caches?.default;
  const cacheKey = cache ? cacheKeyFor(request, objectPath) : null;
  if (cache && cacheKey) {
    const cached = await cache.match(cacheKey);
    if (cached) {
      const headers = new Headers(cached.headers);
      headers.set("x-portrait-cache", "hit");
      return new NextResponse(cached.body, { status: cached.status, headers });
    }
  }

  const upstream = new URL(`${supabaseOrigin()}/storage/v1/render/image/public/${objectPath}`);
  for (const [key, value] of request.nextUrl.searchParams) {
    if ((ALLOWED_PARAMS as readonly string[]).includes(key)) upstream.searchParams.set(key, value);
  }

  // 上游 3 秒超时:Supabase 卡死时快速失败,不让访客请求无限挂起。
  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(upstream.toString(), {
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      cf: { cacheEverything: true, cacheTtl: 2678400, cacheTtlByStatus: { "200-299": 2678400, "404": 60 } },
    } as RequestInit);
  } catch {
    return notCacheable("Upstream timeout", 504);
  }
  if (upstreamResponse.status === 404) return notCacheable("Not found", 404);
  if (!upstreamResponse.ok) return notCacheable("Upstream unavailable", 502);

  const headers = new Headers();
  headers.set("content-type", upstreamResponse.headers.get("content-type") ?? "image/webp");
  headers.set("cache-control", IMMUTABLE);
  headers.set("x-portrait-cache", "miss");
  const response = new NextResponse(upstreamResponse.body, { status: 200, headers });
  if (cache && cacheKey) {
    try {
      await cache.put(cacheKey, response.clone());
    } catch {
      // 缓存写入失败不影响本次返回
    }
  }
  return response;
}
